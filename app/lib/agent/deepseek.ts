import type { RawSignal, AgentOutput } from './signals';

export async function analyzeWithAI(signal: RawSignal): Promise<AgentOutput> {
  const prompt = `Analyze this prediction market signal:

Title: ${signal.title}
Market Probability: ${signal.marketProbability}%
News Score: ${signal.newsScore}
Trend Score: ${signal.trendScore}
Social Mentions: ${signal.socialMentions}
Sentiment Score: ${signal.sentimentScore}
Volume: $${signal.volume}

Return JSON only:
{
  "aiProbability": <0-100>,
  "confidence": "Low"|"Medium"|"High",
  "signalStrength": <0-100>,
  "momentum": "up"|"down"|"flat",
  "conflicts": [<array of conflicting signal descriptions>],
  "reason": [<array of explanation strings>]
}`;

  try {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) return fallbackAnalysis(signal);

    const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 500,
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) return fallbackAnalysis(signal);

    const data = await res.json();
    const text = data.choices?.[0]?.message?.content || '';
    const json = JSON.parse(text.replace(/```json|```/g, '').trim());
    return {
      aiProbability: Math.min(100, Math.max(0, json.aiProbability ?? 50)),
      confidence: ['Low', 'Medium', 'High'].includes(json.confidence) ? json.confidence : 'Medium',
      signalStrength: Math.min(100, Math.max(0, json.signalStrength ?? 50)),
      momentum: ['up', 'down', 'flat'].includes(json.momentum) ? json.momentum : 'flat',
      conflicts: Array.isArray(json.conflicts) ? json.conflicts : [],
      reason: Array.isArray(json.reason) ? json.reason : [],
    };
  } catch {
    return fallbackAnalysis(signal);
  }
}

function fallbackAnalysis(signal: RawSignal): AgentOutput {
  const edge = signal.marketProbability - 50;
  const strength = Math.min(100, Math.max(0,
    Math.abs(edge) * 1.5 +
    signal.newsScore * 0.2 +
    signal.trendScore * 0.2 +
    Math.abs(signal.sentimentScore) * 0.3 +
    Math.min(signal.socialMentions, 50)
  ));

  const aiProbability = Math.min(100, Math.max(0,
    signal.marketProbability * 0.6 +
    signal.newsScore * 0.15 +
    signal.trendScore * 0.15 +
    signal.sentimentScore * 0.1
  ));

  const momentum = edge > 5 ? 'up' : edge < -5 ? 'down' : 'flat';

  const reasons: string[] = [];
  const conflicts: string[] = [];

  if (signal.newsScore > 20) reasons.push('News momentum increasing');
  else if (signal.newsScore > 5) reasons.push('Moderate news coverage');
  else reasons.push('Low news activity');

  if (signal.trendScore > 20) reasons.push('Google Trends rising');
  else if (signal.trendScore > 5) reasons.push('Stable search interest');

  if (signal.socialMentions > 30) reasons.push('Social mentions rising');
  if (signal.sentimentScore > 20) reasons.push('Positive sentiment detected');
  else if (signal.sentimentScore < -20) conflicts.push('Negative sentiment contradicts market price');
  if (signal.volume < 10000) conflicts.push('Low liquidity — trades may face slippage');

  if (!conflicts.length) reasons.push('No conflicting signals');

  let confidence: 'Low' | 'Medium' | 'High' = 'Medium';
  if (strength > 70 && conflicts.length === 0) confidence = 'High';
  else if (strength < 30 || conflicts.length > 1) confidence = 'Low';

  const signalStrength = Math.round(strength);

  return {
    aiProbability: Math.round(aiProbability),
    confidence,
    signalStrength,
    momentum,
    conflicts,
    reason: reasons,
  };
}
