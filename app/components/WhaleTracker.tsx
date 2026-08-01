'use client';

import { useState, useEffect } from 'react';

function formatVol(v: number) {
  if (v >= 1e6) return (v / 1e6).toFixed(1) + 'M';
  if (v >= 1e3) return (v / 1e3).toFixed(1) + 'K';
  return Math.round(v).toString();
}

interface LeaderEntry {
  rank: number;
  proxyWallet: string;
  userName: string;
  vol: number;
  pnl: number;
  xUsername: string;
  verifiedBadge: boolean;
  profileImage: string;
}

interface TradeEntry {
  side: string;
  price: number;
  size: number;
  title: string;
  outcome: string;
  slug: string;
  timestamp: number;
  conditionId: string;
}

export default function WhaleTracker() {
  const [whales, setWhales] = useState<LeaderEntry[]>([]);
  const [trades, setTrades] = useState<TradeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedWhale, setSelectedWhale] = useState<LeaderEntry | null>(null);
  const [tradesLoading, setTradesLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/proxy?url=${encodeURIComponent('https://data-api.polymarket.com/v1/leaderboard?limit=25&timePeriod=WEEK&orderBy=VOL&category=OVERALL')}`)
      .then(r => r.json())
      .then((d: LeaderEntry[]) => {
        if (Array.isArray(d)) setWhales(d.map((e, i) => ({ ...e, rank: i + 1 })));
        else setError('Invalid response');
      })
      .catch(() => setError('Failed to fetch'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!selectedWhale) return;
    setTradesLoading(true);
    fetch(`/api/polynode?path=/v1/wallets/${selectedWhale.proxyWallet}/trades&query=limit%3D10`)
      .then(r => r.json())
      .then((d: { trades?: TradeEntry[] }) => { if (d.trades) setTrades(d.trades); })
      .catch(() => {})
      .finally(() => setTradesLoading(false));
  }, [selectedWhale]);

  if (loading) return <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
    {[1,2,3,4,5].map(i => <div key={i} className="skeleton" style={{ height: '4rem', animationDelay: `${i * 0.1}s` }} />)}
  </div>;

  if (error) return <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--red)' }}>{error}</div>;

  return (
    <div className="whale-container">
      <div className="whale-header">
        <div className="whale-stats-row">
          <div className="whale-stat-big">
            <span className="whale-stat-label">TOP 25</span>
            <span className="whale-stat-val">{whales.length}</span>
          </div>
          <div className="whale-stat-big">
            <span className="whale-stat-label">TOTAL VOLUME</span>
            <span className="whale-stat-val accent">${formatVol(whales.reduce((s, w) => s + w.vol, 0))}</span>
          </div>
          <div className="whale-stat-big">
            <span className="whale-stat-label">TOP P&L</span>
            <span className="whale-stat-val accent">+${formatVol(Math.max(...whales.map(w => w.pnl), 0))}</span>
          </div>
          <div className="whale-stat-big">
            <span className="whale-stat-label">PERIOD</span>
            <span className="whale-stat-val">7D</span>
          </div>
        </div>
      </div>

      <div className="whale-grid">
        <div className="whale-list">
          {whales.slice(0, 15).map((w) => (
            <div key={w.proxyWallet} className={`whale-card ${selectedWhale?.proxyWallet === w.proxyWallet ? 'whale-card-selected' : ''}`}
              onClick={() => setSelectedWhale(selectedWhale?.proxyWallet === w.proxyWallet ? null : w)}>
              <div className="whale-rank">#{w.rank}</div>
              <div className="whale-avatar">{(w.userName || w.proxyWallet.slice(0, 2)).slice(0, 2).toUpperCase()}</div>
              <div className="whale-info">
                <div className="whale-name">{(w.userName || w.proxyWallet.slice(0, 8) + '...').replace(/-.*$/, '').slice(0, 16)}</div>
                <div className="whale-address">{w.proxyWallet.slice(0, 6)}...{w.proxyWallet.slice(-4)}</div>
                {w.xUsername && <div className="whale-meta">@{w.xUsername}</div>}
              </div>
              <div className="whale-numbers">
                <div className="whale-num">
                  <span className="wn-label">Volume</span>
                  <span className="wn-val">${formatVol(w.vol)}</span>
                </div>
                <div className="whale-num">
                  <span className="wn-label">P&L</span>
                  <span className={`wn-val ${w.pnl >= 0 ? 'accent' : 'red'}`}>{w.pnl >= 0 ? '+' : ''}${formatVol(Math.abs(w.pnl))}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="whale-trades-panel">
          <div className="whale-trades-header">
            <span className="panel-title">{selectedWhale ? ((selectedWhale.userName || selectedWhale.proxyWallet.slice(0, 6) + '...') + ' · Trades') : 'Select a whale'}</span>
            <span className="panel-subtitle">PolyNode</span>
          </div>
          {tradesLoading ? (
            <div style={{ padding: '1rem' }}>
              {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: '2rem', marginBottom: '0.3rem', animationDelay: `${i*0.1}s` }} />)}
            </div>
          ) : selectedWhale && trades.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-3)', fontSize: '0.7rem' }}>No recent trades found</div>
          ) : !selectedWhale ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-3)', fontSize: '0.7rem' }}>Click a whale to see their recent trades</div>
          ) : (
            <div className="whale-trades-list">
              {trades.map((t, i) => (
                <div key={i} className="whale-trade-row">
                  <span className="wt-market">{(t.title || '').substring(0, 28)}...</span>
                  <span className={`wt-side ${t.side === 'BUY' ? 'wt-buy' : 'wt-sell'}`}>{t.side || '?'}</span>
                  <span className="wt-price">{((t.price || 0) * 100).toFixed(1)}c</span>
                  <span className="wt-size">{t.outcome?.slice(0, 4) || ''}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
