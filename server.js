// Cyclic.sh deployment — VURA CLOB proxy
// Free tier, US region, no sleep

const express = require('express')
const cors = require('cors')
const app = express()

app.use(cors())
app.use(express.json())

app.get('/', (_, res) => res.send('VURA Proxy OK'))

app.get('/api/proxy', async (req, res) => {
  const { url } = req.query
  if (!url) return res.status(400).json({ error: 'Missing URL' })
  try {
    const r = await fetch(decodeURIComponent(url), { headers: { 'User-Agent': 'VURA/1.0' }, signal: AbortSignal.timeout(10000) })
    const data = await r.json()
    res.json(data)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.post('/api/trade', async (req, res) => {
  const { tokenId, side, price, size } = req.body
  try {
    const r = await fetch('https://clob.polymarket.com/order', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'POLY_API_KEY': process.env.POLYMARKET_API_KEY,
        'POLY_SECRET': process.env.POLYMARKET_SECRET,
        'POLY_PASSPHRASE': process.env.POLYMARKET_PASSPHRASE,
      },
      body: JSON.stringify({ tokenID: tokenId, side, price, size }),
      signal: AbortSignal.timeout(15000),
    })
    const data = await r.json()
    res.json(data)
  } catch (e) { res.status(500).json({ error: e.message }) }
})

app.listen(process.env.PORT || 8080, () => console.log('VURA proxy on', process.env.PORT || 8080))