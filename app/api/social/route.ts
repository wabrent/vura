import { NextResponse } from 'next/server';

const DATA_BASE = 'https://data-api.polymarket.com';
const GAMMA_BASE = 'https://gamma-api.polymarket.com';

const cache = new Map<string, { ts: number; data: any }>();
const CACHE_TTL = 60000;

async function cachedFetch(key: string, url: string, timeout = 15000) {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.ts < CACHE_TTL) return hit.data;
  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(timeout),
  });
  if (!res.ok) throw new Error(`${key} ${res.status}`);
  const data = await res.json();
  cache.set(key, { ts: Date.now(), data });
  return data;
}

async function fetchTopMarkets(limit = 20) {
  return cachedFetch(
    `markets-${limit}`,
    `${GAMMA_BASE}/markets?closed=false&limit=${limit}&order=volumeNum&ascending=false`
  );
}

async function fetchHolders(conditionId: string) {
  const data = await cachedFetch(
    `holders-${conditionId}`,
    `${DATA_BASE}/holders?market=${conditionId}&limit=50`,
    10000
  );
  const holders: any[] = [];
  for (const token of data || []) {
    for (const h of token.holders || []) {
      holders.push({
        wallet: h.proxyWallet,
        name: h.name,
        pseudonym: h.pseudonym,
        image: h.profileImage,
        amount: Number(h.amount) || 0,
        outcomeIndex: h.outcomeIndex,
      });
    }
  }
  return holders;
}

async function withRetry<T>(fn: () => Promise<T>, retries = 2): Promise<T | null> {
  for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch {
      if (i === retries) return null;
      await new Promise(r => setTimeout(r, 500 * (i + 1)));
    }
  }
  return null;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const marketsLimit = Math.min(parseInt(searchParams.get('markets') || '15'), 20);
    const perMarket = Math.min(parseInt(searchParams.get('per') || '5'), 10);
    const minAmount = parseInt(searchParams.get('min') || '1000');

    const markets = await fetchTopMarkets(marketsLimit);

    // Sequential with small delay to avoid rate limit bursts
    const sections = [];
    for (const m of markets) {
      let holders: any[] = [];
      const h = await withRetry(() => fetchHolders(m.conditionId));
      if (h) holders = h;
      const top = holders
        .filter(x => x.amount >= minAmount)
        .sort((a, b) => b.amount - a.amount)
        .slice(0, perMarket);
      if (top.length > 0) {
        sections.push({
          market: {
            conditionId: m.conditionId,
            question: m.question,
            slug: m.slug,
            volume: Number(m.volumeNum) || 0,
            image: m.image || null,
          },
          holders: top,
        });
      }
      await new Promise(r => setTimeout(r, 150));
    }

    return NextResponse.json({ sections });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
