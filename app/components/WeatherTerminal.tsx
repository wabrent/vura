'use client';

import { useState, useEffect, useCallback } from 'react';

interface PriceRow {
  thresholdC: number;
  mode: 'exact' | 'above' | 'below';
  yesPrice: number;
  noPrice: number;
  slug: string;
  eventSlug: string;
  volume: number;
}

interface HourlyPoint {
  time: string;
  tempC: number;
}

interface CityGroup {
  city: string;
  date: string;
  type: 'high' | 'low';
  forecastMaxC: number;
  forecastMinC: number;
  currentTempC: number | null;
  station: string;
  hourly: HourlyPoint[];
  prices: PriceRow[];
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
  const [filter, setFilter] = useState<'all' | 'today' | 'tomorrow'>('all');
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/weather?pages=3');
      if (!res.ok) throw new Error('Failed to load weather');
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setGroups(data.groups || []);
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  }, []);

  const loadAI = useCallback(async () => {
    setAiLoading(true);
    try {
      const res = await fetch('/api/weather/ai?pages=3');
      if (res.ok) {
        const data = await res.json();
        if (data.analysis) setAiAnalysis(data.analysis);
      }
    } catch {}
    setAiLoading(false);
  }, []);

  useEffect(() => {
    load();
    loadAI();
  }, [load, loadAI]);

  const today = new Date().toISOString().slice(0, 10);
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const filtered = groups.filter(g => {
    if (filter === 'today') return g.date === today;
    if (filter === 'tomorrow') return g.date === tomorrow;
    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', gap: 1, background: 'var(--border)', padding: 2, borderRadius: 10, alignSelf: 'flex-start' }}>
          {([['all', 'All'], ['today', 'Today'], ['tomorrow', 'Tomorrow']] as const).map(([v, label]) => (
            <button key={v} onClick={() => setFilter(v)}
              style={{
                border: 'none', background: filter === v ? 'var(--bg-2)' : 'transparent', color: filter === v ? 'var(--accent)' : 'var(--text-3)',
                padding: '0.35rem 0.9rem', fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.06em',
                fontWeight: 600, cursor: 'pointer', borderRadius: 8, fontFamily: 'var(--display)'
              }}>
              {label}
            </button>
          ))}
        </div>
        <div style={{ fontSize: '1rem', fontWeight: 700, fontFamily: 'var(--display)' }}>
          ⛅ City weather vs Polymarket
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <button className="btn-retry" onClick={load} disabled={loading} style={{ opacity: loading ? 0.6 : 1 }}>
            {loading ? 'Loading...' : '↻ Refresh'}
          </button>
        </div>
      </div>

      {error && (
        <div style={{ padding: '0.9rem 1.1rem', background: 'rgba(223,32,32,0.06)', border: '1px solid rgba(223,32,32,0.25)', borderRadius: 10, fontSize: '0.75rem' }}>
          {error}
        </div>
      )}

      {aiLoading && <div className="skeleton" style={{ height: '4.5rem', animationDelay: '0.2s' }} />}

      {aiAnalysis && !aiLoading && (
        <div className="ai-panel">
          <div className="ai-panel-head">✨ DeepSeek analysis — forecast vs market</div>
          <div className="ai-panel-body">{aiAnalysis}</div>
        </div>
      )}

      {loading && groups.length === 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '0.75rem' }}>
          {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="skeleton" style={{ height: '240px', animationDelay: `${i * 0.08}s` }} />)}
        </div>
      )}

      {!loading && filtered.length === 0 && !error && (
        <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-3)' }}>
          No weather data available right now. Markets may be closed — check back later.
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))', gap: '0.75rem' }}>
        {filtered.slice(0, 24).map((g, i) => {
          const forecast = g.type === 'high' ? g.forecastMaxC : g.forecastMinC;
          return (
            <div key={`${g.city}|${g.date}|${g.type}`} className="city-card" style={{ animationDelay: `${i * 40}ms` }}>
              <div className="city-card-head">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <span style={{ fontSize: '1.5rem' }}>{tempIcon(forecast)}</span>
                  <div>
                    <div className="city-card-name">{g.city}</div>
                    <div className="city-card-meta">{fmtDate(g.date)} · {g.type === 'high' ? 'HIGH' : 'LOW'}</div>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="city-temp">{forecast.toFixed(1)}°C</div>
                  {g.currentTempC !== null && <div className="city-temp-now">now {g.currentTempC.toFixed(1)}°C</div>}
                </div>
              </div>

              <div className="city-minmax">
                <span>min {g.forecastMinC.toFixed(1)}°C</span>
                <span>max {g.forecastMaxC.toFixed(1)}°C</span>
                <span>{g.station}</span>
              </div>

              {g.hourly.length > 0 && (
                <div className="hourly-row">
                  {g.hourly.map(h => (
                    <div key={h.time} className="hourly-cell">
                      <span className="hourly-temp">{Math.round(h.tempC)}°</span>
                      <span className="hourly-time">{h.time}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="city-card-body">
                {g.prices.slice(0, 6).map(r => (
                  <div key={r.thresholdC} className="city-market">
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ fontSize: '0.78rem', fontWeight: 600, fontFamily: 'var(--mono)' }}>{r.thresholdC}°C</span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '0.68rem', fontFamily: 'var(--mono)', color: 'var(--accent-2)', fontWeight: 600 }}>
                        YES {Math.round(r.yesPrice * 100)}c
                      </span>
                      <span style={{ fontSize: '0.68rem', fontFamily: 'var(--mono)', color: 'var(--red)', marginLeft: '0.5rem' }}>
                        NO {Math.round(r.noPrice * 100)}c
                      </span>
                      <span style={{ fontSize: '0.52rem', color: 'var(--text-3)', display: 'block' }}>
                        Vol {fmtVol(r.volume)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="city-card-foot">
                <span style={{ fontSize: '0.55rem', color: 'var(--text-3)' }}>Market prices from Polymarket</span>
                <a className="btn-buy" href={`https://polymarket.com/event/${g.bestEventSlug}?marketSlug=${g.bestSlug}&via=vura`} target="_blank">
                  Trade on Polymarket
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
