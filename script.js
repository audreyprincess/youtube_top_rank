const API_URL = 'https://www.googleapis.com/youtube/v3/videos';

// State
let state = {
    apiKey: '', // Managed by server
    logo: '',
    regionCode: 'US',
    maxResults: 50
};

// DOM Elements
const elements = {
    apiKeyInput: document.getElementById('apiKeyInput'),
    saveKeyBtn: document.getElementById('saveKeyBtn'),
    adminControls: document.getElementById('adminControls'),
    logoContainer: document.getElementById('logoContainer'),
    logoInput: document.getElementById('logoInput'),
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

    // Fetch Config from Server
    fetch('/api/config')
        .then(res => res.json())
        .then(config => {
            if (config.logo) {
                elements.logoContainer.innerHTML = `<img src="${config.logo}" alt="Channel Logo">`;
            }
            if (!config.isConfigured && !isSetupMode) {
                elements.videoList.innerHTML = '<div class="loading-state">Server not configured. Please visit <a href="?setup=true">?setup=true</a> to set API Key.</div>';
            } else if (config.isConfigured) {
                fetchData();
            }
        })
        .catch(err => {
            console.error(err);
            elements.videoList.innerHTML = '<div class="loading-state">Error connecting to server. Please ensure <code>npm start</code> is running.</div>';
        });

    if (isSetupMode) {
        elements.adminControls.classList.remove('hidden');
    }

    // Event Listeners
    elements.saveKeyBtn.addEventListener('click', saveSetup); // Unified save

    // Logo Upload
    elements.logoInput.addEventListener('change', handleLogoUpload);

    elements.loadBtn.addEventListener('click', fetchData);

    elements.regionSelect.addEventListener('change', (e) => {
        state.regionCode = e.target.value;
        fetchData(); // Auto reload on region change
    });

    elements.topCount.addEventListener('change', (e) => {
        let val = parseInt(e.target.value);
        if (val < 10) val = 10;
        if (val > 50) val = 50; // API page size limit is usually 50
        state.maxResults = val;
        elements.topCount.value = val;
    });

    // Optional: Load initial data if key exists
    if (state.apiKey) {
        fetchData();
    }
}

function saveSetup() {
    const key = elements.apiKeyInput.value.trim();
    if (key) {
        // Send to server
        fetch('/api/setup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ apiKey: key })
        })
            .then(res => res.json())
            .then(data => {
                if (data.success) {
                    alert('API Key saved to server!');
                    fetchData();
                }
            })
            .catch(err => alert('Error saving key to server: ' + err.message));
    }
}

function handleLogoUpload(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function (event) {
            const dataUrl = event.target.result;
            // Send to server
            fetch('/api/setup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ logo: dataUrl })
            })
                .then(() => {
                    elements.logoContainer.innerHTML = `<img src="${dataUrl}" alt="Channel Logo">`;
                    alert('Logo saved to server!');
                });
        };
        reader.readAsDataURL(file);
    }
}

async function fetchData() {
    elements.videoList.innerHTML = '<div class="loading-state">Loading top videos...</div>';

    try {
        const params = new URLSearchParams({
            regionCode: state.regionCode,
            maxResults: state.maxResults
        });

        // Request to Local Server
        const response = await fetch(`/api/videos?${params}`);
        const data = await response.json();

        if (data.error) {
            throw new Error(data.error.message);
        }

        renderVideos(data.items);

    } catch (error) {
        console.error('Error fetching data:', error);
        elements.videoList.innerHTML = `<div class="loading-state" style="color: red;">Error: ${error.message}</div>`;
    }
}

function renderVideos(videos) {
    if (!videos || videos.length === 0) {
        elements.videoList.innerHTML = '<div class="loading-state">No videos found for this region.</div>';
        return;
    }

    const html = videos.map((video, index) => {
        const rank = index + 1;
        const { snippet, statistics } = video;
        const viewCount = statistics.viewCount ? formatNumber(statistics.viewCount) + ' views' : 'N/A';
        const likeCount = statistics.likeCount ? formatNumber(statistics.likeCount) + ' likes' : 'N/A';

        // High resolution thumbnail preferred, fallback to medium/default
        const thumb = snippet.thumbnails.medium?.url || snippet.thumbnails.default?.url;

        return `
            <div class="video-item">
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
