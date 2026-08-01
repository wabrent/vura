'use client';

import { useState, useEffect, useMemo } from 'react';

interface AgentResult {
  title: string;
  marketProbability: number;
  aiProbability: number;
  confidence: string;
  signalStrength: number;
  momentum: string;
  conflicts: string[];
  reason: string[];
}

function edgeColor(e: number) { return e > 5 ? '#059669' : e < -5 ? '#dc2626' : '#737373'; }

export default function VURAAgentDashboard() {
  const [data, setData] = useState<AgentResult[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = () => {
    setLoading(true);
    fetch('/api/signals')
      .then(r => r.json())
      .then((d: AgentResult[]) => { if (Array.isArray(d)) setData(d); })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, []);

  const avgStrength = useMemo(() =>
    data.length ? Math.round(data.reduce((s, x) => s + x.signalStrength, 0) / data.length) : 0
  , [data]);

  const highConfCount = useMemo(() =>
    data.filter(x => x.confidence === 'High').length
  , [data]);

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', fontFamily: 'var(--mono)' }}>
      <div style={{ marginBottom: 28, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div>
          <div style={{ fontSize: 11, letterSpacing: '0.15em', color: '#7B61FF', fontWeight: 600, marginBottom: 2 }}>VURA AGENT</div>
          <div style={{ fontSize: 9, color: '#555', letterSpacing: '0.05em' }}>DeepSeek-powered signal analysis</div>
        </div>
        <button onClick={fetchData}
          style={{ fontSize: 9, padding: '4px 12px', background: 'transparent', border: '1px solid #222', color: '#737373', borderRadius: 2, cursor: 'pointer', fontFamily: 'inherit' }}>
          ⟳ ANALYZE
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, marginBottom: 28, background: '#222' }}>
        {[
          { l: 'Markets Scanned', v: data.length },
          { l: 'Avg Signal Strength', v: avgStrength + '%', c: avgStrength > 60 ? '#059669' : '#7B61FF' },
          { l: 'High Confidence', v: highConfCount, c: '#7B61FF' },
          { l: 'Agent Status', v: loading ? 'Scanning...' : 'Active', c: loading ? '#737373' : '#059669' },
        ].map((s, i) => (
          <div key={i} style={{ padding: '12px 14px', background: '#111' }}>
            <div style={{ fontSize: 8, color: '#555', letterSpacing: '0.08em', marginBottom: 3 }}>{s.l}</div>
            <div style={{ fontSize: 18, fontWeight: 600, fontFamily: 'var(--display)', color: s.c || '#eee' }}>{s.v}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 220px', gap: 20, alignItems: 'start' }}>
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 0.7fr 0.7fr 0.6fr 0.5fr 0.5fr 1.3fr', gap: 6, padding: '5px 8px', fontSize: 7, color: '#555', letterSpacing: '0.08em', borderBottom: '1px solid #222', marginBottom: 4 }}>
            <span>Event</span><span style={{ textAlign: 'right' }}>Market</span><span style={{ textAlign: 'right' }}>AI</span><span style={{ textAlign: 'center' }}>Conf</span><span style={{ textAlign: 'center' }}>Signal</span><span style={{ textAlign: 'center' }}>Mtm</span><span style={{ textAlign: 'right' }}>Analysis</span>
          </div>
          {loading ? (
            <div style={{ padding: '16px 0' }}>{[1,2,3,4,5,6,7,8].map(i => <div key={i} className="skeleton" style={{ height: 24, marginBottom: 2, animationDelay: `${i*0.06}s` }} />)}</div>
          ) : (
            data.map((s, i) => (
              <div key={i} style={{
                display: 'grid', gridTemplateColumns: '2fr 0.7fr 0.7fr 0.6fr 0.5fr 0.5fr 1.3fr', gap: 6,
                padding: '7px 8px', alignItems: 'center', fontSize: 8, cursor: 'pointer',
                background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)',
                borderBottom: '1px solid rgba(255,255,255,0.03)',
                transition: 'background 0.15s',
              }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(123,97,255,0.04)'}
                onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)'}>
                <span style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.title}</span>
                <span style={{ textAlign: 'right', color: '#737373' }}>{s.marketProbability}%</span>
                <span style={{ textAlign: 'right', color: '#7B61FF', fontWeight: 500 }}>{s.aiProbability}%</span>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <span style={{
                    fontSize: 7, padding: '1px 5px', borderRadius: 2, fontWeight: 500, letterSpacing: '0.03em',
                    background: s.confidence === 'High' ? 'rgba(123,97,255,0.15)' : s.confidence === 'Medium' ? 'rgba(5,150,105,0.12)' : 'rgba(115,115,115,0.12)',
                    color: s.confidence === 'High' ? '#7B61FF' : s.confidence === 'Medium' ? '#059669' : '#737373',
                  }}>{s.confidence}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                  <span style={{
                    width: 20, height: 4, borderRadius: 2,
                    background: s.signalStrength > 70 ? '#7B61FF' : s.signalStrength > 40 ? '#059669' : '#737373',
                    opacity: 0.7,
                  }} />
                </div>
                <span style={{ textAlign: 'center', color: s.momentum === 'up' ? '#059669' : s.momentum === 'down' ? '#dc2626' : '#737373' }}>
                  {s.momentum === 'up' ? '▲' : s.momentum === 'down' ? '▼' : '▸'}
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 1, alignItems: 'flex-end' }}>
                  {s.reason.slice(0, 2).map((r, ri) => (
                    <span key={ri} style={{ fontSize: 6, color: '#555', lineHeight: 1.3 }}>{r}</span>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ background: '#111', border: '1px solid #222', borderRadius: 3, padding: 12 }}>
            <div style={{ fontSize: 7, color: '#555', letterSpacing: '0.08em', marginBottom: 8 }}>AGENT STATS</div>
            {[
              { l: 'Avg AI Probability', v: data.length ? Math.round(data.reduce((s, x) => s + x.aiProbability, 0) / data.length) + '%' : '—', c: '#7B61FF' },
              { l: 'Avg Edge', v: data.length ? (() => { const e = Math.round(data.reduce((s, x) => s + (x.aiProbability - x.marketProbability), 0) / data.length); return (e > 0 ? '+' : '') + e + '%'; })() : '—', c: '#059669' },
              { l: 'Conflicts Detected', v: data.reduce((s, x) => s + x.conflicts.length, 0).toString(), c: data.some(x => x.conflicts.length) ? '#f59e0b' : '#059669' },
            ].map((r, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', fontSize: 8, borderBottom: i < 2 ? '1px solid #222' : 'none' }}>
                <span style={{ color: '#737373' }}>{r.l}</span><span style={{ fontWeight: 600, color: r.c }}>{r.v}</span>
              </div>
            ))}
          </div>

          <div style={{ background: '#111', border: '1px solid #222', borderRadius: 3, padding: 12 }}>
            <div style={{ fontSize: 7, color: '#555', letterSpacing: '0.08em', marginBottom: 8 }}>CONFLICTS</div>
            {data.filter(x => x.conflicts.length).length === 0 ? (
              <div style={{ fontSize: 8, color: '#555' }}>None detected</div>
            ) : (
              data.filter(x => x.conflicts.length).slice(0, 3).map((s, i) => (
                <div key={i} style={{ marginBottom: 6 }}>
                  <div style={{ fontSize: 8, color: '#999', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.title}</div>
                  {s.conflicts.map((c, ci) => (
                    <div key={ci} style={{ fontSize: 7, color: '#f59e0b', paddingLeft: 6, marginBottom: 1 }}>⚠ {c}</div>
                  ))}
                </div>
              ))
            )}
          </div>

          <div style={{ background: '#111', border: '1px solid #222', borderRadius: 3, padding: 12 }}>
            <div style={{ fontSize: 7, color: '#555', letterSpacing: '0.08em', marginBottom: 8 }}>TOP SIGNALS</div>
            {[...data].sort((a, b) => b.signalStrength - a.signalStrength).slice(0, 4).map((s, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '3px 0', fontSize: 8, borderBottom: i < 3 ? '1px solid #222' : 'none' }}>
                <span style={{ width: 3, height: 3, borderRadius: '50%', background: s.signalStrength > 70 ? '#7B61FF' : '#059669', flexShrink: 0 }} />
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: '#999' }}>{s.title}</span>
                <span style={{ color: '#7B61FF', fontWeight: 500, flexShrink: 0 }}>{s.signalStrength}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
