import { NextRequest, NextResponse } from 'next/server';
import { createHmac } from 'crypto';

function signL2(secret: string, timestamp: string, method: string, path: string, body: string): string {
  const message = timestamp + method + path + body;
  return createHmac('sha256', secret).update(message).digest('base64');
}

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url');
  if (!url) return NextResponse.json({ error: 'Missing URL' }, { status: 400 });

  try {
    const targetUrl = decodeURIComponent(url);
    const response = await fetch(targetUrl, {
      headers: { 'User-Agent': 'VURA/2.0', 'Accept': 'application/json' },
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) return NextResponse.json({ error: `API ${response.status}` }, { status: response.status });
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { action, tokenId, side, price, size } = body;

  if (action === 'trade') {
    const apiKey = process.env.POLYMARKET_API_KEY || '';
    const secret = process.env.POLYMARKET_SECRET || '';
    const passphrase = process.env.POLYMARKET_PASSPHRASE || '';
    const address = '0xe0f676f5d6436f20885a8bea365384029b36f74e';
    const ts = String(Math.floor(Date.now() / 1000));
    const method = 'POST';
    const path = '/order';
    const orderBody = JSON.stringify({ tokenID: tokenId, side, price, size });
    const signature = signL2(secret, ts, method, path, orderBody);

    try {
      const clobRes = await fetch('https://clob.polymarket.com/order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'POLY_ADDRESS': address,
          'POLY_SIGNATURE': signature,
          'POLY_TIMESTAMP': ts,
          'POLY_API_KEY': apiKey,
          'POLY_PASSPHRASE': passphrase,
          'User-Agent': 'VURA/2.0',
        },
        body: orderBody,
        signal: AbortSignal.timeout(15000),
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
