import { NextRequest, NextResponse } from 'next/server';
import { findCity } from '@/app/lib/cities';

const GAMMA = 'https://gamma-api.polymarket.com';
const OPEN_METEO = 'https://api.open-meteo.com/v1/forecast';

interface PriceRow {
  thresholdC: number;
  mode: 'exact' | 'above' | 'below';
  yesPrice: number;
  noPrice: number;
  slug: string;
  eventSlug: string;
  volume: number;
}

interface HourlyPoint {
  time: string;
  tempC: number;
}

interface CityGroup {
  city: string;
  date: string;
  type: 'high' | 'low';
  forecastMaxC: number;
  forecastMinC: number;
  currentTempC: number | null;
  station: string;
  hourly: HourlyPoint[];
  prices: PriceRow[];
  bestSlug: string;
  bestEventSlug: string;
}

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

function parseTempQuestion(q: string): { thresholdC: number | null; mode: 'exact' | 'above' | 'below' } {
  const isBelow = / or below| below |≤\s*\d/.test(q);
  const isAbove = / or above| above |≥\s*\d/.test(q);
  const cMatch = q.match(/(\d{1,3})\s*(?:°|º)?C/i);
  const fMatch = q.match(/(\d{2,3})\s*(?:°|º)?F/i);
  let thresholdC: number | null = null;
  if (cMatch) thresholdC = parseInt(cMatch[1]);
  else if (fMatch) thresholdC = Math.round((parseInt(fMatch[1]) - 32) * 5 / 9);
  const mode: 'exact' | 'above' | 'below' = isBelow ? 'below' : isAbove ? 'above' : 'exact';
  return { thresholdC, mode };
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
    const pages = Math.min(parseInt(searchParams.get('pages') || '3'), 6);

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
    const groups = new Map<string, CityGroup>();

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
      const horizonMs = dateTs - nowTs;
      if (horizonMs < -8 * 3600 * 1000) continue;
      if (horizonMs > 6 * 24 * 3600 * 1000) continue;

      const coords = findCity(city);
      if (!coords) continue;

      const key = `${city}|${date}|${isHigh ? 'high' : 'low'}`;
      if (groups.has(key)) continue;

      const prices: PriceRow[] = (ev.markets || [])
        .filter((m: any) => m.active && !m.closed)
        .map((m: any) => {
          const { thresholdC, mode } = parseTempQuestion(m.question);
          let yesPrice = 0.5;
          try {
            const pp = typeof m.outcomePrices === 'string' ? JSON.parse(m.outcomePrices) : m.outcomePrices;
            yesPrice = parseFloat(pp[0]) || 0.5;
          } catch {}
          return {
            thresholdC,
            mode,
            yesPrice,
            noPrice: 1 - yesPrice,
            slug: m.slug,
            eventSlug: ev.slug,
            volume: Number(m.volumeNum) || Number(m.volume) || 0,
          };
        })
        .filter((p: PriceRow) => p.thresholdC !== null && p.mode === 'exact' && p.yesPrice > 0.01 && p.yesPrice < 0.99)
        .sort((a: PriceRow, b: PriceRow) => (a.thresholdC || 0) - (b.thresholdC || 0));

      if (prices.length < 2) continue;

      // Real forecast: hourly + daily max/min + current temp
      let forecastMaxC: number | null = null;
      let forecastMinC: number | null = null;
      let currentTempC: number | null = null;
      let station = 'Open-Meteo';
      const hourly: HourlyPoint[] = [];
      try {
        const f = await cachedFetch(
          `om-${coords.lat}-${coords.lon}-${date}`,
          `${OPEN_METEO}?latitude=${coords.lat}&longitude=${coords.lon}&hourly=temperature_2m&daily=temperature_2m_max,temperature_2m_min&timezone=auto&past_days=2&forecast_days=6&current=temperature_2m`
        );
        const dayIdx = (f.daily?.time || []).findIndex((t: string) => t === date);
        if (dayIdx >= 0) {
          forecastMaxC = f.daily.temperature_2m_max[dayIdx];
          forecastMinC = f.daily.temperature_2m_min[dayIdx];
        }
        if (f?.current?.temperature_2m != null) currentTempC = f.current.temperature_2m;
        const times = f.hourly?.time || [];
        const temps = f.hourly?.temperature_2m || [];
        for (let i = 0; i < times.length; i++) {
          const t = String(times[i]);
          if (t.startsWith(date)) {
            const hh = t.slice(11, 13);
            if (+hh % 3 === 0) hourly.push({ time: hh + ':00', tempC: temps[i] });
          }
        }
        if (f?.location?.name) station = f.location.name;
      } catch {}
      if (forecastMaxC === null || forecastMinC === null) continue;

      const bestMarket = prices.find(p => p.thresholdC === Math.round(forecastMaxC)) || prices[Math.floor(prices.length / 2)];

      groups.set(key, {
        city,
        date,
        type: isHigh ? 'high' : 'low',
        forecastMaxC,
        forecastMinC,
        currentTempC,
        station,
        hourly,
        prices,
        bestSlug: bestMarket?.slug || '',
        bestEventSlug: bestMarket?.eventSlug || ev.slug || '',
      });
    }

    const result = [...groups.values()].sort((a, b) => a.city.localeCompare(b.city));
    return NextResponse.json({ generatedAt: Date.now(), groups: result });
  } catch (e: any) {
    return NextResponse.json({ error: e.message, groups: [] }, { status: 500 });
  }
}
