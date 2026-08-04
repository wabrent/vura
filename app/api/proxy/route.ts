import { NextRequest, NextResponse } from 'next/server';

// Read-only CORS passthrough for public Polymarket market data (Gamma API, CLOB price history).
// NOTE: order placement does NOT go through this route — see /api/combos/place, which
// correctly signs with the authenticated user's own wallet address instead of a fixed one.
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
