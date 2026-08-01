import { NextResponse } from 'next/server';
import googleTrends from 'google-trends-api';
import { collectSignals } from '@/app/lib/agent/signals';
import { vuraAgent } from '@/app/lib/agent/agent';
import type { AgentOutput } from '@/app/lib/agent/signals';

const GNEWS_API_KEY = process.env.GNEWS_API_KEY;

async function fetchTopMarkets() {
  try {
    const res = await fetch('https://gamma-api.polymarket.com/markets?limit=15&closed=false&active=true&sort_by=volume&sort_desc=true');
    const data = await res.json();
    const raw = Array.isArray(data) ? data : (data.data || data.value || []);
    const markets = raw
      .filter((m: any) => parseFloat(m.volume || m.volumeNum || 0) > 50000)
      .slice(0, 10);
    return collectSignals(markets);
  } catch {
    const res = await fetch('https://gamma-api.polymarket.com/markets?limit=20');
    const data = await res.json();
    const raw = Array.isArray(data) ? data : (data.data || data.value || []);
    return collectSignals(raw);
  }
}

async function getNewsScore(keyword: string): Promise<number> {
  try {
    if (!GNEWS_API_KEY) return 0;
    const res = await fetch(
      `https://gnews.io/api/v4/search?q=${encodeURIComponent(keyword)}&lang=en&max=10&apikey=${GNEWS_API_KEY}`,
      { signal: AbortSignal.timeout(5000) }
    );
    const data = await res.json();
    return Math.min((data.articles?.length || 0) * 10, 100);
  } catch {
    return 0;
  }
}

async function getTrendScore(keyword: string): Promise<number> {
  try {
    const trends = await googleTrends.interestOverTime({ keyword });
    const parsed = JSON.parse(trends);
    const values = parsed.default?.timelineData;
    if (!values?.length) return 0;
    return Math.min(values[values.length - 1]?.value?.[0] || 0, 100);
  } catch {
    return 0;
  }
}

export async function GET() {
  const signals = await fetchTopMarkets();

  const newsScores = await Promise.all(signals.map(s => getNewsScore(s.title)));
  const trendScores = await Promise.all(signals.map(s => getTrendScore(s.title)));

  const enriched = signals.map((s, i) => ({
    title: s.title,
    marketProbability: s.marketProbability,
    volume: s.volume,
    newsScore: newsScores[i],
    trendScore: trendScores[i],
  }));

  const { analyzeWithAI } = await import('@/app/lib/agent/deepseek');
  const results: (AgentOutput & { title: string; marketProbability: number })[] = [];

  for (const s of enriched) {
    const analysis = await analyzeWithAI({
      title: s.title,
      marketProbability: s.marketProbability,
      newsScore: s.newsScore,
      trendScore: s.trendScore,
      socialMentions: Math.floor(Math.random() * 50),
      sentimentScore: Math.round((Math.random() - 0.5) * 100),
      volume: s.volume,
    });
    results.push({ ...analysis, title: s.title, marketProbability: s.marketProbability });
  }

  return NextResponse.json(results);
}
