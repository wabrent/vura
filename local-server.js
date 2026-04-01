const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.static(path.join(__dirname)));

// Proxy endpoint
app.get('/api/proxy', async (req, res) => {
    const { url } = req.query;
    
    if (!url) {
        return res.status(400).json({ error: 'Missing URL parameter' });
    }

    try {
        const targetUrl = decodeURIComponent(url);
        console.log('Proxying:', targetUrl.substring(0, 80) + '...');
        
        const response = await fetch(targetUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0',
                'Accept': 'application/json'
            },
            signal: AbortSignal.timeout(15000)
        });
        
        if (!response.ok) {
            throw new Error(`API responded with ${response.status}`);
        }
        
        const data = await response.json();
        res.json(data);
    } catch (error) {
        console.error('Proxy error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`\n  PolyEdge Server running at http://localhost:${PORT}\n`);
});
