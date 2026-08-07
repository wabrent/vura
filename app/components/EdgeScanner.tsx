'use client';

import { useState, useEffect, useCallback } from 'react';
import TradeModal from '@/app/components/TradeModal';

interface Trade {
  category: string;
  title: string;
  yesPrice: number;
  buyYesPrice: number;
  change24h: number;
  volume: number;
  slug: string;
  eventSlug: string;
  tokenId: string | null;
  reason: string;
}

const fmtDate = () => '';
const fmtVol = (v: number) => v >= 1e6 ? '$' + (v / 1e6).toFixed(1) + 'M' : v >= 1e3 ? '$' + (v / 1e3).toFixed(0) + 'K' : '$' + Math.round(v);

const CAT_LABEL: Record<string, string> = { crypto: 'Crypto', sports: 'Sports', politics: 'Politics', economy: 'Economy' };

export default function EdgeScanner() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [buy, setBuy] = useState<Trade | null>(null);
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
      setTgMsg('Sent to Telegram');
      setTimeout(() => setTgMsg(null), 2500);
    } catch {
      setTgMsg('Telegram send failed');
    }
  }, [tgToken, tgChat]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/trades?limit=20');
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setTrades(data.trades || []);
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!tgOn || !trades.length) return;
    const top = trades[0];
    const priceC = Math.round(top.buyYesPrice * 100);
    const mult = priceC > 0 ? Math.round(100 / priceC) : 0;
    sendTg(`[VURA] ${top.category.toUpperCase()} — ${top.title.substring(0, 60)}\nYES @ ${priceC}¢ (×${mult})\n${top.reason}\nhttps://polymarket.com/event/${top.eventSlug}?marketSlug=${top.slug}`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trades, tgOn]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <div style={{ fontSize: '1.1rem', fontWeight: 700, fontFamily: 'var(--display)' }}>
          AI trades <span style={{ color: 'var(--text-3)', fontWeight: 400, fontSize: '0.72rem' }}>— across all Polymarket categories</span>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button className="btn-retry" onClick={load} disabled={loading} style={{ opacity: loading ? 0.6 : 1, padding: '0.4rem 0.9rem', fontSize: '0.72rem' }}>
            {loading ? 'Scanning...' : '↻ Rescan'}
          </button>
          {tgMsg && <span style={{ fontSize: '0.62rem', color: 'var(--accent)' }}>{tgMsg}</span>}
          <button className="csv-btn" onClick={() => setTgOn(!tgOn)}
            style={{ color: tgOn ? 'var(--accent)' : 'var(--text-3)', borderColor: tgOn ? 'rgba(255,255,255,0.3)' : 'var(--border)' }}>
            {tgOn ? 'TG on' : 'TG off'}
          </button>
        </div>
      </div>

      {tgOn && (
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap', padding: '0.7rem 1rem', background: 'rgba(17,17,17,0.45)', border: '1px solid var(--border)', borderRadius: 10 }}>
          <input className="search-input" type="text" placeholder="Bot token" value={tgToken}
            onChange={e => { setTgToken(e.target.value); localStorage.setItem('vura_tg_token', e.target.value); }} style={{ width: 180, fontSize: '0.7rem' }} />
          <input className="search-input" type="text" placeholder="Chat ID" value={tgChat}
            onChange={e => { setTgChat(e.target.value); localStorage.setItem('vura_tg_chat', e.target.value); }} style={{ width: 120, fontSize: '0.7rem' }} />
          <button className="csv-btn" onClick={() => trades[0] && sendTg('VURA test')}>Test</button>
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

      {!loading && trades.length === 0 && !error && (
        <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-3)' }}>
          No trades right now. Try refresh.
        </div>
      )}

      {!loading && trades.map((r, i) => {
        const url = `https://polymarket.com/event/${r.eventSlug}?marketSlug=${r.slug}&via=vura`;
        const priceC = Math.round(r.buyYesPrice * 100);
        const multiplier = priceC > 0 ? 100 / priceC : 0;
        return (
          <div key={r.slug + i} className="rec-card" style={{ animationDelay: `${i * 50}ms` }}>
            <div className="rec-top">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <div className="rec-rank">{i + 1}</div>
                <div>
                  <div className="rec-city">{CAT_LABEL[r.category] || r.category} · {fmtVol(r.volume)}</div>
                  <div className="rec-reason">{r.title.substring(0, 80)}</div>
                </div>
              </div>
              <span className="rec-badge">{r.change24h > 0 ? '▲' : r.change24h < 0 ? '▼' : '•'} {(r.change24h * 100).toFixed(1)}%</span>
            </div>

            <div className="rec-row">
              <div className="rec-price">
                YES {r.buyYesPrice <= 0.5 ? Math.round(r.buyYesPrice * 100) : 100 - Math.round(r.buyYesPrice * 100)}c
                <span className="rec-cents">@ {priceC}¢</span>
              </div>
              <div className="rec-win">
                <span className="rec-win-mult">×{multiplier.toFixed(0)}</span>
                <span className="rec-win-detail">$20 → ${Math.round(20 * multiplier)}</span>
              </div>
            </div>

            <div className="rec-action">
              <div style={{ fontSize: '0.62rem', color: 'var(--text-3)' }}>
                {r.reason || 'AI pick'}
              </div>
              <button className="rec-buy" style={{ border: 'none' }} onClick={() => setBuy(r)}>Buy now</button>
            </div>
          </div>
        );
      })}

      {buy && <TradeModal rec={buy} onClose={() => setBuy(null)} />}
    </div>
  );
}
