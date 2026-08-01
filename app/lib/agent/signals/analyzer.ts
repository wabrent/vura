import type { AgentSignal } from '../types';
import { fetchNews } from '../skills/news';
import { fetchTrends } from '../skills/trends';
import { fetchRedditMentions } from '../skills/reddit';

function classifyTitle(title: string): string {
  const l = title.toLowerCase();
  if (l.includes('bitcoin') || l.includes('btc') || l.includes('ethereum') || l.includes('eth') || l.includes('sol') || l.includes('crypto') || l.includes('token') || l.includes('airdrop')) return 'crypto';
  if (l.includes('trump') || l.includes('biden') || l.includes('election') || l.includes('president') || l.includes('congress') || l.includes('senate') || l.includes('war') || l.includes('china') || l.includes('russia') || l.includes('ukraine') || l.includes('taiwan')) return 'politics';
  if (l.includes('nba') || l.includes('nfl') || l.includes('mlb') || l.includes('nhl') || l.includes('soccer') || l.includes('champion') || l.includes('finals') || l.includes('super bowl') || l.includes('world cup') || l.includes('spurs') || l.includes('knicks') || l.includes('thunder') || l.includes('canadiens') || l.includes('golden knights')) return 'sports';
  if (l.includes('gta') || l.includes('jesus') || l.includes('elon') || l.includes('musk') || l.includes('tesla') || l.includes('openai') || l.includes('gpt') || l.includes('apple') || l.includes('google') || l.includes('microsoft') || l.includes('meta') || l.includes('netflix')) return 'tech';
  if (l.includes('rate') || l.includes('inflation') || l.includes('gdp') || l.includes('fed') || l.includes('economy') || l.includes('stock') || l.includes('market') || l.includes('recession')) return 'economy';
  return 'general';
}

export async function analyzeSignal(event: {
  id: string;
  title: string;
  probability: number;
  volume: number;
  change24h?: number;
  category?: string;
  slug?: string;
}): Promise<AgentSignal> {
  const mktProb = event.probability;
  const change24h = event.change24h || 0;
  const category = classifyTitle(event.title);

  const stopWords = new Set(['will', 'the', 'a', 'an', 'by', 'in', 'to', 'for', 'of', 'and', 'or', 'is', 'be', 'at', 'on', 'not', 'are', 'was', 'were', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'but', 'if', 'than', 'that', 'this', 'with', 'before', 'after', 'during', 'without', 'about', 'into', 'through', 'over', 'between', 'out', 'against', 'up', 'down', 'from']);
  const keywords = event.title.toLowerCase().split(/\W+/).filter(w => w.length > 2 && !stopWords.has(w)).slice(0, 5).join(' ');

  const newsPromise = fetchNews(keywords).catch(() => ({ score: 0, headlines: [] }));
  const trendsPromise = fetchTrends(keywords).catch(() => 0);
  const redditPromise = fetchRedditMentions(keywords).catch(() => ({ score: 0, mentions: [] }));

  const [news, trends, reddit] = await Promise.all([newsPromise, trendsPromise, redditPromise]);

  const reasoning: string[] = [];
  const conflicts: string[] = [];

  // Volume analysis
  const volLevel = event.volume > 1000000 ? 'very high' : event.volume > 500000 ? 'high' : event.volume > 100000 ? 'moderate' : 'low';
  reasoning.push(`${volLevel.toUpperCase()} volume: $${(event.volume / 1000).toFixed(0)}K`);

  // 24h change analysis
  if (Math.abs(change24h) > 0.05) {
    const dir = change24h > 0 ? 'up' : 'down';
    reasoning.push(`24h momentum ${dir}: ${(Math.abs(change24h) * 100).toFixed(1)}%`);
    if (Math.abs(change24h) > 0.2) conflicts.push(`Sharp 24h move (${(change24h * 100).toFixed(1)}%) — trend may be exhausted`);
  } else {
    reasoning.push('24h price stable');
  }

  // Probability edge
  const edgeFrom50 = Math.abs(mktProb - 50);
  if (edgeFrom50 < 5) {
    conflicts.push('Market near 50/50 — no clear signal');
  } else if (edgeFrom50 > 30) {
    reasoning.push(`Strong market conviction: ${mktProb}% probability`);
  } else {
    reasoning.push(`Moderate market bias: ${mktProb}%`);
  }

  // News
  if (news.score > 20) reasoning.push(`News activity: ${news.score}/100`);
  else if (news.score > 0) reasoning.push(`Light news coverage: ${news.score}/100`);
  else reasoning.push(`News: no recent articles`);

  // Trends
  if (trends > 20) reasoning.push(`Google Trends rising: +${trends}`);
  else if (trends > 5) reasoning.push(`Search interest: ${trends}/100`);
  else reasoning.push(`Search interest: low`);

  // Reddit/social
  if (reddit.score > 20) reasoning.push(`Social mentions: ${reddit.score}/100`);
  else if (reddit.score > 0) reasoning.push(`Social: ${reddit.score}/100`);
  else reasoning.push(`Social: no mentions detected`);

  // Category context
  reasoning.push(`Category: ${category}`);

  // Score calculation — based on real data only
  const volScore = Math.min(event.volume / 500000, 3) * 15;
  const momentumScore = Math.abs(change24h) * 100;
  const convictionScore = edgeFrom50 * 1.2;
  const newsScore = news.score * 0.15;
  const trendScore = trends * 0.15;
  const socialScore = reddit.score * 0.1;

  const strength = Math.min(100, Math.max(0,
    volScore + momentumScore + convictionScore + newsScore + trendScore + socialScore
  ));

  const aiProbability = Math.min(100, Math.max(0,
    mktProb * 0.45 +
    (momentumScore > 10 ? (change24h > 0 ? 8 : -8) : 0) +
    volScore * 0.1 +
    newsScore * 0.1 +
    trendScore * 0.1 +
    convictionScore * 0.1
  ));

  const momentum: 'up' | 'down' | 'flat' =
    Math.abs(change24h) > 0.03 ? (change24h > 0 ? 'up' : 'down') : 'flat';

  const hasRealData = news.score > 0 || trends > 0 || reddit.score > 0;

  let confidence: 'Low' | 'Medium' | 'High' = 'Low';
  if (strength > 60 && conflicts.length <= 1 && hasRealData) confidence = 'High';
  else if (strength > 30 && conflicts.length <= 1) confidence = 'Medium';

  return {
    eventId: event.id,
    title: event.title,
    slug: event.slug || '',
    timestamp: Date.now(),
    marketProbability: mktProb,
    aiProbability: Math.round(aiProbability),
    confidence,
    signalStrength: Math.round(strength),
    momentum,
    newsScore: news.score,
    trendScore: trends,
    socialScore: reddit.score,
    sentimentScore: 0,
    conflicts,
    reasoning,
  };
}
