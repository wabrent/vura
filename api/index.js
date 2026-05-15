// Vercel Serverless: CORS proxy + Polymarket Builder auth

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') return res.status(200).end();

  // === Builder Program Credentials ===
  const API_KEY = process.env.POLYMARKET_API_KEY;
  const SECRET = process.env.POLYMARKET_SECRET;
  const PASSPHRASE = process.env.POLYMARKET_PASSPHRASE;

  const { url } = req.query;
  const { action, tokenId, side, price, size } = req.body || {};

  // === Order Placement (POST) ===
  if (action === 'trade' && req.method === 'POST') {
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

      if (!clobRes.ok) {
        const err = await clobRes.text();
        return res.status(clobRes.status).json({ error: err });
      }

      const data = await clobRes.json();
      return res.status(200).json(data);
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  // === Standard Proxy (GET) ===
  if (!url) {
    return res.status(400).json({ error: 'Missing URL parameter' });
  }

  let targetUrl;
  try {
    targetUrl = decodeURIComponent(url);
  } catch (e) {
    return res.status(400).json({ error: 'Invalid URL encoding' });
  }

  try {
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'VURA/1.0',
        'Accept': 'application/json',
        'POLY_API_KEY': API_KEY || '',
        'POLY_SECRET': SECRET || '',
        'POLY_PASSPHRASE': PASSPHRASE || '',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: `API ${response.status}` });
    }

    const contentType = response.headers.get('content-type') || '';
    let data;
    if (contentType.includes('application/json')) {
      data = await response.json();
    } else {
      const text = await response.text();
      try { data = JSON.parse(text); } catch { data = text; }
    }

    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}