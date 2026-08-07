'use client';

import { useState, useEffect, useCallback } from 'react';
import WeatherTerminal from '@/app/components/WeatherTerminal';

interface HubMarket {
  id: string;
  question: string;
  slug: string;
  eventSlug: string;
  image: string | null;
  yesPrice: number;
  noPrice: number;
  volume: number;
  change24h: number;
}

interface Category {
  tag: string;
  label: string;
  icon: string;
  markets: HubMarket[];
}

const fmtVol = (v: number) => v >= 1e6 ? '$' + (v / 1e6).toFixed(1) + 'M' : v >= 1e3 ? '$' + (v / 1e3).toFixed(0) + 'K' : '$' + Math.round(v);

export default function HubTerminal() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [active, setActive] = useState('crypto');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/hub?limit=15');
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setCategories(data.categories || []);
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const current = categories.find(c => c.tag === active);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* Category tabs */}
      <div className="hub-tabs">
        {categories.map(c => (
          <button key={c.tag} onClick={() => setActive(c.tag)}
            className={`hub-tab${active === c.tag ? ' hub-tab-active' : ''}`}>
            {c.label}
          </button>
        ))}
        <button onClick={() => setActive('weather')}
          className={`hub-tab${active === 'weather' ? ' hub-tab-active' : ''}`}>
          ⛅ Weather
        </button>
      </div>

      {active === 'weather' ? (
        <WeatherTerminal />
      ) : (
        <>
          {error && (
            <div style={{ padding: '0.9rem 1.1rem', background: 'rgba(223,32,32,0.06)', border: '1px solid rgba(223,32,32,0.25)', borderRadius: 10, fontSize: '0.75rem' }}>
              {error}
            </div>
          )}

          {loading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {[1, 2, 3, 4, 5].map(i => <div key={i} className="skeleton" style={{ height: '56px', animationDelay: `${i * 0.08}s` }} />)}
            </div>
          )}

          {!loading && current && (
            <div className="market-table">
              <div className="table-head">
                <div className="col-name">MARKET</div>
                <div className="col-price">PRICE</div>
                <div className="col-change">24H</div>
                <div className="col-vol">VOLUME</div>
                <div className="col-actions" />
              </div>
              {current.markets.map((m, i) => {
                const chg = m.change24h;
                const url = `https://polymarket.com/event/${m.eventSlug}?marketSlug=${m.slug}&via=vura`;
                return (
                  <div key={m.id} className="market-row" style={{ animationDelay: `${i * 20}ms` }}>
                    <div className="col-name">
                      {m.image && <img src={m.image} alt="" style={{ width: 28, height: 28, borderRadius: 6, objectFit: 'cover', flexShrink: 0, marginRight: 8 }} />}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                        <span className="row-title">{m.question.substring(0, 55)}</span>
                        <div className="prob-track">
                          <div className="prob-fill" style={{ width: `${Math.round(m.yesPrice * 100)}%` }} />
                        </div>
                      </div>
                    </div>
                    <div className="col-price">
                      <span className="row-price" style={{ animationDelay: `${i * 20}ms` }}>{Math.round(m.yesPrice * 100)}c</span>
                    </div>
                    <div className="col-change">
                      <span className={`row-change ${chg > 0 ? 'change-up' : chg < 0 ? 'change-down' : ''}`}>
                        {chg > 0 ? '▲' : chg < 0 ? '▼' : ''} {chg > 0 ? '+' : ''}{(chg * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="col-vol">{fmtVol(m.volume)}</div>
                    <div className="col-actions">
                      <a className="btn-trade" href={url} target="_blank" style={{ fontSize: '0.6rem' }}>Trade ↗</a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div style={{ textAlign: 'center', padding: '0.5rem' }}>
            <button className="btn-retry" onClick={load} disabled={loading} style={{ opacity: loading ? 0.6 : 1 }}>
              {loading ? 'Loading...' : '↻ Refresh'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
