const API_URL = 'https://www.googleapis.com/youtube/v3/videos';

// 애플리케이션 상태 관리
let state = {
    apiKey: '',
    regionCode: 'US',
    maxResults: 50
};

// DOM 요소 참조
const elements = {
    apiKeyInput: null,
    saveKeyBtn: null,
    adminControls: null,
    regionSelect: null,
    topCount: null,
    loadBtn: null,
    videoList: null
};

// 숫자 포맷팅 (조, 억, 만 등 단위 변환)
const formatNumber = (num) => {
    return new Intl.NumberFormat('en-US', { notation: "compact", compactDisplay: "short" }).format(num);
};

/**
 * 초기화 함수
 */
function init() {
    // DOM 요소 연결
    elements.apiKeyInput = document.getElementById('apiKeyInput');
    elements.saveKeyBtn = document.getElementById('saveKeyBtn');
    elements.adminControls = document.getElementById('adminControls');
    elements.regionSelect = document.getElementById('regionSelect');
    elements.topCount = document.getElementById('topCount');
    elements.loadBtn = document.getElementById('loadBtn');
    elements.videoList = document.getElementById('videoList');

    // URL 파라미터 확인
    const urlParams = new URLSearchParams(window.location.search);
    const isSetupMode = urlParams.get('setup') === 'true';
    const urlKey = urlParams.get('key'); // URL에 포함된 ?key=... 값

    // 1. API 키 로드 우선순위 결정
    if (urlKey) {
        // 티스토리 iframe 등에서 URL로 넘겨준 키가 가장 우선
        state.apiKey = urlKey;
    } else {
        // URL에 키가 없으면 브라우저 로컬 저장소 확인
        const savedApiKey = localStorage.getItem('youtubeApiKey');
        if (savedApiKey) {
            state.apiKey = savedApiKey;
        }
    }

    // 2. 관리자 모드(setup=true)일 때만 설정창 노출
    if (isSetupMode) {
        if (elements.adminControls) elements.adminControls.classList.remove('hidden');
        if (state.apiKey && elements.apiKeyInput) {
            elements.apiKeyInput.value = state.apiKey;
        }
    }

    // 3. 키가 있으면 즉시 데이터 로드, 없으면 안내 문구 표시
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

    // 이벤트 리스너 등록
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

/**
 * API 키 저장 (Local Storage)
 */
function saveSetup() {
    const key = elements.apiKeyInput.value.trim();
    if (!key) {
        alert('Please enter an API Key');
        return;
    }
    localStorage.setItem('youtubeApiKey', key);
    alert('✅ API Key saved locally! Refreshing page...');
    // 설정 완료 후 setup 파라미터 없이 깔끔한 URL로 이동
    window.location.href = window.location.pathname;
}

/**
 * 유튜브 데이터 가져오기 (Proxy 서버 없이 직접 호출)
 */
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
        console.error('Fetch error:', error);
        elements.videoList.innerHTML = `
            <div class="loading-state" style="color: #ff0000; padding: 20px;">
                <p>❌ Error: ${error.message}</p>
                <p><small>키가 유효한지 확인하세요. <a href="?setup=true">[다시 설정하기]</a></small></p>
            </div>
        `;
    }
}

/**
 * 비디오 리스트 렌더링
 */
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
                    <div class="status-item">👁️ ${viewCount} Views</div>
                    <div class="status-item">👍 ${likeCount} Likes</div>
                </div>
            </div>
        `;
    });

    // 테이블 헤더와 함께 삽입
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

// DOM 로드 완료 시 실행
document.addEventListener('DOMContentLoaded', init);
