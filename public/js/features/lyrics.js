// ============================================================
//  歌词
// ============================================================
var _prefetchAudioEls = {}; // 预取音频元素缓存, 由 _prefetchAdjacent / playQueueAt 共享
var _lyricFetchController = null;
window.Mineradio.bus.on('player:trackchange', function() {
  if (_lyricFetchController) { _lyricFetchController.abort(); _lyricFetchController = null; }
});
// ============================================================
//  Fetch — API request with cache
async function fetchLyric(songOrId, token, preferSource) {
  try {
    // 没有指定 source 时（正常切歌），重置为默认源
    if (!preferSource) {
      _lyricSourceIdx = 0;
      var srcBtn = document.getElementById('lyric-source-btn');
      if (srcBtn) srcBtn.textContent = '源·' + (_lyricSourceLabels[_lyricSources[0]] || 'A');
    }
    var song = (songOrId && typeof songOrId === 'object') ? songOrId : null;
    var provider = Mineradio.util.songProviderKey(song);
    var endpoint;
    if (provider === 'qq') {
      var mid = song.mid || song.songmid || song.id || '';
      var qqId = song.qqId || (/^\d+$/.test(String(song.id || '')) ? song.id : '');
      endpoint = '/api/qq/lyric?mid=' + encodeURIComponent(mid) + '&id=' + encodeURIComponent(qqId);
    } else if (provider === 'youtube') {
      var sn = (song && song.name) || '';
      var sa = (song && song.artist) || '';
      endpoint = '/api/lyric/universal?name=' + encodeURIComponent(sn) + '&artist=' + encodeURIComponent(sa) + '&v=' + encodeURIComponent(song.id);
      if (preferSource) endpoint += '&source=' + encodeURIComponent(preferSource);
    } else {
      var songId = song ? song.id : songOrId;
      endpoint = '/api/lyric?id=' + encodeURIComponent(songId);
    }
    if (!endpoint) throw new Error('NO_LYRIC_SOURCE');
    // 歌词缓存：同一个 provider:id + source 的歌词，一周内不重复请求
    var cacheKey = 'mineradio-lyric-' + provider + ':' + (song ? song.id : songOrId) + (preferSource ? '-' + preferSource : '');
    var r;
    try {
      var cached = Mineradio.util.storageGet(cacheKey);
      if (cached) {
        var parsed = JSON.parse(cached);
        if (parsed && parsed.ts && Date.now() - parsed.ts < 7 * 86400000) {
          r = parsed.data;
        }
      }
    } catch (e) {}
    if (!r) {
      if (_lyricFetchController) _lyricFetchController.abort();
      _lyricFetchController = new AbortController();
      r = await Mineradio.util.apiJson(endpoint, { signal: _lyricFetchController.signal });
      _lyricFetchController = null;
      try { Mineradio.util.storageSet(cacheKey, JSON.stringify({ ts: Date.now(), data: r })); } catch (e) {}
    }
    if (token !== trackSwitchToken) return;
    var nativeLines = parseYrcText(r.yrc || '');
    var lrcLines = parseLyricText(r.lyric || '');
    var hasNativeKaraoke = nativeLines.some(function(line){ return line.words && line.words.length; });
    // 有 sync 歌词 → 正常显示；没有但有 plainLyric → 作为静态歌词显示
    var lines;
    if (nativeLines.length || lrcLines.length) {
      lines = withLyricFallback(nativeLines.length ? nativeLines : lrcLines);
    } else if (r.plainLyric) {
      // 按行拆分纯文本歌词，每行显示一段时间
      var plainLines = r.plainLyric.split(/\r?\n/).filter(function(l){ return l.trim(); });
      lines = plainLines.map(function(line, i){
        return { t: i * 2, text: line, duration: 4, charCount: line.length, fallback: true, plain: true };
      });
      if (!lines.length) lines = withLyricFallback([]);
    } else {
      lines = withLyricFallback([]);
    }
    var timingSource = hasNativeKaraoke ? 'yrc-word' : (nativeLines.length ? 'yrc-line' : (lrcLines.length ? 'lrc-line' : 'fallback'));
    if (lines.length && lines[0].fallback) timingSource = 'fallback';
    setOriginalLyricsState(lines, hasNativeKaraoke, timingSource);
    applyPreferredLyricsForCurrent(true);
    // 串烧检测提示
    if (song && /串烧|medley|mix|mashup|连续|remix/i.test(song.name || '')) {
      showToast('串烧歌曲，歌词可能不匹配');
    }
  } catch (e) {
    if (token !== trackSwitchToken) return;
    var fallbackLines = withLyricFallback([]);
    setOriginalLyricsState(fallbackLines, false, 'fallback');
    applyPreferredLyricsForCurrent(true);
  }
}
function currentLyricFallbackText() {
  var song = currentLyricSong() || {};
  var title = (song.name || document.getElementById('thumb-title').textContent || '').trim();
  var artist = (song.artist || document.getElementById('thumb-artist').textContent || '').trim();
  if (!title) return '';
  return artist ? title + ' - ' + artist : title;
}
function isNoLyricText(text) {
  var compact = String(text || '').replace(/\s+/g, '').replace(/[，,。.!！?？、~～]/g, '');
  return !compact ||
    compact === '纯音乐请欣赏' ||
    compact === '暂无歌词' ||
    compact === '暂无歌词敬请期待' ||
    compact === '此歌曲为没有填词的纯音乐请您欣赏';
}
function withLyricFallback(lines) {
  lines = Array.isArray(lines) ? lines.filter(function(line){ return line && String(line.text || '').trim(); }) : [];
  if (lines.length && !lines.every(function(line){ return isNoLyricText(line.text); })) return lines;
  var text = currentLyricFallbackText();
  return text ? [{ t:0, text:text, duration:9999, charCount:Math.max(1, text.length), fallback:true }] : [];
}
function lyricTagTimeToSeconds(min, sec, frac) {
  var t = (parseInt(min, 10) || 0) * 60 + (parseInt(sec, 10) || 0);
  if (frac) t += (parseInt(frac, 10) || 0) / Math.pow(10, Math.min(3, frac.length));
  return t;
}
function finalizeLyricLineDurations(lines) {
  lines.sort(function(a, b){ return a.t - b.t; });
  for (var i = 0; i < lines.length; i++) {
    var next = lines[i + 1];
    var inferred = next && next.t > lines[i].t ? next.t - lines[i].t : 4.8;
    if (!isFinite(lines[i].duration) || lines[i].duration <= 0) lines[i].duration = inferred;
    lines[i].duration = Math.max(0.45, Math.min(12, lines[i].duration));
    lines[i].charCount = Math.max(1, lines[i].charCount || String(lines[i].text || '').length);
  }
  return lines;
}
function parseLyricText(text) {
  var lines = [], reg = /\[(\d{1,2}):(\d{1,2})(?:\.(\d{1,3}))?\]/g;
  text.split(/\r?\n/).forEach(function(line){
    var times = [], m;
    reg.lastIndex = 0;
    while ((m = reg.exec(line))) times.push(lyricTagTimeToSeconds(m[1], m[2], m[3]));
    if (!times.length) return;
    var txt = line.replace(reg, '').trim();
    if (!txt) return;
    times.forEach(function(t){ lines.push({ t: t, text: txt, source:'lrc' }); });
  });
  return finalizeLyricLineDurations(lines);
}
function parseYrcText(text) {
  var lines = [];
  String(text || '').split(/\r?\n/).forEach(function(line){
    var m = line.match(/^\[(\d+),(\d+)\](.*)$/);
    if (!m) return;
    var lineStartMs = parseInt(m[1], 10) || 0;
    var lineDurMs = parseInt(m[2], 10) || 0;
    var body = m[3] || '';
    var words = [], fullText = '';
    var reg = /\((\d+),(\d+),\d+\)([^()]*)/g, wm;
    while ((wm = reg.exec(body))) {
      var txt = (wm[3] || '').replace(/\s+/g, ' ');
      if (!txt) continue;
      var rawStart = parseInt(wm[1], 10) || 0;
      var rawDur = parseInt(wm[2], 10) || 0;
      var absStartMs = rawStart >= lineStartMs - 500 ? rawStart : lineStartMs + rawStart;
      var c0 = fullText.length;
      fullText += txt;
      words.push({ text:txt, t:absStartMs / 1000, d:Math.max(0.06, rawDur / 1000), c0:c0, c1:fullText.length });
    }
    if (!fullText) fullText = body.replace(/\(\d+,\d+,\d+\)/g, '').replace(/\s+/g, ' ');
    var leading = (fullText.match(/^\s+/) || [''])[0].length;
    fullText = fullText.replace(/\s+/g, ' ').trim();
    if (!fullText) return;
    if (words.length) {
      words.forEach(function(w){
        w.c0 = Math.max(0, Math.min(fullText.length, w.c0 - leading));
        w.c1 = Math.max(w.c0, Math.min(fullText.length, w.c1 - leading));
      });
      words = words.filter(function(w){ return w.c1 > w.c0; });
    }
    lines.push({ t:lineStartMs / 1000, duration:lineDurMs / 1000, text:fullText, words:words, charCount:Math.max(1, fullText.length), source: words.length ? 'yrc-word' : 'yrc-line' });
  });
  return finalizeLyricLineDurations(lines);
}
// ============================================================
//  Prefetch — adjacent audio elements
function _prefetchAdjacent(centerIdx) {
  if (!Array.isArray(playQueue) || playQueue.length < 2) return;
  _prefetchToken++;
  var tok = _prefetchToken;
  var keys = Object.keys(_prefetchAudioEls);
  for (var k = 0; k < keys.length; k++) {
    var el = _prefetchAudioEls[keys[k]];
    if (el) { el.pause(); el.removeAttribute('src'); el.load(); }
  }
  _prefetchAudioEls = {};
  var min = Math.max(0, centerIdx - 2);
  var max = Math.min(playQueue.length - 1, centerIdx + 2);
  for (var i = min; i <= max; i++) {
    if (i === centerIdx) continue;
    (function(idx){
      var s = playQueue[idx];
      if (!s) return;
      var key = Mineradio.util._cacheKeyForSong(s);
      if (_audioUrlCache[key]) return; // 已有缓存
      var p = s.provider;
      var isYT = p === 'youtube';
      var isQQ = p === 'qq';
      if (!isYT && !isQQ) return; // 仅缓存流媒体源
      var url = isYT ? '/api/youtube/song/url?id=' + encodeURIComponent(s.id)
             : '/api/qq/song/url?mid=' + encodeURIComponent(s.mid || s.songmid || s.id || '') + '&mediaMid=' + encodeURIComponent(s.mediaMid || s.media_mid || '');
      Mineradio.util.apiJson(url).then(function(data){
        if (tok !== _prefetchToken) return;
        if (data && data.url) {
          _audioUrlCache[key] = data.url;
          // 创建隐藏 audio 预加载
          try {
            var proxyUrl = '/api/audio?url=' + encodeURIComponent(data.url);
            var pel = new Audio();
            pel.crossOrigin = 'anonymous';
            pel.preload = 'auto';
            pel.src = proxyUrl;
            pel.load();
            pel.volume = 0;
            _prefetchAudioEls[key] = pel;
          } catch (e) {}
        }
      }).catch(function(){});
    })(i);
  }
}
var _lyricOffsetToastTimer = null;
function _saveLyricOffset() {
  try { Mineradio.util.storageSet('mineradio-lyric-offset', String(_lyricOffset || 0)); } catch (e) {}
}
function _loadLyricOffset() {
  try {
    var v = parseFloat(Mineradio.util.storageGet('mineradio-lyric-offset'));
    if (isFinite(v)) _lyricOffset = Math.max(-30, Math.min(30, v));
  } catch (e) {}
}
function updateLyricOffsetVisibility() {
  // 只在 YouTube 歌曲 + 歌词开启时显示
  var song = playQueue && currentIdx >= 0 ? playQueue[currentIdx] : null;
  var isYT = song && Mineradio.util.songProviderKey(song) === 'youtube';
  var lyricsOn = !!(fx && fx.particleLyrics);
  var ind = document.getElementById('lyric-offset-indicator');
  if (!ind) return;
  var show = isYT && lyricsOn;
  ind.style.display = show ? '' : 'none';
  // 来源切换按钮只在原词模式下显示
  var srcBtn = document.getElementById('lyric-source-btn');
  if (srcBtn) {
    // 用父级 style.display 判断；如果父级都是 none 就直接隐藏
    var parentVisible = ind.style.display !== 'none';
    srcBtn.style.display = (parentVisible && lyricSourceMode === 'original') ? '' : 'none';
  }
}
function showLyricOffsetToast() {
  if (typeof _lyricOffset === 'undefined') _lyricOffset = 0;
  var val = document.getElementById('lyric-offset-value');
  var rst = document.getElementById('lyric-offset-btn-reset');
  if (val) val.textContent = (_lyricOffset > 0 ? '+' : '') + _lyricOffset.toFixed(1);
  if (rst) rst.style.display = _lyricOffset === 0 ? 'none' : '';
  showToast('歌词偏移 ' + (_lyricOffset > 0 ? '+' : '') + _lyricOffset.toFixed(1) + 's');
  _saveLyricOffset();
  updateLyricOffsetVisibility();
  clearTimeout(_lyricOffsetToastTimer);
  if (_lyricOffset === 0) return;
  _lyricOffsetToastTimer = setTimeout(function(){}, 1500);
}
var _lyricSources = ['lrclib', 'music-kit', 'netease', 'kugou', 'yt-captions'];
var _lyricSourceLabels = { 'lrclib': 'LRC', 'music-kit': 'YT', 'netease': '网', 'kugou': '酷', 'yt-captions': 'CC' };
var _lyricSourceIdx = 0;
// ============================================================
//  Source — cycle lyric provider
function cycleLyricSource() {
  _lyricSourceIdx = (_lyricSourceIdx + 1) % _lyricSources.length;
  var src = _lyricSources[_lyricSourceIdx];
  var btn = document.getElementById('lyric-source-btn');
  if (btn) btn.textContent = '源·' + (_lyricSourceLabels[src] || src);
  // 重新获取当前歌曲歌词
  var song = playQueue && currentIdx >= 0 ? playQueue[currentIdx] : null;
  if (song && (Mineradio.util.songProviderKey(song) === 'youtube' || lyricSourceMode === 'original')) {
    fetchLyric(song, trackSwitchToken, src);
  }
  showToast('歌词来源: ' + (_lyricSourceLabels[src] || src));
}
function renderLyrics() {
  // v8: 歌词渲染由 stageLyrics 在每帧 tickLyricsParticles 里推动
  clearStageLyrics();
}
// ============================================================
//  Display — lyrics panel toggle
function toggleLyricsPanel(force) {
  if (force === false) fx.particleLyrics = false;
  else if (force === true) fx.particleLyrics = true;
  else fx.particleLyrics = !fx.particleLyrics;
  if (fx.particleLyrics) {
    createLyricsParticles();
    showToast('歌词已开启');
  } else {
    clearStageLyrics();
    showToast('歌词已关闭');
  }
  lyricsVisible = fx.particleLyrics;
  updateLyricOffsetVisibility();
}
function updateLyricsHighlight() { /* v8: 由 tickLyricsParticles 接管 */ }

// ============================================================
//  Set Source — specific lyric provider
function setLyricSource(source) {
  if (source === 'auto') {
    _lyricSourceIdx = 0;
  } else {
    var idx = _lyricSources.indexOf(source);
    if (idx < 0) return;
    _lyricSourceIdx = idx;
  }
  var curSrc = _lyricSources[_lyricSourceIdx];
  var btn = document.getElementById('lyric-source-btn');
  if (btn) btn.textContent = '源·' + (_lyricSourceLabels[curSrc] || curSrc);
  updateMiniSourceButtons();
  var cur = currentCoverSong();
  if (cur) {
    fetchLyric(cur, trackSwitchToken, _lyricSourceIdx < 0 ? null : source);
  }
  showToast('歌词源: ' + (source === 'auto' ? '自动' : (_lyricSourceLabels[source] || source)));
}
function _songPrefKey(song) {
  if (!song || !song.id) return '';
  return 'mineradio-song-pref:' + Mineradio.util.songProviderKey(song) + ':' + song.id;
}
// ============================================================
//  Preferences — per-song lyric prefs
function _saveSongPref(song) {
  var key = _songPrefKey(song);
  if (!key) return;
  try {
    var pref = {};
    if (_lyricOffset && _lyricOffset !== 0) pref.lyricOffset = _lyricOffset;
    if (window.audio && window.audio.playbackRate && window.audio.playbackRate !== 1) pref.speed = window.audio.playbackRate;
    if (_lyricSourceIdx > 0) pref.lyricSource = _lyricSources[_lyricSourceIdx];
    if (Object.keys(pref).length) Mineradio.util.storageSet(key, pref);
    else Mineradio.util.storageRemove(key);
  } catch(e) {}
}
function _loadSongPref(song) {
  var key = _songPrefKey(song);
  if (!key) return;
  try {
    var raw = Mineradio.util.storageGet(key);
    if (!raw) return;
    var pref = JSON.parse(raw);
    if (pref.lyricOffset && isFinite(pref.lyricOffset)) {
      _lyricOffset = Math.max(-30, Math.min(30, Number(pref.lyricOffset)));
    }
    if (pref.speed && isFinite(pref.speed) && window.audio) {
      window.audio.playbackRate = Math.max(0.25, Math.min(3, Number(pref.speed)));
    }
    if (pref.lyricSource) {
      var idx = _lyricSources.indexOf(pref.lyricSource);
      if (idx >= 0) _lyricSourceIdx = idx;
      updateMiniSourceButtons();
    }
    updateLyricOffsetVisibility();
    var od = document.getElementById('mini-offset-display');
    if (od) od.textContent = (_lyricOffset > 0 ? '+' : '') + _lyricOffset.toFixed(1) + 's';
    var sd = document.getElementById('mini-speed-display');
    if (sd && window.audio) sd.textContent = window.audio.playbackRate + 'x';
  } catch(e) {}
}
function adjustLyricOffset(delta) {
  if (typeof _lyricOffset === 'undefined') _lyricOffset = 0;
  _lyricOffset = Math.max(-30, Math.min(30, _lyricOffset + delta));
  _lyricOffset = Math.round(_lyricOffset * 100) / 100;
  showLyricOffsetToast();
  var disp = document.getElementById('mini-offset-display');
  if (disp) disp.textContent = (_lyricOffset > 0 ? '+' : '') + _lyricOffset.toFixed(1) + 's';
  var song = currentCoverSong();
  if (song) _saveSongPref(song);
}
function adjustPlaybackSpeed(delta) {
  if (!window.audio) return;
  var rate = (window.audio.playbackRate || 1) + delta;
  rate = Math.max(0.25, Math.min(3, rate));
  rate = Math.round(rate * 100) / 100;
  window.audio.playbackRate = rate;
  var disp = document.getElementById('mini-speed-display');
  if (disp) disp.textContent = rate + 'x';
  var song = currentCoverSong();
  if (song) _saveSongPref(song);
}
function updateMiniSourceButtons() {
  var bar = document.getElementById('mini-source-bar');
  if (!bar) return;
  var curSrc = _lyricSources[_lyricSourceIdx];
  var btns = bar.querySelectorAll('.mini-bar-btn');
  for (var i = 0; i < btns.length; i++) {
    var b = btns[i];
    var ds = b.getAttribute('data-src');
    if (!ds) continue;
    b.classList.toggle('active', ds === curSrc);
  }
}
function updateMiniSourceBar() {
  var bar = document.getElementById('mini-source-bar');
  if (!bar) return;
  var song = currentCoverSong();
  var provider = song ? Mineradio.util.songProviderKey(song) : '';
  bar.classList.toggle('show', provider === 'youtube' || provider === 'local' || (!provider && song));
  updateMiniSourceButtons();
}

// ============================================================

function currentLyricSong() {
  if (window.currentIdx >= 0 && window.playQueue && window.playQueue[window.currentIdx]) return window.playQueue[window.currentIdx];
  return window.currentLocalSong || null;
}
function setOriginalLyricsState(lines, hasNativeKaraoke, timingSource) {
  window.originalLyricsState = { lines: lines || [], hasNativeKaraoke: !!hasNativeKaraoke, timingSource: timingSource || '' };
}
function applyOriginalLyricsState() {
  if (!window.originalLyricsState || !window.originalLyricsState.lines) return;
  window.lyricsLines = window.originalLyricsState.lines;
  window.lyricsHasNativeKaraoke = window.originalLyricsState.hasNativeKaraoke;
  window.lyricsTimingSource = window.originalLyricsState.timingSource || 'fallback';
  if (typeof window.renderLyrics === 'function') window.renderLyrics();
}

// ============================================================
//  Namespace Exports — Mineradio.lyrics
// ============================================================
window.Mineradio = window.Mineradio || {};
Mineradio.lyrics = {
  fetchLyric: fetchLyric,
  currentLyricFallbackText: currentLyricFallbackText,
  isNoLyricText: isNoLyricText,
  withLyricFallback: withLyricFallback,
  lyricTagTimeToSeconds: lyricTagTimeToSeconds,
  finalizeLyricLineDurations: finalizeLyricLineDurations,
  parseLyricText: parseLyricText,
  parseYrcText: parseYrcText,
  _prefetchAdjacent: _prefetchAdjacent,
  _saveLyricOffset: _saveLyricOffset,
  _loadLyricOffset: _loadLyricOffset,
  updateLyricOffsetVisibility: updateLyricOffsetVisibility,
  showLyricOffsetToast: showLyricOffsetToast,
  cycleLyricSource: cycleLyricSource,
  renderLyrics: renderLyrics,
  toggleLyricsPanel: toggleLyricsPanel,
  updateLyricsHighlight: updateLyricsHighlight,
  setLyricSource: setLyricSource,
  _songPrefKey: _songPrefKey,
  _saveSongPref: _saveSongPref,
  _loadSongPref: _loadSongPref,
  adjustLyricOffset: adjustLyricOffset,
  adjustPlaybackSpeed: adjustPlaybackSpeed,
  updateMiniSourceButtons: updateMiniSourceButtons,
  updateMiniSourceBar: updateMiniSourceBar,
  currentLyricSong: currentLyricSong,
  setOriginalLyricsState: setOriginalLyricsState,
  applyOriginalLyricsState: applyOriginalLyricsState
};

