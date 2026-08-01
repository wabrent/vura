export interface MarketEvent {
  id: string;
  title: string;
  slug: string;
  probability: number;
  volume: number;
  category: string;
  change24h: number;
}

export interface AgentSignal {
  eventId: string;
  title: string;
  slug: string;
  timestamp: number;
  marketProbability: number;
  aiProbability: number;
  confidence: 'Low' | 'Medium' | 'High';
  signalStrength: number;
  momentum: 'up' | 'down' | 'flat';
  newsScore: number;
  trendScore: number;
  socialScore: number;
  sentimentScore: number;
  conflicts: string[];
  reasoning: string[];
}

export interface AgentState {
  lastRun: number;
  runCount: number;
  signals: AgentSignal[];
  history: {
    aiProbabilities: { ts: number; val: number }[];
    marketProbabilities: { ts: number; val: number }[];
    signalScores: { ts: number; val: number }[];
    confidence: { ts: number; val: string }[];
  };
}
