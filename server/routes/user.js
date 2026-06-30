// ====================================================================
//  用户路由
//  登出 / 我的歌单 / 歌手详情
// ====================================================================
const { logout, user_playlist, artist_detail, artist_songs, artist_top_song } = require('NeteaseCloudMusicApi');
const { sendJSON } = require('../lib/send-json');
const { mapSongRecord } = require('../lib/song');

const routes = [
  {
    path: '/api/logout',
    handler: async (url, res, req, { saveCookie, userCookie }) => {
      try { await logout({ cookie: userCookie }); } catch (e) { }
      saveCookie('');
      sendJSON(res, { ok: true });
    },
  },
  {
    path: '/api/user/playlists',
    handler: async (url, res, req, { getLoginInfo, userCookie }) => {
      try {
        const info = await getLoginInfo();
        if (!info.loggedIn || !info.userId) { sendJSON(res, { loggedIn: false, playlists: [] }); return; }
        const limit = Math.max(12, Math.min(100, parseInt(url.searchParams.get('limit') || '60', 10) || 60));
        const r = await user_playlist({ uid: info.userId, limit, cookie: userCookie, timestamp: Date.now() });
        const list = ((r.body && r.body.playlist) || []).map(pl => ({
          id: pl.id,
          name: pl.name,
          cover: pl.coverImgUrl || '',
          trackCount: pl.trackCount || 0,
          playCount: pl.playCount || 0,
          creator: (pl.creator && pl.creator.nickname) || '',
          subscribed: !!pl.subscribed,
          specialType: pl.specialType || 0,
        }));
        sendJSON(res, { loggedIn: true, userId: info.userId, playlists: list });
      } catch (err) {
        console.error('[UserPlaylists]', err);
        sendJSON(res, { error: err.message, loggedIn: false, playlists: [] }, 500);
      }
    },
  },
  {
    path: '/api/artist/detail',
    handler: async (url, res, req, { userCookie }) => {
      try {
        const id = url.searchParams.get('id');
        const limit = Math.max(10, Math.min(80, parseInt(url.searchParams.get('limit') || '30', 10) || 30));
        if (!id) { sendJSON(res, { error: 'Missing artist id', songs: [] }, 400); return; }
        let detailBody = {};
        try {
          const detail = await artist_detail({ id, cookie: userCookie, timestamp: Date.now() });
          detailBody = detail.body || detail || {};
        } catch (e) {
          console.warn('[ArtistDetail] detail failed:', e.message);
        }
        let rawSongs = [];
        try {
          const list = await artist_songs({ id, order: 'hot', limit, offset: 0, cookie: userCookie, timestamp: Date.now() });
          const b = list.body || list || {};
          rawSongs = (b.songs || (b.data && b.data.songs) || []);
        } catch (e) {
          console.warn('[ArtistSongs] hot failed:', e.message);
        }
        if (!rawSongs.length) {
          const top = await artist_top_song({ id, cookie: userCookie, timestamp: Date.now() });
          const b = top.body || top || {};
          rawSongs = b.songs || [];
        }
        const artist = detailBody.artist || (detailBody.data && (detailBody.data.artist || detailBody.data)) || {};
        const songs = rawSongs.map(mapSongRecord).filter(s => s.id).slice(0, limit);
        sendJSON(res, {
          id,
          artist: {
            id: artist.id || id,
            name: artist.name || artist.artistName || '',
            avatar: artist.avatar || artist.cover || artist.picUrl || artist.img1v1Url || '',
            brief: artist.briefDesc || artist.description || artist.desc || '',
            musicSize: artist.musicSize || artist.songSize || 0,
            albumSize: artist.albumSize || 0,
          },
          songs,
          body: detailBody,
        });
      } catch (err) {
        console.error('[ArtistDetail]', err);
        sendJSON(res, { error: err.message, songs: [] }, 500);
      }
    },
  },
];

module.exports = { routes };
