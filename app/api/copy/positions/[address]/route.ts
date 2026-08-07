import { NextRequest, NextResponse } from 'next/server';

const DATA = 'https://data-api.polymarket.com';

const cache = new Map<string, { ts: number; data: any }>();
const CACHE_TTL = 60000;

export async function GET(req: NextRequest) {
  try {
    const address = req.nextUrl.pathname.split('/').pop();
    if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return NextResponse.json({ error: 'Invalid address' }, { status: 400 });
    }
    const cacheKey = `pos-${address}`;
    const hit = cache.get(cacheKey);
    if (hit && Date.now() - hit.ts < CACHE_TTL) return NextResponse.json(hit.data);

    const res = await fetch(`${DATA}/positions?user=${address}&limit=40`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new Error(`positions ${res.status}`);
    const data = await res.json();

    const positions = (data || []).map((p: any) => ({
      title: p.title,
      slug: p.slug,
      icon: p.icon,
      outcome: p.outcome,
      size: Number(p.size) || 0,
      avgPrice: Number(p.avgPrice) || 0,
      currentValue: Number(p.currentValue) || 0,
      cashPnl: Number(p.cashPnl) || 0,
      percentPnl: Number(p.percentPnl) || 0,
    })).filter((p: any) => p.size > 0);

    const result = { address, positions };
    cache.set(cacheKey, { ts: Date.now(), data: result });
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e.message, positions: [] }, { status: 500 });
  }
}
