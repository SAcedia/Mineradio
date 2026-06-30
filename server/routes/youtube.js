// ====================================================================
//  YouTube 路由
//  搜索 / 音频 URL / 热门趋势
// ====================================================================
const { sendJSON } = require('../lib/send-json');
const ytDlp = require('yt-dlp-exec');
const ytdl = require('@distube/ytdl-core');
const YouTubeSearch = require('youtube-search-api');

// ---------- 辅助 ----------

function mapYouTubeVideo(v) {
  const thumb = (v.thumbnail && v.thumbnail.thumbnails && v.thumbnail.thumbnails.length)
    ? v.thumbnail.thumbnails[v.thumbnail.thumbnails.length - 1].url : '';
  const duration = parseYouTubeDuration(v.length && v.length.simpleText);
  const channelName = v.channelTitle || v.ownerChannelName || '';
  // 清洗标题：去掉常见后缀和 | 后面的内容
  let cleanName = (v.title || '').replace(/\([^)]*\)/g, '').replace(/\[[^\]]*\]/g, '');
  cleanName = cleanName.replace(/[|│].*$/, '').replace(/\s*(Lyric Video|Official Music Video|Official Video|MV|歌詞|歌词|中英字幕|字幕|Audio Video|4K|HD|1080p|60fps).*$/i, '').trim();
  if (cleanName.length > 60) cleanName = cleanName.substring(0, 57) + '…';
  return {
    provider: 'youtube',
    source: 'youtube',
    type: 'song',
    id: v.id,
    name: cleanName || (v.title || ''),
    artist: channelName,
    artists: [{ name: channelName, id: v.channelId || '' }],
    artistId: v.channelId || '',
    album: '',
    cover: thumb,
    duration,
    fee: 0,
  };
}

function parseYouTubeDuration(text) {
  if (!text) return 0;
  const parts = text.trim().split(':').map(Number);
  if (parts.length === 3) return ((parts[0] * 60) + parts[1]) * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0] || 0;
}

function hashCode(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + c;
    hash |= 0;
  }
  return hash;
}

async function getYouTubeAudioUrl(videoId) {
  // 1. yt-dlp android_tv 客户端 → 纯音频 opus，不需要 cookie/JS runtime
  try {
    const info = await ytDlp('https://www.youtube.com/watch?v=' + videoId, {
      dumpSingleJson: true,
      format: 'bestaudio/best',
      noCheckCertificates: true,
      noWarnings: true,
      preferFreeFormats: true,
      extractorArgs: 'youtube:player_client=android_tv',
      addHeader: ['referer:https://www.youtube.com'],
    });
    if (info && info.url) {
      return {
        url: info.url,
        duration: (info.duration || 0) * 1000,
        title: info.title || '',
        thumbnail: info.thumbnail || '',
        quality: 'yt-dlp',
        container: info.ext || 'webm',
      };
    }
  } catch (e) {
    console.warn('[yt-dlp android_tv] failed for', videoId, ':', e.message);
  }
  // 2. yt-dlp android 客户端回退（可能返回视频+音频混合）
  try {
    const info = await ytDlp('https://www.youtube.com/watch?v=' + videoId, {
      dumpSingleJson: true,
      format: 'bestaudio/best',
      noCheckCertificates: true,
      noWarnings: true,
      preferFreeFormats: true,
      extractorArgs: 'youtube:player_client=android',
      addHeader: ['referer:https://www.youtube.com'],
    });
    if (info && info.url) {
      return {
        url: info.url,
        duration: (info.duration || 0) * 1000,
        title: info.title || '',
        thumbnail: info.thumbnail || '',
        quality: 'yt-dlp',
        container: info.ext || 'm4a',
      };
    }
  } catch (e) {
    console.warn('[yt-dlp android] failed for', videoId, ':', e.message);
  }
  // 3. @distube/ytdl-core 最终回退
  try {
    const info = await ytdl.getInfo('https://www.youtube.com/watch?v=' + videoId);
    const fmt = ytdl.chooseFormat(info.formats, { quality: 'highestaudio', filter: 'audioonly' });
    if (fmt && fmt.url) {
      return {
        url: fmt.url,
        duration: info.videoDetails ? (info.videoDetails.lengthSeconds || 0) * 1000 : 0,
        title: (info.videoDetails && info.videoDetails.title) || '',
        thumbnail: (info.videoDetails && info.videoDetails.thumbnails && info.videoDetails.thumbnails[0] && info.videoDetails.thumbnails[0].url) || '',
        quality: fmt.audioBitrate ? fmt.audioBitrate + 'kbps' : 'ytdl',
        mimeType: fmt.mimeType || '',
        container: fmt.container || '',
      };
    }
  } catch (e) {
    console.warn('[ytdl] failed for', videoId, ':', e.message);
  }
  return null;
}

// ---------- 路由 ----------

const routes = [
  {
    path: '/api/youtube/search',
    handler: async (url, res) => {
      try {
        const kw = url.searchParams.get('keywords') || '';
        const limit = parseInt(url.searchParams.get('limit') || '12');
        if (!kw) { sendJSON(res, { provider: 'youtube', songs: [] }); return; }
        const raw = await YouTubeSearch.GetListByKeyword(kw, false, Math.min(limit, 30));
        const items = Array.isArray(raw.items) ? raw.items : [];
        const songs = items.filter(i => i.type === 'video').map(mapYouTubeVideo);
        sendJSON(res, { provider: 'youtube', songs });
      } catch (err) { console.error('[YouTubeSearch]', err); sendJSON(res, { provider: 'youtube', error: err.message, songs: [] }, 500); }
    },
  },
  {
    path: '/api/youtube/song/url',
    handler: async (url, res) => {
      try {
        const vid = url.searchParams.get('id') || '';
        if (!vid) { sendJSON(res, { provider: 'youtube', url: '', error: 'MISSING_ID' }, 400); return; }
        const result = await getYouTubeAudioUrl(vid);
        if (!result) { sendJSON(res, { provider: 'youtube', url: '', error: 'NO_AUDIO_FORMAT' }, 404); return; }
        sendJSON(res, {
          provider: 'youtube',
          id: vid,
          url: result.url,
          playable: true,
          quality: result.quality || 'unknown',
          mimeType: result.mimeType || '',
          container: result.container || '',
        });
      } catch (err) { console.error('[YouTubeSongUrl]', err); sendJSON(res, { provider: 'youtube', url: '', error: err.message }, 500); }
    },
  },
  {
    path: '/api/youtube/trending',
    handler: async (url, res) => {
      try {
        const region = url.searchParams.get('region') || 'US';
        // 用多个关键词混合获取热门音乐，避免单一结果
        const queries = [
          'trending music ' + new Date().toISOString().slice(0, 7),
          'popular songs 2026',
          'viral music',
          'new releases music',
        ];
        // 取当前日期决定 seed，保持一定稳定性但每天轮换
        const daySeed = new Date().toISOString().slice(0, 10);
        const primaryQuery = queries[Math.abs(hashCode(daySeed)) % queries.length];
        const raw = await YouTubeSearch.GetListByKeyword(primaryQuery, false, 20);
        const items = Array.isArray(raw.items) ? raw.items : [];
        const songs = items.filter(i => i.type === 'video').map(mapYouTubeVideo);
        const seen = new Set();
        const deduped = songs.filter(s => { const k = s.id; if (seen.has(k)) return false; seen.add(k); return true; });
        sendJSON(res, { provider: 'youtube', songs: deduped });
      } catch (err) { console.error('[YouTubeTrending]', err); sendJSON(res, { provider: 'youtube', songs: [], error: err.message }, 500); }
    },
  },
];

module.exports = routes;
