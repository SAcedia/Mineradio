// ====================================================================
//  节拍缓存路由
//  BEATMAP_CACHE_DIR: D:\MineradioCache\beatmaps
// ====================================================================

const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { sendJSON } = require('../lib/send-json');
const { readRequestBody } = require('../lib/network');

const BEATMAP_CACHE_DIR = process.env.MINERADIO_BEAT_CACHE_DIR || 'D:\\MineradioCache\\beatmaps';

// ---------- 辅助 ----------

function beatCacheRootInfo() {
  const dir = path.resolve(BEATMAP_CACHE_DIR);
  const root = path.parse(dir).root;
  const drive = root ? root.replace(/[\\\/]+$/, '').toUpperCase() : '';
  const allowed = !!root && !/^C:$/i.test(drive);
  const available = allowed && fs.existsSync(root);
  return { dir, root, drive, allowed, available };
}

function ensureBeatMapCacheDir() {
  const info = beatCacheRootInfo();
  if (!info.allowed) {
    const err = new Error('BEAT_CACHE_ON_C_DRIVE_DISABLED');
    err.code = 'BEAT_CACHE_ON_C_DRIVE_DISABLED';
    err.info = info;
    throw err;
  }
  if (!info.available) {
    const err = new Error('BEAT_CACHE_DRIVE_UNAVAILABLE');
    err.code = 'BEAT_CACHE_DRIVE_UNAVAILABLE';
    err.info = info;
    throw err;
  }
  fs.mkdirSync(info.dir, { recursive: true });
  return info.dir;
}

function safeBeatMapCacheFile(key) {
  const raw = String(key || '').trim();
  if (!raw || raw.length > 240) return null;
  const hash = crypto.createHash('sha1').update(raw).digest('hex');
  const label = raw.replace(/[^a-z0-9_.-]+/gi, '_').replace(/^_+|_+$/g, '').slice(0, 48) || 'beatmap';
  return path.join(ensureBeatMapCacheDir(), `${label}-${hash}.json`);
}

function compactBeatMapCachePayload(body) {
  const key = String(body && body.key || '').trim();
  const map = body && body.map;
  const isFailed = !!(body && body.failed);
  if (!key) return null;
  if (!isFailed && (!map || typeof map !== 'object')) return null;
  return {
    v: 1,
    key,
    savedAt: Date.now(),
    failed: isFailed || undefined,
    meta: {
      provider: String(body.provider || '').slice(0, 32),
      title: String(body.title || '').slice(0, 160),
      artist: String(body.artist || '').slice(0, 160),
      mode: String(body.mode || 'mr').slice(0, 32),
    },
    map: isFailed ? null : map,
  };
}

function readBeatMapCache(key) {
  const file = safeBeatMapCacheFile(key);
  if (!file || !fs.existsSync(file)) return null;
  const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!raw) return null;
  if (raw.failed) return raw;
  return raw && raw.map ? raw : null;
}

function writeBeatMapCache(body) {
  const payload = compactBeatMapCachePayload(body);
  if (!payload) return { ok: false, error: 'INVALID_BEATMAP_CACHE_PAYLOAD' };
  const file = safeBeatMapCacheFile(payload.key);
  if (!file) return { ok: false, error: 'INVALID_BEATMAP_CACHE_KEY' };
  const tmp = file + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(payload));
  fs.renameSync(tmp, file);
  return { ok: true, key: payload.key, savedAt: payload.savedAt, dir: path.dirname(file) };
}

// ---------- 路由 ----------

const routes = [
  {
    path: '/api/beatmap/cache/status',
    handler: async (url, res) => {
      const info = beatCacheRootInfo();
      sendJSON(res, {
        enabled: info.allowed && info.available,
        dir: info.dir,
        drive: info.drive,
        reason: !info.allowed ? 'C_DRIVE_DISABLED' : (!info.available ? 'TARGET_DRIVE_UNAVAILABLE' : ''),
        mode: info.allowed && info.available ? 'disk' : 'memory-only',
      });
    },
  },
  {
    path: '/api/beatmap/cache',
    handler: async (url, res, req) => {
      if (req.method === 'GET') {
        const key = url.searchParams.get('key') || '';
        try {
          const entry = readBeatMapCache(key);
          sendJSON(res, entry
            ? { ok: true, hit: true, key: entry.key || key, map: entry.map, failed: !!entry.failed, meta: entry.meta || {}, savedAt: entry.savedAt || 0 }
            : { ok: true, hit: false, key });
        } catch (err) {
          const info = err.info || beatCacheRootInfo();
          sendJSON(res, {
            ok: false,
            hit: false,
            enabled: false,
            mode: 'memory-only',
            key,
            reason: err.code || err.message || 'BEAT_CACHE_READ_FAILED',
            dir: info.dir,
          });
        }
        return;
      }
      if (req.method === 'POST') {
        try {
          const body = await readRequestBody(req);
          sendJSON(res, writeBeatMapCache(body));
        } catch (err) {
          const info = err.info || beatCacheRootInfo();
          sendJSON(res, {
            ok: false,
            enabled: false,
            mode: 'memory-only',
            reason: err.code || err.message || 'BEAT_CACHE_WRITE_FAILED',
            dir: info.dir,
          });
        }
        return;
      }
      sendJSON(res, { ok: false, error: 'METHOD_NOT_ALLOWED' }, 405);
    },
  },
];

module.exports = routes;
