import { NextRequest, NextResponse } from 'next/server';
import { findCity } from '@/app/lib/cities';

const GAMMA = 'https://gamma-api.polymarket.com';
const OPEN_METEO = 'https://api.open-meteo.com/v1/forecast';

interface WeatherMarket {
  id: string;
  conditionId: string;
  question: string;
  thresholdC: number | null;
  direction: 'above' | 'below';
  yesPrice: number;
  noPrice: number;
  slug: string;
  volume: number;
}

interface WeatherRow {
  city: string;
  date: string;
  type: 'high' | 'low';
  thresholdC: number | null;
  direction: 'above' | 'below';
  marketPrice: number;
  marketPriceSide: 'YES' | 'NO';
  forecastMaxC: number;
  forecastMinC: number;
  edge: number;
  question: string;
  conditionId: string;
  slug: string;
  volume: number;
}

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

function parseTempQuestion(q: string): { thresholdC: number | null; direction: 'above' | 'below'; fahrenheit: boolean } {
  const isBelow = / or below| ≤ |below |≤\s*\d/.test(q);
  const isAbove = / or above| ≥ |above |≥\s*\d/.test(q);
  const cMatch = q.match(/(\d{1,3})\s*(?:°|º)?C/i);
  const fMatch = q.match(/(\d{2,3})\s*(?:°|º)?F/i);
  let thresholdC: number | null = null;
  let fahrenheit = false;
  if (cMatch) {
    thresholdC = parseInt(cMatch[1]);
  } else if (fMatch) {
    thresholdC = Math.round((parseInt(fMatch[1]) - 32) * 5 / 9);
    fahrenheit = true;
  }
  const direction: 'above' | 'below' = isBelow ? 'below' : 'above';
  return { thresholdC, direction, fahrenheit };
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
    const maxEvents = Math.min(parseInt(searchParams.get('events') || '100'), 200);

    const events = await cachedFetch(
      'weather-events',
      `${GAMMA}/events?closed=false&limit=${maxEvents}&tag_slug=weather`
    );

    const today = new Date();
    const todayISO = today.toISOString().slice(0, 10);

    const rows: WeatherRow[] = [];
    const seen = new Set<string>();

    for (const ev of (events || [])) {
      const title = ev.title || '';
      const isHigh = /highest temperature|high temperature/i.test(title);
      const isLow = /lowest temperature|low temperature/i.test(title);
      if (!isHigh && !isLow) continue;

      const city = parseCity(title);
      if (!city) continue;
      const date = parseDate(title);
      if (!date) continue;
      // Skip old dates and dates more than 5 days out (forecast window)
      const dateTs = new Date(date + 'T00:00:00Z').getTime();
      const nowTs = Date.now();
      if (dateTs < nowTs - 26 * 3600 * 1000) continue;
      if (dateTs > nowTs + 6 * 24 * 3600 * 1000) continue;
      const coords = findCity(city);
      if (!coords) continue;

      const key = `${city}|${date}|${isHigh ? 'high' : 'low'}`;
      if (seen.has(key)) continue;

      const markets: WeatherMarket[] = (ev.markets || [])
        .filter((m: any) => m.active && !m.closed)
        .map((m: any) => {
          const { thresholdC, direction } = parseTempQuestion(m.question);
          let yesPrice = 0.5;
          try {
            const p = typeof m.outcomePrices === 'string' ? JSON.parse(m.outcomePrices) : m.outcomePrices;
            yesPrice = parseFloat(p[0]) || 0.5;
          } catch {}
          return {
            id: m.conditionId,
            conditionId: m.conditionId,
            question: m.question,
            thresholdC,
            direction,
            yesPrice,
            noPrice: 1 - yesPrice,
            slug: m.slug,
            volume: Number(m.volumeNum) || Number(m.volume) || 0,
          };
        })
        .filter((m: WeatherMarket) => m.thresholdC !== null && m.yesPrice > 0.03 && m.yesPrice < 0.97);

      if (markets.length < 2) continue;

      let forecastMaxC: number | null = null;
      let forecastMinC: number | null = null;
      try {
        const f = await cachedFetch(
          `om-${coords.lat}-${coords.lon}-${date}`,
          `${OPEN_METEO}?latitude=${coords.lat}&longitude=${coords.lon}&hourly=temperature_2m&daily=temperature_2m_max,temperature_2m_min&timezone=auto&past_days=2&forecast_days=5`
        );
        const dayIdx = (f.daily?.time || []).findIndex((t: string) => t === date);
        if (dayIdx >= 0) {
          forecastMaxC = f.daily.temperature_2m_max[dayIdx];
          forecastMinC = f.daily.temperature_2m_min[dayIdx];
        }
      } catch {}

      // If today's date and hours have passed, use actual observations
      if (forecastMaxC === null) continue;

      for (const m of markets) {
        if (m.thresholdC === null) continue;
        const forecast = isHigh ? forecastMaxC : forecastMinC;
        if (forecast === null) continue;

        const actualProb = m.direction === 'below'
          ? (forecast <= m.thresholdC ? 0.97 : 0.03)
          : (forecast >= m.thresholdC ? 0.97 : 0.03);

        const marketProb = m.yesPrice;
        const edge = actualProb - marketProb;
        if (Math.abs(edge) < 0.05) continue;

        rows.push({
          city,
          date,
          type: isHigh ? 'high' : 'low',
          thresholdC: m.thresholdC,
          direction: m.direction,
          marketPrice: marketProb,
          marketPriceSide: edge > 0 ? 'YES' : 'NO',
          forecastMaxC: forecastMaxC ?? 0,
          forecastMinC: forecastMinC ?? 0,
          edge,
          question: m.question,
          conditionId: m.conditionId,
          slug: m.slug,
          volume: m.volume,
        });
        seen.add(key);
      }
    }

    rows.sort((a, b) => Math.abs(b.edge) - Math.abs(a.edge));

    return NextResponse.json({
      generatedAt: Date.now(),
      rows: rows.slice(0, 40),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message, rows: [] }, { status: 500 });
  }
}
