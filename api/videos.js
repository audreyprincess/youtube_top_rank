// 서버 사이드에서 실행되므로 브라우저에 키가 노출되지 않음
export default async function handler(req, res) {
    const { regionCode = 'US', maxResults = 50 } = req.query;
    const API_KEY = process.env.YOUTUBE_API_KEY; // .env에서 키를 읽어옴

    const API_URL = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&chart=mostPopular&regionCode=${regionCode}&maxResults=${maxResults}&key=${API_KEY}`;

    try {
        const response = await fetch(API_URL);
        const data = await response.json();
        
        if (!response.ok) throw new Error(data.error?.message || 'YouTube API Error');

        // 클라이언트에게 데이터 전달
        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
}