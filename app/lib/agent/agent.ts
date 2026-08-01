import type { AgentOutput } from './signals';
import type { Market } from '@/app/lib/types';

export class VURAAgent {
  private cache = new Map<string, { result: AgentOutput; ts: number }>();
  private cacheTTL = 60000;

  async analyze(market: Market, newsScore: number, trendScore: number): Promise<AgentOutput> {
    const key = market.id;
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.ts < this.cacheTTL) return cached.result;

    const { analyzeWithAI } = await import('./deepseek');

    const signal = {
      title: market.question,
      marketProbability: Math.round(market.yesPrice * 100),
      newsScore,
      trendScore,
      socialMentions: Math.floor(Math.random() * 50),
      sentimentScore: Math.round((Math.random() - 0.5) * 100),
      volume: market.volume,
    };

    const result = await analyzeWithAI(signal);
    this.cache.set(key, { result, ts: Date.now() });
    return result;
  }

  async analyzeBatch(
    markets: Market[],
    newsScores: number[],
    trendScores: number[]
  ): Promise<AgentOutput[]> {
    return Promise.all(
      markets.map((m, i) => this.analyze(m, newsScores[i] || 0, trendScores[i] || 0))
    );
  }
}

export const vuraAgent = new VURAAgent();
