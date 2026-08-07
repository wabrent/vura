import { NextRequest, NextResponse } from 'next/server';
import { findCity } from '@/app/lib/cities';

const GAMMA = 'https://gamma-api.polymarket.com';
const OPEN_METEO = 'https://api.open-meteo.com/v1/forecast';

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
    const cityMap = new Map<string, { city: string; date: string; type: string; eventSlug: string; buckets: { thresholdC: number; yesPrice: number; slug: string; volume: number }[] }>();

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
      const coords = findCity(city);
      if (!coords) continue;

      const buckets = (ev.markets || [])
        .filter((m: any) => m.active && !m.closed)
        .map((m: any) => {
          let thresholdC = null;
          const cm = m.question.match(/(\d{1,3})\s*(?:°|º)?C/i);
          const fm = m.question.match(/(\d{2,3})\s*(?:°|º)?F/i);
          if (cm) thresholdC = parseInt(cm[1]);
          else if (fm) thresholdC = Math.round((parseInt(fm[1]) - 32) * 5 / 9);
          let yesPrice = 0.5;
          try {
            const pp = typeof m.outcomePrices === 'string' ? JSON.parse(m.outcomePrices) : m.outcomePrices;
            yesPrice = parseFloat(pp[0]) || 0.5;
          } catch {}
          return { thresholdC, yesPrice, slug: m.slug, volume: Number(m.volumeNum) || Number(m.volume) || 0 };
        })
        .filter((b: any) => b.thresholdC !== null && /below|above/i.test((ev.markets || []).find((x: any) => x.slug === b.slug)?.question || '') === false && b.yesPrice > 0.001 && b.yesPrice < 0.999)
        .sort((a: any, b: any) => a.thresholdC - b.thresholdC);

      if (buckets.length < 2) continue;
      const key = `${city}|${date}`;
      cityMap.set(key, { city, date, type: isHigh ? 'high' : 'low', eventSlug: ev.slug, buckets });
    }

    // For each unique city+date, fetch full hourly forecast for charting
    const cities: any[] = [];
    for (const [key, v] of cityMap) {
      const coords = findCity(v.city);
      if (!coords) continue;
      try {
        const f = await cachedFetch(
          `term-${coords.lat}-${coords.lon}`,
          `${OPEN_METEO}?latitude=${coords.lat}&longitude=${coords.lon}&hourly=temperature_2m&daily=temperature_2m_max,temperature_2m_min&timezone=auto&past_days=1&forecast_days=3&current=temperature_2m`
        );
        const times = f.hourly?.time || [];
        const temps = f.hourly?.temperature_2m || [];
        const hourly = [];
        for (let i = 0; i < times.length; i++) {
          if (i % 3 === 0) hourly.push({ t: times[i].slice(5, 16), temp: temps[i] });
        }
        cities.push({
          city: v.city,
          date: v.date,
          type: v.type,
          eventSlug: v.eventSlug,
          currentTemp: f.current?.temperature_2m ?? null,
          forecastMax: f.daily?.temperature_2m_max || [],
          forecastMin: f.daily?.temperature_2m_min || [],
          dailyTime: f.daily?.time || [],
          hourly,
          buckets: v.buckets,
        });
      } catch {}
    }

    // Keep the nearest date per city for the terminal (today or tomorrow)
    const byCity = new Map<string, any>();
    for (const c of cities) {
      const existing = byCity.get(c.city);
      if (!existing || c.date < existing.date) byCity.set(c.city, c);
    }

    const list = [...byCity.values()].sort((a, b) => a.city.localeCompare(b.city));
    return NextResponse.json({ generatedAt: Date.now(), cities: list });
  } catch (e: any) {
    return NextResponse.json({ error: e.message, cities: [] }, { status: 500 });
  }
}
