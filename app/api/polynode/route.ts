import { NextRequest, NextResponse } from 'next/server';

const BASE = 'https://api.polynode.dev';

export async function GET(req: NextRequest) {
  const path = req.nextUrl.searchParams.get('path') || '';
  const query = req.nextUrl.searchParams.get('query') || '';

  const apiKey = process.env.POLYNODE_API_KEY || '';
  if (!apiKey) return NextResponse.json({ error: 'Missing POLYNODE_API_KEY' }, { status: 500 });

  try {
    let url = `${BASE}${path}`;
    if (query) url += `?${query}`;

    const res = await fetch(url, {
      headers: {
        'x-api-key': apiKey,
        Accept: 'application/json',
        'User-Agent': 'VURA/2.0',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      const err = await res.text().catch(() => '');
      return NextResponse.json({ error: err || `HTTP ${res.status}`, path }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
