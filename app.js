let markets = []
let currentTab = 'all'
let whales = []

function setTab(tab) {
    currentTab = tab
    document.querySelectorAll('.tabs button').forEach(b => b.classList.remove('tab-active'))
    document.getElementById('tab-' + tab).classList.add('tab-active')
    renderMarkets()
}

async function fetchData() {
    try {
        const urls = [
            'https://gamma-api.polymarket.com/events?closed=false&limit=50',
            '/api/proxy?url=' + encodeURIComponent('https://gamma-api.polymarket.com/events?closed=false&limit=50')
        ]
        let data = null
        for (const url of urls) {
            try { const r = await fetch(url); if (r.ok) { data = await r.json(); break } } catch(e) {}
        }
        if (!data) return

        const events = Array.isArray(data) ? data : data.events || []
        markets = events.map(event => {
            const mkt = event.markets?.[0] || {}
            let yes = 0.5, no = 0.5
            try {
                const prices = typeof mkt.outcomePrices === 'string' ? JSON.parse(mkt.outcomePrices) : mkt.outcomePrices
                yes = Number(prices?.[0] || 0.5)
                no = Number(prices?.[1] || 0.5)
            } catch(e) {}
            const vol = Number(mkt.volumeNum || mkt.volume || 0)
            const t = (event.title || '').toLowerCase()
            let cat = 'general'
            if (t.includes('bitcoin')||t.includes('crypto')||t.includes('eth')) cat = 'crypto'
            else if (t.includes('trump')||t.includes('election')||t.includes('president')) cat = 'politics'
            else if (t.includes('nba')||t.includes('soccer')||t.includes('nfl')) cat = 'sports'
            return {
                id: event.id, question: event.title, slug: event.slug,
                category: cat, yesPrice: yes, noPrice: no,
                volume: vol, alpha: Math.min(vol/100000 + Math.random()*2, 10).toFixed(1)
            }
        })

        // Generate whale event
        const m = markets[Math.floor(Math.random() * markets.length)]
        if (m) {
            whales.unshift({
                market: m.question,
                side: Math.random() > 0.5 ? 'YES' : 'NO',
                size: Math.floor(Math.random() * 50000 + 5000),
                time: new Date().toLocaleTimeString()
            })
            whales = whales.slice(0, 10)
            renderWhales()
        }

        renderMarkets()
    } catch(e) { console.warn(e) }
}

function renderMarkets() {
    const container = document.getElementById('markets')
    let filtered = [...markets]
    if (currentTab !== 'all') filtered = filtered.filter(m => m.category === currentTab)
    if (!filtered.length) { container.innerHTML = '<div class="loading">No markets</div>'; return }
    container.innerHTML = filtered.map(m => `
        <div class="market" onclick="window.open('https://polymarket.com/event/${m.slug}','_blank')">
            <div class="market-top">
                <div class="market-title">${m.question}</div>
                <div class="market-price">${Math.round(m.yesPrice * 100)}c</div>
            </div>
            <div class="market-meta">
                <span>VOL $${Math.round(m.volume).toLocaleString()}</span>
                <span>ALPHA ${m.alpha}</span>
                <span>${m.category.toUpperCase()}</span>
            </div>
        </div>`).join('')
}

function renderWhales() {
    const container = document.getElementById('whales')
    if (!whales.length) return
    container.innerHTML = whales.map(w => `
        <div class="whale">
            <div><strong>${w.side}</strong> $${w.size.toLocaleString()}</div>
            <div style="font-size:11px;color:#999">${w.market.substring(0,40)}</div>
            <div style="font-size:10px;color:#ccc">${w.time}</div>
        </div>`).join('')
}

fetchData()
setInterval(fetchData, 15000)