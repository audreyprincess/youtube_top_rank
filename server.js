const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;
const CONFIG_FILE = path.join(__dirname, 'config.json');

app.use(cors());
app.use(bodyParser.json({ limit: '10mb' })); // Limit for logo upload
app.use(express.static(__dirname)); // Serve static files

// Load Config
function loadConfig() {
    if (fs.existsSync(CONFIG_FILE)) {
        return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    }
    return { apiKey: '', logo: '' };
}

// Save Config
function saveConfig(config) {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

// GET /api/config (Public)
app.get('/api/config', (req, res) => {
    const config = loadConfig();
    // NEVER return the API key
    res.json({ logo: config.logo, isConfigured: !!config.apiKey });
});

// POST /api/setup (Admin)
app.post('/api/setup', (req, res) => {
    const { apiKey, logo } = req.body;
    const config = loadConfig();

    if (apiKey) config.apiKey = apiKey;
    if (logo !== undefined) config.logo = logo; // logo can be empty string

    saveConfig(config);
    res.json({ success: true });
});

// GET /api/videos (Proxy)
app.get('/api/videos', async (req, res) => {
    const config = loadConfig();
    if (!config.apiKey) {
        return res.status(500).json({ error: { message: 'Server not configured. Please run setup.' } });
    }

    try {
        const { regionCode = 'US', maxResults = 50 } = req.query;
        const response = await axios.get('https://www.googleapis.com/youtube/v3/videos', {
            params: {
                part: 'snippet,statistics',
                chart: 'mostPopular',
                regionCode,
                maxResults,
                key: config.apiKey
            }
        });
        res.json(response.data);
    } catch (error) {
        console.error('YouTube API Error:', error.response?.data || error.message);
        res.status(error.response?.status || 500).json({
            error: error.response?.data?.error || { message: 'Internal Server Error' }
        });
    }
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
    console.log(`Open http://localhost:${PORT} in your browser.`);
});
