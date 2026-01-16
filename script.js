let state = {
    regionCode: 'US', 
    maxResults: 50
};

const elements = {
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
    elements.regionSelect = document.getElementById('regionSelect');
    elements.topCount = document.getElementById('topCount');
    elements.loadBtn = document.getElementById('loadBtn');
    elements.videoList = document.getElementById('videoList');
    elements.statusMessage = document.getElementById('statusMessage');

    // 1. 초기값 US 강제 동기화
    elements.regionSelect.value = state.regionCode;

    // 2. 즉시 로드
    fetchData();

    // 3. 이벤트
    elements.loadBtn.addEventListener('click', fetchData);
    elements.regionSelect.addEventListener('change', (e) => {
        state.regionCode = e.target.value;
        fetchData();
    });
}

async function fetchData() {
    const countryName = elements.regionSelect.options[elements.regionSelect.selectedIndex].text;
    elements.statusMessage.innerHTML = `📍 Showing <b>Real-time Popular</b> in <b>${countryName}</b>`;
    elements.videoList.innerHTML = `<div class="loading-state">🔄 Syncing with YouTube Global Server...</div>`;

    try {
        // 내 서버의 프록시 API를 호출 (보안 유지)
        const response = await fetch(`/api/videos?regionCode=${state.regionCode}&maxResults=${state.maxResults}`);
        const data = await response.json();

        if (data.error) throw new Error(data.error);

        renderVideos(data.items || []);
    } catch (error) {
        elements.videoList.innerHTML = `<div class="loading-state" style="color:#ff0000;">❌ Security Error: ${error.message}</div>`;
    }
}

function renderVideos(videos) {
    if (!videos.length) {
        elements.videoList.innerHTML = `<div class="loading-state">No data available.</div>`;
        return;
    }

    let html = `
        <div class="table-header">
            <div class="col-rank">Rank</div>
            <div class="col-thumb">Thumbnail</div>
            <div class="col-info">Video Info (Real-time)</div>
            <div class="col-stats">Stats</div>
        </div>
    `;

    videos.forEach((video, index) => {
        const { snippet, statistics = {} } = video;
        const rank = index + 1;
        html += `
            <div class="video-item ${rank === 1 ? 'rank-1' : ''}">
                <div class="col-rank"><span class="rank-number">#${rank}</span></div>
                <div class="col-thumb">
                    <div class="thumbnail-wrapper"><img src="${snippet.thumbnails?.medium?.url}" loading="lazy"></div>
                </div>
                <div class="col-info">
                    <div class="video-info">
                        <h3><a href="https://www.youtube.com/watch?v=${video.id}" target="_blank">${snippet.title}</a></h3>
                        <p class="channel-name">${snippet.channelTitle}</p>
                    </div>
                </div>
                <div class="col-stats">
                    <div class="status-item">👁️ ${formatNumber(statistics.viewCount)} Views</div>
                    <div class="status-item">👍 ${formatNumber(statistics.likeCount)} Likes</div>
                </div>
            </div>
        `;
    });
    elements.videoList.innerHTML = html;
}

document.addEventListener('DOMContentLoaded', init);
