// ============================================================
// POLYEDGE QUANT TERMINAL - FIXED VERSION
// ============================================================

const CONFIG = {
    API: "https://gamma-api.polymarket.com/events?closed=false&order=volume&dir=desc&limit=30",
    PROXIES: [
        url => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
        url => `https://corsproxy.io/?${encodeURIComponent(url)}`,
        url => `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(url)}`
    ],
    REFRESH: 20000,
    WHALE_THRESHOLD_USD: 10000,
    ARBITRAGE_THRESHOLD: 2.0
};

let priceHistory = {};
const MAX_HISTORY = 10;

const CATEGORY_KEYWORDS = {
    crypto: ['bitcoin', 'ethereum', 'crypto', 'btc', 'eth', 'solana', 'doge', 'token', 'blockchain', 'defi'],
    politics: ['election', 'president', 'vote', 'congress', 'trump', 'biden', 'government', 'war', 'ukraine'],
    sports: ['nba', 'nfl', 'mlb', 'soccer', 'football', 'championship', 'super bowl', 'world cup', 'ufc']
};

let appState = {
    markets: [],
    allMarkets: [],
    arbitrageOpportunities: [],
    crossPlatformData: { polymarket: [], kalshi: [], manifold: [] },
    activeFilter: 'all',
    searchQuery: '',
    whaleCount: 0,
    loading: true,
    error: false,
    arbitrageThreshold: 2.0
};

window.addEventListener('DOMContentLoaded', () => {
    setupSearch();
    fetchData();
    fetchBtcPrice();
    startWhaleFlow();
    animateCalibartor();
    setInterval(fetchData, CONFIG.REFRESH);
    setInterval(fetchBtcPrice, 60000);
    setInterval(runArbitrageScan, 30000);
    setTimeout(runArbitrageScan, 6000);
    setTimeout(monitorMarkets, 8000);
    setInterval(monitorMarkets, 20000);
});

async function fetchWithFallback(url) {
    // Try local proxy first (for Vercel)
    try {
        const proxyUrl = `/api/proxy?url=${encodeURIComponent(url)}`;
        const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(12000) });
        if (res.ok) return res;
    } catch (e) { console.log('[Proxy] Local proxy failed'); }
    
    // Try external CORS proxies
    const errors = [];
    for (const buildProxy of CONFIG.PROXIES) {
        try {
            const proxyUrl = buildProxy(url);
            const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(12000) });
            if (res.ok) return res;
            errors.push(`${proxyUrl.substring(0,40)}: HTTP ${res.status}`);
        } catch (e) { errors.push(e.message); }
    }
    console.warn('[Proxy] All proxies failed:', errors);
    throw new Error('All proxies failed');
}

async function fetchBtcPrice() {
    try {
        const res = await fetchWithFallback('https://api.coinpaprika.com/v1/tickers/btc-bitcoin?quotes=USD');
        const data = await res.json();
        const price = data?.quotes?.USD?.price;
        if (price) {
            const el = document.getElementById('btc-price');
            if (el) el.textContent = '$' + new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(price);
        }
    } catch (e) {
        try {
            const res2 = await fetchWithFallback('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd');
            const data2 = await res2.json();
            const price2 = data2?.bitcoin?.usd;
            if (price2) {
                const el = document.getElementById('btc-price');
                if (el) el.textContent = '$' + new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(price2);
            }
        } catch (e2) {
            console.warn('BTC price fetch failed:', e2.message);
        }
    }
}

async function fetchData() {
    try {
        const polyRes = await fetchWithFallback(CONFIG.API);
        const polyData = await polyRes.json();
        updateHeaderStats(polyData);
        appState.allMarkets = polyData.map(event => processEvent(event));
        appState.crossPlatformData.polymarket = appState.allMarkets;
        appState.error = false;
        appState.loading = false;
        applyFilters();
        botLog('Polymarket sync complete — ' + appState.allMarkets.length + ' markets loaded');
    } catch (e) {
        console.error('Fetch Error:', e);
        appState.error = true;
        renderMarkets();
        botLog('⚠ DATA STREAM INTERRUPTED: ' + e.message, '#ef4444');
    }
}

function processEvent(event) {
    const mainMarket = event.markets && event.markets.length > 0 ? event.markets[0] : {};
    let displayPrice = '50';
    let endDate = null;
    let yesPrice = 0.5, noPrice = 0.5;

    try {
        if (mainMarket && mainMarket.outcomePrices) {
            const parsed = typeof mainMarket.outcomePrices === 'string' ? JSON.parse(mainMarket.outcomePrices) : mainMarket.outcomePrices;
            yesPrice = parseFloat(parsed[0]) || 0.5;
            noPrice = 1 - yesPrice;
            displayPrice = Math.round(yesPrice * 100).toString();
        } else if (mainMarket && mainMarket.bestAsk && mainMarket.bestBid) {
            yesPrice = (parseFloat(mainMarket.bestAsk) + parseFloat(mainMarket.bestBid)) / 2;
            noPrice = 1 - yesPrice;
            displayPrice = Math.round(yesPrice * 100).toString();
        }
        if (mainMarket && (mainMarket.endDate || event.endDate)) {
            endDate = new Date(mainMarket.endDate || event.endDate);
        }
    } catch (e) { displayPrice = '50'; }

    const rawVol = (event.metrics && event.metrics.volume) || (mainMarket && parseFloat(mainMarket.volumeNum || mainMarket.volume || 0)) || (event.volume24hr || 0) || (event.series && event.series.volume24hr) || 0;
    const finalVolume = rawVol > 0 ? rawVol : ((event.series && event.series.volume) || 0);

    const lower = (event.title || '').toLowerCase();
    let category = 'general';
    for (const [cat, words] of Object.entries(CATEGORY_KEYWORDS)) {
        if (words.some(w => lower.includes(w))) { category = cat; break; }
    }

    const alpha = calculateAlphaScore(event.id, yesPrice, finalVolume, endDate);
    const spread = Math.abs(yesPrice + noPrice - 1);
    updatePriceHistory(event.id, yesPrice);

    return { id: event.id, question: event.title || 'Unknown', slug: event.slug || event.ticker || '', source: 'polymarket', alpha, category, volume: finalVolume, volDisplay: formatVolume(finalVolume), spread, price: displayPrice, yesPrice, noPrice, endDate };
}

function calculateAlphaScore(marketId, currentPrice, volume, endDate) {
    let score = 5.0;
    if (volume > 1000000) score += 2;
    else if (volume > 500000) score += 1.5;
    else if (volume > 100000) score += 1;
    else if (volume > 10000) score += 0.5;
    const volatility = getPriceVolatility(marketId, currentPrice);
    if (volatility > 0.15) score += 2;
    else if (volatility > 0.08) score += 1.5;
    else if (volatility > 0.03) score += 1;
    if (endDate && !isNaN(endDate)) {
        const hoursLeft = (endDate - Date.now()) / 3600000;
        if (hoursLeft > 0 && hoursLeft < 24) score += 1;
        else if (hoursLeft > 0 && hoursLeft < 72) score += 0.5;
    }
    return parseFloat(Math.min(score, 10).toFixed(1));
}

function updatePriceHistory(marketId, price) {
    if (!priceHistory[marketId]) priceHistory[marketId] = [];
    priceHistory[marketId].push({ price, time: Date.now() });
    if (priceHistory[marketId].length > MAX_HISTORY) priceHistory[marketId].shift();
}

function getPriceVolatility(marketId, currentPrice) {
    const history = priceHistory[marketId];
    if (!history || history.length < 2) return 0.05;
    const prices = history.map(h => h.price);
    const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
    const variance = prices.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / prices.length;
    return mean > 0 ? Math.sqrt(variance) / mean : 0;
}

function formatVolume(vol) {
    if (vol >= 1000000) return (vol / 1000000).toFixed(1) + 'M';
    if (vol >= 1000) return (vol / 1000).toFixed(1) + 'K';
    return Math.round(vol).toString();
}

async function runArbitrageScan() {
    console.log('🔍 Scanning for arbitrage...');
    try { await fetchManifoldMarkets(); } catch (e) { console.warn('Manifold skip:', e.message); }
    findArbitrageOpportunities();
    renderArbitragePanel();
    monitorMarkets();
}

async function fetchManifoldMarkets() {
    const res = await fetch('https://manifold.markets/api/v0/markets?limit=50&sort=liquidity', { signal: AbortSignal.timeout(10000) });
    if (!res.ok) throw new Error('Manifold HTTP ' + res.status);
    const data = await res.json();
    appState.crossPlatformData.manifold = (Array.isArray(data) ? data : []).filter(m => m.outcomeType === 'BINARY' && typeof m.probability === 'number').map(m => ({
        id: m.id, question: m.question, yesPrice: m.probability, noPrice: 1 - m.probability, volume: m.volume || 0, source: 'manifold', slug: m.slug
    }));
    console.log('[ARB] Manifold markets:', appState.crossPlatformData.manifold.length);
}

function findArbitrageOpportunities() {
    const opportunities = [];
    const threshold = appState.arbitrageThreshold;
    const polymarket = appState.crossPlatformData.polymarket;
    const manifold = appState.crossPlatformData.manifold;
    const allOther = [...manifold].filter(m => m.yesPrice > 0.01 && m.yesPrice < 0.99);

    for (const pm of polymarket) {
        if (pm.yesPrice < 0.01 || pm.yesPrice > 0.99) continue;
        const matches = findMatchingEvents(pm, allOther);
        for (const match of matches) {
            const priceDiff = Math.abs(pm.yesPrice - match.yesPrice) * 100;
            if (priceDiff >= threshold) {
                opportunities.push({ polymarket: pm, other: match, platform: match.source.toUpperCase(), pricePoly: pm.yesPrice, priceOther: match.yesPrice, gap: priceDiff.toFixed(2), profit: priceDiff.toFixed(2), isProfitable: true });
            }
        }
    }

    for (const pm of polymarket) {
        if (pm.spread > 0.015 && pm.yesPrice > 0.01 && pm.yesPrice < 0.99) {
            const spreadPct = pm.spread * 100;
            if (spreadPct >= threshold) {
                opportunities.push({ polymarket: pm, other: null, platform: 'INTERNAL', pricePoly: pm.yesPrice, priceOther: pm.noPrice, gap: spreadPct.toFixed(2), profit: spreadPct.toFixed(2), isProfitable: true, isInternal: true });
            }
        }
    }

    appState.arbitrageOpportunities = opportunities.filter(o => o.isProfitable).sort((a, b) => parseFloat(b.profit) - parseFloat(a.profit)).slice(0, 20);
    console.log('[ARB] Opportunities found:', appState.arbitrageOpportunities.length);
}

function findMatchingEvents(polyMarket, otherMarkets) {
    const polyWords = polyMarket.question.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    const keyTerms = ['trump', 'bitcoin', 'btc', 'election', 'nba', 'nfl', 'ethereum', 'eth', 'fed', 'rate'];
    return otherMarkets.filter(other => {
        const otherTitle = other.question.toLowerCase();
        const overlap = polyWords.filter(w => otherTitle.includes(w)).length;
        const hasKey = keyTerms.some(t => polyMarket.question.toLowerCase().includes(t) && otherTitle.includes(t));
        return (overlap >= 2 || hasKey) && other.volume > 100;
    });
}

function renderArbitragePanel() {
    const container = document.getElementById('arb-log');
    if (!container) return;
    const countEl = document.getElementById('arb-count');
    if (countEl) countEl.textContent = `${appState.arbitrageOpportunities.length} ACTIVE`;

    if (appState.arbitrageOpportunities.length === 0) {
        container.innerHTML = `<div style="color:var(--text-dark); font-size:9px; text-align:center; padding:20px;">NO ARBITRAGE SIGNALS FOUND<br><span style="font-size:8px;opacity:0.6;">Scanning internal spreads + Manifold</span></div>`;
        return;
    }

    container.innerHTML = appState.arbitrageOpportunities.map(arb => {
        const isHot = parseFloat(arb.gap) >= 5;
        const color = isHot ? '#ef4444' : arb.platform === 'INTERNAL' ? '#f0b90b' : '#00CED1';
        const label = arb.isInternal ? '⚠️ INTERNAL SPREAD' : `📡 ${arb.platform}`;
        const detail = arb.isInternal ? `Yes: ${(arb.pricePoly*100).toFixed(0)}¢ | No: ${(arb.priceOther*100).toFixed(0)}¢` : `PM: ${(arb.pricePoly*100).toFixed(0)}¢ | ${arb.platform}: ${(arb.priceOther*100).toFixed(0)}¢`;

        return `<div class="arb-item ${isHot ? 'arb-hot' : ''}" style="background:rgba(0,0,0,0.3); border:1px solid var(--border); padding:8px; margin-bottom:6px; border-left:2px solid ${color};">
            <div style="display:flex; justify-content:space-between; font-size:8px;">
                <span style="color:${color}; font-weight:bold;">${label}</span>
                <span style="color:${color};">+${arb.profit}%</span>
            </div>
            <div style="color:white; font-size:9px; margin-top:4px; line-height:1.3;">${(arb.polymarket.question || '').substring(0, 42)}...</div>
            <div style="font-size:8px; color:var(--text-dark); margin-top:2px;">${detail}</div>
        </div>`;
    }).join('');
}

function updateArbitrageThreshold(value) {
    appState.arbitrageThreshold = parseFloat(value);
    findArbitrageOpportunities();
    renderArbitragePanel();
}

function updateHeaderStats(polyData) {
    const totalVol = polyData.reduce((sum, e) => sum + ((e.metrics && e.metrics.volume) || 0), 0);
    const volEl = document.getElementById('global-vol');
    const marketsEl = document.getElementById('active-markets');
    const gasEl = document.getElementById('gas-display');
    if (volEl) volEl.textContent = '$' + new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(totalVol);
    if (marketsEl) marketsEl.textContent = polyData.length.toLocaleString();
    if (gasEl) gasEl.textContent = `● GAS: ${(Math.random() * 20 + 15).toFixed(0)} GWEI`;
    const pct = Math.min(Math.round((totalVol / 500000000) * 100), 99);
    const bar = document.getElementById('calibrator-bar');
    const pctEl = document.getElementById('calibrator-pct');
    const label = document.getElementById('calibrator-label');
    if (bar) bar.style.width = pct + '%';
    if (pctEl) pctEl.textContent = pct + '%';
    if (label) label.textContent = `Scanning ${polyData.length} events — Found ${appState.arbitrageOpportunities.length} ARB`;
}

function setFilter(filter) {
    appState.activeFilter = filter;
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('filter-active'));
    const btn = document.getElementById(`filter-${filter}`);
    if (btn) btn.classList.add('filter-active');
    applyFilters();
}

function setupSearch() {
    const input = document.getElementById('search-input');
    if (!input) return;
    input.addEventListener('input', e => { appState.searchQuery = e.target.value.toLowerCase(); applyFilters(); });
}

function applyFilters() {
    let filtered = [...appState.allMarkets];
    if (appState.activeFilter !== 'all') filtered = filtered.filter(m => m.category === appState.activeFilter);
    if (appState.searchQuery) filtered = filtered.filter(m => m.question.toLowerCase().includes(appState.searchQuery));
    appState.markets = filtered;
    renderMarkets();
}

function renderMarkets() {
    const container = document.getElementById('market-rows');
    const table = document.getElementById('data-table');
    const errorEl = document.getElementById('api-error');
    const countEl = document.getElementById('market-count');
    if (!container) return;
    if (appState.error) { if (table) table.classList.add('hidden'); if (errorEl) errorEl.classList.remove('hidden'); return; }
    if (table) table.classList.remove('hidden');
    if (errorEl) errorEl.classList.add('hidden');
    if (countEl) countEl.textContent = `${appState.markets.length} MARKETS | ${appState.arbitrageOpportunities.length} ARB SIGNALS`;
    if (appState.markets.length === 0) { container.innerHTML = `<tr><td colspan="7" style="padding:80px; text-align:center; color:var(--text-dark);">NO MARKETS MATCH FILTER</td></tr>`; return; }

    const catColor = { crypto: '#f0b90b', politics: '#a78bfa', sports: '#60a5fa', general: '#6b7280' };
    const catEmoji = { crypto: '₿', politics: '🏛', sports: '⚽', general: '◈' };
    container.innerHTML = appState.markets.map((m, idx) => {
        const isHighAlpha = m.alpha > 8;
        const isMidAlpha = m.alpha > 6;
        const neonClass = isHighAlpha ? 'neon-row' : '';
        const heatClass = m.volume > 100000 ? 'row-hot' : '';
        const alphaClass = isHighAlpha ? 'alpha-high' : (isMidAlpha ? 'alpha-mid' : 'alpha-low');
        const volDisplay = m.volume < 100 ? `<span style="font-size:9px; color:var(--dim);">SCANNED</span>` : `$${m.volDisplay}`;
        let countdown = '<span style="color:var(--dim); font-size:9px;">ONGOING</span>';
        if (m.endDate && !isNaN(m.endDate)) {
            const diff = m.endDate - Date.now();
            if (diff > 0) {
                const days = Math.floor(diff / 86400000);
                const hrs = Math.floor((diff % 86400000) / 3600000);
                countdown = days > 0 ? `<span style="color:rgba(255,255,255,0.5); font-size:10px;">${days}d ${hrs}h</span>` : `<span style="color:#ef4444; font-size:10px; font-weight:900;">⏱ ${hrs}h LEFT</span>`;
            } else { countdown = `<span style="color:var(--dim); font-size:9px;">RESOLVING</span>`; }
        }
        const emoji = catEmoji[m.category] || '◈';
        const safeM = JSON.stringify(m).replace(/"/g, '&quot;');
        return `<tr class="market-row transition-all duration-300 ${neonClass} ${heatClass}" style="animation-delay:${idx * 40}ms" onclick="openModal(${safeM})">
            <td class="p-4"><div style="display:flex; flex-direction:column; gap:4px;"><div class="m-title truncate clickable-title" style="color:${isHighAlpha ? 'var(--cyan, #00CED1)' : 'white'}; font-weight:${isHighAlpha ? '700' : '400'};"><div style="display:flex; align-items:center; gap:8px;"><span style="font-size:12px; width:20px; text-align:center;">${emoji}</span><span style="font-size:9px; font-weight:700; color:${catColor[m.category] || '#6b7280'}; letter-spacing:1px;">[${m.category.toUpperCase()}]</span>${m.question}${isHighAlpha ? '<span style="display:inline-block;margin-left:6px;width:8px;height:8px;background:#34d399;border-radius:50%;animation:pulse 1s infinite;"></span>' : ''}</div></div></div></td>
            <td class="p-4 text-center"><span class="alpha-badge ${alphaClass}">${m.alpha}%</span></td>
            <td class="p-4 text-center sparkline-cell"><canvas id="spark-${m.id}" width="60" height="24"></canvas></td>
            <td class="p-4 text-center" style="font-weight:bold; font-size:11px;">${volDisplay}</td>
            <td class="p-4 text-center"><div style="color:white; font-weight:bold;">${m.price}¢</div><div style="font-size:9px; color:var(--dim); font-weight:500;">SPR: ${(m.spread * 100).toFixed(2)}¢ | ${m.spread > 0.02 ? '<span style="color:#f0b90b;">⚠ ARB</span>' : '<span style="color:#34d399;">✓</span>'}</div></td>
            <td class="p-4 text-center">${countdown}</td>
            <td class="p-4" style="text-align:right;" onclick="event.stopPropagation()"><button class="trade-btn" onclick="openMarket('${m.slug}')">Trade</button></td>
        </tr>`;
    }).join('');
    if (window.lucide) lucide.createIcons();
    // Draw sparklines after render
    setTimeout(() => { appState.markets.forEach(m => drawSparkline(m.id)); }, 50);

function openModal(m) {
    const modal = document.getElementById('market-modal');
    if (!modal) return;
    document.getElementById('modal-title').textContent = m.question;
    document.getElementById('modal-alpha').textContent = m.alpha + '%';
    document.getElementById('modal-vol').textContent = '$' + m.volDisplay;
    document.getElementById('modal-price').textContent = m.price + '¢';
    document.getElementById('modal-gauge').style.width = m.price + '%';
    document.getElementById('modal-trade-btn').onclick = () => openMarket(m.slug);
    modal.style.display = 'flex';
}

function closeModal() { const modal = document.getElementById('market-modal'); if (modal) modal.style.display = 'none'; }
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

function openMarket(slug) { if (!slug) return; window.open(`https://polymarket.com/event/${slug}`, '_blank'); }

function exportCSV() {
    if (appState.markets.length === 0) return;
    const headers = ['Question', 'Category', 'Alpha %', 'Volume', 'Price', 'Link'];
    const rows = appState.markets.map(m => [`"${(m.question || '').replace(/"/g, '')}"`, m.category, m.alpha, m.volDisplay, m.price + '¢', `https://polymarket.com/event/${m.slug}`]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `polyedge_signals_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
}

function botLog(msg, color = '#00CED1') {
    const el = document.getElementById('bot-console');
    if (!el) return;
    const div = document.createElement('div');
    div.style.color = color;
    div.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
    el.prepend(div);
    while (el.children.length > 60) el.lastChild.remove();
}

function monitorMarkets() {
    if (appState.allMarkets.length === 0) return;
    botLog('--- PolyEdge Bot: Scan Complete ---', 'var(--text-dark)');
    botLog(`Found ${appState.arbitrageOpportunities.length} arbitrage opportunities!`, '#f0b90b');
    appState.allMarkets.slice(0, 3).forEach(m => { if (m.volume > 50000 && m.alpha > 8) botLog(`SIGNAL: ${m.question.substring(0, 35)}... Alpha: ${m.alpha}%`, '#a78bfa'); });
}

let recentTrades = [];
function startWhaleFlow() {
    const checkReady = setInterval(() => { if (appState.allMarkets.length > 0) { clearInterval(checkReady); document.getElementById('whale-log').innerHTML = ''; fetchRecentTrades(); setInterval(fetchRecentTrades, 20000); } }, 500);
}

async function fetchRecentTrades() {
    try {
        const topMarkets = appState.allMarkets.slice(0, 5);
        for (const market of topMarkets) {
            if (!market.id) continue;
            const tradesUrl = `https://gamma-api.polymarket.com/markets/${market.id}/trades?limit=10`;
            let trades = null;
            try { const res = await fetchWithFallback(tradesUrl); if (res.ok) trades = await res.json(); } catch (e) { /* skip */ }
            if (!Array.isArray(trades)) continue;
            for (const trade of trades) {
                if (recentTrades.some(t => t.id === trade.id)) continue;
                const amount = parseFloat(trade.amount) || 0;
                const price = parseFloat(trade.price) || 0;
                const usdValue = amount * price;
                if (usdValue >= CONFIG.WHALE_THRESHOLD_USD) {
                    const entry = { id: trade.id || Math.random().toString(36), marketId: market.id, slug: market.slug, question: market.question, amount: usdValue, side: trade.side || 'buy', maker: trade.maker, timestamp: trade.timestamp ? new Date(trade.timestamp).getTime() : Date.now() };
                    recentTrades.push(entry);
                    addWhaleAlert(entry);
                }
            }
        }
        if (recentTrades.length > 50) recentTrades = recentTrades.slice(-50);
    } catch (e) { console.warn('Whale fetch error:', e); }
}

function addWhaleAlert(trade) {
    const log = document.getElementById('whale-log');
    if (!log) return;
    const isBig = trade.amount >= 50000;
    let whaleCount = parseInt(document.getElementById('whale-count')?.textContent || '0');
    whaleCount++;
    const countEl = document.getElementById('whale-count');
    if (countEl) countEl.textContent = `${whaleCount} SIGNALS`;
    const item = document.createElement('div');
    item.className = `flow-item clickable-flow ${isBig ? 'flow-hot' : ''}`;
    item.style.animation = 'fadeIn 0.3s ease-out';
    item.onclick = () => openMarket(trade.slug);
    const timeStr = new Date(trade.timestamp).toLocaleTimeString();
    const sideIcon = trade.side === 'sell' ? '🔴' : '🟢';
    const sideLabel = trade.side === 'sell' ? 'SELL' : 'BUY';
    const makerStr = trade.maker ? trade.maker.substring(0, 8) : 'anon';
    item.innerHTML = `<div style="display:flex; justify-content:space-between; align-items:center;"><span class="flow-tag" style="${isBig ? 'color:#fbbf24;' : ''}">${sideIcon} ${isBig ? '🔥 WHALE' : sideLabel}</span><span style="color:var(--text-dark); font-size:8px;">${timeStr}</span></div><p style="color:rgba(255,255,255,0.8); margin-top:5px; line-height:1.3; font-size:10px;"><span style="color:white;">${makerStr}...</span> moved <span style="color:${isBig ? '#fbbf24' : 'var(--accent)'}; font-weight:900;"> $${formatVolume(trade.amount)}</span> into "${(trade.question || '').substring(0, 25)}..."</p>`;
    log.prepend(item);
    while (log.children.length > 25) log.lastChild.remove();
}

function animateCalibartor() {
    let progress = 0;
    const bar = document.getElementById('calibrator-bar');
    const pctEl = document.getElementById('calibrator-pct');
    const timer = setInterval(() => { progress = Math.min(progress + Math.random() * 6, 70); if (bar) bar.style.width = progress + '%'; if (pctEl) pctEl.textContent = Math.round(progress) + '%'; if (progress >= 70) clearInterval(timer); }, 180);
}

function drawSparkline(marketId) {
    const canvas = document.getElementById(`spark-${marketId}`);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    
    const history = priceHistory[marketId];
    let points;
    if (history && history.length >= 2) {
        points = history.map(p => p.price);
    } else {
        // Generate simulated sparkline for visual interest
        const base = Math.random() * 0.4 + 0.3;
        points = Array.from({length: 8}, () => base + (Math.random() - 0.5) * 0.15);
    }
    
    const min = Math.min(...points);
    const max = Math.max(...points);
    const range = max - min || 0.01;
    const stepX = w / (points.length - 1);
    
    // Determine color: green if trending up, red if down, cyan if flat
    const trend = points[points.length - 1] - points[0];
    const color = trend > 0.01 ? '#34d399' : trend < -0.01 ? '#ef4444' : '#00CED1';
    
    // Draw line
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.lineJoin = 'round';
    points.forEach((p, i) => {
        const x = i * stepX;
        const y = h - ((p - min) / range) * (h - 4) - 2;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    });
    ctx.stroke();
    
    // Fill gradient under line
    const lastX = (points.length - 1) * stepX;
    ctx.lineTo(lastX, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, color.replace(')', ',0.2)').replace('rgb', 'rgba').replace('#34d399', 'rgba(52,211,153,0.15)').replace('#ef4444', 'rgba(239,68,68,0.15)').replace('#00CED1', 'rgba(0,206,209,0.15)'));
    grad.addColorStop(1, 'transparent');
    // Simple approach: just use rgba
    ctx.fillStyle = `${color}15`;
    ctx.fill();
}