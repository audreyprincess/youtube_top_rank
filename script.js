const API_URL = 'https://www.googleapis.com/youtube/v3/videos';

let state = {
    apiKey: '',
    regionCode: 'US', // 기본값 미국
    maxResults: 50
};

const elements = {
    apiKeyInput: null,
    saveKeyBtn: null,
    adminControls: null,
    regionSelect: null,
    topCount: null,
    loadBtn: null,
    videoList: null,
    statusMessage: null
};

const formatNumber = (num) => {
    if (!num) return '0';
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
    elements.statusMessage = document.getElementById('statusMessage');

    const urlParams = new URLSearchParams(window.location.search);
    const isSetupMode = urlParams.get('setup') === 'true';
    const urlKey = urlParams.get('key');

    // 1. API 키 로드
    if (urlKey) {
        state.apiKey = urlKey;
    } else {
        state.apiKey = localStorage.getItem('youtubeApiKey') || '';
    }

    // 2. 초기 화면 설정 동기화 (HTML 메뉴를 US로 강제 고정)
    if (elements.regionSelect) {
        elements.regionSelect.value = state.regionCode;
    }

    if (isSetupMode && elements.adminControls) {
        elements.adminControls.classList.remove('hidden');
        if (state.apiKey) elements.apiKeyInput.value = state.apiKey;
    }

    // 3. 실행
    if (state.apiKey) {
        fetchData();
    } else {
        elements.videoList.innerHTML = `<div class="loading-state">API Key가 필요합니다. <a href="?setup=true">[설정]</a></div>`;
    }

    // 이벤트 연결
    elements.saveKeyBtn?.addEventListener('click', saveSetup);
    elements.loadBtn?.addEventListener('click', fetchData);
    elements.regionSelect?.addEventListener('change', (e) => {
        state.regionCode = e.target.value; // 국가 변경 즉시 상태 반영
        fetchData();
    });
    elements.topCount?.addEventListener('change', (e) => {
        state.maxResults = Math.min(Math.max(parseInt(e.target.value) || 10, 10), 50);
        fetchData();
    });
}

async function fetchData() {
    if (!state.apiKey) return;

    // 현재 요청 중인 국가 정보를 화면에 표시
    const countryName = elements.regionSelect.options[elements.regionSelect.selectedIndex].text;
    elements.statusMessage.innerHTML = `📍 Showing <b>Real-time Popular</b> videos in <b>${countryName}</b>`;
    elements.videoList.innerHTML = `<div class="loading-state">🔄 Fetching data from YouTube...</div>`;

    try {
        const params = new URLSearchParams({
            part: 'snippet,statistics',
            chart: 'mostPopular', // '인기 급상승' 차트 호출
            regionCode: state.regionCode, // 선택된 국가 코드 전달
            maxResults: state.maxResults,
            key: state.apiKey
        });

        const response = await fetch(`${API_URL}?${params}`);
        const data = await response.json();

        if (!response.ok) throw new Error(data.error?.message || 'API Error');

        renderVideos(data.items || []);
    } catch (error) {
        elements.videoList.innerHTML = `<div class="loading-state" style="color:#ff0000;">❌ Error: ${error.message}</div>`;
    }
}

function renderVideos(videos) {
    if (!videos.length) {
        elements.videoList.innerHTML = `<div class="loading-state">결과가 없습니다.</div>`;
        return;
    }

    let html = `
        <div class="table-header">
            <div class="col-rank">Rank</div>
            <div class="col-thumb">Thumbnail</div>
            <div class="col-info">Video Info</div>
            <div class="col-stats">Stats (Real-time)</div>
        </div>
    `;

    videos.forEach((video, index) => {
        const { snippet, statistics = {} } = video;
        const rank = index + 1;
        const views = formatNumber(statistics.viewCount);
        const likes = formatNumber(statistics.likeCount);

        html += `
            <div class="video-item ${rank === 1 ? 'rank-1' : ''}">
                <div class="col-rank"><span class="rank-number">#${rank}</span></div>
                <div class="col-thumb">
                    <div class="thumbnail-wrapper">
                        <img src="${snippet.thumbnails?.medium?.url}" loading="lazy">
                    </div>
                </div>
                <div class="col-info">
                    <div class="video-info">
                        <h3><a href="https://www.youtube.com/watch?v=${video.id}" target="_blank">${snippet.title}</a></h3>
                        <p class="channel-name">${snippet.channelTitle}</p>
                        <p class="publish-date">${new Date(snippet.publishedAt).toLocaleDateString()}</p>
                    </div>
                </div>
                <div class="col-stats">
                    <div class="status-item">👁️ ${views} Views</div>
                    <div class="status-item">👍 ${likes} Likes</div>
                </div>
            </div>
        `;
    });
    elements.videoList.innerHTML = html;
}

function saveSetup() {
    const key = elements.apiKeyInput.value.trim();
    if (key) {
        localStorage.setItem('youtubeApiKey', key);
        alert('저장되었습니다.');
        window.location.href = window.location.pathname;
    }
}

document.addEventListener('DOMContentLoaded', init);
