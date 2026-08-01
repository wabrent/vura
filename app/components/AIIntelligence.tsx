'use client';

import { useState, useEffect, useMemo, useRef } from 'react';

interface Signal {
  title: string;
  marketProbability: number;
  aiProbability: number;
  why: string[];
}

function getEdge(s: Signal) { return s.aiProbability - s.marketProbability; }
function icon(r: string) {
  const l = r.toLowerCase();
  if (l.includes('news')) return '📰';
  if (l.includes('trend')) return 'Trends';
  if (l.includes('whale') || l.includes('volume')) return '🐋';
  if (l.includes('twitter') || l.includes('x')) return '𝕏';
  if (l.includes('reddit')) return '👽';
  return 'Signal';
}
function confLabel(e: number) {
  if (e > 15) return { l: 'High', c: '#7B61FF' };
  if (e > 5) return { l: 'Medium', c: '#059669' };
  return { l: 'Low', c: '#737373' };
}

export default function AIIntelligence() {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState('all');
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLoading(true);
    fetch('/api/signals')
      .then(r => r.json())
      .then((d: Signal[]) => { if (Array.isArray(d)) setSignals(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const stats = useMemo(() => {
    const n = signals.length;
    if (!n) return { avgAi: 0, avgMkt: 0, edge: 0, count: 0 };
    const ai = Math.round(signals.reduce((s, x) => s + x.aiProbability, 0) / n);
    const mk = Math.round(signals.reduce((s, x) => s + x.marketProbability, 0) / n);
    return { avgAi: ai, avgMkt: mk, edge: ai - mk, count: n };
  }, [signals]);

  const filtered = useMemo(() => {
    return signals.filter(s => !search || s.title.toLowerCase().includes(search.toLowerCase()));
  }, [signals, search]);

  const topSignals = [
    { label: 'News Momentum', val: 24 }, { label: 'Social Sentiment', val: 18 },
    { label: 'Whale Activity', val: 15 }, { label: 'Trend Growth', val: 12 },
    { label: 'Market Flow', val: 9 },
  ];

  // lightweight-charts line
  useEffect(() => {
    if (!chartRef.current || !signals.length) return;
    let dead = false;
    const pts = signals.map((s, i) => ({ time: i, v: s.aiProbability }));
    const pts2 = signals.map((s, i) => ({ time: i, v: s.marketProbability }));
    (async () => {
      const { createChart, ColorType } = await import('lightweight-charts');
      if (dead || !chartRef.current) return;
      const ch = createChart(chartRef.current, {
        width: chartRef.current.clientWidth,
        height: 100,
        layout: { background: { type: ColorType.Solid, color: 'transparent' }, textColor: '#555', fontSize: 9, fontFamily: 'JetBrains Mono, monospace' },
        grid: { vertLines: { color: '#1a1a1a' }, horzLines: { color: '#1a1a1a' } },
        rightPriceScale: { borderColor: '#222' },
        timeScale: { borderColor: '#222', visible: false },
        crosshair: { vertLine: { color: '#7B61FF', width: 1, style: 2 }, horzLine: { color: '#7B61FF', width: 1, style: 2 } },
      });
      const line1 = (ch as any).addSeries("Line", { color: '#7B61FF', lineWidth: 2 });
      const line2 = (ch as any).addSeries("Line", { color: '#333', lineWidth: 1, lineStyle: 2 });
      line1.setData(pts);
      line2.setData(pts2);
      ch.timeScale().fitContent();
      const resize = () => { if (chartRef.current) ch.applyOptions({ width: chartRef.current.clientWidth }); };
      window.addEventListener('resize', resize);
      return () => { window.removeEventListener('resize', resize); ch.remove(); };
    })();
    return () => { dead = true; };
  }, [signals]);

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', fontFamily: 'var(--mono)' }}>
      {/* Header */}
      <div style={{ marginBottom: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <div style={{ fontSize: 11, letterSpacing: '0.15em', color: '#7B61FF', fontWeight: 600, marginBottom: 4 }}>VURA AI INTELLIGENCE</div>
          <div style={{ fontSize: 9, color: '#737373', letterSpacing: '0.05em' }}>Real-time signal analysis · News + Trends + On-chain data</div>
        </div>
        <button onClick={() => fetch('/api/signals').then(r => r.json()).then((d: Signal[]) => { if (Array.isArray(d)) setSignals(d); })}
          style={{ fontSize: 9, padding: '4px 12px', background: 'transparent', border: '1px solid #222', color: '#737373', borderRadius: 2, cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '0.05em' }}>
          ⟳ UPDATE
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, marginBottom: 32, background: '#222' }}>
        {[
          { l: 'Signals Analyzed', v: stats.count },
          { l: 'AI Avg Probability', v: stats.avgAi + '%', c: '#7B61FF' },
          { l: 'AI Edge', v: (stats.edge > 0 ? '+' : '') + stats.edge + '%', c: stats.edge > 0 ? '#059669' : '#dc2626' },
          { l: 'Data Sources', v: '5 active' },
        ].map((s, i) => (
          <div key={i} style={{ padding: '14px 16px', background: '#111' }}>
            <div style={{ fontSize: 8, color: '#555', letterSpacing: '0.08em', marginBottom: 4 }}>{s.l}</div>
            <div style={{ fontSize: 20, fontWeight: 600, fontFamily: 'var(--display)', color: s.c || '#eee' }}>{s.v}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, gap: 12 }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search markets..."
          style={{ flex: '1 1 200px', padding: '6px 10px', fontSize: 10, background: '#111', border: '1px solid #222', color: '#eee', borderRadius: 2, fontFamily: 'inherit', outline: 'none' }} />
        <div style={{ display: 'flex', gap: 4 }}>
          {['all', 'crypto', 'politics', 'tech', 'economy', 'sports'].map(t => (
            <button key={t} onClick={() => setTab(t)}
              style={{ fontSize: 8, padding: '3px 8px', background: tab === t ? '#eee' : 'transparent', border: `1px solid ${tab === t ? '#eee' : '#222'}`, color: tab === t ? '#000' : '#555', borderRadius: 2, cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '0.05em' }}>
              {t.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Main layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 220px', gap: 24, alignItems: 'start' }}>
        {/* Table */}
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '2.5fr 1fr 1fr 0.8fr 0.8fr 1.2fr', gap: 8, padding: '6px 8px', fontSize: 8, color: '#555', letterSpacing: '0.08em', borderBottom: '1px solid #222', marginBottom: 4 }}>
            <span>Event</span><span style={{ textAlign: 'right' }}>Market</span><span style={{ textAlign: 'right' }}>AI</span><span style={{ textAlign: 'right' }}>Edge</span><span style={{ textAlign: 'center' }}>Confidence</span><span style={{ textAlign: 'center' }}>Sources</span>
          </div>

          {loading ? (
            <div style={{ padding: '16px 0' }}>{[1,2,3,4,5,6,7,8].map(i => <div key={i} className="skeleton" style={{ height: 26, marginBottom: 2, animationDelay: `${i*0.06}s` }} />)}</div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: '#555', fontSize: 10 }}>No signals found</div>
          ) : (
            filtered.map((s, i) => {
              const e = getEdge(s);
              const c = confLabel(e);
              return (
                <div key={i} style={{
                  display: 'grid', gridTemplateColumns: '2.5fr 1fr 1fr 0.8fr 0.8fr 1.2fr', gap: 8,
                  padding: '8px 8px', alignItems: 'center', fontSize: 9, cursor: 'pointer',
                  background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)',
                  borderBottom: '1px solid rgba(255,255,255,0.03)',
                  transition: 'background 0.15s',
                }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(123,97,255,0.04)'}
                  onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)'}>
                  <span style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.title}</span>
                  <span style={{ textAlign: 'right', color: '#737373' }}>{s.marketProbability}%</span>
                  <span style={{ textAlign: 'right', color: '#7B61FF', fontWeight: 500 }}>{s.aiProbability}%</span>
                  <span style={{ textAlign: 'right', color: e > 0 ? '#059669' : e < 0 ? '#dc2626' : '#737373', fontWeight: 500 }}>
                    {e > 0 ? '+' : ''}{e}%
                  </span>
                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <span style={{ fontSize: 7, padding: '1px 6px', background: `${c.c}12`, color: c.c, borderRadius: 2, fontWeight: 500, letterSpacing: '0.03em' }}>{c.l}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 3, justifyContent: 'center' }}>
                    {s.why.slice(0, 3).map((w, wi) => (
                      <span key={wi} title={w} style={{ fontSize: 9, opacity: 0.6 }}>{icon(w)}</span>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Chart */}
          <div style={{ background: '#111', border: '1px solid #222', borderRadius: 3, padding: 12 }}>
            <div style={{ fontSize: 7, color: '#555', letterSpacing: '0.08em', marginBottom: 8 }}>AI vs MARKET</div>
            <div ref={chartRef} style={{ width: '100%', height: 100, marginBottom: 8 }} />
            {[
              { l: 'AI Probability', v: stats.avgAi + '%', c: '#7B61FF' },
              { l: 'Market Average', v: stats.avgMkt + '%', c: '#737373' },
              { l: 'AI Edge', v: (stats.edge > 0 ? '+' : '') + stats.edge + '%', c: stats.edge > 0 ? '#059669' : '#dc2626' },
            ].map((r, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', fontSize: 8, borderBottom: i < 2 ? '1px solid #222' : 'none' }}>
                <span style={{ color: '#737373' }}>{r.l}</span><span style={{ fontWeight: 600, color: r.c }}>{r.v}</span>
              </div>
            ))}
          </div>

          {/* Top Signals */}
          <div style={{ background: '#111', border: '1px solid #222', borderRadius: 3, padding: 12 }}>
            <div style={{ fontSize: 7, color: '#555', letterSpacing: '0.08em', marginBottom: 8 }}>TOP SIGNALS (24H)</div>
            <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', height: 40, marginBottom: 8 }}>
              {topSignals.map((r, i) => (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                  <div style={{ width: '100%', background: '#7B61FF', borderRadius: '1px 1px 0 0', height: `${(r.val / 24) * 100}%`, minHeight: 4, opacity: 0.7 }} />
                  <span style={{ fontSize: 6, color: '#555' }}>{r.label.slice(0, 4)}</span>
                </div>
              ))}
            </div>
            {topSignals.map((r, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0', fontSize: 8, borderBottom: i < 4 ? '1px solid #222' : 'none' }}>
                <span style={{ color: '#999' }}>{r.label}</span><span style={{ color: '#059669', fontWeight: 500 }}>+{r.val}%</span>
              </div>
            ))}
          </div>

          {/* Profile */}
          <div style={{ background: '#111', border: '1px solid #222', borderRadius: 3, padding: 12 }}>
            <div style={{ fontSize: 7, color: '#555', letterSpacing: '0.08em', marginBottom: 8 }}>SIGNAL PROFILE</div>
            {[
              { l: 'Score', v: '88%', c: '#7B61FF' },
              { l: 'Accuracy', v: '76%', c: '#059669' },
              { l: 'Confidence', v: 'High', c: '#7B61FF' },
            ].map((r, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', fontSize: 8, borderBottom: i < 2 ? '1px solid #222' : 'none' }}>
                <span style={{ color: '#737373' }}>{r.l}</span><span style={{ fontWeight: 600, color: r.c }}>{r.v}</span>
              </div>
            ))}
          </div>

          {/* Alerts */}
          <div style={{ background: '#111', border: '1px solid #222', borderRadius: 3, padding: 12 }}>
            <div style={{ fontSize: 7, color: '#555', letterSpacing: '0.08em', marginBottom: 8 }}>ALERTS</div>
            {signals.slice(0, 3).map((s, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 0', fontSize: 8, borderBottom: i < 2 ? '1px solid #222' : 'none' }}>
                <span style={{ width: 3, height: 3, borderRadius: '50%', background: '#7B61FF', flexShrink: 0 }} />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#999' }}>{s.title}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
