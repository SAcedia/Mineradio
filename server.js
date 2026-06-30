// ====================================================================
//  粒子音乐可视化播放器 — Server v2
//  - 网易云搜索 / 歌曲URL / 封面/音频代理
//  - 扫码登录 (login_qr_*) + cookie 持久化 (./.cookie)
//  - 试听检测 (freeTrialInfo) + 全 quality 探测
//  - 所有受保护 API 都会带上已登录用户的 cookie
// ====================================================================
const {
  login_status,
  user_account,
} = require('NeteaseCloudMusicApi');
const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const tls = require('tls');
const { once } = require('events');
const { fileURLToPath } = require('url');
const qqRoutes = require('./server/routes/qq');
const podcastRoutes = require('./server/routes/podcast');
const youtubeRoutes = require('./server/routes/youtube');
const loginRoutes = require('./server/routes/login');
const beatmapRoutes = require('./server/routes/beatmap');
const playlistRoutes = require('./server/routes/playlist');
const searchRoutes = require('./server/routes/search');
const weatherRoutes = require('./server/routes/weather');
const songRoutes = require('./server/routes/song');
const userRoutes = require('./server/routes/user');
const appRoutes = require('./server/routes/app');
const lyricRoutes = require('./server/routes/lyric');
const audioRoutes = require('./server/routes/audio');
const { sendJSON, serveStatic, MIME } = require('./server/lib/send-json');
const { normalizeCookieHeader, rawCookieFallback, collectCookieInput } = require('./server/lib/cookie');
const { fetchWithTimeout, requestJson, readRequestBody } = require('./server/lib/network');
const { clampNumber, similarity, editDistance } = require('./server/lib/string');
const { normalizeLoginInfo, isNeteaseAuthInvalidPayload } = require('./server/lib/auth');

// 把 yt-dlp 加到 PATH 上，让 musicstream-sdk 的 yt-dlp fallback 能找到它
const ytDlpBinDir = path.join(__dirname, 'node_modules', 'yt-dlp-exec', 'bin');
if (fs.existsSync(ytDlpBinDir)) {
  process.env.PATH = ytDlpBinDir + path.delimiter + (process.env.PATH || '');
}


const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const COOKIE_FILE = process.env.COOKIE_FILE || path.join(__dirname, '.cookie');
const UPDATE_WORK_DIR = process.env.MINERADIO_UPDATE_DIR || path.join(__dirname, 'updates');
const UPDATE_DOWNLOAD_DIR = process.env.MINERADIO_UPDATE_DOWNLOAD_DIR || path.join(UPDATE_WORK_DIR, 'downloads');
const UPDATE_PATCH_BACKUP_DIR = process.env.MINERADIO_PATCH_BACKUP_DIR || path.join(UPDATE_WORK_DIR, 'backups', 'patches');
const APP_PACKAGE = readPackageInfo();
const APP_VERSION = process.env.MINERADIO_VERSION || APP_PACKAGE.version || '0.9.11';
const UPDATE_CONFIG = readUpdateConfig(APP_PACKAGE);
const PATCH_MAX_BYTES = 12 * 1024 * 1024;
const PATCH_ALLOWED_ROOTS = new Set(['public', 'desktop', 'build']);
const PATCH_ALLOWED_FILES = new Set(['server.js', 'dj-analyzer.js', 'package.json', 'package-lock.json']);
const UPDATE_FALLBACK_NOTES = [
  '电影镜头节奏更松',
  '音源失败自动换源',
  '右上角更新提示',
];

const updateDownloadJobs = new Map();
function applySystemCertificateAuthorities() {
  try {
    if (typeof tls.getCACertificates !== 'function' || typeof tls.setDefaultCACertificates !== 'function') return;
    const bundled = tls.getCACertificates('default') || [];
    const system = tls.getCACertificates('system') || [];
    if (!system.length) return;
    const seen = new Set();
    const merged = [];
    bundled.concat(system).forEach(cert => {
      if (!cert || seen.has(cert)) return;
      seen.add(cert);
      merged.push(cert);
    });
    if (merged.length > bundled.length) tls.setDefaultCACertificates(merged);
  } catch (e) {
    console.warn('[TLS] system CA merge skipped:', e.message);
  }
}

applySystemCertificateAuthorities();

let userCookie = '';
try { if (fs.existsSync(COOKIE_FILE)) userCookie = fs.readFileSync(COOKIE_FILE, 'utf8').trim(); }
catch (e) { userCookie = ''; }
function saveCookie(c) {
  userCookie = normalizeCookieHeader(c) || rawCookieFallback(c);
  try { fs.writeFileSync(COOKIE_FILE, userCookie); } catch (e) { }
}

// ---------- 工具 ----------
function readPackageInfo() {
  try {
    const raw = fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8');
    return JSON.parse(raw);
  } catch (e) {
    return {};
  }
}
function parseGitHubRepository(input) {
  const raw = String(input || '').trim();
  if (!raw) return null;
  const direct = raw.match(/^([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)$/);
  if (direct) return { owner: direct[1], repo: direct[2].replace(/\.git$/i, '') };
  const github = raw.match(/github\.com[:/]([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+?)(?:\.git)?(?:[#/?].*)?$/i);
  if (github) return { owner: github[1], repo: github[2].replace(/\.git$/i, '') };
  return null;
}
function readUpdateConfig(pkg) {
  const local = (pkg && pkg.mineradio && pkg.mineradio.update) || {};
  const repoHint = process.env.MINERADIO_UPDATE_REPOSITORY
    || process.env.GITHUB_REPOSITORY
    || local.repository
    || local.github
    || (pkg && pkg.repository && (pkg.repository.url || pkg.repository))
    || '';
  const parsed = parseGitHubRepository(repoHint) || {};
  const owner = process.env.MINERADIO_UPDATE_OWNER || local.owner || parsed.owner || '';
  const repo = process.env.MINERADIO_UPDATE_REPO || local.repo || parsed.repo || '';
  return {
    provider: local.provider || 'github',
    owner,
    repo,
    configured: !!(owner && repo),
    preview: local.preview !== false,
    preferMirrors: local.preferMirrors !== false,
    mirrors: readUpdateMirrors(local),
    manifest: process.env.MINERADIO_UPDATE_MANIFEST
      || process.env.MINERADIO_UPDATE_MANIFEST_URL
      || process.env.MINERADIO_UPDATE_MANIFEST_FILE
      || '',
  };
}
function parseUpdateMirrorList(value) {
  if (Array.isArray(value)) return value;
  return String(value || '').split(/[\n,;]/);
}
function readUpdateMirrors(local) {
  const envMirrors = process.env.MINERADIO_UPDATE_MIRRORS || process.env.MINERADIO_UPDATE_MIRROR || '';
  const raw = envMirrors
    ? parseUpdateMirrorList(envMirrors)
    : parseUpdateMirrorList(local.mirrors || local.downloadMirrors || []);
  const seen = new Set();
  const mirrors = [];
  raw.forEach(item => {
    const url = String(item || '').trim();
    if (!/^https?:\/\//i.test(url)) return;
    const key = url.replace(/\/+$/, '').toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    mirrors.push(url);
  });
  return mirrors.slice(0, 6);
}
async function requireLogin(res) {
  const info = await getLoginInfo();
  if (!info.loggedIn || !info.userId) {
    sendJSON(res, { error: 'LOGIN_REQUIRED', loggedIn: false }, 401);
    return null;
  }
  return info;
}

async function getLoginInfo() {
  if (!userCookie) return { loggedIn: false, vipType: 0, vipLevel: 'none', isVip: false, isSvip: false, vipLabel: '无VIP' };

  // login_status 对二维码 cookie 的资料刷新通常更及时；失败时再降级到 user_account。
  try {
    const st = await login_status({ cookie: userCookie, timestamp: Date.now() });
    const body = st.body || {};
    const data = body.data || body;
    const info = normalizeLoginInfo(data.profile || body.profile, data.account || body.account, data);
    if (info.loggedIn) return info;
  } catch (e) {
    console.warn('[Login] login_status failed:', e.message);
  }

  try {
    const acc = await user_account({ cookie: userCookie, timestamp: Date.now() });
    const body = acc.body || {};
    const info = normalizeLoginInfo(body.profile, body.account, body);
    if (info.loggedIn) return info;
    if (isNeteaseAuthInvalidPayload(acc)) saveCookie('');
    return { loggedIn: false, hasCookie: !!userCookie, vipType: 0, vipLevel: 'none', isVip: false, isSvip: false, vipLabel: '无VIP' };
  } catch (e) {
    console.warn('[Login] account check failed:', e.message);
    return { loggedIn: false, hasCookie: !!userCookie, vipType: 0, vipLevel: 'none', isVip: false, isSvip: false, vipLabel: '无VIP' };
  }
}
const updateRoutes = require('./server/routes/update')({
  APP_VERSION, UPDATE_CONFIG, UPDATE_DOWNLOAD_DIR, UPDATE_PATCH_BACKUP_DIR,
  UPDATE_FALLBACK_NOTES, PATCH_ALLOWED_FILES, PATCH_ALLOWED_ROOTS, PATCH_MAX_BYTES,
  updateDownloadJobs, fetchWithTimeout, sendJSON, APP_DIR: __dirname,
});
//  HTTP Server
// ====================================================================
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost:' + PORT);
  const pn = url.pathname;

  // ---------- 统一路由分发 ----------
  var routeTable = [
    { list: appRoutes.routes, idx: 0, path: '/api/app/version', ctx: { APP_PACKAGE, APP_VERSION, UPDATE_CONFIG } },
    { list: appRoutes.routes, idx: 1, path: '/api/discover/home', ctx: { getLoginInfo, userCookie } },
    { list: updateRoutes.routes,              ctx: { sendJSON } },
    { list: beatmapRoutes,                    ctx: {} },
    { list: weatherRoutes.routes,             ctx: { userCookie } },
    { list: searchRoutes.routes,              ctx: { userCookie } },
    { list: qqRoutes,                         ctx: {} },
    { list: podcastRoutes,                    ctx: { userCookie, getLoginInfo } },
    { list: youtubeRoutes,                    ctx: {} },
    { list: loginRoutes,                      ctx: { req, userCookie, saveCookie, getLoginInfo } },
    { list: songRoutes.routes,                ctx: { getLoginInfo, userCookie, requireLogin } },
    { list: userRoutes.routes,                ctx: { saveCookie, userCookie, getLoginInfo } },
    { list: playlistRoutes,                   ctx: { userCookie, requireLogin } },
    { list: lyricRoutes.routes,               ctx: { userCookie } },
    { list: audioRoutes,                      ctx: { UA } },
  ];
  for (var ri = 0; ri < routeTable.length; ri++) {
    var entry = routeTable[ri];
    if (entry.path && pn !== entry.path) continue;
    var route = entry.idx != null ? entry.list[entry.idx] : entry.list.find(function(r){ return pn === r.path; });
    if (route) {
      await route.handler(url, res, req, entry.ctx);
      return;
    }
  }

  // ---------- 静态资源 ----------
  if (pn === '/favicon.ico') {
    serveStatic(res, path.join(__dirname, 'build', 'icon.ico'));
    return;
  }

  let filePath = pn === '/' ? '/index.html' : pn;
  filePath = path.join(__dirname, 'public', filePath);
  serveStatic(res, filePath);
});

server.listen(PORT, HOST, () => {
  console.log('======================================================');
  console.log(' 粒子音乐可视化 v2  →  http://localhost:' + PORT);
  console.log(' 登录态: ' + (userCookie ? '已登录(cookie已加载)' : '未登录'));
  console.log('======================================================');
});

module.exports = server;
