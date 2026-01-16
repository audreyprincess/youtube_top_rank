const API_URL = 'https://www.googleapis.com/youtube/v3/videos';

// State
let state = {
    apiKey: '',
    regionCode: 'US',
    maxResults: 50
};

// DOM Elements
const elements = {
    apiKeyInput: document.getElementById('apiKeyInput'),
    saveKeyBtn: document.getElementById('saveKeyBtn'),
    adminControls: document.getElementById('adminControls'),
    regionSelect: document.getElementById('regionSelect'),
    topCount: document.getElementById('topCount'),
    loadBtn: document.getElementById('loadBtn'),
    videoList: document.getElementById('videoList')
};

// Formatting utilities
const formatNumber = (num) => {
    return new Intl.NumberFormat('en-US', { notation: "compact", compactDisplay: "short" }).format(num);
};

// Initialization
function init() {
    // Check for Setup Mode
    const urlParams = new URLSearchParams(window.location.search);
    const isSetupMode = urlParams.get('setup') === 'true';

    // Load saved API key
    const savedApiKey = localStorage.getItem('youtubeApiKey');
    if (savedApiKey) {
        state.apiKey = savedApiKey;
    }

    if (state.apiKey && !isSetupMode) {
        fetchData();
    } else if (isSetupMode) {
        elements.adminControls.classList.remove('hidden');
        if (!state.apiKey) {
            elements.videoList.innerHTML = '<div class="loading-state">Please enter your YouTube Data API Key to continue...</div>';
        }
    } else {
        elements.videoList.innerHTML = '<div class="loading-state">Please visit <a href="?setup=true">?setup=true</a> to enter API Key first.</div>';
    }

    // Event Listeners
    elements.saveKeyBtn.addEventListener('click', saveSetup);
    elements.loadBtn.addEventListener('click', fetchData);

    elements.regionSelect.addEventListener('change', (e) => {
        state.regionCode = e.target.value;
        if (state.apiKey) fetchData();
    });

    elements.topCount.addEventListener('change', (e) => {
        let val = parseInt(e.target.value);
        if (val < 10) val = 10;
        if (val > 50) val = 50;
        state.maxResults = val;
        elements.topCount.value = val;
        if (state.apiKey) fetchData();
    });
}

function saveSetup() {
    const key = elements.apiKeyInput.value.trim();
    if (key) {
        localStorage.setItem('youtubeApiKey', key);
        state.apiKey = key;
        alert('✅ API Key saved! Loading videos...');
        elements.adminControls.classList.add('hidden');
        fetchData();
    } else {
        alert('❌ Please enter a valid API Key');
    }
}

async function fetchData() {
    if (!state.apiKey) {
        elements.videoList.innerHTML = '<div class="loading-state">API Key required. <a href="?setup=true">Setup now</a></div>';
        return;
    }

    elements.videoList.innerHTML = '<div class="loading-state">🔄 Loading top videos...</div>';

    try {
        const apiUrl = `${API_URL}?` +
            `part=snippet,statistics&` +
            `chart=mostPopular&` +
            `regionCode=${state.regionCode}&` +
            `maxResults=${state.maxResults}&` +
            `key=${state.apiKey}`;

        const response = await fetch(apiUrl);
        
        if (!response.ok) {
            throw new Error(`API Error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();

        if (data.error) {
            throw new Error(data.error.message || 'Unknown API error');
        }

        renderVideos(data.items || []);

    } catch (error) {
        console.error('Error fetching data:', error);
        elements.videoList.innerHTML = `
            <div class="loading-state" style="color: #e74c3c;">
                ❌ Error: ${error.message}<br>
                <small>Check API key quota or try different region</small>
            </div>
        `;
    }
}

function renderVideos(videos) {
    if (!videos || videos.length === 0) {
        elements.videoList.innerHTML = '<div class="loading-state">No videos found for this region.</div>';
        return;
    }

    const html = videos.map((video, index) => {
        const rank = index + 1;
        const { snippet, statistics = {} } = video;
        const viewCount = statistics.viewCount ? formatNumber(statistics.viewCount) + ' views' : 'N/A';
        const likeCount = statistics.likeCount ? formatNumber(statistics.likeCount) + ' likes' : 'N/A';

        const thumb = snippet.thumbnails?.medium?.url || snippet.thumbnails?.default?.url || '';

        return `
            <div class="video-item ${rank === 1 ? 'rank-1' : ''}">
                <div class="col-rank">
                    <span class="rank-number">#${rank}</span>
                </div>
                <div class="col-thumb">
                    <div class="thumbnail-wrapper">
                        <img src="${thumb}" alt="${snippet.title}" loading="lazy">
                    </div>
                </div>
                <div class="col-info">
                    <div class="video-info">
                        <h3><a href="https://www.youtube.com/watch?v=${video.id}" target="_blank">${snippet.title}</a></h3>
                        <p class="channel-name">${snippet.channelTitle}</p>
                        <p class="status-item">${new Date(snippet.publishedAt).toLocaleDateString()}</p>
                    </div>
                </div>
                <div class="col-stats">
                    <div class="status-item">👁️ ${viewCount}</div>
                    <div class="status-item">👍 ${likeCount}</div>
                </div>
            </div>
        `;
    }).join('');

    elements.videoList.innerHTML = html;
}

// Start
init();
