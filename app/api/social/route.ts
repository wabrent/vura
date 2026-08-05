import { NextResponse } from 'next/server';

const DATA_BASE = 'https://data-api.polymarket.com';

async function fetchTopMarkets(limit = 20) {
  const url = `${DATA_BASE}/markets?closed=false&limit=${limit}&order=volumeNum&ascending=false`;
  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`markets ${res.status}`);
  return res.json();
}

async function fetchHolders(conditionId: string) {
  const url = `${DATA_BASE}/holders?market=${conditionId}&limit=50`;
  const res = await fetch(url, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) return [];
  const data = await res.json();
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

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const marketsLimit = parseInt(searchParams.get('markets') || '20');
    const perMarket = parseInt(searchParams.get('per') || '10');

    const markets = await fetchTopMarkets(marketsLimit);

    const sections = await Promise.all(markets.map(async (m: any) => {
      let holders: any[] = [];
      try { holders = await fetchHolders(m.conditionId); } catch {}
      const top = holders
        .filter(h => h.amount >= 1000)
        .sort((a, b) => b.amount - a.amount)
        .slice(0, perMarket);
      return {
        market: {
          conditionId: m.conditionId,
          question: m.question,
          slug: m.slug,
          volume: Number(m.volumeNum) || 0,
          image: m.image || null,
        },
        holders: top,
      };
    }));

    const withData = sections.filter(s => s.holders.length > 0);
    return NextResponse.json({ sections: withData });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
