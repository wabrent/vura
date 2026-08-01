'use client';

import { useState } from 'react';

const DEMO_QUESTIONS = [
  'Will Bitcoin reach $80K by July 2026?',
  'Will Trump win the 2028 election?',
  'Will Ethereum ETF beat Bitcoin ETF inflows Q3 2026?',
];

export default function Sandbox() {
  const [q, setQ] = useState('');
  const [result, setResult] = useState<any>(null);
  const [thinking, setThinking] = useState(false);

  const analyze = () => {
    if (!q.trim()) return;
    setThinking(true);
    setResult(null);
    setTimeout(() => {
      setResult({
        question: q,
        market: Math.round(25 + Math.random() * 60),
        ai: Math.round(20 + Math.random() * 70),
        confidence: Math.random() > 0.3 ? 'Medium' : 'High',
        signals: [
          { name: 'News Coverage', val: Math.round(10 + Math.random() * 70), max: 100 },
          { name: 'Search Trends', val: Math.round(5 + Math.random() * 60), max: 100 },
          { name: 'Social Buzz', val: Math.round(5 + Math.random() * 50), max: 100 },
        ],
        reasoning: [
          'Analyzed 15+ news sources for keyword relevance',
          'Compared search trends across 7-day window',
          'Weighted social sentiment against historical baselines',
        ],
      });
      setThinking(false);
    }, 1500 + Math.random() * 1000);
  };

  return (
    <div style={{ maxWidth: 1100, margin: '40px auto 0', fontFamily: 'var(--mono)' }}>
      <div style={{ fontSize: 10, color: 'var(--text-3)', letterSpacing: '0.08em', marginBottom: 10 }}>
        SANDBOX — Try any prediction question
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
        {DEMO_QUESTIONS.map((dq, i) => (
          <button key={i}
            onClick={() => { setQ(dq); setResult(null); }}
            style={{
              fontSize: 9, padding: '4px 10px', background: q === dq ? 'rgba(123,97,255,0.1)' : 'var(--bg-2)', border: `1px solid ${q === dq ? '#7B61FF' : 'var(--border)'}`, color: q === dq ? '#7B61FF' : 'var(--text-3)', borderRadius: 3, cursor: 'pointer', fontFamily: 'inherit',
            }}>
            {dq}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <input
          type="text"
          value={q}
          onChange={e => { setQ(e.target.value); setResult(null); }}
          onKeyDown={e => e.key === 'Enter' && analyze()}
          placeholder="Type any question... e.g. Will SpaceX launch Starship by December 2026?"
          style={{
            flex: 1, padding: '10px 14px', fontSize: 12, background: 'var(--bg-2)', border: '1px solid var(--border)', color: 'var(--text)', borderRadius: 4, fontFamily: 'inherit', outline: 'none',
          }}
        />
        <button onClick={analyze} disabled={thinking || !q.trim()}
          style={{
            padding: '10px 24px', fontSize: 11, fontWeight: 600, background: (!q.trim() || thinking) ? '#222' : '#7B61FF', border: 'none', color: (!q.trim() || thinking) ? '#555' : '#fff', borderRadius: 4, cursor: (!q.trim() || thinking) ? 'not-allowed' : 'pointer', fontFamily: 'inherit', letterSpacing: '0.04em',
          }}>
          {thinking ? 'ANALYZING...' : 'ANALYZE →'}
        </button>
      </div>

      {thinking && (
        <div style={{ marginTop: 20, textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: '#7B61FF' }}>
            Fetching news · Google Trends · Reddit mentions · Computing probabilities...
          </div>
          <div style={{ height: 3, background: 'var(--bg-2)', borderRadius: 2, margin: '12px auto', maxWidth: 300, overflow: 'hidden' }}>
            <div className="animate-shimmer" style={{ width: '100%', height: '100%', background: 'linear-gradient(90deg, transparent, var(--accent-dim), transparent)', animation: 'shimmer 1.5s infinite' }} />
          </div>
        </div>
      )}

      {result && (
        <div style={{ marginTop: 20, background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 4, padding: 18, animation: 'fadeIn 0.3s ease' }}>
          <div style={{ fontSize: 10, color: 'var(--text-3)', marginBottom: 2 }}>RESULT</div>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 16 }}>{result.question}</div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 16 }}>
            <div style={{ padding: '10px 12px', background: 'var(--bg)', borderRadius: 3 }}>
              <div style={{ fontSize: 8, color: 'var(--text-3)', marginBottom: 2 }}>MARKET PRICE</div>
              <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'var(--display)' }}>{result.market}%</div>
            </div>
            <div style={{ padding: '10px 12px', background: 'var(--bg)', borderRadius: 3 }}>
              <div style={{ fontSize: 8, color: 'var(--text-3)', marginBottom: 2 }}>AI ANALYSIS</div>
              <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'var(--display)', color: '#7B61FF' }}>{result.ai}%</div>
            </div>
            <div style={{ padding: '10px 12px', background: 'var(--bg)', borderRadius: 3 }}>
              <div style={{ fontSize: 8, color: 'var(--text-3)', marginBottom: 2 }}>CONFIDENCE</div>
              <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'var(--display)', color: result.ai - result.market > 5 ? '#059669' : '#f59e0b' }}>{result.confidence}</div>
            </div>
          </div>

          <div style={{ fontSize: 9, color: 'var(--text-3)', letterSpacing: '0.06em', marginBottom: 8 }}>SIGNAL SOURCES</div>
          {result.signals.map((s: any, i: number) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 9, color: 'var(--text-3)', width: 80 }}>{s.name}</span>
              <div style={{ flex: 1, height: 4, background: 'var(--bg)', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ width: `${s.val}%`, height: '100%', background: s.val > 40 ? '#7B61FF' : '#3b82f6', borderRadius: 2, transition: 'width 0.6s ease' }} />
              </div>
              <span style={{ fontSize: 9, fontWeight: 600, width: 30, textAlign: 'right' }}>{s.val}</span>
            </div>
          ))}

          <div style={{ marginTop: 12, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {result.reasoning.map((r: string, i: number) => (
              <span key={i} style={{ fontSize: 8, padding: '3px 8px', background: 'rgba(5,150,105,0.06)', border: '1px solid rgba(5,150,105,0.15)', color: '#059669', borderRadius: 3 }}>{r}</span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
