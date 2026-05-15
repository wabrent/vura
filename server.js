// Render.com deployment — Polymarket CLOB proxy (US region)
// Deploy as Web Service, Node.js, US East

const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

const API_KEY = process.env.POLYMARKET_API_KEY;
const SECRET = process.env.POLYMARKET_SECRET;
const PASSPHRASE = process.env.POLYMARKET_PASSPHRASE;
const PORT = process.env.PORT || 3001;

// GET proxy
app.get('/api/proxy', async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ error: 'Missing URL' });
  try {
    const response = await fetch(decodeURIComponent(url), {
      headers: { 'User-Agent': 'VURA/1.0' },
      signal: AbortSignal.timeout(10000),
    });
    const data = await response.json();
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST order
app.post('/api/trade', async (req, res) => {
  const { tokenId, side, price, size } = req.body;
  try {
    const clobRes = await fetch('https://clob.polymarket.com/order', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'POLY_API_KEY': API_KEY,
        'POLY_SECRET': SECRET,
        'POLY_PASSPHRASE': PASSPHRASE,
      },
      body: JSON.stringify({ tokenID: tokenId, side, price, size }),
      signal: AbortSignal.timeout(15000),
    });
    const data = await clobRes.json();
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.listen(PORT, () => console.log('VURA proxy on port', PORT));