import { NextRequest, NextResponse } from 'next/server';

const GAMMA = 'https://gamma-api.polymarket.com';

const CATEGORIES = ['crypto', 'sports', 'politics', 'economy'] as const;

const cache = new Map<string, { ts: number; data: any }>();
const CACHE_TTL = 120000;

async function cachedFetch(key: string, url: string, timeout = 15000) {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.ts < CACHE_TTL) return hit.data;
  const res = await fetch(url, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(timeout) });
  if (!res.ok) throw new Error(`${key} ${res.status}`);
  const data = await res.json();
  cache.set(key, { ts: Date.now(), data });
  return data;
}

function fmtVol(v: number) {
  if (v >= 1e6) return (v / 1e6).toFixed(1) + 'M';
  if (v >= 1e3) return (v / 1e3).toFixed(0) + 'K';
  return Math.round(v).toString();
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '15'), 30);

    const categories: any[] = [];
    for (const tag of CATEGORIES) {
      const events = await cachedFetch(
        `hub-${tag}`,
        `${GAMMA}/events?closed=false&limit=${limit}&tag_slug=${tag}&order=volume24hr&ascending=false`
      );
      const markets: any[] = [];
      for (const ev of events || []) {
        for (const m of (ev.markets || []).filter((x: any) => x.active && !x.closed)) {
          let yesPrice = 0.5;
          try {
            const pp = typeof m.outcomePrices === 'string' ? JSON.parse(m.outcomePrices) : m.outcomePrices;
            yesPrice = parseFloat(pp[0]) || 0.5;
          } catch {}
          markets.push({
            id: m.conditionId,
            question: m.question || ev.title,
            slug: m.slug,
            eventSlug: ev.slug,
            image: ev.image || m.image || null,
            yesPrice,
            noPrice: 1 - yesPrice,
            volume: Number(m.volumeNum) || Number(m.volume) || 0,
            change24h: Number(m.oneDayPriceChange) || 0,
          });
        }
      }
      markets.sort((a, b) => b.volume - a.volume);
      categories.push({
        tag,
        label: tag.charAt(0).toUpperCase() + tag.slice(1),
        markets: markets.slice(0, limit),
      });
    }

    return NextResponse.json({ generatedAt: Date.now(), categories });
  } catch (e: any) {
    return NextResponse.json({ error: e.message, categories: [] }, { status: 500 });
  }
}
