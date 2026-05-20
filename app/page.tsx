'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import type { Market, ArbitrageOp, Alert, WhaleEvent, CorrelationPair } from '@/app/lib/types';

const CONFIG = {
  API: 'https://gamma-api.polymarket.com/events?closed=false&limit=40',
  REFRESH: 30000
};

// ── Helpers ──────────────────────────────────────────────────────────────────
function formatVol(v: number) {
  if (v >= 1e6) return (v / 1e6).toFixed(1) + 'M';
  if (v >= 1e3) return (v / 1e3).toFixed(1) + 'K';
  return Math.round(v).toString();
}

function computeSmartScore(volume: number, change24h: number): number {
  const volWeight = Math.min(Math.log10(Math.max(volume, 1)) / 7, 1);
  const change = change24h * 100;
  return Math.max(-5, Math.min(5, change * volWeight * 2));
}

function generateSparkData(basePrice: number, points: number): number[] {
  const arr = [basePrice];
  for (let i = 1; i < points; i++) {
    const prev = arr[arr.length - 1];
    arr.push(Math.max(0.02, Math.min(0.98, prev + (Math.random() - 0.49) * 0.03)));
  }
  return arr;
}

function buildSparkSvg(data: number[], w: number, h: number): string {
  const min = Math.min(...data), max = Math.max(...data), range = max - min || 0.01;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * (h - 4) - 2;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  const color = data[data.length - 1] >= data[0] ? '#059669' : '#dc2626';
  return `<polyline points="${pts}" fill="none" stroke="${color}" stroke-width="1.5" stroke-linejoin="round" opacity="0.8"/>`;
}

function getCategory(title: string): string {
  const lower = title.toLowerCase();
  if (/bitcoin|ethereum|crypto|btc|eth|sol|token|blockchain|defi|nft/.test(lower)) return 'crypto';
  if (/election|president|congress|trump|biden|vote|war|government|senate/.test(lower)) return 'politics';
  if (/nba|nfl|mlb|soccer|champion|super bowl|world cup/.test(lower)) return 'sports';
  return 'general';
}

const WHALE_NAMES = ['0x3f...a12', '0x8b...c44', '0x1d...f88', '0xaa...901', '0x5c...b22', '0x9e...d55', '0x2f...710', '0x7a...e33'];

// ── Main Page ────────────────────────────────────────────────────────────────
export default function Home() {
  const { ready, authenticated, login, logout, user } = usePrivy();

  const [markets, setMarkets] = useState<Market[]>([]);
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('volume');
  const [loading, setLoading] = useState(true);
  const [dark, setDark] = useState(true);

  // Theme
  useEffect(() => {
    const saved = localStorage.getItem('vura_theme');
    if (saved === 'light') { setDark(false); document.body.classList.remove('dark'); }
    else { document.body.classList.add('dark'); }
  }, []);
  const toggleTheme = () => {
    setDark(prev => {
      const next = !prev;
      document.body.classList.toggle('dark', next);
      localStorage.setItem('vura_theme', next ? 'dark' : 'light');
      return next;
    });
  };

  // Profile
  const [watchlist, setWatchlist] = useState<Set<string>>(new Set());
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [arbitrage, setArbitrage] = useState<ArbitrageOp[]>([]);
  const [whaleEvents, setWhaleEvents] = useState<WhaleEvent[]>([]);
  const [telegramToken, setTelegramToken] = useState('');
  const [telegramChatId, setTelegramChatId] = useState('');

  // Modal
  const [selectedMarket, setSelectedMarket] = useState<Market | null>(null);
  const [alertMarket, setAlertMarket] = useState<Market | null>(null);

  const profilePrefix = user?.id ? user.id.slice(0, 10) : 'default';

  // Load saved data — reset on user change
  useEffect(() => {
    if (!user?.id) {
      setWatchlist(new Set());
      setAlerts([]);
      setTelegramToken('');
      setTelegramChatId('');
      return;
    }
    const prefix = user.id.slice(0, 10);
    const wl = localStorage.getItem(`vura_wl_${prefix}`);
    const al = localStorage.getItem(`vura_al_${prefix}`);
    const tg = localStorage.getItem(`vura_tg_${prefix}`);
    setWatchlist(new Set(wl ? JSON.parse(wl) : []));
    setAlerts(al ? JSON.parse(al) : []);
    if (tg) { const t = JSON.parse(tg); setTelegramToken(t.token || ''); setTelegramChatId(t.chatId || ''); }
  }, [user?.id]);

  // Save profile data
  const saveWatchlist = useCallback((wl: Set<string>) => {
    localStorage.setItem(`vura_wl_${profilePrefix}`, JSON.stringify([...wl]));
    setWatchlist(new Set(wl));
  }, [profilePrefix]);

  const saveAlerts = useCallback((al: Alert[]) => {
    localStorage.setItem(`vura_al_${profilePrefix}`, JSON.stringify(al));
    setAlerts([...al]);
  }, [profilePrefix]);

  // Fetch markets
  const fetchMarkets = useCallback(async () => {
    try {
      const urls = [CONFIG.API, `/api/proxy?url=${encodeURIComponent(CONFIG.API)}`];
      let data = null;
      for (const url of urls) {
        try {
          const res = await fetch(url, { headers: { Accept: 'application/json' } });
          if (res.ok) { data = await res.json(); break; }
        } catch {}
      }
      if (!data) return;
      const events = Array.isArray(data) ? data : (data.data || data.events || []);
      const ms: Market[] = events.map((event: any) => {
        const mkts = event.markets || [];
        const main = mkts.find((m: any) => m.active && !m.closed) || mkts[0] || {};
        let yesPrice = 0.5, noPrice = 0.5, bestBid: number | null = null, bestAsk: number | null = null;
        try {
          if (main.outcomePrices) {
            const p = typeof main.outcomePrices === 'string' ? JSON.parse(main.outcomePrices) : main.outcomePrices;
            yesPrice = parseFloat(p[0]) || 0;
            noPrice = parseFloat(p[1]) || 0;
          }
          if (main.bestBid !== undefined) bestBid = parseFloat(main.bestBid);
          if (main.bestAsk !== undefined) bestAsk = parseFloat(main.bestAsk);
        } catch {}
        const volume = main.volumeNum || main.volume || event.volume24hr || 0;
        const change24h = main.oneDayPriceChange || 0;
        const volScore = Math.min(volume / 500000, 3);
        const spreadScore = Math.abs(yesPrice + noPrice - 1) * 500;
        const actScore = Math.abs(change24h) * 100;
        const alpha = Math.min(5 + volScore + spreadScore + actScore, 10);
        const spread = Math.abs(yesPrice + noPrice - 1);
        return {
          id: event.id, question: event.title || 'Unknown', slug: event.slug || '',
          category: getCategory(event.title || ''), alpha: parseFloat(alpha.toFixed(1)),
          volume: parseFloat(volume) || 0, volDisplay: formatVol(volume),
          yesPrice, noPrice, bestBid, bestAsk, spread, change24h: parseFloat(change24h) || 0,
          context: event.eventMetadata?.context_description || '',
          smartScore: computeSmartScore(volume, change24h)
        };
      });
      setMarkets(ms);
      setLoading(false);
    } catch {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMarkets();
    const interval = setInterval(fetchMarkets, CONFIG.REFRESH);
    return () => clearInterval(interval);
  }, [fetchMarkets]);

  // Keyboard
  useEffect(() => {
    const tabs = ['all', 'crypto', 'politics', 'sports', 'arbitrage', 'watchlist', 'whale', 'alerts', 'correlation'];
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') {
        if (e.key === 'Escape') { setSelectedMarket(null); setAlertMarket(null); }
        return;
      }
      if (e.key === 'Escape') { setSelectedMarket(null); setAlertMarket(null); return; }
      if (e.key === '/') { e.preventDefault(); (document.getElementById('search-input') as HTMLInputElement)?.focus(); return; }
      const n = parseInt(e.key);
      if (n >= 1 && n <= 9) setActiveTab(tabs[n - 1]);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Alert checker
  useEffect(() => {
    const interval = setInterval(() => {
      setAlerts(prev => {
        let changed = false;
        const updated = prev.map(a => {
          if (a.triggered) return a;
          const m = markets.find(m => m.id === a.marketId);
          if (!m) return a;
          const price = Math.round(m.yesPrice * 100);
          if ((a.dir === 'above' && price >= a.val) || (a.dir === 'below' && price <= a.val)) {
            changed = true;
            // Send Telegram if configured
            if (telegramToken && telegramChatId) {
              fetch(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  chat_id: telegramChatId,
                  text: `🔔 VURA Alert\n${a.question}\nPrice now ${a.dir} ${price}c`,
                  parse_mode: 'Markdown'
                })
              }).catch(() => {});
            }
            return { ...a, triggered: true };
          }
          return a;
        });
        if (changed) localStorage.setItem(`vura_al_${profilePrefix}`, JSON.stringify(updated));
        return updated;
      });
    }, 10000);
    return () => clearInterval(interval);
  }, [markets, telegramToken, telegramChatId, profilePrefix]);

  // ── Derived data ────────────────────────────────────────────────────────
  const filteredMarkets = markets.filter(m => {
    if (activeTab !== 'all' && activeTab !== 'watchlist' && activeTab !== 'arbitrage' && activeTab !== 'whale' && activeTab !== 'alerts' && activeTab !== 'correlation') {
      if (m.category !== activeTab) return false;
    }
    if (searchQuery && !m.question.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  }).sort((a, b) => {
    switch (sortBy) {
      case 'alpha': return b.alpha - a.alpha;
      case 'price': return b.yesPrice - a.yesPrice;
      case 'category': return a.category.localeCompare(b.category);
      default: return b.volume - a.volume;
    }
  });

  const watchlistMarkets = markets.filter(m => watchlist.has(String(m.id)));
  const totalVol = markets.reduce((s, m) => s + m.volume, 0);

  // ── Render ───────────────────────────────────────────────────────────────
  const renderMarketCard = (m: Market, i: number) => {
    const price = Math.round(m.yesPrice * 100);
    const inWl = watchlist.has(String(m.id));
    const spreadBadge = m.spread > 0.01 ? <span className="spread-badge">SPREAD {(m.spread * 100).toFixed(2)}%</span> : null;
    const chgClass = m.change24h > 0 ? 'change-up' : m.change24h < 0 ? 'change-down' : '';
    const chgSign = m.change24h > 0 ? '+' : '';
    const chgStr = Math.abs(m.change24h * 100) > 0.01 ? (
      <span className={`card-change ${chgClass}`}>{chgSign}{(m.change24h * 100).toFixed(1)}% 24h</span>
    ) : null;
    let smartBadge = null;
    if (m.smartScore >= 1.5) smartBadge = <span className="smart-badge smart-bullish">BULL</span>;
    else if (m.smartScore <= -1.5) smartBadge = <span className="smart-badge smart-bearish">BEAR</span>;

    const sparkData = generateSparkData(m.yesPrice, 20);
    const sparkSvg = buildSparkSvg(sparkData, 80, 28);

    return (
      <div key={m.id} className="market-card" style={{ animationDelay: `${i * 30}ms` }}
        onClick={() => setSelectedMarket(m)}>
        <div className="card-left">
          <span className="card-category">{m.category.toUpperCase()}{smartBadge}</span>
          <span className="card-title">{m.question}</span>
          <span className="card-meta">Vol ${m.volDisplay} · Alpha {m.alpha}{spreadBadge ? ' · ' : ''}{spreadBadge}</span>
          {m.bestBid !== null && m.bestAsk !== null && (
            <div className="card-ob">
              <div className="ob-row"><span>B</span><div className="ob-bar-wrap"><div className="ob-bar ob-bar-bid" style={{ width: `${Math.round(m.bestBid * 100)}%` }} /></div><span>{Math.round(m.bestBid * 100)}c</span></div>
              <div className="ob-row"><span>A</span><div className="ob-bar-wrap"><div className="ob-bar ob-bar-ask" style={{ width: `${Math.round(m.bestAsk * 100)}%` }} /></div><span>{Math.round(m.bestAsk * 100)}c</span></div>
            </div>
          )}
        </div>
        <div className="card-center">
          <svg width="80" height="28" dangerouslySetInnerHTML={{ __html: sparkSvg }} />
        </div>
        <div className="card-right">
          <span className="card-price">{price}c</span>
          {chgStr}
          <div className="card-actions" onClick={e => e.stopPropagation()}>
            <button className={`star-btn ${inWl ? 'starred' : ''}`}
              onClick={() => {
                const next = new Set(watchlist);
                if (next.has(String(m.id))) next.delete(String(m.id));
                else next.add(String(m.id));
                saveWatchlist(next);
              }}>★</button>
            <a className="btn-trade" href={`https://polymarket.com/event/${m.slug}`} target="_blank">Trade</a>
          </div>
        </div>
      </div>
    );
  };

  const renderContent = () => {
    if (loading) return <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-3)' }}>Loading markets...</div>;

    if (activeTab === 'watchlist') {
      if (watchlistMarkets.length === 0) return <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-3)' }}>No markets in watchlist. Click ★ to add.</div>;
      return watchlistMarkets.map((m, i) => renderMarketCard(m, i));
    }

    if (activeTab === 'alerts') {
      if (alerts.length === 0) return <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-3)' }}>No alerts set. Click Alert on any market.</div>;
      return (
        <div className="alerts-list">
          {alerts.map(a => {
            const m = markets.find(m => m.id === a.marketId);
            const cp = m ? Math.round(m.yesPrice * 100) : '?';
            return (
              <div key={a.id} className={`alert-row${a.triggered ? ' alert-row-triggered' : ''}`}>
                <div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 500 }}>{a.question.substring(0, 50)}</div>
                  <div style={{ fontSize: '0.6rem', color: 'var(--text-3)' }}>{a.dir.toUpperCase()} {a.val}c · now: {cp}c{a.triggered ? ' TRIGGERED' : ''}</div>
                </div>
                <button className="modal-close" onClick={() => saveAlerts(alerts.filter(x => x.id !== a.id))}>✕</button>
              </div>
            );
          })}
        </div>
      );
    }

    if (activeTab === 'correlation') {
      if (markets.length < 2) return <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-3)' }}>Need more markets...</div>;
      const pairs: CorrelationPair[] = [];
      const filtered = markets.filter(m => m.volume > 1000);
      const tokenized = filtered.map(m => ({
        market: m,
        words: new Set(m.question.toLowerCase().split(/\W+/).filter(w => w.length > 3))
      }));
      for (let i = 0; i < tokenized.length; i++) {
        for (let j = i + 1; j < tokenized.length; j++) {
          const a = tokenized[i], b = tokenized[j];
          const int = [...a.words].filter(w => b.words.has(w));
          const union = new Set([...a.words, ...b.words]);
          let score = int.length / union.size;
          if (a.market.category === b.market.category) score += 0.1;
          if (Math.sign(a.market.change24h) === Math.sign(b.market.change24h) && Math.abs(a.market.change24h) > 0.01) score += 0.08;
          if (score > 0.1) pairs.push({ marketA: a.market, marketB: b.market, score: Math.min(score, 1), keywords: int.slice(0, 3) });
        }
      }
      pairs.sort((a, b) => b.score - a.score);
      const top = pairs.slice(0, 20);
      const strong = top.filter(p => p.score > 0.4).length;
      return (
        <>
          <div className="corr-stats">
            <div className="corr-stat"><span className="corr-stat-label">TOTAL PAIRS</span><span className="corr-stat-val">{top.length}</span></div>
            <div className="corr-stat"><span className="corr-stat-label">STRONG</span><span className="corr-stat-val accent">{strong}</span></div>
          </div>
          <div className="corr-grid">
            {top.map((p, i) => (
              <div key={i} className="corr-pair" onClick={() => setSelectedMarket(p.marketA)}>
                <div style={{ width: 80, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <div className="corr-score-bar"><div className="corr-score-fill" style={{ width: `${Math.round(p.score * 100)}%` }} /></div>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-2)' }}>{Math.round(p.score * 100)}%</span>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 500 }}>{p.marketA.question}</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-3)' }}>↔ {p.marketB.question}</div>
                </div>
              </div>
            ))}
          </div>
        </>
      );
    }

    if (activeTab === 'arbitrage') {
      if (arbitrage.length === 0) return <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-3)' }}>No arbitrage signals. Scanning internal spreads...</div>;
      return arbitrage.map((a, i) => (
        <div key={i} className="arb-card" style={{ animationDelay: `${i * 50}ms` }}
          onClick={() => window.open(`https://polymarket.com/event/${a.market.slug}`, '_blank')}>
          <div style={{ flex: '0 0 38%' }}>
            <span className="arb-platform">{a.platform}</span>
            <div style={{ fontFamily: 'var(--display)', fontSize: '1rem' }}>{a.market.question.substring(0, 45)}</div>
          </div>
          <div style={{ flex: 1, fontSize: '0.7rem' }}>
            <span>{Math.round(a.priceA * 100)}c → {Math.round(a.priceB * 100)}c</span>
          </div>
          <div style={{ flex: '0 0 20%', textAlign: 'right' }}>
            <span style={{ fontSize: '1.2rem', color: 'var(--accent)' }}>{a.gap}</span>
          </div>
        </div>
      ));
    }

    if (activeTab === 'whale') {
      return (
        <>
          <div style={{ display: 'flex', gap: 1, background: 'var(--border-md)', marginBottom: '1.5rem' }}>
            <div style={{ flex: 1, background: 'var(--bg-2)', padding: '1rem' }}>
              <div style={{ fontSize: '0.6rem', color: 'var(--text-3)' }}>TOP VOLUME</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 500 }}>{markets.filter(m => m.volume > 100000).length} markets</div>
            </div>
            <div style={{ flex: 1, background: 'var(--bg-2)', padding: '1rem' }}>
              <div style={{ fontSize: '0.6rem', color: 'var(--text-3)' }}>SIGNALS</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 500, color: 'var(--accent)' }}>Live</div>
            </div>
          </div>
          {markets.sort((a, b) => b.volume - a.volume).slice(0, 15).map((m, i) => (
            <div key={m.id} className="market-card" style={{ animationDelay: `${i * 30}ms` }}
              onClick={() => window.open(`https://polymarket.com/event/${m.slug}`, '_blank')}>
              <div className="card-left">
                <span className="card-category">{m.category.toUpperCase()}</span>
                <span className="card-title">{m.question}</span>
              </div>
              <div className="card-right">
                <span style={{ fontSize: '1.2rem', color: 'var(--accent)' }}>${m.volDisplay}</span>
                <span className={`card-change ${m.change24h > 0 ? 'change-up' : 'change-down'}`}>
                  {m.change24h > 0 ? '+' : ''}{(m.change24h * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          ))}
        </>
      );
    }

    if (filteredMarkets.length === 0) return <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-3)' }}>No markets found.</div>;
    return filteredMarkets.map((m, i) => renderMarketCard(m, i));
  };

  const exportCSV = () => {
    let ms = filteredMarkets;
    if (activeTab === 'watchlist') ms = watchlistMarkets;
    const headers = ['id', 'question', 'category', 'yesPrice(c)', 'noPrice(c)', 'volume', 'alpha', 'spread%', 'change24h%', 'smartScore'];
    const rows = ms.map(m => [
      m.id, `"${m.question.replace(/"/g, '""')}"`, m.category,
      Math.round(m.yesPrice * 100), Math.round(m.noPrice * 100), m.volume, m.alpha,
      (m.spread * 100).toFixed(2), (m.change24h * 100).toFixed(2), m.smartScore.toFixed(2)
    ].join(','));
    const csv = headers.join(',') + '\n' + rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `vura_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  const shareMarket = () => {
    if (!selectedMarket) return;
    const m = selectedMarket;
    const price = Math.round(m.yesPrice * 100);
    const change = (m.change24h * 100).toFixed(1);
    const smart = m.smartScore >= 1.5 ? 'BULLISH' : m.smartScore <= -1.5 ? 'BEARISH' : '';
    const text = [
      `📊 ${m.question}`,
      `💰 YES: ${price}c | Vol: $${m.volDisplay}`,
      `📈 24h: ${change}% | Alpha: ${m.alpha}`,
      smart ? `🔮 Signal: ${smart}` : '',
      `🔗 https://polymarket.com/event/${m.slug}`,
      '', 'via VURA Terminal'
    ].filter(Boolean).join('\n');
    navigator.clipboard.writeText(text).then(() => {
      const t = document.getElementById('vura-toast');
      if (t) { t.textContent = 'Copied!'; t.className = 'toast toast-show'; setTimeout(() => t.className = 'toast', 3500); }
    });
  };

  const pnlCalc = () => {
    if (!selectedMarket) return { shares: '—', payout: '—', pnl: '—', roi: '—' };
    const stake = 100;
    const side = 'yes';
    const exitCents = 90;
    const entry = selectedMarket.yesPrice;
    const exit = exitCents / 100;
    const shares = stake / entry;
    const payout = shares * exit;
    const pnl = payout - stake;
    const roi = (pnl / stake * 100).toFixed(1);
    return { shares: shares.toFixed(2), payout: '$' + payout.toFixed(2), pnl: (pnl >= 0 ? '+' : '') + '$' + pnl.toFixed(2), roi: (Number(roi) >= 0 ? '+' : '') + roi + '%' };
  };

  // ── UI ──────────────────────────────────────────────────────────────────
  const tabs = ['all', 'crypto', 'politics', 'sports', 'arbitrage', 'watchlist', 'whale', 'alerts', 'correlation'];
  const wlCount = watchlist.size;
  const alCount = alerts.filter(a => !a.triggered).length;

  return (
    <>
      <nav>
        <div className="nav-inner">
          <a href="/" className="nav-logo" onClick={e => { e.preventDefault(); setActiveTab('all'); }}>
            <span className="logo-mark">V</span>
            <span>VURA</span>
          </a>
          <div className="nav-links">
            <a href="#" onClick={e => { e.preventDefault(); setActiveTab('all'); }} className={activeTab === 'all' ? 'nav-link-active' : ''}>Terminal</a>
            <a href="#" onClick={e => { e.preventDefault(); setActiveTab('arbitrage'); }} className={activeTab === 'arbitrage' ? 'nav-link-active' : ''}>Arbitrage</a>
            <a href="#" onClick={e => { e.preventDefault(); setActiveTab('correlation'); }} className={activeTab === 'correlation' ? 'nav-link-active' : ''}>Correlations</a>
          </div>
          <div className="nav-status">
            <button className="theme-toggle" onClick={toggleTheme} title="Toggle theme">◐</button>
            {!ready ? (
              <button className="privy-btn" disabled style={{ opacity: 0.5 }}>Loading...</button>
            ) : authenticated ? (
              <>
                <span style={{ fontSize: '0.6rem', color: 'var(--accent)' }}>
                  {user?.email?.address || user?.google?.email || (user?.id ? user.id.slice(0, 6) + '...' : 'User')}
                </span>
                <span className="live-dot" />
                <span>Live</span>
                <button className="privy-btn logout" onClick={logout}>Exit</button>
              </>
            ) : (
              <button className="privy-btn" onClick={login}>Connect</button>
            )}
          </div>
        </div>
      </nav>

      <section className="hero">
        <div className="hero-left">
          <h2>REAL-TIME</h2>
          <h2>PREDICTION</h2>
          <div className="hero-badge">ANALYTICS</div>
        </div>
        <div className="hero-right">
          <p>Track Polymarket order books, volume flows, and cross-platform price discrepancies. Built for traders who need speed.</p>
          <div className="hero-divider" />
          <div className="hero-contact">
            <span>Powered by Polymarket CLOB</span>
            <a href="https://docs.polymarket.com" target="_blank">API Docs ↗</a>
          </div>
        </div>
      </section>

      <div className="tabs-bar">
        <div className="tabs-inner">
          {tabs.map(tab => (
            <button key={tab} className={`tab-btn ${activeTab === tab ? 'tab-active' : ''}`}
              onClick={() => setActiveTab(tab)}>
              {tab === 'watchlist' ? 'Watchlist' : tab === 'whale' ? 'Signals' : tab.charAt(0).toUpperCase() + tab.slice(1)}
              {tab === 'watchlist' && wlCount > 0 && <span className="tab-badge">{wlCount}</span>}
              {tab === 'alerts' && alCount > 0 && <span className="tab-badge">{alCount}</span>}
            </button>
          ))}
        </div>
        <div className="tabs-meta">
          <button className="csv-btn" onClick={exportCSV}>CSV ↓</button>
          <input id="search-input" className="search-input" type="text" placeholder="/ search markets..."
            value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
          <select className="sort-select" value={sortBy} onChange={e => setSortBy(e.target.value)}>
            <option value="volume">Volume</option>
            <option value="alpha">Alpha</option>
            <option value="price">Price</option>
            <option value="category">Category</option>
          </select>
          <span>{markets.length} markets</span>
          <span style={{ color: 'var(--accent)' }}>${formatVol(totalVol)}</span>
        </div>
      </div>

      <div className="kbd-bar">
        <span><kbd>1-9</kbd> switch tabs</span>
        <span><kbd>/</kbd> search</span>
        <span><kbd>Esc</kbd> close</span>
      </div>

      <main>{renderContent()}</main>

      {/* ── P&L MODAL ── */}
      {selectedMarket && (
        <div className="modal-overlay" onClick={e => { if ((e.target as HTMLElement).className === 'modal-overlay') setSelectedMarket(null); }}>
          <div className="modal">
            <div className="modal-header">
              <span className="modal-title">{selectedMarket.question}</span>
              <button className="modal-close" onClick={() => setSelectedMarket(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="modal-prices">
                <div className="modal-price-block"><span className="modal-price-label">YES</span><span className="modal-price-val accent">{Math.round(selectedMarket.yesPrice * 100)}c</span></div>
                <div className="modal-price-block"><span className="modal-price-label">NO</span><span className="modal-price-val red">{Math.round(selectedMarket.noPrice * 100)}c</span></div>
                <div className="modal-price-block"><span className="modal-price-label">VOLUME</span><span className="modal-price-val">${selectedMarket.volDisplay}</span></div>
                <div className="modal-price-block"><span className="modal-price-label">ALPHA</span><span className="modal-price-val">{selectedMarket.alpha}</span></div>
              </div>
              <div className="pnl-result">
                {(() => { const pnl = pnlCalc(); return (
                  <>
                    <div className="pnl-result-row"><span className="pnl-result-label">SHARES</span><span className="pnl-result-val">{pnl.shares}</span></div>
                    <div className="pnl-result-row"><span className="pnl-result-label">PAYOUT</span><span className="pnl-result-val">{pnl.payout}</span></div>
                    <div className="pnl-result-row"><span className="pnl-result-label">P&L</span><span className="pnl-result-val accent">{pnl.pnl}</span></div>
                    <div className="pnl-result-row"><span className="pnl-result-label">ROI</span><span className="pnl-result-val">{pnl.roi}</span></div>
                  </>
                ); })()}
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button className="btn-trade"
                  onClick={() => {
                    const next = new Set(watchlist);
                    if (next.has(String(selectedMarket.id))) next.delete(String(selectedMarket.id));
                    else next.add(String(selectedMarket.id));
                    saveWatchlist(next);
                  }}>
                  {watchlist.has(String(selectedMarket.id)) ? '★ Remove' : '★ Watchlist'}
                </button>
                <button className="btn-trade" style={{ background: 'var(--accent)', borderColor: 'var(--accent)' }}
                  onClick={() => setAlertMarket(selectedMarket)}>Alert</button>
                <button className="btn-trade" style={{ background: '#3b82f6', borderColor: '#3b82f6' }}
                  onClick={shareMarket}>Share</button>
                <a className="btn-trade" href={`https://polymarket.com/event/${selectedMarket.slug}`} target="_blank">Trade ↗</a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── ALERT MODAL ── */}
      {alertMarket && (
        <div className="modal-overlay" onClick={e => { if ((e.target as HTMLElement).className === 'modal-overlay') setAlertMarket(null); }}>
          <div className="modal modal-sm">
            <div className="modal-header">
              <span className="modal-title">SET PRICE ALERT</span>
              <button className="modal-close" onClick={() => setAlertMarket(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="pnl-field">
                <span className="pnl-label">MARKET</span>
                <div style={{ fontSize: '0.8rem' }}>{alertMarket.question.substring(0, 60)}</div>
              </div>
              <div className="pnl-row">
                <div className="pnl-field">
                  <span className="pnl-label">CONDITION</span>
                  <select id="alert-dir" className="pnl-input" defaultValue="above">
                    <option value="above">Above</option>
                    <option value="below">Below</option>
                  </select>
                </div>
                <div className="pnl-field">
                  <span className="pnl-label">PRICE (c)</span>
                  <input id="alert-price" type="number" className="pnl-input" defaultValue={Math.round(alertMarket.yesPrice * 100)} min={1} max={99} />
                </div>
              </div>
              <button className="btn-retry" onClick={() => {
                const dir = (document.getElementById('alert-dir') as HTMLSelectElement).value as 'above' | 'below';
                const val = parseInt((document.getElementById('alert-price') as HTMLInputElement).value);
                if (!val || val < 1 || val > 99) return;
                saveAlerts([...alerts, { id: Date.now(), marketId: alertMarket.id, question: alertMarket.question, dir, val, triggered: false }]);
                setAlertMarket(null);
              }}>Set Alert</button>
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem', marginTop: '0.5rem' }}>
                <div style={{ fontSize: '0.6rem', color: 'var(--text-3)', marginBottom: '0.5rem' }}>TELEGRAM NOTIFICATIONS</div>
                <div className="pnl-row" style={{ marginBottom: '0.5rem' }}>
                  <div className="pnl-field">
                    <span className="pnl-label">BOT TOKEN</span>
                    <input type="password" className="pnl-input" value={telegramToken} onChange={e => setTelegramToken(e.target.value)} placeholder="123:abc..." />
                  </div>
                  <div className="pnl-field">
                    <span className="pnl-label">CHAT ID</span>
                    <input type="text" className="pnl-input" value={telegramChatId} onChange={e => setTelegramChatId(e.target.value)} placeholder="-100..." />
                  </div>
                </div>
                <button className="btn-retry" style={{ width: '100%', background: 'var(--accent)' }}
                  onClick={() => {
                    localStorage.setItem(`vura_tg_${profilePrefix}`, JSON.stringify({ token: telegramToken, chatId: telegramChatId }));
                    const t = document.getElementById('vura-toast');
                    if (t) { t.textContent = 'Telegram saved'; t.className = 'toast toast-show'; setTimeout(() => t.className = 'toast', 3500); }
                  }}>Save Telegram</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <footer>
        <div className="footer-line" />
        <div className="footer-inner">
          <span>© 2026 VURA</span>
          <div className="footer-links">
            <a href="https://x.com/0x_Vura" target="_blank">Twitter</a>
            <a href="https://polymarket.com" target="_blank">Polymarket</a>
          </div>
        </div>
      </footer>

      <div id="vura-toast" className="toast" />
    </>
  );
}
