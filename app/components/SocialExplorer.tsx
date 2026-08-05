'use client';

import { useState, useEffect, useCallback } from 'react';

interface Holder {
  wallet: string;
  name: string;
  pseudonym: string;
  image: string;
  amount: number;
  outcomeIndex: number;
}

interface MarketInfo {
  conditionId: string;
  question: string;
  slug: string;
  volume: number;
  image: string | null;
}

interface Section {
  market: MarketInfo;
  holders: Holder[];
}

interface Position {
  conditionId: string;
  title: string;
  slug: string;
  icon: string;
  outcome: string;
  size: number;
  avgPrice: number;
  initialValue: number;
  currentValue: number;
  cashPnl: number;
  percentPnl: number;
  curPrice: number;
  redeemable: boolean;
}

const shortAddr = (a: string) => a.slice(0, 6) + '…' + a.slice(-4);
const fmtMoney = (v: number) => v >= 1e6 ? '$' + (v / 1e6).toFixed(2) + 'M' : v >= 1e3 ? '$' + (v / 1e3).toFixed(1) + 'K' : '$' + Math.round(v);

export default function SocialExplorer() {
  const [view, setView] = useState<'feed' | 'leaderboard' | 'whales'>('feed');
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeHolder, setActiveHolder] = useState<{ wallet: string; name: string; image: string } | null>(null);
  const [positions, setPositions] = useState<Position[]>([]);
  const [posLoading, setPosLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/social?markets=20&per=10');
      if (!res.ok) throw new Error('Failed to load');
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setSections(data.sections || []);
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openHolder = async (h: Holder) => {
    setActiveHolder({ wallet: h.wallet, name: h.name || h.pseudonym || shortAddr(h.wallet), image: h.image });
    setPosLoading(true);
    setPositions([]);
    try {
      const res = await fetch(`/api/social/positions/${h.wallet}`);
      if (res.ok) {
        const data = await res.json();
        setPositions(data.positions || []);
      }
    } catch {}
    setPosLoading(false);
  };

  // Leaderboard: aggregate holders across all markets by total amount
  const leaderboard: { name: string; image: string; wallet: string; amount: number; markets: number }[] = [];
  const byWallet = new Map<string, { name: string; image: string; wallet: string; amount: number; markets: Set<string> }>();
  for (const s of sections) {
    for (const h of s.holders) {
      const k = h.wallet;
      const e = byWallet.get(k) || { name: h.name || h.pseudonym || shortAddr(k), image: h.image, wallet: k, amount: 0, markets: new Set() };
      e.amount += h.amount;
      e.markets.add(s.market.conditionId);
      byWallet.set(k, e);
    }
  }
  for (const e of byWallet.values()) {
    leaderboard.push({ name: e.name, image: e.image, wallet: e.wallet, amount: e.amount, markets: e.markets.size });
  }
  leaderboard.sort((a, b) => b.amount - a.amount);

  // Whales: single biggest positions
  const whales: { h: Holder; market: MarketInfo }[] = [];
  for (const s of sections) {
    for (const h of s.holders) whales.push({ h, market: s.market });
  }
  whales.sort((a, b) => b.h.amount - a.h.amount);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 1, background: 'var(--border)', padding: 2, borderRadius: 10, alignSelf: 'flex-start' }}>
          {([['feed', 'Whale Feed'], ['leaderboard', 'Leaderboard'], ['whales', 'Biggest Bets']] as const).map(([v, label]) => (
            <button key={v} onClick={() => setView(v)}
              style={{
                border: 'none', background: view === v ? 'var(--bg-2)' : 'transparent', color: view === v ? 'var(--text)' : 'var(--text-3)',
                padding: '0.4rem 1rem', fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.06em',
                fontWeight: 600, cursor: 'pointer', borderRadius: 8, fontFamily: 'var(--display)'
              }}>
              {label}
            </button>
          ))}
        </div>
        <button className="csv-btn" onClick={load} disabled={loading} style={{ opacity: loading ? 0.6 : 1 }}>{loading ? 'Loading...' : '↻ Refresh'}</button>
        <span style={{ fontSize: '0.62rem', color: 'var(--text-3)' }}>Live top holders from Polymarket</span>
      </div>

      {error && <div style={{ padding: '1rem', background: 'rgba(255,77,109,0.08)', border: '1px solid rgba(255,77,109,0.3)', borderRadius: 10, fontSize: '0.75rem' }}>{error}</div>}

      {loading && sections.length === 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {[1, 2, 3, 4, 5].map(i => <div key={i} className="skeleton" style={{ height: '4rem', animationDelay: `${i * 0.1}s` }} />)}
        </div>
      )}

      {!loading && sections.length === 0 && !error && (
        <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-3)' }}>
          No whale data available. Try refresh.
        </div>
      )}

      {view === 'feed' && sections.map((s, i) => (
        <div key={s.market.conditionId} style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', padding: '0.4rem 0.2rem' }}>
            {s.market.image && <img src={s.market.image} alt="" style={{ width: 26, height: 26, borderRadius: 5, objectFit: 'cover' }} />}
            <span style={{ fontSize: '0.78rem', fontWeight: 600 }}>{s.market.question.substring(0, 70)}</span>
            <span style={{ fontSize: '0.6rem', color: 'var(--text-3)', marginLeft: 'auto' }}>Vol {fmtMoney(s.market.volume)}</span>
          </div>
          {s.holders.map((h, j) => (
            <div key={h.wallet + j} className="market-card" style={{ padding: '0.55rem 0.9rem', marginBottom: 0, animationDelay: `${j * 25}ms` }}
              onClick={() => openHolder(h)}>
              {h.image ? <img src={h.image} alt="" style={{ width: 30, height: 30, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                : <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '0.65rem', color: 'var(--text-3)', fontFamily: 'var(--mono)' }}>{shortAddr(h.wallet).slice(0, 2).toUpperCase()}</div>}
              <div className="card-left">
                <span className="card-title" style={{ fontSize: '0.78rem' }}>{h.name || h.pseudonym || shortAddr(h.wallet)}</span>
                <span className="card-meta" style={{ fontSize: '0.58rem', fontFamily: 'var(--mono)' }}>{shortAddr(h.wallet)}</span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, fontFamily: 'var(--mono)', color: 'var(--accent)' }}>{fmtMoney(h.amount)}</div>
                <div style={{ fontSize: '0.55rem', color: 'var(--text-3)' }}>{h.outcomeIndex === 0 ? 'YES' : 'NO'}</div>
              </div>
            </div>
          ))}
        </div>
      ))}

      {view === 'leaderboard' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem' }}>
            <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 10, padding: '0.9rem 1.1rem' }}>
              <div style={{ fontSize: '0.62rem', color: 'var(--text-3)' }}>TRACKED TRADERS</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, fontFamily: 'var(--mono)' }}>{leaderboard.length}</div>
            </div>
            <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 10, padding: '0.9rem 1.1rem' }}>
              <div style={{ fontSize: '0.62rem', color: 'var(--text-3)' }}>TOP POSITION</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, fontFamily: 'var(--mono)', color: 'var(--accent)' }}>{leaderboard[0] ? fmtMoney(leaderboard[0].amount) : '—'}</div>
            </div>
          </div>
          {leaderboard.slice(0, 30).map((t, i) => (
            <div key={t.wallet} className="market-card" style={{ padding: '0.55rem 0.9rem', marginBottom: 0, animationDelay: `${i * 20}ms` }}
              onClick={() => openHolder({ wallet: t.wallet, name: t.name, image: t.image, amount: t.amount, pseudonym: '', outcomeIndex: 0 })}>
              <div style={{ width: 24, textAlign: 'center', fontFamily: 'var(--mono)', color: i < 3 ? '#f59e0b' : 'var(--text-3)', fontWeight: 700, fontSize: '0.8rem' }}>{i + 1}</div>
              {t.image ? <img src={t.image} alt="" style={{ width: 30, height: 30, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                : <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '0.6rem', color: 'var(--text-3)', fontFamily: 'var(--mono)' }}>{t.name.slice(0, 2).toUpperCase()}</div>}
              <div className="card-left">
                <span className="card-title" style={{ fontSize: '0.78rem' }}>{t.name}</span>
                <span className="card-meta" style={{ fontSize: '0.55rem' }}>{t.markets} market{t.markets !== 1 ? 's' : ''} · {shortAddr(t.wallet)}</span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, fontFamily: 'var(--mono)', color: 'var(--accent)' }}>{fmtMoney(t.amount)}</div>
              </div>
            </div>
          ))}
        </>
      )}

      {view === 'whales' && whales.slice(0, 30).map((w, i) => (
        <div key={w.h.wallet + i} className="market-card" style={{ padding: '0.55rem 0.9rem', marginBottom: 0, animationDelay: `${i * 20}ms` }}
          onClick={() => openHolder(w.h)}>
          {w.h.image ? <img src={w.h.image} alt="" style={{ width: 30, height: 30, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
            : <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '0.6rem', color: 'var(--text-3)', fontFamily: 'var(--mono)' }}>{(w.h.name || w.h.pseudonym || '??').slice(0, 2).toUpperCase()}</div>}
          <div className="card-left">
            <span className="card-title" style={{ fontSize: '0.78rem' }}>{w.h.name || w.h.pseudonym || shortAddr(w.h.wallet)}</span>
            <span className="card-meta" style={{ fontSize: '0.58rem' }}>{w.market.question.substring(0, 55)}</span>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.95rem', fontWeight: 700, fontFamily: 'var(--mono)', color: 'var(--accent)' }}>{fmtMoney(w.h.amount)}</div>
            <div style={{ fontSize: '0.55rem', color: 'var(--text-3)' }}>{w.h.outcomeIndex === 0 ? 'YES' : 'NO'}</div>
          </div>
        </div>
      ))}

      {activeHolder && (
        <div className="modal-overlay" onClick={e => { if ((e.target as HTMLElement).className === 'modal-overlay') setActiveHolder(null); }}>
          <div className="modal" style={{ maxWidth: 560 }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                {activeHolder.image ? <img src={activeHolder.image} alt="" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
                  : <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.7rem', fontFamily: 'var(--mono)', color: 'var(--text-3)' }}>{activeHolder.name.slice(0, 2).toUpperCase()}</div>}
                <span className="modal-title">{activeHolder.name}</span>
              </div>
              <button className="modal-close" onClick={() => setActiveHolder(null)}>✕</button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ fontSize: '0.55rem', letterSpacing: '0.1em', color: 'var(--text-3)', fontFamily: 'var(--mono)' }}>{activeHolder.wallet}</div>
              {posLoading && <div className="skeleton" style={{ height: '10rem' }} />}
              {!posLoading && positions.length === 0 && <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-3)', fontSize: '0.75rem' }}>No open positions found.</div>}
              {positions.map((p, i) => {
                const pnlColor = p.cashPnl >= 0 ? 'var(--accent)' : 'var(--red)';
                return (
                  <div key={p.conditionId + i} className="market-card" style={{ padding: '0.6rem 0.9rem', marginBottom: 0, animationDelay: `${i * 30}ms`, cursor: 'pointer' }}
                    onClick={() => window.open(`https://polymarket.com/event/${p.slug}`, '_blank')}>
                    {p.icon && <img src={p.icon} alt="" style={{ width: 30, height: 30, borderRadius: 4, objectFit: 'cover', flexShrink: 0 }} />}
                    <div className="card-left">
                      <span className="card-title" style={{ fontSize: '0.75rem' }}>{p.title.substring(0, 50)}</span>
                      <span className="card-meta" style={{ fontSize: '0.58rem' }}>{p.outcome} · {Math.round(p.size).toLocaleString()} @ {(p.avgPrice * 100).toFixed(1)}c</span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 700, fontFamily: 'var(--mono)', color: pnlColor }}>{p.cashPnl >= 0 ? '+' : ''}{fmtMoney(p.cashPnl)}</div>
                      <div style={{ fontSize: '0.55rem', color: 'var(--text-3)' }}>{p.percentPnl >= 0 ? '+' : ''}{(p.percentPnl * 100).toFixed(1)}% · {fmtMoney(p.currentValue)}</div>
                    </div>
                  </div>
                );
              })}
              <a href={`https://polymarket.com/positions/${activeHolder.wallet}`} target="_blank" rel="noreferrer"
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
