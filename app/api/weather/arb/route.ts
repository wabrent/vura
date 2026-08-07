import { NextRequest, NextResponse } from 'next/server';
import { findCity } from '@/app/lib/cities';

const GAMMA = 'https://gamma-api.polymarket.com';

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

function parseDate(q: string): string | null {
  const m = q.match(/on\s+(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})/i);
  if (!m) return null;
  const months: Record<string, number> = { january: 1, february: 2, march: 3, april: 4, may: 5, june: 6, july: 7, august: 8, september: 9, october: 10, november: 11, december: 12 };
  const year = new Date().getFullYear();
  const d = new Date(Date.UTC(year, months[m[1].toLowerCase()] - 1, parseInt(m[2])));
  if (isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

function parseCity(q: string): string | null {
  const m = q.match(/temperature\s+in\s+([A-Za-zÀ-ÿ \-']+?)\s+be/i) || q.match(/temperature\s+in\s+([A-Za-zÀ-ÿ \-']+?)\s+on/i);
  if (!m) return null;
  return m[1].replace(/\s+/g, ' ').trim();
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const pages = Math.min(parseInt(searchParams.get('pages') || '4'), 8);

    const allEvents: any[] = [];
    for (let p = 0; p < pages; p++) {
      const offset = p * 100;
      const events = await cachedFetch(
        `weather-events-${offset}`,
        `${GAMMA}/events?closed=false&limit=100&offset=${offset}&tag_slug=weather&order=id&ascending=false`
      );
      if (!events?.length) break;
      allEvents.push(...events);
    }

    const nowTs = Date.now();
    const arbs: {
      city: string;
      date: string;
      type: string;
      thresholdC: number;
      yesAsk: number;
      noAsk: number;
      total: number;
      edgeC: number;
      midEdgeC: number;
      slug: string;
      eventSlug: string;
    }[] = [];

    for (const ev of allEvents) {
      const title = ev.title || '';
      const isHigh = /highest temperature|high temperature/i.test(title);
      const isLow = /lowest temperature|low temperature/i.test(title);
      if (!isHigh && !isLow) continue;
      const city = parseCity(title);
      if (!city) continue;
      const date = parseDate(title);
      if (!date) continue;
      const dateTs = new Date(date + 'T00:00:00Z').getTime();
      if (dateTs < nowTs - 8 * 3600 * 1000) continue;
      if (dateTs > nowTs + 3 * 24 * 3600 * 1000) continue;

      for (const m of (ev.markets || []).filter((x: any) => x.active && !x.closed)) {
        let thresholdC = null;
        const cm = m.question.match(/(\d{1,3})\s*(?:°|º)?C/i);
        const fm = m.question.match(/(\d{2,3})\s*(?:°|º)?F/i);
        if (cm) thresholdC = parseInt(cm[1]);
        else if (fm) thresholdC = Math.round((parseInt(fm[1]) - 32) * 5 / 9);
        if (thresholdC === null || /below|above/i.test(m.question)) continue;

        // Buy YES at ask, buy NO at (1 - bid)  → if sum < 1, guaranteed profit
        const ask = parseFloat(m.bestAsk);
        const bid = parseFloat(m.bestBid);
        let midSum = 0;
        try {
          const pp = typeof m.outcomePrices === 'string' ? JSON.parse(m.outcomePrices) : m.outcomePrices;
          midSum = parseFloat(pp[0]) + parseFloat(pp[1]);
        } catch {}
        if (!(ask > 0) || !(bid > 0)) continue;
        const yesAsk = Math.min(ask, 0.98);
        const noAsk = 1 - bid;
        const total = yesAsk + noAsk;
        const edgeC = 100 - total * 100;
        const midEdgeC = midSum > 0 ? 100 - midSum * 100 : 0;
        // Include real arb (<0.995) and near-arb mid mismatch (>0.5¢) as potential signal
        if (total < 0.995 || (midSum > 0 && midSum < 0.99)) {
          arbs.push({
            city,
            date,
            type: isHigh ? 'high' : 'low',
            thresholdC,
            yesAsk,
            noAsk,
            total,
            edgeC,
            midEdgeC,
            slug: m.slug,
            eventSlug: ev.slug,
          });
        }
      }
    }

    arbs.sort((a, b) => b.edgeC - a.edgeC);
    return NextResponse.json({ generatedAt: Date.now(), arbs });
  } catch (e: any) {
    return NextResponse.json({ error: e.message, arbs: [] }, { status: 500 });
  }
}
