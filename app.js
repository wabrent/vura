const CONFIG = {
    API: "https://gamma-api.polymarket.com/events?closed=false&limit=40",
    REFRESH: 30000, WHALE_THRESHOLD_USD: 5000, ARBITRAGE_THRESHOLD: 1.0
};

let appState = {
    markets: [], allMarkets: [], arbitrageOpportunities: [],
    activeTab: 'all', searchQuery: '', sortBy: 'volume',
    loading: true, error: false,
    watchlist: new Set(JSON.parse(localStorage.getItem('vura_watchlist') || '[]')),
    alerts: JSON.parse(localStorage.getItem('vura_alerts') || '[]'),
    selectedMarket: null, modalChart: null, currentTf: '24H', whaleEvents: []
};

window.addEventListener('DOMContentLoaded', () => {
    setupTabs(); setupSearch(); setupSort(); setupCardClicks();
    setupKeyboard(); setupPnlCalc(); generateWhaleData();
    fetchData();
    setInterval(fetchData, CONFIG.REFRESH);
    setInterval(runArbitrageScan, 45000);
    setInterval(tickAlerts, 10000);
    setInterval(tickWhales, 15000);
    setTimeout(runArbitrageScan, 8000);
});

function setupTabs() {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });
}

function switchTab(tab) {
    appState.activeTab = tab;
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('tab-active', b.dataset.tab === tab));
    renderAll(); updateBadges();
}

function setupSearch() {
    const input = document.getElementById('search-input');
    if (!input) return;
    input.addEventListener('input', () => {
        appState.searchQuery = input.value.toLowerCase();
        if (!['arbitrage','watchlist','whale','alerts'].includes(appState.activeTab)) renderMarkets();
    });
}

function setupSort() {
    const select = document.getElementById('sort-select');
    if (!select) return;
    select.addEventListener('change', () => {
        appState.sortBy = select.value;
        if (!['arbitrage','watchlist','whale','alerts'].includes(appState.activeTab)) renderMarkets();
    });
}

function setupCardClicks() {
    ['market-feed','watchlist-feed'].forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.addEventListener('click', (e) => {
            if (e.target.closest('a')) return;
            const starBtn = e.target.closest('.star-btn');
            if (starBtn) { e.stopPropagation(); toggleWatchlist(starBtn.dataset.id); return; }
            const card = e.target.closest('.market-card');
            if (card) openModal(card.dataset.id);
        });
    });
}

function setupKeyboard() {
    const tabs = ['all','crypto','politics','sports','arbitrage','watchlist','whale','alerts'];
    document.addEventListener('keydown', (e) => {
        const tag = document.activeElement.tagName;
            if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') {
                if (e.key === 'Escape') { document.activeElement.blur(); closeModal(); closeAlertModal(); closeTradeModal(); }
                return;
            }
            if (e.key === 'Escape') { closeModal(); closeAlertModal(); closeTradeModal(); return; }
        if (e.key === '/') { e.preventDefault(); document.getElementById('search-input').focus(); return; }
        if (e.key === 'w' || e.key === 'W') { if (appState.selectedMarket) { toggleWatchlist(appState.selectedMarket.id); } return; }
        if (e.key === 'a' || e.key === 'A') { if (appState.selectedMarket) { openAlertFromModal(); } return; }
        const n = parseInt(e.key);
        if (n >= 1 && n <= 8 && tabs[n-1]) switchTab(tabs[n-1]);
    });
}

async function fetchData() {
    try {
        let data = null;
        const urls = [
            CONFIG.API,
            '/api/proxy?url=' + encodeURIComponent(CONFIG.API)
        ];
        for (const url of urls) {
            try {
                const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
                if (res.ok) { data = await res.json(); break; }
            } catch (e) { continue; }
        }
        if (!data) throw new Error('All endpoints failed');
        const events = Array.isArray(data) ? data : (data.data || data.events || []);
        appState.allMarkets = events.map(event => processEvent(event));
        appState.error = false; appState.loading = false;
        document.getElementById('loading-state').classList.add('hidden');
        document.getElementById('error-state').classList.add('hidden');
        updateStats(events); renderAll(); updateBadges(); tickAlerts();
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
    const markets = event.markets || [];
    const mainMarket = markets.find(m => m.active && !m.closed) || markets.find(m => m.active) || markets[0] || {};
    let yesPrice = 0.5, noPrice = 0.5;
    try {
        if (mainMarket && mainMarket.outcomePrices) {
            const parsed = typeof mainMarket.outcomePrices === 'string' ? JSON.parse(mainMarket.outcomePrices) : mainMarket.outcomePrices;
            yesPrice = parseFloat(parsed[0]) || 0;
            noPrice = parseFloat(parsed[1]) || 0;
        }
    } catch (e) {}
    const volume = mainMarket.volumeNum || mainMarket.volume || event.volume24hr || 0;
    const change24h = mainMarket.oneDayPriceChange || 0;
    let category = 'general';
    const lower = (event.title || '').toLowerCase();
    const cats = {
        crypto: ['bitcoin','ethereum','crypto','btc','eth','sol','token','blockchain','defi','nft'],
        politics: ['election','president','congress','trump','biden','vote','war','government','senate'],
        sports: ['nba','nfl','mlb','soccer','champion','super bowl','world cup']
    };
    for (const [cat, words] of Object.entries(cats)) if (words.some(w => lower.includes(w))) { category = cat; break; }
    
    // Real Alpha: volume weight + spread bonus + activity
    const volumeScore = Math.min(volume / 500000, 3);
    const spreadScore = Math.abs(yesPrice + noPrice - 1) * 500;
    const activityScore = Math.abs(change24h) * 100;
    const alpha = Math.min(5 + volumeScore + spreadScore + activityScore, 10).toFixed(1);
    
    const spread = Math.abs(yesPrice + noPrice - 1);
    return { id: event.id, question: event.title || 'Unknown', slug: event.slug || '', category, alpha: parseFloat(alpha), volume: parseFloat(volume) || 0, volDisplay: formatVol(volume), yesPrice, noPrice, spread, change24h: parseFloat(change24h) || 0, clobTokenIds: mainMarket.clobTokenIds, yesTokenId: getTokenId(mainMarket.clobTokenIds, 0), noTokenId: getTokenId(mainMarket.clobTokenIds, 1) };
}

function formatVol(v) {
    if (v >= 1e6) return (v/1e6).toFixed(1) + 'M';
    if (v >= 1e3) return (v/1e3).toFixed(1) + 'K';
    return Math.round(v).toString();
}

function getTokenId(clobTokenIds, idx) {
    try {
        if (!clobTokenIds) return null;
        const ids = typeof clobTokenIds === 'string' ? JSON.parse(clobTokenIds) : clobTokenIds;
        return ids[idx] || null;
    } catch { return null; }
}

function renderAll() {
    ['market-feed','arbitrage-feed','watchlist-feed','whale-feed','alerts-feed'].forEach(id => document.getElementById(id).classList.add('hidden'));
    switch (appState.activeTab) {
        case 'arbitrage': document.getElementById('arbitrage-feed').classList.remove('hidden'); renderArbitrage(); break;
        case 'watchlist': document.getElementById('watchlist-feed').classList.remove('hidden'); renderWatchlist(); break;
        case 'whale':     document.getElementById('whale-feed').classList.remove('hidden'); renderWhale(); break;
        case 'alerts':    document.getElementById('alerts-feed').classList.remove('hidden'); renderAlerts(); break;
        default:          document.getElementById('market-feed').classList.remove('hidden'); renderMarkets(); break;
    }
}

function renderMarkets(feedId = 'market-feed', markets = null) {
    let ms = markets || [...appState.allMarkets];
    if (!markets) {
        if (appState.activeTab !== 'all') ms = ms.filter(m => m.category === appState.activeTab);
        if (appState.searchQuery) ms = ms.filter(m => m.question.toLowerCase().includes(appState.searchQuery));
        ms.sort((a, b) => { switch (appState.sortBy) { case 'alpha': return b.alpha - a.alpha; case 'price': return b.yesPrice - a.yesPrice; case 'category': return a.category.localeCompare(b.category); default: return b.volume - a.volume; } });
    }
    const container = document.getElementById(feedId);
    if (!container) return;
    if (ms.length === 0) { container.innerHTML = '<div class="content-state"><p>No markets found.</p></div>'; return; }
    container.innerHTML = ms.map((m, i) => buildCard(m, i)).join('');
}

function buildCard(m, i) {
    const delay = i * 30; const price = Math.round(m.yesPrice * 100);
    const inWl = appState.watchlist.has(String(m.id));
    const spreadBadge = m.spread > 0.01 ? `<span class="spread-badge">SPREAD ${(m.spread*100).toFixed(2)}%</span>` : '';
    const chgClass = m.change24h > 0 ? 'change-up' : m.change24h < 0 ? 'change-down' : '';
    const chgSign = m.change24h > 0 ? '+' : '';
    const chgStr = Math.abs(m.change24h * 100) > 0.1 ? `<span class="card-change ${chgClass}">${chgSign}${(m.change24h*100).toFixed(1)}% 24h</span>` : '';
    const sparkData = generateSparkData(m.yesPrice, 20);
    const sparkSvg = buildSparkline(sparkData, 80, 28);
    return `<div class="market-card" style="animation-delay:${delay}ms" data-id="${m.id}" data-slug="${m.slug}">
        <div class="card-left">
            <span class="card-category">${m.category.toUpperCase()}</span>
            <span class="card-title">${m.question}</span>
            <span class="card-meta">Vol $${m.volDisplay} · Alpha ${m.alpha}${spreadBadge ? ' · ' + spreadBadge : ''}</span>
        </div>
        <div class="card-center">${sparkSvg}</div>
        <div class="card-right">
            <span class="card-price">${price}c</span>
            ${chgStr}
            <div class="card-actions">
                <button class="star-btn${inWl ? ' starred' : ''}" data-id="${m.id}" title="Watchlist">★</button>
                <button class="btn-trade" onclick="event.stopPropagation();window.open('https://polymarket.com/event/${m.slug}','_blank')">Trade</button>
            </div>
        </div>
    </div>`;
}

function generateSparkData(basePrice, points) {
    const arr = [basePrice];
    for (let i = 1; i < points; i++) { const prev = arr[arr.length - 1]; arr.push(Math.max(0.02, Math.min(0.98, prev + (Math.random() - 0.49) * 0.03))); }
    return arr;
}

function buildSparkline(data, w, h) {
    const min = Math.min(...data), max = Math.max(...data), range = max - min || 0.01;
    const pts = data.map((v, i) => { const x = (i / (data.length - 1)) * w; const y = h - ((v - min) / range) * (h - 4) - 2; return `${x.toFixed(1)},${y.toFixed(1)}`; }).join(' ');
    const color = data[data.length - 1] >= data[0] ? '#059669' : '#dc2626';
    return `<svg width="${w}" height="${h}" style="display:block;overflow:visible"><polyline points="${pts}" fill="none" stroke="${color}" stroke-width="1.5" stroke-linejoin="round" opacity="0.8"/></svg>`;
}

function toggleWatchlist(id) {
    id = String(id);
    if (appState.watchlist.has(id)) appState.watchlist.delete(id); else appState.watchlist.add(id);
    localStorage.setItem('vura_watchlist', JSON.stringify([...appState.watchlist]));
    updateBadges(); renderAll();
    if (appState.selectedMarket && String(appState.selectedMarket.id) === id) updateModalWlBtn();
}

function renderWatchlist() {
    const ms = appState.allMarkets.filter(m => appState.watchlist.has(String(m.id)));
    if (ms.length === 0) { document.getElementById('watchlist-feed').innerHTML = '<div class="content-state"><p>No markets in watchlist. Click ★ on any market to add.</p></div>'; return; }
    renderMarkets('watchlist-feed', ms);
}

function toggleWatchlistModal() {
    if (!appState.selectedMarket) return;
    toggleWatchlist(appState.selectedMarket.id); updateModalWlBtn();
}

function updateModalWlBtn() {
    const btn = document.getElementById('modal-wl-btn');
    if (!btn || !appState.selectedMarket) return;
    const inWl = appState.watchlist.has(String(appState.selectedMarket.id));
    btn.textContent = inWl ? '★ Remove' : '★ Watchlist';
    btn.classList.toggle('wl-active', inWl);
}

function openModal(id) {
    const m = appState.allMarkets.find(m => String(m.id) === String(id));
    if (!m) return;
    appState.selectedMarket = m;
    document.getElementById('modal-market-title').textContent = m.question;
    document.getElementById('modal-yes').textContent = Math.round(m.yesPrice * 100) + 'c';
    document.getElementById('modal-no').textContent = Math.round(m.noPrice * 100) + 'c';
    document.getElementById('modal-vol').textContent = '$' + m.volDisplay;
    document.getElementById('modal-alpha').textContent = m.alpha;
    document.getElementById('modal-trade-link').onclick = (e) => { e.preventDefault(); quickTrade(m.slug); };
    document.getElementById('modal-trade-link').href = '#';
    updateModalWlBtn(); calcPnl();
    document.getElementById('pnl-modal').classList.remove('hidden');
    document.body.classList.add('modal-open');
    appState.currentTf = '24H';
    document.querySelectorAll('.tf-btn').forEach(b => b.classList.toggle('tf-active', b.dataset.tf === '24H'));
    drawModalChart(m, '24H');
    document.querySelectorAll('.tf-btn').forEach(btn => { btn.onclick = () => { document.querySelectorAll('.tf-btn').forEach(b => b.classList.remove('tf-active')); btn.classList.add('tf-active'); appState.currentTf = btn.dataset.tf; drawModalChart(m, btn.dataset.tf); }; });
}

function drawModalChart(m, tf) {
    try {
        const pts = tf === '1H' ? 30 : tf === '24H' ? 48 : 56;
        const data = generateSparkData(m.yesPrice, pts);
        const labels = generateTimeLabels(pts, tf);
        
        if (appState.modalChart) {
            appState.modalChart.destroy();
            appState.modalChart = null;
        }
        
        const canvas = document.getElementById('modal-chart');
        if (!canvas) return;
        
        // Reset canvas
        const parent = canvas.parentElement;
        canvas.remove();
        const newCanvas = document.createElement('canvas');
        newCanvas.id = 'modal-chart';
        newCanvas.style.width = '100%';
        newCanvas.style.height = '120px';
        parent.appendChild(newCanvas);
        
        const ctx = newCanvas.getContext('2d');
        const color = data[data.length-1] >= data[0] ? '#059669' : '#dc2626';
        
        appState.modalChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels,
                datasets: [{
                    data: data.map(v => Math.round(v * 100)),
                    borderColor: color,
                    borderWidth: 1.5,
                    pointRadius: 0,
                    tension: 0.35,
                    fill: true,
                    backgroundColor: color === '#059669' ? 'rgba(5,150,105,0.06)' : 'rgba(220,38,38,0.06)'
                }]
            },
            options: {
                responsive: false,
                animation: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { grid: { display: false }, ticks: { color: '#737373', font: { size: 8 }, maxTicksLimit: 6 } },
                    y: { grid: { color: '#e5e5e5' }, ticks: { color: '#737373', font: { size: 8 }, callback: v => v + 'c' }, min: 0, max: 100 }
                }
            }
        });
    } catch (e) {
        console.warn('Chart error:', e);
    }
}

function generateTimeLabels(pts, tf) {
    const labels = []; const now = new Date();
    const step = tf === '1H' ? 2 * 60000 : tf === '24H' ? 30 * 60000 : 3 * 3600000;
    for (let i = pts - 1; i >= 0; i--) {
        const d = new Date(now - i * step);
        if (tf === '7D') labels.push(d.toLocaleDateString([], { month: 'short', day: 'numeric' }));
        else labels.push(d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    }
    return labels;
}

function closeModal() {
    document.getElementById('pnl-modal').classList.add('hidden');
    document.body.classList.remove('modal-open');
    if (appState.modalChart) {
        try { appState.modalChart.destroy(); } catch (e) {}
        appState.modalChart = null;
    }
    appState.selectedMarket = null;
}

function handleModalOverlayClick(e) { if (e.target.id === 'pnl-modal') closeModal(); }

// ── ALERTS ──────────────────────────────────────────────────────────────────
function openAlertFromModal() {
    const m = appState.selectedMarket; if (!m) return;
    document.getElementById('alert-mkt-name').textContent = m.question.substring(0, 60) + (m.question.length > 60 ? '...' : '');
    document.getElementById('alert-price-val').value = Math.round(m.yesPrice * 100);
    document.getElementById('alert-modal').classList.remove('hidden');
}

function closeAlertModal() { document.getElementById('alert-modal').classList.add('hidden'); }
function handleAlertOverlayClick(e) { if (e.target.id === 'alert-modal') closeAlertModal(); }

function saveAlert() {
    const m = appState.selectedMarket; if (!m) return;
    const dir = document.getElementById('alert-dir').value;
    const val = parseInt(document.getElementById('alert-price-val').value);
    if (!val || val < 1 || val > 99) return;
    appState.alerts.push({ id: Date.now(), marketId: m.id, question: m.question, dir, val, triggered: false });
    localStorage.setItem('vura_alerts', JSON.stringify(appState.alerts));
    closeAlertModal(); updateBadges();
    if (appState.activeTab === 'alerts') renderAlerts();
    showToast('Alert set: ' + m.question.substring(0, 30) + '...');
}

function renderAlerts() {
    const container = document.getElementById('alerts-feed');
    if (appState.alerts.length === 0) { container.innerHTML = '<div class="content-state"><p>No alerts set. Press A on any market.</p></div>'; return; }
    container.innerHTML = `<div class="alerts-list">${appState.alerts.map(a => {
        const m = appState.allMarkets.find(m => m.id === a.marketId);
        const cp = m ? Math.round(m.yesPrice * 100) : '?';
        return `<div class="alert-row${a.triggered ? ' alert-row-triggered' : ''}">
            <div class="alert-info"><span class="alert-mkt">${a.question.substring(0, 50)}</span><span class="alert-cond">${a.dir.toUpperCase()} ${a.val}c · now: ${cp}c${a.triggered ? ' TRIGGERED' : ''}</span></div>
            <button class="alert-del" onclick="deleteAlert(${a.id})">✕</button></div>`;
    }).join('')}</div>`;
}

function deleteAlert(id) { appState.alerts = appState.alerts.filter(a => a.id !== id); localStorage.setItem('vura_alerts', JSON.stringify(appState.alerts)); updateBadges(); renderAlerts(); }

function tickAlerts() {
    let changed = false;
    appState.alerts.forEach(a => {
        const m = appState.allMarkets.find(m => m.id === a.marketId); if (!m) return;
        const price = Math.round(m.yesPrice * 100);
        if ((a.dir === 'above' && price >= a.val || a.dir === 'below' && price <= a.val) && !a.triggered) {
            a.triggered = true; changed = true;
            showToast('Alert: ' + a.question.substring(0, 30) + '...');
        }
    });
    if (changed) { localStorage.setItem('vura_alerts', JSON.stringify(appState.alerts)); if (appState.activeTab === 'alerts') renderAlerts(); }
}

// ── PNL ─────────────────────────────────────────────────────────────────────

function setupPnlCalc() {
    ['pnl-stake','pnl-side','pnl-exit'].forEach(id => { const el = document.getElementById(id); if (el) el.addEventListener('input', calcPnl); });
}

function calcPnl() {
    const m = appState.selectedMarket; if (!m) return;
    const stake = parseFloat(document.getElementById('pnl-stake').value) || 100;
    const side = document.getElementById('pnl-side').value;
    const exitCents = parseFloat(document.getElementById('pnl-exit').value) || 90;
    const entry = side === 'yes' ? m.yesPrice : m.noPrice;
    const exit = exitCents / 100;
    const shares = stake / entry; const payout = shares * exit;
    const pnl = payout - stake; const roi = (pnl / stake * 100).toFixed(1);
    document.getElementById('res-shares').textContent = shares.toFixed(2);
    document.getElementById('res-payout').textContent = '$' + payout.toFixed(2);
    const pnlEl = document.getElementById('res-pnl');
    pnlEl.textContent = (pnl >= 0 ? '+' : '') + '$' + pnl.toFixed(2);
    pnlEl.className = 'pnl-result-val pnl-big ' + (pnl >= 0 ? 'accent' : 'red');
    const roiEl = document.getElementById('res-roi');
    roiEl.textContent = (roi >= 0 ? '+' : '') + roi + '%';
    roiEl.className = 'pnl-result-val ' + (roi >= 0 ? 'accent' : 'red');
}

// ── WALLET ───────────────────────────────────────────────────────────────────
let walletAddress = null;

function connectWallet() {
    // Show wallet selector modal instead of auto-connecting
    document.getElementById('wallet-modal').classList.remove('hidden');
    document.body.classList.add('modal-open');
}

function closeWalletModal() {
    document.getElementById('wallet-modal').classList.add('hidden');
    document.body.classList.remove('modal-open');
    // Reset to options view
    document.getElementById('wallet-options').classList.remove('hidden');
    document.getElementById('wallet-connecting').classList.add('hidden');
}

function showWalletConnecting(text) {
    document.getElementById('wallet-options').classList.add('hidden');
    document.getElementById('wallet-connecting').classList.remove('hidden');
    document.getElementById('wallet-connecting-text').textContent = text;
}

async function switchToPolygon(provider) {
    try {
        await provider.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: '0x89' }] });
    } catch (e) {
        if (e.code === 4902) {
            await provider.request({
                method: 'wallet_addEthereumChain',
                params: [{ chainId: '0x89', chainName: 'Polygon', nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 }, rpcUrls: ['https://polygon-rpc.com'], blockExplorerUrls: ['https://polygonscan.com'] }]
            });
        }
    }
}

function onWalletConnected(address) {
    walletAddress = address;
    const short = address.slice(0, 6) + '...' + address.slice(-4);
    const btn = document.getElementById('wallet-btn');
    btn.textContent = short;
    btn.classList.add('wallet-connected');
    closeWalletModal();
    showToast('Connected: ' + short);
}

async function connectMetaMask() {
    // Find MetaMask specifically (not Coinbase or others injected as window.ethereum)
    const provider = window.ethereum?.providers?.find(p => p.isMetaMask && !p.isCoinbaseWallet)
        || (window.ethereum?.isMetaMask && !window.ethereum?.isCoinbaseWallet ? window.ethereum : null);

    if (!provider) {
        window.open('https://metamask.io/download/', '_blank');
        showToast('MetaMask not found — install it first');
        return;
    }
    try {
        showWalletConnecting('Opening MetaMask...');
        const accounts = await provider.request({ method: 'eth_requestAccounts' });
        if (!accounts.length) throw new Error('No accounts');
        await switchToPolygon(provider);
        onWalletConnected(accounts[0]);
    } catch (e) {
        document.getElementById('wallet-options').classList.remove('hidden');
        document.getElementById('wallet-connecting').classList.add('hidden');
        showToast(e.code === 4001 ? 'Rejected by user' : 'MetaMask connection failed');
    }
}

async function connectCoinbase() {
    const provider = window.ethereum?.providers?.find(p => p.isCoinbaseWallet)
        || (window.ethereum?.isCoinbaseWallet ? window.ethereum : null);

    if (!provider) {
        window.open('https://www.coinbase.com/wallet/downloads', '_blank');
        showToast('Coinbase Wallet not found — install it first');
        return;
    }
    try {
        showWalletConnecting('Opening Coinbase Wallet...');
        const accounts = await provider.request({ method: 'eth_requestAccounts' });
        if (!accounts.length) throw new Error('No accounts');
        await switchToPolygon(provider);
        onWalletConnected(accounts[0]);
    } catch (e) {
        document.getElementById('wallet-options').classList.remove('hidden');
        document.getElementById('wallet-connecting').classList.add('hidden');
        showToast(e.code === 4001 ? 'Rejected by user' : 'Coinbase Wallet connection failed');
    }
}

async function connectRabby() {
    const provider = window.ethereum?.providers?.find(p => p.isRabby)
        || (window.ethereum?.isRabby ? window.ethereum : null)
        || window.rabby
        || null;

    if (!provider) {
        window.open('https://rabby.io/', '_blank');
        showToast('Rabby not found — install it first');
        return;
    }
    try {
        showWalletConnecting('Opening Rabby...');
        const accounts = await provider.request({ method: 'eth_requestAccounts' });
        if (!accounts.length) throw new Error('No accounts');
        await switchToPolygon(provider);
        onWalletConnected(accounts[0]);
    } catch (e) {
        document.getElementById('wallet-options').classList.remove('hidden');
        document.getElementById('wallet-connecting').classList.add('hidden');
        showToast(e.code === 4001 ? 'Rejected by user' : 'Rabby connection failed');
    }
}

async function connectWalletConnect() {
    // WalletConnect requires their SDK; redirect to Polymarket which has it built in
    showToast('Use WalletConnect on Polymarket directly');
    setTimeout(() => window.open('https://polymarket.com', '_blank'), 600);
    closeWalletModal();
}

function openTradeModal(slug) {
    const m = appState.allMarkets.find(m => m.slug === slug);
    if (!m) return;
    document.getElementById('trade-mkt-name').textContent = m.question.substring(0, 50);
    document.getElementById('trade-bid').textContent = Math.round(m.yesPrice * 100) + 'c';
    document.getElementById('trade-ask').textContent = Math.round((1 - m.yesPrice) * 100) + 'c';
    document.getElementById('trade-price').value = Math.round(m.yesPrice * 100);
    document.getElementById('trade-amount').value = 10;
    document.getElementById('trade-status').textContent = '';
    document.getElementById('trade-modal').classList.remove('hidden');
    document.body.classList.add('modal-open');
    updateTradeEstimate();
}

function closeTradeModal() {
    document.getElementById('trade-modal').classList.add('hidden');
    document.body.classList.remove('modal-open');
}

function handleTradeOverlayClick(e) {
    if (e.target.id === 'trade-modal') closeTradeModal();
}

function updateTradePrice() {
    const m = findTradeMarket();
    if (!m) return;
    const outcome = document.getElementById('trade-outcome').value;
    const price = outcome === 'YES' ? Math.round(m.yesPrice * 100) : Math.round(m.noPrice * 100);
    document.getElementById('trade-price').value = price;
    updateTradeEstimate();
}

function findTradeMarket() {
    const nameEl = document.getElementById('trade-mkt-name');
    if (!nameEl) return null;
    return appState.allMarkets.find(m => m.question.substring(0, 50) === nameEl.textContent);
}

function updateTradeEstimate() {
    const price = parseFloat(document.getElementById('trade-price').value) || 0;
    const amount = parseFloat(document.getElementById('trade-amount').value) || 0;
    if (price > 0 && amount > 0) {
        const shares = (amount / (price / 100)).toFixed(2);
        document.getElementById('trade-shares').textContent = shares;
        document.getElementById('trade-total').textContent = '$' + amount.toFixed(2);
    }
}

function submitTrade() {
    const statusEl = document.getElementById('trade-status');
    const m = findTradeMarket();
    if (!m) return;
    statusEl.textContent = 'Opening Polymarket...';
    statusEl.style.color = 'var(--accent)';
    window.open('https://polymarket.com/event/' + m.slug, '_blank');
    closeTradeModal();
}

function quickTrade(slug) {
    openTradeModal(slug);
}

// ── WHALE FLOW ──────────────────────────────────────────────────────────────
const WHALE_NAMES = ['0x3f...a12','0x8b...c44','0x1d...f88','0xaa...901','0x5c...b22','0x9e...d55','0x2f...710','0x7a...e33'];
const SIDES = ['YES','NO'];

function generateWhaleData() {
    const now = Date.now()
    const signals = []
    
    // Signal 1: Top volume markets
    const byVol = [...appState.allMarkets].sort((a,b) => b.volume - a.volume).slice(0, 5)
    byVol.forEach((m, i) => {
        signals.push({ time: new Date(now - i * 1000), addr: 'VOLUME', market: m.question, slug: m.slug, side: `$${m.volDisplay}`, amount: m.volume, isNew: i < 2, signalType: 'volume' })
    })
    
    // Signal 2: Biggest 24h movers
    const byChange = [...appState.allMarkets].sort((a,b) => Math.abs(b.change24h) - Math.abs(a.change24h)).slice(0, 5)
    byChange.forEach((m, i) => {
        const dir = m.change24h > 0 ? 'UP' : 'DOWN'
        signals.push({ time: new Date(now - i * 1000), addr: '24H', market: m.question, slug: m.slug, side: `${dir} ${Math.abs(m.change24h*100).toFixed(1)}%`, amount: Math.abs(m.change24h*100), isNew: false, signalType: 'change' })
    })
    
    // Signal 3: Spread opportunities
    const bySpread = [...appState.allMarkets].filter(m => m.spread > 0.005).sort((a,b) => b.spread - a.spread).slice(0, 5)
    bySpread.forEach((m, i) => {
        signals.push({ time: new Date(now - i * 1000), addr: 'SPREAD', market: m.question, slug: m.slug, side: `${(m.spread*100).toFixed(2)}% gap`, amount: m.spread*100, isNew: false, signalType: 'spread' })
    })
    
    appState.whaleEvents = signals.slice(0, 15)
}

function tickWhales() {
    generateWhaleData()
    if (appState.activeTab === 'whale') renderWhale()
}

function renderWhale() {
    const container = document.getElementById('whale-feed')
    if (!appState.whaleEvents.length) { container.innerHTML = '<div class="content-state"><p>No data yet</p></div>'; return; }
    const volSignals = appState.whaleEvents.filter(w => w.signalType === 'volume') 
    const changeSignals = appState.whaleEvents.filter(w => w.signalType === 'change')
    const spreadSignals = appState.whaleEvents.filter(w => w.signalType === 'spread')
    
    container.innerHTML = `
    <div class="whale-stats">
        <div class="whale-stat"><span class="whale-stat-label">TOP VOLUME</span><span class="whale-stat-val">${volSignals.length} markets</span></div>
        <div class="whale-stat"><span class="whale-stat-label">24H MOVERS</span><span class="whale-stat-val accent">${changeSignals.length} moves</span></div>
        <div class="whale-stat"><span class="whale-stat-label">SPREAD GAPS</span><span class="whale-stat-val" style="color:#f59e0b">${spreadSignals.length} gaps</span></div>
    </div>
    <div class="whale-header"><span>SIGNAL</span><span>MARKET</span><span>VALUE</span></div>
    ${appState.whaleEvents.map(w => {
        let bg = ''
        if (w.signalType === 'volume') bg = 'background:rgba(5,150,105,0.03)'
        if (w.signalType === 'spread') bg = 'background:rgba(245,158,11,0.03)'
        return `<div class="whale-row${w.isNew ? ' whale-row-new' : ''}" style="${bg};cursor:pointer" onclick="window.open('https://polymarket.com/event/${w.slug}','_blank')">
            <span class="whale-addr">${w.addr}</span>
            <span class="whale-mkt">${w.market.substring(0, 38)}${w.market.length > 38 ? '...' : ''}</span>
            <span class="${w.signalType === 'spread' ? 'red' : w.side.includes('UP') ? 'accent' : w.side.includes('DOWN') ? 'red' : ''}">${w.side}</span>
        </div>`
    }).join('')}`;
}

// ── BADGES / TOAST ──────────────────────────────────────────────────────────
function updateBadges() {
    const wlEl = document.getElementById('watchlist-count');
    const alEl = document.getElementById('alert-count');
    if (wlEl) wlEl.textContent = appState.watchlist.size || '';
    if (alEl) alEl.textContent = appState.alerts.length || '';
}

function showToast(msg) {
    let t = document.getElementById('vura-toast');
    if (!t) { t = document.createElement('div'); t.id = 'vura-toast'; t.className = 'toast'; document.body.appendChild(t); }
    t.textContent = msg; t.classList.add('toast-show');
    clearTimeout(t._timeout); t._timeout = setTimeout(() => t.classList.remove('toast-show'), 3500);
}

// ── ARBITRAGE ───────────────────────────────────────────────────────────────
async function runArbitrageScan() {
    try {
        const manifoldUrl = 'https://manifold.markets/api/v0/markets?limit=50&sort=liquidity';
        let data = null;
        for (const url of [manifoldUrl, '/api/proxy?url=' + encodeURIComponent(manifoldUrl)]) {
            try { const r = await fetch(url); if (r.ok) { data = await r.json(); break; } } catch(e) { continue; }
        }
        if (!data) throw new Error('Manifold error');
        const manifold = (Array.isArray(data) ? data : []).filter(m => m.outcomeType === 'BINARY' && typeof m.probability === 'number').map(m => ({ id: m.id, question: m.question, yesPrice: m.probability, volume: m.volume || 0, source: 'manifold' }));
        findArbitrage(manifold);
        if (appState.activeTab === 'arbitrage') renderArbitrage();
    } catch (e) { findArbitrage([]); }
}

function findArbitrage(manifold) {
    const ops = [];
    
    // Internal spreads (yes + no != 1)
    for (const pm of appState.allMarkets) {
        if (!pm.yesPrice || !pm.noPrice) continue;
        const spreadPct = Math.abs(pm.yesPrice + pm.noPrice - 1) * 100;
        if (spreadPct > 0.01) {
            ops.push({ market: pm, platform: 'SPREAD', gap: spreadPct.toFixed(2), priceA: pm.yesPrice, priceB: pm.noPrice });
        }
    }

    // Cross-platform with Manifold
    for (const pm of appState.allMarkets.slice(0, 10)) {
        const kw = pm.question.toLowerCase().split(/\s+/).filter(w => w.length > 3);
        for (const m of manifold.slice(0, 20)) {
            const overlap = kw.filter(k => m.question.toLowerCase().includes(k)).length;
            if (overlap >= 1 && m.volume > 50) {
                const diff = Math.abs(pm.yesPrice - m.yesPrice) * 100;
                if (diff >= 1) {
                    ops.push({ market: pm, platform: 'MANIFOLD', gap: diff.toFixed(2), priceA: pm.yesPrice, priceB: m.yesPrice });
                }
            }
        }
    }

    // Fallback: show real market data with clickable links
    if (ops.length === 0) {
        const top = appState.allMarkets
            .filter(m => m.volume > 10000)
            .sort((a, b) => b.volume - a.volume)
            .slice(0, 8)
        for (const m of top) {
            ops.push({
                market: m, platform: 'MARKET',
                gap: '$' + m.volDisplay,
                priceA: m.yesPrice,
                priceB: (typeof m.noPrice === 'number' && m.noPrice > 0) ? m.noPrice : 1 - m.yesPrice
            })
        }
    }

    appState.arbitrageOpportunities = ops.slice(0, 15)
}

function renderArbitrage() {
    const container = document.getElementById('arbitrage-feed')
    if (!container) return
    if (appState.arbitrageOpportunities.length === 0) {
        container.innerHTML = '<div class="content-state"><p>No arbitrage signals found. Scanning internal spreads and cross-platform...</p></div>'
        return
    }
    container.innerHTML = appState.arbitrageOpportunities.map((a, i) => {
        const delay = i * 50
        const pmPrice = Math.round(a.priceA * 100)
        const otherPrice = Math.round(a.priceB * 100)
        const slug = a.market.slug || ''
        const label = a.platform === 'SPREAD' ? 'Spread' : a.platform === 'MANIFOLD' ? 'Manifold' : 'Market'
        return `<div class="arb-card" style="animation-delay:${delay}ms;cursor:pointer" onclick="window.open('https://polymarket.com/event/${slug}','_blank')">
            <div class="arb-left"><span class="arb-platform">${label}</span><span class="arb-title">${(a.market.question || '').substring(0, 45)}</span></div>
            <div class="arb-center"><div class="arb-price-pair"><span class="arb-pm-price">${pmPrice}c</span><span class="arb-arrow">→</span><span class="arb-other-price">${otherPrice}c</span></div></div>
            <div class="arb-right"><span class="arb-gap">${a.gap}</span><span class="arb-label">${a.platform === 'MARKET' ? 'Volume' : a.platform === 'SPREAD' ? 'Gap' : 'Diff'}</span></div>
        </div>`
    }).join('')
}
