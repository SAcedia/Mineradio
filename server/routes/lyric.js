// ====================================================================
//  歌词路由
//  歌词获取 / 按名称搜索 / 通用获取 / YouTube 字幕 / LRCLIB
// ====================================================================
const { cloudsearch, lyric, lyric_new } = require('NeteaseCloudMusicApi');
const ytDlp = require('yt-dlp-exec');
const { sendJSON } = require('../lib/send-json');

const routes = [
  {
    path: '/api/lyric',
    handler: async (url, res, req, { userCookie }) => {
      try {
        const id = url.searchParams.get('id');
        if (!id) { sendJSON(res, { error: 'Missing song id', lyric: '' }, 400); return; }
        let body = {};
        let source = 'lyric';
        try {
          if (typeof lyric_new === 'function') {
            const nr = await lyric_new({ id, cookie: userCookie, timestamp: Date.now() });
            body = nr.body || {};
            source = 'lyric_new';
          }
        } catch (errNew) {
          console.warn('[LyricNew]', errNew.message);
        }
        if (!((body.lrc && body.lrc.lyric) || (body.yrc && body.yrc.lyric))) {
          const r = await lyric({ id, cookie: userCookie, timestamp: Date.now() });
          body = r.body || body || {};
          source = 'lyric';
        }
        sendJSON(res, {
          lyric: (body.lrc && body.lrc.lyric) || '',
          tlyric: (body.tlyric && body.tlyric.lyric) || '',
          yrc: (body.yrc && body.yrc.lyric) || '',
          source,
        });
      } catch (err) {
        console.error('[Lyric]', err);
        sendJSON(res, { error: err.message, lyric: '' }, 500);
      }
    },
  },
  {
    path: '/api/lyric/by-name',
    handler: async (url, res, req, { userCookie }) => {
      try {
        const name = url.searchParams.get('name') || '';
        const artist = url.searchParams.get('artist') || '';
        const query = artist ? (name + ' ' + artist) : name;
        if (!query) { sendJSON(res, { error: 'Missing name', lyric: '' }, 400); return; }
        const searchResult = await cloudsearch({ keywords: query, limit: 5, cookie: userCookie });
        const songs = searchResult.body && searchResult.body.result && searchResult.body.result.songs;
        if (!songs || !songs.length) { sendJSON(res, { lyric: '', source: 'by-name-no-match' }); return; }
        let best = songs[0];
        if (artist) {
          for (const s of songs) {
            const sArtists = (s.artists || s.ar || []).map(a => (a.name || a.nickname || ''));
            if (sArtists.some(a => a.toLowerCase().includes(artist.toLowerCase()))) { best = s; break; }
          }
        }
        const id = String(best.id);
        let body = {};
        try {
          if (typeof lyric_new === 'function') {
            const nr = await lyric_new({ id, cookie: userCookie, timestamp: Date.now() });
            body = nr.body || {};
          }
        } catch (e) { }
        if (!((body.lrc && body.lrc.lyric) || (body.yrc && body.yrc.lyric))) {
          const r = await lyric({ id, cookie: userCookie, timestamp: Date.now() });
          body = r.body || body || {};
        }
        sendJSON(res, {
          songId: id,
          songName: (best.name || ''),
          songArtist: (best.artists || best.ar || []).map(a => a.name || '').join(' / '),
          lyric: (body.lrc && body.lrc.lyric) || '',
          tlyric: (body.tlyric && body.tlyric.lyric) || '',
          yrc: (body.yrc && body.yrc.lyric) || '',
          source: 'by-name',
        });
      } catch (err) {
        console.error('[LyricByName]', err);
        sendJSON(res, { error: err.message, lyric: '' }, 500);
      }
    },
  },
  {
    path: '/api/lyric/universal',
    handler: async (url, res, req, { userCookie }) => {
      try {
        const name = url.searchParams.get('name') || '';
        const artist = url.searchParams.get('artist') || '';
        const videoId = url.searchParams.get('v') || '';
        const preferSource = url.searchParams.get('source') || '';
        const query = artist ? (name + ' ' + artist) : name;
        let result = { lyric: '', plainLyric: '', source: '' };

        // 1. LRCLIB
        if (!preferSource || preferSource === 'lrclib') {
          if (query) {
            const cleanName = (name || '').replace(/\s*(Lyric Video|Official|MV|歌詞|歌词|中英|字幕|Audio|Video|4K|HD|1080p|60fps|with lyrics|lyrics).*$/i, '').replace(/[|│].*$/, '').trim();
            const cleanQuery = (cleanName && artist) ? (cleanName + ' ' + artist) : query;
            try {
              let lrcRes = await fetch('https://lrclib.net/api/get?artist_name=' + encodeURIComponent(artist) + '&track_name=' + encodeURIComponent(cleanName || name));
              if (lrcRes.ok) {
                const data = await lrcRes.json();
                if (data && data.syncedLyrics) { sendJSON(res, { lyric: data.syncedLyrics, plainLyric: data.plainLyrics || '', source: 'lrclib' }); return; }
              }
              const searchRes = await fetch('https://lrclib.net/api/search?q=' + encodeURIComponent(cleanQuery));
              if (searchRes.ok) {
                const results = await searchRes.json();
                if (results && results.length > 0) {
                  let best = null;
                  let bestScore = 0;
                  const qArtist = (artist || '').toLowerCase().trim();
                  for (const r of results) {
                    let score = 0;
                    const rArtist = (r.artistName || '').toLowerCase().trim();
                    if (qArtist && rArtist) {
                      if (rArtist === qArtist) score += 100;
                      else if (rArtist.includes(qArtist) || qArtist.includes(rArtist)) score += 50;
                    }
                    if (!best || score > bestScore) { best = r; bestScore = score; }
                  }
                  if (!best) best = results[0];
                  if (best.id) {
                    const detailRes = await fetch('https://lrclib.net/api/get/' + best.id);
                    if (detailRes.ok) {
                      const detail = await detailRes.json();
                      if (detail && detail.syncedLyrics) { sendJSON(res, { lyric: detail.syncedLyrics, plainLyric: detail.plainLyrics || '', source: 'lrclib' }); return; }
                    }
                  }
                  if (best.syncedLyrics) { sendJSON(res, { lyric: best.syncedLyrics, plainLyric: best.plainLyrics || '', source: 'lrclib' }); return; }
                }
              }
            } catch (e) { console.warn('[LRCLIB]', e.message); }
          }
        }

        // 2. musicstream-sdk
        if (videoId && (!preferSource || preferSource === 'music-kit')) {
          try {
            const { MusicKit } = require('musicstream-sdk');
            const mk = new MusicKit();
            const lyrics = await mk.getLyrics(videoId);
            if (lyrics) {
              if (lyrics.synced && Array.isArray(lyrics.synced) && lyrics.synced.length) {
                const lrcLines = lyrics.synced.map(l => {
                  const mm = Math.floor(l.time / 60);
                  const ss = Math.floor(l.time % 60);
                  const ms = Math.floor((l.time % 1) * 100);
                  return `[${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}.${String(ms).padStart(2, '0')}]${l.text}`;
                });
                result = { lyric: lrcLines.join('\n'), plainLyric: lyrics.plain || '', source: 'music-kit' };
              } else if (lyrics.plain) {
                result = { lyric: '', plainLyric: lyrics.plain, source: 'music-kit-plain' };
              }
            }
          } catch (e) { console.warn('[MusicKit]', e.message); }
        }
        if (result.lyric) { sendJSON(res, result); return; }

        // 3. 网易云音乐
        if (!preferSource || preferSource === 'netease') {
          try {
            const searchKw = artist ? (name + ' ' + artist) : name;
            if (searchKw) {
              const sr = await cloudsearch({ keywords: searchKw, limit: 5, cookie: userCookie, timestamp: Date.now() });
              const songs = sr.body && sr.body.result && sr.body.result.songs;
              if (songs && songs.length) {
                let best = songs[0];
                if (artist) {
                  for (const s of songs) {
                    const sArtists = (s.artists || s.ar || []).map(a => (a.name || a.nickname || ''));
                    if (sArtists.some(a => a.toLowerCase().includes(artist.toLowerCase()))) { best = s; break; }
                  }
                }
                const nid = String(best.id);
                let neteaseResult = { lyric: '', plainLyric: '', source: '' };
                try {
                  if (typeof lyric_new === 'function') {
                    const nr = await lyric_new({ id: nid, cookie: userCookie, timestamp: Date.now() });
                    const nb = nr.body || {};
                    if ((nb.lrc && nb.lrc.lyric) || (nb.yrc && nb.yrc.lyric)) {
                      neteaseResult = { lyric: nb.lrc ? (nb.lrc.lyric || '') : '', plainLyric: '', yrc: nb.yrc ? (nb.yrc.lyric || '') : '', source: 'netease' };
                    }
                  }
                } catch (e1) {
                  try {
                    const r = await lyric({ id: nid, cookie: userCookie, timestamp: Date.now() });
                    const rb = r.body || {};
                    if (rb.lrc && rb.lrc.lyric) {
                      neteaseResult = { lyric: rb.lrc.lyric || '', plainLyric: '', yrc: (rb.yrc && rb.yrc.lyric) || '', source: 'netease' };
                    }
                  } catch (e2) { }
                }
                if (neteaseResult.lyric || neteaseResult.yrc) {
                  result = neteaseResult;
                  if (result.lyric) { sendJSON(res, result); return; }
                }
              }
            }
          } catch (e) { console.warn('[NeteaseLyric]', e.message); }
        }
        if (result.lyric) { sendJSON(res, result); return; }

        // 4. 酷狗音乐
        if (!preferSource || preferSource === 'kugou') {
          try {
            const kw = (name + ' ' + artist).trim();
            if (kw) {
              const searchRes = await fetch('http://mobilecdn.kugou.com/api/v3/search/song?format=json&keyword=' + encodeURIComponent(kw) + '&page=1&pagesize=3&showtype=1');
              if (searchRes.ok) {
                const searchData = await searchRes.json();
                const songs = searchData && searchData.data && searchData.data.info;
                if (songs && songs.length) {
                  let bestMatch = null;
                  if (artist) {
                    const qArt = artist.toLowerCase().trim();
                    for (const s of songs) {
                      const sArt = (s.singername || '').toLowerCase().trim();
                      if (sArt.includes(qArt) || qArt.includes(sArt)) { bestMatch = s; break; }
                    }
                  }
                  if (!bestMatch) bestMatch = songs[0];
                  const hash = bestMatch.hash;
                  if (hash) {
                    const metaRes = await fetch('https://krcs.kugou.com/search?ver=1&man=yes&client=mobi&keyword=&duration=&hash=' + hash + '&album_audio_id=');
                    if (metaRes.ok) {
                      const metaData = await metaRes.json();
                      const candidates = metaData && metaData.candidates;
                      if (candidates && candidates.length) {
                        const lyricId = candidates[0].id;
                        const accessKey = candidates[0].accesskey;
                        if (lyricId && accessKey) {
                          const dlRes = await fetch('http://lyrics.kugou.com/download?ver=1&client=pc&id=' + lyricId + '&accesskey=' + accessKey + '&fmt=lrc&charset=utf8');
                          if (dlRes.ok) {
                            const dlData = await dlRes.json();
                            if (dlData && dlData.content) {
                              const lrcText = Buffer.from(dlData.content, 'base64').toString('utf-8');
                              result = { lyric: lrcText, plainLyric: '', source: 'kugou' };
                              if (result.lyric) { sendJSON(res, result); return; }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          } catch (e) { console.warn('[KugouLyric]', e.message); }
        }
        if (result.lyric) { sendJSON(res, result); return; }

        // 5. yt-dlp 字幕
        if (videoId && (!preferSource || preferSource === 'yt-captions') && !result.lyric) {
          try {
            const info = await ytDlp('https://www.youtube.com/watch?v=' + videoId, {
              dumpSingleJson: true, noCheckCertificates: true, noWarnings: true,
            });
            const subs = info.subtitles || info.automatic_captions || {};
            const enCaps = (subs.en || []).find(s => s.ext === 'vtt' && s.url) || (subs['en-orig'] || []).find(s => s.ext === 'vtt' && s.url);
            if (enCaps && enCaps.url) {
              const vttRes = await fetch(enCaps.url);
              const vttText = await vttRes.text();
              const lrcLines = [];
              const lines = vttText.split('\n');
              for (let i = 0; i < lines.length; i++) {
                const m = lines[i].match(/^(\d{2}):(\d{2}):(\d{2})\.(\d{3})\s*-->/);
                if (!m) continue;
                const totalMin = parseInt(m[1]) * 60 + parseInt(m[2]);
                const frac = m[4].slice(0, 2);
                const textLines = [];
                for (let j = i + 1; j < lines.length; j++) {
                  const n = lines[j].trim();
                  if (!n || n.includes('-->')) break;
                  textLines.push(n.replace(/♪/g, '').trim());
                }
                const text = textLines.join(' ').replace(/\s+/g, ' ').trim();
                if (text) lrcLines.push(`[${String(totalMin).padStart(2, '0')}:${m[3]}.${frac}]${text}`);
              }
              if (lrcLines.length) { sendJSON(res, { lyric: lrcLines.join('\n'), source: 'yt-captions' }); return; }
            }
          } catch (e) { console.warn('[YTCaptions]', e.message); }
        }

        // Plain fallback
        if (result.plainLyric) {
          sendJSON(res, { lyric: '', plainLyric: result.plainLyric, source: result.source });
        } else {
          sendJSON(res, { lyric: '', plainLyric: '', source: 'none' });
        }
      } catch (err) { console.error('[UniversalLyric]', err); sendJSON(res, { lyric: '', source: 'universal-error' }); }
    },
  },
  {
    path: '/api/lyric/yt-captions',
    handler: async (url, res) => {
      try {
        const videoId = url.searchParams.get('v') || '';
        if (!videoId) { sendJSON(res, { lyric: '', source: 'yt-captions-no-id' }); return; }
        const info = await ytDlp('https://www.youtube.com/watch?v=' + videoId, {
          dumpSingleJson: true,
          noCheckCertificates: true,
          noWarnings: true,
        });
        const subs = info.subtitles || info.automatic_captions || {};
        const enCaps = (subs.en || []).find(s => s.ext === 'vtt' && s.url) || (subs['en-orig'] || []).find(s => s.ext === 'vtt' && s.url);
        if (!enCaps || !enCaps.url) { sendJSON(res, { lyric: '', source: 'yt-captions-unavailable' }); return; }
        const vttRes = await fetch(enCaps.url);
        const vttText = await vttRes.text();
        const lrcLines = [];
        const vttLines = vttText.split('\n');
        for (let i = 0; i < vttLines.length; i++) {
          const line = vttLines[i].trim();
          const tMatch = line.match(/^(\d{2}):(\d{2}):(\d{2})\.(\d{3})\s*-->\s*\d{2}:\d{2}:\d{2}\.\d{3}/);
          if (!tMatch) continue;
          const hh = parseInt(tMatch[1]);
          const mm = parseInt(tMatch[2]);
          const ss = parseInt(tMatch[3]);
          const totalMin = hh * 60 + mm;
          const frac = tMatch[4].slice(0, 2);
          const lrcTime = String(totalMin).padStart(2, '0') + ':' + String(ss).padStart(2, '0') + '.' + frac;
          const textLines = [];
          for (let j = i + 1; j < vttLines.length; j++) {
            const next = vttLines[j].trim();
            if (!next || next.includes('-->')) break;
            textLines.push(next.replace(/♪/g, '').trim());
          }
          const text = textLines.join(' ').replace(/\s+/g, ' ').trim();
          if (text) lrcLines.push('[' + lrcTime + ']' + text);
        }
        sendJSON(res, { lyric: lrcLines.join('\n'), source: lrcLines.length ? 'yt-captions' : 'yt-captions-empty' });
      } catch (err) { console.error('[YTcaptions]', err); sendJSON(res, { lyric: '', source: 'yt-captions-error' }); }
    },
  },
  {
    path: '/api/lyric/lrclib',
    handler: async (url, res) => {
      try {
        const name = url.searchParams.get('name') || '';
        const artist = url.searchParams.get('artist') || '';
        const query = artist ? (name + ' ' + artist) : name;
        if (!query) { sendJSON(res, { lyric: '', source: 'lrclib-no-query' }); return; }
        let lrcUrl = 'https://lrclib.net/api/get?artist_name=' + encodeURIComponent(artist) + '&track_name=' + encodeURIComponent(name);
        let lrcRes = await fetch(lrcUrl);
        if (lrcRes.ok) {
          const data = await lrcRes.json();
          if (data && data.syncedLyrics) {
            sendJSON(res, { lyric: data.syncedLyrics, plainLyric: data.plainLyrics || '', source: 'lrclib' });
            return;
          }
        }
        const searchRes = await fetch('https://lrclib.net/api/search?q=' + encodeURIComponent(query));
        if (searchRes.ok) {
          const results = await searchRes.json();
          if (results && results.length > 0) {
            const best = results[0];
            if (best.id) {
              const detailRes = await fetch('https://lrclib.net/api/get/' + best.id);
              if (detailRes.ok) {
                const detail = await detailRes.json();
                if (detail && detail.syncedLyrics) {
                  sendJSON(res, { lyric: detail.syncedLyrics, plainLyric: detail.plainLyrics || '', source: 'lrclib' });
                  return;
                }
              }
            }
            if (best.syncedLyrics) {
              sendJSON(res, { lyric: best.syncedLyrics, plainLyric: best.plainLyrics || '', source: 'lrclib' });
              return;
            }
          }
        }
        sendJSON(res, { lyric: '', source: 'lrclib-not-found' });
      } catch (err) { console.error('[LRCLIB]', err); sendJSON(res, { lyric: '', source: 'lrclib-error' }); }
    },
  },
];

module.exports = { routes };
