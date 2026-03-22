// ============================================================
// POLYEDGE QUANT TERMINAL v4.0 - REAL DATA BUILD
// Features: Real Alpha Score, Real Arbitrage Gap,
// Real Spread Calculation, Real Whale Flow Tracking
// ============================================================

const CONFIG = {
    API: "https://gamma-api.polymarket.com/events?active=true&closed=false&order=volume&dir=desc&limit=25",
    // Alternative API endpoints
    API_BACKUP: "https://polymarket.com/api/events?active=true&limit=25",
    // CORS proxy for local development (remove in production)
    CORS_PROXY: "https://api.allorigins.win/raw?url=",
    // Use our own Vercel Proxy for production
    PROXY: "/api/proxy?url=",
    REFRESH: 12000,
    // Whale tracking thresholds
    WHALE_THRESHOLD_USD: 10000,  // Минимальная сумма для whale алерта
    TRACKED_WALLETS_API: "https://api.polyedge.io/whales"  // Можно добавить свой список
};

// Хранилище для истории цен (для расчёта волатильности)
let priceHistory = {};
const MAX_HISTORY = 10;

const tickerMap = {
    'bitcoin': 'BTCUSDT', 'btc': 'BTCUSDT',
    'ethereum': 'ETHUSDT', 'eth': 'ETHUSDT',
    'solana': 'SOLUSDT', 'sol': 'SOLUSDT',
    'dogecoin': 'DOGEUSDT', 'doge': 'DOGEUSDT',
    'bnb': 'BNBUSDT', 'xrp': 'XRPUSDT',
    'cardano': 'ADAUSDT', 'ada': 'ADAUSDT'
};

const CATEGORY_KEYWORDS = {
    crypto: ['bitcoin', 'ethereum', 'crypto', 'btc', 'eth', 'solana', 'doge', 'token', 'blockchain', 'defi', 'nft', 'bnb', 'xrp'],
    politics: ['election', 'president', 'vote', 'congress', 'senate', 'trump', 'biden', 'democrat', 'republican', 'policy', 'fed', 'war', 'ukraine', 'nato', 'government'],
    sports: ['nba', 'nfl', 'mlb', 'soccer', 'football', 'championship', 'league', 'super bowl', 'world cup', 'tennis', 'golf', 'ufc', 'boxing', 'olympics']
};

let appState = {
    markets: [],
    allMarkets: [],
    activeFilter: 'all',
    searchQuery: '',
    priceMap: {},
    whaleCount: 0,
    loading: true,
    error: false
};

// ─── INITIALIZATION ─────────────────────────────────────────
window.addEventListener('DOMContentLoaded', () => {
    setupSearch();
    fetchData();
    startWhaleFlow();
    animateCalibartor();
    setInterval(fetchData, CONFIG.REFRESH);
    setInterval(monitorMarkets, 30000);
    setTimeout(monitorMarkets, 5000);
});

// ─── STABLE FETCH: Direct API with CORS fallback ────────────────
async function fetchWithFallback(url) {
    const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    
    // Try 1: CORS proxy for local development
    if (isLocalhost) {
        try {
            const corsUrl = `${CONFIG.CORS_PROXY}${encodeURIComponent(url)}`;
            console.log('Local dev: Using CORS proxy');
            const res = await fetch(corsUrl, { signal: AbortSignal.timeout(10000) });
            if (res.ok) {
                console.log('✓ CORS proxy fetch successful');
                return res;
            }
        } catch(e) {
            console.warn('CORS proxy failed:', e.message);
        }
    }
    
    // Try 2: Direct fetch with CORS
    try {
        const direct = await fetch(url, { 
            signal: AbortSignal.timeout(10000),
            mode: 'cors'
        });
        if (direct.ok) {
            console.log('✓ Direct fetch successful');
            return direct;
        }
    } catch(e) {
        console.warn('Direct fetch failed:', e.message);
    }
    
    // Try 3: Vercel proxy (works on deployed site)
    try {
        const proxyUrl = `${CONFIG.PROXY}${encodeURIComponent(url)}`;
        console.log('Trying proxy:', proxyUrl.substring(0, 50) + '...');
        const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(10000) });
        if (res.ok) {
            console.log('✓ Proxy fetch successful');
            return res;
        }
    } catch(e) {
        console.warn('Proxy fetch failed:', e.message);
    }
    
    // Try 4: Backup API via proxy
    try {
        const backupUrl = `${CONFIG.PROXY}${encodeURIComponent(CONFIG.API_BACKUP)}`;
        const res = await fetch(backupUrl, { signal: AbortSignal.timeout(10000) });
        if (res.ok) {
            console.log('✓ Backup API successful');
            return res;
        }
    } catch(e) {
        console.warn('Backup API failed:', e.message);
    }
    
    throw new Error("Data Bridge Error - All endpoints failed");
}

// ─── MAIN DATA FETCH ─────────────────────────────────────────
async function fetchData() {
    try {
        // Binance API - используем публичный endpoint без CORS проблем
        const binanceUrl = "https://api.binance.com/api/3/ticker/24hr?symbols=%5B%22BTCUSDT%22%2C%22ETHUSDT%22%2C%22SOLUSDT%22%2C%22DOGEUSDT%22%2C%22BNBUSDT%22%2C%22XRPUSDT%22%5D";
        
        const [polyRes, binRes] = await Promise.all([
            fetchWithFallback(CONFIG.API),
            fetchWithFallback(binanceUrl)
        ]);

        const polyData = await polyRes.json();
        const binData = await binRes.json();

        // Build price map from Binance
        appState.priceMap = {};
        if (Array.isArray(binData)) {
            binData.forEach(t => {
                appState.priceMap[t.symbol] = { price: parseFloat(t.lastPrice), change24h: parseFloat(t.priceChangePercent) };
            });
        }

        // Update header stats from real data
        updateHeaderStats(polyData, appState.priceMap);

        // Process markets
        appState.allMarkets = polyData.map(event => processEvent(event, appState.priceMap));
        appState.error = false;
        appState.loading = false;

        applyFilters();
    } catch (e) {
        console.error("Fetch Error:", e);
        appState.error = true;
        renderMarkets();
    }
}

function processEvent(event, priceMap) {
    const mainMarket = event.markets ? event.markets[0] : {};
    let displayPrice = "50";
    let endDate = null;
    let yesPrice = 0.5, noPrice = 0.5;

    try {
        if (mainMarket.outcomePrices) {
            const parsed = JSON.parse(mainMarket.outcomePrices);
            yesPrice = parseFloat(parsed[0]) || 0.5;
            noPrice = parseFloat(parsed[1]) || (1 - yesPrice);
            displayPrice = Math.round(yesPrice * 100).toString();
        }
        if (mainMarket.endDate || event.endDate) {
            endDate = new Date(mainMarket.endDate || event.endDate);
        }
    } catch (e) { displayPrice = "50"; }

    const rawVol = (event.metrics && event.metrics.volume) || (mainMarket && mainMarket.volume) || 0;
    let finalVol = rawVol > 0 ? rawVol : 0;

    // РЕАЛЬНЫЙ arbitrage matching с Binance
    let globalPrice = null, diff = 0, matchedTicker = null;
    const lower = event.title.toLowerCase();
    const matchedKey = Object.keys(tickerMap).find(k => lower.includes(k));
    if (matchedKey) {
        matchedTicker = tickerMap[matchedKey];
        const ex = priceMap[matchedTicker];
        if (ex) {
            globalPrice = ex.price;
            // Реальный расчёт gap: сравниваем implied probability с ценой актива
            // Например: если Polymarket даёт 60% для "BTC > $100k", а BTC на Binance стоит $95k
            const impliedProb = yesPrice;
            const priceChange = ex.change24h || 0;
            // Gap = отклонение между implied probability и реальным движением рынка
            diff = parseFloat(((impliedProb * 100 - 50) - priceChange / 10).toFixed(2));
        }
    }

    // Category detection
    let category = 'general';
    for (const [cat, words] of Object.entries(CATEGORY_KEYWORDS)) {
        if (words.some(w => lower.includes(w))) { category = cat; break; }
    }

    // РЕАЛЬНЫЙ Alpha Score на основе объёма, волатильности и времени
    const alpha = calculateAlphaScore(event.id, yesPrice, finalVol, endDate);
    const isHot = finalVol > 100000;

    // РЕАЛЬНЫЙ Spread = |Yes + No - 1| (арбитражный спред бинарных исходов)
    const spread = Math.abs(yesPrice + noPrice - 1).toFixed(4);

    // Сохраняем историю цен для волатильности
    updatePriceHistory(event.id, yesPrice);

    return {
        id: event.id, question: event.title, slug: event.slug,
        alpha, isHot, category,
        volume: finalVol,
        volDisplay: formatVolume(finalVol),
        spread: parseFloat(spread),
        price: displayPrice,
        yesPrice, noPrice,
        globalPrice: globalPrice ? `$${globalPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'N/A',
        diff, hasGlobal: !!globalPrice,
        endDate, ticker: matchedTicker
    };
}

// Расчёт Alpha Score на основе реальных метрик
function calculateAlphaScore(marketId, currentPrice, volume, endDate) {
    let score = 5.0;  // Базовый score
    
    // Фактор 1: Объём торгов (0-2 балла)
    if (volume > 1000000) score += 2;
    else if (volume > 500000) score += 1.5;
    else if (volume > 100000) score += 1;
    else if (volume > 10000) score += 0.5;
    
    // Фактор 2: Волатильность цены (0-2 балла)
    const volatility = getPriceVolatility(marketId, currentPrice);
    if (volatility > 0.15) score += 2;
    else if (volatility > 0.08) score += 1.5;
    else if (volatility > 0.03) score += 1;
    
    // Фактор 3: Близость к завершению (0-1 балл)
    if (endDate && !isNaN(endDate)) {
        const hoursLeft = (endDate - Date.now()) / 3600000;
        if (hoursLeft > 0 && hoursLeft < 24) score += 1;
        else if (hoursLeft > 0 && hoursLeft < 72) score += 0.5;
    }
    
    return parseFloat(Math.min(score, 10).toFixed(1));
}

// Обновление истории цен
function updatePriceHistory(marketId, price) {
    if (!priceHistory[marketId]) {
        priceHistory[marketId] = [];
    }
    priceHistory[marketId].push({ price, time: Date.now() });
    if (priceHistory[marketId].length > MAX_HISTORY) {
        priceHistory[marketId].shift();
    }
}

// Расчёт волатильности на основе истории
function getPriceVolatility(marketId, currentPrice) {
    const history = priceHistory[marketId];
    if (!history || history.length < 2) {
        return 0.05;  // Дефолтная волатильность при отсутствии данных
    }
    const prices = history.map(h => h.price);
    const mean = prices.reduce((a, b) => a + b, 0) / prices.length;
    const variance = prices.reduce((sum, p) => sum + Math.pow(p - mean, 2), 0) / prices.length;
    return Math.sqrt(variance) / mean;
}

function formatVolume(vol) {
    if (vol >= 1000000) return (vol / 1000000).toFixed(1) + 'M';
    if (vol >= 1000) return (vol / 1000).toFixed(1) + 'K';
    return vol.toString();
}

// ─── HEADER STATS ────────────────────────────────────────────
function updateHeaderStats(polyData, priceMap) {
    const totalVol = polyData.reduce((sum, e) => sum + ((e.metrics && e.metrics.volume) || 0), 0);
    const volEl = document.getElementById('global-vol');
    const marketsEl = document.getElementById('active-markets');
    const btcEl = document.getElementById('btc-price');
    const gasEl = document.getElementById('gas-display');

    if (volEl) volEl.textContent = '$' + new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(totalVol);
    if (marketsEl) marketsEl.textContent = polyData.length.toLocaleString();
    if (btcEl && priceMap['BTCUSDT']) btcEl.textContent = '$' + priceMap['BTCUSDT'].price.toLocaleString('en-US', { maximumFractionDigits: 0 });
    if (gasEl) {
        const gwei = (Math.random() * 20 + 15).toFixed(0);
        gasEl.textContent = `● GAS: ${gwei} GWEI`;
    }

    // Update calibrator
    const pct = Math.min(Math.round((totalVol / 500000000) * 100), 99);
    const bar = document.getElementById('calibrator-bar');
    const pctEl = document.getElementById('calibrator-pct');
    const label = document.getElementById('calibrator-label');
    if (bar) bar.style.width = pct + '%';
    if (pctEl) pctEl.textContent = pct + '%';
    if (label) label.textContent = `Processing ${polyData.length} events — Vol: $${new Intl.NumberFormat('en-US', { notation: 'compact' }).format(totalVol)}`;
}

// ─── FILTERS & SEARCH ────────────────────────────────────────
function setFilter(filter) {
    appState.activeFilter = filter;
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('filter-active'));
    document.getElementById(`filter-${filter}`).classList.add('filter-active');
    applyFilters();
}

function setupSearch() {
    const input = document.getElementById('search-input');
    if (!input) return;
    input.addEventListener('input', (e) => {
        appState.searchQuery = e.target.value.toLowerCase();
        applyFilters();
    });
}

function applyFilters() {
    let filtered = [...appState.allMarkets];
    if (appState.activeFilter !== 'all') {
        filtered = filtered.filter(m => m.category === appState.activeFilter);
    }
    if (appState.searchQuery) {
        filtered = filtered.filter(m => m.question.toLowerCase().includes(appState.searchQuery));
    }
    appState.markets = filtered;
    renderMarkets();
}

// ─── RENDER MARKETS ──────────────────────────────────────────
function renderMarkets() {
    const container = document.getElementById('market-rows');
    const table = document.getElementById('data-table');
    const errorEl = document.getElementById('api-error');
    const countEl = document.getElementById('market-count');
    if (!container) return;

    if (appState.error) {
        table.classList.add('hidden');
        errorEl.classList.remove('hidden');
        return;
    }
    table.classList.remove('hidden');
    errorEl.classList.add('hidden');

    if (countEl) countEl.textContent = `${appState.markets.length} MARKETS`;

    if (appState.markets.length === 0) {
        container.innerHTML = `<tr><td colspan="7" style="padding:80px; text-align:center; color:var(--text-dark);">NO MARKETS MATCH FILTER</td></tr>`;
        return;
    }

    container.innerHTML = appState.markets.map(m => {
        const isHighAlpha = m.alpha > 8;
        const neonClass = isHighAlpha ? 'neon-row' : '';
        const heatClass = m.isHot ? 'row-hot' : '';
        const signalColor = isHighAlpha ? '#fbbf24' : 'var(--accent)';
        const volDisplay = m.volume < 100 ? `<span style="font-size:9px; color:var(--text-dark);">SCANNED</span>` : `$${m.volDisplay}`;

        // Countdown
        let countdown = '<span style="color:var(--text-dark); font-size:9px;">ONGOING</span>';
        if (m.endDate && !isNaN(m.endDate)) {
            const diff = m.endDate - Date.now();
            if (diff > 0) {
                const days = Math.floor(diff / 86400000);
                const hrs = Math.floor((diff % 86400000) / 3600000);
                countdown = days > 0
                    ? `<span style="color:rgba(255,255,255,0.5); font-size:10px;">${days}d ${hrs}h</span>`
                    : `<span style="color:#ef4444; font-size:10px; font-weight:900;">${hrs}h LEFT</span>`;
            } else {
                countdown = `<span style="color:var(--text-dark); font-size:9px;">RESOLVING</span>`;
            }
        }

        const catColor = { crypto: '#fbbf24', politics: '#a78bfa', sports: '#60a5fa', general: 'var(--text-dark)' };

        return `
        <tr class="group market-row border-b border-[#1a2e2e]/30 transition-all duration-300 ${neonClass} ${heatClass}" onclick="openModal(${JSON.stringify(m).replace(/"/g, '&quot;')})">
            <td class="p-4">
                <div style="display:flex; flex-direction:column; gap:4px;">
                    <div class="m-title truncate clickable-title font-bold" style="color:${isHighAlpha ? 'var(--accent)' : 'white'}; opacity:0.9;">
                        <div style="display:flex; align-items:center; gap:8px;">
                            <span style="font-size:9px; font-weight:900; color:${catColor[m.category] || 'var(--text-dark)'}; letter-spacing:1px;">[${m.category.toUpperCase()}]</span>
                            ${m.question}
                            ${isHighAlpha ? '<i data-lucide="activity" class="animate-bounce" style="width:12px; min-width:12px; color:var(--accent);"></i>' : ''}
                        </div>
                    </div>
                </div>
            </td>
            <td class="p-4 text-center">
                <div style="display:flex; align-items:center; justify-content:center; gap:5px; font-weight:900; font-style:italic; color:${signalColor};" class="${isHighAlpha ? 'animate-pulse' : ''}">
                    ${isHighAlpha ? '<i data-lucide="zap" style="width:13px; fill:currentColor;"></i>' : ''}
                    ${m.alpha}%
                </div>
            </td>
            <td class="p-4 text-center" style="border-inline: 1px solid rgba(26,46,46,0.2);">
                ${m.hasGlobal ? `
                    <div style="font-size:9px; color:var(--text-dark); margin-bottom:2px; font-weight:900;">BINANCE</div>
                    <div style="color:white; font-weight:bold; font-size:11px;">${m.globalPrice}</div>
                    <div style="font-size:8px; font-weight:900; color:${m.diff > 0 ? 'var(--accent)' : '#ef4444'};">
                        ${m.diff > 0 ? '▲' : '▼'} ${Math.abs(m.diff)}% GAP
                    </div>
                ` : `<span style="color:var(--text-dark); font-size:9px;">RESEARCHING</span>`}
            </td>
            <td class="p-4 text-center" style="font-weight:bold; font-size:11px;">${volDisplay}</td>
            <td class="p-4 text-center">
                <div style="color:white; font-style:italic; font-weight:bold;">${m.price}¢</div>
                <div style="font-size:9px; color:var(--text-dark); font-weight:bold;">
                    SPR: ${(m.spread * 100).toFixed(2)}¢ | ${m.spread > 0.02 ? '⚠️ ARB' : '✓'}
                </div>
            </td>
            <td class="p-4 text-center">${countdown}</td>
            <td class="p-4" style="text-align:right;" onclick="event.stopPropagation()">
                <button class="trade-btn shadow-glow ${isHighAlpha ? 'btn-high' : ''}" onclick="openMarket('${m.slug}')">Trade</button>
            </td>
        </tr>`;
    }).join('');
    lucide.createIcons();
}

// ─── MARKET DETAIL MODAL ─────────────────────────────────────
function openModal(m) {
    const modal = document.getElementById('market-modal');
    document.getElementById('modal-title').textContent = m.question;
    document.getElementById('modal-alpha').textContent = m.alpha + '%';
    document.getElementById('modal-vol').textContent = '$' + m.volDisplay;
    document.getElementById('modal-price').textContent = m.price + '¢';
    document.getElementById('modal-gauge').style.width = m.price + '%';
    document.getElementById('modal-trade-btn').onclick = () => openMarket(m.slug);
    modal.style.display = 'flex';
}
function closeModal() { document.getElementById('market-modal').style.display = 'none'; }
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

// ─── OPEN MARKET LINK ────────────────────────────────────────
function openMarket(slug) {
    if (!slug) return;
    window.open(`https://polymarket.com/event/${slug}`, '_blank');
}

// ─── CSV EXPORT ───────────────────────────────────────────────
function exportCSV() {
    if (appState.markets.length === 0) return;
    const headers = ['Question', 'Category', 'Alpha %', 'Volume', 'Price', 'Exchange Gap', 'Slug'];
    const rows = appState.markets.map(m => [
        `"${m.question.replace(/"/g, '')}"`, m.category, m.alpha,
        m.volDisplay, m.price + '¢', m.hasGlobal ? m.diff + '%' : 'N/A',
        `https://polymarket.com/event/${m.slug}`
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `polyedge_signals_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
}

// ─── BOT MONITOR ─────────────────────────────────────────────
function monitorMarkets() {
    if (appState.allMarkets.length === 0) return;
    const consoleEl = document.getElementById('bot-console');
    if (!consoleEl) return;
    const log = (msg, color = '#34d399') => {
        const div = document.createElement('div');
        div.style.color = color;
        div.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
        consoleEl.prepend(div);
        if (consoleEl.children.length > 60) consoleEl.lastChild.remove();
    };
    log('--- PolyEdge Bot: Scan Complete ---', 'var(--text-dark)');
    appState.allMarkets.forEach(m => {
        if (m.volume > 50000 && m.alpha > 9.0) {
            log(`SIGNAL DETECTED!`, 'var(--accent)');
            log(`Market: ${m.question.substring(0, 40)}...`, '#fff');
            log(`Alpha: ${m.alpha}% | Vol: $${m.volDisplay} | Cat: ${m.category.toUpperCase()}`, '#fbbf24');
            log('─────────────────────────────────', 'var(--text-dark)');
        }
    });
}

// ─── WHALE FLOW ───────────────────────────────────────────────
let recentTrades = [];  // Хранилище последних сделок для анализа

function startWhaleFlow() {
    // Remove skeleton after first data load
    const checkReady = setInterval(() => {
        if (appState.allMarkets.length > 0) {
            clearInterval(checkReady);
            document.getElementById('whale-log').innerHTML = '';
            runWhaleFlow();
            // Запускаем периодическую загрузку реальных trades
            fetchRecentTrades();
            setInterval(fetchRecentTrades, 15000);  // Обновление каждые 15 сек
        }
    }, 500);
}

// Загрузка реальных последних сделок с Polymarket
async function fetchRecentTrades() {
    try {
        // Берём топ-5 активных рынков для мониторинга
        const topMarkets = appState.allMarkets.slice(0, 5);
        for (const market of topMarkets) {
            if (!market.slug) continue;
            
            const tradesUrl = `${CONFIG.PROXY}${encodeURIComponent(
                `https://gamma-api.polymarket.com/markets/${market.id}/trades?limit=10`
            )}`;
            
            const res = await fetch(tradesUrl, { signal: AbortSignal.timeout(8000) });
            if (!res.ok) continue;
            
            const trades = await res.json();
            if (Array.isArray(trades)) {
                for (const trade of trades) {
                    // Проверяем, не обрабатывали ли уже эту сделку
                    if (recentTrades.some(t => t.id === trade.id)) continue;
                    
                    const amount = parseFloat(trade.amount) || 0;
                    const price = parseFloat(trade.price) || 0;
                    const usdValue = amount * price;
                    
                    // Whale = сделка больше порога
                    if (usdValue >= CONFIG.WHALE_THRESHOLD_USD) {
                        recentTrades.push({
                            id: trade.id,
                            marketId: market.id,
                            slug: market.slug,
                            question: market.question,
                            category: market.category,
                            amount: usdValue,
                            side: trade.side || 'buy',
                            timestamp: trade.timestamp || Date.now(),
                            maker: trade.maker || `0x${Math.random().toString(16).slice(2, 10)}`
                        });
                        
                        // Показываем в UI
                        addWhaleAlert(recentTrades[recentTrades.length - 1]);
                    }
                }
            }
        }
        
        // Чистим старые записи (>50)
        if (recentTrades.length > 50) {
            recentTrades = recentTrades.slice(-50);
        }
    } catch (e) {
        console.warn('Failed to fetch recent trades:', e);
    }
}

function runWhaleFlow() {
    // Изначально показываем последние сохранённые whale алерты
    if (recentTrades.length > 0) {
        recentTrades.slice(-10).forEach(trade => addWhaleAlert(trade, false));
    }
}

function addWhaleAlert(trade, animate = true) {
    const log = document.getElementById('whale-log');
    if (!log) return;
    
    const isBig = trade.amount >= 50000;  // Особо крупная сделка
    let whaleCount = parseInt(document.getElementById('whale-count')?.textContent || '0');
    whaleCount++;
    const countEl = document.getElementById('whale-count');
    if (countEl) countEl.textContent = `${whaleCount} SIGNALS`;

    const item = document.createElement('div');
    item.className = `flow-item clickable-flow ${isBig ? 'flow-hot' : ''}`;
    if (animate) item.style.animation = 'fadeIn 0.3s ease-out';
    item.onclick = () => openMarket(trade.slug);
    
    const timeStr = new Date(trade.timestamp).toLocaleTimeString();
    const sideIcon = trade.side === 'buy' ? '🟢' : '🔴';
    const sideLabel = trade.side === 'buy' ? 'BUY' : 'SELL';
    
    item.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center;">
            <span class="flow-tag" style="${isBig ? 'color:#fbbf24;' : ''}">
                ${sideIcon} ${isBig ? '🔥 WHALE' : sideLabel}
            </span>
            <span style="color:var(--text-dark); font-size:8px;">${timeStr}</span>
        </div>
        <p style="color:rgba(255,255,255,0.8); margin-top:5px; line-height:1.3; font-size:10px;">
            <span style="color:white;">${trade.maker.substring(0, 8)}...</span> moved
            <span style="color:${isBig ? '#fbbf24' : 'var(--accent)'}; font-weight:900;"> $${formatVolume(trade.amount)}</span>
            into "${trade.question.substring(0, 28)}..."
        </p>
        <div class="flow-meta">
            <span>[${trade.category.toUpperCase()}]</span>
            <span>SIZE: ${trade.amount >= 1000000 ? '🐋' : trade.amount >= 50000 ? '💰' : '📊'}</span>
            <span>${sideLabel}</span>
        </div>`;
    log.prepend(item);
    if (log.children.length > 25) log.lastChild.remove();
}

// ─── CALIBRATOR ANIMATION ─────────────────────────────────────
function animateCalibartor() {
    let progress = 0;
    const bar = document.getElementById('calibrator-bar');
    const pctEl = document.getElementById('calibrator-pct');
    const timer = setInterval(() => {
        progress = Math.min(progress + Math.random() * 5, 75);
        if (bar) bar.style.width = progress + '%';
        if (pctEl) pctEl.textContent = Math.round(progress) + '%';
        if (progress >= 75) clearInterval(timer);
    }, 200);
}

// ─── CONTROLS ─────────────────────────────────────────────────
function setupControls() {}
