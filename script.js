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
    videoList: null,
    logoInput: null
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
    elements.logoInput = document.getElementById('logoInput');

    const urlParams = new URLSearchParams(window.location.search);
    const isSetupMode = urlParams.get('setup') === 'true';

    // 1. localStorage에서 키 로드
    const savedApiKey = localStorage.getItem('youtubeApiKey');
    if (savedApiKey) {
        state.apiKey = savedApiKey;
    }

    // 2. UI 구성: setup 모드이거나 키가 없을 때만 관리자 창 노출
    if (isSetupMode) {
        elements.adminControls.classList.remove('hidden');
        if (state.apiKey) {
            elements.apiKeyInput.value = state.apiKey; // 기존 키 표시
        }
    }

    // 3. 데이터 로드 로직
    if (state.apiKey) {
        fetchData();
    } else if (!isSetupMode) {
        elements.videoList.innerHTML = `
            <div class="loading-state">
                <p>🔥 Real-time YouTube Top Videos!</p>
                <p><a href="?setup=true" style="color: #ff0000; font-weight: bold; text-decoration: none;">[Click here to enter API Key to start]</a></p>
            </div>
        `;
    }

    // Event Listeners
    if (elements.saveKeyBtn) elements.saveKeyBtn.addEventListener('click', saveSetup);
    if (elements.loadBtn) elements.loadBtn.addEventListener('click', fetchData);
    if (elements.regionSelect) elements.regionSelect.addEventListener('change', handleRegionChange);
    if (elements.topCount) elements.topCount.addEventListener('change', handleCountChange);
}

// API 키 및 설정 저장 (localStorage 활용)
function saveSetup() {
    const key = elements.apiKeyInput.value.trim();
    
    if (key.length === 0) {
        alert('❌ Please enter your YouTube Data API Key');
        return;
    }

    // 보안을 위해 브라우저 로컬 저장소에 보관 (서버가 없으므로 최선의 방법)
    localStorage.setItem('youtubeApiKey', key);
    state.apiKey = key;
    
    alert('✅ API Key saved locally! Loading videos...');
    
    // 저장 후 setup 파라미터 제거하여 깔끔한 URL로 이동
    window.location.href = window.location.pathname;
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
    if (!state.apiKey) return;

    elements.videoList.innerHTML = `<div class="loading-state">🔄 Fetching Top ${state.maxResults} videos...</div>`;

    try {
        const queryParams = new URLSearchParams({
            part: 'snippet,statistics',
            chart: 'mostPopular',
            regionCode: state.regionCode,
            maxResults: state.maxResults,
            key: state.apiKey
        });

        const response = await fetch(`${API_URL}?${queryParams}`);
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || 'API Request Failed');
        }

        const data = await response.json();
        renderVideos(data.items || []);

    } catch (error) {
        console.error('Fetch error:', error);
        elements.videoList.innerHTML = `
            <div class="loading-state" style="color: #e74c3c; background: #ffeaea; padding: 20px; border-radius: 8px;">
                <strong>❌ Error:</strong> ${error.message}<br><br>
                <small>API Key가 올바르지 않거나 할당량이 초과되었을 수 있습니다. <a href="?setup=true">설정 다시하기</a></small>
            </div>
        `;
    }
}

function renderVideos(videos) {
    if (!videos.length) {
        elements.videoList.innerHTML = `<div class="loading-state">No videos found.</div>`;
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
        const viewCount = statistics.viewCount ? formatNumber(statistics.viewCount) : '0';
        const likeCount = statistics.likeCount ? formatNumber(statistics.likeCount) : '0';
        const thumb = snippet.thumbnails?.medium?.url || '';

        html += `
            <div class="video-item ${rank === 1 ? 'rank-1' : ''}">
                <div class="col-rank"><span class="rank-number">#${rank}</span></div>
                <div class="col-thumb">
                    <div class="thumbnail-wrapper">
                        <img src="${thumb}" alt="thumbnail" loading="lazy">
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
    });

    elements.videoList.innerHTML = html;
}

document.addEventListener('DOMContentLoaded', init);
