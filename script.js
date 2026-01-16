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
    elements.apiKeyInput = document.getElementById('apiKeyInput');
    elements.saveKeyBtn = document.getElementById('saveKeyBtn');
    elements.adminControls = document.getElementById('adminControls');
    elements.regionSelect = document.getElementById('regionSelect');
    elements.topCount = document.getElementById('topCount');
    elements.loadBtn = document.getElementById('loadBtn');
    elements.videoList = document.getElementById('videoList');

    const urlParams = new URLSearchParams(window.location.search);
    const isSetupMode = urlParams.get('setup') === 'true';

    // 1. localStorage에서 키 로드
    const savedApiKey = localStorage.getItem('youtubeApiKey');
    if (savedApiKey) {
        state.apiKey = savedApiKey;
    }

    // 2. UI 구성: setup 모드에서만 관리자 창 노출
    if (isSetupMode) {
        elements.adminControls.classList.remove('hidden');
        if (state.apiKey) {
            elements.apiKeyInput.value = state.apiKey;
        }
    }

    // 3. 초기 데이터 로드
    if (state.apiKey) {
        fetchData();
    } else {
        elements.videoList.innerHTML = `
            <div class="loading-state">
                <p>👋 Welcome! To start viewing top videos:</p>
                <p><a href="?setup=true" style="color: #ff0000; font-weight: bold;">[Click here to enter your YouTube API Key]</a></p>
            </div>
        `;
    }

    // Event Listeners
    elements.saveKeyBtn.addEventListener('click', saveSetup);
    elements.loadBtn.addEventListener('click', fetchData);
    elements.regionSelect.addEventListener('change', (e) => {
        state.regionCode = e.target.value;
        if (state.apiKey) fetchData();
    });
    elements.topCount.addEventListener('change', (e) => {
        state.maxResults = Math.min(Math.max(parseInt(e.target.value) || 10, 10), 50);
        elements.topCount.value = state.maxResults;
        if (state.apiKey) fetchData();
    });
}

function saveSetup() {
    const key = elements.apiKeyInput.value.trim();
    if (!key) {
        alert('Please enter an API Key');
        return;
    }
    localStorage.setItem('youtubeApiKey', key);
    alert('✅ API Key saved! Refreshing page...');
    window.location.href = window.location.pathname; // setup 파라미터 제거
}

async function fetchData() {
    if (!state.apiKey) return;

    elements.videoList.innerHTML = `<div class="loading-state">🔄 Loading Top ${state.maxResults} videos...</div>`;

    try {
        const params = new URLSearchParams({
            part: 'snippet,statistics',
            chart: 'mostPopular',
            regionCode: state.regionCode,
            maxResults: state.maxResults,
            key: state.apiKey
        });

        const response = await fetch(`${API_URL}?${params}`);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error?.message || 'API request failed');
        }

        renderVideos(data.items || []);
    } catch (error) {
        elements.videoList.innerHTML = `
            <div class="loading-state" style="color: #ff0000;">
                <p>❌ Error: ${error.message}</p>
                <p><small>키가 유효한지 또는 할당량이 남았는지 확인하세요. <a href="?setup=true">[다시 설정]</a></small></p>
            </div>
        `;
    }
}

function renderVideos(videos) {
    if (!videos.length) {
        elements.videoList.innerHTML = `<div class="loading-state">No videos found.</div>`;
        return;
    }

    let html = '';
    videos.forEach((video, index) => {
        const { snippet, statistics = {} } = video;
        const viewCount = formatNumber(statistics.viewCount || 0);
        const likeCount = formatNumber(statistics.likeCount || 0);
        const thumb = snippet.thumbnails?.medium?.url || '';

        html += `
            <div class="video-item ${index === 0 ? 'rank-1' : ''}">
                <div class="col-rank"><span class="rank-number">#${index + 1}</span></div>
                <div class="col-thumb">
                    <div class="thumbnail-wrapper"><img src="${thumb}" loading="lazy"></div>
                </div>
                <div class="col-info">
                    <div class="video-info">
                        <h3><a href="https://www.youtube.com/watch?v=${video.id}" target="_blank">${snippet.title}</a></h3>
                        <p class="channel-name">${snippet.channelTitle}</p>
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

document.addEventListener('DOMContentLoaded', init);
