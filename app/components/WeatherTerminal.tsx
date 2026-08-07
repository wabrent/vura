'use client';

import { useState, useEffect, useCallback } from 'react';

interface Recommendation {
  city: string;
  date: string;
  type: string;
  thresholdC: number;
  side: 'YES' | 'NO';
  price: number;
  forecast: number;
  reason: string;
  slug: string;
  eventSlug: string;
}

const fmtDate = (d: string) => {
  const dt = new Date(d + 'T00:00:00Z');
  const days = Math.round((dt.getTime() - Date.now()) / 86400000);
  const label = dt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  if (days === 0) return 'TODAY';
  if (days === 1) return 'TOMORROW';
  return label;
};

export default function WeatherTerminal() {
  const [recs, setRecs] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/weather/ai?pages=3');
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setRecs(data.recs || []);
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '46rem', margin: '0 auto' }}>
      <div style={{ textAlign: 'center', padding: '0.5rem 0 0.5rem' }}>
        <div style={{ fontSize: '1.3rem', fontWeight: 700 }}>Today's best trades</div>
        <div style={{ fontSize: '0.78rem', color: 'var(--text-2)', marginTop: '0.3rem' }}>
          AI compares the weather forecast with market prices. Tap a card to buy.
        </div>
      </div>

      {error && (
        <div style={{ padding: '0.9rem 1.1rem', background: 'rgba(223,32,32,0.06)', border: '1px solid rgba(223,32,32,0.25)', borderRadius: 10, fontSize: '0.75rem' }}>
          {error}
        </div>
      )}

      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {[1, 2, 3, 4, 5].map(i => <div key={i} className="skeleton" style={{ height: '84px', animationDelay: `${i * 0.08}s` }} />)}
        </div>
      )}

      {!loading && recs.length === 0 && !error && (
        <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-3)' }}>
          No trades available right now. Check back later.
        </div>
      )}

      {!loading && recs.map((r, i) => {
        const url = `https://polymarket.com/event/${r.eventSlug}?marketSlug=${r.slug}&via=vura`;
        return (
          <div key={r.city + r.thresholdC + r.side} className="rec-card" style={{ animationDelay: `${i * 50}ms` }}>
            <div className="rec-top">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <div className="rec-rank">{i + 1}</div>
                <div>
                  <div className="rec-city">{r.city} · {fmtDate(r.date)}</div>
                  <div className="rec-reason">{r.reason}</div>
                </div>
              </div>
            </div>
            <div className="rec-action">
              <div className="rec-price">
                {r.side} {r.thresholdC}°C
                <span className="rec-cents">@ {Math.round(r.price * 100)}¢</span>
              </div>
              <a className="rec-buy" href={url} target="_blank">Buy now</a>
            </div>
          </div>
        );
      })}

      <div style={{ textAlign: 'center', padding: '1rem 0 0.5rem' }}>
        <button className="btn-retry" onClick={load} disabled={loading} style={{ opacity: loading ? 0.6 : 1 }}>
          {loading ? 'Loading...' : '↻ Refresh'}
        </button>
        <div style={{ fontSize: '0.6rem', color: 'var(--text-3)', marginTop: '0.75rem' }}>
          Buy means: open the market and tap Buy Yes/No at the shown price. If you're right, $1 per share.
        </div>
      </div>
    </div>
  );
}
