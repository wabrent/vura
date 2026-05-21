import { NextRequest, NextResponse } from 'next/server';
import { createHmac } from 'crypto';

function signL2(secret: string, ts: string, method: string, path: string, body: string): string {
  return createHmac('sha256', secret).update(ts + method + path + body).digest('base64');
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { action, signedOrder, tokenId, side, price, size, maker } = body;

  // Submit signed order to CLOB
  if (action === 'submit' && signedOrder) {
    const apiKey = process.env.POLYMARKET_API_KEY || '';
    const secret = process.env.POLYMARKET_SECRET || '';
    const passphrase = process.env.POLYMARKET_PASSPHRASE || '';
    const address = '0xe0f676f5d6436f20885a8bea365384029b36f74e';

    try {
      const ts = String(Math.floor(Date.now() / 1000));
      const method = 'POST';
      const path = '/order';
      const orderBody = JSON.stringify(signedOrder);
      const sig = signL2(secret, ts, method, path, orderBody);

      const clobRes = await fetch('https://clob.polymarket.com/order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'POLY_ADDRESS': address,
          'POLY_SIGNATURE': sig,
          'POLY_TIMESTAMP': ts,
          'POLY_API_KEY': apiKey,
          'POLY_PASSPHRASE': passphrase,
        },
        body: orderBody,
      });

      if (!clobRes.ok) {
        const err = await clobRes.text();
        return NextResponse.json({ error: err }, { status: clobRes.status });
      }

      const data = await clobRes.json();
      return NextResponse.json(data);
    } catch (e: any) {
      return NextResponse.json({ error: e.message }, { status: 500 });
    }
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
