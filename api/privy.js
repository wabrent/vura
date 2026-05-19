// Vercel Serverless: Privy auth — create user + embedded wallet

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const PRIVY_APP_ID = process.env.PRIVY_APP_ID || 'cmpcnahqh001m0ci59bk1lokk';
  const PRIVY_APP_SECRET = process.env.PRIVY_APP_SECRET;

  if (!PRIVY_APP_SECRET) {
    return res.status(500).json({ error: 'PRIVY_APP_SECRET not set' });
  }

  const PRIVY_AUTH = 'Basic ' + Buffer.from(PRIVY_APP_ID + ':' + PRIVY_APP_SECRET).toString('base64');
  const PRIVY_BASE = 'https://api.privy.io/v1';

  try {
    // 1. Create user
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
      console.error('Privy user failed:', userRes.status, err);
      return res.status(userRes.status).json({ error: 'User creation failed: ' + err });
    }

    const user = await userRes.json();

    // 2. Create embedded wallet
    const walletRes = await fetch(`${PRIVY_BASE}/wallets`, {
      method: 'POST',
      headers: {
        'Authorization': PRIVY_AUTH,
        'privy-app-id': PRIVY_APP_ID,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        chain_type: 'ethereum',
        owner: { user_id: user.id }
      }),
      signal: AbortSignal.timeout(15000)
    });

    if (!walletRes.ok) {
      const err = await walletRes.text();
      console.error('Privy wallet failed:', walletRes.status, err);
      return res.status(walletRes.status).json({ error: 'Wallet creation failed: ' + err });
    }

    const wallet = await walletRes.json();

    return res.status(200).json({
      userId: user.id,
      walletAddress: wallet.address,
      walletId: wallet.id
    });
  } catch (e) {
    console.error('Privy error:', e);
    return res.status(500).json({ error: e.message });
  }
}
