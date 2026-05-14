// api/proxy.js — Vercel Serverless Function
// CORS proxy for Polymarket & Manifold APIs

const ALLOWED_ORIGINS = [
    'https://gamma-api.polymarket.com',
    'https://clob.polymarket.com',
    'https://manifold.markets',
    'https://strapi-matic.poly.market'
];

export default async function handler(req, res) {
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const { url } = req.query;

    if (!url) {
        return res.status(400).json({ error: 'Missing url parameter' });
    }

    let targetUrl;
    try {
        targetUrl = new URL(decodeURIComponent(url));
    } catch (e) {
        return res.status(400).json({ error: 'Invalid URL' });
    }

    // Whitelist check
    const isAllowed = ALLOWED_ORIGINS.some(origin => targetUrl.href.startsWith(origin));
    if (!isAllowed) {
        return res.status(403).json({ error: 'URL not allowed: ' + targetUrl.origin });
    }

    try {
        const upstream = await fetch(targetUrl.href, {
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'VURA/1.0'
            }
        });

        if (!upstream.ok) {
            return res.status(upstream.status).json({ error: 'Upstream error: ' + upstream.status });
        }

        const data = await upstream.json();
        // Cache for 15 seconds
        res.setHeader('Cache-Control', 's-maxage=15, stale-while-revalidate=30');
        return res.status(200).json(data);
    } catch (e) {
        console.error('Proxy error:', e.message);
        return res.status(500).json({ error: 'Proxy fetch failed: ' + e.message });
    }
}
