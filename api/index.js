// Vercel Serverless: CORS proxy + Polymarket Builder auth + Privy auth

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') return res.status(200).end();

  // === Builder Program Credentials ===
  const API_KEY = process.env.POLYMARKET_API_KEY;
  const SECRET = process.env.POLYMARKET_SECRET;
  const PASSPHRASE = process.env.POLYMARKET_PASSPHRASE;

  // === Privy Credentials ===
  const PRIVY_APP_ID = process.env.PRIVY_APP_ID || 'cmpcnahqh001m0ci59bk1lokk';
  const PRIVY_APP_SECRET = process.env.PRIVY_APP_SECRET;
  const PRIVY_AUTH = 'Basic ' + Buffer.from(PRIVY_APP_ID + ':' + PRIVY_APP_SECRET).toString('base64');
  const PRIVY_BASE = 'https://api.privy.io/v1';

  const { url } = req.query;
  const { action, tokenId, side, price, size } = req.body || {};

  // === Privy: Create user + embedded wallet ===
  if (action === 'privy_create' && req.method === 'POST') {
    try {
      // 1. Create anonymous user
      const userRes = await fetch(`${PRIVY_BASE}/users`, {
        method: 'POST',
        headers: {
          'Authorization': PRIVY_AUTH,
          'privy-app-id': PRIVY_APP_ID,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ linked_accounts: [] }),
        signal: AbortSignal.timeout(15000)
      });

      if (!userRes.ok) {
        const err = await userRes.text();
        return res.status(userRes.status).json({ error: 'Privy user creation failed: ' + err });
      }

      const user = await userRes.json();
      const userId = user.id;

      // 2. Create embedded Ethereum wallet
      const walletRes = await fetch(`${PRIVY_BASE}/wallets`, {
        method: 'POST',
        headers: {
          'Authorization': PRIVY_AUTH,
          'privy-app-id': PRIVY_APP_ID,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ user_id: userId, chain_type: 'ethereum' }),
        signal: AbortSignal.timeout(15000)
      });

      if (!walletRes.ok) {
        const err = await walletRes.text();
        return res.status(walletRes.status).json({ error: 'Wallet creation failed: ' + err });
      }

      const wallet = await walletRes.json();

      return res.status(200).json({
        userId: userId,
        walletAddress: wallet.address,
        walletId: wallet.id
      });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  // === Privy: Get user by ID (restore profile) ===
  if (action === 'privy_restore' && req.method === 'POST') {
    try {
      const { userId } = req.body || {};
      if (!userId) return res.status(400).json({ error: 'Missing userId' });

      const userRes = await fetch(`${PRIVY_BASE}/users/${userId}`, {
        method: 'GET',
        headers: {
          'Authorization': PRIVY_AUTH,
          'privy-app-id': PRIVY_APP_ID,
          'Content-Type': 'application/json'
        },
        signal: AbortSignal.timeout(10000)
      });

      if (!userRes.ok) {
        const err = await userRes.text();
        return res.status(userRes.status).json({ error: 'User not found: ' + err });
      }

      const user = await userRes.json();
      const wallet = user.wallets?.[0];

      return res.status(200).json({
        userId: user.id,
        walletAddress: wallet?.address || null,
        walletId: wallet?.id || null
      });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

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