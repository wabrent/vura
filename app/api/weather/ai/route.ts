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
    const rows: { city: string; date: string; type: string; forecast: number; market: number; price: number }[] = [];

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

      // Find the closest-priced market bucket around the forecast
      const markets = (ev.markets || []).filter((m: any) => m.active && !m.closed);
      const near = markets.map((m: any) => {
        let threshold = null;
        const cm = m.question.match(/(\d{1,3})\s*(?:°|º)?C/i);
        const fm = m.question.match(/(\d{2,3})\s*(?:°|º)?F/i);
        if (cm) threshold = parseInt(cm[1]);
        else if (fm) threshold = Math.round((parseInt(fm[1]) - 32) * 5 / 9);
        let price = 0.5;
        try {
          const pp = typeof m.outcomePrices === 'string' ? JSON.parse(m.outcomePrices) : m.outcomePrices;
          price = parseFloat(pp[0]) || 0.5;
        } catch {}
        return { threshold, price };
      }).filter((m: any) => m.threshold !== null)
        .sort((a: any, b: any) => Math.abs(a.threshold - forecast) - Math.abs(b.threshold - forecast))[0];

      if (!near) continue;
      rows.push({
        city,
        date,
        type: isHigh ? 'high' : 'low',
        forecast,
        market: near.threshold,
        price: near.price,
      });
    }

    // Ask DeepSeek to analyze the top divergences
    const apiKey = process.env.DEEPSEEK_API_KEY || 'sk-112e3801734f4c2b9e914fb1b72fe774';    const prompt = `You are a weather prediction market analyst. Here is real forecast data vs Polymarket prices.

For each line: City | Date | Type(high/low) | Forecast temp (°C) | Nearest market bucket (°C) | Market price of that bucket (0-1, = % chance market gives).

Data:
${rows.slice(0, 25).map(r => `${r.city} | ${r.date} | ${r.type} | ${r.forecast}°C | ${r.market}°C | ${(r.price * 100).toFixed(0)}%`).join('\n')}

Find 3-5 of the most interesting situations where the market price looks mispriced vs the forecast (market gives a bucket a very different probability than the forecast implies). For each, output a short line: City, what to consider (buy YES/NO on which bucket), and why in one sentence. Be concise. Return as a plain list, no markdown.`;

    const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 500,
      }),
      signal: AbortSignal.timeout(25000),
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ error: err, rows }, { status: res.status });
    }

    const data = await res.json();
    const analysis = data.choices?.[0]?.message?.content || '';
    return NextResponse.json({ analysis, generatedAt: Date.now(), rows: rows.slice(0, 25) });
  } catch (e: any) {
    return NextResponse.json({ error: e.message, rows: [] }, { status: 500 });
  }
}
