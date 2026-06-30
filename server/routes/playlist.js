// ====================================================================
//  歌单路由
//  创建歌单 / 收藏歌曲 / 歌单曲目
// ====================================================================
const { sendJSON, normalizeApiCode, normalizeApiMessage } = require('../lib/send-json');
const { readRequestBody } = require('../lib/network');
const { mapSongRecord } = require('../lib/song');

const {
  playlist_create,
  playlist_tracks,
  playlist_track_add,
  playlist_track_all,
  playlist_detail,
} = require('NeteaseCloudMusicApi');

// ---------- 路由 ----------

const routes = [
  {
    path: '/api/playlist/create',
    handler: async (url, res, req, { userCookie, requireLogin }) => {
      try {
        const info = await requireLogin(res);
        if (!info) return;
        const body = req.method === 'POST' ? await readRequestBody(req) : {};
        const name = String(body.name || url.searchParams.get('name') || '').trim();
        const privacy = String(body.privacy || url.searchParams.get('privacy') || '0');
        if (!name) { sendJSON(res, { error: 'Missing playlist name' }, 400); return; }
        const r = await playlist_create({ name, privacy, cookie: userCookie, timestamp: Date.now() });
        const created = (r.body && (r.body.playlist || r.body.data)) || {};
        sendJSON(res, { loggedIn: true, playlist: created, body: r.body || r });
      } catch (err) {
        console.error('[PlaylistCreate]', err);
        sendJSON(res, { error: err.message }, 500);
      }
    },
  },
  {
    path: '/api/playlist/add-song',
    handler: async (url, res, req, { userCookie, requireLogin }) => {
      try {
        const info = await requireLogin(res);
        if (!info) return;
        const body = req.method === 'POST' ? await readRequestBody(req) : {};
        const pid = body.pid || url.searchParams.get('pid');
        const id = body.id || body.ids || url.searchParams.get('id') || url.searchParams.get('ids');
        if (!pid || !id) { sendJSON(res, { error: 'Missing playlist id or song id' }, 400); return; }
        const attempts = [];
        let finalBody = null;
        let finalCode = 0;
        let finalMessage = '';
        let success = false;

        const primary = await playlist_tracks({ op: 'add', pid, tracks: String(id), cookie: userCookie, timestamp: Date.now() });
        finalBody = primary.body || primary;
        finalCode = normalizeApiCode(primary);
        finalMessage = normalizeApiMessage(primary);
        success = finalCode === 200 && !(finalBody && finalBody.error);
        attempts.push({ api: 'playlist_tracks', code: finalCode, message: finalMessage, body: finalBody });

        if (!success && typeof playlist_track_add === 'function') {
          try {
            const fallback = await playlist_track_add({ pid, ids: String(id), cookie: userCookie, timestamp: Date.now() });
            finalBody = fallback.body || fallback;
            finalCode = normalizeApiCode(fallback);
            finalMessage = normalizeApiMessage(fallback);
            success = finalCode === 200 && !(finalBody && finalBody.error);
            attempts.push({ api: 'playlist_track_add', code: finalCode, message: finalMessage, body: finalBody });
          } catch (fallbackErr) {
            const errBody = fallbackErr.body || fallbackErr.response || {};
            finalBody = errBody;
            finalCode = normalizeApiCode(errBody);
            finalMessage = normalizeApiMessage(errBody) || fallbackErr.message || '';
            attempts.push({ api: 'playlist_track_add', code: finalCode, message: finalMessage, body: errBody });
          }
        }

        if (!success) {
          sendJSON(res, { loggedIn: true, pid, id, success: false, code: finalCode, error: finalMessage || 'PLAYLIST_ADD_FAILED', attempts }, finalCode === 401 ? 401 : 409);
          return;
        }
        sendJSON(res, { loggedIn: true, pid, id, success: true, code: finalCode, body: finalBody, attempts });
      } catch (err) {
        console.error('[PlaylistAddSong]', err);
        sendJSON(res, { error: err.message }, 500);
      }
    },
  },
  {
    path: '/api/playlist/tracks',
    handler: async (url, res, req, { userCookie }) => {
      try {
        const id = url.searchParams.get('id');
        if (!id) { sendJSON(res, { error: 'Missing playlist id', tracks: [] }, 400); return; }

        let playlistMeta = { id, name: '', cover: '', trackCount: 0 };
        let rawTracks = [];

        if (typeof playlist_track_all === 'function') {
          try {
            const all = await playlist_track_all({ id, limit: 500, offset: 0, cookie: userCookie, timestamp: Date.now() });
            rawTracks = (all.body && (all.body.songs || all.body.tracks)) || [];
          } catch (err) {
            console.warn('[PlaylistTracks] playlist_track_all failed, fallback to detail:', err.message);
          }
        }

        if (!rawTracks.length && typeof playlist_detail === 'function') {
          const detail = await playlist_detail({ id, s: 0, cookie: userCookie, timestamp: Date.now() });
          const pl = (detail.body && detail.body.playlist) || {};
          playlistMeta = { id: pl.id || id, name: pl.name || '', cover: pl.coverImgUrl || '', trackCount: pl.trackCount || 0 };
          rawTracks = pl.tracks || [];
        }

        const tracks = rawTracks.map(mapSongRecord).filter(t => t.id);

        if (!playlistMeta.trackCount) playlistMeta.trackCount = tracks.length;
        sendJSON(res, { playlist: playlistMeta, tracks });
      } catch (err) {
        console.error('[PlaylistTracks]', err);
        sendJSON(res, { error: err.message, tracks: [] }, 500);
      }
    },
  },
];

module.exports = routes;
