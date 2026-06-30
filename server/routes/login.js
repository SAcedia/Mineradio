// ====================================================================
//  登录路由
//  Cookie 登录 / QR 扫码登录 / 登出
// ====================================================================

const {
  login_qr_key,
  login_qr_create,
  login_qr_check,
} = require('NeteaseCloudMusicApi');
const { sendJSON } = require('../lib/send-json');
const { readRequestBody } = require('../lib/network');
const { normalizeCookieHeader, parseCookieString, readCookieFromResponse } = require('../lib/cookie');
const { normalizeLoginInfo } = require('../lib/auth');

// ---------- 路由 ----------

const routes = [
  {
    path: '/api/login/cookie',
    handler: async (url, res, req, { userCookie, saveCookie, getLoginInfo }) => {
      try {
        const body = await readRequestBody(req);
        const raw = body.cookie || body.data || body.text || '';
        const normalized = normalizeCookieHeader(raw);
        const obj = parseCookieString(normalized);
        if (!obj.MUSIC_U) {
          sendJSON(res, { loggedIn: false, error: 'INVALID_NETEASE_COOKIE', message: '网易云 cookie 缺少 MUSIC_U' }, 400);
          return;
        }
        saveCookie(normalized);
        let info = await getLoginInfo();
        if (!info.loggedIn && userCookie) {
          info = {
            loggedIn: true,
            pendingProfile: true,
            nickname: '网易云用户',
            avatar: '',
            vipType: 0,
            vipLevel: 'none',
            isVip: false,
            isSvip: false,
            vipLabel: '无VIP',
          };
        }
        sendJSON(res, { ...info, saved: true, hasCookie: !!userCookie });
      } catch (err) {
        console.error('[LoginCookie]', err);
        sendJSON(res, { loggedIn: false, error: err.message }, 500);
      }
    },
  },
  {
    path: '/api/login/qr/key',
    handler: async (url, res) => {
      try {
        const r = await login_qr_key({ timestamp: Date.now() });
        const key = r.body && r.body.data && r.body.data.unikey;
        sendJSON(res, { key });
      } catch (err) { sendJSON(res, { error: err.message }, 500); }
    },
  },
  {
    path: '/api/login/qr/create',
    handler: async (url, res) => {
      try {
        const key = url.searchParams.get('key');
        const r = await login_qr_create({ key, qrimg: true, timestamp: Date.now() });
        const d = r.body && r.body.data;
        sendJSON(res, { img: d && d.qrimg, url: d && d.qrurl });
      } catch (err) { sendJSON(res, { error: err.message }, 500); }
    },
  },
  {
    path: '/api/login/qr/check',
    handler: async (url, res, req, { userCookie, saveCookie, getLoginInfo }) => {
      try {
        const key = url.searchParams.get('key');
        let r = await login_qr_check({ key, noCookie: true, timestamp: Date.now() });
        let body = r.body || {};
        let code = Number(body.code || r.code);
        let msg = body.message || r.message || '';
        let cookie = readCookieFromResponse(r);
        if (code === 803 && !cookie) {
          try {
            const retry = await login_qr_check({ key, timestamp: Date.now() });
            const retryCookie = readCookieFromResponse(retry);
            if (retryCookie) {
              r = retry;
              body = retry.body || body;
              code = Number(body.code || retry.code || code);
              msg = body.message || retry.message || msg;
              cookie = retryCookie;
            }
          } catch (retryErr) {
            console.warn('[Login] qr cookie retry failed:', retryErr.message);
          }
        }
        // 803 = 授权成功, 802 = 已扫待确认, 801 = 等待扫码, 800 = 二维码过期
        if (code === 803) {
          if (cookie) saveCookie(cookie);
          let info = await getLoginInfo();
          if (!info.loggedIn) {
            const profile = body.profile || (body.data && body.data.profile) || {};
            info = normalizeLoginInfo(profile, body.account || (body.data && body.data.account), body.data || body);
          }
          if (!info.loggedIn && cookie) {
            info = {
              loggedIn: true,
              pendingProfile: true,
              nickname: (body.nickname || (body.profile && body.profile.nickname) || '网易云用户'),
              avatar: body.avatarUrl || (body.profile && body.profile.avatarUrl) || '',
              vipType: 0,
              vipLevel: 'none',
              isVip: false,
              isSvip: false,
              vipLabel: '无VIP',
            };
          }
          sendJSON(res, { code, message: msg, ...info, hasCookie: !!cookie });
          return;
        }
        sendJSON(res, { code, message: msg, nickname: body.nickname, avatar: body.avatarUrl });
      } catch (err) { sendJSON(res, { error: err.message }, 500); }
    },
  },
  {
    path: '/api/login/status',
    handler: async (url, res, req, { getLoginInfo }) => {
      const info = await getLoginInfo();
      sendJSON(res, info);
    },
  },
];

module.exports = routes;
