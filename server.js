require('dotenv').config()

const express = require('express')
const cors = require('cors')
const path = require('path')
const http = require('http')
const { Server } = require('socket.io')

const app = express()
const server = http.createServer(app)
const io = new Server(server, { cors: { origin: '*' } })

const PORT = process.env.PORT || 3000

app.use(cors())
app.use(express.json())
app.use(express.static(path.join(__dirname, 'public')))

const API = 'https://gamma-api.polymarket.com/events?closed=false&limit=50'
let cachedMarkets = []

function categorize(title) {
  const t = title.toLowerCase()
  if (t.includes('bitcoin') || t.includes('crypto') || t.includes('eth') || t.includes('sol')) return 'crypto'
  if (t.includes('trump') || t.includes('election') || t.includes('president')) return 'politics'
  if (t.includes('nba') || t.includes('soccer') || t.includes('nfl')) return 'sports'
  return 'general'
}

function calculateAlpha(market) {
  const volumeScore = Math.min(market.volume / 100000, 3)
  const volatilityScore = Math.abs(market.change24h * 100)
  const liquidityScore = market.spread < 0.02 ? 2 : 0.5
  return Number((volumeScore + volatilityScore + liquidityScore).toFixed(1))
}

function generateWhale(market) {
  return {
    market: market.question,
    side: Math.random() > 0.5 ? 'YES' : 'NO',
    sizeUsd: Math.floor(Math.random() * 50000 + 5000),
    timestamp: Date.now()
  }
}

async function fetchMarkets() {
  try {
    const response = await fetch(API)
    const data = await response.json()
    const events = Array.isArray(data) ? data : data.events || []

    cachedMarkets = events.map(event => {
      const market = event.markets?.[0] || {}
      let yes = 0.5, no = 0.5
      try {
        const prices = typeof market.outcomePrices === 'string' ? JSON.parse(market.outcomePrices) : market.outcomePrices
        yes = Number(prices?.[0] || 0.5)
        no = Number(prices?.[1] || 0.5)
      } catch (e) {}

      const volume = Number(market.volumeNum || market.volume || 0)
      const spread = Math.abs(yes + no - 1)
      const item = {
        id: event.id, question: event.title, slug: event.slug,
        category: categorize(event.title),
        yesPrice: yes, noPrice: no, spread, volume,
        change24h: Number(market.oneDayPriceChange || 0)
      }
      item.alpha = calculateAlpha(item)
      return item
    })

    io.emit('markets', cachedMarkets)

    const whale = cachedMarkets[Math.floor(Math.random() * cachedMarkets.length)]
    if (whale) io.emit('whale', generateWhale(whale))

    console.log('Updated', cachedMarkets.length, 'markets')
  } catch (e) {
    console.log('Fetch error:', e.message)
  }
}

app.get('/api/markets', (req, res) => res.json(cachedMarkets))

app.get('/api/history/:id', (req, res) => {
  const points = []
  let value = Math.random() * 0.6 + 0.2
  for (let i = 0; i < 40; i++) {
    value += (Math.random() - 0.5) * 0.05
    value = Math.max(0.01, Math.min(0.99, value))
    points.push({ time: i, value })
  }
  res.json(points)
})

io.on('connection', socket => {
  socket.emit('markets', cachedMarkets)
  console.log('Client connected')
})

setInterval(fetchMarkets, 10000)
fetchMarkets()

server.listen(PORT, () => console.log(`VURA running on ${PORT}`))