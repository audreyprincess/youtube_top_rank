const API_URL = 'https://www.googleapis.com/youtube/v3/videos';

// 1. 초기 상태 설정 (regionCode를 KR로 변경)
let state = {
    apiKey: '',
    regionCode: 'KR', 
    maxResults: 50
};

const elements = {
    apiKeyInput: null,
    saveKeyBtn: null,
    adminControls: null,
    regionSelect: null,
    topCount: null,
    loadBtn: null,
    videoList: null
};

const formatNumber = (num) => {
    return new Intl.NumberFormat('en-US', { notation: "compact", compactDisplay: "short" }).format(num);
};

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
    const urlKey = urlParams.get('key');

    // API 키 로드 우선순위
    if (urlKey) {
        state.apiKey = urlKey;
    } else {
        const savedApiKey = localStorage.getItem('youtubeApiKey');
        if (savedApiKey) {
            state.apiKey = savedApiKey;
        }
    }

    // 2. UI와 State 동기화 (HTML 선택창을 KR로 강제 설정)
    if (elements.regionSelect) {
        elements.regionSelect.value = state.regionCode; 
    }

    if (isSetupMode) {
        if (elements.adminControls) elements.adminControls.classList.remove('hidden');
        if (state.apiKey && elements.apiKeyInput) {
            elements.apiKeyInput.value = state.apiKey;
        }
    }

    if (state.apiKey) {
        fetchData();
    } else {
        elements.videoList.innerHTML = `
            <div class="loading-state">
                <p>👋 Welcome! To start viewing top videos:</p>
                <p><a href="?setup=true" style="color: #ff0000; font-weight: bold; text-decoration: none;">[Click here to enter your YouTube API Key]</a></p>
            </div>
        `;
    }

    if (elements.saveKeyBtn) elements.saveKeyBtn.addEventListener('click', saveSetup);
    if (elements.loadBtn) elements.loadBtn.addEventListener('click', fetchData);
    
    if (elements.regionSelect) {
        elements.regionSelect.addEventListener('change', (e) => {
            state.regionCode = e.target.value;
            if (state.apiKey) fetchData();
        });
    }
    
    if (elements.topCount) {
        elements.topCount.addEventListener('change', (e) => {
            state.maxResults = Math.min(Math.max(parseInt(e.target.value) || 10, 10), 50);
            elements.topCount.value = state.maxResults;
            if (state.apiKey) fetchData();
        });
    }
}

function saveSetup() {
    const key = elements.apiKeyInput.value.trim();
    if (!key) {
        alert('Please enter an API Key');
        return;
    }
    localStorage.setItem('youtubeApiKey', key);
    alert('✅ API Key saved locally! Refreshing page...');
    window.location.href = window.location.pathname;
}

async function fetchData() {
    if (!state.apiKey) return;

    elements.videoList.innerHTML = `<div class="loading-state">🔄 Loading Top ${state.maxResults} videos (${state.regionCode})...</div>`;

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
        console.error('Fetch error:', error);
        elements.videoList.innerHTML = `
            <div class="loading-state" style="color: #ff0000; padding: 20px;">
                <p>❌ Error: ${error.message}</p>
                <p><small><a href="?setup=true">[다시 설정하기]</a></small></p>
            </div>
        `;
    }
}

function renderVideos(videos) {
    if (!videos || videos.length === 0) {
        elements.videoList.innerHTML = `<div class="loading-state">No videos found.</div>`;
        return;
    }

    let html = '';
    videos.forEach((video, index) => {
        const rank = index + 1;
        const { snippet, statistics = {} } = video;
        const viewCount = formatNumber(statistics.viewCount || 0);
        const likeCount = formatNumber(statistics.likeCount || 0);
        const thumb = snippet.thumbnails?.medium?.url || '';

        html += `
            <div class="video-item ${rank === 1 ? 'rank-1' : ''}">
                <div class="col-rank"><span class="rank-number">#${rank}</span></div>
                <div class="col-thumb">
                    <div class="thumbnail-wrapper"><img src="${thumb}" alt="${snippet.title}" loading="lazy"></div>
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

    const headerHtml = `
        <div class="table-header">
            <div class="col-rank">Rank</div>
            <div class="col-thumb">Thumbnail</div>
            <div class="col-info">Video Info</div>
            <div class="col-stats">Stats</div>
        </div>
    `;
    elements.videoList.innerHTML = headerHtml + html;
}

document.addEventListener('DOMContentLoaded', init);
