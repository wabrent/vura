import { NextRequest, NextResponse } from 'next/server';
import { findCity } from '@/app/lib/cities';

const GAMMA = 'https://gamma-api.polymarket.com';
const OPEN_METEO = 'https://api.open-meteo.com/v1/forecast';

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

interface Row {
  city: string;
  date: string;
  type: string;
  forecast: number;
  buckets: { thresholdC: number; yesPrice: number; slug: string; eventSlug: string }[];
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
    const rows: Row[] = [];

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
      if (dateTs - nowTs > 6 * 24 * 3600 * 1000) continue;
      if (dateTs < nowTs - 8 * 3600 * 1000) continue;
      const coords = findCity(city);
      if (!coords) continue;

      let forecast: number | null = null;
      try {
        const f = await cachedFetch(
          `om-${coords.lat}-${coords.lon}-${date}`,
          `${OPEN_METEO}?latitude=${coords.lat}&longitude=${coords.lon}&daily=temperature_2m_max,temperature_2m_min&timezone=auto&past_days=2&forecast_days=6`
        );
        const dayIdx = (f.daily?.time || []).findIndex((t: string) => t === date);
        if (dayIdx >= 0) forecast = isHigh ? f.daily.temperature_2m_max[dayIdx] : f.daily.temperature_2m_min[dayIdx];
      } catch {}
      if (forecast === null) continue;

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
          return { thresholdC, yesPrice, slug: m.slug, eventSlug: ev.slug };
        })
        .filter((b: any) => b.thresholdC !== null && !/below|above/i.test(ev.title + ' ' + (ev.markets || []).find((x: any) => x.slug === b.slug)?.question || '') && b.yesPrice > 0.01 && b.yesPrice < 0.99)
        .sort((a: any, b: any) => a.thresholdC - b.thresholdC);

      if (buckets.length >= 2) {
        rows.push({ city, date, type: isHigh ? 'high' : 'low', forecast, buckets });
      }
    }

    // Ask DeepSeek to pick the best trades
    const apiKey = process.env.DEEPSEEK_API_KEY || 'sk-112e3801734f4c2b9e914fb1b72fe774';
    const prompt = `You are a weather prediction market trader. For each city below I give: forecast high/low temp (°C), and the Polymarket buckets with YES price (0-1, in %).

The goal: find the best trades where the market price is clearly wrong vs the forecast. A bucket near the forecast should be cheap (YES < 40%), or a bucket far from the forecast should be expensive (YES > 60%).

Data (City | Date | type | forecast°C | buckets as temp:price%):
${rows.slice(0, 30).map(r => `${r.city} | ${r.date} | ${r.type} | ${r.forecast} | ${r.buckets.map(b => `${b.thresholdC}:${(b.yesPrice * 100).toFixed(0)}%`).join(', ')}`).join('\n')}

Pick up to 6 best trades. For each return a line:
City | Date | BUY YES or BUY NO | temp°C | price¢ | short reason (max 10 words)
Only pick trades where the mismatch is clear. Use exactly this pipe format, no markdown.`;

    const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
        max_tokens: 600,
      }),
      signal: AbortSignal.timeout(25000),
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ error: err, recs: [] }, { status: res.status });
    }

    const data = await res.json();
    const content: string = data.choices?.[0]?.message?.content || '';

    // Parse DeepSeek lines into structured recommendations
    const recs: { city: string; date: string; type: string; thresholdC: number; side: 'YES' | 'NO'; price: number; forecast: number; reason: string; slug: string; eventSlug: string }[] = [];

    for (const line of content.split('\n')) {
      const parts = line.split('|').map(s => s.trim());
      if (parts.length < 5) continue;
      const city = parts[0];
      const date = parts[1];
      const sideRaw = parts[2].toUpperCase();
      const side: 'YES' | 'NO' = sideRaw.includes('NO') ? 'NO' : 'YES';
      const thresholdC = parseInt(parts[3]) || 0;
      const price = parseInt(parts[4]) / 100;
      const reason = parts[5] || '';
      if (!city || !thresholdC || !price) continue;

      const row = rows.find(r => r.city === city && r.date === date);
      const bucket = row?.buckets.find(b => b.thresholdC === thresholdC);
      if (!row || !bucket) continue;

      recs.push({
        city,
        date,
        type: row.type,
        thresholdC,
        side,
        price,
        forecast: row.forecast,
        reason,
        slug: bucket.slug,
        eventSlug: bucket.eventSlug,
      });
    }

    return NextResponse.json({ generatedAt: Date.now(), recs });
  } catch (e: any) {
    return NextResponse.json({ error: e.message, recs: [] }, { status: 500 });
  }
}
