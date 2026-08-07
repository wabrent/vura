'use client';

import { useState, useEffect, useCallback } from 'react';

interface Rec {
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

function tempIcon(c: number): string {
  if (c >= 35) return '☀️';
  if (c >= 28) return '🌤';
  if (c >= 20) return '🌥';
  if (c >= 10) return '🌦';
  if (c >= 0) return '🌧';
  return '❄️';
}

export default function EdgeScanner() {
  const [recs, setRecs] = useState<Rec[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tgToken, setTgToken] = useState('');
  const [tgChat, setTgChat] = useState('');
  const [tgOn, setTgOn] = useState(false);
  const [tgMsg, setTgMsg] = useState<string | null>(null);

  useEffect(() => {
    const t = localStorage.getItem('vura_tg_token');
    const c = localStorage.getItem('vura_tg_chat');
    if (t) setTgToken(t);
    if (c) setTgChat(c);
    setTgOn(!!t && !!c);
  }, []);

  const sendTg = useCallback(async (text: string) => {
    try {
      await fetch(`https://api.telegram.org/bot${tgToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: tgChat, text, parse_mode: 'Markdown' }),
      });
      setTgMsg('Sent to Telegram ✓');
      setTimeout(() => setTgMsg(null), 2500);
    } catch {
      setTgMsg('Telegram send failed');
    }
  }, [tgToken, tgChat]);

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

  // Auto-send top signal to Telegram when enabled
  useEffect(() => {
    if (!tgOn || !recs.length) return;
    const top = recs[0];
    const priceC = Math.round(top.price * 100);
    const mult = priceC > 0 ? Math.round(100 / priceC) : 0;
    sendTg(`⚡ VURA Edge\n${top.city} ${top.date}\n${top.side} ${top.thresholdC}°C @ ${priceC}¢ (×${mult})\n${top.reason}\nhttps://polymarket.com/event/${top.eventSlug}?marketSlug=${top.slug}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recs, tgOn]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <div style={{ fontSize: '1.1rem', fontWeight: 700, fontFamily: 'var(--display)' }}>
          ⛅ Weather trades <span style={{ color: 'var(--text-3)', fontWeight: 400, fontSize: '0.72rem' }}>— AI spots mispriced temps vs forecast</span>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button className="btn-retry" onClick={load} disabled={loading} style={{ opacity: loading ? 0.6 : 1, padding: '0.4rem 0.9rem', fontSize: '0.72rem' }}>
            {loading ? 'Scanning...' : '↻ Rescan'}
          </button>
          {tgMsg && <span style={{ fontSize: '0.62rem', color: 'var(--accent)' }}>{tgMsg}</span>}
          <button className="csv-btn" onClick={() => setTgOn(!tgOn)}
            style={{ color: tgOn ? 'var(--accent)' : 'var(--text-3)', borderColor: tgOn ? 'rgba(255,255,255,0.3)' : 'var(--border)' }}>
            {tgOn ? '🔔 TG on' : '🔕 TG off'}
          </button>
        </div>
      </div>

      {tgOn && (
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap', padding: '0.7rem 1rem', background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 10 }}>
          <input className="search-input" type="text" placeholder="Bot token" value={tgToken}
            onChange={e => { setTgToken(e.target.value); localStorage.setItem('vura_tg_token', e.target.value); }} style={{ width: 180, fontSize: '0.7rem' }} />
          <input className="search-input" type="text" placeholder="Chat ID" value={tgChat}
            onChange={e => { setTgChat(e.target.value); localStorage.setItem('vura_tg_chat', e.target.value); }} style={{ width: 120, fontSize: '0.7rem' }} />
          <button className="csv-btn" onClick={() => recs[0] && sendTg('⚡ VURA test')}>Test</button>
          <span style={{ fontSize: '0.58rem', color: 'var(--text-3)' }}>Get from @BotFather + @userinfobot</span>
        </div>
      )}

      {error && (
        <div style={{ padding: '0.9rem 1.1rem', background: 'rgba(223,32,32,0.06)', border: '1px solid rgba(223,32,32,0.25)', borderRadius: 10, fontSize: '0.75rem' }}>
          {error}
        </div>
      )}

      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {[1, 2, 3, 4, 5].map(i => <div key={i} className="skeleton" style={{ height: '86px', animationDelay: `${i * 0.08}s` }} />)}
        </div>
      )}

      {!loading && recs.length === 0 && !error && (
        <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-3)' }}>
          No trades right now — markets are well priced. Check back in a few hours.
        </div>
      )}

      {!loading && recs.map((r, i) => {
        const url = `https://polymarket.com/event/${r.eventSlug}?marketSlug=${r.slug}&via=vura`;
        const priceC = Math.round(r.price * 100);
        const multiplier = priceC > 0 ? 100 / priceC : 0;
        const win20 = (20 / r.price).toFixed(0);
        const noSide = r.side === 'YES';
        return (
          <div key={r.city + r.thresholdC + r.side} className="rec-card" style={{ animationDelay: `${i * 50}ms` }}>
            <div className="rec-top">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <span style={{ fontSize: '1.5rem' }}>{tempIcon(r.forecast)}</span>
                <div>
                  <div className="rec-city">{r.city} · {fmtDate(r.date)}</div>
                  <div className="rec-reason">{r.reason || ''} · forecast {Number(r.forecast).toFixed(1)}°C</div>
                </div>
              </div>
              <span className="rec-badge">{noSide ? 'BUY YES' : 'BUY NO'}</span>
            </div>

            <div className="rec-row">
              <div className="rec-price">
                {noSide ? 'YES' : 'NO'} {r.thresholdC}°C
                <span className="rec-cents">@ {priceC}¢</span>
              </div>
              <div className="rec-win">
                <span className="rec-win-mult">×{multiplier.toFixed(0)}</span>
                <span className="rec-win-detail">$20 → ${Math.round(20 * multiplier)}</span>
              </div>
            </div>

            <div className="rec-action">
              <div style={{ fontSize: '0.62rem', color: 'var(--text-3)' }}>
                {noSide
                  ? `If ${r.city} hits ${r.thresholdC}°C, each share pays $1`
                  : `If ${r.city} stays away from ${r.thresholdC}°C, each share pays $1`}
              </div>
              <a className="rec-buy" href={url} target="_blank">Buy now</a>
            </div>
          </div>
        );
      })}
    </div>
  );
}
