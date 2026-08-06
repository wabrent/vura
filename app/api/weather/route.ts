import { NextRequest, NextResponse } from 'next/server';
import { findCity } from '@/app/lib/cities';

const GAMMA = 'https://gamma-api.polymarket.com';
const OPEN_METEO = 'https://api.open-meteo.com/v1/forecast';

interface WeatherMarket {
  conditionId: string;
  question: string;
  thresholdC: number | null;
  mode: 'exact' | 'above' | 'below';
  yesPrice: number;
  slug: string;
  eventSlug: string;
  volume: number;
}

interface BucketRow {
  thresholdC: number;
  mode: 'exact' | 'above' | 'below';
  marketPrice: number;
  modelProb: number;
  edge: number;
  ev: number;
}

interface CityGroup {
  city: string;
  date: string;
  type: 'high' | 'low';
  forecastMaxC: number;
  forecastMinC: number;
  resolutionStation: string;
  buckets: BucketRow[];
  best: BucketRow | null;
  basketCost: number;
  basketEv: number;
  horizonHours: number;
  bestSlug: string;
  bestEventSlug: string;
}

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

function normCdf(x: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989422804014327 * Math.exp(-x * x / 2);
  const p = d * t * (0.319381530 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
  return x >= 0 ? 1 - p : p;
}

function bucketProb(fc: number, X: number, sigma: number): number {
  return normCdf((X + 0.5 - fc) / sigma) - normCdf((X - 0.5 - fc) / sigma);
}

function calcEv(p: number, price: number): number {
  if (price <= 0 || price >= 1) return 0;
  return p * (1 / price - 1) - (1 - p);
}

// Estimated forecast error grows with horizon: ~0.8C today, ~1.4C at D+2, ~2C at D+4
function sigmaForHorizon(hours: number): number {
  return 0.8 + Math.min(hours, 96) * 0.012;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const pages = Math.min(parseInt(searchParams.get('pages') || '3'), 6);

    // Fetch fresh events first (order=id desc gives newest weather markets)
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
    const stationMap = new Map<string, string>();

    for (const ev of allEvents) {
      const title = ev.title || '';
      const isHigh = /highest temperature|high temperature/i.test(title);
      const isLow = /lowest temperature|low temperature/i.test(title);
      if (!isHigh && !isLow) continue;

      const city = parseCity(title);
      if (!city) continue;
      const date = parseDate(title);
      if (!date) continue;

      // Keep D-0 (after 18:00 skip today) through D+5
      const dateTs = new Date(date + 'T00:00:00Z').getTime();
      const dateStartMs = dateTs; // local midnight UTC approximation
      const horizonMs = dateStartMs - nowTs;
      if (horizonMs < -8 * 3600 * 1000) continue;
      if (horizonMs > 6 * 24 * 3600 * 1000) continue;

      const coords = findCity(city);
      if (!coords) continue;

      const key = `${city}|${date}|${isHigh ? 'high' : 'low'}`;

      const markets: WeatherMarket[] = (ev.markets || [])
        .filter((m: any) => m.active && !m.closed)
        .map((m: any) => {
          const { thresholdC, mode } = parseTempQuestion(m.question);
          let yesPrice = 0.5;
          try {
            const pp = typeof m.outcomePrices === 'string' ? JSON.parse(m.outcomePrices) : m.outcomePrices;
            yesPrice = parseFloat(pp[0]) || 0.5;
          } catch {}
          return {
            conditionId: m.conditionId,
            question: m.question,
            thresholdC,
            mode,
            yesPrice,
            slug: m.slug,
            eventSlug: ev.slug,
            volume: Number(m.volumeNum) || Number(m.volume) || 0,
          };
        })
        .filter((m: WeatherMarket) => m.thresholdC !== null && m.yesPrice > 0.005 && m.yesPrice < 0.995);

      if (markets.length < 3) continue;

      // Fetch forecast: max, min, plus station name
      let forecastMaxC: number | null = null;
      let forecastMinC: number | null = null;
      let station = 'Open-Meteo';
      try {
        const f = await cachedFetch(
          `om-${coords.lat}-${coords.lon}-${date}`,
          `${OPEN_METEO}?latitude=${coords.lat}&longitude=${coords.lon}&hourly=temperature_2m&daily=temperature_2m_max,temperature_2m_min&timezone=auto&past_days=2&forecast_days=6`
        );
        const dayIdx = (f.daily?.time || []).findIndex((t: string) => t === date);
        if (dayIdx >= 0) {
          forecastMaxC = f.daily.temperature_2m_max[dayIdx];
          forecastMinC = f.daily.temperature_2m_min[dayIdx];
        }
        if (f?.location?.name) station = f.location.name;
      } catch {}
      if (forecastMaxC === null || forecastMinC === null) continue;

      const forecast = isHigh ? forecastMaxC : forecastMinC;
      const sigma = sigmaForHorizon(horizonMs / 3600000);

      const buckets: BucketRow[] = markets.map(m => {
        const X = m.thresholdC!;
        let modelProb: number;
        if (m.mode === 'below') modelProb = normCdf((X - forecast) / sigma);
        else if (m.mode === 'above') modelProb = 1 - normCdf((X - forecast) / sigma);
        else modelProb = bucketProb(forecast, X, sigma);
        modelProb = Math.max(0.002, Math.min(0.998, modelProb));
        const edge = modelProb - m.yesPrice;
        return {
          thresholdC: X,
          mode: m.mode,
          marketPrice: m.yesPrice,
          modelProb,
          edge,
          ev: calcEv(modelProb, m.yesPrice),
        };
      })
        // Only tradable buckets: real probability + real price (not illiquid 1c dust)
        .filter(b => b.mode === 'exact')
        .filter(b => b.modelProb >= 0.04 && b.marketPrice >= 0.02 && b.marketPrice <= 0.85);

      if (buckets.length < 3) continue;

      // Ladder: take 3-4 adjacent buckets centered on the corrected forecast
      const sorted = [...buckets].sort((a, b) => a.thresholdC - b.thresholdC);
      const centerIdx = sorted.reduce((bi, b, i, arr) => Math.abs(b.thresholdC - forecast) < Math.abs(arr[bi].thresholdC - forecast) ? i : bi, 0);
      const ladder = sorted.slice(Math.max(0, centerIdx - 1), Math.min(sorted.length, centerIdx + 2));
      const basketCost = ladder.reduce((s, b) => s + b.marketPrice, 0);
      const basketEv = ladder.reduce((s, b) => s + b.ev * b.marketPrice, 0);
      const winPct = ladder.reduce((s, b) => s + b.modelProb, 0);

      // Skip setups that are too cheap (dust) or have no real chance
      if (basketCost < 0.03 || winPct < 0.12) continue;

      const best = [...buckets].sort((a, b) => Math.abs(b.edge) - Math.abs(a.edge))[0];
      const bestMarket = markets.find(m => m.thresholdC === best?.thresholdC && m.mode === best.mode) || markets[0];

      groups.set(key, {
        city,
        date,
        type: isHigh ? 'high' : 'low',
        forecastMaxC,
        forecastMinC,
        resolutionStation: station,
        buckets: sorted,
        best,
        basketCost,
        basketEv,
        horizonHours: Math.max(0, Math.round(horizonMs / 3600000)),
        bestSlug: bestMarket?.slug || '',
        bestEventSlug: bestMarket?.eventSlug || ev.slug || '',
      });
      stationMap.set(key, station);
    }

    const result = [...groups.values()].sort((a, b) => {
      const roiA = a.basketCost > 0 ? 100 / a.basketCost - 1 : 0;
      const roiB = b.basketCost > 0 ? 100 / b.basketCost - 1 : 0;
      return roiB - roiA;
    });
    return NextResponse.json({ generatedAt: Date.now(), groups: result });
  } catch (e: any) {
    return NextResponse.json({ error: e.message, groups: [] }, { status: 500 });
  }
}
