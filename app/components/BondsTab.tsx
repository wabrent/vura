'use client';

import { useState, useMemo } from 'react';
import type { Market } from '@/app/lib/types';

function formatVol(v: number) {
  if (v >= 1e6) return (v / 1e6).toFixed(1) + 'M';
  if (v >= 1e3) return (v / 1e3).toFixed(1) + 'K';
  return Math.round(v).toString();
}

export default function BondsTab({ markets }: { markets: Market[] }) {
  const [priceMin, setPriceMin] = useState(80);
  const [priceMax, setPriceMax] = useState(99);
  const [category, setCategory] = useState('all');
  const [minApy, setMinApy] = useState(0);
  const [minVol, setMinVol] = useState(0);
  const [sortBy, setSortBy] = useState('apy');

  const bonds = useMemo(() => {
    return markets
      .filter(m => {
        const priceC = Math.round(Math.max(m.yesPrice, m.noPrice) * 100);
        if (priceC < priceMin || priceC > priceMax) return false;
        if (category !== 'all' && m.category !== category) return false;
        if (minVol > 0 && m.volume < minVol) return false;
        return true;
      })
      .map(m => {
        const bestPrice = Math.max(m.yesPrice, m.noPrice);
        const priceC = Math.round(bestPrice * 100);
        const estApy = bestPrice > 0.5 ? ((1 / bestPrice - 1) * 365) : ((1 / (1 - bestPrice) - 1) * 365);
        return { ...m, bondPrice: priceC, apy: estApy, isYes: m.yesPrice >= m.noPrice };
      })
      .filter(m => minApy <= 0 || m.apy >= minApy)
      .sort((a, b) => {
        switch (sortBy) {
          case 'apy': return b.apy - a.apy;
          case 'volume': return b.volume - a.volume;
          case 'price': return b.bondPrice - a.bondPrice;
          case 'risk': return a.bondPrice - b.bondPrice;
          default: return b.apy - a.apy;
        }
      });
  }, [markets, priceMin, priceMax, category, minApy, minVol, sortBy]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid var(--border)', fontSize: '0.6rem' }}>
        <div className="pnl-field" style={{ flexDirection: 'row', gap: '0.3rem', alignItems: 'center' }}>
          <span className="pnl-label">Price</span>
          <input type="number" className="pnl-input" value={priceMin} onChange={e => setPriceMin(Number(e.target.value))} style={{ width: '40px' }} min={1} max={99} />
          <span>-</span>
          <input type="number" className="pnl-input" value={priceMax} onChange={e => setPriceMax(Number(e.target.value))} style={{ width: '40px' }} min={1} max={99} />
          <span>c</span>
        </div>
        <select className="pnl-input" value={category} onChange={e => setCategory(e.target.value)} style={{ width: '80px' }}>
          <option value="all">All</option>
          <option value="crypto">Crypto</option>
          <option value="politics">Politics</option>
          <option value="sports">Sports</option>
          <option value="general">General</option>
        </select>
        <div className="pnl-field" style={{ flexDirection: 'row', gap: '0.3rem', alignItems: 'center' }}>
          <span className="pnl-label">APY ≥</span>
          <input type="number" className="pnl-input" value={minApy} onChange={e => setMinApy(Number(e.target.value))} style={{ width: '50px' }} min={0} />
          <span>%</span>
        </div>
        <div className="pnl-field" style={{ flexDirection: 'row', gap: '0.3rem', alignItems: 'center' }}>
          <span className="pnl-label">Vol ≥</span>
          <input type="number" className="pnl-input" value={minVol} onChange={e => setMinVol(Number(e.target.value))} style={{ width: '60px' }} min={0} />
        </div>
        <select className="pnl-input" value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ width: '80px' }}>
          <option value="apy">APY</option>
          <option value="volume">Volume</option>
          <option value="price">Price</option>
          <option value="risk">Safety</option>
        </select>
        <button className="csv-btn" onClick={() => { setPriceMin(80); setPriceMax(99); setCategory('all'); setMinApy(0); setMinVol(0); }}>Reset</button>
        <span style={{ color: 'var(--text-3)' }}>{bonds.length} bonds</span>
      </div>

      {bonds.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-3)' }}>No bonds match your filters</div>
      ) : (
        bonds.slice(0, 50).map((m, i) => {
          const riskLevel = m.bondPrice >= 95 ? 'Low' : m.bondPrice >= 90 ? 'Medium' : 'Higher';
          const riskColor = m.bondPrice >= 95 ? 'var(--accent)' : m.bondPrice >= 90 ? '#f59e0b' : '#dc2626';
          return (
            <div key={m.id} className="market-card animate-slide-up" style={{ animationDelay: `${i * 0.03}s`, padding: '0.65rem 1rem' }}
              onClick={() => window.open(`https://polymarket.com/event/${m.slug}`, '_blank')}>
              <div className="card-left" style={{ flex: 1 }}>
                <span className="card-title" style={{ fontSize: '0.7rem' }}>{m.question}</span>
                <span className="card-meta" style={{ fontSize: '0.55rem' }}>
                  {m.category.toUpperCase()} · Vol ${formatVol(m.volume)} · α {m.alpha}
                </span>
              </div>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexShrink: 0 }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, fontFamily: 'var(--display)', color: m.isYes ? 'var(--accent)' : 'var(--red)' }}>
                    {m.isYes ? 'YES' : 'NO'} {m.bondPrice}c
                  </div>
                  <div style={{ fontSize: '0.55rem', color: 'var(--accent)' }}>APY {m.apy.toFixed(0)}%</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '0.55rem', padding: '1px 5px', background: `${riskColor}15`, color: riskColor, borderRadius: 2, fontWeight: 500 }}>
                    {riskLevel}
                  </span>
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
