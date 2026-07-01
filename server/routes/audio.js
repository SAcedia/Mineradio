// ====================================================================
//  代理路由
//  封面代理 / 音频代理
// ====================================================================
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

// ---------- 辅助 ----------

function audioProxyHeadersFor(audioUrl, range) {
  const headers = { 'User-Agent': UA };
  try {
    const host = new URL(audioUrl).hostname.toLowerCase();
    if (host.includes('qq.com') || host.includes('qpic.cn')) headers.Referer = 'https://y.qq.com/';
    else if (host.includes('googlevideo.com') || host.includes('youtube.com') || host.includes('ytimg.com')) {
      headers.Referer = 'https://www.youtube.com/';
      headers.Origin = 'https://www.youtube.com';
    } else headers.Referer = 'https://music.163.com/';
  } catch (e) { headers.Referer = 'https://music.163.com/'; }
  if (range) headers.Range = range;
  return headers;
}

function audioContentTypeForUrl(audioUrl, upstreamType) {
  let pathname = '';
  try { pathname = new URL(audioUrl).pathname.toLowerCase(); } catch (e) { }
  if (/\.flac$/.test(pathname)) return 'audio/flac';
  if (/\.mp3$/.test(pathname)) return 'audio/mpeg';
  if (/\.(m4a|mp4)$/.test(pathname)) return 'audio/mp4';
  if (/\.ogg$/.test(pathname)) return 'audio/ogg';
  if (/\.wav$/.test(pathname)) return 'audio/wav';
  if (/\.webm$/.test(pathname)) return 'audio/webm';
  return upstreamType || 'audio/mpeg';
}

// ---------- 路由 ----------

const routes = [
  {
    path: '/api/cover',
    handler: async (url, res, req) => {
      try {
        const coverUrl = url.searchParams.get('url');
        if (!coverUrl || !/^https?:\/\//i.test(coverUrl)) {
          res.writeHead(400, { 'Access-Control-Allow-Origin': '*' });
          res.end('Invalid cover url');
          return;
        }
        const resp = await fetch(coverUrl, { headers: { 'User-Agent': UA, 'Referer': 'https://music.163.com/' } });
        const ct = resp.headers.get('content-type') || 'image/jpeg';
        const cl = resp.headers.get('content-length');
        const hdr = {
          'Content-Type': ct,
          'Access-Control-Allow-Origin': '*',
          'Cross-Origin-Resource-Policy': 'cross-origin',
          'Cache-Control': 'public, max-age=86400',
        };
        if (cl) hdr['Content-Length'] = cl;
        res.writeHead(resp.status, hdr);
        const reader = resp.body.getReader();
        while (true) { const c = await reader.read(); if (c.done) break; res.write(c.value); }
        res.end();
      } catch (err) { console.error('[Cover]', err); res.writeHead(500); res.end(); }
    },
  },
  {
    path: '/api/audio',
    handler: async (url, res, req, { UA }) => {
      try {
        const audioUrl = url.searchParams.get('url');
        if (!audioUrl) { res.writeHead(400); res.end('Missing url'); return; }
        const range = req.headers.range || '';
        const hdr = audioProxyHeadersFor(audioUrl, range);
        const up = await fetch(audioUrl, { headers: hdr });
        const out = {
          'Content-Type': audioContentTypeForUrl(audioUrl, up.headers.get('content-type')),
          'Access-Control-Allow-Origin': '*',
          'Accept-Ranges': 'bytes',
        };
        // 不转发 Content-Length：YouTube 等上游返回的长度与实际流可能不一致导致 ERR_CONTENT_LENGTH_MISMATCH
        const cr = up.headers.get('content-range'); if (cr) out['Content-Range'] = cr;
        res.writeHead(up.status, out);
        const reader = up.body.getReader();
        while (true) { const c = await reader.read(); if (c.done) break; if (!res.destroyed) res.write(c.value); }
        if (!res.destroyed) res.end();
      } catch (err) {
        const msg = String((err && err.message) || err || '');
        if (!/ECONNRESET|terminated|aborted/i.test(msg)) console.error('[Audio]', err);
        try { if (!res.headersSent) res.writeHead(500); res.end(); } catch (e) { }
      }
    },
  },
];

module.exports = routes;
