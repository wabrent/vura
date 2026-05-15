const socket = io()
let markets = []
let currentTab = 'all'

function setTab(tab) { currentTab = tab; renderMarkets() }

socket.on('markets', data => { markets = data; renderMarkets() })

socket.on('whale', whale => {
  const container = document.getElementById('whales')
  const div = document.createElement('div')
  div.className = 'whale'
  div.innerHTML = `<div><strong>${whale.side}</strong> $${whale.sizeUsd}</div><div>${whale.market}</div>`
  container.prepend(div)
  while (container.children.length > 10) container.removeChild(container.lastChild)
})

function renderMarkets() {
  const container = document.getElementById('markets')
  let filtered = [...markets]
  if (currentTab !== 'all') filtered = filtered.filter(x => x.category === currentTab)
  container.innerHTML = filtered.map(m => `
    <div class="market">
      <div class="market-top">
        <div class="market-title">${m.question}</div>
        <div class="market-price">${Math.round(m.yesPrice * 100)}c</div>
      </div>
      <div class="market-meta">
        <span>VOL $${Math.round(m.volume)}</span>
        <span>ALPHA ${m.alpha}</span>
        <span>${m.category.toUpperCase()}</span>
      </div>
    </div>`).join('')
}