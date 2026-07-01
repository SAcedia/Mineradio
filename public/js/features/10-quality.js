// ============================================================
//  音质管理
// ============================================================
function hasProviderSvip(provider, status) {
  return provider === 'netease' && providerVipLevel(provider, status) === 'svip';
}
function updatePlaybackQualityUi() {
  var label = document.getElementById('quality-btn-label');
  var btn = document.getElementById('quality-btn');
  var wrap = document.getElementById('quality-control');
  var song = window.currentCoverSong();
  var isYT = song && window.songProviderKey(song) === 'youtube';
  if (wrap) wrap.style.display = isYT ? 'none' : '';
  if (isYT) return;
  var canUseSvip = hasProviderSvip('netease', window.loginStatus);
  var displayQuality = playbackQuality === 'jymaster' && !canUseSvip ? 'hires' : window.playbackQuality;
  if (label) label.textContent = window.playbackQualityShortLabel(displayQuality);
  if (btn) btn.title = playbackQuality === 'jymaster' && !canUseSvip
    ? '音质: ' + window.playbackQualityLabel(displayQuality) + ' · 超清母带需网易云 SVIP'
    : '音质: ' + window.playbackQualityLabel(displayQuality);
  document.querySelectorAll('.quality-option').forEach(function(option){
    var q = window.normalizePlaybackQuality(option.dataset.quality);
    var locked = option.dataset.svip === '1' && !canUseSvip;
    option.classList.toggle('active', q === displayQuality);
    option.classList.toggle('locked', locked);
    option.disabled = locked;
    option.title = locked ? '需要网易云 SVIP 账号' : window.playbackQualityLabel(q);
  });
}
function setPlaybackQuality(value) {
  var next = window.normalizePlaybackQuality(value);
  if (next === 'jymaster' && !hasProviderSvip('netease', window.loginStatus)) {
    window.showToast(window.hasPlatformLogin('netease') ? '超清母带需要网易云 SVIP' : '登录网易云 SVIP 后可用超清母带');
    if (!window.hasPlatformLogin('netease')) window.openProviderLogin('netease');
    return;
  }
  playbackQuality = next;
  window.savePlaybackQualityPreference();
  window.updatePlaybackQualityUi();
  var wrap = document.getElementById('quality-control');
  if (wrap) wrap.classList.remove('open');
  window.applyPlaybackQualityToCurrentTrack(next);
}
function canReloadCurrentTrackForQuality() {
  if (window.currentIdx < 0 || window.currentIdx >= window.playQueue.length) return false;
  if (!window.audio || !window.audio.src || window.audio.paused || window.audio.ended) return false;
  var song = window.playQueue[window.currentIdx];
  if (!song || song.type === 'local' || song.source === 'local') return false;
  return window.songProviderKey(song) === 'netease' || window.songProviderKey(song) === 'qq';
}
function applyPlaybackQualityToCurrentTrack(nextQuality) {
  var label = window.playbackQualityLabel(nextQuality || window.playbackQuality);
  if (!window.canReloadCurrentTrackForQuality()) {
    window.showToast('音质偏好: ' + label + ' · 下次播放生效');
    return;
  }
  var resumeAt = window.audio && isFinite(window.audio.currentTime) ? window.audio.currentTime : 0;
  window.showToast('正在切换音质: ' + label);
  Promise.resolve(window.playQueueAt(window.currentIdx, {
    qualityOverride: nextQuality || window.playbackQuality,
    qualitySwitch: true,
    resumeAt: resumeAt,
    preserveHomeState: true,
  })).catch(function(e){
    console.warn('[QualitySwitch]', e);
    window.showToast('音质切换失败，已保留偏好');
  }).finally(window.forcePlaybackControlsInteractive);
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
  window.updatePlaybackQualityUi();
}
