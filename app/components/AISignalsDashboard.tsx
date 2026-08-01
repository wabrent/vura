'use client';

import { useState, useEffect, useMemo } from 'react';

interface Signal {
  title: string;
  marketProbability: number;
  aiProbability: number;
  why: string[];
}

const categories = ['All', 'Crypto', 'Politics', 'Tech', 'Economy', 'Sports'] as const;
const timeRanges = ['24h', '7d', '30d', 'All'] as const;

const signalIcons: Record<string, string> = {
  News: '📰',
  'Twitter/X': '𝕏',
  Reddit: 'Reddit',
  'Google Trends': 'Trends',
  'Whale activity': '🐋',
  'Trend score': 'Trend',
  Score: 'Score',
};

function getSignalIcon(reason: string): string {
  const lower = reason.toLowerCase();
  if (lower.includes('news')) return '📰';
  if (lower.includes('trend')) return 'Trends';
  if (lower.includes('reddit')) return 'Reddit';
  return 'Signal';
}

function getTrend(aiProb: number, mktProb: number): { dir: 'up' | 'down' | 'flat'; val: string } {
  const diff = aiProb - mktProb;
  if (diff > 3) return { dir: 'up', val: '+' + Math.round(diff) + '%' };
  if (diff < -3) return { dir: 'down', val: Math.round(diff) + '%' };
  return { dir: 'flat', val: '0%' };
}

export default function AISignalsDashboard() {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('All');
  const [timeRange, setTimeRange] = useState('24h');

  useEffect(() => {
    setLoading(true);
    fetch('/api/signals')
      .then(r => r.json())
      .then((data: Signal[]) => { if (Array.isArray(data)) setSignals(data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const stats = useMemo(() => {
    const n = signals.length;
    if (!n) return { avgAi: 0, avgMkt: 0, edge: 0, count: 0 };
    const avgAi = signals.reduce((s, x) => s + x.aiProbability, 0) / n;
    const avgMkt = signals.reduce((s, x) => s + x.marketProbability, 0) / n;
    return { avgAi: Math.round(avgAi), avgMkt: Math.round(avgMkt), edge: Math.round(avgAi - avgMkt), count: n };
  }, [signals]);

  const topSignals = useMemo(() => {
    return [...signals].sort((a, b) => (b.aiProbability - b.marketProbability) - (a.aiProbability - a.marketProbability)).slice(0, 5);
  }, [signals]);

  const recentAlerts = useMemo(() => {
    return signals.slice(0, 3).map(s => s.title);
  }, [signals]);

  const edgeColor = stats.edge > 0 ? '#059669' : stats.edge < 0 ? '#dc2626' : '#7B61FF';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', fontFamily: 'var(--mono)' }}>
      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <span style={{ fontSize: '0.7rem', letterSpacing: '0.12em', color: '#7B61FF', fontWeight: 600 }}>VURA AI SIGNALS</span>
          <span style={{ fontSize: '0.5rem', padding: '1px 5px', border: '1px solid #7B61FF', color: '#7B61FF', borderRadius: 2, letterSpacing: '0.05em' }}>BETA</span>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#059669', animation: 'pulse 1.5s ease-in-out infinite' }} />
        </div>
        <button onClick={() => { setLoading(true); fetch('/api/signals').then(r => r.json()).then((d: Signal[]) => { if (Array.isArray(d)) setSignals(d); }).finally(() => setLoading(false)); }}
          style={{ fontSize: '0.55rem', padding: '0.25rem 0.75rem', background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-3)', borderRadius: 2, cursor: 'pointer', fontFamily: 'inherit' }}>
          ⟳ Refresh
        </button>
      </div>

      {/* STATS ROW */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '0.5rem' }}>
        {[
          { label: 'AI Avg Probability', value: stats.avgAi + '%', color: '#7B61FF' },
          { label: 'Signals Analyzed (24h)', value: stats.count.toString(), color: 'var(--text)' },
          { label: 'AI Accuracy (30d)', value: '—', color: 'var(--text-3)' },
          { label: 'Data Sources Active', value: '5', color: 'var(--text)' },
        ].map((s, i) => (
          <div key={i} style={{ padding: '0.6rem 0.75rem', background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 3 }}>
            <div style={{ fontSize: '0.5rem', color: 'var(--text-3)', letterSpacing: '0.08em', marginBottom: '0.2rem' }}>{s.label}</div>
            <div style={{ fontSize: '1rem', fontWeight: 600, fontFamily: 'var(--display)', color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* FILTERS */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', padding: '0.4rem 0', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
          {categories.map(c => (
            <button key={c} onClick={() => setCategory(c)}
              style={{ fontSize: '0.55rem', padding: '0.2rem 0.5rem', background: category === c ? '#7B61FF' : 'transparent', border: `1px solid ${category === c ? '#7B61FF' : 'var(--border)'}`, color: category === c ? '#fff' : 'var(--text-3)', borderRadius: 2, cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '0.03em' }}>
              {c.toUpperCase()}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: '0.25rem' }}>
          {timeRanges.map(t => (
            <button key={t} onClick={() => setTimeRange(t)}
              style={{ fontSize: '0.5rem', padding: '0.15rem 0.4rem', background: timeRange === t ? 'var(--text)' : 'transparent', border: `1px solid ${timeRange === t ? 'var(--text)' : 'var(--border)'}`, color: timeRange === t ? 'var(--bg)' : 'var(--text-3)', borderRadius: 2, cursor: 'pointer', fontFamily: 'inherit' }}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 240px', gap: '1rem', alignItems: 'start' }}>
        {/* TABLE */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
          {/* HEADER ROW */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 0.7fr 0.7fr 1.5fr', gap: '0.5rem', padding: '0.4rem 0.6rem', fontSize: '0.5rem', color: 'var(--text-3)', letterSpacing: '0.08em', borderBottom: '1px solid var(--border)' }}>
            <span>Event</span>
            <span style={{ textAlign: 'right' }}>Market</span>
            <span style={{ textAlign: 'right' }}>AI</span>
            <span style={{ textAlign: 'right' }}>Edge</span>
            <span style={{ textAlign: 'center' }}>Trend</span>
            <span style={{ textAlign: 'center' }}>Why</span>
          </div>
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', padding: '1rem 0' }}>
              {[1,2,3,4,5].map(i => <div key={i} className="skeleton" style={{ height: '2.2rem', animationDelay: `${i*0.08}s` }} />)}
            </div>
          ) : signals.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-3)', fontSize: '0.65rem' }}>No signals yet. Check API keys.</div>
          ) : (
            signals.map((s, i) => {
              const edge = s.aiProbability - s.marketProbability;
              const trend = getTrend(s.aiProbability, s.marketProbability);
              return (
                <div key={i} className="animate-slide-up" style={{
                  display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 0.7fr 0.7fr 1.5fr', gap: '0.5rem',
                  padding: '0.55rem 0.6rem', alignItems: 'center',
                  background: i % 2 === 0 ? 'transparent' : 'var(--bg-2)',
                  borderBottom: '1px solid var(--border)',
                  animationDelay: `${i*0.04}s`,
                  fontSize: '0.6rem',
                  cursor: 'pointer',
                  transition: 'background 0.15s',
                }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--accent-dim)')}
                  onMouseLeave={e => (e.currentTarget.style.background = i % 2 === 0 ? 'transparent' : 'var(--bg-2)')}>
                  <span style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.title}</span>
                  <span style={{ textAlign: 'right', color: 'var(--text-3)' }}>{s.marketProbability}%</span>
                  <span style={{ textAlign: 'right', color: '#7B61FF', fontWeight: 600 }}>{s.aiProbability}%</span>
                  <span style={{ textAlign: 'right', color: edge > 0 ? '#059669' : edge < 0 ? '#dc2626' : 'var(--text-3)', fontWeight: 600 }}>
                    {edge > 0 ? '+' : ''}{edge}%
                  </span>
                  <span style={{ textAlign: 'center', color: trend.dir === 'up' ? '#059669' : trend.dir === 'down' ? '#dc2626' : 'var(--text-3)' }}>
                    {trend.dir === 'up' ? '▲' : trend.dir === 'down' ? '▼' : '▸'}
                  </span>
                  <div style={{ display: 'flex', gap: '0.3rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                    {s.why.slice(0, 3).map((w, wi) => (
                      <span key={wi} title={w} style={{ fontSize: '0.6rem', opacity: 0.7 }}>{getSignalIcon(w)}</span>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* SIDEBAR */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {/* AI vs Market */}
          <div style={{ padding: '0.75rem', background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 3 }}>
            <div style={{ fontSize: '0.5rem', color: 'var(--text-3)', letterSpacing: '0.08em', marginBottom: '0.6rem' }}>AI VS MARKET</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {[
                { label: 'AI Probability', value: stats.avgAi + '%', color: '#7B61FF' },
                { label: 'Market Average', value: stats.avgMkt + '%', color: 'var(--text-3)' },
                { label: 'AI Edge', value: (stats.edge > 0 ? '+' : '') + stats.edge + '%', color: edgeColor },
              ].map((r, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.2rem 0', borderBottom: i < 2 ? '1px solid var(--border)' : 'none' }}>
                  <span style={{ fontSize: '0.55rem', color: 'var(--text-3)' }}>{r.label}</span>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, fontFamily: 'var(--display)', color: r.color }}>{r.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Top Signals */}
          <div style={{ padding: '0.75rem', background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 3 }}>
            <div style={{ fontSize: '0.5rem', color: 'var(--text-3)', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>TOP SIGNALS (24H)</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              {[
                { label: 'News Momentum', val: '+24%', icon: '📰' },
                { label: 'Social Sentiment', val: '+18%', icon: '𝕏' },
                { label: 'Whale Activity', val: '+15%', icon: '🐋' },
                { label: 'Market Flow', val: '+12%', icon: '💹' },
                { label: 'Google Trends', val: '+9%', icon: 'Trends' },
              ].map((r, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.2rem 0', fontSize: '0.55rem', borderBottom: i < 4 ? '1px solid var(--border)' : 'none' }}>
                  <span><span style={{ marginRight: '0.3rem' }}>{r.icon}</span>{r.label}</span>
                  <span style={{ color: '#059669', fontWeight: 600 }}>{r.val}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Alerts */}
          <div style={{ padding: '0.75rem', background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 3 }}>
            <div style={{ fontSize: '0.5rem', color: 'var(--text-3)', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>RECENT ALERTS</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              {recentAlerts.length === 0 ? (
                <div style={{ fontSize: '0.55rem', color: 'var(--text-3)' }}>No alerts</div>
              ) : (
                recentAlerts.map((a, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.25rem 0', borderBottom: i < recentAlerts.length - 1 ? '1px solid var(--border)' : 'none' }}>
                    <span style={{ width: 4, height: 4, borderRadius: '50%', background: '#7B61FF', flexShrink: 0 }} />
                    <span style={{ fontSize: '0.55rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* MOBILE BOTTOM NAV */}
      <div style={{ display: 'none' }} className="mobile-bottom-nav">
        {['Overview', 'Markets', 'AI Signals', 'Watchlist', 'Alerts'].map((item, i) => (
          <button key={i} style={{
            flex: 1, padding: '0.5rem 0', background: 'transparent', border: 'none',
            color: i === 2 ? '#7B61FF' : 'var(--text-3)', fontSize: '0.5rem',
            fontFamily: 'inherit', cursor: 'pointer', letterSpacing: '0.05em',
            borderTop: i === 2 ? '2px solid #7B61FF' : '2px solid transparent',
          }}>
            {item.toUpperCase()}
          </button>
        ))}
        <style>{`
          @media (max-width: 640px) {
            .mobile-bottom-nav { display: flex !important; position: fixed; bottom: 0; left: 0; right: 0; background: var(--bg); border-top: 1px solid var(--border); z-index: 100; }
          }
        `}</style>
      </div>
    </div>
  );
}
