'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Market } from '@/app/lib/types';

interface ComboLeg {
  market: Market;
  side: 'YES' | 'NO';
}

interface LiveCombo {
  id: string;
  title: string;
  yesPrice: number;
  noPrice: number;
  volume: number;
}

export default function CombosExplorer({ markets }: { markets: Market[] }) {
  const [view, setView] = useState<'builder' | 'scan' | 'live'>('builder');
  const [selected, setSelected] = useState<ComboLeg[]>([]);
  const [stake, setStake] = useState(10);
  const [liveCombos, setLiveCombos] = useState<LiveCombo[]>([]);
  const [liveLoading, setLiveLoading] = useState(false);
  const [scanResult, setScanResult] = useState<{ a: Market; b: Market; comboPrice: number; multiplier: number }[] | null>(null);
  const [scanLoading, setScanLoading] = useState(false);
  const [picks, setPicks] = useState<Market[]>([]);
  const [pickQuery, setPickQuery] = useState('');

  useEffect(() => {
    setPicks([...markets].sort((a, b) => b.volume - a.volume).slice(0, 60));
  }, [markets]);

  const filteredPicks = pickQuery
    ? picks.filter(m => m.question.toLowerCase().includes(pickQuery.toLowerCase()))
    : picks;

  const toggleLeg = (m: Market, side: 'YES' | 'NO') => {
    setSelected(prev => {
      const without = prev.filter(l => l.market.id !== m.id);
      const exists = prev.some(l => l.market.id === m.id && l.side === side);
      if (exists) return without;
      return [...without, { market: m, side }];
    });
  };

  const comboPrice = selected.reduce((acc, l) => acc * (l.side === 'YES' ? l.market.yesPrice : l.market.noPrice), 1);
  const multiplier = comboPrice > 0 ? 1 / comboPrice : 0;
  const payout = stake * multiplier;
  const profit = payout - stake;

  const runScan = () => {
    setScanLoading(true);
    setScanResult(null);
    setTimeout(() => {
      const pool = [...markets].filter(m => m.volume > 20000).slice(0, 40);
      const out: { a: Market; b: Market; comboPrice: number; multiplier: number }[] = [];
      for (let i = 0; i < pool.length; i++) {
        for (let j = i + 1; j < pool.length; j++) {
          const a = pool[i], b = pool[j];
          const pa = Math.min(a.yesPrice, a.noPrice);
          const pb = Math.min(b.yesPrice, b.noPrice);
          const combo = pa * pb;
          if (combo >= 0.01 && combo <= 0.2) {
            out.push({ a, b, comboPrice: combo, multiplier: 1 / combo });
          }
        }
      }
      out.sort((x, y) => y.multiplier - x.multiplier);
      setScanResult(out.slice(0, 25));
      setScanLoading(false);
    }, 400);
  };

  const loadLive = useCallback(async () => {
    setLiveLoading(true);
    try {
      const res = await fetch('/api/combos/legs?max=300');
      if (!res.ok) throw new Error('failed');
      const data = await res.json();
      const list: LiveCombo[] = (data.legs || []).map((l: any) => ({
        id: l.conditionId,
        title: l.title,
        yesPrice: l.yesPrice,
        noPrice: l.noPrice,
        volume: l.volume,
      })).filter((l: LiveCombo) => l.yesPrice > 0.03 && l.yesPrice < 0.97);
      setLiveCombos(list.sort((x, y) => y.volume - x.volume).slice(0, 40));
    } catch {
      setLiveCombos([]);
    }
    setLiveLoading(false);
  }, []);

  useEffect(() => {
    if (view === 'live' && liveCombos.length === 0 && !liveLoading) loadLive();
  }, [view, liveCombos.length, liveLoading, loadLive]);

  const fmtPrice = (p: number) => Math.round(p * 100) + 'c';
  const fmtVol = (v: number) => v >= 1e6 ? (v / 1e6).toFixed(1) + 'M' : v >= 1e3 ? (v / 1e3).toFixed(1) + 'K' : Math.round(v).toString();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', gap: 1, background: 'var(--border)', padding: 2, borderRadius: 10, alignSelf: 'flex-start' }}>
        {(['builder', 'scan', 'live'] as const).map(v => (
          <button key={v} onClick={() => setView(v)}
            style={{
              border: 'none', background: view === v ? 'var(--bg-2)' : 'transparent', color: view === v ? 'var(--text)' : 'var(--text-3)',
              padding: '0.4rem 1rem', fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.06em',
              fontWeight: 600, cursor: 'pointer', borderRadius: 8, fontFamily: 'var(--display)'
            }}>
            {v === 'builder' ? 'Builder' : v === 'scan' ? 'Edge Scan' : 'Live Combos'}
          </button>
        ))}
      </div>

      {view === 'builder' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem' }}>
            <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 10, padding: '0.9rem 1.1rem' }}>
              <div style={{ fontSize: '0.62rem', color: 'var(--text-3)' }}>LEGS</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, fontFamily: 'var(--mono)' }}>{selected.length}</div>
            </div>
            <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 10, padding: '0.9rem 1.1rem' }}>
              <div style={{ fontSize: '0.62rem', color: 'var(--text-3)' }}>COMBO PRICE</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, fontFamily: 'var(--mono)' }}>{selected.length ? (comboPrice * 100).toFixed(1) + 'c' : '—'}</div>
            </div>
            <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 10, padding: '0.9rem 1.1rem' }}>
              <div style={{ fontSize: '0.62rem', color: 'var(--text-3)' }}>MULTIPLIER</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, fontFamily: 'var(--mono)', color: 'var(--accent)' }}>{selected.length ? multiplier.toFixed(1) + '×' : '—'}</div>
            </div>
            <div style={{ background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 10, padding: '0.9rem 1.1rem' }}>
              <div style={{ fontSize: '0.62rem', color: 'var(--text-3)' }}>PAYOUT @ ${stake}</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, fontFamily: 'var(--mono)', color: profit > 0 ? 'var(--accent)' : 'var(--text)' }}>{selected.length ? '$' + payout.toFixed(2) : '—'}</div>
            </div>
          </div>

          {selected.length > 1 && (
            <div style={{ padding: '0.75rem 1rem', background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 10, fontSize: '0.68rem', color: 'var(--text-2)' }}>
              <span style={{ color: '#f59e0b', fontWeight: 600 }}>⚠ Correlation check: </span>
              Combining correlated outcomes inflates risk — a combo of correlated events is riskier than the implied multiplier suggests.
            </div>
          )}

          {selected.length > 0 && (
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
              {selected.map(l => (
                <span key={l.market.id} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.3rem 0.7rem', background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 999, fontSize: '0.65rem' }}>
                  <span style={{ fontWeight: 600, color: l.side === 'YES' ? 'var(--accent)' : 'var(--red)' }}>{l.side}</span>
                  <span style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.market.question}</span>
                  <button onClick={() => toggleLeg(l.market, l.side)} style={{ border: 'none', background: 'none', color: 'var(--text-3)', cursor: 'pointer', fontSize: '0.7rem' }}>✕</button>
                </span>
              ))}
            </div>
          )}

          <div>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.75rem' }}>
              <input className="search-input" type="text" placeholder="search markets to add..."
                value={pickQuery} onChange={e => setPickQuery(e.target.value)} style={{ flex: 1, maxWidth: 320 }} />
              <span style={{ fontSize: '0.62rem', color: 'var(--text-3)' }}>click YES or NO to add a leg</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: 420, overflow: 'auto' }}>
              {filteredPicks.slice(0, 40).map(m => {
                const isYes = selected.some(l => l.market.id === m.id && l.side === 'YES');
                const isNo = selected.some(l => l.market.id === m.id && l.side === 'NO');
                return (
                  <div key={m.id} className="market-card" style={{ padding: '0.6rem 0.9rem', marginBottom: 0, cursor: 'default' }}>
                    <div className="card-left">
                      <span className="card-title" style={{ fontSize: '0.78rem' }}>{m.question}</span>
                      <span className="card-meta" style={{ fontSize: '0.6rem' }}>${fmtVol(m.volume)}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                      <button onClick={() => toggleLeg(m, 'YES')}
                        style={{ border: `1px solid ${isYes ? 'var(--accent)' : 'var(--border)'}`, background: isYes ? 'rgba(5,150,105,0.12)' : 'var(--bg-2)', color: isYes ? 'var(--accent)' : 'var(--text-2)', padding: '0.3rem 0.7rem', borderRadius: 8, fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--mono)' }}>
                        YES {fmtPrice(m.yesPrice)}
                      </button>
                      <button onClick={() => toggleLeg(m, 'NO')}
                        style={{ border: `1px solid ${isNo ? 'var(--red)' : 'var(--border)'}`, background: isNo ? 'rgba(220,38,38,0.12)' : 'var(--bg-2)', color: isNo ? 'var(--red)' : 'var(--text-2)', padding: '0.3rem 0.7rem', borderRadius: 8, fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--mono)' }}>
                        NO {fmtPrice(m.noPrice)}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {view === 'scan' && (
        <>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <button className="btn-retry" onClick={runScan} disabled={scanLoading} style={{ opacity: scanLoading ? 0.6 : 1 }}>
              {scanLoading ? 'Scanning pairs...' : 'Scan for edge combos'}
            </button>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-3)' }}>
              Finds 2-leg combos priced 1–20c from the most liquid markets. Higher multiplier = bigger upside.
            </span>
          </div>
          {scanLoading && <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>{[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: '3.2rem', animationDelay: `${i*0.1}s` }} />)}</div>}
          {scanResult && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {scanResult.map((r, i) => (
                <div key={i} className="arb-card" style={{ padding: '0.75rem 1rem', marginBottom: 0 }}>
                  <div style={{ flex: '0 0 34%' }}>
                    <span className="arb-platform" style={{ color: 'var(--accent)' }}>{r.multiplier.toFixed(1)}× COMBO</span>
                    <div style={{ fontFamily: 'var(--display)', fontSize: '0.85rem' }}>{r.a.question.substring(0, 40)}</div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-3)' }}>× {r.b.question.substring(0, 40)}</div>
                  </div>
                  <div style={{ flex: 1, fontSize: '0.68rem' }}>
                    <span style={{ fontFamily: 'var(--mono)', color: 'var(--text-2)' }}>{fmtPrice(Math.min(r.a.yesPrice, r.a.noPrice))} × {fmtPrice(Math.min(r.b.yesPrice, r.b.noPrice))}</span>
                  </div>
                  <div style={{ flex: '0 0 18%', textAlign: 'right' }}>
                    <div style={{ fontSize: '1rem', fontFamily: 'var(--mono)', color: 'var(--accent)' }}>{r.multiplier.toFixed(1)}×</div>
                    <div style={{ fontSize: '0.6rem', color: 'var(--text-3)' }}>{fmtPrice(r.comboPrice)}</div>
                  </div>
                </div>
              ))}
              {scanResult.length === 0 && <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-3)' }}>No combo pairs found in current data.</div>}
            </div>
          )}
        </>
      )}

      {view === 'live' && (
        <>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <button className="btn-retry" onClick={loadLive} disabled={liveLoading} style={{ opacity: liveLoading ? 0.6 : 1 }}>
              {liveLoading ? 'Loading...' : 'Refresh'}
            </button>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-3)' }}>Real combo markets trading on Polymarket RFQ right now.</span>
          </div>
          {liveLoading && <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>{[1,2,3,4,5].map(i => <div key={i} className="skeleton" style={{ height: '3rem', animationDelay: `${i*0.1}s` }} />)}</div>}
          {!liveLoading && liveCombos.length === 0 && <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-3)' }}>No combo markets loaded. Try refresh.</div>}
          {!liveLoading && liveCombos.map((c, i) => (
            <div key={c.id} className="market-card" style={{ padding: '0.7rem 1rem', marginBottom: 0, animationDelay: `${i*25}ms` }}>
              <div className="card-left">
                <span className="card-category">COMBO</span>
                <span className="card-title" style={{ fontSize: '0.82rem' }}>{c.title.substring(0, 70)}</span>
              </div>
              <div className="card-right">
                <span style={{ fontSize: '0.75rem', color: 'var(--text-3)' }}>Vol ${fmtVol(c.volume)}</span>
                <span className="card-price">{fmtPrice(c.yesPrice)}</span>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
