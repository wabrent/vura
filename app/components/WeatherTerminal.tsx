'use client';

import { useState, useEffect, useCallback } from 'react';

interface BucketRow {
  thresholdC: number;
  mode: 'exact' | 'above' | 'below';
  marketPrice: number;
  modelProb: number;
  edge: number;
  ev: number;
}

interface CityGroup {
  city: string;
  date: string;
  type: 'high' | 'low';
  forecastMaxC: number;
  forecastMinC: number;
  resolutionStation: string;
  buckets: BucketRow[];
  best: BucketRow | null;
  basketCost: number;
  basketEv: number;
  horizonHours: number;
  bestSlug: string;
  bestEventSlug: string;
}

const fmtDate = (d: string) => {
  const dt = new Date(d + 'T00:00:00Z');
  const days = Math.round((dt.getTime() - Date.now()) / 86400000);
  const label = dt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  if (days === 0) return label + ' · TODAY';
  if (days === 1) return label + ' · TOMORROW';
  return label;
};

const fmtVol = (v: number) => v >= 1e6 ? '$' + (v / 1e6).toFixed(1) + 'M' : v >= 1e3 ? '$' + (v / 1e3).toFixed(0) + 'K' : '$' + Math.round(v);

function tempIcon(c: number): string {
  if (c >= 35) return '☀️';
  if (c >= 28) return '🌤';
  if (c >= 20) return '🌥';
  if (c >= 10) return '🌦';
  if (c >= 0) return '🌧';
  return '❄️';
}

export default function WeatherTerminal() {
  const [groups, setGroups] = useState<CityGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/weather?pages=3');
      if (!res.ok) throw new Error('Failed to load weather markets');
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setGroups(data.groups || []);
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const totalBaskets = groups.length;
  const positiveEv = groups.filter(g => g.basketEv > 0.05).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div className="stats-strip">
        <div className="stats-cell">
          <span className="stats-label">CITIES</span>
          <span className="stats-val">{totalBaskets}</span>
        </div>
        <div className="stats-cell">
          <span className="stats-label">POSITIVE-EV LADDERS</span>
          <span className="stats-val accent">{positiveEv}</span>
        </div>
        <div className="stats-cell">
          <span className="stats-label">DATA</span>
          <span className="stats-val cyan">Open-Meteo</span>
        </div>
        <div className="stats-cell">
          <span className="stats-label">BUCKETS/MARKET</span>
          <span className="stats-val">3-4 ladder</span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <div style={{ fontSize: '1.05rem', fontWeight: 700, fontFamily: 'var(--display)' }}>
          ⛅ Temperature Ladders <span style={{ color: 'var(--text-3)', fontWeight: 400, fontSize: '0.75rem' }}>— buy 3-4 adjacent buckets, one winner covers the basket</span>
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <button className="btn-retry" onClick={load} disabled={loading} style={{ opacity: loading ? 0.6 : 1 }}>
            {loading ? 'Scanning...' : '↻ Rescan'}
          </button>
        </div>
      </div>

      {error && (
        <div style={{ padding: '0.9rem 1.1rem', background: 'rgba(255,77,109,0.08)', border: '1px solid rgba(255,77,109,0.3)', borderRadius: 10, fontSize: '0.75rem' }}>
          {error}
        </div>
      )}

      {loading && groups.length === 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '0.75rem' }}>
          {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="skeleton" style={{ height: '220px', animationDelay: `${i * 0.08}s` }} />)}
        </div>
      )}

      {!loading && groups.length === 0 && !error && (
        <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-3)' }}>
          No weather ladders available right now. Markets may be closed for the day — check back tomorrow.
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '0.75rem' }}>
        {groups.slice(0, 24).map((g, i) => {
          const b = g.best!;
          const pos = b.edge > 0;
          const center = [...g.buckets].reduce((bi, x, xi, arr) => Math.abs(x.thresholdC - (g.type === 'high' ? g.forecastMaxC : g.forecastMinC)) < Math.abs(arr[bi].thresholdC - (g.type === 'high' ? g.forecastMaxC : g.forecastMinC)) ? xi : bi, 0);
          const ladderSet = new Set(g.buckets.slice(Math.max(0, center - 1), Math.min(g.buckets.length, center + 2)).map(x => x.thresholdC));
          const forecast = g.type === 'high' ? g.forecastMaxC : g.forecastMinC;
          const evPct = (g.basketEv * 100).toFixed(1);
          return (
            <div key={`${g.city}|${g.date}|${g.type}`} className="city-card" style={{ animationDelay: `${i * 40}ms` }}>
              <div className="city-card-head">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <span style={{ fontSize: '1.5rem' }}>{tempIcon(forecast)}</span>
                  <div>
                    <div className="city-card-name">{g.city}</div>
                    <div className="city-card-meta">{fmtDate(g.date)} · {g.type === 'high' ? 'HIGH' : 'LOW'} {forecast.toFixed(1)}°C · D+{g.horizonHours >= 48 ? Math.round(g.horizonHours/24) : Math.round(g.horizonHours/24)}</div>
                  </div>
                </div>
                <span className="city-edge" style={{ color: g.basketEv > 0 ? 'var(--accent)' : 'var(--red)', background: g.basketEv > 0 ? 'rgba(42,255,206,0.1)' : 'rgba(255,77,109,0.1)' }}>
                  EV {pos ? '+' : ''}{evPct}%
                </span>
              </div>

              <div className="city-card-body">
                {g.buckets.slice(0, 6).map(r => {
                  const rPos = r.edge > 0;
                  const inLadder = ladderSet.has(r.thresholdC);
                  return (
                    <div key={r.thresholdC} className={`city-market${inLadder ? ' city-market-best' : ''}`}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flex: 1, minWidth: 0 }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>{r.thresholdC}°C</span>
                        {inLadder && <span className="ladder-tag">LADDER</span>}
                        <div className="city-bar"><div className="city-bar-fill" style={{ width: `${Math.min(Math.abs(r.edge) * 400, 100)}%`, background: rPos ? 'var(--accent)' : 'var(--red)' }} /></div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: '0.68rem', fontFamily: 'var(--mono)', fontWeight: 600, color: rPos ? 'var(--accent)' : 'var(--red)' }}>
                          {r.marketPrice <= 0.5 ? `YES ${Math.round(r.marketPrice * 100)}c` : `NO ${Math.round((1 - r.marketPrice) * 100)}c`}
                        </span>
                        <span style={{ fontSize: '0.52rem', color: 'var(--text-3)', display: 'block' }}>
                          {Math.round(r.modelProb * 100)}% model · EV {r.ev >= 0 ? '+' : ''}{(r.ev * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="city-card-foot">
                <div style={{ fontSize: '0.58rem', color: 'var(--text-3)' }}>
                  <span style={{ fontFamily: 'var(--mono)' }}>Basket ~{(g.basketCost * 100).toFixed(0)}c</span>
                  {g.basketEv > 0 && <span style={{ color: 'var(--accent)', display: 'block', fontSize: '0.6rem' }}>+{(g.basketEv * 100).toFixed(1)}c EV</span>}
                </div>
                <a className="btn-buy" href={`https://polymarket.com/event/${g.bestEventSlug}?marketSlug=${g.bestSlug}&via=vura`} target="_blank">
                  Ladder on Polymarket
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
