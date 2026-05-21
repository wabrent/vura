import { NextRequest, NextResponse } from 'next/server';
import { ClobClient, Side } from '@polymarket/clob-client-v2';
import { Wallet } from 'ethers';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { action, tokenId, side, price, size, signedOrder } = body;

  const apiKey = process.env.POLYMARKET_API_KEY || '';
  const secret = process.env.POLYMARKET_SECRET || '';
  const passphrase = process.env.POLYMARKET_PASSPHRASE || '';

  // Step 1: Build order data for client signing
  if (action === 'build') {
    try {
      const wallet = Wallet.createRandom();
      const client = new ClobClient({
        host: 'https://clob.polymarket.com',
        chain: 137,
        signer: wallet as any,
        creds: { key: apiKey, secret, passphrase },
        signatureType: 0,
        funderAddress: wallet.address,
      });

      const built = await client.createOrder({
        tokenID: tokenId,
        price: Number(price),
        size: Number(size),
        side: side === 'BUY' ? Side.BUY : Side.SELL,
      }) as any;

      // Extract order message for EIP-712 signing
      const order = built?.order || built;
      
      return NextResponse.json({
        order: {
          salt: order.salt?.toString(),
          maker: order.maker,
          signer: order.signer || order.maker,
          taker: order.taker || '0x0000000000000000000000000000000000000000',
          tokenId: order.tokenId?.toString?.(),
          makerAmount: order.makerAmount?.toString?.(),
          takerAmount: order.takerAmount?.toString?.(),
          expiration: order.expiration?.toString?.(),
          nonce: order.nonce?.toString?.() || '0',
          feeRateBps: order.feeRateBps?.toString?.() || '0',
          side: order.side?.toString?.() || (side === 'BUY' ? '0' : '1'),
          signatureType: order.signatureType?.toString?.() || '0'
        }
      });
    } catch (e: any) {
      return NextResponse.json({ error: e.message }, { status: 500 });
    }
  }

  // Step 2: Submit signed order
  if (action === 'submit' && signedOrder) {
    try {
      const wallet = Wallet.createRandom();
      const client = new ClobClient({
        host: 'https://clob.polymarket.com',
        chain: 137,
        signer: wallet as any,
        creds: { key: apiKey, secret, passphrase },
        signatureType: 0,
        funderAddress: signedOrder.maker,
      });

      const res = await client.postOrder(signedOrder);
      return NextResponse.json(res);
    } catch (e: any) {
      return NextResponse.json({ error: e.message }, { status: 500 });
    }
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
