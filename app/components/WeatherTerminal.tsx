'use client';

import { useState, useEffect, useCallback } from 'react';

interface WeatherRow {
  city: string;
  date: string;
  type: 'high' | 'low';
  thresholdC: number | null;
  direction: 'above' | 'below';
  marketPrice: number;
  marketPriceSide: 'YES' | 'NO';
  forecastMaxC: number;
  forecastMinC: number;
  edge: number;
  question: string;
  conditionId: string;
  slug: string;
  eventSlug: string;
  volume: number;
}

const marketUrl = (r: WeatherRow) => `https://polymarket.com/event/${r.eventSlug}?marketSlug=${r.slug}&via=vura`;

const fmtDate = (d: string) => {
  const dt = new Date(d + 'T00:00:00Z');
  return dt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
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
  const [rows, setRows] = useState<WeatherRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [minEdge, setMinEdge] = useState(0.05);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/weather?events=100');
      if (!res.ok) throw new Error('Failed to load weather markets');
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setRows(data.rows || []);
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Group rows by city+date+type
  const groups = new Map<string, WeatherRow[]>();
  for (const r of rows) {
    const key = `${r.city}|${r.date}|${r.type}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(r);
  }

  const groupList = [...groups.entries()].map(([key, rs]) => ({
    key,
    city: rs[0].city,
    date: rs[0].date,
    type: rs[0].type,
    forecast: rs[0].type === 'high' ? rs[0].forecastMaxC : rs[0].forecastMinC,
    rows: rs,
    maxEdge: Math.max(...rs.map(r => Math.abs(r.edge))),
    volume: rs.reduce((s, r) => s + r.volume, 0),
  })).sort((a, b) => b.maxEdge - a.maxEdge);

  const bestRow = (rs: WeatherRow[]) => [...rs].sort((a, b) => Math.abs(b.edge) - Math.abs(a.edge))[0];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Header stats */}
      <div className="stats-strip">
        <div className="stats-cell">
          <span className="stats-label">CITIES TRACKED</span>
          <span className="stats-val">{groupList.length}</span>
        </div>
        <div className="stats-cell">
          <span className="stats-label">EDGE SIGNALS</span>
          <span className="stats-val accent">{(rows.length)}</span>
        </div>
        <div className="stats-cell">
          <span className="stats-label">DATA SOURCE</span>
          <span className="stats-val cyan">Open-Meteo</span>
        </div>
        <div className="stats-cell">
          <span className="stats-label">MARKETS</span>
          <span className="stats-val">100+</span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <div style={{ fontSize: '1.05rem', fontWeight: 700, fontFamily: 'var(--display)' }}>
          ⛅ Temperature Markets <span style={{ color: 'var(--text-3)', fontWeight: 400, fontSize: '0.75rem' }}>— city high/low vs market price</span>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <label style={{ fontSize: '0.62rem', color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer' }}>
            Min edge
            <select className="sort-select" value={minEdge} onChange={e => setMinEdge(Number(e.target.value))} style={{ fontSize: '0.68rem' }}>
              <option value={0.03}>3%</option>
              <option value={0.05}>5%</option>
              <option value={0.1}>10%</option>
              <option value={0.2}>20%</option>
            </select>
          </label>
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

      {loading && groupList.length === 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '0.75rem' }}>
          {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="skeleton" style={{ height: '180px', animationDelay: `${i * 0.08}s` }} />)}
        </div>
      )}

      {!loading && groupList.length === 0 && !error && (
        <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-3)' }}>
          No price dislocations found right now. Forecasts and markets are well aligned — check back later.
        </div>
      )}

      {/* City cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '0.75rem' }}>
        {groupList
          .filter(g => Math.max(...g.rows.map(r => Math.abs(r.edge))) >= minEdge)
          .slice(0, 24)
          .map((g, i) => {
            const best = bestRow(g.rows);
            const pos = best.edge > 0;
            const side = best.marketPriceSide;
            const edgePct = (best.edge * 100).toFixed(1);
            return (
              <div key={g.key} className="city-card" style={{ animationDelay: `${i * 40}ms` }}>
                <div className="city-card-head">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <span style={{ fontSize: '1.5rem' }}>{tempIcon(g.forecast)}</span>
                    <div>
                      <div className="city-card-name">{g.city}</div>
                      <div className="city-card-meta">{fmtDate(g.date)} · {g.type === 'high' ? 'HIGH' : 'LOW'} {g.forecast}°C</div>
                    </div>
                  </div>
                  <span className="city-edge" style={{ color: pos ? 'var(--accent)' : 'var(--red)', background: pos ? 'rgba(42,255,206,0.1)' : 'rgba(255,77,109,0.1)' }}>
                    {pos ? '+' : ''}{edgePct}%
                  </span>
                </div>

                <div className="city-card-body">
                  {g.rows.sort((a, b) => a.thresholdC! - b.thresholdC!).slice(0, 5).map(r => {
                    const rPos = r.edge > 0;
                    const isBest = r === best;
                    return (
                      <div key={r.conditionId} className={`city-market${isBest ? ' city-market-best' : ''}`}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flex: 1, minWidth: 0 }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>{r.thresholdC}°C</span>
                          <span style={{ fontSize: '0.55rem', color: 'var(--text-3)' }}>{r.direction === 'below' ? 'or below' : 'or above'}</span>
                          <div className="city-bar"><div className="city-bar-fill" style={{ width: `${Math.min(Math.abs(r.edge) * 500, 100)}%`, background: rPos ? 'var(--accent)' : 'var(--red)' }} /></div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontSize: '0.68rem', fontFamily: 'var(--mono)', fontWeight: 600, color: rPos ? 'var(--accent)' : 'var(--red)' }}>
                            {r.marketPriceSide} {Math.round(r.marketPrice * 100)}c
                          </span>
                          <span style={{ fontSize: '0.52rem', color: 'var(--text-3)', display: 'block' }}>
                            {Math.round((r.marketPrice + r.edge) * 100)}% model
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="city-card-foot">
                  <span style={{ fontSize: '0.55rem', color: 'var(--text-3)' }}>Vol {fmtVol(g.volume)}</span>
                  <a className="btn-trade" href={marketUrl(best)} target="_blank"
                    style={{ fontSize: '0.65rem', color: pos ? 'var(--accent)' : 'var(--red)', borderColor: pos ? 'rgba(42,255,206,0.3)' : 'rgba(255,77,109,0.3)' }}>
                    Buy {side} @ {Math.round(best.marketPrice * 100)}c
                  </a>
                </div>
              </div>
            );
          })}
      </div>

      {groupList.length > 0 && groupList.filter(g => Math.max(...g.rows.map(r => Math.abs(r.edge))) >= minEdge).length === 0 && (
        <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-3)', fontSize: '0.75rem' }}>
          No signals above {Math.round(minEdge * 100)}% edge. Try a lower threshold.
        </div>
      )}
    </div>
  );
}
