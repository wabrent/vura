'use client';

import { useState, useEffect } from 'react';

interface TickerItem {
  id: string;
  title: string;
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
          const url = `https://polymarket.com/event/${m.eventSlug}?marketSlug=${m.slug}&via=vura`;
          return (
            <a key={m.id + i} className="tape-item" href={url} target="_blank" rel="noreferrer"
              title={String(m.title || '')}>
              <span className="tape-name">{String(m.title || '').substring(0, 40)}</span>
            </a>
          );
        })}
      </div>
    </div>
  );
}
