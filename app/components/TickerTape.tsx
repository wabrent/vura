'use client';

import { useState, useEffect } from 'react';

interface TickerItem {
  id: string;
  title: string;
  yesPrice: number;
  change24h: number;
  slug: string;
  eventSlug: string;
}

export default function TickerTape() {
  const [items, setItems] = useState<TickerItem[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/hub?limit=12');
        if (res.ok) {
          const data = await res.json();
          const cats = data.categories || [];
          const all = cats.flatMap((c: any) => (c.markets || []).slice(0, 4));
          setItems(all.slice(0, 20));
        }
      } catch {}
    })();
  }, []);

  if (items.length === 0) return null;

  const renderItems = [...items, ...items];

  return (
    <div className="tape">
      <div className="tape-track">
        {renderItems.map((m, i) => {
          const chg = Number(m.change24h) || 0;
          const url = `https://polymarket.com/event/${m.eventSlug}?marketSlug=${m.slug}&via=vura`;
          return (
            <span key={m.id + i} className="tape-group">
              {i === 0 || i === items.length ? <span className="tape-vura">VURA</span> : null}
              <a className="tape-item" href={url} target="_blank" rel="noreferrer"
                title={String(m.title || '')}>
                <span className="tape-name">{String(m.title || '').substring(0, 30)}</span>
                <span className="tape-price">{Math.round((Number(m.yesPrice) || 0) * 100)}c</span>
                <span className={`tape-chg${chg < 0 ? ' tape-down' : chg > 0 ? ' tape-up' : ''}`}>
                  {chg > 0 ? '▲' : chg < 0 ? '▼' : '•'} {Math.abs(chg * 100).toFixed(1)}%
                </span>
              </a>
            </span>
          );
        })}
      </div>
    </div>
  );
}
