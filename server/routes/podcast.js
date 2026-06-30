// ====================================================================
//  Podcast 路由 /api/podcast/*
// ====================================================================
const { cloudsearch, dj_hot, dj_detail, dj_program, dj_sublist, user_audio, dj_paygift, record_recent_voice, sati_resource_sub_list } = require('NeteaseCloudMusicApi');
const { analyzePodcastDjStream, analyzePodcastDjIntro } = require('../../dj-analyzer');
const { sendJSON } = require('../lib/send-json');

// ---- 数据映射 ----
function mapPodcastRadio(r) {
  r = r || {};
  const dj = r.dj || r.djSimple || r.djUser || r.creator || {};
  const id = r.id || r.rid || r.radioId;
  return {
    id,
    rid: id,
    name: r.name || r.radioName || '',
    cover: r.picUrl || r.picURL || r.coverUrl || r.coverImgUrl || r.avatarUrl || '',
    desc: r.desc || r.description || r.rcmdText || '',
    djName: dj.nickname || r.djName || r.nickname || '',
    category: r.category || r.categoryName || '',
    programCount: r.programCount || r.programNum || r.programCnt || 0,
    subCount: r.subCount || r.subedCount || r.subscriberCount || 0,
  };
}

function lowSignalText(value) {
  return String(value || '').trim().toLowerCase();
}

function isLowSignalPodcastItem(item) {
  const name = lowSignalText(item && (item.name || item.title || item.radioName));
  const sub = lowSignalText(item && (item.djName || item.category || item.desc || item.sub));
  const text = name + ' ' + sub;
  return /购买播客|付费精品|qzone|空间背景音乐|背景音乐|四只烤翅|试纸烤翅/i.test(text);
}

function mapPodcastProgram(p, fallbackRadio) {
  p = p || {};
  const mainSong = p.mainSong || p.song || p.mainTrack || {};
  const radio = p.radio || fallbackRadio || {};
  const mappedRadio = mapPodcastRadio(radio);
  const artists = mapArtists(mainSong.ar || mainSong.artists || []);
  const album = mainSong.al || mainSong.album || {};
  const dj = p.dj || radio.dj || {};
  const playableId = mainSong.id || p.mainSongId || p.songId;
  return {
    type: 'podcast',
    source: 'podcast',
    id: playableId,
    programId: p.id || p.programId,
    radioId: mappedRadio.id,
    name: p.name || mainSong.name || '',
    artist: mappedRadio.name || dj.nickname || artists.map(a => a.name).join(' / ') || mappedRadio.djName || '',
    artists,
    artistId: artists[0] && artists[0].id,
    album: mappedRadio.name || album.name || 'Podcast',
    cover: p.coverUrl || p.cover || p.blurCoverUrl || mappedRadio.cover || album.picUrl || '',
    duration: p.duration || mainSong.dt || mainSong.duration || 0,
    fee: mainSong.fee,
    djName: mappedRadio.djName || dj.nickname || '',
    radioName: mappedRadio.name || '',
    desc: p.description || p.desc || '',
    createTime: p.createTime || 0,
    serialNum: p.serialNum || p.serial || 0,
  };
}

function firstArrayFrom(obj, keys) {
  obj = obj || {};
  for (const key of keys) {
    const value = obj[key];
    if (Array.isArray(value)) return value;
    if (value && Array.isArray(value.list)) return value.list;
    if (value && Array.isArray(value.data)) return value.data;
    if (value && Array.isArray(value.resources)) return value.resources;
  }
  return [];
}

function mapPodcastVoice(v) {
  v = v || {};
  const raw = v.resource || v.voice || v.data || v.program || v;
  const mainSong = raw.mainSong || raw.song || raw.track || {};
  const radio = raw.radio || raw.djRadio || raw.voiceList || raw.podcast || {};
  const playableId = raw.trackId || raw.songId || raw.mainSongId || mainSong.id || raw.id;
  return {
    type: 'podcast',
    source: 'podcast',
    sourceType: 'podcast-voice',
    id: playableId,
    programId: raw.programId || raw.voiceId || raw.id,
    radioId: radio.id || radio.radioId || radio.voiceListId || raw.radioId || raw.voiceListId,
    name: raw.name || raw.songName || raw.title || mainSong.name || '',
    artist: (radio.name || radio.radioName || radio.voiceListName || raw.podcastName || raw.djName || 'Voice'),
    album: radio.name || radio.radioName || raw.podcastName || 'Podcast',
    cover: raw.coverUrl || raw.cover || raw.picUrl || raw.coverImgUrl || radio.picUrl || radio.coverUrl || '',
    duration: raw.duration || raw.durationMs || mainSong.dt || mainSong.duration || 0,
    djName: raw.djName || (radio.dj && radio.dj.nickname) || '',
    radioName: radio.name || radio.radioName || raw.podcastName || '',
    desc: raw.desc || raw.description || '',
  };
}

function mapPodcastCollectionRadio(r, key) {
  const radio = mapPodcastRadio(r);
  return {
    ...radio,
    type: 'podcast-radio',
    sourceType: 'podcast-radio',
    collectionKey: key || '',
    radioId: radio.id,
    name: radio.name,
    artist: radio.djName || radio.category || 'Podcast',
    album: radio.category || 'Podcast',
  };
}

function podcastCollectionMeta(key, items) {
  const meta = {
    collect: { key: 'collect', title: '收藏播客', sub: '你收藏的播客', itemType: 'radio' },
    created: { key: 'created', title: '创建播客', sub: '你创建的播客', itemType: 'radio' },
    liked: { key: 'liked', title: '喜欢的声音', sub: '收藏或最近喜欢的声音', itemType: 'voice' },
  }[key] || { key, title: key, sub: '', itemType: 'radio' };
  const first = (items || [])[0] || {};
  return {
    ...meta,
    count: (items || []).length,
    cover: first.cover || first.picUrl || first.coverUrl || '',
  };
}

async function fetchMyPodcastItems(key, info, limit, offset, userCookie) {
  limit = Math.max(8, Math.min(60, Number(limit) || 30));
  offset = Math.max(0, Number(offset) || 0);
  if (key === 'collect') {
    const r = await dj_sublist({ limit, offset, cookie: userCookie, timestamp: Date.now() });
    const raw = firstArrayFrom(r.body, ['djRadios', 'djradios', 'radios', 'data']);
    return { itemType: 'radio', items: raw.map(x => mapPodcastCollectionRadio(x, key)).filter(x => x.id) };
  }
  if (key === 'created') {
    const r = await user_audio({ uid: info.userId, cookie: userCookie, timestamp: Date.now() });
    const raw = firstArrayFrom(r.body, ['data', 'djRadios', 'djradios', 'radios']);
    return { itemType: 'radio', items: raw.map(x => mapPodcastCollectionRadio(x, key)).filter(x => x.id) };
  }
  if (key === 'paid') {
    const r = await dj_paygift({ limit, offset, cookie: userCookie, timestamp: Date.now() });
    const raw = firstArrayFrom(r.body, ['data', 'djRadios', 'djradios', 'radios']);
    return { itemType: 'radio', items: raw.map(x => mapPodcastCollectionRadio(x, key)).filter(x => x.id) };
  }
  if (key === 'liked') {
    let raw = [];
    try {
      const sati = await sati_resource_sub_list({ cookie: userCookie, timestamp: Date.now() });
      raw = firstArrayFrom(sati.body, ['data', 'resources', 'list']);
    } catch (e) {
      console.warn('[MyPodcastLiked] sati sub list failed:', e.message);
    }
    if (!raw.length) {
      try {
        const recent = await record_recent_voice({ limit, cookie: userCookie, timestamp: Date.now() });
        raw = firstArrayFrom(recent.body, ['data', 'list', 'resources']);
      } catch (e) {
        console.warn('[MyPodcastLiked] recent voice fallback failed:', e.message);
      }
    }
    return { itemType: 'voice', items: raw.map(mapPodcastVoice).filter(x => x.id && x.name) };
  }
  return { itemType: 'radio', items: [] };
}

function mapArtists(raw) {
  return (raw || [])
    .map(a => ({ id: a && a.id, name: (a && a.name) || '' }))
    .filter(a => a.name);
}

// ====================================================================
//  路由处理器
// ====================================================================
module.exports = [
  {
    path: '/api/podcast/search',
    handler: async (url, res, req, ctx) => {
      try {
        const kw = String(url.searchParams.get('keywords') || '').trim();
        const limit = Math.max(6, Math.min(30, parseInt(url.searchParams.get('limit') || '18', 10) || 18));
        if (!kw) { sendJSON(res, { podcasts: [] }); return; }
        const r = await cloudsearch({ keywords: kw, type: 1009, limit, cookie: ctx.userCookie, timestamp: Date.now() });
        const result = (r.body && r.body.result) || {};
        const raw = result.djRadios || result.djradios || result.radios || [];
        const podcasts = raw.map(mapPodcastRadio).filter(p => p.id);
        sendJSON(res, { podcasts, total: result.djRadiosCount || result.djradiosCount || podcasts.length });
      } catch (err) {
        console.error('[PodcastSearch]', err);
        sendJSON(res, { error: err.message, podcasts: [] }, 500);
      }
    },
  },
  {
    path: '/api/podcast/hot',
    handler: async (url, res, req, ctx) => {
      try {
        const limit = Math.max(6, Math.min(30, parseInt(url.searchParams.get('limit') || '18', 10) || 18));
        const offset = Math.max(0, parseInt(url.searchParams.get('offset') || '0', 10) || 0);
        const r = await dj_hot({ limit, offset, cookie: ctx.userCookie, timestamp: Date.now() });
        const body = r.body || {};
        const raw = body.djRadios || body.djradios || body.radios || body.data || [];
        const podcasts = (Array.isArray(raw) ? raw : []).map(mapPodcastRadio).filter(p => p.id);
        sendJSON(res, { podcasts, more: !!body.hasMore });
      } catch (err) {
        console.error('[PodcastHot]', err);
        sendJSON(res, { error: err.message, podcasts: [] }, 500);
      }
    },
  },
  {
    path: '/api/podcast/detail',
    handler: async (url, res, req, ctx) => {
      try {
        const rid = url.searchParams.get('id') || url.searchParams.get('rid');
        if (!rid) { sendJSON(res, { error: 'Missing podcast id' }, 400); return; }
        const r = await dj_detail({ rid, cookie: ctx.userCookie, timestamp: Date.now() });
        const body = r.body || {};
        const radio = mapPodcastRadio(body.data || body.djRadio || body.radio || body);
        sendJSON(res, { podcast: radio });
      } catch (err) {
        console.error('[PodcastDetail]', err);
        sendJSON(res, { error: err.message }, 500);
      }
    },
  },
  {
    path: '/api/podcast/programs',
    handler: async (url, res, req, ctx) => {
      try {
        const rid = url.searchParams.get('id') || url.searchParams.get('rid');
        if (!rid) { sendJSON(res, { error: 'Missing podcast id', programs: [] }, 400); return; }
        const limit = Math.max(10, Math.min(60, parseInt(url.searchParams.get('limit') || '30', 10) || 30));
        const offset = Math.max(0, parseInt(url.searchParams.get('offset') || '0', 10) || 0);
        const r = await dj_program({ rid, limit, offset, asc: false, cookie: ctx.userCookie, timestamp: Date.now() });
        const body = r.body || {};
        const raw = body.programs || (body.data && (body.data.list || body.data.programs)) || [];
        const radio = raw[0] && raw[0].radio ? mapPodcastRadio(raw[0].radio) : { id: rid, rid };
        const programs = (Array.isArray(raw) ? raw : [])
          .map(p => mapPodcastProgram(p, radio))
          .filter(p => p.id && p.name);
        sendJSON(res, { radio, programs, more: !!body.more, total: body.count || programs.length });
      } catch (err) {
        console.error('[PodcastPrograms]', err);
        sendJSON(res, { error: err.message, programs: [] }, 500);
      }
    },
  },
  {
    path: '/api/podcast/my',
    handler: async (url, res, req, ctx) => {
      try {
        const info = await ctx.getLoginInfo();
        if (!info.loggedIn || !info.userId) {
          const empty = ['collect', 'created', 'liked'].map(k => podcastCollectionMeta(k, []));
          sendJSON(res, { loggedIn: false, collections: empty });
          return;
        }
        const keys = ['collect', 'created', 'liked'];
        const collections = await Promise.all(keys.map(async key => {
          try {
            const data = await fetchMyPodcastItems(key, info, 12, 0, ctx.userCookie);
            return podcastCollectionMeta(key, data.items || []);
          } catch (e) {
            console.warn('[MyPodcast]', key, e.message);
            return podcastCollectionMeta(key, []);
          }
        }));
        sendJSON(res, { loggedIn: true, collections });
      } catch (err) {
        console.error('[MyPodcast]', err);
        sendJSON(res, { error: err.message, collections: [] }, 500);
      }
    },
  },
  {
    path: '/api/podcast/my/items',
    handler: async (url, res, req, ctx) => {
      try {
        const info = await ctx.getLoginInfo();
        if (!info.loggedIn || !info.userId) { sendJSON(res, { loggedIn: false, items: [] }); return; }
        const key = String(url.searchParams.get('key') || 'collect');
        const limit = parseInt(url.searchParams.get('limit') || '36', 10) || 36;
        const offset = parseInt(url.searchParams.get('offset') || '0', 10) || 0;
        const data = await fetchMyPodcastItems(key, info, limit, offset, ctx.userCookie);
        sendJSON(res, { loggedIn: true, key, ...podcastCollectionMeta(key, data.items || []), itemType: data.itemType, items: data.items || [] });
      } catch (err) {
        console.error('[MyPodcastItems]', err);
        sendJSON(res, { error: err.message, items: [] }, 500);
      }
    },
  },
  {
    path: '/api/podcast/dj-beatmap',
    handler: async (url, res) => {
      try {
        const audioUrl = url.searchParams.get('url');
        const durationSec = Math.max(0, Number(url.searchParams.get('duration') || 0) || 0);
        if (!audioUrl || !/^https?:\/\//i.test(audioUrl)) {
          sendJSON(res, { error: 'Invalid audio url' }, 400);
          return;
        }
        console.log('[PodcastDjBeatmap] start', Math.round(durationSec || 0) + 's');
        const started = Date.now();
        const introSec = Math.max(0, Number(url.searchParams.get('intro') || 0) || 0);
        const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
        const map = introSec
          ? await analyzePodcastDjIntro(audioUrl, { durationSec, introSec, userAgent: UA })
          : await analyzePodcastDjStream(audioUrl, { durationSec, userAgent: UA });
        console.log('[PodcastDjBeatmap] done beats:', map.visualBeatCount || 0, 'ms:', Date.now() - started, 'decode:', map.decode || {});
        sendJSON(res, { ok: true, map });
      } catch (err) {
        console.error('[PodcastDjBeatmap]', err);
        sendJSON(res, { ok: false, error: err.message || String(err) }, 500);
      }
    },
  },
];
