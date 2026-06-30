// ====================================================================
//  搜索路由
//  /api/search — 网易云音乐搜索 + 封面兜底
// ====================================================================
const { cloudsearch, song_detail } = require('NeteaseCloudMusicApi');
const { sendJSON } = require('../lib/send-json');
const { mapSongRecord } = require('../lib/song');

async function handleSearch(keywords, limit, userCookie) {
  console.log('[Search]', keywords, 'limit:', limit);
  const result = await cloudsearch({ keywords, limit, cookie: userCookie });
  const songs = result.body && result.body.result && result.body.result.songs ? result.body.result.songs : [];

  let mapped = songs.map(s => mapSongRecord(s));

  // 兜底: 补齐缺失的封面
  const missing = mapped.filter(s => !s.cover).map(s => s.id);
  if (missing.length) {
    try {
      console.log('[Search] backfilling covers for', missing.length, 'songs');
      const dd = await song_detail({ ids: missing.join(','), cookie: userCookie });
      const songsArr = (dd.body && dd.body.songs) || [];
      const idToPic = {};
      songsArr.forEach(s => {
        const pic = (s.al && s.al.picUrl) || (s.album && s.album.picUrl) || '';
        if (pic) idToPic[s.id] = pic;
      });
      mapped = mapped.map(s => s.cover ? s : { ...s, cover: idToPic[s.id] || '' });
    } catch (e) { console.warn('[Search] backfill failed:', e.message); }
  }

  return mapped;
}

const routes = [
  {
    path: '/api/search',
    handler: async (url, res, req, { userCookie }) => {
      try {
        const kw = url.searchParams.get('keywords') || '';
        const limit = parseInt(url.searchParams.get('limit') || '20');
        const songs = await handleSearch(kw, limit, userCookie);
        sendJSON(res, { songs });
      } catch (err) { console.error('[Search]', err); sendJSON(res, { error: err.message, songs: [] }, 500); }
    },
  },
];

module.exports = { routes, handleSearch };