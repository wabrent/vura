import { NextRequest, NextResponse } from 'next/server';
import { buildHmacSignature } from '@polymarket/client';
import WebSocket from 'ws';
import { Wallet } from 'ethers';

const COMBOS_RFQ_BASE = process.env.COMBOS_RFQ_BASE || 'https://combos-rfq-api.polymarket.com';
const RFQ_WS_URL = process.env.RFQ_WS_URL || 'wss://combos-rfq-gateway-requester.polymarket.sh/ws';
const COMBO_EXCHANGE = process.env.COMBO_EXCHANGE || '0xe3333700ca9d93003f00f0f71f8515005f6c00aa';

const COMBO_ORDER_DOMAIN = {
  name: 'Polymarket CTF Exchange',
  version: '3',
  chainId: 137,
  verifyingContract: COMBO_EXCHANGE,
};

const COMBO_ORDER_TYPES = {
  Order: [
    { name: 'salt', type: 'uint256' },
    { name: 'maker', type: 'address' },
    { name: 'signer', type: 'address' },
    { name: 'tokenId', type: 'uint256' },
    { name: 'makerAmount', type: 'uint256' },
    { name: 'takerAmount', type: 'uint256' },
    { name: 'side', type: 'uint8' },
    { name: 'signatureType', type: 'uint8' },
    { name: 'timestamp', type: 'uint256' },
    { name: 'metadata', type: 'bytes32' },
    { name: 'builder', type: 'bytes32' },
  ],
};

const SIDE = { BUY: 0, SELL: 1 };
const ZERO32 = '0x' + '0'.repeat(64);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      signer, 
      address, 
      funderAddress, 
      creds,
      legPositionIds,
      direction = 'BUY',
      side = 'YES',
      sizeUsdcE6,
      maxRetries = 2
    } = body;

    if (!signer || !address || !funderAddress || !creds) {
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    }
    
    if (legPositionIds.length < 2) {
      return NextResponse.json({ error: 'Pick at least 2 legs' }, { status: 400 });
    }

    return new Promise((resolve, reject) => {
      let settled = false;
      let attempt = 0;
      let signing = false;
      let quoteExpired = false;
      let timer: NodeJS.Timeout | null = null;

      const armTimer = (ms: number, msg: string) => {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => reject(new Error(msg)), ms);
      };

      const genSalt = () => {
        const a = new Uint8Array(10);
        crypto.getRandomValues(a);
        return BigInt('0x' + [...a].map(b => b.toString(16).padStart(2, '0')).join('')).toString();
      };

      const requestQuote = () => {
        attempt += 1;
        quoteExpired = false;
        armTimer(20000, 'Combo request timed out');

        const wsPayload = {
          type: 'RFQ_CREATE',
          leg_position_ids: legPositionIds.map(String),
          direction,
          side,
          requested_size: { unit: 'notional', value_e6: String(sizeUsdcE6) },
        };

        ws.send(JSON.stringify(wsPayload));
      };

      const ws = new WebSocket(RFQ_WS_URL, {
        headers: { 'Origin': 'https://polymarket.com' }
      });

      const handleError = (msg: string) => {
        if (!settled) {
          settled = true;
          if (timer) clearTimeout(timer);
          try { ws.close(); } catch {}
          reject(new Error(msg));
        }
      };

      ws.onopen = () => {
        ws.send(JSON.stringify({
          type: 'auth',
          auth: {
            apiKey: creds.key,
            secret: creds.secret,
            passphrase: creds.passphrase
          },
          identity: {
            signer_address: address,
            maker_address: funderAddress,
            signature_type: 2
          }
        }));
      };

      ws.onerror = () => handleError('Combo socket error');
      ws.onclose = () => handleError('Combo socket closed before completion');

      ws.onmessage = async (ev) => {
        try {
          const msg = JSON.parse(ev.data);
          
          if (msg.type === 'auth') {
            if (!msg.success) return handleError('Combo auth failed');
            requestQuote();
            return;
          }

          if (msg.type === 'RFQ_QUOTE_READY') {
            const q = msg.quote || {};
            const r = msg.request || {};
            
            const tokenId = side === 'NO' ? r.no_position_id : r.yes_position_id;
            
            const order = {
              salt: genSalt(),
              maker: funderAddress,
              signer: address,
              tokenId: String(tokenId),
              makerAmount: String(q.maker_amount_e6),
              takerAmount: String(q.taker_amount_e6),
              side: SIDE[direction] ?? 0,
              signatureType: 2,
              timestamp: String(Date.now()),
              metadata: ZERO32,
              builder: ZERO32,
            };
            
            signing = true;
            armTimer(120000, 'Combo signing timed out');
            
            let signature: string;
            try {
              signature = await signer.signTypedData(COMBO_ORDER_DOMAIN, COMBO_ORDER_TYPES, order);
            } finally {
              signing = false;
            }
            
            if (settled) return;
            
            if (quoteExpired) {
              if (attempt <= maxRetries) requestQuote();
              else handleError('EXPIRED_RFQ');
              return;
            }
            
            ws.send(JSON.stringify({
              type: 'RFQ_ACCEPT',
              rfq_id: r.rfq_id,
              quote_id: q.quote_id,
              signed_order: {
                ...order,
                expiration: '0',
                signature,
              },
            }));
            
            armTimer(40000, 'Combo execution timed out');
            
          } else if (msg.type === 'RFQ_EXECUTION_UPDATE' && 
                     (msg.status === 'CONFIRMED' || msg.status === 'MINED')) {
            if (!settled) {
              settled = true;
              if (timer) clearTimeout(timer);
              try { ws.close(); } catch {}
              resolve({ txHash: msg.tx_hash, status: msg.status });
            }
          } else if ((msg.type === 'RFQ_STATUS_UPDATE' || msg.type === 'RFQ_EXECUTION_UPDATE') &&
                     (msg.status === 'FAILED' || isExpired(msg))) {
            if (isExpired(msg) && attempt <= maxRetries) {
              if (signing) {
                quoteExpired = true;
                requestQuote();
              } else {
                requestQuote();
              }
            } else {
              handleError(msg.code || msg.status);
            }
          }
        } catch (error) {
          handleError(error instanceof Error ? error.message : 'Unknown error');
        }
      };

      const isExpired = (m: any) => m.status === 'EXPIRED' || /expired/i.test(m.code || '');
      
    });
    
  } catch (error: any) {
    console.error('Combo placement error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error.message
    }, { status: 500 });
  }
}
