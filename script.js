// ▼▼▼ 여기에 본인의 유튜브 API 키를 입력하세요 (따옴표 안에) ▼▼▼
const YOUR_API_KEY = 'AIzaSyDI8AbWK49yqG130hoJEZ3lWcvYf3lwAHQ'; 
// ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲

const API_BASE_URL = 'https://www.googleapis.com/youtube/v3/videos';

let state = {
    regionCode: 'US', // 기본값 US
    maxResults: 50
};

const elements = {
    regionSelect: null,
    topCount: null,
    loadBtn: null,
    videoList: null,
    statusMessage: null
};

/**
 * 1. 티스토리 부모창으로 현재 높이를 전송하는 함수 (추가됨)
 */
function sendHeightToParent() {
    const height = document.documentElement.scrollHeight || document.body.scrollHeight;
    // 티스토리(부모)에게 메시지 전송
    window.parent.postMessage({ type: 'resize', height: height }, '*');
}

const formatNumber = (num) => {
    if (!num) return '0';
    return new Intl.NumberFormat('en-US', { notation: "compact", compactDisplay: "short" }).format(num);
};

function init() {
    elements.regionSelect = document.getElementById('regionSelect');
    elements.topCount = document.getElementById('topCount');
    elements.loadBtn = document.getElementById('loadBtn');
    elements.videoList = document.getElementById('videoList');
    elements.statusMessage = document.getElementById('statusMessage');

    // 1. 초기값 US 강제 동기화
    if (elements.regionSelect) elements.regionSelect.value = 'US';
    state.regionCode = 'US';

    // 2. 키 체크 및 실행
    if (!YOUR_API_KEY || YOUR_API_KEY === '여기에_본인의_API_키를_넣으세요') {
        elements.videoList.innerHTML = `<div class="loading-state" style="color:red; font-weight:bold;">
            script.js 파일을 열어서 맨 윗줄에 API Key를 입력해주세요.
        </div>`;
        return;
    }

    fetchData();

    // 3. 이벤트 연결
    elements.loadBtn?.addEventListener('click', fetchData);
    elements.regionSelect?.addEventListener('change', (e) => {
        state.regionCode = e.target.value;
        fetchData();
    });
    elements.topCount?.addEventListener('change', (e) => {
        state.maxResults = Math.min(Math.max(parseInt(e.target.value) || 10, 10), 50);
        fetchData();
    });

    // 창 크기가 변할 때도 높이 다시 전송
    window.addEventListener('resize', sendHeightToParent);
}

async function fetchData() {
    const countryName = elements.regionSelect.options[elements.regionSelect.selectedIndex].text;
    if(elements.statusMessage) {
        elements.statusMessage.innerHTML = `📍 Real-time Trending in <b>${countryName}</b>`;
    }
    
    elements.videoList.innerHTML = `<div class="loading-state">🔄 Updating from YouTube...</div>`;

    try {
        const params = new URLSearchParams({
            part: 'snippet,statistics',
            chart: 'mostPopular',
            regionCode: state.regionCode,
            maxResults: state.maxResults,
            key: YOUR_API_KEY
        });

        const response = await fetch(`${API_BASE_URL}?${params}`);
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || 'API Request Failed');
        }

        const data = await response.json();
        renderVideos(data.items || []);

    } catch (error) {
        console.error("API Error:", error);
        elements.videoList.innerHTML = `
            <div class="loading-state" style="color:#ff0000;">
                ❌ Error: ${error.message}<br>
                <small>API 키가 정확한지, 유튜브 할당량이 남았는지 확인하세요.</small>
            </div>`;
        // 에러 상황에서도 높이 조절 실행
        setTimeout(sendHeightToParent, 200);
    }
}

function renderVideos(videos) {
    if (!videos || videos.length === 0) {
        elements.videoList.innerHTML = `<div class="loading-state">No trending videos found.</div>`;
        setTimeout(sendHeightToParent, 200);
        return;
    }

    let html = `
        <div class="table-header">
            <div class="col-rank">Rank</div>
            <div class="col-thumb">Thumbnail</div>
            <div class="col-info">Trending Info</div>
            <div class="col-stats">Stats</div>
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
                        <img src="${snippet.thumbnails?.medium?.url}" loading="lazy" alt="thumb">
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
                    <div class="status-item">👁️ ${views}</div>
                    <div class="status-item">👍 ${likes}</div>
                </div>
            </div>
        `;
    });
    
    elements.videoList.innerHTML = html;

    /**
     * 리스트가 생성된 후 높이를 측정하여 부모(티스토리)에게 전송
     * 이미지가 로드되는 시간을 고려하여 300ms 정도 지연 후 실행
     */
    setTimeout(sendHeightToParent, 300);
}

document.addEventListener('DOMContentLoaded', init);
