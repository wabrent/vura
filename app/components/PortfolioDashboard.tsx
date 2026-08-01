'use client';

import { useState, useEffect, useMemo } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import type { Market } from '@/app/lib/types';

function formatVol(v: number) {
  if (v >= 1e6) return (v / 1e6).toFixed(1) + 'M';
  if (v >= 1e3) return (v / 1e3).toFixed(1) + 'K';
  return Math.round(v).toString();
}

interface Position {
  asset: string;
  conditionId: string;
  title: string;
  slug: string;
  outcome: string;
  outcomeIndex: number;
  size: number;
  avgPrice: number;
  curPrice: number;
  initialValue: number;
  currentValue: number;
  cashPnl: number;
  realizedPnl: number;
  percentPnl: number;
  percentRealizedPnl: number;
  totalBought: number;
  redeemable: boolean;
  redeemed: boolean;
  negativeRisk: boolean;
}

export default function PortfolioDashboard({ markets }: { markets: Market[] }) {
  const { user } = usePrivy();
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const walletAddr = (user as any)?.wallet?.address || '';

  useEffect(() => {
    if (!walletAddr) { setLoading(false); setError('Connect a wallet via Privy'); return; }
    setLoading(true);
    setError('');
    fetch(`/api/polynode?path=/v1/wallets/${walletAddr}/positions&query=limit%3D50%26sortBy%3DCASH_PNL%26sortDirection%3DDESC`)
      .then(r => r.json())
      .then((d: { positions?: Position[]; error?: string }) => {
        if (d.positions) setPositions(d.positions.filter(p => p.size > 0));
        else if (d.error) setError(d.error);
        else setPositions([]);
      })
      .catch(() => setError('Failed to fetch'))
      .finally(() => setLoading(false));
  }, [walletAddr]);

  const totalValue = useMemo(() => positions.reduce((s, p) => s + p.currentValue, 0), [positions]);
  const totalPnl = useMemo(() => positions.reduce((s, p) => s + p.cashPnl, 0), [positions]);
  const winCount = useMemo(() => positions.filter(p => (p.cashPnl || 0) >= 0).length, [positions]);

  if (!walletAddr) return <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-3)' }}>Connect a wallet via Privy to see your portfolio</div>;
  if (loading) return <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
    {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: '2.5rem', animationDelay: `${i * 0.1}s` }} />)}
  </div>;
  if (error) return <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--red)' }}>{error}</div>;
  if (positions.length === 0) return <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-3)' }}>No open positions</div>;

  return (
    <div className="portfolio-container">
      <div className="portfolio-summary">
        <div className="pf-stat">
          <span className="pf-stat-label">PORTFOLIO VALUE</span>
          <span className="pf-stat-val">${formatVol(totalValue)}</span>
        </div>
        <div className="pf-stat">
          <span className="pf-stat-label">TOTAL P&L</span>
          <span className={`pf-stat-val ${totalPnl >= 0 ? 'accent' : 'red'}`}>{totalPnl >= 0 ? '+' : ''}${formatVol(Math.abs(totalPnl))}</span>
        </div>
        <div className="pf-stat">
          <span className="pf-stat-label">POSITIONS</span>
          <span className="pf-stat-val">{positions.length}</span>
        </div>
        <div className="pf-stat">
          <span className="pf-stat-label">PROFITABLE</span>
          <span className="pf-stat-val">{positions.length > 0 ? Math.round((winCount / positions.length) * 100) : 0}%</span>
        </div>
      </div>

      <div className="portfolio-chart">
        <div className="pf-chart-bar-container">
          {positions.slice(0, 15).map((p, i) => {
            const maxPnl = Math.max(...positions.map(x => Math.abs(x.percentPnl || 0)), 1);
            const barHeight = (Math.abs(p.percentPnl || 0) / maxPnl) * 100;
            return (
              <div key={i} className="pf-chart-col" title={`${(p.title || '').substring(0, 30)}: ${(p.percentPnl || 0) >= 0 ? '+' : ''}${(p.percentPnl || 0).toFixed(1)}%`}>
                <div className={`pf-chart-bar ${(p.cashPnl || 0) >= 0 ? 'pf-chart-up' : 'pf-chart-down'}`} style={{ height: `${Math.max(barHeight, 2)}%` }} />
              </div>
            );
          })}
        </div>
      </div>

      <div className="portfolio-positions">
        {positions.slice(0, 20).map((p, i) => (
          <div key={i} className="pf-position-row">
            <div className="pf-pos-info">
              <span className="pf-pos-question">{(p.title || 'Unknown').substring(0, 45)}</span>
              <span className="pf-pos-meta">{p.outcome || '?'} · {Math.round(p.size).toLocaleString()} shares · avg {(p.avgPrice * 100).toFixed(1)}c</span>
            </div>
            <div className="pf-pos-prices">
              <span className={`pf-pos-current ${(p.cashPnl || 0) >= 0 ? 'accent' : 'red'}`}>{(p.curPrice * 100).toFixed(1)}c</span>
            </div>
            <div className={`pf-pos-pnl ${(p.cashPnl || 0) >= 0 ? 'accent' : 'red'}`}>
              <span className="pf-pnl-abs">{p.cashPnl >= 0 ? '+' : ''}${formatVol(Math.abs(p.cashPnl))}</span>
              <span className="pf-pnl-pct">({(p.percentPnl || 0) >= 0 ? '+' : ''}{(p.percentPnl || 0).toFixed(1)}%)</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
