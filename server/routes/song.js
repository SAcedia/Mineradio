// ====================================================================
//  歌曲路由
//  歌曲 URL / 红心状态 / 红心操作 / 评论
// ====================================================================
const { like: like_song, likelist, song_like_check, comment_music, song_url, song_url_v1 } = require('NeteaseCloudMusicApi');
const { sendJSON } = require('../lib/send-json');
const { readRequestBody } = require('../lib/network');
const {
  normalizeQualityPreference, qualityCandidatesFrom, hasNeteaseSvip,
  NETEASE_QUALITY_CANDIDATES, classifyNeteasePlaybackRestriction,
} = require('../lib/song');

// ---------- 业务: 取歌曲URL (探测试听) ----------
//   返回 { url, trial, level, br }
//   trial=true 表示这是试听片段 (freeTrialInfo 非空)
async function handleSongUrl(id, userCookie, loginInfo, qualityPreference) {
  console.log('[SongUrl] id:', id, 'logged-in:', !!userCookie);
  const requestedQuality = normalizeQualityPreference(qualityPreference);
  const svipReady = hasNeteaseSvip(loginInfo);
  const qualities = qualityCandidatesFrom(requestedQuality, NETEASE_QUALITY_CANDIDATES)
    .filter(q => !q.svip || svipReady);

  let trialFallback = null;
  let lastData = null;
  let lastError = null;

  for (const q of qualities) {
    try {
      let result;
      try {
        result = await song_url_v1({ id, level: q.level, cookie: userCookie });
      } catch (e) {
        result = await song_url({ id, br: q.br, cookie: userCookie });
      }
      const d = result.body && result.body.data && result.body.data[0];
      if (d) lastData = d;
      const url = d && d.url;
      const freeTrial = d && d.freeTrialInfo;
      console.log('[SongUrl]', q.level, '->', url ? 'OK' : 'no url', freeTrial ? '(TRIAL)' : '');
      if (url && !freeTrial) {
        return { url, trial: false, playable: true, level: q.level, quality: q.label, br: d.br, requestedQuality };
      }
      if (url && freeTrial && !trialFallback) {
        trialFallback = {
          url,
          trial: true,
          playable: true,
          level: q.level,
          quality: q.label,
          br: d.br,
          requestedQuality,
          trialInfo: freeTrial,
          restriction: classifyNeteasePlaybackRestriction(d, loginInfo),
        };
      }
    } catch (err) {
      lastError = err;
      console.log('[SongUrl]', q.level, 'failed:', err.message);
    }
  }
  if (trialFallback) return trialFallback;
  const restriction = classifyNeteasePlaybackRestriction(lastData, loginInfo);
  return {
    url: null,
    trial: false,
    playable: false,
    reason: restriction.category,
    message: restriction.message,
    restriction,
    lastCode: lastData && lastData.code,
    fee: lastData && lastData.fee,
    error: lastError && lastError.message,
    requestedQuality,
  };
}

const routes = [
  {
    path: '/api/song/url',
    handler: async (url, res, req, { userCookie, getLoginInfo }) => {
      try {
        const sid = url.searchParams.get('id');
        const quality = url.searchParams.get('quality') || '';
        const loginInfo = await getLoginInfo();
        const info = await handleSongUrl(sid, userCookie, loginInfo, quality);
        sendJSON(res, {
          ...info,
          loggedIn: loginInfo.loggedIn,
          vipType: loginInfo.vipType || 0,
          vipLevel: loginInfo.vipLevel || 'none',
          isVip: !!loginInfo.isVip,
          isSvip: !!loginInfo.isSvip,
          vipLabel: loginInfo.vipLabel || '无VIP',
        });
      } catch (err) { console.error('[SongUrl]', err); sendJSON(res, { error: err.message }, 500); }
    },
  },
  {
    path: '/api/song/like/check',
    handler: async (url, res, req, { requireLogin, userCookie }) => {
      try {
        const info = await requireLogin(res);
        if (!info) return;
        const ids = String(url.searchParams.get('ids') || url.searchParams.get('id') || '')
          .split(',')
          .map(s => s.trim())
          .filter(Boolean);
        if (!ids.length) { sendJSON(res, { error: 'Missing song id', liked: {}, ids: [] }, 400); return; }
        let likedIds = [];
        try {
          if (typeof song_like_check === 'function') {
            const checked = await song_like_check({ ids: JSON.stringify(ids.map(Number).filter(Boolean)), cookie: userCookie, timestamp: Date.now() });
            const data = (checked.body && (checked.body.data || checked.body.ids)) || checked.body || {};
            if (Array.isArray(data)) likedIds = data.map(String);
            else if (data && typeof data === 'object') {
              ids.forEach(id => {
                if (data[id] || data[String(id)] || data[Number(id)]) likedIds.push(String(id));
              });
            }
          }
        } catch (e) {
          console.warn('[LikeCheck] direct check failed:', e.message);
        }
        if (!likedIds.length) {
          const r = await likelist({ uid: info.userId, cookie: userCookie, timestamp: Date.now() });
          likedIds = ((r.body && r.body.ids) || []).map(String);
        }
        const set = new Set(likedIds);
        const liked = {};
        ids.forEach(id => { liked[id] = set.has(String(id)); });
        sendJSON(res, { loggedIn: true, ids, liked });
      } catch (err) {
        console.error('[LikeCheck]', err);
        sendJSON(res, { error: err.message }, 500);
      }
    },
  },
  {
    path: '/api/song/like',
    handler: async (url, res, req, { requireLogin, userCookie }) => {
      try {
        const info = await requireLogin(res);
        if (!info) return;
        const body = req.method === 'POST' ? await readRequestBody(req) : {};
        const id = body.id || url.searchParams.get('id');
        const nextLike = String(body.like != null ? body.like : (url.searchParams.get('like') || 'true')) !== 'false';
        if (!id) { sendJSON(res, { error: 'Missing song id' }, 400); return; }
        const r = await like_song({ id, like: String(nextLike), cookie: userCookie, timestamp: Date.now() });
        const code = (r.body && r.body.code) || r.code || 200;
        sendJSON(res, { loggedIn: true, id, liked: nextLike, code, body: r.body || r });
      } catch (err) {
        console.error('[Like]', err);
        sendJSON(res, { error: err.message }, 500);
      }
    },
  },
  {
    path: '/api/song/comments',
    handler: async (url, res, req, { userCookie }) => {
      try {
        const id = url.searchParams.get('id');
        const limit = Math.max(6, Math.min(50, parseInt(url.searchParams.get('limit') || '20', 10) || 20));
        const offset = Math.max(0, parseInt(url.searchParams.get('offset') || '0', 10) || 0);
        if (!id) { sendJSON(res, { error: 'Missing song id', comments: [] }, 400); return; }
        const r = await comment_music({ id, limit, offset, cookie: userCookie, timestamp: Date.now() });
        const body = r.body || r || {};
        const raw = body.hotComments && offset === 0 ? body.hotComments : (body.comments || []);
        const comments = (raw || []).map(c => ({
          id: c.commentId,
          content: c.content || '',
          likedCount: c.likedCount || 0,
          time: c.time || 0,
          user: c.user ? { id: c.user.userId, nickname: c.user.nickname || '', avatar: c.user.avatarUrl || '' } : null,
        })).filter(c => c.content);
        sendJSON(res, { id, total: body.total || 0, comments, hot: !!(body.hotComments && offset === 0), body });
      } catch (err) {
        console.error('[SongComments]', err);
        sendJSON(res, { error: err.message, comments: [] }, 500);
      }
    },
  },
];

module.exports = { routes };