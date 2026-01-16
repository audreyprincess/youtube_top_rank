const API_URL = 'https://www.googleapis.com/youtube/v3/videos';

// State
let state = {
    apiKey: '',
    regionCode: 'US',
    maxResults: 50
};

// DOM Elements
const elements = {
    apiKeyInput: null,
    saveKeyBtn: null,
    adminControls: null,
    regionSelect: null,
    topCount: null,
    loadBtn: null,
    videoList: null
};

// Formatting utilities
const formatNumber = (num) => {
    return new Intl.NumberFormat('en-US', { notation: "compact", compactDisplay: "short" }).format(num);
};

// Initialization
function init() {
    // Get DOM elements
    elements.apiKeyInput = document.getElementById('apiKeyInput');
    elements.saveKeyBtn = document.getElementById('saveKeyBtn');
    elements.adminControls = document.getElementById('adminControls');
    elements.regionSelect = document.getElementById('regionSelect');
    elements.topCount = document.getElementById('topCount');
    elements.loadBtn = document.getElementById('loadBtn');
    elements.videoList = document.getElementById('videoList');

    // Check for Setup Mode
    const urlParams = new URLSearchParams(window.location.search);
    const isSetupMode = urlParams.get('setup') === 'true';

    // Load saved API key from localStorage
    const savedApiKey = localStorage.getItem('youtubeApiKey');
    if (savedApiKey) {
        state.apiKey = savedApiKey;
    }

    // Setup UI based on state
    if (state.apiKey && !isSetupMode) {
        fetchData();
    } else if (isSetupMode) {
        elements.adminControls.classList.remove('hidden');
        if (!state.apiKey) {
            elements.videoList.innerHTML = '<div class="loading-state">Please enter your YouTube Data API Key:</div>';
        } else {
            fetchData();
        }
    } else {
        elements.videoList.innerHTML = `
            <div class="loading-state">
                <p>🔥 Real-time YouTube Top Videos!</p>
                <p><a href="?setup=true" style="color: #1da1f2;">Click here to enter API Key →</a></p>
            </div>
        `;
    }

    // Event Listeners
    if (elements.saveKeyBtn) elements.saveKeyBtn.addEventListener('click', saveSetup);
    if (elements.loadBtn) elements.loadBtn.addEventListener('click', fetchData);
    if (elements.regionSelect) elements.regionSelect.addEventListener('change', handleRegionChange);
    if (elements.topCount) elements.topCount.addEventListener('change', handleCountChange);
}

function saveSetup() {
    const key = elements.apiKeyInput.value.trim();
    if (key.length === 0) {
        alert('❌ Please enter your YouTube Data API Key');
        return;
    }

    // Save to localStorage (GitHub Pages 호환!)
    localStorage.setItem('youtubeApiKey', key);
    state.apiKey = key;
    
    alert('✅ API Key saved! Loading Top Videos...');
    elements.adminControls.classList.add('hidden');
    fetchData();
}

function handleRegionChange(e) {
    state.regionCode = e.target.value;
    if (state.apiKey) fetchData();
}

function handleCountChange(e) {
    let val = parseInt(e.target.value);
    if (val < 10) val = 10;
    if (val > 50) val = 50;
    state.maxResults = val;
    elements.topCount.value = val;
    if (state.apiKey) fetchData();
}

async function fetchData() {
    if (!state.apiKey) {
        elements.videoList.innerHTML = '<div class="loading-state">API Key required. <a href="?setup=true">Enter API Key</a></div>';
        return;
    }

    elements.videoList.innerHTML = '<div class="loading-state">🔄 Loading Top ' + state.maxResults + ' videos from ' + state.regionCode + '...</div>';

    try {
        const apiUrl = `${API_URL}?` +
            `part=snippet,statistics&` +
            `chart=mostPopular&` +
            `regionCode=${encodeURIComponent(state.regionCode)}&` +
            `maxResults=${state.maxResults}&` +
            `key=${encodeURIComponent(state.apiKey)}`;

        const response = await fetch(apiUrl);
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`API Error ${response.status}: ${errorText.substring(0, 100)}...`);
        }

        const data = await response.json();

        if (data.error) {
            throw new Error(data.error.message || JSON.stringify(data.error));
        }

        renderVideos(data.items || []);

    } catch (error) {
        console.error('Fetch error:', error);
        elements.videoList.innerHTML = `
            <div class="loading-state" style="color: #e74c3c; background: #ffeaea; padding: 20px; border-radius: 8px;">
                <strong>❌ Error:</strong> ${error.message}<br><br>
                <small>
                    🔑 Check your API Key quota<br>
                    🌍 Try different country/lower count<br>
                    📞 <a href="?setup=true">Reset API Key</a>
                </small>
            </div>
        `;
    }
}

function renderVideos(videos) {
    if (!videos || videos.length === 0) {
        elements.videoList.innerHTML = `
            <div class="loading-state">
                No videos found for ${state.regionCode}. Try another country!
            </div>
        `;
        return;
    }

    let html = `
        <div class="table-header">
            <div class="col-rank">Rank</div>
            <div class="col-thumb">Thumbnail</div>
            <div class="col-info">Video Info</div>
            <div class="col-stats">Stats</div>
        </div>
    `;

    videos.forEach((video, index) => {
        const rank = index + 1;
        const { snippet, statistics = {} } = video;
        const viewCount = statistics.viewCount ? formatNumber(statistics.viewCount) + ' views' : 'N/A';
        const likeCount = statistics.likeCount ? formatNumber(statistics.likeCount) + ' likes' : 'N/A';
        const thumb = snippet.thumbnails?.medium?.url || snippet.thumbnails?.default?.url || '';

        html += `
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
                        <h3><a href="https://www.youtube.com/watch?v=${video.id}" target="_blank" rel="noopener">${snippet.title}</a></h3>
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
    });

    elements.videoList.innerHTML = html;
}

// Start app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
