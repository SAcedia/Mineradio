// ============================================================
//  播放队列
// ============================================================
window.queueSong = function(song, opts) {
  opts = opts || {};
  if (!song) return -1;
  var cloned = window.cloneSong(song);
  var insertAt = window.playQueue.length;
  if (opts.position === 'next') {
    var key = queueItemKey(cloned);
    var existing = -1;
    if (key) {
      for (var i = 0; i < window.playQueue.length; i++) {
        if (queueItemKey(window.playQueue[i]) === key) { existing = i; break; }
      }
    }
    if (existing === window.currentIdx) return window.currentIdx;
    if (existing >= 0) {
      cloned = window.playQueue.splice(existing, 1)[0];
      if (window.currentIdx >= 0 && existing < window.currentIdx) window.currentIdx -= 1;
    }
    var hasCurrent = window.currentIdx >= 0 && window.currentIdx < window.playQueue.length;
    insertAt = hasCurrent ? Math.min(window.playQueue.length, window.currentIdx + 1) : window.playQueue.length;
    window.playQueue.splice(insertAt, 0, cloned);
  } else {
    window.playQueue.push(cloned);
    insertAt = window.playQueue.length - 1;
  }
  window.safeRenderQueuePanel('queue-song');
  window.safeShelfRebuild('queue-song');
  return insertAt;
}
window.queueSongNext = function(song) {
  return window.queueSong(song, { position: 'next' });
}
window.safePlaybackStep = function(label, fn) {
  try {
    return fn();
  } catch (err) {
    console.warn('[PlaybackSetupStep]', label, err);
    return null;
  }
}
window.skipFailedQueueItem = function(idx, token, message) {
  window.hideLoading();
  if (token !== window.trackSwitchToken) return;
  markQueueItemPlaybackFailed(idx);
  if (window.playQueue.length <= 1) {
    window.showSourceFallbackNotice('没有可跳过的下一首', message || '当前歌曲不可播放，队列里没有其他歌曲。');
    return;
  }
  var nextIdx = nextUnblockedQueueIndex(idx);
  if (nextIdx < 0) {
    window.showSourceFallbackNotice('队列暂时没有可播歌曲', '已尝试绕开受限歌曲，当前队列没有新的可播放项。');
    return;
  }
  window.showSourceFallbackNotice('已跳过受限歌曲', message || '未找到同名同歌手的另一个平台版本，正在播放下一首。');
  currentIdx = nextIdx;
  window.playQueueAt(nextIdx, { fallbackDepth: 0 });
}
window.tryAutoPlaybackFallback = async function(song, data, idx, token, opts) {
  opts = opts || {};
  if (opts.fallbackDepth > 0) {
    skipFailedQueueItem(idx, token, '自动换源后的版本仍不可播，正在播放下一首。');
    return true;
  }
  if (!song || song.type === 'local' || song.type === 'podcast' || song.source === 'podcast') return false;
  var restriction = (data && data.restriction) || {};
  var category = (data && data.reason) || restriction.category || '';
  var fromLabel = playbackProviderLabel(song);
  var targetLabel = alternatePlaybackProvider(song) === 'qq' ? 'QQ 音乐' : '网易云';
  window.showSourceFallbackNotice('正在自动换源', fromLabel + ' 当前不可播，正在查找 ' + targetLabel + ' 的同名同歌手版本。');
  try {
    var alternate = await searchAlternatePlatformSong(song);
    if (token !== window.trackSwitchToken) return true;
    if (!alternate) {
      if (category === 'login_required') return false;
      skipFailedQueueItem(idx, token, '没有找到同名同歌手的 ' + targetLabel + ' 版本，正在播放下一首。');
      return true;
    }
    alternate.autoFallbackFrom = window.songProviderKey(song);
    window.playQueue[idx] = window.hydrateCustomCover(alternate);
    window.safeRenderQueuePanel('window.source-fallback', { scrollCurrent: window.miniQueueOpen });
    window.safeShelfRebuild('window.source-fallback');
    window.showSourceFallbackNotice('已自动切换音源', (song.name || '当前歌曲') + ' 已从 ' + fromLabel + ' 切到 ' + targetLabel + '。');
    await window.playQueueAt(idx, { fallbackDepth: 1 });
    return true;
  } catch (e) {
    if (token !== window.trackSwitchToken) return true;
    skipFailedQueueItem(idx, token, '自动换源搜索失败，正在播放下一首。');
    return true;
  }
}
window.handlePlaybackUnavailable = function(song, data) {
  window.hideLoading();
  window.forcePlaybackControlsInteractive();
  var provider = playbackLoginProvider(song);
  var restriction = (data && data.restriction) || {};
  var category = (data && data.reason) || restriction.category || '';
  window.showToast(playbackRestrictionMessage(song, data));
  if (category === 'login_required') {
    setTimeout(function(){
      var modal = document.getElementById('login-modal');
      if (!modal || modal.classList.contains('show')) return;
      window.openProviderLogin(provider);
    }, 520);
  }
}
window.closeSourceFallbackNotice = function() {
  var notice = document.getElementById('source-fallback-notice');
  if (sourceFallbackNoticeTimer) { clearTimeout(sourceFallbackNoticeTimer); sourceFallbackNoticeTimer = null; }
  if (notice) notice.classList.remove('show');
}
window.showSourceFallbackNotice = function(title, body) {
  var notice = document.getElementById('source-fallback-notice');
  var titleEl = document.getElementById('source-fallback-title');
  var bodyEl = document.getElementById('source-fallback-body');
  if (!notice || !titleEl || !bodyEl) return;
  titleEl.textContent = title || '自动换源';
  bodyEl.textContent = body || '';
  notice.classList.add('show');
  if (sourceFallbackNoticeTimer) clearTimeout(sourceFallbackNoticeTimer);
  sourceFallbackNoticeTimer = setTimeout(window.closeSourceFallbackNotice, 5000);
}
window.playQueueAt = async function(idx, opts) {
  opts = opts || {};
  if (idx < 0 || idx >= window.playQueue.length) return;
  window.markRenderInteraction('track-switch', 1500);
  var playPhase = 'start';
  function markPlayPhase(name) { playPhase = name; }
  try {
  markPlayPhase('session-finalize');
  window.safePlaybackStep('session-finalize', function(){ window.finalizeListenSession(false); });
  homeForcedOpen = false;
  if (!opts.preserveHomeState) homeSuppressed = false;
  currentIdx = idx;
  window.trackSwitchToken++;
  markPlayPhase('cancel-previous-track');
  window.cancelBeatAnalysisTimer();
  window.cancelBeatPrefetchTimer();
  if (window.localBeatAnalysis.active) window.cancelLocalBeatAnalysis();
  window.closeGsapModal(document.getElementById('local-beat-modal'));
  window.beatMapToken++;
  var token = window.trackSwitchToken;
  var firstVisualPlay = !window.firstPlayDone;
  markPlayPhase('track-setup');
  var song = window.safePlaybackStep('hydrate-song', function(){ return window.hydrateCustomCover(window.playQueue[idx]); }) || window.playQueue[idx];
  window.playQueue[idx] = song;
  var playbackContext = opts.context || (song && song.radioContext) || null;
  activeRadioContext = playbackContext || null;
  window.safeRenderQueuePanel('play-queue-at-switch', { scrollCurrent: window.miniQueueOpen });
  window.safePlaybackStep('shelf-preview-suppress', suppressShelfPreviewForPlaybackSwitch);
  window.pauseCurrentAudioForTrackSwitch();
  var bmKey = window.safePlaybackStep('beatmap-key', function(){ return window.beatMapSongKey(song); }) || '';
  var podcastDjMode = !!window.safePlaybackStep('podcast-mode', function(){ return isPodcastSong(song); });
  window.safePlaybackStep('dj-mode', function(){ setDjModeActive(podcastDjMode, song); });
  window.safePlaybackStep('visual-switch', switchPlaybackVisualToEmily);
  currentLocalSong = null;
  window.safePlaybackStep('cover-button', window.updateCustomCoverButton);
  window.safePlaybackStep('like-buttons', function(){ window.updateLikeButtons(song); });
  window.safePlaybackStep('mini-source-bar', function(){ if (typeof updateMiniSourceBar === 'function') window.updateMiniSourceBar(); });
  window.safePlaybackStep('like-status', function(){ window.syncLikeStatusForSong(song); });
  window.safePlaybackStep('quality-ui', window.updatePlaybackQualityUi);
  window.safePlaybackStep('cinema-track-profile', function(){ resetCinemaTrackProfile(song); });
  window.safePlaybackStep('empty-home', function(){ if (!opts.preserveHomeState) updateEmptyHomeVisibility(); });
  window.safePlaybackStep('track-ui', function(){
    document.getElementById('hint').classList.add('hidden');
    document.getElementById('thumb-title').textContent = song.name;
    document.getElementById('thumb-artist').textContent = song.artist;
    updateControlTrackInfo(song);
    document.getElementById('thumb-wrap').classList.add('visible');
  });
  markPlayPhase('lyric-prep');
  window.safePlaybackStep('lyric-prep', function(){
    var initialLyricLines = withLyricFallback([]);
    window.setOriginalLyricsState(initialLyricLines, false, 'fallback');
    window.applyPreferredLyricsForCurrent(true);
  });
  window.safePlaybackStep('lyric-offset-vis', function(){ window.updateLyricOffsetVisibility(); window._loadLyricOffset(); if (typeof _loadSongPref === 'function') _loadSongPref(song); });
  markPlayPhase('cover-load');
  window.safePlaybackStep('cover-load', function(){
    var customCover = window.getCustomCoverForSong(song);
    var coverOpts = { trackToken: token, deferHeavy: true, delay: firstVisualPlay ? 380 : 680, timeout: firstVisualPlay ? 1400 : 1900 };
    if (customCover) applyCoverDataUrl(customCover, coverOpts);
    else loadCoverFromUrl(song.cover ? window.coverUrlWithSize(song.cover, 400) : '', coverOpts);
  });
  window.safePlaybackStep('trial-banner-reset', function(){ document.getElementById('trial-banner').classList.remove('show'); });
  window.safePlaybackStep('show-loading', window.showLoading);
  lyricSunEnergy = 0; lyricSunTarget = 0; lyricSunHold = 0; lyricSunAvg = 0; lyricSunPeak = 0.55;
  if (firstVisualPlay) {
    window.safePlaybackStep('first-visual-alpha', function(){
      firstPlayDone = true;
      tweenParticleAlpha(window.uniforms.uAlpha.value || 0, 1.0, 220);
    });
  }
  try {
    markPlayPhase('window.source-url');
    var isQQPlayback = window.songProviderKey(song) === 'qq';
    var isYouTubePlayback = window.songProviderKey(song) === 'youtube';
    var requestedQuality = window.normalizePlaybackQuality(opts.qualityOverride || window.playbackQuality);
    if (!isQQPlayback && requestedQuality === 'jymaster' && !hasProviderSvip('netease', window.loginStatus)) requestedQuality = 'hires';
    if (isQQPlayback && qqPlaybackQualityCeiling && (requestedQuality === 'jymaster' || requestedQuality === 'hires' || requestedQuality === 'lossless')) {
      requestedQuality = qqPlaybackQualityCeiling;
    }
    var qualityParam = '&quality=' + encodeURIComponent(requestedQuality);
    var cacheKey = window._cacheKeyForSong(song);
    var cachedUrl = window._audioUrlCache[cacheKey];
    var data;
    if (cachedUrl) {
      data = { url: cachedUrl };
      var prefetched = window._prefetchAudioEls[cacheKey];
      if (prefetched) {
        try { delete window._prefetchAudioEls[cacheKey]; } catch(e) {}
      }
    } else {
      if (isYouTubePlayback) {
        data = await window.youtubeSongUrl(song.id, requestedQuality);
      } else if (isQQPlayback) {
        data = await window.qqSongUrl(song, requestedQuality);
      } else {
        data = await window.neteaseSongUrl(song.id, requestedQuality);
      }
    }
    if (token !== window.trackSwitchToken) return;
    if (!data.url) {
      if (isQQPlayback && await retryQQPlaybackWithCompatibleQuality(song, idx, token, opts, data, requestedQuality)) return;
      if (await tryAutoPlaybackFallback(song, data, idx, token, opts)) return;
      handlePlaybackUnavailable(song, data);
      return;
    }
    var resolvedQualityText = window.playbackResolvedQualityText(data);
    if (!isQQPlayback && window.playbackQualityWasDowngraded(requestedQuality, data.level)) {
      window.showSourceFallbackNotice('网易云音质自动降级', '请求 ' + window.playbackQualityLabel(requestedQuality) + '，实际播放 ' + resolvedQualityText + '。');
    } else if (opts.qualitySwitch) {
      window.showSourceFallbackNotice('音质已切换', '实际播放: ' + resolvedQualityText + '。');
    }
    if (data.trial) {
      var txt;
      if (data.loggedIn && data.vipLevel === 'svip') txt = '此歌曲需要单曲、专辑购买或更高权限';
      else if (data.loggedIn && data.vipLevel === 'vip') txt = '此歌曲需要 SVIP 或购买 · 当前仅播放试听片段';
      else if (data.loggedIn) txt = '此歌曲需 VIP · 当前仅播放试听片段';
      else txt = '当前未登录 · 仅播放试听片段';
      document.getElementById('trial-text').textContent = txt;
      var trialLoginBtn = document.getElementById('trial-login-btn');
      if (trialLoginBtn) {
        trialLoginBtn.style.display = data.loggedIn ? 'none' : '';
        trialLoginBtn.onclick = function(){ window.openProviderLogin('netease'); };
      }
      document.getElementById('trial-banner').classList.add('show');
    }
    markPlayPhase('window.audio-element');
    if (!window.audio) { audio = new Audio(); window.audio.crossOrigin = 'anonymous'; }
    else {
      window.audioFadeSerial++;
      clearAudioFadeTimers();
      window.audio.pause();
    }
    bindPlaybackProgressEvents(window.audio);
    applyVolumeToAudio();
    var proxyAudioUrl = '/api/window.audio?url=' + encodeURIComponent(data.url);
    window.audio.src = proxyAudioUrl;
    updatePlaybackProgressUi();
    window.audio.onended = function(){
      if (token !== window.trackSwitchToken) return;
      window.finalizeListenSession(true);
      if (playMode === 'single') setTimeout(function(){ window.playQueueAt(window.currentIdx, { autoRepeat: true }); }, 0);
      else setTimeout(window.nextTrack, 0);
    };
    scheduleAudioResumePosition(window.audio, opts.resumeAt, token);
    window.audio.load();
    markPlayPhase('visual-prep');
    try {
    currentBeatMap = null;
    beatMapNextIdx = 0;
    resetAudioVisualState();
    resetBeatCameraSync(0);
    window.cancelBeatAnalysisTimer();
    window.beatMapToken++;
    var bmTok = window.beatMapToken;
    if (podcastDjMode) {
      djBeatMapToken++;
      cancelDjBeatAnalysisTimer();
      resetDjBeatMapState();
      currentBeatMap = null;
      beatMapNextIdx = 0;
      var djTok = djBeatMapToken;
      var djKey = djSongKey(song);
      if (djBeatMapCache[djKey]) {
        currentDjBeatMap = djBeatMapCache[djKey];
        applyPodcastDjProfileFromMap(currentDjBeatMap);
        syncPodcastDjMapCursor(window.audio ? window.audio.currentTime : 0, true);
        hideBeatChip();
        notifyDesktopLyricsBeatMapReady();
        console.log('podcast DJ beatmap 缓存命中:', currentDjBeatMap.cameraBeats.length, '个主拍');
      } else {
        showBeatChip('DJ 离线锁拍准备中…');
        var djDurationSec = Math.max(0, Number(song.duration) || 0);
        if (djDurationSec > 10000) djDurationSec /= 1000;
        schedulePodcastDjAnalysis(djKey, data.url, djTok, djDurationSec);
      }
      maybeAnnounceDjMode();
    } else if (bmKey && window.beatMapCache[bmKey]) {
      currentBeatMap = window.beatMapCache[bmKey];
      applyCinemaProfileFromBeatMap(window.currentBeatMap);
      syncBeatMapPlaybackCursor(window.audio ? window.audio.currentTime : 0);
      notifyDesktopLyricsBeatMapReady();
      console.log('beatmap 缓存命中:', window.currentBeatMap.kicks.length, '个鼓点');
      scheduleQueueBeatPrefetch(idx, 2600);
    } else {
      var diskBeatMap = bmKey ? await readBeatDiskCache(bmKey) : null;
      if (diskBeatMap) {
        if (diskBeatMap._failed) {
          scheduleQueueBeatPrefetch(idx, 2600);
        } else {
          currentBeatMap = diskBeatMap;
          applyCinemaProfileFromBeatMap(window.currentBeatMap);
          syncBeatMapPlaybackCursor(window.audio ? window.audio.currentTime : 0);
          notifyDesktopLyricsBeatMapReady();
          console.log('beatmap D盘缓存命中:', window.currentBeatMap.kicks.length, '个鼓点');
          scheduleQueueBeatPrefetch(idx, 2600);
        }
      } else {
        scheduleBeatAnalysis(bmKey || song.id, proxyAudioUrl, bmTok, song);
      }
    }
    } catch (visualErr) {
      console.warn('[PlaybackVisualPrep]', song && song.name, visualErr);
      currentBeatMap = null;
      beatMapNextIdx = 0;
      window.safePlaybackStep('visual-prep-hide-chip', hideBeatChip);
    }
    markPlayPhase('window.audio-start');
    var playbackStarted = await playAudio({ silent: isQQPlayback });
    if (!playbackStarted) {
      if (isQQPlayback && await retryQQPlaybackWithCompatibleQuality(song, idx, token, opts, data, requestedQuality)) return;
      if (isYouTubePlayback && !opts._ytRetried && cachedUrl) {
        console.log('YT 播放失败，尝试清除过期缓存并重新获取 URL');
        delete window._audioUrlCache[cacheKey];
        try {
          var freshData = await window.youtubeSongUrl(song.id);
          if (freshData && freshData.url && token === window.trackSwitchToken) {
            var freshProxyUrl = '/api/window.audio?url=' + encodeURIComponent(freshData.url);
            window.audio.src = freshProxyUrl;
            window.audio.load();
            markPlayPhase('window.audio-retry');
            opts._ytRetried = true;
            playbackStarted = await window.attemptAudioPlay({ manual: true, silent: isQQPlayback });
          }
        } catch (e) {
          console.warn('YT playback retry failed:', e);
        }
      }
      if (!playbackStarted) {
        window.forcePlaybackControlsInteractive();
        if (opts.manual) {
          window.showToast('播放启动失败，请重新选择歌曲');
        } else {
          window.showSourceFallbackNotice('歌曲已载入', '点击播放器中间的播放按钮继续播放。');
        }
        return;
      }
    }
    window.safePlaybackStep('prefetch-adjacent', function(){ _prefetchAdjacent(idx); });
    window.forcePlaybackControlsInteractive();
    markPlayPhase('session-begin');
    window.safePlaybackStep('listen-session-begin', function(){ window.beginListenSession(song, playbackContext); });
    markPlayPhase('lyrics-fetch');
    if (song.type === 'podcast') {
      window.safePlaybackStep('podcast-lyrics', function(){
        var podcastLyricLines = withLyricFallback([]);
        window.setOriginalLyricsState(podcastLyricLines, false, 'fallback');
        window.applyPreferredLyricsForCurrent(true);
      });
    } else {
      window.fetchLyric(song, token);
    }
    window.safeRenderQueuePanel('play-queue-at');
    window.scheduleShelfRebuild('play-queue-at', true);
    window.safePlaybackStep('shelf-preview-suppress-end', suppressShelfPreviewForPlaybackSwitch);
  } catch (err) {
    console.error('Play failed:', { phase: playPhase, error: err }, err);
    window.hideLoading();
    window.forcePlaybackControlsInteractive();
    if (!isPlaybackRecursionError(err) && token === window.trackSwitchToken && !opts.manual && window.playQueue.length > 1) {
      skipFailedQueueItem(idx, token, '当前歌曲加载失败，正在尝试队列里的下一首。');
      return;
    }
    window.showToast(playbackFailureToastText(err));
  }
  } catch (setupErr) {
    console.error('Play setup failed:', { phase: playPhase, error: setupErr }, setupErr);
    window.hideLoading();
    window.forcePlaybackControlsInteractive();
    if (!isPlaybackRecursionError(setupErr) && typeof token !== 'undefined' && token === window.trackSwitchToken && !opts.manual && window.playQueue.length > 1) {
      skipFailedQueueItem(idx, token, '当前歌曲切换失败，正在尝试队列里的下一首。');
      return;
    }
    window.showToast(playbackFailureToastText(setupErr));
  }
}
window.togglePlay = async function() {
  if (window.playToggleBusy) return;
  playToggleBusy = true;
  try {
    window.forcePlaybackControlsInteractive();
    if ((!window.audio || !window.audio.src) && window.playQueue.length && window.currentIdx >= 0) {
      await window.playQueueAt(window.currentIdx, { manual: true });
      return;
    }
    if (!window.audio) return;
    if (window.audio.paused || window.audio.ended) {
      var playOk = await window.attemptAudioPlay({ manual: true });
      if (!playOk && window.playQueue.length && window.currentIdx >= 0) {
        var curSong = window.playQueue[window.currentIdx];
        if (curSong && window.songProviderKey(curSong) === 'youtube') {
          var ck = window._cacheKeyForSong(curSong);
          if (window._audioUrlCache[ck]) delete window._audioUrlCache[ck];
          if (window.audio) { window.audio.src = ''; window.audio.removeAttribute('src'); }
          await window.playQueueAt(window.currentIdx, { manual: true, _ytRetried: true });
          return;
        }
      }
    } else {
      await window.fadeOutAndPauseAudio();
      playing = false;
      window.setPlayIcon(false);
      window.hideLoading();
      window.safePlaybackStep('listen-stats-pause', function(){ window.updateListenStatsTick(true); });
      window.forcePlaybackControlsInteractive();
      window.safePlaybackStep('sync-pause-state', function(){ syncPlaybackStateFromAudioEvent('manual-pause'); });
      window.safePlaybackStep('pause-controls-hide', function(){ window.scheduleControlsHide(520); });
    }
  } catch (err) {
    console.warn('[TogglePlay]', err);
    playing = !!(window.audio && !window.audio.paused);
    window.setPlayIcon(window.playing);
    window.hideLoading();
    window.forcePlaybackControlsInteractive();
    if (!window.audio || !window.audio.src) window.showToast('播放控制失败');
  } finally {
    playToggleBusy = false;
  }
}
window.nextTrack = function() {
  if (!window.playQueue.length) return;
  playToggleBusy = false;
  window.forcePlaybackControlsInteractive();
  if (playMode === 'shuffle') currentIdx = Math.floor(Math.random() * window.playQueue.length);
  else currentIdx = (window.currentIdx + 1) % window.playQueue.length;
  Promise.resolve(window.playQueueAt(window.currentIdx)).finally(window.forcePlaybackControlsInteractive);
}
window.prevTrack = function() {
  if (!window.playQueue.length) return;
  playToggleBusy = false;
  window.forcePlaybackControlsInteractive();
  currentIdx = (window.currentIdx - 1 + window.playQueue.length) % window.playQueue.length;
  Promise.resolve(window.playQueueAt(window.currentIdx)).finally(window.forcePlaybackControlsInteractive);
}
window.shuffleQueue = function() {
  for (var i = window.playQueue.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1));
    var tmp = window.playQueue[i]; window.playQueue[i] = window.playQueue[j]; window.playQueue[j] = tmp;
  }
  currentIdx = 0; window.safeRenderQueuePanel('shuffle-queue');
  window.showToast('队列已随机');
  window.safeShelfRebuild('shuffle-queue');
}
window.clearQueue = function() {
  playQueue = []; currentIdx = -1;
  window.safeRenderQueuePanel('clear-queue');
  window.safeShelfRebuild('clear-queue');
  window.updateCustomCoverButton();
  window.updateCustomLyricControls();
  updateEmptyHomeVisibility({ forceLoad: false });
}
window.forcePlaybackControlsInteractive = function() {
  if (!hasActivePlaybackControls()) return;
  try {
    document.body.classList.remove('home-controls-locked');
    var bar = document.getElementById('bottom-bar');
    if (bar) {
      bar.style.pointerEvents = '';
      if (!window.controlsAutoHide) {
        bar.classList.add('visible');
        bar.classList.remove('soft-hidden');
      }
    }
    ['play-btn', 'prev-btn', 'next-btn', 'mini-queue-btn', 'heart-btn', 'play-mode-btn', 'collect-btn'].forEach(function(id){
      var btn = document.getElementById(id);
      if (!btn) return;
      btn.disabled = false;
      btn.classList.remove('busy');
    });
    updateControlsChromeState();
    if (bar && bar.classList.contains('visible') && window.controlsAutoHide && !window.controlsHovering) window.scheduleControlsHide(220);
  } catch (e) {
    console.warn('[PlaybackControlsRestore]', e);
  }
}

window.normalizeControlGlassChromaticOffset = function(value) {
  return Math.max(0, Math.min(40, Number(value) || 0));
};

window.applyControlGlassChromaticOffset = function() {
  if (!window.fx) return;
  window.fx.controlGlassChromaticOffset = window.normalizeControlGlassChromaticOffset(window.fx.controlGlassChromaticOffset);
  var filter = document.getElementById('mineradio-control-glass-filter');
  if (!filter) return;
  var dx = String(-Math.round(window.fx.controlGlassChromaticOffset));
  filter.querySelectorAll('feOffset').forEach(function(node){
    node.setAttribute('dx', dx);
    node.setAttribute('dy', '0');
  });
};

window.pauseCurrentAudioForTrackSwitch = function() {
  window.playToggleBusy = false;
  if (!window.audio) return;
  try {
    window.audioFadeSerial++;
    if (typeof window.clearAudioFadeTimers === 'function') window.clearAudioFadeTimers();
    window.audio.onended = null;
    window.audio.pause();
  } catch (e) {}
  window.playing = false;
  if (typeof window.setPlayIcon === 'function') window.setPlayIcon(false);
  if (typeof window.syncPlaybackStateFromAudioEvent === 'function') window.syncPlaybackStateFromAudioEvent('track-switch');
};

window.isPlaybackRecursionError = function(err) {
  var msg = String((err && err.message) || err || '');
  return err instanceof RangeError || /maximum call stack size exceeded/i.test(msg);
};

function playbackFailureToastText(err) {
  if (typeof window.isPlaybackRecursionError === 'function' && window.isPlaybackRecursionError(err)) return '播放准备异常，已保持播放器可操作';
  return '播放失败: ' + (err && err.message ? err.message : err);
}

function switchPlaybackVisualToEmily() {
  if (window.homeVisualPresetActive) {
    if (typeof window.deactivateHomeWallpaperPreview === 'function') window.deactivateHomeWallpaperPreview(true);
    return;
  }
  document.body.classList.remove('home-wallpaper-preview');
  var targetPreset = typeof window.playbackVisualPreset === 'number' ? window.playbackVisualPreset : window.fxDefaults.preset;
  window.startupVisualPreviewActive = false;
  if (typeof window.setPreset === 'function' && window.fx.preset !== targetPreset) {
    window.setPreset(targetPreset, { silent: true, preserveCamera: false, noSave: true });
  } else if (typeof window.syncFxUniforms === 'function') {
    window.syncFxUniforms();
  }
}
