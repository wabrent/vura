import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { markets } = await req.json();
    const apiKey = process.env.DEEPSEEK_API_KEY || 'sk-112e3801734f4c2b9e914fb1b72fe774';
    
    const top = (markets || []).sort((a: any, b: any) => b.v - a.v).slice(0, 15);
    const marketList = top.map((m: any) => 
      `${m.q.substring(0, 60)} | ${m.c} | Vol:$${(m.v/1000).toFixed(0)}K | 24h:${m.ch > 0 ? '+' : ''}${m.ch}% | Alpha:${m.al}`
    ).join('\n');

    const prompt = `Analyze these Polymarket prediction markets. Return JSON:
{
  "summary": "1-2 sentence market overview",
  "signals": [
    {"market": "short name", "direction": "bullish|bearish|neutral", "confidence": 85, "reason": "why", "action": "buy|sell|hold"}
  ],
  "anomaly": "any unusual activity noted",
  "hotTopics": ["trending topic 1", "trending topic 2"]
}

Markets (name | price(c) | volume | 24h% | alpha):
${marketList}`;

    const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        max_tokens: 800
      }),
      signal: AbortSignal.timeout(20000)
    });

    if (!res.ok) {
      const err = await res.text();
      return NextResponse.json({ error: err }, { status: res.status });
    }

    const data = await res.json();
    const content = data.choices?.[0]?.message?.content || '';
    
    // Parse JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return NextResponse.json(JSON.parse(jsonMatch[0]));
    }
    return NextResponse.json({ raw: content });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
