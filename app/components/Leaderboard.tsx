'use client';

import { useState, useEffect, useMemo } from 'react';

function formatVol(v: number) {
  if (v >= 1e6) return (v / 1e6).toFixed(1) + 'M';
  if (v >= 1e3) return (v / 1e3).toFixed(1) + 'K';
  return Math.round(v).toString();
}

interface TraderEntry {
  rank: number;
  proxyWallet: string;
  userName: string;
  vol: number;
  pnl: number;
  profileImage: string;
  xUsername: string;
  verifiedBadge: boolean;
}

const CATEGORIES = ['OVERALL', 'POLITICS', 'SPORTS', 'CRYPTO', 'CULTURE', 'ECONOMICS', 'TECH'] as const;
const PERIODS = ['DAY', 'WEEK', 'MONTH', 'ALL'] as const;

export default function Leaderboard() {
  const [data, setData] = useState<TraderEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [category, setCategory] = useState('OVERALL');
  const [timePeriod, setTimePeriod] = useState('WEEK');
  const [orderBy, setOrderBy] = useState('PNL');

  useEffect(() => {
    setLoading(true);
    setError('');
    fetch(`/api/proxy?url=${encodeURIComponent(`https://data-api.polymarket.com/v1/leaderboard?limit=25&timePeriod=${timePeriod}&orderBy=${orderBy}&category=${category}`)}`)
      .then(r => r.json())
      .then((d: TraderEntry[]) => {
        if (Array.isArray(d)) setData(d.map((e, i) => ({ ...e, rank: i + 1 })));
        else setError('Invalid response');
      })
      .catch(() => setError('Failed to fetch leaderboard'))
      .finally(() => setLoading(false));
  }, [category, timePeriod, orderBy]);

  const stats = useMemo(() => {
    if (data.length === 0) return { traders: 0, volume: 0, topPnl: 0 };
    return {
      traders: data.length,
      volume: data.reduce((s, e) => s + e.vol, 0),
      topPnl: Math.max(...(data.length ? data.map(e => e.pnl) : [0])),
    };
  }, [data]);

  if (loading) return <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
    {[1,2,3,4,5].map(i => <div key={i} className="skeleton" style={{ height: '2.5rem', animationDelay: `${i * 0.1}s` }} />)}
  </div>;

  if (error) return <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--red)' }}>{error}</div>;

  return (
    <div className="lb-container">
      <div className="lb-header">
        <div className="lb-stats-row">
          <div className="lb-stat"><span className="lb-stat-label">TOP 25</span><span className="lb-stat-val">{stats.traders}</span></div>
          <div className="lb-stat"><span className="lb-stat-label">COMBINED VOL</span><span className="lb-stat-val accent">${formatVol(stats.volume)}</span></div>
          <div className="lb-stat"><span className="lb-stat-label">TOP P&L</span><span className="lb-stat-val accent">+${formatVol(stats.topPnl)}</span></div>
        </div>
        <div className="lb-controls">
          <div className="lb-categories">
            {CATEGORIES.map(c => (
              <button key={c} className={`sort-chip ${category === c ? 'sort-chip-active' : ''}`} onClick={() => setCategory(c)}>
                {c.charAt(0) + c.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
          <div className="lb-periods">
            {PERIODS.map(p => (
              <button key={p} className={`sort-chip ${timePeriod === p ? 'sort-chip-active' : ''}`} onClick={() => setTimePeriod(p)}>{p}</button>
            ))}
          </div>
          <div className="lb-order">
            <button className={`sort-chip ${orderBy === 'PNL' ? 'sort-chip-active' : ''}`} onClick={() => setOrderBy('PNL')}>By P&L</button>
            <button className={`sort-chip ${orderBy === 'VOL' ? 'sort-chip-active' : ''}`} onClick={() => setOrderBy('VOL')}>By Volume</button>
          </div>
        </div>
      </div>

      <div className="lb-table">
        <div className="lb-table-header">
          <span className="lb-col-rank">#</span>
          <span className="lb-col-trader">Trader</span>
          <span className="lb-col-vol">Volume</span>
          <span className="lb-col-pnl">P&L</span>
          <span className="lb-col-address">Wallet</span>
        </div>
        {data.map((e) => (
          <div key={e.proxyWallet} className="lb-row">
            <span className="lb-col-rank">{e.rank <= 3 ? <span className={`lb-medal lb-medal-${e.rank}`}>{e.rank}</span> : e.rank}</span>
            <span className="lb-col-trader">
              {e.profileImage ? <img src={e.profileImage} alt="" className="lb-avatar-img" /> : <span className="lb-avatar">{(e.userName || '?').slice(0, 2).toUpperCase()}</span>}
              <span className="lb-name">{(e.userName || e.proxyWallet.slice(0, 8) + '...').replace(/-.*$/, '').slice(0, 16)}</span>
              {e.verifiedBadge && <span className="lb-badge">✓</span>}
              {e.xUsername && <span className="lb-x">@{e.xUsername}</span>}
            </span>
            <span className="lb-col-vol">${formatVol(e.vol)}</span>
            <span className={`lb-col-pnl ${e.pnl >= 0 ? 'accent' : 'red'}`}>{e.pnl >= 0 ? '+' : ''}${formatVol(Math.abs(e.pnl))}</span>
            <span className="lb-col-address" style={{ fontSize: '0.55rem', color: 'var(--text-3)' }}>{e.proxyWallet.slice(0, 6)}...{e.proxyWallet.slice(-4)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
