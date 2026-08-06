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
  volume: number;
}

const fmtDate = (d: string) => {
  const dt = new Date(d + 'T00:00:00Z');
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const fmtVol = (v: number) => v >= 1e6 ? '$' + (v / 1e6).toFixed(1) + 'M' : v >= 1e3 ? '$' + (v / 1e3).toFixed(0) + 'K' : '$' + Math.round(v);

export default function WeatherTerminal() {
  const [rows, setRows] = useState<WeatherRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'edge' | 'vol'>('edge');
  const [onlyTradeable, setOnlyTradeable] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/weather?events=50');
      if (!res.ok) throw new Error('Failed');
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

  const filtered = rows
    .filter(r => !onlyTradeable || r.volume > 500)
    .sort((a, b) => sortBy === 'edge' ? Math.abs(b.edge) - Math.abs(a.edge) : b.volume - a.volume);

  const winRate = (r: WeatherRow) => {
    const modelProb = r.direction === 'below'
      ? (r.type === 'high' ? (r.forecastMaxC <= (r.thresholdC || 0) ? 0.95 : 0.05) : (r.forecastMinC <= (r.thresholdC || 0) ? 0.95 : 0.05))
      : (r.type === 'high' ? (r.forecastMaxC >= (r.thresholdC || 0) ? 0.95 : 0.05) : (r.forecastMinC >= (r.thresholdC || 0) ? 0.95 : 0.05));
    return modelProb;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <div style={{ fontSize: '0.68rem', letterSpacing: '0.1em', color: 'var(--accent)', textTransform: 'uppercase', fontWeight: 600 }}>
          ⛅ Weather Edge Scanner
        </div>
        <button className="btn-retry" onClick={load} disabled={loading} style={{ opacity: loading ? 0.6 : 1 }}>
          {loading ? 'Scanning...' : '↻ Rescan'}
        </button>
        <label style={{ fontSize: '0.65rem', color: 'var(--text-2)', display: 'flex', alignItems: 'center', gap: '0.3rem', cursor: 'pointer' }}>
          <input type="checkbox" checked={onlyTradeable} onChange={e => setOnlyTradeable(e.target.checked)} /> Only $500+ vol
        </label>
        <span style={{ fontSize: '0.62rem', color: 'var(--text-3)' }}>
          Compares market price vs Open-Meteo forecast
        </span>
      </div>

      {error && <div style={{ padding: '0.9rem 1.1rem', background: 'rgba(255,77,109,0.08)', border: '1px solid rgba(255,77,109,0.3)', borderRadius: 10, fontSize: '0.75rem' }}>{error}</div>}

      {loading && rows.length === 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="skeleton" style={{ height: '2.6rem', animationDelay: `${i * 0.08}s` }} />)}
        </div>
      )}

      {!loading && rows.length === 0 && !error && (
        <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-3)' }}>
          No edge signals found right now. Prices and forecasts are usually well aligned — scan again in a few hours.
        </div>
      )}

      {rows.length > 0 && (
        <div className="market-table">
          <div className="table-head">
            <div className="col-name">MARKET</div>
            <div className="col-price">MODEL</div>
            <div className="col-change">MKT PRICE</div>
            <div className="col-vol">EDGE</div>
            <div className="col-alpha">FORECAST</div>
            <div className="col-actions" />
          </div>
          {filtered.map((r, i) => {
            const side = r.marketPriceSide === 'YES' ? 'YES' : 'NO';
            const modelProb = winRate(r);
            const edgePct = (r.edge * 100).toFixed(1);
            const isPos = r.edge > 0;
            return (
              <div key={r.conditionId} className="market-row" style={{ animationDelay: `${i * 15}ms` }}
                onClick={() => window.open(`https://polymarket.com/event/${r.slug}?via=vura`, '_blank')}>
                <div className="col-name">
                  <span className="row-cat">{r.city.toUpperCase()} · {r.type === 'high' ? 'HIGH' : 'LOW'} · {fmtDate(r.date)}</span>
                  <span className="row-title">{r.thresholdC}°C {r.direction === 'below' ? 'or below' : 'or above'}</span>
                </div>
                <div className="col-price">
                  <span className="row-price" style={{ color: isPos ? 'var(--accent)' : 'var(--red)' }}>
                    {Math.round(modelProb * 100)}%
                  </span>
                </div>
                <div className="col-change">
                  <span style={{ fontSize: '0.68rem', fontFamily: 'var(--mono)' }}>
                    {r.marketPriceSide} {Math.round(r.marketPrice * 100)}c
                  </span>
                </div>
                <div className="col-vol">
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, fontFamily: 'var(--mono)', color: isPos ? 'var(--accent)' : 'var(--red)' }}>
                    {isPos ? '+' : ''}{edgePct}%
                  </span>
                </div>
                <div className="col-alpha">
                  <div style={{ flex: 1, fontSize: '0.62rem', color: 'var(--text-2)', fontFamily: 'var(--mono)' }}>
                    {r.type === 'high' ? `↑${r.forecastMaxC}°` : `↓${r.forecastMinC}°`}
                  </div>
                  <span style={{ fontSize: '0.55rem', color: 'var(--text-3)' }}>{fmtVol(r.volume)}</span>
                </div>
                <div className="col-actions">
                  <a className="btn-trade" href={`https://polymarket.com/event/${r.slug}?via=vura`} target="_blank"
                    style={{ color: isPos ? 'var(--accent)' : 'var(--red)', borderColor: isPos ? 'rgba(42,255,206,0.3)' : 'rgba(255,77,109,0.3)' }}>
                    {side} @ {Math.round(r.marketPrice * 100)}c
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div style={{ fontSize: '0.6rem', color: 'var(--text-3)', lineHeight: 1.7, maxWidth: 48 }}>
        How it works: each Polymarket weather market settles on a city's official high/low temperature for a given day.
        This scanner pulls the Open-Meteo forecast for that city/day and compares the model probability vs the market price.
        When they diverge by 5%+, the row is flagged. Edge is model_probability − market_price; a positive edge on YES means the model thinks YES is underpriced.
      </div>
    </div>
  );
}
