// 03-api.js — API fetch helpers, playback quality utilities, cover helpers
// ============================================================
// Extracted from api-helper.js and cover.js. All functions use window.* prefix.

// ---- Fetch wrapper ----
window.apiJson = async function(url, opts) {
  opts = opts || {};
  var timeoutMs = Number(opts.timeoutMs) || 0;
  var fetchOpts = Object.assign({}, opts);
  delete fetchOpts.timeoutMs;
  var timer = null;
  if (timeoutMs && window.AbortController && !fetchOpts.signal) {
    var controller = new AbortController();
    fetchOpts.signal = controller.signal;
    timer = setTimeout(function(){ controller.abort(); }, timeoutMs);
  }
  try {
    var res = await fetch(url, fetchOpts);
    return res.json();
  } finally {
    if (timer) clearTimeout(timer);
  }
}

// ---- Playback quality normalization ----
window.normalizePlaybackQuality = function(value) {
  value = String(value || '').toLowerCase();
  if (value === 'jymaster' || value === 'master' || value === 'svip') return 'jymaster';
  if (value === 'hires' || value === 'hi-res' || value === 'highres' || value === 'highest') return 'hires';
  if (value === 'lossless' || value === 'flac' || value === 'sq') return 'lossless';
  if (value === 'exhigh' || value === 'high' || value === '320k' || value === 'hq') return 'exhigh';
  if (value === 'standard' || value === 'normal' || value === 'std') return 'standard';
  return 'hires';
}

window.playbackQualityLabel = function(value) {
  value = window.normalizePlaybackQuality(value);
  if (value === 'jymaster') return '超清母带';
  if (value === 'hires') return '高清臻音';
  if (value === 'lossless') return '无损';
  if (value === 'exhigh') return '极高';
  if (value === 'standard') return '标准';
  return '高清臻音';
}

window.playbackQualityShortLabel = function(value) {
  value = window.normalizePlaybackQuality(value);
  if (value === 'jymaster') return '母带';
  if (value === 'hires') return '臻音';
  if (value === 'lossless') return 'SQ';
  if (value === 'exhigh') return 'HQ';
  if (value === 'standard') return 'STD';
  return '臻音';
}

window.playbackQualityRank = function(value) {
  value = window.normalizePlaybackQuality(value);
  if (value === 'jymaster') return 5;
  if (value === 'hires') return 4;
  if (value === 'lossless') return 3;
  if (value === 'exhigh') return 2;
  if (value === 'standard') return 1;
  return 4;
}

window.playbackQualityWasDowngraded = function(requested, resolved) {
  return window.playbackQualityRank(resolved) < window.playbackQualityRank(requested);
}

window.playbackBitrateLabel = function(br) {
  br = Number(br) || 0;
  if (!br) return '';
  if (br >= 1000000) return (br / 1000000).toFixed(br >= 2000000 ? 1 : 2).replace(/\.0+$/, '') + ' Mbps';
  return Math.round(br / 1000) + ' kbps';
}

window.playbackResolvedQualityText = function(data) {
  data = data || {};
  var label = window.playbackQualityLabel(data.level || data.quality || window.playbackQuality);
  var br = window.playbackBitrateLabel(data.br);
  return br ? (label + ' · ' + br) : label;
}

window.readPlaybackQualityPreference = function() {
  try {
    return window.normalizePlaybackQuality(localStorage.getItem(window.PLAYBACK_QUALITY_STORE_KEY) || 'hires');
  } catch (e) {
    return 'hires';
  }
}

window.savePlaybackQualityPreference = function() {
  try { localStorage.setItem(window.PLAYBACK_QUALITY_STORE_KEY, window.playbackQuality); } catch (e) {}
}

// ---- Cover / image helpers ----
window.coverUrlWithSize = function(url, size) {
  if (!url || window.isInlineCoverSrc(url) || !/^https?:\/\//i.test(url)) return url || '';
  if (!size) return url;
  var param = 'param=' + size + 'y' + size;
  if (/[?&]param=\d+y\d+/i.test(url)) return url.replace(/([?&])param=\d+y\d+/i, '$1' + param);
  return url + (url.indexOf('?') >= 0 ? '&' : '?') + param;
}

window.cssImageUrl = function(url) {
  return String(url || '').replace(/\\/g, '\\\\').replace(/"/g, '%22');
}

window.coverProxySrc = function(url, cacheBust) {
  if (!url) return '';
  if (window.isInlineCoverSrc(url)) return url;
  if (!window.isProxyableCoverUrl(url)) return '';
  return '/api/cover?url=' + encodeURIComponent(url) + (cacheBust ? '&v=' + Date.now() : '');
}

// ---- Audio URL cache (from shared.js) ----
window._audioUrlCache = {};
window._prefetchAudioEls = {};
window._cacheKeyForSong = function(song) {
  var provider = window.songProviderKey(song);
  return provider + ':' + (song.id || song.mid || song.songmid || (song.name + '|' + song.artist));
}
