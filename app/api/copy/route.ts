import { NextRequest, NextResponse } from 'next/server';

const GAMMA = 'https://gamma-api.polymarket.com';
const DATA = 'https://data-api.polymarket.com';

const cache = new Map<string, { ts: number; data: any }>();
const CACHE_TTL = 180000;

async function cachedFetch(key: string, url: string, timeout = 15000) {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.ts < CACHE_TTL) return hit.data;
  const res = await fetch(url, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(timeout) });
  if (!res.ok) throw new Error(`${key} ${res.status}`);
  const data = await res.json();
  cache.set(key, { ts: Date.now(), data });
  return data;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const marketsLimit = Math.min(parseInt(searchParams.get('markets') || '15'), 30);

    const topMarkets = await cachedFetch(
      'top-markets',
      `${GAMMA}/markets?closed=false&limit=${marketsLimit}&order=volumeNum&ascending=false`
    );

    const walletMap = new Map<string, { wallet: string; name: string; image: string; amount: number; markets: Set<string> }>();

    for (const m of (topMarkets || [])) {
      let holders: any[] = [];
      try {
        const h = await cachedFetch(`holders-${m.conditionId}`, `${DATA}/holders?market=${m.conditionId}&limit=20`);
        for (const token of h || []) {
          holders.push(...(token.holders || []));
        }
      } catch {}
      for (const h of holders) {
        const amount = Number(h.amount) || 0;
        if (amount < 10000) continue;
        const w = h.proxyWallet;
        const e = walletMap.get(w) || { wallet: w, name: h.name || h.pseudonym || w.slice(0, 8), image: h.profileImage || '', amount: 0, markets: new Set() };
        e.amount += amount;
        e.markets.add(m.conditionId);
        walletMap.set(w, e);
      }
    }

    const wallets = [...walletMap.values()]
      .filter(w => w.markets.size >= 2)
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 12)
      .map(w => ({ wallet: w.wallet, name: w.name, image: w.image, amount: w.amount, markets: w.markets.size }));

    // Enrich each wallet with position stats (win-rate, live PnL)
    const enriched = [];
    for (const w of wallets) {
      let livePnl = 0;
      let liveCount = 0;
      let winCount = 0;
      let volume = 0;
      try {
        const hit = cache.get(`pos-${w.wallet}`);
        const data = hit ? hit.data : await cachedFetch(`pos-${w.wallet}`, `${DATA}/positions?user=${w.wallet}&limit=40`, 12000);
        for (const p of data || []) {
          const sz = Number(p.size) || 0;
          if (sz <= 0) continue;
          liveCount++;
          livePnl += Number(p.cashPnl) || 0;
          if (Number(p.cashPnl) > 0) winCount++;
          volume += Number(p.initialValue) || Number(p.currentValue) || 0;
        }
      } catch {}
      enriched.push({
        ...w,
        winRate: liveCount > 0 ? Math.round((winCount / liveCount) * 100) : null,
        livePnl,
        positionCount: liveCount,
        volume,
      });
    }

    return NextResponse.json({ generatedAt: Date.now(), wallets: enriched });
  } catch (e: any) {
    return NextResponse.json({ error: e.message, wallets: [] }, { status: 500 });
  }
}
