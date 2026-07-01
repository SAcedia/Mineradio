// ============================================================
//  歌词 (extracted from js/audio/lyrics.js)
// ============================================================
window.fetchLyric = async function(songOrId, token, preferSource) {
  try {
    // 没有指定 source 时（正常切歌），重置为默认源
    if (!preferSource) {
      _lyricSourceIdx = 0;
      var srcBtn = document.getElementById('lyric-source-btn');
      if (srcBtn) srcBtn.textContent = '源·' + (window._lyricSourceLabels[window._lyricSources[0]] || 'A');
    }
    var song = (songOrId && typeof songOrId === 'object') ? songOrId : null;
    var provider = window.songProviderKey(song);
    var endpoint;
    if (provider === 'qq') {
      var mid = song.mid || song.songmid || song.id || '';
      var qqId = song.qqId || (/^\d+$/.test(String(song.id || '')) ? song.id : '');
      endpoint = '/api/qq/lyric?mid=' + encodeURIComponent(window.mid) + '&id=' + encodeURIComponent(qqId);
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
      var cached = localStorage.getItem(cacheKey);
      if (cached) {
        var parsed = JSON.parse(cached);
        if (parsed && parsed.ts && Date.now() - parsed.ts < 7 * 86400000) {
          r = parsed.data;
        }
      }
    } catch (e) {}
    if (!r) {
      r = await window.apiJson(endpoint);
      try { localStorage.setItem(cacheKey, JSON.stringify({ ts: Date.now(), data: r })); } catch (e) {}
    }
    if (token !== window.trackSwitchToken) return;
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
    window.setOriginalLyricsState(lines, hasNativeKaraoke, timingSource);
    window.applyPreferredLyricsForCurrent(true);
    // 串烧检测提示
    if (song && /串烧|medley|mix|mashup|连续|remix/i.test(song.name || '')) {
      window.showToast('串烧歌曲，歌词可能不匹配');
    }
  } catch (e) {
    if (token !== window.trackSwitchToken) return;
    var fallbackLines = withLyricFallback([]);
    window.setOriginalLyricsState(fallbackLines, false, 'fallback');
    window.applyPreferredLyricsForCurrent(true);
  }
}
window.currentLyricFallbackText = function() {
  var song = window.currentLyricSong() || {};
  var title = (song.name || document.getElementById('thumb-title').textContent || '').trim();
  var artist = (song.artist || document.getElementById('thumb-artist').textContent || '').trim();
  if (!title) return '';
  return artist ? title + ' - ' + artist : title;
}
window.isNoLyricText = function(text) {
  var compact = String(text || '').replace(/\s+/g, '').replace(/[，,。.!！?？、~～]/g, '');
  return !compact ||
    compact === '纯音乐请欣赏' ||
    compact === '暂无歌词' ||
    compact === '暂无歌词敬请期待' ||
    compact === '此歌曲为没有填词的纯音乐请您欣赏';
}
window.withLyricFallback = function(lines) {
  lines = Array.isArray(lines) ? lines.filter(function(line){ return line && String(line.text || '').trim(); }) : [];
  if (lines.length && !lines.every(function(line){ return isNoLyricText(line.text); })) return lines;
  var text = currentLyricFallbackText();
  return text ? [{ t:0, text:text, duration:9999, charCount:Math.max(1, text.length), fallback:true }] : [];
}
window.lyricTagTimeToSeconds = function(min, sec, frac) {
  var t = (parseInt(min, 10) || 0) * 60 + (parseInt(sec, 10) || 0);
  if (frac) t += (parseInt(frac, 10) || 0) / Math.pow(10, Math.min(3, frac.length));
  return t;
}
window.finalizeLyricLineDurations = function(lines) {
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
window.parseLyricText = function(text) {
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
window.parseYrcText = function(text) {
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
window._lyricOffsetToastTimer = null;
window._saveLyricOffset = function() {
  try { localStorage.setItem('mineradio-lyric-offset', String(window._lyricOffset || 0)); } catch (e) {}
}
window._loadLyricOffset = function() {
  try {
    var v = parseFloat(localStorage.getItem('mineradio-lyric-offset'));
    if (isFinite(v)) _lyricOffset = Math.max(-30, Math.min(30, v));
  } catch (e) {}
}
window.updateLyricOffsetVisibility = function() {
  // 只在 YouTube 歌曲 + 歌词开启时显示
  var song = window.playQueue && window.currentIdx >= 0 ? window.playQueue[window.currentIdx] : null;
  var isYT = song && window.songProviderKey(song) === 'youtube';
  var lyricsOn = !!(window.fx && window.fx.particleLyrics);
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
window.showLyricOffsetToast = function() {
  if (typeof _lyricOffset === 'undefined') _lyricOffset = 0;
  var val = document.getElementById('lyric-offset-value');
  var rst = document.getElementById('lyric-offset-btn-reset');
  if (val) val.textContent = (window._lyricOffset > 0 ? '+' : '') + window._lyricOffset.toFixed(1);
  if (rst) rst.style.display = _lyricOffset === 0 ? 'none' : '';
  window.showToast('歌词偏移 ' + (window._lyricOffset > 0 ? '+' : '') + window._lyricOffset.toFixed(1) + 's');
  window._saveLyricOffset();
  window.updateLyricOffsetVisibility();
  clearTimeout(window._lyricOffsetToastTimer);
  if (_lyricOffset === 0) return;
  _lyricOffsetToastTimer = setTimeout(function(){}, 1500);
}
window._lyricSources = ['lrclib', 'music-kit', 'netease', 'kugou', 'yt-captions'];
window._lyricSourceLabels = { 'lrclib': 'LRC', 'music-kit': 'YT', 'netease': '网', 'kugou': '酷', 'yt-captions': 'CC' };
window._lyricSourceIdx = 0;
window.cycleLyricSource = function() {
  _lyricSourceIdx = (window._lyricSourceIdx + 1) % window._lyricSources.length;
  var src = window._lyricSources[window._lyricSourceIdx];
  var btn = document.getElementById('lyric-source-btn');
  if (btn) btn.textContent = '源·' + (window._lyricSourceLabels[src] || src);
  // 重新获取当前歌曲歌词
  var song = window.playQueue && window.currentIdx >= 0 ? window.playQueue[window.currentIdx] : null;
  if (song && window.songProviderKey(song) === 'youtube') {
    window.fetchLyric(song, window.trackSwitchToken, src);
  }
  window.showToast('歌词来源: ' + (window._lyricSourceLabels[src] || src));
}
window.renderLyrics = function() {
  // v8: 歌词渲染由 stageLyrics 在每帧 tickLyricsParticles 里推动
  clearStageLyrics();
}
window.toggleLyricsPanel = function(force) {
  if (force === false) window.fx.particleLyrics = false;
  else if (force === true) window.fx.particleLyrics = true;
  else window.fx.particleLyrics = !window.fx.particleLyrics;
  if (window.fx.particleLyrics) {
    createLyricsParticles();
    window.showToast('歌词已开启');
  } else {
    clearStageLyrics();
    window.showToast('歌词已关闭');
  }
  lyricsVisible = window.fx.particleLyrics;
  window.updateLyricOffsetVisibility();
}
window.updateLyricsHighlight = function() {
 /* v8: 由 tickLyricsParticles 接管 */ }

window.setLyricSource = function(source) {
  if (source === 'auto') {
    _lyricSourceIdx = 0;
  } else {
    var idx = window._lyricSources.indexOf(window.source);
    if (idx < 0) return;
    _lyricSourceIdx = idx;
  }
  var curSrc = window._lyricSources[window._lyricSourceIdx];
  var btn = document.getElementById('lyric-source-btn');
  if (btn) btn.textContent = '源·' + (window._lyricSourceLabels[curSrc] || curSrc);
  window.updateMiniSourceButtons();
  var cur = window.currentCoverSong();
  if (cur) {
    window.fetchLyric(cur, window.trackSwitchToken, curSrc);
  }
  window.showToast('歌词源: ' + (source === 'auto' ? '自动' : (window._lyricSourceLabels[window.source] || window.source)));
}
window._songPrefKey = function(song) {
  if (!song || !song.id) return '';
  return 'mineradio-song-pref:' + window.songProviderKey(song) + ':' + song.id;
}
window._saveSongPref = function(song) {
  var key = _songPrefKey(song);
  if (!key) return;
  try {
    var pref = {};
    if (window._lyricOffset && window._lyricOffset !== 0) pref.lyricOffset = window._lyricOffset;
    if (window.audio && window.audio.playbackRate && window.audio.playbackRate !== 1) pref.speed = window.audio.playbackRate;
    if (window._lyricSourceIdx > 0) pref.lyricSource = window._lyricSources[window._lyricSourceIdx];
    if (Object.keys(pref).length) localStorage.setItem(key, JSON.stringify(pref));
    else localStorage.removeItem(key);
  } catch(e) {}
}
window._loadSongPref = function(song) {
  var key = _songPrefKey(song);
  if (!key) return;
  try {
    var raw = localStorage.getItem(key);
    if (!raw) return;
    var pref = JSON.parse(raw);
    if (pref.lyricOffset && isFinite(pref.lyricOffset)) {
      _lyricOffset = Math.max(-30, Math.min(30, Number(pref.lyricOffset)));
    }
    if (pref.speed && isFinite(pref.speed) && window.audio) {
      window.audio.playbackRate = Math.max(0.25, Math.min(3, Number(pref.speed)));
    }
    if (pref.lyricSource) {
      var idx = window._lyricSources.indexOf(pref.lyricSource);
      if (idx >= 0) _lyricSourceIdx = idx;
      window.updateMiniSourceButtons();
    }
    window.updateLyricOffsetVisibility();
    var od = document.getElementById('mini-offset-display');
    if (od) od.textContent = (window._lyricOffset > 0 ? '+' : '') + window._lyricOffset.toFixed(1) + 's';
    var sd = document.getElementById('mini-speed-display');
    if (sd && window.audio) sd.textContent = window.audio.playbackRate + 'x';
  } catch(e) {}
}
window.adjustLyricOffset = function(delta) {
  if (typeof _lyricOffset === 'undefined') _lyricOffset = 0;
  _lyricOffset = Math.max(-30, Math.min(30, window._lyricOffset + delta));
  _lyricOffset = Math.round(window._lyricOffset * 100) / 100;
  window.showLyricOffsetToast();
  var disp = document.getElementById('mini-offset-display');
  if (disp) disp.textContent = (window._lyricOffset > 0 ? '+' : '') + window._lyricOffset.toFixed(1) + 's';
  var song = window.currentCoverSong();
  if (song) _saveSongPref(song);
}
window.adjustPlaybackSpeed = function(delta) {
  if (!window.audio) return;
  var rate = (window.audio.playbackRate || 1) + delta;
  rate = Math.max(0.25, Math.min(3, rate));
  rate = Math.round(rate * 100) / 100;
  window.audio.playbackRate = rate;
  var disp = document.getElementById('mini-speed-display');
  if (disp) disp.textContent = rate + 'x';
  var song = window.currentCoverSong();
  if (song) _saveSongPref(song);
}
window.updateMiniSourceButtons = function() {
  var bar = document.getElementById('mini-source-bar');
  if (!bar) return;
  var curSrc = window._lyricSources[window._lyricSourceIdx];
  var btns = bar.querySelectorAll('.mini-bar-btn');
  for (var i = 0; i < btns.length; i++) {
    var b = btns[i];
    var ds = b.getAttribute('data-src');
    if (!ds) continue;
    b.classList.toggle('active', ds === curSrc);
  }
}
window.updateMiniSourceBar = function() {
  var bar = document.getElementById('mini-source-bar');
  if (!bar) return;
  var song = window.currentCoverSong();
  var provider = song ? window.songProviderKey(song) : '';
  bar.classList.toggle('show', provider === 'youtube' || provider === 'local' || (!provider && song));
  window.updateMiniSourceButtons();
}
