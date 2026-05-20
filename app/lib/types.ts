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

export interface ArbitrageOp {
  market: Market;
  platform: string;
  gap: string;
  priceA: number;
  priceB: number;
}

export interface Alert {
  id: number;
  marketId: string;
  question: string;
  dir: 'above' | 'below';
  val: number;
  triggered: boolean;
}

export interface WhaleEvent {
  time: Date;
  addr: string;
  market: string;
  slug: string;
  side: string;
  amount: number;
  isNew: boolean;
  signalType: 'volume' | 'change' | 'spread';
}

export interface CorrelationPair {
  marketA: Market;
  marketB: Market;
  score: number;
  keywords: string[];
}
