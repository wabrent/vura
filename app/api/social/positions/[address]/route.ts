import { NextRequest, NextResponse } from 'next/server';

const DATA_BASE = 'https://data-api.polymarket.com';

export async function GET(req: NextRequest) {
  try {
    const address = req.nextUrl.pathname.split('/').pop();
    if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
      return NextResponse.json({ error: 'Invalid address' }, { status: 400 });
    }
    const url = `${DATA_BASE}/positions?user=${address}&limit=50`;
    const res = await fetch(url, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new Error(`positions ${res.status}`);
    const data = await res.json();

    const positions = (data || []).map((p: any) => ({
      conditionId: p.conditionId,
      title: p.title,
      slug: p.slug,
      icon: p.icon,
      outcome: p.outcome,
      size: Number(p.size) || 0,
      avgPrice: Number(p.avgPrice) || 0,
      initialValue: Number(p.initialValue) || 0,
      currentValue: Number(p.currentValue) || 0,
      cashPnl: Number(p.cashPnl) || 0,
      percentPnl: Number(p.percentPnl) || 0,
      curPrice: Number(p.curPrice) || 0,
      redeemable: !!p.redeemable,
    }));

    const totalValue = positions.reduce((s, p) => s + p.currentValue, 0);
    const totalPnl = positions.reduce((s, p) => s + p.cashPnl, 0);

    return NextResponse.json({ address, positions, totalValue, totalPnl });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
