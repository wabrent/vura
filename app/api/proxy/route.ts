import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url');
  if (!url) return NextResponse.json({ error: 'Missing URL parameter' }, { status: 400 });

  try {
    const targetUrl = decodeURIComponent(url);
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'VURA/2.0',
        'Accept': 'application/json',
        'POLY_API_KEY': process.env.POLYMARKET_API_KEY || '',
        'POLY_SECRET': process.env.POLYMARKET_SECRET || '',
        'POLY_PASSPHRASE': process.env.POLYMARKET_PASSPHRASE || '',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      return NextResponse.json({ error: `API ${response.status}` }, { status: response.status });
    }

    const contentType = response.headers.get('content-type') || '';
    let data;
    if (contentType.includes('application/json')) {
      data = await response.json();
    } else {
      const text = await response.text();
      try { data = JSON.parse(text); } catch { data = text; }
    }

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { action, tokenId, side, price, size } = body;

  if (action === 'trade') {
    try {
      const clobRes = await fetch('https://clob.polymarket.com/order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'POLY_API_KEY': process.env.POLYMARKET_API_KEY || '',
          'POLY_SECRET': process.env.POLYMARKET_SECRET || '',
          'POLY_PASSPHRASE': process.env.POLYMARKET_PASSPHRASE || '',
          'User-Agent': 'VURA/2.0',
          'Origin': 'https://vura.ink',
        },
        body: JSON.stringify({ tokenID: tokenId, side, price, size }),
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
