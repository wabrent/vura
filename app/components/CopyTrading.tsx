'use client';

import { useState, useEffect, useCallback } from 'react';

interface Wallet {
  wallet: string;
  name: string;
  image: string;
  amount: number;
  markets: number;
}

interface Position {
  title: string;
  slug: string;
  icon: string;
  outcome: string;
  size: number;
  avgPrice: number;
  currentValue: number;
  cashPnl: number;
  percentPnl: number;
}

const shortAddr = (a: string) => a.slice(0, 6) + '…' + a.slice(-4);
const fmtMoney = (v: number) => v >= 1e6 ? '$' + (v / 1e6).toFixed(1) + 'M' : v >= 1e3 ? '$' + (v / 1e3).toFixed(0) + 'K' : '$' + Math.round(v);

export default function CopyTrading() {
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState<Wallet | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [posLoading, setPosLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/copy?markets=15');
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setWallets(data.wallets || []);
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openWallet = async (w: Wallet) => {
    setActive(w);
    setPosLoading(true);
    setPositions([]);
    try {
      const res = await fetch(`/api/copy/positions/${w.wallet}`);
      if (res.ok) {
        const data = await res.json();
        setPositions(data.positions || []);
      }
    } catch {}
    setPosLoading(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '54rem', margin: '0 auto' }}>
      <div style={{ textAlign: 'center', padding: '0.5rem 0' }}>
        <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>Top Polymarket wallets</div>
        <div style={{ fontSize: '0.78rem', color: 'var(--text-2)', marginTop: '0.3rem' }}>
          Biggest active holders across top markets. Click one to see positions & PnL.
        </div>
        <div style={{ marginTop: '0.8rem' }}>
          <button className="btn-retry" onClick={load} disabled={loading} style={{ opacity: loading ? 0.6 : 1 }}>
            {loading ? 'Scanning...' : '↻ Rescan'}
          </button>
        </div>
      </div>

      {error && (
        <div style={{ padding: '0.9rem 1.1rem', background: 'rgba(223,32,32,0.06)', border: '1px solid rgba(223,32,32,0.25)', borderRadius: 10, fontSize: '0.75rem' }}>
          {error}
        </div>
      )}

      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {[1, 2, 3, 4, 5].map(i => <div key={i} className="skeleton" style={{ height: '56px', animationDelay: `${i * 0.08}s` }} />)}
        </div>
      )}

      {!loading && wallets.length === 0 && !error && (
        <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-3)' }}>
          No wallet data right now. Try refresh.
        </div>
      )}

      {wallets.map((w, i) => (
        <div key={w.wallet} className="rec-card" style={{ animationDelay: `${i * 40}ms`, cursor: 'pointer' }} onClick={() => openWallet(w)}>
          <div className="rec-top">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <div className="rec-rank">{i + 1}</div>
              {w.image ? <img src={w.image} alt="" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
                : <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--bg-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontFamily: 'var(--mono)', color: 'var(--text-2)' }}>{w.name.slice(0, 2).toUpperCase()}</div>}
              <div>
                <div className="rec-city">{w.name}</div>
                <div className="rec-reason">{shortAddr(w.wallet)} · {w.markets} markets</div>
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="rec-win-mult">{fmtMoney(w.amount)}</div>
              <div className="rec-win-detail">total exposure</div>
            </div>
          </div>
        </div>
      ))}

      {active && (
        <div className="modal-overlay" onClick={e => { if ((e.target as HTMLElement).className === 'modal-overlay') setActive(null); }}>
          <div className="modal" style={{ maxWidth: 620 }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                {active.image ? <img src={active.image} alt="" style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover' }} /> : null}
                <span className="modal-title">{active.name}</span>
              </div>
              <button className="modal-close" onClick={() => setActive(null)}>✕</button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ fontSize: '0.55rem', letterSpacing: '0.08em', color: 'var(--text-3)', fontFamily: 'var(--mono)' }}>{active.wallet}</div>
              {posLoading && <div className="skeleton" style={{ height: '12rem' }} />}
              {!posLoading && positions.length === 0 && <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-3)', fontSize: '0.78rem' }}>No open positions.</div>}
              {positions.slice(0, 15).map((p, i) => (
                <div key={p.slug + i} className="market-row" style={{ animationDelay: `${i * 20}ms`, cursor: 'pointer' }}
                  onClick={() => window.open(`https://polymarket.com/event/${p.slug}?via=vura`, '_blank')}>
                  <div className="col-name">
                    <span className="row-title">{p.title.substring(0, 50)}</span>
                    <span className="row-cat">{p.outcome} · {Math.round(p.size).toLocaleString()} @ {(p.avgPrice * 100).toFixed(1)}¢</span>
                  </div>
                  <div style={{ textAlign: 'right', flex: '0 0 130px' }}>
                    <div className="row-price" style={{ color: p.cashPnl >= 0 ? 'var(--accent-2)' : 'var(--red)' }}>
                      {p.cashPnl >= 0 ? '+' : ''}{fmtMoney(p.cashPnl)}
                    </div>
                    <div className="row-cat">{(p.percentPnl * 100).toFixed(1)}% · {fmtMoney(p.currentValue)}</div>
                  </div>
                </div>
              ))}
              <a href={`https://polymarket.com/profile/${active.wallet}?via=vura`} target="_blank" rel="noreferrer"
                style={{ fontSize: '0.7rem', color: 'var(--accent)', textAlign: 'center', padding: '0.5rem 0' }}>
                View full profile on Polymarket ↗
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
