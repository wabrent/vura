/**
 * VURA // ARCUS TERMINAL LOGIC
 * High-performance DEX & Perpetuals Trading Engine (app.arcus.xyz style)
 */

// Global State
const state = {
  currentMarket: 'VURA/USDG',
  markPrice: 0.04825,
  indexPrice: 0.04820,
  change24h: 18.42,
  high24h: 0.05200,
  low24h: 0.03950,
  volume24h: 14829400,
  fundingRate: 0.0084,
  fundingCountdown: 38 * 60, // seconds

  timeframe: '15m',
  chartType: 'candles',
  
  orderDirection: 'long', // 'long' or 'short'
  orderType: 'market',    // 'market', 'limit', 'stop'
  leverage: 10,
  orderSize: 500,

  userBalance: 12450.00, // USDG
  walletConnected: false,
  walletAddress: '0x71F3...89Bc',

  positions: [
    {
      id: 'pos-1',
      market: 'VURA/USDG',
      side: 'LONG',
      size: '100,000 VURA',
      sizeUsd: 4825.00,
      entryPrice: 0.04120,
      markPrice: 0.04825,
      liqPrice: 0.03710,
      margin: 482.50,
      pnl: 705.00,
      pnlPct: 146.11,
      leverage: '10x'
    },
    {
      id: 'pos-2',
      market: 'HOOD/USDG',
      side: 'LONG',
      size: '150 HOOD',
      sizeUsd: 3727.50,
      entryPrice: 23.40,
      markPrice: 24.85,
      liqPrice: 21.20,
      margin: 372.75,
      pnl: 217.50,
      pnlPct: 58.35,
      leverage: '10x'
    }
  ],

  openOrders: [
    {
      id: 'ord-101',
      market: 'VURA/USDG',
      type: 'LIMIT BUY',
      size: '50,000 VURA',
      price: 0.04200,
      filled: '0%',
      time: '10:14:22'
    }
  ],

  candles: []
};

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
  initCandlesData();
  initCanvasChart();
  initOrderBook();
  initOrderEntry();
  initConsoleTabs();
  initWalletModal();
  initMarketSelector();
  initLiveTickerLoop();
});

/* ==========================================================================
   1. REAL-TIME TICKER & PRICE SIMULATION
   ========================================================================== */
function initLiveTickerLoop() {
  setInterval(() => {
    // Random walk with mean reversion
    const delta = (Math.random() - 0.49) * (state.markPrice * 0.0018);
    state.markPrice = Math.max(0.0001, state.markPrice + delta);
    state.indexPrice = state.markPrice * (1 + (Math.random() - 0.5) * 0.0005);
    
    // Update DOM ticker
    const markPriceEl = document.getElementById('ticker-mark-price');
    if (markPriceEl) {
      markPriceEl.textContent = formatPrice(state.markPrice);
      markPriceEl.className = 'market-stat-val mark-price ' + (delta >= 0 ? 'green' : 'red');
    }

    const indexPriceEl = document.getElementById('ticker-index-price');
    if (indexPriceEl) indexPriceEl.textContent = formatPrice(state.indexPrice);

    // Update mid-market in orderbook
    const midPriceEl = document.getElementById('ob-mid-price');
    if (midPriceEl) {
      midPriceEl.textContent = formatPrice(state.markPrice);
      midPriceEl.style.color = delta >= 0 ? 'var(--green)' : 'var(--red)';
    }

    // Update open positions live PnL
    updatePositionsLivePnL();

    // Push tick to last candle
    if (state.candles.length) {
      const lastCandle = state.candles[state.candles.length - 1];
      lastCandle.close = state.markPrice;
      if (state.markPrice > lastCandle.high) lastCandle.high = state.markPrice;
      if (state.markPrice < lastCandle.low) lastCandle.low = state.markPrice;
      renderChart();
    }
  }, 1200);

  // Funding countdown
  setInterval(() => {
    if (state.fundingCountdown > 0) {
      state.fundingCountdown--;
      const mins = Math.floor(state.fundingCountdown / 60);
      const secs = state.fundingCountdown % 60;
      const el = document.getElementById('ticker-funding-countdown');
      if (el) el.textContent = `${mins}m ${secs}s`;
    }
  }, 1000);
}

function formatPrice(val) {
  if (val >= 1000) return '$' + val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  if (val >= 1) return '$' + val.toFixed(2);
  return '$' + val.toFixed(5);
}

/* ==========================================================================
   2. INTERACTIVE CANVAS CANDLESTICK & VOLUME CHART (60 FPS)
   ========================================================================== */
function initCandlesData() {
  state.candles = [];
  let price = state.markPrice * 0.85;
  const now = Date.now();
  const count = 55;
  const interval = 15 * 60 * 1000;

  for (let i = count; i >= 0; i--) {
    const time = now - i * interval;
    const change = (Math.random() - 0.47) * (price * 0.02);
    const open = price;
    const close = price + change;
    const high = Math.max(open, close) + Math.random() * (price * 0.012);
    const low = Math.min(open, close) - Math.random() * (price * 0.012);
    const volume = Math.floor(10000 + Math.random() * 50000);

    state.candles.push({ time, open, high, low, close, volume });
    price = close;
  }
  state.candles[state.candles.length - 1].close = state.markPrice;
}

let canvas, ctx;
function initCanvasChart() {
  canvas = document.getElementById('trading-chart-canvas');
  if (!canvas) return;
  ctx = canvas.getContext('2d');

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    renderChart();
  }

  window.addEventListener('resize', resize);
  setTimeout(resize, 50);

  // Timeframe buttons
  document.querySelectorAll('.tf-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.tf-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.timeframe = btn.dataset.tf;
      initCandlesData();
      renderChart();
      showToast(`Timeframe changed to ${state.timeframe}`);
    });
  });

  // Crosshair interaction
  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    renderChart(mouseX, mouseY);
  });

  canvas.addEventListener('mouseleave', () => {
    renderChart();
  });
}

function renderChart(mouseX = null, mouseY = null) {
  if (!canvas || !ctx) return;
  const rect = canvas.getBoundingClientRect();
  const width = rect.width;
  const height = rect.height;

  ctx.clearRect(0, 0, width, height);

  // Background
  ctx.fillStyle = '#0d1017';
  ctx.fillRect(0, 0, width, height);

  if (!state.candles.length) return;

  const rightMargin = 70;
  const bottomMargin = 26;
  const chartWidth = width - rightMargin;
  const chartHeight = height - bottomMargin;
  const volHeight = chartHeight * 0.22;
  const priceChartHeight = chartHeight - volHeight;

  // Find min/max price
  let minP = Infinity, maxP = -Infinity;
  let maxVol = 0;
  state.candles.forEach(c => {
    if (c.low < minP) minP = c.low;
    if (c.high > maxP) maxP = c.high;
    if (c.volume > maxVol) maxVol = c.volume;
  });

  const pRange = (maxP - minP) * 1.15 || 1;
  const pMinPadded = minP - (maxP - minP) * 0.05;

  function getY(p) {
    return priceChartHeight - ((p - pMinPadded) / pRange) * priceChartHeight;
  }

  // Draw Grid Lines
  ctx.strokeStyle = '#161c28';
  ctx.lineWidth = 1;
  const gridSteps = 5;
  for (let i = 0; i <= gridSteps; i++) {
    const y = (priceChartHeight / gridSteps) * i;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(chartWidth, y);
    ctx.stroke();

    // Price labels on right
    const pVal = pMinPadded + ((priceChartHeight - y) / priceChartHeight) * pRange;
    ctx.fillStyle = '#5e6b82';
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.textAlign = 'left';
    ctx.fillText(formatPrice(pVal), chartWidth + 6, y + 3);
  }

  // Draw Candlesticks & Volume Bars
  const candleCount = state.candles.length;
  const candleSlot = chartWidth / candleCount;
  const candleWidth = Math.max(2, candleSlot * 0.68);

  const emaPoints = [];

  state.candles.forEach((c, i) => {
    const x = i * candleSlot + candleSlot / 2;
    const isUp = c.close >= c.open;
    const candleColor = isUp ? '#00e676' : '#ff334b';

    // 1. Volume Bar
    const vY = chartHeight - (c.volume / maxVol) * volHeight;
    ctx.fillStyle = isUp ? 'rgba(0, 230, 118, 0.22)' : 'rgba(255, 51, 75, 0.22)';
    ctx.fillRect(x - candleWidth / 2, vY, candleWidth, chartHeight - vY);

    // 2. Wick
    ctx.strokeStyle = candleColor;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(x, getY(c.high));
    ctx.lineTo(x, getY(c.low));
    ctx.stroke();

    // 3. Body
    const topY = getY(Math.max(c.open, c.close));
    const botY = getY(Math.min(c.open, c.close));
    const bHeight = Math.max(1.5, botY - topY);

    ctx.fillStyle = candleColor;
    ctx.fillRect(x - candleWidth / 2, topY, candleWidth, bHeight);

    // EMA calculation point
    emaPoints.push({ x, y: (topY + botY) / 2 });
  });

  // Draw EMA curve
  if (emaPoints.length > 2) {
    ctx.strokeStyle = '#2979ff';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(emaPoints[0].x, emaPoints[0].y);
    for (let i = 1; i < emaPoints.length; i++) {
      ctx.lineTo(emaPoints[i].x, emaPoints[i].y);
    }
    ctx.stroke();
  }

  // Crosshair
  if (mouseX !== null && mouseX >= 0 && mouseX <= chartWidth && mouseY >= 0 && mouseY <= chartHeight) {
    ctx.strokeStyle = '#3b82f6';
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 1;

    // Vertical line
    ctx.beginPath();
    ctx.moveTo(mouseX, 0);
    ctx.lineTo(mouseX, chartHeight);
    ctx.stroke();

    // Horizontal line
    ctx.beginPath();
    ctx.moveTo(0, mouseY);
    ctx.lineTo(chartWidth, mouseY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Price badge on right
    const hoveredPrice = pMinPadded + ((priceChartHeight - mouseY) / priceChartHeight) * pRange;
    ctx.fillStyle = '#2979ff';
    ctx.fillRect(chartWidth, mouseY - 9, rightMargin - 4, 18);
    ctx.fillStyle = '#ffffff';
    ctx.font = '10.5px "JetBrains Mono", monospace';
    ctx.fillText(formatPrice(hoveredPrice), chartWidth + 4, mouseY + 4);

    // Find closest candle for HUD
    const candleIdx = Math.floor(mouseX / candleSlot);
    if (state.candles[candleIdx]) {
      const hc = state.candles[candleIdx];
      updateHUD(hc);
    }
  } else {
    if (state.candles.length) {
      updateHUD(state.candles[state.candles.length - 1]);
    }
  }
}

function updateHUD(c) {
  const o = document.getElementById('hud-open');
  const h = document.getElementById('hud-high');
  const l = document.getElementById('hud-low');
  const cl = document.getElementById('hud-close');
  const v = document.getElementById('hud-vol');

  if (o) o.textContent = formatPrice(c.open);
  if (h) h.textContent = formatPrice(c.high);
  if (l) l.textContent = formatPrice(c.low);
  if (cl) cl.textContent = formatPrice(c.close);
  if (v) v.textContent = c.volume.toLocaleString();
}

/* ==========================================================================
   3. CLOB ORDER BOOK & TRADES FEED
   ========================================================================== */
function initOrderBook() {
  renderOrderBook();
  setInterval(() => {
    // Micro updates to orderbook quantities
    renderOrderBook();
  }, 2000);

  // Tabs (Book vs Trades)
  const tabBook = document.getElementById('btn-tab-ob-book');
  const tabTrades = document.getElementById('btn-tab-ob-trades');
  const bookView = document.getElementById('ob-view-book');
  const tradesView = document.getElementById('ob-view-trades');

  if (tabBook && tabTrades) {
    tabBook.addEventListener('click', () => {
      tabBook.classList.add('active');
      tabTrades.classList.remove('active');
      bookView.style.display = 'flex';
      tradesView.style.display = 'none';
    });
    tabTrades.addEventListener('click', () => {
      tabTrades.classList.add('active');
      tabBook.classList.remove('active');
      tradesView.style.display = 'flex';
      bookView.style.display = 'none';
      renderRecentTrades();
    });
  }
}

function renderOrderBook() {
  const asksContainer = document.getElementById('ob-asks-list');
  const bidsContainer = document.getElementById('ob-bids-list');
  if (!asksContainer || !bidsContainer) return;

  const basePrice = state.markPrice;
  const asks = [];
  const bids = [];
  const rows = 8;

  let askTotal = 0;
  for (let i = rows; i >= 1; i--) {
    const price = basePrice * (1 + i * 0.00065);
    const size = Math.floor(12000 + Math.random() * 85000);
    askTotal += size;
    asks.push({ price, size, total: askTotal });
  }

  let bidTotal = 0;
  for (let i = 1; i <= rows; i++) {
    const price = basePrice * (1 - i * 0.00065);
    const size = Math.floor(15000 + Math.random() * 95000);
    bidTotal += size;
    bids.push({ price, size, total: bidTotal });
  }

  const maxTotal = Math.max(askTotal, bidTotal);

  asksContainer.innerHTML = asks.map(a => `
    <div class="ob-row ask" onclick="fillOrderPrice(${a.price})">
      <div class="ob-depth-bar" style="width: ${(a.total / maxTotal) * 100}%"></div>
      <span class="price">${a.price.toFixed(5)}</span>
      <span class="size">${(a.size / 1000).toFixed(1)}k</span>
      <span class="total">${(a.total / 1000).toFixed(1)}k</span>
    </div>
  `).join('');

  bidsContainer.innerHTML = bids.map(b => `
    <div class="ob-row bid" onclick="fillOrderPrice(${b.price})">
      <div class="ob-depth-bar" style="width: ${(b.total / maxTotal) * 100}%"></div>
      <span class="price">${b.price.toFixed(5)}</span>
      <span class="size">${(b.size / 1000).toFixed(1)}k</span>
      <span class="total">${(b.total / 1000).toFixed(1)}k</span>
    </div>
  `).join('');
}

window.fillOrderPrice = function(p) {
  const pInput = document.getElementById('order-limit-price');
  if (pInput) {
    pInput.value = p.toFixed(5);
    showToast(`Price set: ${p.toFixed(5)}`);
  }
};

function renderRecentTrades() {
  const container = document.getElementById('recent-trades-list');
  if (!container) return;

  const count = 18;
  const items = [];
  const now = new Date();

  for (let i = 0; i < count; i++) {
    const isBuy = Math.random() > 0.45;
    const p = state.markPrice * (1 + (Math.random() - 0.5) * 0.003);
    const size = Math.floor(2000 + Math.random() * 50000);
    const timeStr = new Date(now.getTime() - i * 4000).toTimeString().split(' ')[0];

    items.push(`
      <div class="ob-row ${isBuy ? 'bid' : 'ask'}">
        <span class="price">${p.toFixed(5)}</span>
        <span class="size">${(size / 1000).toFixed(1)}k</span>
        <span class="total">${timeStr}</span>
      </div>
    `);
  }

  container.innerHTML = items.join('');
}

/* ==========================================================================
   4. ORDER ENTRY (ARCUS / dYdX TERMINAL MODULE)
   ========================================================================== */
function initOrderEntry() {
  const btnLong = document.getElementById('btn-direction-long');
  const btnShort = document.getElementById('btn-direction-short');
  const submitBtn = document.getElementById('btn-submit-order');
  const sizeInput = document.getElementById('order-size-usd');
  const levSlider = document.getElementById('order-leverage-slider');
  const levDisplay = document.getElementById('order-leverage-display');

  if (btnLong && btnShort && submitBtn) {
    btnLong.addEventListener('click', () => {
      state.orderDirection = 'long';
      btnLong.classList.add('active');
      btnShort.classList.remove('active');
      submitBtn.className = 'btn-submit-order long';
      submitBtn.textContent = 'Place Long Order';
      recalcOrderSummary();
    });

    btnShort.addEventListener('click', () => {
      state.orderDirection = 'short';
      btnShort.classList.add('active');
      btnLong.classList.remove('active');
      submitBtn.className = 'btn-submit-order short';
      submitBtn.textContent = 'Place Short Order';
      recalcOrderSummary();
    });
  }

  // Leverage Slider
  if (levSlider && levDisplay) {
    levSlider.addEventListener('input', (e) => {
      state.leverage = parseInt(e.target.value, 10);
      levDisplay.textContent = state.leverage + 'x';
      recalcOrderSummary();
    });
  }

  // Quick leverage chips
  document.querySelectorAll('.lev-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const val = parseInt(chip.dataset.lev, 10);
      state.leverage = val;
      if (levSlider) levSlider.value = val;
      if (levDisplay) levDisplay.textContent = val + 'x';
      recalcOrderSummary();
    });
  });

  // Size Quick Chips (%)
  document.querySelectorAll('.pct-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const pct = parseFloat(chip.dataset.pct);
      const calculatedUsd = Math.floor(state.userBalance * pct);
      if (sizeInput) {
        sizeInput.value = calculatedUsd;
        state.orderSize = calculatedUsd;
        recalcOrderSummary();
      }
    });
  });

  if (sizeInput) {
    sizeInput.addEventListener('input', () => {
      state.orderSize = parseFloat(sizeInput.value) || 0;
      recalcOrderSummary();
    });
  }

  // Order Placement
  if (submitBtn) {
    submitBtn.addEventListener('click', handlePlaceOrder);
  }

  recalcOrderSummary();
}

function recalcOrderSummary() {
  const marginNeeded = state.orderSize;
  const notional = marginNeeded * state.leverage;
  const tokenSize = notional / state.markPrice;

  // Liquidation calculation
  const mmRate = 0.05; // 5% maintenance margin
  let liqPrice = 0;
  if (state.orderDirection === 'long') {
    liqPrice = state.markPrice * (1 - (1 / state.leverage) + mmRate);
  } else {
    liqPrice = state.markPrice * (1 + (1 / state.leverage) - mmRate);
  }

  const elMargin = document.getElementById('summary-margin');
  const elNotional = document.getElementById('summary-notional');
  const elLiq = document.getElementById('summary-liq-price');
  const elQty = document.getElementById('summary-qty');

  if (elMargin) elMargin.textContent = `$${marginNeeded.toFixed(2)} USDG`;
  if (elNotional) elNotional.textContent = `$${notional.toFixed(2)}`;
  if (elLiq) elLiq.textContent = formatPrice(Math.max(0, liqPrice));
  if (elQty) elQty.textContent = `${Math.floor(tokenSize).toLocaleString()} VURA`;
}

function handlePlaceOrder() {
  if (state.orderSize <= 0) {
    showToast('Please enter an order amount');
    return;
  }

  if (state.orderSize > state.userBalance) {
    showToast('Insufficient USDG balance on Robinhood Chain');
    return;
  }

  // Deduct margin
  state.userBalance -= state.orderSize;
  updateBalanceDisplay();

  const notional = state.orderSize * state.leverage;
  const tokenQty = Math.floor(notional / state.markPrice);

  const newPos = {
    id: 'pos-' + Date.now(),
    market: state.currentMarket,
    side: state.orderDirection.toUpperCase(),
    size: `${tokenQty.toLocaleString()} ${state.currentMarket.split('/')[0]}`,
    sizeUsd: notional,
    entryPrice: state.markPrice,
    markPrice: state.markPrice,
    liqPrice: state.orderDirection === 'long' 
      ? state.markPrice * (1 - 0.9 / state.leverage)
      : state.markPrice * (1 + 0.9 / state.leverage),
    margin: state.orderSize,
    pnl: 0,
    pnlPct: 0,
    leverage: `${state.leverage}x`
  };

  state.positions.unshift(newPos);
  renderPositionsTable();
  showToast(`Order Executed: ${newPos.side} ${newPos.size} at ${formatPrice(state.markPrice)}`);
}

/* ==========================================================================
   5. BOTTOM CONSOLE & EXTENDED TOOLS (Radar, Scanner, VuraPad, Passes)
   ========================================================================= */
function initConsoleTabs() {
  document.querySelectorAll('.console-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.console-tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.console-pane').forEach(p => p.style.display = 'none');

      btn.classList.add('active');
      const targetId = btn.dataset.pane;
      const targetPane = document.getElementById(targetId);
      if (targetPane) targetPane.style.display = 'block';

      if (targetId === 'pane-radar') renderRadarDeFiFeed();
      if (targetId === 'pane-scanner') renderScannerDefaults();
      if (targetId === 'pane-passes') renderGenesisPasses();
    });
  });

  renderPositionsTable();
  renderOpenOrdersTable();
}

function updatePositionsLivePnL() {
  state.positions.forEach(pos => {
    const isLong = pos.side === 'LONG';
    const priceDiff = isLong ? (state.markPrice - pos.entryPrice) : (pos.entryPrice - state.markPrice);
    const pnl = (priceDiff / pos.entryPrice) * pos.sizeUsd;
    pos.pnl = pnl;
    pos.pnlPct = (pnl / pos.margin) * 100;
  });

  // Re-render live cells without rebuilding DOM structure
  state.positions.forEach(pos => {
    const pnlEl = document.getElementById(`pnl-${pos.id}`);
    if (pnlEl) {
      const isProfitable = pos.pnl >= 0;
      pnlEl.textContent = `${isProfitable ? '+' : ''}$${pos.pnl.toFixed(2)} (${isProfitable ? '+' : ''}${pos.pnlPct.toFixed(2)}%)`;
      pnlEl.style.color = isProfitable ? 'var(--green)' : 'var(--red)';
    }
  });
}

function renderPositionsTable() {
  const container = document.getElementById('positions-tbody');
  const countBadge = document.getElementById('badge-positions-count');
  if (countBadge) countBadge.textContent = state.positions.length;

  if (!container) return;

  if (!state.positions.length) {
    container.innerHTML = `<tr><td colspan="9" style="text-align:center; padding: 24px; color: var(--text-muted);">No open positions. Use the order panel to trade.</td></tr>`;
    return;
  }

  container.innerHTML = state.positions.map(p => `
    <tr>
      <td style="font-weight: 600; color: #fff;">${p.market}</td>
      <td><span class="badge-side ${p.side.toLowerCase()}">${p.side} ${p.leverage}</span></td>
      <td>${p.size}</td>
      <td>${formatPrice(p.entryPrice)}</td>
      <td>${formatPrice(state.markPrice)}</td>
      <td style="color: #facc15;">${formatPrice(p.liqPrice)}</td>
      <td>$${p.margin.toFixed(2)}</td>
      <td id="pnl-${p.id}" style="color: ${p.pnl >= 0 ? 'var(--green)' : 'var(--red)'}; font-weight: 600;">
        ${p.pnl >= 0 ? '+' : ''}$${p.pnl.toFixed(2)} (${p.pnl >= 0 ? '+' : ''}${p.pnlPct.toFixed(2)}%)
      </td>
      <td>
        <button class="action-btn-small" onclick="closePosition('${p.id}')">Close</button>
      </td>
    </tr>
  `).join('');
}

window.closePosition = function(id) {
  const idx = state.positions.findIndex(p => p.id === id);
  if (idx !== -1) {
    const pos = state.positions[idx];
    const returnAmount = pos.margin + pos.pnl;
    state.userBalance += Math.max(0, returnAmount);
    updateBalanceDisplay();
    state.positions.splice(idx, 1);
    renderPositionsTable();
    showToast(`Closed ${pos.market} position. Settled: $${returnAmount.toFixed(2)} USDG`);
  }
};

function renderOpenOrdersTable() {
  const container = document.getElementById('orders-tbody');
  if (!container) return;

  if (!state.openOrders.length) {
    container.innerHTML = `<tr><td colspan="7" style="text-align:center; padding: 20px; color: var(--text-muted);">No working limit orders</td></tr>`;
    return;
  }

  container.innerHTML = state.openOrders.map(o => `
    <tr>
      <td style="font-weight:600;">${o.market}</td>
      <td style="color: var(--green); font-weight: 600;">${o.type}</td>
      <td>${o.size}</td>
      <td>${formatPrice(o.price)}</td>
      <td>${o.filled}</td>
      <td>${o.time}</td>
      <td><button class="action-btn-small" onclick="cancelOrder('${o.id}')">Cancel</button></td>
    </tr>
  `).join('');
}

window.cancelOrder = function(id) {
  state.openOrders = state.openOrders.filter(o => o.id !== id);
  renderOpenOrdersTable();
  showToast('Order cancelled');
};

/* --- Extended Tools in Panes --- */
function renderRadarDeFiFeed() {
  const container = document.getElementById('radar-de-fi-grid');
  if (!container) return;

  const pools = [
    { pair: '$VURA / USDG', dex: 'Pons V2', chain: 'Robinhood 4663', tvl: '$4.82M', apr: '142.8%', safe: '99/100' },
    { pair: 'HOOD / USDG', dex: 'Arcus DEX', chain: 'Robinhood 4663', tvl: '$18.9M', apr: '28.4%', safe: '98/100' },
    { pair: 'ETH / USDG', dex: 'Uniswap V3', chain: 'Arbitrum One', tvl: '$42.1M', apr: '18.2%', safe: '100/100' },
    { pair: 'SOL / USDC', dex: 'Raydium', chain: 'Solana', tvl: '$31.4M', apr: '44.5%', safe: '94/100' }
  ];

  container.innerHTML = pools.map(p => `
    <div style="background: var(--bg-subpanel); border: 1px solid var(--border-subtle); border-radius: 6px; padding: 10px 14px; display: flex; align-items: center; justify-content: space-between;">
      <div>
        <div style="font-weight: 700; color: #fff; font-size: 13px;">${p.pair}</div>
        <div style="font-size: 11px; color: var(--text-muted);">${p.dex} · ${p.chain}</div>
      </div>
      <div style="text-align: right;">
        <div style="color: var(--green); font-weight: 700; font-family: var(--font-mono);">${p.apr} APR</div>
        <div style="font-size: 11px; color: var(--text-dim);">TVL: ${p.tvl} · Safety: ${p.safe}</div>
      </div>
    </div>
  `).join('');
}

function renderScannerDefaults() {
  const btnAudit = document.getElementById('btn-run-audit');
  if (btnAudit) {
    btnAudit.onclick = () => {
      showToast('Running byte-code audit on Robinhood Chain...');
      setTimeout(() => {
        showToast('Audit complete: Score 98/100 (Clean & Verified)');
      }, 600);
    };
  }
}

function renderGenesisPasses() {
  const btnMint = document.getElementById('btn-mint-pass-console');
  if (btnMint) {
    btnMint.onclick = () => {
      showToast('Minting Genesis Pass #042 on Robinhood Chain...');
      setTimeout(() => {
        showToast('Success! Genesis Pass #042 Minted to 0x71F3...89Bc');
      }, 800);
    };
  }
}

/* ==========================================================================
   6. WALLET MODAL & MARKET SELECTOR
   ========================================================================== */
function initWalletModal() {
  const modal = document.getElementById('wallet-modal');
  const btnConnect = document.getElementById('btn-open-wallet');
  const btnClose = document.getElementById('btn-close-wallet');

  if (btnConnect && modal) {
    btnConnect.addEventListener('click', () => {
      modal.classList.add('active');
    });
  }

  if (btnClose && modal) {
    btnClose.addEventListener('click', () => {
      modal.classList.remove('active');
    });
  }

  document.querySelectorAll('.wallet-option').forEach(opt => {
    opt.addEventListener('click', () => {
      const name = opt.dataset.name;
      state.walletConnected = true;
      modal.classList.remove('active');
      updateBalanceDisplay();
      if (btnConnect) {
        btnConnect.classList.add('connected');
        btnConnect.innerHTML = `<span class="pulse-dot"></span> 0x71F3...89Bc`;
      }
      showToast(`Connected via ${name} (Robinhood Chain ID: 4663)`);
    });
  });
}

function updateBalanceDisplay() {
  const el = document.getElementById('user-usdg-balance');
  if (el) el.textContent = `$${state.userBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })} USDG`;
}

function initMarketSelector() {
  const btn = document.getElementById('btn-market-select');
  const modal = document.getElementById('market-modal');
  const closeBtn = document.getElementById('btn-close-market');

  if (btn && modal) {
    btn.addEventListener('click', () => modal.classList.add('active'));
  }
  if (closeBtn && modal) {
    closeBtn.addEventListener('click', () => modal.classList.remove('active'));
  }

  document.querySelectorAll('.market-pick-row').forEach(row => {
    row.addEventListener('click', () => {
      const m = row.dataset.market;
      const base = parseFloat(row.dataset.price);
      state.currentMarket = m;
      state.markPrice = base;
      state.indexPrice = base * 0.999;
      
      const titleEl = document.getElementById('selected-market-name');
      if (titleEl) titleEl.textContent = m;

      modal.classList.remove('active');
      initCandlesData();
      renderChart();
      renderOrderBook();
      recalcOrderSummary();
      showToast(`Switched market to ${m}`);
    });
  });
}

/* ==========================================================================
   7. TOAST NOTIFICATION UTILITY
   ========================================================================== */
function showToast(msg) {
  let toast = document.getElementById('toast-msg');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast-msg';
    toast.className = 'toast-msg';
    document.body.appendChild(toast);
  }
  toast.innerHTML = `<span style="color: var(--blue);">●</span> ${msg}`;
  toast.classList.add('show');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => {
    toast.classList.remove('show');
  }, 2800);
}
