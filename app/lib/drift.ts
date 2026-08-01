export interface DriftComponents {
  sentimentDelta: number;
  priceVelocity: number;
  volumeSpike: number;
}

export interface DriftScore {
  score: number;
  components: DriftComponents;
  label: 'BULL' | 'BEAR' | 'NEUTRAL';
  level: 'high' | 'medium' | 'low';
}

export function computeDrift(m: {
  change24h: number;
  volume: number;
  avgVolume?: number;
  newsScore?: number;
  trendScore?: number;
  socialScore?: number;
}): DriftScore {
  const avgVol = m.avgVolume || 100000;

  const priceVelocity = Math.max(-30, Math.min(30, m.change24h * 100 * 0.6));

  const volRatio = m.volume / Math.max(avgVol, 1);
  const volumeSpike = Math.max(-20, Math.min(20, (volRatio - 1) * 15));

  const hasNews = (m.newsScore || 0) > 0;
  const hasTrends = (m.trendScore || 0) > 0;
  const hasSocial = (m.socialScore || 0) > 0;
  const sourceCount = (hasNews ? 1 : 0) + (hasTrends ? 1 : 0) + (hasSocial ? 1 : 0);

  let sentimentDelta = 0;
  if (sourceCount > 0) {
    if (hasNews) sentimentDelta += ((m.newsScore || 0) - 50) * 0.3;
    if (hasTrends) sentimentDelta += ((m.trendScore || 0) - 50) * 0.25;
    if (hasSocial) sentimentDelta += ((m.socialScore || 0) - 50) * 0.2;
    sentimentDelta = Math.max(-30, Math.min(30, sentimentDelta));
  }

  const score = Math.round(
    sentimentDelta * 0.4 +
    priceVelocity * 0.35 +
    volumeSpike * 0.25
  );

  const clamped = Math.max(-100, Math.min(100, score));

  let label: 'BULL' | 'BEAR' | 'NEUTRAL' = 'NEUTRAL';
  if (clamped > 20) label = 'BULL';
  else if (clamped < -20) label = 'BEAR';

  let level: 'high' | 'medium' | 'low' = 'low';
  if (Math.abs(clamped) > 40) level = 'high';
  else if (Math.abs(clamped) > 15) level = 'medium';

  return {
    score: clamped,
    components: { sentimentDelta, priceVelocity, volumeSpike },
    label,
    level,
  };
}
