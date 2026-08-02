export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { url } = req.query;

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
    console.log('Proxying:', targetUrl.substring(0, 80) + '...');
    
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9'
      },
      signal: controller.signal
    });
    
    clearTimeout(timeout);
    
    if (!response.ok) {
      console.log('API error:', response.status, response.statusText);
      return res.status(response.status).json({ 
        error: `API responded with ${response.status}`,
        status: response.status
      });
    }
    
    const contentType = response.headers.get('content-type') || '';
    let data;
    
    if (contentType.includes('application/json')) {
      data = await response.json();
    } else {
      const text = await response.text();
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }
    }
    
    return res.status(200).json(data);
  } catch (error) {
    console.log('Proxy error:', error.message);
    return res.status(500).json({ error: error.message });
  }
}