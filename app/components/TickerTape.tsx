'use client';

import { useState, useEffect } from 'react';

interface TickerItem {
  id: string;
  title: string;
  yesPrice: number;
  change24h: number;
  slug: string;
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
          const all = cats.flatMap((c: any) => (c.markets || []).slice(0, 3));
          setItems(all.slice(0, 15));
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
          return (
            <span key={m.id + i} className="tape-item">
              <span style={{ color: chg > 0 ? 'var(--text)' : 'var(--text-2)' }}>{chg > 0 ? '▲' : chg < 0 ? '▼' : '◆'}</span>
              <span style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{String(m.title || '').substring(0, 38)}</span>
              <span className="tape-price">{Math.round((Number(m.yesPrice) || 0) * 100)}c</span>
              <span style={{ fontSize: '0.64rem' }}>{chg > 0 ? '+' : ''}{(chg * 100).toFixed(1)}%</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}
