export interface RawSignal {
  title: string;
  marketProbability: number;
  newsScore: number;
  trendScore: number;
  socialMentions: number;
  sentimentScore: number;
  volume: number;
}

export interface AgentOutput {
  aiProbability: number;
  confidence: 'Low' | 'Medium' | 'High';
  signalStrength: number;
  momentum: 'up' | 'down' | 'flat';
  conflicts: string[];
  reason: string[];
}

export function collectSignals(markets: any[]): RawSignal[] {
  return markets.slice(0, 20).map((m: any) => {
    let price = 0.5;
    try {
      const p = typeof m.outcomePrices === 'string' ? JSON.parse(m.outcomePrices) : m.outcomePrices;
      price = p?.[0] ? parseFloat(p[0]) : 0.5;
    } catch {}
    return {
      title: m.question || 'Unknown',
      marketProbability: Math.round(price * 100),
      newsScore: 0,
      trendScore: 0,
      socialMentions: Math.floor(Math.random() * 50),
      sentimentScore: Math.round((Math.random() - 0.5) * 100),
      volume: parseFloat(m.volume || m.volumeNum || 0),
    };
  });
}
