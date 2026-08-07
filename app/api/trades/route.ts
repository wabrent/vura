import { NextRequest, NextResponse } from 'next/server';

const GAMMA = 'https://gamma-api.polymarket.com';

const CATEGORIES = ['crypto', 'sports', 'politics', 'economy'] as const;

const cache = new Map<string, { ts: number; data: any }>();
const CACHE_TTL = 300000;

async function cachedFetch(key: string, url: string, timeout = 15000) {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.ts < CACHE_TTL) return hit.data;
  const res = await fetch(url, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(timeout) });
  if (!res.ok) throw new Error(`${key} ${res.status}`);
  const data = await res.json();
  cache.set(key, { ts: Date.now(), data });
  return data;
}

interface Trade {
  category: string;
  title: string;
  yesPrice: number;
  buyYesPrice: number;
  change24h: number;
  volume: number;
  slug: string;
  eventSlug: string;
  tokenId: string | null;
  reason: string;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '15'), 30);

    const candidates: { category: string; title: string; yesPrice: number; buyYesPrice: number; change24h: number; volume: number; slug: string; eventSlug: string; tokenId: string | null }[] = [];

    for (const tag of CATEGORIES) {
      const events = await cachedFetch(
        `trades-${tag}`,
        `${GAMMA}/events?closed=false&limit=${limit}&tag_slug=${tag}&order=volume24hr&ascending=false`
      );
      for (const ev of events || []) {
        for (const m of (ev.markets || []).filter((x: any) => x.active && !x.closed)) {
          let yesPrice = 0.5;
          let buyYesPrice = 0.5;
          try {
            const pp = typeof m.outcomePrices === 'string' ? JSON.parse(m.outcomePrices) : m.outcomePrices;
            yesPrice = parseFloat(pp[0]) || 0.5;
            const ask = parseFloat(m.bestAsk);
            buyYesPrice = ask > 0 ? Math.max(ask, 0.001) : yesPrice;
          } catch {}
          let tokenId = null;
          try {
            const ids = typeof m.clobTokenIds === 'string' ? JSON.parse(m.clobTokenIds) : m.clobTokenIds;
            tokenId = ids?.[0] || null;
          } catch {}
          candidates.push({
            category: tag,
            title: m.question || ev.title,
            yesPrice,
            buyYesPrice,
            change24h: Number(m.oneDayPriceChange) || 0,
            volume: Number(m.volumeNum) || Number(m.volume) || 0,
            slug: m.slug,
            eventSlug: ev.slug,
            tokenId,
          });
        }
      }
    }

    // Keep high-volume, mid-price candidates (interesting, tradable)
    const pool = candidates
      .filter(c => c.buyYesPrice > 0.03 && c.buyYesPrice < 0.97 && c.volume > 5000)
      .sort((a, b) => b.volume - a.volume)
      .slice(0, 60);

    const apiKey = process.env.DEEPSEEK_API_KEY || 'sk-112e3801734f4c2b9e914fb1b72fe774';
    const prompt = `You are a Polymarket prediction market trader. For each market below: Category | Market title | YES price (0-1, %) | 24h change (%). The YES price is what you'd pay.

Find the best 8 trades where the price looks mispriced or momentum is strong. Prefer:
- Markets with clear, tradeable logic (not just noise)
- Big moves with a clear direction
- Cheap YES (<40%) where the market might be underpricing a real event

Data:
${pool.map((c, i) => `${i + 1}. [${c.category}] ${c.title.substring(0, 70)} | YES ${(c.buyYesPrice * 100).toFixed(0)}% | 24h ${(c.change24h * 100).toFixed(1)}% | vol $${(c.volume / 1000).toFixed(0)}K`).join('\n')}

Return exactly this format, one per line, no markdown:
Category | YES or NO | 0-based-index-from-data | short reason (max 8 words)`;

    const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
        max_tokens: 800,
      }),
      signal: AbortSignal.timeout(25000),
    });

    if (!res.ok) {
      return NextResponse.json({ error: `AI ${res.status}`, trades: [] }, { status: res.status });
    }

    const data = await res.json();
    const content: string = data.choices?.[0]?.message?.content || '';
    const trades: Trade[] = [];

    for (const line of content.split('\n')) {
      const parts = line.split('|').map(s => s.trim());
      if (parts.length < 4) continue;
      const cat = parts[0];
      const sideRaw = parts[1].toUpperCase();
      const idx = parseInt(parts[2]);
      const reason = parts[3] || '';
      if (!cat || isNaN(idx)) continue;
      const c = pool[idx];
      if (!c) continue;
      const side: 'YES' | 'NO' = sideRaw.includes('NO') ? 'NO' : 'YES';
      const price = side === 'YES' ? c.buyYesPrice : (1 - c.yesPrice);
      if (price <= 0.01 || price >= 0.99) continue;
      trades.push({
        category: cat,
        title: c.title,
        yesPrice: c.yesPrice,
        buyYesPrice: c.buyYesPrice,
        change24h: c.change24h,
        volume: c.volume,
        slug: c.slug,
        eventSlug: c.eventSlug,
        tokenId: c.tokenId,
        reason,
      });
    }

    return NextResponse.json({ generatedAt: Date.now(), trades });
  } catch (e: any) {
    return NextResponse.json({ error: e.message, trades: [] }, { status: 500 });
  }
}
