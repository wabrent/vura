'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface Bucket {
  thresholdC: number;
  yesPrice: number;
  slug: string;
  volume: number;
}

interface CityData {
  city: string;
  date: string;
  type: string;
  eventSlug: string;
  currentTemp: number | null;
  forecastMax: number[];
  forecastMin: number[];
  dailyTime: string[];
  hourly: { t: string; temp: number }[];
  buckets: Bucket[];
}

const fmtDay = (d: string) => {
  const dt = new Date(d + 'T00:00:00Z');
  return dt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
};

const fmtVol = (v: number) => v >= 1e6 ? '$' + (v / 1e6).toFixed(1) + 'M' : v >= 1e3 ? '$' + (v / 1e3).toFixed(0) + 'K' : '$' + Math.round(v);

function TempChart({ data, forecast }: { data: { t: string; temp: number }[]; forecast: number }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, w, h);
    const pad = { l: 8, r: 8, t: 8, b: 18 };
    const iw = w - pad.l - pad.r;
    const ih = h - pad.t - pad.b;

    const pts = data.length ? data : [{ t: '00:00', temp: forecast }, { t: '23:00', temp: forecast }];
    const temps = pts.map(p => p.temp);
    const min = Math.min(...temps, forecast) - 2;
    const max = Math.max(...temps, forecast) + 2;
    const range = max - min || 1;

    // grid
    ctx.strokeStyle = 'rgba(0,0,0,0.06)';
    ctx.lineWidth = 1;
    for (let g = 0; g <= 4; g++) {
      const y = pad.t + (ih * g) / 4;
      ctx.beginPath();
      ctx.moveTo(pad.l, y);
      ctx.lineTo(w - pad.r, y);
      ctx.stroke();
      const v = max - (range * g) / 4;
      ctx.fillStyle = '#7B8794';
      ctx.font = '10px JetBrains Mono';
      ctx.fillText(v.toFixed(0) + '°', 2, y + 3);
    }

    const x = (i: number) => pad.l + (iw * i) / (pts.length - 1);
    const y = (v: number) => pad.t + ih - ((v - min) / range) * ih;

    // forecast line
    ctx.strokeStyle = '#1652F0';
    ctx.lineWidth = 2;
    ctx.beginPath();
    pts.forEach((p, i) => i === 0 ? ctx.moveTo(x(i), y(p.temp)) : ctx.lineTo(x(i), y(p.temp)));
    ctx.stroke();

    // area fill
    ctx.lineTo(x(pts.length - 1), y(min));
    ctx.lineTo(x(0), y(min));
    ctx.closePath();
    ctx.fillStyle = 'rgba(22,82,240,0.08)';
    ctx.fill();

    // points
    pts.forEach((p, i) => {
      ctx.beginPath();
      ctx.arc(x(i), y(p.temp), 2.5, 0, Math.PI * 2);
      ctx.fillStyle = '#1652F0';
      ctx.fill();
    });

    // x labels
    const step = Math.max(1, Math.floor(pts.length / 5));
    ctx.fillStyle = '#7B8794';
    ctx.font = '9px JetBrains Mono';
    for (let i = 0; i < pts.length; i += step) {
      ctx.fillText(pts[i].t, x(i) - 10, h - 4);
    }
  }, [data, forecast]);

  return <canvas ref={ref} style={{ width: '100%', height: '100%', display: 'block' }} />;
}

export default function WeatherTerminal() {
  const [cities, setCities] = useState<CityData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/weather/terminal?pages=4');
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setCities(data.cities || []);
      if (!selected && data.cities?.length) setSelected(data.cities[0].city);
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  }, [selected]);

  useEffect(() => {
    setLoading(true);
    (async () => {
      try {
        const res = await fetch('/api/weather/terminal?pages=4');
        const data = await res.json();
        setCities(data.cities || []);
        if (data.cities?.length) setSelected(data.cities[0].city);
      } catch (e: any) { setError(e.message); }
      setLoading(false);
    })();
  }, []);

  const active = cities.find(c => c.city === selected) || cities[0];

  return (
    <div className="term-layout">
      {/* City list */}
      <aside className="term-side">
        <div className="term-side-head">CITIES <span>{cities.length}</span></div>
        <div className="term-side-list">
          {cities.map(c => {
            const fc = c.type === 'high' ? (c.forecastMax?.[0] ?? 0) : (c.forecastMin?.[0] ?? 0);
            const isSel = c.city === (active?.city);
            return (
              <button key={c.city + c.date} className={`term-city${isSel ? ' term-city-active' : ''}`} onClick={() => setSelected(c.city)}>
                <span className="term-city-name">{c.city}</span>
                <span className="term-city-temp">{fc ? fc.toFixed(1) + '°' : '—'}</span>
              </button>
            );
          })}
        </div>
      </aside>

      {/* Main */}
      <section className="term-main">
        {loading && <div className="skeleton" style={{ height: '60vh', borderRadius: 12 }} />}
        {error && <div className="term-error">{error}</div>}
        {!loading && !error && active && (
          <>
            <div className="term-head">
              <div>
                <h2 className="term-title">{active.city}</h2>
                <div className="term-meta">{fmtDay(active.date)} · {active.type.toUpperCase()} · {active.currentTemp != null ? `now ${active.currentTemp.toFixed(1)}°C` : ''}</div>
              </div>
              <div className="term-now">
                <span className="term-now-label">MODEL HIGH</span>
                <span className="term-now-val">{(active.type === 'high' ? active.forecastMax?.[0] : active.forecastMin?.[0])?.toFixed(1)}°C</span>
              </div>
            </div>

            <div className="term-chart">
              <TempChart data={active.hourly} forecast={active.type === 'high' ? (active.forecastMax?.[0] ?? 0) : (active.forecastMin?.[0] ?? 0)} />
            </div>

            <div className="term-buckets">
              <div className="term-buckets-head">MARKET BUCKETS · Polymarket</div>
              {active.buckets.slice(0, 12).map(b => {
                const forecast = active.type === 'high' ? active.forecastMax?.[0] : active.forecastMin?.[0];
                const isNear = forecast != null && Math.abs(b.thresholdC - forecast) <= 1;
                const url = `https://polymarket.com/event/${active.eventSlug}?marketSlug=${b.slug}&via=vura`;
                return (
                  <div key={b.thresholdC} className={`term-bucket${isNear ? ' term-bucket-near' : ''}`}>
                    <span className="term-bucket-temp">{b.thresholdC}°C</span>
                    <div className="term-bucket-bars">
                      <div className="term-bar-yes" style={{ width: `${Math.round(b.yesPrice * 100)}%` }} />
                    </div>
                    <div className="term-bucket-prices">
                      <span style={{ color: 'var(--accent-2)' }}>YES {Math.round(b.yesPrice * 100)}¢</span>
                      <span style={{ color: 'var(--red)' }}>NO {Math.round((1 - b.yesPrice) * 100)}¢</span>
                      <span style={{ color: 'var(--text-3)', fontSize: '0.55rem' }}>{fmtVol(b.volume)}</span>
                    </div>
                    <a className="btn-trade" href={url} target="_blank" style={{ fontSize: '0.6rem' }}>Trade</a>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
