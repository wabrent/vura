import type { MarketEvent } from '../types';

export async function fetchMarkets(): Promise<MarketEvent[]> {
  try {
    const res = await fetch(
      'https://gamma-api.polymarket.com/markets?limit=50&closed=false&active=true',
      { signal: AbortSignal.timeout(10000) }
    );
    const data = await res.json();
    const raw = Array.isArray(data) ? data : (data.data || data.value || []);
    const sorted = raw
      .filter((m: any) => parseFloat(m.volume || m.volumeNum || 0) > 50000)
      .sort((a: any, b: any) => parseFloat(b.volume || b.volumeNum || 0) - parseFloat(a.volume || a.volumeNum || 0))
      .slice(0, 15);

    return sorted.map((m: any) => {
      let price = 0.5;
      try {
        const p = typeof m.outcomePrices === 'string' ? JSON.parse(m.outcomePrices) : m.outcomePrices;
        price = p?.[0] ? parseFloat(p[0]) : 0.5;
      } catch {}
      return {
        id: m.conditionId || m.id || String(Math.random()),
        title: m.question || 'Unknown',
        slug: m.event_slug || m.events?.[0]?.slug || m.slug || '',
        probability: Math.round(price * 100),
        volume: parseFloat(m.volume || m.volumeNum || 0),
        category: 'general',
        change24h: parseFloat(m.oneDayPriceChange || 0),
      };
    });
  } catch {
    return [];
  }
}
