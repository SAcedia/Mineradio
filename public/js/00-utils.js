// 00-utils.js — Pure utility functions (no side effects, no DOM, no localStorage)
// Loaded first, before all other scripts.

window.clamp01 = function(v) {
  return Math.max(0, Math.min(1, v));
};

window.clampRange = function(v, min, max) {
  return Math.max(min, Math.min(max, v));
};

window.songProviderKey = function(song) {
  if (song && (song.provider === 'qq' || song.source === 'qq' || song.type === 'qq')) return 'qq';
  if (song && (song.provider === 'youtube' || song.source === 'youtube' || song.type === 'youtube')) return 'youtube';
  return 'netease';
};

window.escHtml = function(s) {
  var d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
};

window.cloneSong = function(song) {
  return song ? Object.assign({}, song) : null;
};

window.isTypingTarget = function(target) {
  if (!target) return false;
  var tag = String(target.tagName || '').toUpperCase();
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  return !!(target.isContentEditable || (target.closest && target.closest('[contenteditable="true"]')));
};

window.songDurationLabel = function(song) {
  var sec = playbackDurationFromSong(song);
  if (!sec && window.audio && isFinite(window.audio.duration) && window.audio.duration > 0) sec = window.audio.duration;
  if (!sec) return '未知';
  return formatProgramTime(sec);
};

window.songSourceLabel = function(song) {
  if (!song) return '未知';
  if (song.provider === 'qq' || song.source === 'qq' || song.type === 'qq') return 'QQ 音乐';
  if (song.provider === 'youtube' || song.source === 'youtube' || song.type === 'youtube') return 'YouTube';
  if (song.type === 'local') return '本地上传';
  if (song.type === 'podcast' || song.source === 'podcast') return '网易云播客';
  return '网易云音乐';
};

window.detailRow = function(label, value) {
  return '<div class="detail-row"><span>' + label + '</span><span>' + value + '</span></div>';
};
