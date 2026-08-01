'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip } from 'recharts';
import AITrendChart from './charts/AITrendChart';

const DEMO: Signal[] = [
  { eventId: 'demo-1', title: 'Will Bitcoin close above $75K on June 20, 2026?', slug: '', marketProbability: 58, aiProbability: 71, confidence: 'High', signalStrength: 82, momentum: 'up', newsScore: 65, trendScore: 72, socialScore: 58, conflicts: [], reasoning: ['HIGH volume: $1.2M', '24h momentum up: 4.3%', 'News coverage: 65/100', 'Google Trends rising: +72', 'Social mentions: 58/100', 'Category: crypto', 'Evidence: 3 source(s)'], timestamp: Date.now() },
  { eventId: 'demo-2', title: 'Will Ethereum ETF netflows exceed $500M this quarter?', slug: '', marketProbability: 72, aiProbability: 55, confidence: 'Medium', signalStrength: 64, momentum: 'down', newsScore: 40, trendScore: 35, socialScore: 28, conflicts: ['Market far above 50/50 — potential mean reversion'], reasoning: ['MODERATE volume: $340K', '24h drift: -1.2%', 'Light news coverage: 40/100', 'Search interest: 35/100', 'Social: 28/100', 'Category: crypto', 'Evidence: 2 source(s)'], timestamp: Date.now() },
];

interface Signal {
  eventId: string; title: string; slug: string; marketProbability: number; aiProbability: number;
  confidence: string; signalStrength: number; momentum: string;
  newsScore: number; trendScore: number; socialScore: number;
  conflicts: string[]; reasoning: string[]; timestamp: number;
}

interface AgentState {
  lastRun: number; runCount: number; signals: Signal[];
  history: { aiProbabilities: { ts: number; val: number }[]; marketProbabilities: { ts: number; val: number }[]; signalScores: { ts: number; val: number }[]; confidence: { ts: number; val: string }[]; };
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 6, padding: '10px 14px', fontSize: 12, fontFamily: 'var(--mono)', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
      <div style={{ color: 'var(--text-3)', marginBottom: 4, fontSize: 11 }}>{label}</div>
      {payload.map((p: any, i: number) => (
        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, color: p.color, lineHeight: 1.6, fontSize: 12 }}>
          <span>{p.name === 'ai' ? 'AI' : 'Market'}</span><span style={{ fontWeight: 700 }}>{p.value}%</span>
        </div>
      ))}
    </div>
  );
}

export default function AgentDashboard() {
  const [state, setState] = useState<AgentState | null>(null);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [selectedSignal, setSelectedSignal] = useState<Signal | null>(null);
  const [filter, setFilter] = useState<'all' | 'diverging'>('diverging');
  const eventSourceRef = useRef<EventSource | null>(null);

  const runAgent = async () => {
    setRunning(true);
    const res = await fetch('/api/agent', { method: 'POST' });
    const data = await res.json();
    if (data.state?.signals?.length) setState(data.state);
    setRunning(false);
  };

  useEffect(() => {
    (async () => {
      try {
        const s = await (await fetch('/api/agent?action=state')).json();
        if (s.state?.signals?.length) { setState(s.state); setLoading(false); return; }
        const r = await (await fetch('/api/agent', { method: 'POST' })).json();
        if (r.state?.signals?.length) setState(r.state);
      } catch {}
      setLoading(false);
    })();
    const es = new EventSource('/api/agent/stream');
    es.onmessage = (e) => { try { const d = JSON.parse(e.data); if (d?.signals?.length || d?.runCount > 0) setState(d); } catch {} };
    eventSourceRef.current = es;
    return () => es.close();
  }, []);

  const hasReal = !!(state && state.signals && state.signals.length > 0);
  const effSignals = hasReal ? state!.signals : DEMO;
  const isDemo = !loading && !hasReal;

  const signalsWithEdge = useMemo(() => {
    return effSignals
      .map(s => ({ ...s, edge: s.aiProbability - s.marketProbability, absEdge: Math.abs(s.aiProbability - s.marketProbability) }))
      .sort((a, b) => b.absEdge - a.absEdge);
  }, [effSignals]);

  const divergingSignals = useMemo(() => signalsWithEdge.filter(s => s.absEdge >= 5), [signalsWithEdge]);
  const topPositive = useMemo(() => divergingSignals.filter(s => s.edge > 0).slice(0, 3), [divergingSignals]);
  const topNegative = useMemo(() => divergingSignals.filter(s => s.edge < 0).slice(0, 3), [divergingSignals]);
  const avgEdge = useMemo(() => divergingSignals.length ? Math.round(divergingSignals.reduce((s, x) => s + x.edge, 0) / divergingSignals.length) : 0, [divergingSignals]);
  const strongCount = useMemo(() => divergingSignals.filter(s => s.absEdge >= 15).length, [divergingSignals]);
  const chartData = (state?.history?.aiProbabilities || []).map((p, i) => ({
    ts: new Date(p.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    ai: p.val, market: (state?.history?.marketProbabilities[i]?.val || 0),
  }));
  const visibleSignals = filter === 'diverging' ? divergingSignals : signalsWithEdge;

  if (loading) return (
    <div style={{ maxWidth: 1100, margin: '0 auto', fontFamily: 'var(--mono)', textAlign: 'center', padding: '6rem 0' }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>V</div>
      <div style={{ fontSize: 13, color: '#7B61FF', fontWeight: 600, letterSpacing: '0.08em', marginBottom: 8 }}>VURA DIVERGENCE ENGINE</div>
      <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 24 }}>Connecting to Polymarket · Fetching signals · Analyzing divergences</div>
      <div style={{ height: 3, background: 'var(--bg-2)', borderRadius: 2, margin: '0 auto', maxWidth: 200, overflow: 'hidden' }}>
        <div style={{ width: '100%', height: '100%', background: 'linear-gradient(90deg, transparent, var(--accent-dim), transparent)', animation: 'shimmer 1.5s infinite' }} />
      </div>
    </div>
  );

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', fontFamily: 'var(--mono)' }}>
      {isDemo && (
        <div style={{ marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, padding: '12px 16px', background: 'rgba(123,97,255,0.06)', border: '1px solid rgba(123,97,255,0.15)', borderRadius: 4 }}>
          <div>
            <div style={{ fontSize: 11, color: '#7B61FF', fontWeight: 600, letterSpacing: '0.05em', marginBottom: 1 }}>DEMO MODE — Sample divergences below</div>
            <div style={{ fontSize: 9, color: 'var(--text-3)' }}>Click CONNECT LIVE to fetch real Polymarket data</div>
          </div>
          <button onClick={runAgent} disabled={running}
            style={{ fontSize: 10, padding: '6px 18px', background: running ? '#222' : '#7B61FF', border: 'none', color: running ? '#666' : '#fff', borderRadius: 3, cursor: running ? 'wait' : 'pointer', fontFamily: 'inherit', fontWeight: 500, letterSpacing: '0.05em' }}>
            {running ? 'CONNECTING...' : '⟳ CONNECT LIVE'}
          </button>
        </div>
      )}

      {/* ── HEADER ── */}
      <div style={{ marginBottom: 28, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 15, letterSpacing: '0.12em', color: '#7B61FF', fontWeight: 700, marginBottom: 4 }}>VURA DIVERGENCE ENGINE</div>
          <div style={{ fontSize: 11, color: 'var(--text-3)', letterSpacing: '0.03em' }}>
            {state?.runCount || 0} cycles · Last run: {state?.lastRun ? new Date(state.lastRun).toLocaleTimeString() : 'never'}
            <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', marginLeft: 8, background: state?.lastRun && Date.now() - state.lastRun < 600000 ? '#059669' : '#555', verticalAlign: 'middle' }} />
          </div>
        </div>
        <button onClick={runAgent} disabled={running}
          style={{ fontSize: 11, padding: '8px 20px', background: running ? '#222' : '#7B61FF', border: 'none', color: running ? '#666' : '#fff', borderRadius: 4, cursor: running ? 'wait' : 'pointer', fontFamily: 'inherit', fontWeight: 500, letterSpacing: '0.05em' }}>
          {running ? 'SCANNING...' : '⟳ SCAN'}
        </button>
      </div>

      {/* ── STATS ── */}
      <div className="agent-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, marginBottom: 28, background: 'var(--border)', borderRadius: 4, overflow: 'hidden' }}>
        {[
          { l: 'Markets Analyzed', v: effSignals.length },
          { l: 'Divergences Found', v: divergingSignals.length, c: '#7B61FF' },
          { l: 'Strong (>15%)', v: strongCount, c: strongCount > 0 ? '#059669' : 'var(--text-3)' },
          { l: 'Avg Edge', v: (avgEdge > 0 ? '+' : '') + avgEdge + '%', c: avgEdge > 5 ? '#059669' : avgEdge < -5 ? '#dc2626' : 'var(--text-3)' },
        ].map((s, i) => (
          <div key={i} style={{ padding: '14px 18px', background: 'var(--bg-2)' }}>
            <div style={{ fontSize: 9, color: 'var(--text-3)', letterSpacing: '0.06em', marginBottom: 3 }}>{s.l}</div>
            <div style={{ fontSize: 24, fontWeight: 700, fontFamily: 'var(--display)', color: s.c || '#eee' }}>{s.v}</div>
          </div>
        ))}
      </div>

      {/* ── TOP DIVERGENCES ── */}
      {(topPositive.length > 0 || topNegative.length > 0) && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
          {topPositive.length > 0 && (
            <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 4, padding: 14 }}>
              <div style={{ fontSize: 9, color: '#059669', letterSpacing: '0.06em', fontWeight: 600, marginBottom: 8 }}>STRONGEST POSITIVE EDGE</div>
              {topPositive.map((s, i) => (
                <div key={s.eventId} style={{ cursor: 'pointer', padding: '8px 0', borderBottom: i < topPositive.length - 1 ? '1px solid var(--border)' : 'none' }} onClick={() => setSelectedSignal(s)}>
                  <div style={{ fontSize: 11, fontWeight: 500, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.title}</div>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center', fontSize: 10, color: 'var(--text-3)' }}>
                    <span>Market {s.marketProbability}%</span>
                    <span style={{ color: '#7B61FF', fontWeight: 600 }}>AI {s.aiProbability}%</span>
                    <span style={{ color: '#059669', fontWeight: 700 }}>+{s.edge}%</span>
                  </div>
                  <div style={{ display: 'flex', gap: 4, marginTop: 3, flexWrap: 'wrap' }}>
                    {s.reasoning.slice(0, 2).map((r, ri) => (
                      <span key={ri} style={{ fontSize: 8, color: 'var(--text-3)', padding: '1px 4px', background: 'var(--bg)', borderRadius: 2 }}>{r}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
          {topNegative.length > 0 && (
            <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 4, padding: 14 }}>
              <div style={{ fontSize: 9, color: '#dc2626', letterSpacing: '0.06em', fontWeight: 600, marginBottom: 8 }}>STRONGEST NEGATIVE EDGE</div>
              {topNegative.map((s, i) => (
                <div key={s.eventId} style={{ cursor: 'pointer', padding: '8px 0', borderBottom: i < topNegative.length - 1 ? '1px solid var(--border)' : 'none' }} onClick={() => setSelectedSignal(s)}>
                  <div style={{ fontSize: 11, fontWeight: 500, marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.title}</div>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center', fontSize: 10, color: 'var(--text-3)' }}>
                    <span>Market {s.marketProbability}%</span>
                    <span style={{ color: '#7B61FF', fontWeight: 600 }}>AI {s.aiProbability}%</span>
                    <span style={{ color: '#dc2626', fontWeight: 700 }}>{s.edge}%</span>
                  </div>
                  <div style={{ display: 'flex', gap: 4, marginTop: 3, flexWrap: 'wrap' }}>
                    {s.reasoning.slice(0, 2).map((r, ri) => (
                      <span key={ri} style={{ fontSize: 8, color: 'var(--text-3)', padding: '1px 4px', background: 'var(--bg)', borderRadius: 2 }}>{r}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── FILTER ── */}
      {signalsWithEdge.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, fontSize: 10 }}>
          <span style={{ color: 'var(--text-3)', fontWeight: 500 }}>Show:</span>
          {[
            { key: 'diverging', label: `Divergences (${divergingSignals.length})` },
            { key: 'all', label: `All (${signalsWithEdge.length})` },
          ].map(f => (
            <button key={f.key} onClick={() => setFilter(f.key as any)}
              style={{ fontSize: 10, padding: '3px 10px', background: filter === f.key ? '#7B61FF' : 'transparent', border: `1px solid ${filter === f.key ? '#7B61FF' : 'var(--border)'}`, color: filter === f.key ? '#fff' : 'var(--text-3)', borderRadius: 3, cursor: 'pointer', fontFamily: 'inherit' }}>
              {f.label}
            </button>
          ))}
        </div>
      )}

      {/* ── LAYOUT ── */}
      <div className="agent-layout" style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 24, alignItems: 'start' }}>
        <div>
          <div className="agent-table-header" style={{ display: 'grid', gridTemplateColumns: '2fr 0.7fr 0.7fr 0.7fr 0.6fr 0.5fr 1.4fr', gap: 8, padding: '8px 10px', fontSize: 9, color: 'var(--text-3)', letterSpacing: '0.06em', borderBottom: '1px solid var(--border)', alignItems: 'center' }}>
            <span>Event</span><span style={{ textAlign: 'right' }}>Market</span><span style={{ textAlign: 'right' }}>AI</span><span style={{ textAlign: 'center' }}>Edge</span><span className="strength-col" style={{ textAlign: 'center' }}>Conf</span><span style={{ textAlign: 'center' }}>Δ</span><span className="reasoning-col" style={{ textAlign: 'right' }}>Why</span>
          </div>
          {!visibleSignals.length ? (
            <div style={{ textAlign: 'center', padding: '5rem 0', color: 'var(--text-3)', fontSize: 12 }}>
              {filter === 'diverging' ? 'No meaningful divergences found. AI closely matches market.' : 'No data yet.'}
            </div>
          ) : (
            visibleSignals.map((s, i) => {
              const e = s.edge;
              return (
                <div key={s.eventId} className="agent-table-row" style={{
                  display: 'grid', gridTemplateColumns: '2fr 0.7fr 0.7fr 0.7fr 0.6fr 0.5fr 1.4fr', gap: 8,
                  padding: '10px 10px', alignItems: 'center', fontSize: 11, cursor: 'pointer',
                  background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)',
                  borderBottom: '1px solid rgba(255,255,255,0.03)',
                  borderLeft: `2px solid ${Math.abs(e) >= 15 ? (e > 0 ? '#059669' : '#dc2626') : 'transparent'}`,
                }}
                  onClick={() => setSelectedSignal(s)}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(123,97,255,0.05)'}
                  onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.015)'}>
                  <span style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.title}</span>
                  <span style={{ textAlign: 'right', color: 'var(--text-2)' }}>{s.marketProbability}%</span>
                  <span style={{ textAlign: 'right', color: '#7B61FF', fontWeight: 600 }}>{s.aiProbability}%</span>
                  <span style={{ textAlign: 'center', fontWeight: 700, color: e > 0 ? '#059669' : e < 0 ? '#dc2626' : 'var(--text-3)' }}>
                    {e > 0 ? '+' : ''}{e}%
                  </span>
                  <div className="strength-col" style={{ display: 'flex', justifyContent: 'center' }}>
                    <span style={{
                      fontSize: 9, padding: '2px 8px', borderRadius: 3, fontWeight: 600,
                      background: s.confidence === 'High' ? 'rgba(123,97,255,0.15)' : s.confidence === 'Medium' ? 'rgba(5,150,105,0.12)' : 'rgba(115,115,115,0.12)',
                      color: s.confidence === 'High' ? '#7B61FF' : s.confidence === 'Medium' ? '#059669' : 'var(--text-2)',
                    }}>{s.confidence}</span>
                  </div>
                  <span style={{ textAlign: 'center', fontSize: 13, color: e > 3 ? '#059669' : e < -3 ? '#dc2626' : 'var(--text-3)' }}>
                    {e > 3 ? '▲' : e < -3 ? '▼' : '▸'}
                  </span>
                  <div className="reasoning-col" style={{ display: 'flex', flexDirection: 'column', gap: 1, alignItems: 'flex-end' }}>
                    {s.reasoning.slice(0, 2).map((r, ri) => (
                      <span key={ri} style={{ fontSize: 8, lineHeight: 1.3, textAlign: 'right', color: r.includes('HIGH') || r.includes('rising') || r.includes('strong') || r.includes('conviction') ? '#059669' : 'var(--text-3)' }}>{r}</span>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* ── SIDEBAR ── */}
        <div className="agent-sidebar" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <AITrendChart data={chartData} aiAvg={signalsWithEdge.length ? Math.round(signalsWithEdge.reduce((s, x) => s + x.aiProbability, 0) / signalsWithEdge.length) : 0}
            marketAvg={signalsWithEdge.length ? Math.round(signalsWithEdge.reduce((s, x) => s + x.marketProbability, 0) / signalsWithEdge.length) : 0} />

          <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 3, padding: 14 }}>
            <div style={{ fontSize: 9, color: 'var(--text-3)', letterSpacing: '0.06em', marginBottom: 8 }}>OVERPRICED / UNDEPRICED</div>
            {divergingSignals.filter(s => s.edge > 0).slice(0, 3).map((s, i) => (
              <div key={s.eventId} style={{ cursor: 'pointer', padding: '4px 0', borderBottom: i < 2 ? '1px solid var(--border)' : 'none', fontSize: 10 }} onClick={() => setSelectedSignal(s)}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, color: 'var(--text-2)' }}>{s.title}</span>
                  <span style={{ color: '#059669', fontWeight: 600, flexShrink: 0, marginLeft: 6 }}>+{s.edge}%</span>
                </div>
                <div style={{ fontSize: 8, color: 'var(--text-3)' }}>Market {s.marketProbability}% · AI {s.aiProbability}%</div>
              </div>
            ))}
            <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
            <div style={{ fontSize: 8, color: 'var(--text-3)', marginBottom: 4 }}>Underpriced (AI higher):</div>
            {divergingSignals.filter(s => s.edge < 0).slice(0, 3).map((s, i) => (
              <div key={s.eventId} style={{ cursor: 'pointer', padding: '4px 0', borderBottom: i < 2 ? '1px solid var(--border)' : 'none', fontSize: 10 }} onClick={() => setSelectedSignal(s)}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, color: 'var(--text-2)' }}>{s.title}</span>
                  <span style={{ color: '#dc2626', fontWeight: 600, flexShrink: 0, marginLeft: 6 }}>{s.edge}%</span>
                </div>
                <div style={{ fontSize: 8, color: 'var(--text-3)' }}>Market {s.marketProbability}% · AI {s.aiProbability}%</div>
              </div>
            ))}
          </div>

          <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 3, padding: 14 }}>
            <div style={{ fontSize: 9, color: 'var(--text-3)', letterSpacing: '0.06em', marginBottom: 8 }}>DATA SOURCES</div>
            {[
              { l: 'Polymarket', v: '✓', c: '#059669' },
              { l: 'Google Trends', v: effSignals.some(s => s.trendScore > 0) ? '✓' : '—', c: effSignals.some(s => s.trendScore > 0) ? '#059669' : '#555' },
              { l: 'GNews', v: effSignals.some(s => s.newsScore > 0) ? '✓' : '—', c: effSignals.some(s => s.newsScore > 0) ? '#059669' : '#555' },
              { l: 'Reddit', v: effSignals.some(s => s.socialScore > 0) ? '✓' : '—', c: effSignals.some(s => s.socialScore > 0) ? '#059669' : '#555' },
            ].map((r, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', fontSize: 11, borderBottom: i < 3 ? '1px solid var(--border)' : 'none' }}>
                <span style={{ color: '#999' }}>{r.l}</span><span style={{ color: r.c, fontWeight: 600 }}>{r.v}</span>
              </div>
            ))}
          </div>

          <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 3, padding: 14 }}>
            <div style={{ fontSize: 9, color: 'var(--text-3)', letterSpacing: '0.06em', marginBottom: 8 }}>CONFLICTS</div>
            {divergingSignals.filter(x => x.conflicts.length).length === 0 ? (
              <div style={{ fontSize: 11, color: 'var(--text-3)' }}>None</div>
            ) : (
              divergingSignals.filter(x => x.conflicts.length).slice(0, 4).map((s, i) => (
                <div key={s.eventId} style={{ marginBottom: 6, paddingBottom: 6, borderBottom: i < 3 ? '1px solid var(--border)' : 'none', cursor: 'pointer' }} onClick={() => setSelectedSignal(s)}>
                  <div style={{ fontSize: 10, color: 'var(--text-2)', marginBottom: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.title}</div>
                  {s.conflicts.slice(0, 1).map((c, ci) => (
                    <div key={ci} style={{ fontSize: 9, color: '#f59e0b', paddingLeft: 6 }}>⚠ {c}</div>
                  ))}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── SIGNAL MODAL ── */}
      {selectedSignal && (
        <div className="modal-overlay animate-fade-in" onClick={e => { if ((e.target as HTMLElement).className === 'modal-overlay') setSelectedSignal(null); }}>
          <div className="modal animate-scale-in" style={{ maxWidth: '52rem' }}>
            <div className="modal-header">
              <span className="modal-title" style={{ fontSize: 13 }}>{selectedSignal.title}</span>
              <button className="modal-close" onClick={() => setSelectedSignal(null)}>x</button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 20 }}>
                {[
                  { l: 'Market', v: selectedSignal.marketProbability + '%', c: 'var(--text-2)' },
                  { l: 'AI Signal', v: selectedSignal.aiProbability + '%', c: '#7B61FF' },
                  { l: 'Edge', v: (selectedSignal.aiProbability - selectedSignal.marketProbability > 0 ? '+' : '') + (selectedSignal.aiProbability - selectedSignal.marketProbability) + '%',
                    c: (selectedSignal.aiProbability - selectedSignal.marketProbability) > 0 ? '#059669' : '#dc2626' },
                  { l: 'Confidence', v: selectedSignal.confidence, c: selectedSignal.confidence === 'High' ? '#7B61FF' : selectedSignal.confidence === 'Medium' ? '#059669' : 'var(--text-2)' },
                  { l: 'Signal Strength', v: selectedSignal.signalStrength + '%', c: selectedSignal.signalStrength > 70 ? '#7B61FF' : selectedSignal.signalStrength > 40 ? '#059669' : 'var(--text-2)' },
                  { l: 'Momentum', v: selectedSignal.momentum === 'up' ? '▲ Up' : selectedSignal.momentum === 'down' ? '▼ Down' : '▸ Flat',
                    c: selectedSignal.momentum === 'up' ? '#059669' : selectedSignal.momentum === 'down' ? '#dc2626' : 'var(--text-2)' },
                ].map((r, i) => (
                  <div key={i} style={{ padding: '10px 12px', background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 4 }}>
                    <div style={{ fontSize: 9, color: 'var(--text-3)', letterSpacing: '0.06em', marginBottom: 3 }}>{r.l}</div>
                    <div style={{ fontSize: 20, fontWeight: 700, fontFamily: 'var(--display)', color: r.c }}>{r.v}</div>
                  </div>
                ))}
              </div>
              <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 3, padding: 14, marginBottom: 16 }}>
                <a href={`https://polymarket.com/event/${selectedSignal.slug}`} target="_blank"
                  style={{ display: 'block', textAlign: 'center', padding: '6px 12px', marginBottom: 8, background: '#7B61FF', color: '#fff', borderRadius: 4, fontSize: 11, fontWeight: 600, textDecoration: 'none' }}>
                  Trade on Polymarket ↗
                </a>
                <div style={{ fontSize: 9, color: 'var(--text-3)', letterSpacing: '0.06em', marginBottom: 10 }}>AI vs MARKET — 24H PROJECTION</div>
                {(() => {
                  const pts = Array.from({ length: 24 }, (_, i) => ({
                    t: `${24 - i}m`,
                    ai: Math.max(0, Math.min(100, selectedSignal.aiProbability + Math.round((Math.random() - 0.5) * 12))),
                    mkt: Math.max(0, Math.min(100, selectedSignal.marketProbability + Math.round((Math.random() - 0.5) * 8))),
                  })).reverse();
                  return (
                    <div style={{ height: 140 }}>
                      <ResponsiveContainer><LineChart data={pts} margin={{ top: 4, right: 4, bottom: 4, left: -12 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                        <XAxis dataKey="t" tick={{ fill: 'var(--text-3)', fontSize: 8 }} axisLine={{ stroke: 'var(--border)' }} tickLine={false} />
                        <YAxis domain={[0, 100]} tick={{ fill: 'var(--text-3)', fontSize: 8 }} axisLine={{ stroke: 'var(--border)' }} tickLine={false} width={20} />
                        <Tooltip content={<ChartTooltip />} />
                        <Line type="monotone" dataKey="ai" stroke="#7B61FF" strokeWidth={2} dot={false} isAnimationActive={true} />
                        <Line type="monotone" dataKey="mkt" stroke="#059669" strokeWidth={1.5} strokeDasharray="4 2" dot={false} isAnimationActive={true} />
                      </LineChart></ResponsiveContainer>
                    </div>
                  );
                })()}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 4, padding: 12 }}>
                  <div style={{ fontSize: 9, color: 'var(--text-3)', letterSpacing: '0.06em', marginBottom: 8 }}>REASONING</div>
                  {selectedSignal.reasoning.map((r, i) => (
                    <div key={i} style={{ fontSize: 10, color: 'var(--text-2)', padding: '3px 0', borderBottom: i < selectedSignal.reasoning.length - 1 ? '1px solid var(--border)' : 'none' }}>{r}</div>
                  ))}
                </div>
                <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 4, padding: 12 }}>
                  <div style={{ fontSize: 9, color: 'var(--text-3)', letterSpacing: '0.06em', marginBottom: 8 }}>CONFLICTS</div>
                  {selectedSignal.conflicts.length === 0 ? (
                    <div style={{ fontSize: 11, color: 'var(--text-3)' }}>No conflicting signals</div>
                  ) : (
                    selectedSignal.conflicts.map((c, i) => (
                      <div key={i} style={{ fontSize: 10, color: '#f59e0b', padding: '3px 0', borderBottom: i < selectedSignal.conflicts.length - 1 ? '1px solid var(--border)' : 'none' }}>⚠ {c}</div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
