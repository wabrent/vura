// VURA - Prediction Terminal
const CONFIG = {
    API: "https://gamma-api.polymarket.com/events?closed=false&limit=40",
    REFRESH: 30000,
    WHALE_THRESHOLD_USD: 5000,
    ARBITRAGE_THRESHOLD: 1.0
};

let appState = {
    markets: [],
    allMarkets: [],
    arbitrageOpportunities: [],
    activeTab: 'all',
    loading: true,
    error: false
};

window.addEventListener('DOMContentLoaded', () => {
    setupTabs();
    fetchData();
    setInterval(fetchData, CONFIG.REFRESH);
    setInterval(runArbitrageScan, 45000);
    setTimeout(runArbitrageScan, 8000);
});

function setupTabs() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('tab-active'));
            btn.classList.add('tab-active');
            appState.activeTab = btn.dataset.tab;
            renderAll();
        });
    });
}

async function fetchData() {
    try {
        const res = await fetch(CONFIG.API);
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const data = await res.json();
        appState.allMarkets = data.map(event => processEvent(event));
        appState.error = false;
        appState.loading = false;
        document.getElementById('loading-state').classList.add('hidden');
        document.getElementById('error-state').classList.add('hidden');
        updateStats(data);
        renderAll();
    } catch (e) {
        console.warn('Fetch error:', e.message);
        appState.error = true;
        document.getElementById('loading-state').classList.add('hidden');
        document.getElementById('error-state').classList.remove('hidden');
    }
}

function updateStats(data) {
    const totalVol = data.reduce((sum, e) => sum + ((e.metrics && e.metrics.volume) || (e.volume24hr) || 0), 0);
    document.getElementById('market-count').textContent = data.length + ' markets';
    document.getElementById('global-vol').textContent = '$' + new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(totalVol);
}

function processEvent(event) {
    const mainMarket = event.markets && event.markets.length > 0 ? event.markets[0] : {};
    let yesPrice = 0.5, noPrice = 0.5;

    try {
        if (mainMarket && mainMarket.outcomePrices) {
            const parsed = typeof mainMarket.outcomePrices === 'string' ? JSON.parse(mainMarket.outcomePrices) : mainMarket.outcomePrices;
            yesPrice = parseFloat(parsed[0]) || 0;
            noPrice = parseFloat(parsed[1]) || 0;
        }
    } catch (e) {}

    const volume = mainMarket.volumeNum || mainMarket.volume || event.volume24hr || 0;
    const volChange = mainMarket.oneDayPriceChange || 0;
    
    let category = 'general';
    const lower = (event.title || '').toLowerCase();
    const cats = {
        crypto: ['bitcoin','ethereum','crypto','btc','eth','sol','token','blockchain','defi','nft'],
        politics: ['election','president','congress','trump','biden','vote','war','government','senate'],
        sports: ['nba','nfl','mlb','soccer','champion','super bowl','world cup']
    };
    for (const [cat, words] of Object.entries(cats)) {
        if (words.some(w => lower.includes(w))) { category = cat; break; }
    }

    const alpha = Math.min(5 + Math.min(volume / 500000, 2) + Math.random() * 3, 10).toFixed(1);
    const spread = Math.abs(yesPrice + noPrice - 1);

    return {
        id: event.id,
        question: event.title || 'Unknown',
        slug: event.slug || '',
        category,
        alpha: parseFloat(alpha),
        volume: parseFloat(volume) || 0,
        volDisplay: formatVol(volume),
        yesPrice, noPrice,
        spread,
        change24h: parseFloat(volChange) || 0
    };
}

function formatVol(v) {
    if (v >= 1e6) return (v/1e6).toFixed(1) + 'M';
    if (v >= 1e3) return (v/1e3).toFixed(1) + 'K';
    return Math.round(v).toString();
}

function renderAll() {
    if (appState.activeTab === 'arbitrage') {
        document.getElementById('market-feed').classList.add('hidden');
        document.getElementById('arbitrage-feed').classList.remove('hidden');
        renderArbitrage();
    } else {
        document.getElementById('arbitrage-feed').classList.add('hidden');
        document.getElementById('market-feed').classList.remove('hidden');
        renderMarkets();
    }
}

function renderMarkets() {
    let markets = [...appState.allMarkets];
    if (appState.activeTab !== 'all') {
        markets = markets.filter(m => m.category === appState.activeTab);
    }
    const container = document.getElementById('market-feed');
    if (!container) return;
    if (markets.length === 0) {
        container.innerHTML = '<div class="content-state"><p>No markets in this category.</p></div>';
        return;
    }
    container.innerHTML = markets.map(m => {
        const change = m.change24h;
        const changeClass = change > 0 ? 'change-up' : (change < 0 ? 'change-down' : '');
        const changeSign = change > 0 ? '+' : '';
        const price = Math.round(m.yesPrice * 100);
        return `<div class="market-card">
            <div class="card-left">
                <span class="card-category">${m.category.toUpperCase()}</span>
                <span class="card-title">${m.question}</span>
            </div>
            <div class="card-center">
                <div class="card-chart"></div>
            </div>
            <div class="card-right">
                <span class="card-price">${price}c</span>
                <span class="card-change ${changeClass}">${changeSign}${Math.abs(change).toFixed(1)}%</span>
                <span class="card-volume">$${m.volDisplay} | Alpha ${m.alpha}</span>
                <a class="btn-trade" href="https://polymarket.com/event/${m.slug}" target="_blank" onclick="event.stopPropagation()">Trade</a>
            </div>
        </div>`;
    }).join('');
}

async function runArbitrageScan() {
    try {
        const res = await fetch('https://manifold.markets/api/v0/markets?limit=50&sort=liquidity');
        if (!res.ok) throw new Error('Manifold error');
        const data = await res.json();
        const manifold = (Array.isArray(data) ? data : [])
            .filter(m => m.outcomeType === 'BINARY' && typeof m.probability === 'number')
            .map(m => ({ id: m.id, question: m.question, yesPrice: m.probability, volume: m.volume || 0, source: 'manifold' }));
        findArbitrage(manifold);
        if (appState.activeTab === 'arbitrage') renderArbitrage();
    } catch (e) {
        // No Manifold data, just use internal spreads
        findArbitrage([]);
    }
}

function findArbitrage(manifold) {
    const ops = [];
    const threshold = appState.arbitrageThreshold;
    
    // Internal spreads
    for (const pm of appState.allMarkets) {
        if (!pm.yesPrice || !pm.noPrice) continue;
        const spreadPct = Math.abs(pm.yesPrice + pm.noPrice - 1) * 100;
        if (spreadPct >= threshold && pm.yesPrice > 0.02 && pm.yesPrice < 0.98) {
            ops.push({
                market: pm, platform: 'SPREAD',
                gap: spreadPct.toFixed(1),
                priceA: pm.yesPrice, priceB: pm.noPrice
            });
        }
    }

    // Cross-platform
    for (const pm of appState.allMarkets.slice(0, 10)) {
        const kw = pm.question.toLowerCase().split(/\s+/).filter(w => w.length > 3);
        for (const m of manifold.slice(0, 20)) {
            const overlap = kw.filter(k => m.question.toLowerCase().includes(k)).length;
            if (overlap >= 1 && m.volume > 50) {
                const diff = Math.abs(pm.yesPrice - m.yesPrice) * 100;
                if (diff >= threshold) {
                    ops.push({
                        market: pm, platform: 'MANIFOLD',
                        gap: diff.toFixed(1),
                        priceA: pm.yesPrice, priceB: m.yesPrice
                    });
                }
            }
        }
    }

    appState.arbitrageOpportunities = ops
        .sort((a, b) => parseFloat(b.gap) - parseFloat(a.gap))
        .slice(0, 15);
}

function renderArbitrage() {
    const container = document.getElementById('arbitrage-feed');
    if (!container) return;
    if (appState.arbitrageOpportunities.length === 0) {
        container.innerHTML = '<div class="content-state"><p>No arbitrage signals found. Scanning internal spreads and cross-platform...</p></div>';
        return;
    }
    container.innerHTML = appState.arbitrageOpportunities.map(a => {
        const pmPrice = Math.round(a.priceA * 100);
        const otherPrice = Math.round(a.priceB * 100);
        return `<div class="arb-card">
            <div class="arb-left">
                <span class="arb-platform">${a.platform}</span>
                <span class="arb-title">${(a.market.question || '').substring(0, 45)}</span>
            </div>
            <div class="arb-center">
                <div class="arb-price-pair">
                    <span class="arb-pm-price">${pmPrice}c</span>
                    <span class="arb-arrow">→</span>
                    <span class="arb-other-price">${otherPrice}c</span>
                </div>
            </div>
            <div class="arb-right">
                <span class="arb-gap">+${a.gap}%</span>
                <span class="arb-label">Gap</span>
            </div>
        </div>`;
    }).join('');
}