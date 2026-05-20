export interface Market {
  id: string;
  question: string;
  slug: string;
  category: string;
  alpha: number;
  volume: number;
  volDisplay: string;
  yesPrice: number;
  noPrice: number;
  bestBid: number | null;
  bestAsk: number | null;
  spread: number;
  change24h: number;
  context: string;
  smartScore: number;
}

export interface Alert {
  id: number;
  marketId: string;
  question: string;
  dir: 'above' | 'below';
  val: number;
  triggered: boolean;
}

export interface CorrelationPair {
  marketA: Market;
  marketB: Market;
  score: number;
  keywords: string[];
}
