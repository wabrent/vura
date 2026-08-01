'use client';

import { useState, useEffect } from 'react';

interface Signal {
  title: string;
  marketProbability: number;
  aiProbability: number;
  why: string[];
}

export default function AISignals() {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(false);
  const [raw, setRaw] = useState<any>(null);

  const fetchSignals = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/signals');
      const data = await res.json();
      setSignals(data);
      setRaw(data);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchSignals(); }, []);

  const avgAiProb = signals.length
    ? Math.round(signals.reduce((s, x) => s + x.aiProbability, 0) / signals.length)
    : 0;
  const avgMktProb = signals.length
    ? Math.round(signals.reduce((s, x) => s + x.marketProbability, 0) / signals.length)
    : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <div style={{ fontSize: '0.7rem', letterSpacing: '0.1em', color: 'var(--accent)', textTransform: 'uppercase' }}>VURA AI Signals</div>
          <span className="live-dot" style={{ background: 'var(--accent)', animation: 'pulse 1.5s ease-in-out infinite' }} />
          <span style={{ fontSize: '0.55rem', color: 'var(--text-3)' }}>News + Google Trends + Markets</span>
        </div>
        <button className="csv-btn" onClick={fetchSignals} disabled={loading} style={{ fontSize: '0.6rem' }}>
          {loading ? 'Scanning...' : '⟳ Refresh'}
        </button>
      </div>

      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        <div className="corr-stat" style={{ flex: 1, minWidth: 100 }}>
          <span className="corr-stat-label">MARKETS SCANNED</span>
          <span className="corr-stat-val">{signals.length}</span>
        </div>
        <div className="corr-stat" style={{ flex: 1, minWidth: 100 }}>
          <span className="corr-stat-label">AVG MARKET</span>
          <span className="corr-stat-val">{avgMktProb}%</span>
        </div>
        <div className="corr-stat" style={{ flex: 1, minWidth: 100 }}>
          <span className="corr-stat-label">AVG AI SIGNAL</span>
          <span className="corr-stat-val accent">{avgAiProb}%</span>
        </div>
        <div className="corr-stat" style={{ flex: 1, minWidth: 100 }}>
          <span className="corr-stat-label">BIAS</span>
          <span className={`corr-stat-val ${avgAiProb > avgMktProb ? 'accent' : 'red'}`}>
            {avgAiProb > avgMktProb ? '▲ Bull' : avgAiProb < avgMktProb ? '▼ Bear' : '—'}
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {[1,2,3,4,5].map(i => (
              <div key={i} className="skeleton" style={{ height: '3.5rem', animationDelay: `${i * 0.1}s` }} />
            ))}
          </div>
        ) : signals.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-3)', fontSize: '0.75rem' }}>
            No signals available. Check NewsAPI key and try again.
          </div>
        ) : (
          signals.map((s, i) => {
            const diff = s.aiProbability - s.marketProbability;
            const direction = diff > 5 ? 'bullish' : diff < -5 ? 'bearish' : 'neutral';
            const dirColor = direction === 'bullish' ? 'var(--accent)' : direction === 'bearish' ? 'var(--red)' : 'var(--text-3)';
            return (
              <div key={i} className="market-card animate-slide-up" style={{
                animationDelay: `${i * 0.05}s`,
                padding: '0.7rem 1rem',
                borderLeft: `3px solid ${dirColor}`,
              }}>
                <div className="card-left" style={{ flex: 1 }}>
                  <span className="card-title" style={{ fontSize: '0.7rem' }}>{s.title}</span>
                  <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.2rem', fontSize: '0.55rem', color: 'var(--text-3)' }}>
                    {s.why.map((w, wi) => <span key={wi}>{w}</span>)}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexShrink: 0 }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.55rem', color: 'var(--text-3)' }}>Market</div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, fontFamily: 'var(--display)' }}>{s.marketProbability}%</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.55rem', color: dirColor }}>VURA AI</div>
                    <div style={{ fontSize: '1rem', fontWeight: 700, fontFamily: 'var(--display)', color: dirColor }}>
                      {direction === 'bullish' ? '▲' : direction === 'bearish' ? '▼' : '▸'} {s.aiProbability}%
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      <details style={{ fontSize: '0.55rem', color: 'var(--text-3)', cursor: 'pointer', marginTop: '0.5rem' }}>
        <summary style={{ userSelect: 'none' }}>Debug: raw API response</summary>
        <pre style={{ marginTop: '0.5rem', padding: '1rem', background: 'var(--bg-2)', borderRadius: 'var(--radius)', overflow: 'auto', maxHeight: 300, fontSize: '0.55rem' }}>
          {JSON.stringify(raw, null, 2)}
        </pre>
      </details>
    </div>
  );
}
