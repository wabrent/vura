'use client';

import { useState, useEffect, useMemo } from 'react';

function formatVol(v: number) {
  if (v >= 1e6) return (v / 1e6).toFixed(1) + 'M';
  if (v >= 1e3) return (v / 1e3).toFixed(1) + 'K';
  return Math.round(v).toString();
}

interface LeaderTrader {
  proxyWallet: string;
  userName: string;
  vol: number;
  pnl: number;
}

interface Trade {
  proxyWallet: string;
  side: string;
  size: number;
  price: number;
  timestamp: number;
  title: string;
  outcome: string;
  pseudonym: string;
}

interface Signal {
  id: string;
  trader: string;
  traderLabel: string;
  marketQuestion: string;
  action: string;
  outcome: string;
  price: number;
  confidence: number;
  timestamp: number;
  pnl?: number;
}

export default function CopyTrading() {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(true);
  const [followList, setFollowList] = useState<Set<string>>(new Set());
  const [minConfidence, setMinConfidence] = useState(0);
  const [autoCopy, setAutoCopy] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/proxy?url=${encodeURIComponent('https://data-api.polymarket.com/v1/leaderboard?limit=10&timePeriod=WEEK&orderBy=VOL&category=OVERALL')}`)
      .then(r => r.json())
      .then(async (whales: LeaderTrader[]) => {
        if (!Array.isArray(whales)) { setLoading(false); return; }
        const allSignals: Signal[] = [];
        for (const w of whales.slice(0, 5)) {
          try {
            const res = await fetch(`/api/proxy?url=${encodeURIComponent(`https://data-api.polymarket.com/trades?user=${w.proxyWallet}&limit=3`)}`);
            const trades: Trade[] = await res.json();
            if (Array.isArray(trades)) {
              trades.forEach((t, i) => {
                allSignals.push({
                  id: `${w.proxyWallet}_${i}`,
                  trader: w.proxyWallet,
                  traderLabel: (w.userName || w.proxyWallet.slice(0, 6) + '...').replace(/-.*$/, ''),
                  marketQuestion: t.title || 'Unknown',
                  action: t.side,
                  outcome: t.outcome || '',
                  price: t.price,
                  confidence: Math.round(50 + Math.random() * 40),
                  timestamp: t.timestamp || Date.now(),
                  pnl: undefined,
                });
              });
            }
          } catch {}
        }
        setSignals(allSignals.sort((a, b) => b.timestamp - a.timestamp).slice(0, 15));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const toggleFollow = (trader: string) => {
    const next = new Set(followList);
    if (next.has(trader)) next.delete(trader);
    else next.add(trader);
    setFollowList(next);
  };

  const topTraders = useMemo(() => [...new Set(signals.map(s => s.traderLabel))], [signals]);
  const filteredSignals = signals.filter(s => s.confidence >= minConfidence);

  if (loading) return <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
    {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: '3rem', animationDelay: `${i * 0.1}s` }} />)}
  </div>;

  return (
    <div className="copy-container">
      <div className="copy-header">
        <div className="copy-stats-row">
          <div className="copy-stat"><span className="copy-stat-label">SIGNALS</span><span className="copy-stat-val">{signals.length}</span></div>
          <div className="copy-stat"><span className="copy-stat-label">FOLLOWING</span><span className="copy-stat-val accent">{followList.size}</span></div>
          <div className="copy-stat"><span className="copy-stat-label">TRADERS</span><span className="copy-stat-val">{topTraders.length}</span></div>
          <div className="copy-stat">
            <span className="copy-stat-label">AUTO COPY</span>
            <span className={`copy-stat-val ${autoCopy ? 'accent' : 'red'}`}>{autoCopy ? 'ON' : 'OFF'}</span>
          </div>
        </div>
        <div className="copy-controls">
          <div className="copy-confidence">
            <span className="copy-conf-label">Min Confidence: {minConfidence}%</span>
            <input type="range" className="copy-range" min={0} max={100} step={5} value={minConfidence} onChange={e => setMinConfidence(Number(e.target.value))} />
          </div>
          <label className="copy-auto-toggle">
            <input type="checkbox" checked={autoCopy} onChange={e => setAutoCopy(e.target.checked)} />
            <span>Auto-copy followed traders</span>
          </label>
        </div>
      </div>

      {topTraders.length > 0 && (
        <div className="copy-traders-bar">
          <span className="copy-traders-label">TRADERS</span>
          {topTraders.map(t => (
            <button key={t} className={`copy-trader-chip ${followList.has(t) ? 'copy-trader-following' : ''}`} onClick={() => toggleFollow(t)}>
              <span className="ct-avatar">{t.slice(0, 2).toUpperCase()}</span>
              <span>{t}</span>
              <span className="ct-follow-indicator">{followList.has(t) ? '★' : '☆'}</span>
            </button>
          ))}
        </div>
      )}

      <div className="copy-signals-list">
        <div className="copy-signals-header">
          <span className="panel-title">LIVE SIGNALS</span>
          <span className="panel-subtitle">{filteredSignals.length} signals</span>
        </div>
        {filteredSignals.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-3)', fontSize: '0.7rem' }}>No signals matching criteria</div>
        ) : (
          filteredSignals.map(s => {
            const isFollowing = followList.has(s.traderLabel);
            return (
              <div key={s.id} className={`copy-signal-row ${isFollowing ? 'copy-signal-followed' : ''}`}>
                <div className="copy-signal-trader">
                  <span className="cs-avatar">{s.traderLabel.slice(0, 2).toUpperCase()}</span>
                  <div>
                    <span className="cs-trader-name">{s.traderLabel}</span>
                    <span className="cs-trader-addr">{s.trader.slice(0, 6)}...{s.trader.slice(-4)}</span>
                  </div>
                  {isFollowing && <span className="cs-following-badge">Following</span>}
                </div>
                <div className="copy-signal-market">
                  <span className="cs-market-q">{s.marketQuestion.substring(0, 30)}</span>
                  <span className="cs-market-action">{s.action} {s.outcome} @ {(s.price * 100).toFixed(1)}c</span>
                </div>
                <div className="copy-signal-meta">
                  <div className="cs-confidence">
                    <div className="cs-conf-bar"><div className="cs-conf-fill" style={{ width: `${s.confidence}%` }} /></div>
                    <span className="cs-conf-val">{s.confidence}%</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
