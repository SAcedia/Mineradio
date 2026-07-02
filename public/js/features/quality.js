// 10-quality.js — Playback quality management
// Extracted from core/api-helper.js

function normalizePlaybackQuality(value) {
  value = String(value || '').toLowerCase();
  if (value === 'jymaster' || value === 'master' || value === 'svip') return 'jymaster';
  if (value === 'hires' || value === 'hi-res' || value === 'highres' || value === 'highest') return 'hires';
  if (value === 'lossless' || value === 'flac' || value === 'sq') return 'lossless';
  if (value === 'exhigh' || value === 'high' || value === '320k' || value === 'hq') return 'exhigh';
  if (value === 'standard' || value === 'normal' || value === 'std') return 'standard';
  return 'hires';
}
function playbackQualityLabel(value) {
  value = normalizePlaybackQuality(value);
  if (value === 'jymaster') return '超清母带';
  if (value === 'hires') return '高清臻音';
  if (value === 'lossless') return '无损';
  if (value === 'exhigh') return '极高';
  if (value === 'standard') return '标准';
  return '高清臻音';
}
function playbackQualityShortLabel(value) {
  value = normalizePlaybackQuality(value);
  if (value === 'jymaster') return '母带';
  if (value === 'hires') return '臻音';
  if (value === 'lossless') return 'SQ';
  if (value === 'exhigh') return 'HQ';
  if (value === 'standard') return 'STD';
  return '臻音';
}
function playbackQualityRank(value) {
  value = normalizePlaybackQuality(value);
  if (value === 'jymaster') return 5;
  if (value === 'hires') return 4;
  if (value === 'lossless') return 3;
  if (value === 'exhigh') return 2;
  if (value === 'standard') return 1;
  return 4;
}
function playbackQualityWasDowngraded(requested, resolved) {
  return playbackQualityRank(resolved) < playbackQualityRank(requested);
}
function playbackBitrateLabel(br) {
  br = Number(br) || 0;
  if (!br) return '';
  if (br >= 1000000) return (br / 1000000).toFixed(br >= 2000000 ? 1 : 2).replace(/\.0+$/, '') + ' Mbps';
  return Math.round(br / 1000) + ' kbps';
}
function playbackResolvedQualityText(data) {
  data = data || {};
  var label = playbackQualityLabel(data.level || data.quality || playbackQuality);
  var br = playbackBitrateLabel(data.br);
  return br ? (label + ' · ' + br) : label;
}
function readPlaybackQualityPreference() {
  try {
    return normalizePlaybackQuality(Mineradio.util.storageGet(PLAYBACK_QUALITY_STORE_KEY) || 'hires');
  } catch (e) {
    return 'hires';
  }
}
function savePlaybackQualityPreference() {
  try { Mineradio.util.storageSet(PLAYBACK_QUALITY_STORE_KEY, playbackQuality); } catch (e) {}
}
function updatePlaybackQualityUi() {
  var label = document.getElementById('quality-btn-label');
  var btn = document.getElementById('quality-btn');
  var wrap = document.getElementById('quality-control');
  var song = currentCoverSong();
  var isYT = song && Mineradio.util.songProviderKey(song) === 'youtube';
  if (wrap) wrap.style.display = isYT ? 'none' : '';
  if (isYT) return;
  var canUseSvip = hasProviderSvip('netease', loginStatus);
  var displayQuality = playbackQuality === 'jymaster' && !canUseSvip ? 'hires' : playbackQuality;
  if (label) label.textContent = playbackQualityShortLabel(displayQuality);
  if (btn) btn.title = playbackQuality === 'jymaster' && !canUseSvip
    ? '音质: ' + playbackQualityLabel(displayQuality) + ' · 超清母带需网易云 SVIP'
    : '音质: ' + playbackQualityLabel(displayQuality);
  document.querySelectorAll('.quality-option').forEach(function(option){
    var q = normalizePlaybackQuality(option.dataset.quality);
    var locked = option.dataset.svip === '1' && !canUseSvip;
    option.classList.toggle('active', q === displayQuality);
    option.classList.toggle('locked', locked);
    option.disabled = locked;
    option.title = locked ? '需要网易云 SVIP 账号' : playbackQualityLabel(q);
  });
}
function setPlaybackQuality(value) {
  var next = normalizePlaybackQuality(value);
  if (next === 'jymaster' && !hasProviderSvip('netease', loginStatus)) {
    showToast(hasPlatformLogin('netease') ? '超清母带需要网易云 SVIP' : '登录网易云 SVIP 后可用超清母带');
    if (!hasPlatformLogin('netease')) openProviderLogin('netease');
    return;
  }
  playbackQuality = next;
  savePlaybackQualityPreference();
  updatePlaybackQualityUi();
  var wrap = document.getElementById('quality-control');
  if (wrap) wrap.classList.remove('open');
  applyPlaybackQualityToCurrentTrack(next);
}
function canReloadCurrentTrackForQuality() {
  if (currentIdx < 0 || currentIdx >= playQueue.length) return false;
  if (!audio || !audio.src || audio.paused || audio.ended) return false;
  var song = playQueue[currentIdx];
  if (!song || song.type === 'local' || song.source === 'local') return false;
  return Mineradio.util.songProviderKey(song) === 'netease' || Mineradio.util.songProviderKey(song) === 'qq';
}
function applyPlaybackQualityToCurrentTrack(nextQuality) {
  var label = playbackQualityLabel(nextQuality || playbackQuality);
  if (!canReloadCurrentTrackForQuality()) {
    showToast('音质偏好: ' + label + ' · 下次播放生效');
    return;
  }
  var resumeAt = audio && isFinite(audio.currentTime) ? audio.currentTime : 0;
  showToast('正在切换音质: ' + label);
  Promise.resolve(playQueueAt(currentIdx, {
    qualityOverride: nextQuality || playbackQuality,
    qualitySwitch: true,
    resumeAt: resumeAt,
    preserveHomeState: true,
  })).catch(function(e){
    console.warn('[QualitySwitch]', e);
    showToast('音质切换失败，已保留偏好');
  }).finally(forcePlaybackControlsInteractive);
}
function toggleQualityPanel(e) {
  if (e) e.stopPropagation();
  var wrap = document.getElementById('quality-control');
  if (wrap) wrap.classList.toggle('open');
}
function bindQualityControl() {
  var wrap = document.getElementById('quality-control');
  if (wrap) {
    wrap.addEventListener('mouseenter', function(){ wrap.classList.add('open'); });
    wrap.addEventListener('mouseleave', function(){ setTimeout(function(){ if (!wrap.matches(':hover')) wrap.classList.remove('open'); }, 260); });
  }
  document.addEventListener('click', function(e){
    if (wrap && !wrap.contains(e.target)) wrap.classList.remove('open');
  });
  updatePlaybackQualityUi();
}
function isTypingTarget(target) {
  if (!target) return false;
  var tag = String(target.tagName || '').toUpperCase();
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  return !!(target.isContentEditable || (target.closest && target.closest('[contenteditable="true"]')));
}
// loadListenStatsState is in 19-listen-stats.js

// ============================================================
//  Namespace Exports — Mineradio.quality
// ============================================================
window.Mineradio = window.Mineradio || {};
Mineradio.quality = {
  normalizePlaybackQuality: normalizePlaybackQuality,
  playbackQualityLabel: playbackQualityLabel,
  playbackQualityShortLabel: playbackQualityShortLabel,
  playbackQualityRank: playbackQualityRank,
  playbackQualityWasDowngraded: playbackQualityWasDowngraded,
  playbackBitrateLabel: playbackBitrateLabel,
  playbackResolvedQualityText: playbackResolvedQualityText,
  readPlaybackQualityPreference: readPlaybackQualityPreference,
  savePlaybackQualityPreference: savePlaybackQualityPreference,
  updatePlaybackQualityUi: updatePlaybackQualityUi,
  setPlaybackQuality: setPlaybackQuality,
  canReloadCurrentTrackForQuality: canReloadCurrentTrackForQuality,
  applyPlaybackQualityToCurrentTrack: applyPlaybackQualityToCurrentTrack,
  toggleQualityPanel: toggleQualityPanel,
  bindQualityControl: bindQualityControl,
  isTypingTarget: isTypingTarget
};
