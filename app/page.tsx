'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { usePrivy } from '@privy-io/react-auth';
import type { Market, Alert, CorrelationPair } from '@/app/lib/types';
import TradeModal from '@/app/components/TradeModal';

const CONFIG = {
  API: 'https://gamma-api.polymarket.com/events?closed=false&limit=500',
  REFRESH: 60000
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

function buildSparkSvg(history: { t: number; p: number }[] | null, currentPrice: number, w: number, h: number): string {
  if (!history || history.length < 2) return '';
  const prices = history.map(d => d.p);
  const min = Math.min(...prices), max = Math.max(...prices), range = max - min || 0.01;
  const pts = prices.map((v, i) => {
    const x = (i / (prices.length - 1)) * w;
    const y = h - ((v - min) / range) * (h - 4) - 2;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');
  const color = prices[prices.length - 1] >= prices[0] ? '#059669' : '#dc2626';
  return `<polyline points="${pts}" fill="none" stroke="${color}" stroke-width="1.5" stroke-linejoin="round" opacity="0.8" class="spark-animate"/>`;
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
  const [priceHistory, setPriceHistory] = useState<Map<string, { t: number; p: number }[]>>(new Map());
  const priceHistoryRef = useRef(priceHistory);
  priceHistoryRef.current = priceHistory;

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

  // Profile — multiple watchlists
  const [watchlists, setWatchlists] = useState<Map<string, string[]>>(new Map([['Default', []]]));
  const [activeWl, setActiveWl] = useState('Default');
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [telegramToken, setTelegramToken] = useState('');
  const [telegramChatId, setTelegramChatId] = useState('');
  const [tweetCount, setTweetCount] = useState<{ total: number; pm: number } | null>(null);
  const [aiData, setAiData] = useState<any>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [showScreener, setShowScreener] = useState(false);
  const [screenerPriceMin, setScreenerPriceMin] = useState(0);
  const [screenerPriceMax, setScreenerPriceMax] = useState(100);
  const [screenerVolMin, setScreenerVolMin] = useState(0);
  const [screenerChangeMin, setScreenerChangeMin] = useState(0);

  // Active watchlist as Set for easy lookup
  const watchlist = new Set(watchlists.get(activeWl) || []);

  // Modal
  const [selectedMarket, setSelectedMarket] = useState<Market | null>(null);
  const [alertMarket, setAlertMarket] = useState<Market | null>(null);

  const profileKey = user?.email?.address || user?.google?.email || user?.id?.slice(0, 10) || 'default';

  // Load saved data
  useEffect(() => {
    if (!user?.email?.address && !user?.google?.email && !user?.id) {
      setWatchlists(new Map([['Default', []]]));
      setActiveWl('Default');
      setAlerts([]);
      setTelegramToken('');
      setTelegramChatId('');
      return;
    }
    const pk = user?.email?.address || user?.google?.email || user?.id?.slice(0, 10) || 'default';
    const wl = localStorage.getItem(`vura_wl_${pk}`);
    const al = localStorage.getItem(`vura_al_${pk}`);
    const tg = localStorage.getItem(`vura_tg_${pk}`);
    if (wl) {
      const parsed = JSON.parse(wl);
      // Backward compat: if old format (array), wrap in Default
      const map = Array.isArray(parsed) 
        ? new Map<string, string[]>([['Default', parsed]])
        : new Map<string, string[]>(Object.entries(parsed) as [string, string[]][]);
      if (!map.has('Default')) map.set('Default', []);
      setWatchlists(map);
    } else {
      setWatchlists(new Map([['Default', []]]));
    }
    setAlerts(al ? JSON.parse(al) : []);
    if (tg) { const t = JSON.parse(tg); setTelegramToken(t.token || ''); setTelegramChatId(t.chatId || ''); }
  }, [user?.email?.address, user?.google?.email, user?.id]);

  // Save profile data
  const saveWatchlists = useCallback((wls: Map<string, string[]>) => {
    const pk = user?.email?.address || user?.google?.email || user?.id?.slice(0, 10) || 'default';
    localStorage.setItem(`vura_wl_${pk}`, JSON.stringify(Object.fromEntries(wls)));
    setWatchlists(new Map(wls));
  }, [user?.email?.address, user?.google?.email, user?.id]);

  const toggleWatchlist = (marketId: string) => {
    const next = new Map(watchlists);
    const list = [...(next.get(activeWl) || [])];
    const idx = list.indexOf(marketId);
    if (idx >= 0) list.splice(idx, 1);
    else list.push(marketId);
    next.set(activeWl, list);
    saveWatchlists(next);
  };

  const createWatchlist = (name: string) => {
    if (!name || watchlists.has(name)) return;
    const next = new Map(watchlists);
    next.set(name, []);
    saveWatchlists(next);
    setActiveWl(name);
  };

  const saveAlerts = useCallback((al: Alert[]) => {
    const pk = user?.email?.address || user?.google?.email || user?.id?.slice(0, 10) || 'default';
    localStorage.setItem(`vura_al_${pk}`, JSON.stringify(al));
    setAlerts([...al]);
  }, [user?.email?.address, user?.google?.email, user?.id]);

  const deleteWatchlist = (name: string) => {
    if (name === 'Default') return;
    const next = new Map(watchlists);
    next.delete(name);
    saveWatchlists(next);
    setActiveWl('Default');
  };

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
      const ms: Market[] = events.flatMap((event: any) => {
        const mkts = (event.markets || []).filter((m: any) => m.active && !m.closed);
        return mkts.map((main: any, idx: number) => {
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
        let yesTokenId: string | null = null;
        let noTokenId: string | null = null;
        try {
          const ids = main.clobTokenIds ? (typeof main.clobTokenIds === 'string' ? JSON.parse(main.clobTokenIds) : main.clobTokenIds) : null;
          if (ids) { yesTokenId = ids[0] || null; noTokenId = ids[1] || null; }
        } catch {}
        return {
          id: main.conditionId || main.id || (event.id + '_' + idx), question: main.question || event.title || 'Unknown', slug: event.slug || '',
          category: getCategory(event.title || ''), alpha: parseFloat(alpha.toFixed(1)),
          volume: parseFloat(volume) || 0, volDisplay: formatVol(volume),
          yesPrice, noPrice, bestBid, bestAsk, spread, change24h: parseFloat(change24h) || 0,
          context: event.eventMetadata?.context_description || '',
          smartScore: computeSmartScore(volume, change24h),
          yesTokenId, noTokenId,
          image: event.image || null
        };
        });
      });
      // Filter out dead/resolved markets
      const active = ms.filter((m: Market) => {
        if (m.yesPrice <= 0.02 && Math.abs(m.change24h) < 0.001) return false;
        if (m.yesPrice >= 0.98 && Math.abs(m.change24h) < 0.001) return false;
        return true;
      });
      setMarkets(active);
      // Fetch price history for top markets (real data)
      const top = [...active].sort((a: Market, b: Market) => b.volume - a.volume).slice(0, 15);
      const histMap = new Map(priceHistoryRef.current);
      const endTs = Math.floor(Date.now() / 1000);
      const startTs = endTs - 86400;
      let updated = false;
      for (const m of top) {
        if (!m.yesTokenId || histMap.has(m.yesTokenId)) continue;
        try {
          const url = `https://clob.polymarket.com/prices-history?market=${m.yesTokenId}&interval=1h&startTs=${startTs}&endTs=${endTs}`;
          const hRes = await fetch(`/api/proxy?url=${encodeURIComponent(url)}`);
          if (hRes.ok) {
            const hData = await hRes.json();
            if (hData.history) { histMap.set(m.yesTokenId, hData.history); updated = true; }
          }
        } catch {}
      }
      if (updated) setPriceHistory(new Map(histMap));
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

  // Tweet counter for Twitter users
  useEffect(() => {
    const twitterAccount = (user as any)?.twitter;
    if (!twitterAccount?.accessToken) return;
    fetch('/api/twitter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accessToken: twitterAccount.accessToken })
    }).then(r => r.json()).then(d => {
      if (d.polymarketTweets !== undefined) setTweetCount(d);
    }).catch(() => {});
  }, [(user as any)?.twitter?.accessToken]);

  // URL-based tab routing
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const tab = p.get('tab');
    if (tab && tab !== activeTab) setActiveTab(tab);
  }, []);

  const switchTab = (tab: string) => {
    setActiveTab(tab);
  };

  // Sync URL with active tab
  useEffect(() => {
    const url = new URL(window.location.href);
    if (activeTab !== 'all') url.searchParams.set('tab', activeTab);
    else url.searchParams.delete('tab');
    window.history.replaceState({}, '', url.toString());
  }, [activeTab]);
  useEffect(() => {
  const tabs = ['all', 'crypto', 'politics', 'sports', 'arbitrage', 'watchlist', 'whale', 'alerts', 'correlation', 'stats', 'ai'];
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
        if (changed) localStorage.setItem(`vura_al_${profileKey}`, JSON.stringify(updated));
        return updated;
      });
    }, 10000);
    return () => clearInterval(interval);
  }, [markets, telegramToken, telegramChatId, profileKey]);

  // ── Derived data ────────────────────────────────────────────────────────
  const filteredMarkets = markets.filter(m => {
    if (activeTab !== 'all' && activeTab !== 'watchlist' && activeTab !== 'arbitrage' && activeTab !== 'whale' && activeTab !== 'alerts' && activeTab !== 'correlation') {
      if (m.category !== activeTab) return false;
    }
    if (searchQuery && !m.question.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    // Screener filters
    if (showScreener) {
      const priceC = Math.round(m.yesPrice * 100);
      if (priceC < screenerPriceMin || priceC > screenerPriceMax) return false;
      if (screenerVolMin > 0 && m.volume < screenerVolMin) return false;
      if (screenerChangeMin > 0 && Math.abs(m.change24h * 100) < screenerChangeMin) return false;
    }
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

    const history = m.yesTokenId ? priceHistory.get(m.yesTokenId) || null : null;
    const sparkSvg = buildSparkSvg(history, m.yesPrice, 80, 28);

    return (
      <div key={m.id} className="market-card" style={{ animationDelay: `${i * 30}ms` }}
        onClick={() => setSelectedMarket(m)}>
        {m.image && <img src={m.image} alt="" style={{ width: 56, height: 56, borderRadius: 4, objectFit: 'cover', flexShrink: 0 }} />}
        <div className="card-left">
          <span className="card-category">{m.category.toUpperCase()}{smartBadge}</span>
          <span className="card-title">{m.question}</span>
          <span className="card-meta">Vol ${m.volDisplay} · Alpha {m.alpha}{spreadBadge ? ' · ' : ''}{spreadBadge}</span>
        </div>
        <div className="card-center">
          {sparkSvg && <svg width="80" height="28" dangerouslySetInnerHTML={{ __html: sparkSvg }} />}
        </div>
        <div className="card-right">
          <span className="card-price">{price}c</span>
          {chgStr}
          <div className="card-actions" onClick={e => e.stopPropagation()}>
            <button className={`star-btn ${inWl ? 'starred' : ''}`}
              onClick={() => toggleWatchlist(String(m.id))}>★</button>
            <a className="btn-trade" href={`https://polymarket.com/event/${m.slug}`} target="_blank">Trade</a>
          </div>
        </div>
      </div>
    );
  };

  const renderContent = () => {
    if (loading) return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {[1,2,3,4,5].map(i => (
          <div key={i} className="skeleton" style={{ height: '4rem', animationDelay: `${i * 0.1}s` }} />
        ))}
      </div>
    );

    if (activeTab === 'watchlist') {
      const wlNames = [...watchlists.keys()];
      return (
        <div>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap' }}>
            <select className="sort-select" value={activeWl} onChange={e => setActiveWl(e.target.value)} style={{ fontSize: '0.7rem' }}>
              {wlNames.map(n => <option key={n} value={n}>{n} ({watchlists.get(n)?.length || 0})</option>)}
            </select>
            <button className="csv-btn" onClick={() => { const name = prompt('Watchlist name:'); if (name) createWatchlist(name); }} style={{ fontSize: '0.6rem' }}>+ New</button>
            {activeWl !== 'Default' && <button className="csv-btn" onClick={() => { if (confirm('Delete ' + activeWl + '?')) deleteWatchlist(activeWl); }} style={{ fontSize: '0.6rem', color: 'var(--red)' }}>Delete</button>}
            <button className="csv-btn" onClick={() => {
              const ids = watchlists.get(activeWl) || [];
              const url = window.location.origin + '/?tab=watchlist&share=' + ids.join(',');
              navigator.clipboard.writeText(url).then(() => showToastMsg('Link copied!'));
            }} style={{ fontSize: '0.6rem' }}>Copy Link</button>
          </div>
          {watchlistMarkets.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-3)' }}>No markets in this watchlist. Click ★ to add.</div>
          ) : watchlistMarkets.map((m, i) => renderMarketCard(m, i))}
        </div>
      );
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

    if (activeTab === 'stats') {
      const topByVol = [...markets].sort((a, b) => b.volume - a.volume).slice(0, 5);
      const topMovers = [...markets].sort((a, b) => Math.abs(b.change24h) - Math.abs(a.change24h)).slice(0, 5);
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="corr-stats">
            <div className="corr-stat"><span className="corr-stat-label">TOTAL MARKETS</span><span className="corr-stat-val">{markets.length}</span></div>
            <div className="corr-stat"><span className="corr-stat-label">24H VOLUME</span><span className="corr-stat-val accent">${formatVol(totalVol)}</span></div>
            <div className="corr-stat"><span className="corr-stat-label">BUILDER CODE</span><span className="corr-stat-val" style={{ color: '#6C47FF' }}>VURA</span></div>
          </div>
          <div style={{ fontSize: '0.65rem', letterSpacing: '0.1em', color: 'var(--text-3)', textTransform: 'uppercase' }}>Top by Volume</div>
          {topByVol.map((m, i) => (
            <div key={m.id} className="market-card" onClick={() => setSelectedMarket(m)} style={{ animationDelay: `${i * 30}ms` }}>
              {m.image && <img src={m.image} alt="" style={{ width: 40, height: 40, borderRadius: 3, objectFit: 'cover', flexShrink: 0 }} />}
              <div className="card-left">
                <span className="card-title">{m.question}</span>
                <span className="card-meta">{m.category.toUpperCase()} · ${m.volDisplay}</span>
              </div>
              <div className="card-right">
                <span className="card-price">{Math.round(m.yesPrice * 100)}c</span>
              </div>
            </div>
          ))}
          <div style={{ fontSize: '0.65rem', letterSpacing: '0.1em', color: 'var(--text-3)', textTransform: 'uppercase', marginTop: '1rem' }}>Top Movers 24h</div>
          {topMovers.map((m, i) => (
            <div key={m.id + '_m'} className="market-card" onClick={() => setSelectedMarket(m)} style={{ animationDelay: `${i * 30}ms` }}>
              <div className="card-left">
                <span className="card-title">{m.question}</span>
                <span className={`card-change ${m.change24h > 0 ? 'change-up' : 'change-down'}`}>
                  {m.change24h > 0 ? '+' : ''}{(m.change24h * 100).toFixed(1)}%
                </span>
              </div>
              <div className="card-right">
                <span className="card-price">{Math.round(m.yesPrice * 100)}c</span>
              </div>
            </div>
          ))}
          <div style={{ marginTop: '1rem' }}>
            <div style={{ fontSize: '0.65rem', letterSpacing: '0.1em', color: 'var(--text-3)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>Maker Rebates</div>
            <div className="corr-stats">
              <div className="corr-stat">
                <span className="corr-stat-label">MAKER REBATE</span>
                <span className="corr-stat-val accent">0.1%</span>
              </div>
              <div className="corr-stat">
                <span className="corr-stat-label">DAILY MAKERS</span>
                <span className="corr-stat-val">~7.5k</span>
              </div>
              <div className="corr-stat">
                <span className="corr-stat-label">EST. VOLUME</span>
                <span className="corr-stat-val">$50M+</span>
              </div>
            </div>
            <div style={{ fontSize: '0.6rem', color: 'var(--text-3)', marginTop: '0.5rem' }}>
              Earn 0.1% on every filled limit order. Active makers earn $50-500/day.
            </div>
            <a href="https://dune.com/polymarket/polymarket-defi-maker-rebates" target="_blank" style={{ fontSize: '0.65rem', color: 'var(--accent)', display: 'block', marginTop: '0.75rem' }}>
              View full Maker Rebates on Dune ↗
            </a>
          </div>
        </div>
      );
    }

    if (activeTab === 'ai') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <div style={{ fontSize: '0.7rem', letterSpacing: '0.1em', color: 'var(--accent)', textTransform: 'uppercase' }}>AI Market Analysis</div>
            {!aiData && !aiLoading && (
              <button className="csv-btn" onClick={async () => {
                setAiLoading(true);
                try {
                  const mks = markets.map(m => ({ q: m.question, c: Math.round(m.yesPrice*100), v: m.volume, ch: (m.change24h*100).toFixed(1), al: m.alpha }));
                  const res = await fetch('/api/ai', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ markets: mks }) });
                  const data = await res.json();
                  setAiData(data);
                } catch {}
                setAiLoading(false);
              }}>{aiLoading ? 'Analyzing...' : 'Run Analysis'}</button>
            )}
            {aiData && <button className="csv-btn" onClick={() => { setAiData(null); }} style={{ color: 'var(--text-3)' }}>Reset</button>}
          </div>
          {aiLoading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {[1,2,3].map(i => <div key={i} className="skeleton" style={{ height: '3rem', animationDelay: `${i*0.1}s` }} />)}
            </div>
          )}
          {aiData && (
            <>
              {aiData.summary && (
                <div style={{ padding: '1rem', background: 'var(--bg-2)', border: '1px solid var(--border)', fontSize: '0.8rem', lineHeight: 1.6 }}>{aiData.summary}</div>
              )}
              {aiData.signals?.length > 0 && (
                <div>
                  <div style={{ fontSize: '0.6rem', letterSpacing: '0.1em', color: 'var(--text-3)', marginBottom: '0.5rem' }}>SIGNALS</div>
                  {aiData.signals.map((s: any, i: number) => (
                    <div key={i} className="market-card" style={{ animationDelay: `${i*30}ms`, borderLeft: `3px solid ${s.direction === 'bullish' ? 'var(--accent)' : s.direction === 'bearish' ? 'var(--red)' : 'var(--text-3)'}` }}>
                      <div className="card-left">
                        <span className="card-title">{s.market}</span>
                        <span className="card-meta">{s.reason}</span>
                      </div>
                      <div className="card-right">
                        <span style={{ fontSize: '0.7rem', color: s.direction === 'bullish' ? 'var(--accent)' : 'var(--red)', textTransform: 'uppercase', fontWeight: 600 }}>{s.direction} {s.confidence}%</span>
                        <span style={{ fontSize: '0.55rem', color: 'var(--text-3)' }}>{s.action?.toUpperCase()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {aiData.anomaly && (
                <div style={{ padding: '0.75rem', background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.2)', fontSize: '0.7rem' }}>
                  <span style={{ color: '#f59e0b', fontWeight: 600 }}>⚠ Anomaly: </span>{aiData.anomaly}
                </div>
              )}
              {aiData.hotTopics?.length > 0 && (
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {aiData.hotTopics.map((t: string, i: number) => (
                    <span key={i} style={{ padding: '0.2rem 0.6rem', background: 'var(--bg-2)', border: '1px solid var(--border)', fontSize: '0.65rem', borderRadius: 2 }}>{t}</span>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      );
    }

    if (activeTab === 'arbitrage') {
      // Compute internal spreads on the fly
      const arbList = markets.filter(m => m.spread > 0.005).sort((a, b) => b.spread - a.spread).slice(0, 15);
      if (arbList.length === 0) return <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-3)' }}>No arbitrage signals. Scanning internal spreads...</div>;
      return arbList.map((a, i) => (
        <div key={a.id} className="arb-card" style={{ animationDelay: `${i * 50}ms` }}
          onClick={() => window.open(`https://polymarket.com/event/${a.slug}`, '_blank')}>
          <div style={{ flex: '0 0 38%' }}>
            <span className="arb-platform">SPREAD</span>
            <div style={{ fontFamily: 'var(--display)', fontSize: '1rem' }}>{a.question.substring(0, 45)}</div>
          </div>
          <div style={{ flex: 1, fontSize: '0.7rem' }}>
            <span>{Math.round(a.yesPrice * 100)}c ↔ {Math.round(a.noPrice * 100)}c</span>
          </div>
          <div style={{ flex: '0 0 20%', textAlign: 'right' }}>
            <span style={{ fontSize: '1.2rem', color: 'var(--accent)' }}>{(a.spread * 100).toFixed(2)}%</span>
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

  const showToastMsg = (text: string) => {
    const t = document.getElementById('vura-toast');
    if (t) { t.textContent = text; t.className = 'toast toast-show'; setTimeout(() => t.className = 'toast', 3500); }
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
            <a href="#" onClick={e => { e.preventDefault(); setActiveTab('stats'); }} className={activeTab === 'stats' ? 'nav-link-active' : ''}>Stats</a>
            <a href="#" onClick={e => { e.preventDefault(); setActiveTab('ai'); }} className={activeTab === 'ai' ? 'nav-link-active' : ''}>AI</a>
          </div>
          <div className="nav-status">
            <button className="theme-toggle" onClick={toggleTheme} title="Toggle theme">◐</button>
            {!ready ? (
              <button className="privy-btn" disabled style={{ opacity: 0.5 }}>Loading...</button>
            ) : authenticated ? (
              <>
                <span style={{ fontSize: '0.6rem', color: 'var(--accent)' }}>
                  {user?.email?.address || user?.google?.email || user?.twitter?.username || (user?.id ? user.id.slice(0, 6) + '...' : 'User')}
                </span>
                {tweetCount && (
                  <span style={{ fontSize: '0.55rem', color: '#1d9bf0', background: 'rgba(29,155,240,0.1)', padding: '1px 5px', borderRadius: 2 }}>
                    {tweetCount.pm} PM tweets
                  </span>
                )}
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
          <button className="csv-btn" onClick={() => setShowScreener(!showScreener)} style={{ color: showScreener ? 'var(--accent)' : 'var(--text-3)' }}>Filter</button>
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

      {showScreener && (
        <div style={{ maxWidth: '72rem', margin: '0 auto', padding: '0.5rem 2rem', display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', borderBottom: '1px solid var(--border)', fontSize: '0.6rem' }}>
          <div className="pnl-field" style={{ flexDirection: 'row', alignItems: 'center', gap: '0.3rem' }}>
            <span className="pnl-label">Price</span>
            <input type="number" className="pnl-input" value={screenerPriceMin} onChange={e => setScreenerPriceMin(Number(e.target.value))} style={{ width: '50px' }} min={0} max={100} />
            <span>-</span>
            <input type="number" className="pnl-input" value={screenerPriceMax} onChange={e => setScreenerPriceMax(Number(e.target.value))} style={{ width: '50px' }} min={0} max={100} />
            <span>c</span>
          </div>
          <div className="pnl-field" style={{ flexDirection: 'row', alignItems: 'center', gap: '0.3rem' }}>
            <span className="pnl-label">Vol ≥</span>
            <input type="number" className="pnl-input" value={screenerVolMin} onChange={e => setScreenerVolMin(Number(e.target.value))} style={{ width: '60px' }} min={0} />
            <span>$</span>
          </div>
          <div className="pnl-field" style={{ flexDirection: 'row', alignItems: 'center', gap: '0.3rem' }}>
            <span className="pnl-label">24h Δ ≥</span>
            <input type="number" className="pnl-input" value={screenerChangeMin} onChange={e => setScreenerChangeMin(Number(e.target.value))} style={{ width: '50px' }} min={0} />
            <span>%</span>
          </div>
          <button className="csv-btn" onClick={() => { setScreenerPriceMin(0); setScreenerPriceMax(100); setScreenerVolMin(0); setScreenerChangeMin(0); }}>Reset</button>
          <span style={{ color: 'var(--text-3)' }}>{filteredMarkets.length} results</span>
        </div>
      )}

      <main key={activeTab} className="animate-slide-up">{renderContent()}</main>

      {/* ── P&L + TRADE MODAL ── */}
      {selectedMarket && (
        <TradeModal
          market={selectedMarket}
          watchlist={watchlist}
          onClose={() => setSelectedMarket(null)}
          onWatchlistToggle={() => toggleWatchlist(String(selectedMarket.id))}
          onAlert={() => setAlertMarket(selectedMarket)}
          onShare={shareMarket}
        />
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
                    localStorage.setItem(`vura_tg_${profileKey}`, JSON.stringify({ token: telegramToken, chatId: telegramChatId }));
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
