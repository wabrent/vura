'use client';

import { useState, useEffect, useRef } from 'react';
import type { Market } from '@/app/lib/types';

export default function FastMarkets({ markets }: { markets: Market[] }) {
  const [fastMarkets, setFastMarkets] = useState<Market[]>([]);
  const [priceDirs, setPriceDirs] = useState<Map<string, 'up' | 'down' | null>>(new Map());
  const prevPrices = useRef<Map<string, number>>(new Map());

  useEffect(() => {
    const crypto = markets
      .filter(m => m.category === 'crypto' && m.vol24h > 100)
      .sort((a, b) => b.vol24h - a.vol24h)
      .slice(0, 20);
    setFastMarkets(crypto);
  }, [markets]);

  useEffect(() => {
    const interval = setInterval(() => {
      const dirs = new Map<string, 'up' | 'down' | null>();
      for (const m of fastMarkets) {
        const prev = prevPrices.current.get(m.id);
        if (prev != null && prev !== m.yesPrice) {
          dirs.set(m.id, m.yesPrice > prev ? 'up' : 'down');
        }
        prevPrices.current.set(m.id, m.yesPrice);
      }
      setPriceDirs(dirs);
      setTimeout(() => setPriceDirs(new Map()), 600);
    }, 5000);
    return () => clearInterval(interval);
  }, [fastMarkets]);

  const totalVol = fastMarkets.reduce((s, m) => s + m.volume, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '0.5rem', fontSize: '0.6rem', color: 'var(--text-3)' }}>
        <span>TOP 20 CRYPTO · LIVE</span>
        <span className="animate-float" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
          <span className="live-dot" style={{ animation: 'pulse 1.5s ease-in-out infinite' }} />
          Auto-refresh 5s
        </span>
        <span style={{ marginLeft: 'auto' }}>Vol ${(totalVol / 1e6).toFixed(1)}M</span>
      </div>
      {fastMarkets.map((m, i) => {
        const dir = priceDirs.get(m.id);
        return (
          <div key={m.id} className="market-card animate-slide-up" style={{ animationDelay: `${i * 0.03}s`, padding: '0.6rem 1rem' }}
            onClick={() => window.open(`https://polymarket.com/event/${m.slug}`, '_blank')}>
            <div className="card-left" style={{ flex: 1 }}>
              <span className="card-title" style={{ fontSize: '0.7rem' }}>{m.question}</span>
              <span className="card-meta" style={{ fontSize: '0.55rem' }}>${m.volDisplay} · α {m.alpha}</span>
            </div>
            <div className="card-right" style={{ flexDirection: 'row', gap: '0.5rem', alignItems: 'center' }}>
              <span className={`card-price ${dir ? 'price-flash' : ''}`}
                style={{ fontSize: '0.85rem', color: dir === 'up' ? 'var(--accent)' : dir === 'down' ? 'var(--red)' : 'var(--text)' }}>
                {dir === 'up' ? '▲' : dir === 'down' ? '▼' : '▸'} {Math.round(m.yesPrice * 100)}c
              </span>
              <span className={`card-change ${m.change24h > 0 ? 'change-up' : m.change24h < 0 ? 'change-down' : ''}`}
                style={{ fontSize: '0.55rem' }}>
                {m.change24h > 0 ? '+' : ''}{(m.change24h * 100).toFixed(1)}%
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
