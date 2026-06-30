window.uiSfxCtx = null;
window.lastShelfSelectSfxAt = 0;
window.FFT_SIZE = 2048;
window.frequencyData = new Uint8Array(FFT_SIZE / 2);
window.timeDomainData = new Uint8Array(FFT_SIZE);
window.BEAT_FFT_SIZE = 2048;
window.beatFrequencyData = new Uint8Array(BEAT_FFT_SIZE / 2);
window.beatTimeDomainData = new Uint8Array(BEAT_FFT_SIZE);
window.bass = 0;
window.mid = 0;
window.treble = 0;
window.audioEnergy = 0;
window.beatPulse = 0;
window.prevEnergy = 0;
window.lyricSunEnergy = 0;
window.lyricSunTarget = 0;
window.lyricSunHold = 0;
window.lyricSunAvg = 0;
window.lyricSunPeak = 0.55;
window.smoothBass = 0;
window.smoothMid = 0;
window.smoothTreb = 0;
window.smoothEnergy = 0;
window.bassPeak = 0.12;
window.midPeak = 0.10;
window.treblePeak = 0.08;
window.energyPeak = 0.10;
var beatOnsetFlag = false;        // beat 上升沿瞬时标志,每帧消费一次
var lastStrongDrop = 0;           // 用于 burst 预设的强 drop 时刻

window.lyricsLines = [];
window.lyricsVisible = false;
window.lyricsHasNativeKaraoke = false;
window.lyricsTimingSource = 'none';
window.playlist = [];
window.playQueue = [];
window.currentIdx = -1;
window.playing = false;
window.playToggleBusy = false;
window.searchMode = 'song';
window.podcastResults = [];
window.podcastPrograms = [];
window.podcastCurrentRadio = null;
window.loginStatus = { loggedIn: false, vipType: 0, vipLevel: 'none', isVip: false, isSvip: false, vipLabel: '无VIP' };
window.qqLoginStatus = { provider: 'qq', loggedIn: false, preview: false, nickname: 'QQ 音乐', userId: '', avatar: '', vipType: 0 };
window.qqLoginAutoRefreshTimer = null;
window.qqLoginWasLoggedIn = false;
window.loginProvider = 'netease';
window.activeAccountProvider = 'netease';
window.dualAccountMode = false;
window.qqCookieBusy = false;
window.neteaseWebLoginBusy = false;
window.qqWebLoginBusy = false;
window.qqManualCookieOpen = false;
window.loginStatusChecked = false;
window.loginStatusCheckFailed = false;
window.qrPollTimer = null;
window.qrKey = null;
window.volumeTween = null;
window.trackSwitchToken = 0;
window.audioFadeTimer = null;
window.audioElementFadeFrame = 0;
window.audioFadeSerial = 0;
window.AUDIO_FADE_IN_MS = 460;
window.AUDIO_FADE_OUT_MS = 420;
window.AUDIO_SILENCE_GAIN = 0.0001;
window.userPlaylists = [];
window.qqPlaylists = [];
window.myPodcastCollections = [];
window.myPodcastItems = {};
window.playlistCoverCache = {};
var localBeatMapCache = null;   // initialized by beat-analysis.js on load
var localBeatMapPrefs = null;   // initialized by beat-analysis.js on load
var playbackQuality = null;     // initialized by api-helper.js on load
window.qqPlaybackQualityCeiling = '';
window.coverCropState = null;
window.coverCropBound = false;
window.currentLocalSong = null;
window.lyricSourceMode = 'original';
window.originalLyricsState = { lines: [], hasNativeKaraoke: false, timingSource: 'none' };
var _lyricOffset = 0; // 歌词时间轴手动偏移（秒），Alt+[ 减 / Alt+] 增 / 按钮调节
window._prefetchToken = 0;
window.localBeatAnalysis = { song:null, audioUrl:'', mode:'mr', active:false, token:0 };
window.likedSongMap = {};
window.likeBusyMap = {};
window.likeStatusToken = 0;
window.collectTargetSong = null;
window.collectBusy = false;
window.uploadTipTimer = null;
window.uploadTipAttempts = 0;
window.visualGuideActive = false;
window.visualGuideStep = 0;
window.visualGuideResizeBound = false;
window.visualGuideState = { bottomWasVisible: false, searchWasPeek: false, manual: false };
window.emptyHomeActive = false;
window.homeForcedOpen = false;
window.homeSuppressed = false;
window.homeDiscoverState = { loading: false, loaded: false, loggedIn: false, mode: 'starter', songs: [], playlists: [], podcasts: [], youtubeSongs: [], error: '', updatedAt: 0 };
window.homeDiscoverToken = 0;
window.homeVisualPresetActive = false;
window.homeVisualPrevPreset = 0;
window.HOME_LISTEN_STATS_KEY = 'mineradio-listen-stats-v1';
window.HOME_WEATHER_CITY_KEY = 'mineradio-weather-city';
window.homeWeatherRadioState = { loading: false, loaded: false, city: localStorage.getItem(HOME_WEATHER_CITY_KEY) || '上海', weather: null, radio: null, error: '', updatedAt: 0 };
window.homeWeatherToken = 0;
window.homeWeatherLoadTimer = null;
window.homeWeatherLoadPromise = null;
window.weatherRadioStartBusy = false;
window.activeRadioContext = null;
var listenStatsState = null;    // initialized by api-helper.js on load
window.listenSession = null;
window.appPerfMarks = [];
window.markAppPerf = function(name) {
  try {
    var value = performance.now();
    appPerfMarks.push({ name: name, value: Math.round(value) });
    if (performance && performance.mark) performance.mark('mineradio:' + name);
    if (appPerfMarks.length <= 16) console.debug('[MineradioPerf]', name, Math.round(value) + 'ms');
  } catch (e) {}
}
markAppPerf('script-start');
window.installStartupLongTaskObserver = function() {
  try {
    if (!('PerformanceObserver' in window)) return;
    var observer = new PerformanceObserver(function(list){
      list.getEntries().forEach(function(entry){
        if (entry.startTime > 15000) return;
        console.debug('[MineradioPerf] longtask', Math.round(entry.startTime) + 'ms', Math.round(entry.duration) + 'ms');
      });
    });
    observer.observe({ entryTypes: ['longtask'] });
    setTimeout(function(){ try { observer.disconnect(); } catch (e) {} }, 16000);
  } catch (e) {}
}
installStartupLongTaskObserver();
window.queueViewTab = 'queue';
window.playMode = 'loop';
window.miniQueueOpen = false;
window.miniQueueRenderSeq = 0;
window.queueRenderSeq = 0;
window.playlistRenderSeq = 0;
window.queuePanelDirty = false;
window.PLAYLIST_PANEL_BATCH_SIZE = 28;
window.playlistPanelRenderLimit = PLAYLIST_PANEL_BATCH_SIZE;
window.playlistPanelLazyBound = false;
window.PLAYLIST_DETAIL_INITIAL_RENDER = 64;
window.PLAYLIST_DETAIL_BATCH_SIZE = 48;
window.smoothWheelScrollBound = false;
window.coverProcessToken = 0;
window.aiDepthPipeline = null;
window.aiDepthReady = false;
window.aiDepthBusy = false;
window.aiDepthFailUntil = 0;
window.coverDepthCache = Object.create(null);
window.coverDepthCacheKeys = [];
window.aiDepthLastRunAt = 0;
window.aiDepthMinGapMs = 18000;
var updatePreviewState = {
  visible: false,
  open: false,
  status: 'idle',
  progress: 0,
  timer: null,
  pollTimer: null,
  downloadJobId: '',
  patchJobId: '',
  mode: 'installer',
  installerPath: '',
  installerOpened: false,
  cached: false,
  currentVersion: '0.9.11',
  version: '1.1.0',
  configured: false,
  preview: true,
  updateAvailable: false,
  releaseUrl: '',
  downloadUrl: '',
  patchAvailable: false,
  patchUrl: '',
  received: 0,
  total: 0,
  speedBps: 0,
  etaSeconds: 0,
  sourceLabel: '',
  attempt: 0,
  attempts: 0,
  errorReason: '',
  errorDetail: '',
  failedAttempts: [],
  message: '',
  restartRequired: false,
  patchFallbackTried: false,
  hero: '当前版本，更新检测已就绪。',
  notes: [
    '安装包文字对比修复',
    '安装目录可自由选择',
    '单实例与快捷方式修复'
  ]
};
window.applyUserCapsuleAutoHideState = function() {
  document.body.classList.toggle('user-capsule-auto-hide', !!userCapsuleAutoHide);
  var btn = document.getElementById('user-capsule-hide-btn');
  if (btn) {
    btn.classList.toggle('on', !!userCapsuleAutoHide);
    btn.textContent = userCapsuleAutoHide ? '›' : '‹';
    btn.title = userCapsuleAutoHide ? '取消自动隐藏账号胶囊' : '自动隐藏账号胶囊';
  }
}
window.toggleUserCapsuleAutoHide = function(e) {
  if (e && e.stopPropagation) e.stopPropagation();
  userCapsuleAutoHide = !userCapsuleAutoHide;
  saveBooleanPreference(USER_CAPSULE_AUTO_HIDE_STORE_KEY, userCapsuleAutoHide);
  applyUserCapsuleAutoHideState();
  showToast(userCapsuleAutoHide ? '账号胶囊已自动隐藏' : '账号胶囊已固定显示');
}
window.updateUserCapsuleAutoHideFromPointer = function(x, y) {
  if (!userCapsuleAutoHide || immersiveMode) {
    document.body.classList.remove('user-capsule-peek');
    return;
  }
  var nearTopRight = x > innerWidth - 112 && y < 126;
  document.body.classList.toggle('user-capsule-peek', nearTopRight);
}
window.applyFxFabAutoHideState = function(opts) {
  opts = opts || {};
  document.body.classList.toggle('fx-fab-auto-hide', !!fxFabAutoHide);
  if (!fxFabAutoHide) {
    document.body.classList.remove('fx-fab-peek');
    fxFabAutoHideRevealArmed = true;
  } else if (opts.forceHidden) {
    document.body.classList.remove('fx-fab-peek');
    fxFabAutoHideRevealArmed = false;
  }
  var btn = document.getElementById('fx-fab-hide-btn');
  if (btn) {
    btn.classList.toggle('on', !!fxFabAutoHide);
    btn.textContent = fxFabAutoHide ? '›' : '‹';
    btn.title = fxFabAutoHide ? '取消自动隐藏视觉控制台' : '自动隐藏视觉控制台';
  }
}
window.toggleFxFabAutoHide = function(e) {
  if (e && e.stopPropagation) e.stopPropagation();
  fxFabAutoHide = !fxFabAutoHide;
  saveBooleanPreference(FX_FAB_AUTO_HIDE_STORE_KEY, fxFabAutoHide);
  applyFxFabAutoHideState({ forceHidden: fxFabAutoHide });
  showToast(fxFabAutoHide ? '视觉控制台按钮已自动隐藏' : '视觉控制台按钮已固定显示');
}
window.updateFxFabAutoHideFromPointer = function(x, y) {
  if (!fxFabAutoHide || !diyPlayerMode || immersiveMode) {
    document.body.classList.remove('fx-fab-peek');
    fxFabAutoHideRevealArmed = true;
    return;
  }
  var panel = document.getElementById('fx-panel');
  var panelOpen = !!(panel && (panel.classList.contains('peek') || panel.classList.contains('show')));
  var nearBottomRight = x > innerWidth - 126 && y > innerHeight - 158;
  if (!nearBottomRight) fxFabAutoHideRevealArmed = true;
  document.body.classList.toggle('fx-fab-peek', panelOpen || (nearBottomRight && fxFabAutoHideRevealArmed));
}
window.layoutFullscreenDiyZone = function() {
  var width = innerWidth < 820 ? 104 : 128;
  var height = innerWidth < 720 ? 48 : 52;
  var left = innerWidth - 510;
  var top = 24;
  var anchor = document.querySelector('#top-right .top-account-pill') || document.getElementById('user-btn') || document.getElementById('top-right');
  if (anchor) {
    var rect = anchor.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      var gap = innerWidth < 820 ? 8 : 12;
      left = rect.left + rect.width / 2 - width / 2;
      top = rect.bottom + gap;
    }
  }
  left = Math.max(12, Math.min(innerWidth - width - 12, left));
  top = Math.max(8, Math.min(innerHeight - height - 8, top));
  document.documentElement.style.setProperty('--fullscreen-diy-left', left.toFixed(1) + 'px');
  document.documentElement.style.setProperty('--fullscreen-diy-top', top.toFixed(1) + 'px');
  document.documentElement.style.setProperty('--fullscreen-diy-width', width + 'px');
  return { left: left, top: top, width: width, height: height };
}
window.shouldSuppressFullscreenDiyPeek = function() {
  var fxPanel = document.getElementById('fx-panel');
  var hotkeyModal = document.getElementById('hotkey-modal');
  var fxPanelOpen = !!(fxPanel && (fxPanel.classList.contains('peek') || fxPanel.classList.contains('show')));
  var hotkeyOpen = !!(hotkeyModal && hotkeyModal.classList.contains('show'));
  return !!(visualGuideActive || fxPanelOpen || hotkeyOpen);
}
window.updateFullscreenDiyPeekFromPointer = function(x, y) {
  var ds = desktopRuntimeState || {};
  var isFullscreen = !!(ds.fullscreen || desktopFullscreenActive || document.fullscreenElement || document.body.classList.contains('desktop-fullscreen'));
  if (!isFullscreen || immersiveMode || shouldSuppressFullscreenDiyPeek()) {
    document.body.classList.remove('fullscreen-diy-peek');
    return;
  }
  var rect = layoutFullscreenDiyZone();
  var anchor = document.querySelector('#top-right .top-account-pill') || document.getElementById('user-btn') || document.getElementById('top-right');
  var anchorRect = anchor ? anchor.getBoundingClientRect() : rect;
  var hitLeft = Math.min(rect.left, anchorRect.left) - 26;
  var hitRight = Math.max(rect.left + rect.width, anchorRect.right) + 26;
  var hitTop = Math.min(rect.top, anchorRect.top) - 18;
  var hitBottom = Math.max(rect.top + rect.height, anchorRect.bottom) + 16;
  var active = x >= hitLeft && x <= hitRight && y >= hitTop && y <= hitBottom;
  document.body.classList.toggle('fullscreen-diy-peek', active);
}
window.isDiyMode = function() {
  return !!diyPlayerMode;
}
window.syncDiyModeButton = function() {
  ['diy-mode-btn', 'fullscreen-diy-btn'].forEach(function(id) {
    var btn = document.getElementById(id);
    if (!btn) return;
    btn.classList.toggle('on', diyPlayerMode);
    btn.setAttribute('aria-pressed', diyPlayerMode ? 'true' : 'false');
    btn.title = diyPlayerMode ? '关闭 DIY 玩家模式' : '开启 DIY 玩家模式';
    btn.setAttribute('aria-label', btn.title);
  });
}
window.applyDiyMode = function(on, opts) {
  opts = opts || {};
  diyPlayerMode = !!on;
  document.documentElement.classList.toggle('diy-mode-preload', diyPlayerMode);
  document.documentElement.classList.toggle('simple-mode-preload', !diyPlayerMode);
  document.body.classList.toggle('diy-mode', diyPlayerMode);
  document.body.classList.toggle('simple-mode', !diyPlayerMode);
  syncDiyModeButton();
  if (opts.save) saveDiyModePreference(diyPlayerMode);
  if (!diyPlayerMode) {
    toggleFxPanel(false);
    togglePlaylistPanel(false);
    closeUploadTip(false);
    var quality = document.getElementById('quality-control');
    var volume = document.getElementById('volume-control');
    if (quality) quality.classList.remove('open');
    if (volume) volume.classList.remove('open');
  }
  if (opts.toast) showToast(diyPlayerMode ? 'DIY 玩家模式已开启' : '已切回简约模式');
  if (opts.animate && window.gsap) {
    ['diy-mode-btn', 'fullscreen-diy-btn'].forEach(function(id) {
      var btn = document.getElementById(id);
      if (btn) window.gsap.fromTo(btn, { scale: 0.94 }, { scale: 1, duration: 0.34, ease: 'back.out(1.8)', overwrite: true });
    });
  }
}
window.toggleDiyMode = function() {
  applyDiyMode(!diyPlayerMode, { save: true, toast: true, animate: true });
  if (visualGuideActive) {
    visualGuideState.mode = diyPlayerMode ? 'diy' : 'simple';
    showVisualGuideStep(0);
  }
}
window.targetVolume = readSavedVolume();
window.lastNonZeroVolume = targetVolume > 0.01 ? targetVolume : 0.8;
window.volumeCloseTimer = null;

// v7.2: 离线节拍预解析
//   每次切歌, fetch 完整音频 → OfflineAudioContext 分析 → 标出真鼓点
//   缓存按 song.id 存, 避免重复
var beatMapCache = {};       // { songId: { kicks: [t1, t2, ...], duration: ... } }
var currentBeatMap = null;   // 当前播放的歌的 beatMap
var beatMapNextIdx = 0;      // 下一个待触发的 kick index
var beatMapBusy = false;     // 正在分析中
var beatMapToken = 0;        // 取消旧分析
window.beatAnalysisTimer = null;
window.beatAnalysisStartedAt = 0;
window.beatPrefetchTimer = null;
window.beatPrefetchBusy = false;
window.beatPrefetchToken = 0;
window.beatPrefetchLastKey = '';
window.BEAT_PREFETCH_LIMIT = 2;
window.beatDiskCacheStatus = { checked:false, enabled:false, mode:'unknown', reason:'' };
window.beatDiskCacheNoticeLogged = false;
window.djBeatMapCache = {};
window.currentDjBeatMap = null;
window.djBeatMapNextIdx = 0;
window.djBeatPulseNextIdx = 0;
window.djBeatMapBusy = false;
window.djBeatMapToken = 0;
window.djBeatAnalysisTimer = null;
var beatAnalysisConfig = {
  delayMs: 1600,
  minPlaybackSec: 1.2,
  idleTimeout: 1400,
  skipMusicTempoWhilePlaying: false
};
var beatCam = {
  nextIdx: 0,
  events: [],
  punch: 0,
  lookahead: 0.075,
  lastTriggerAt: -10,
  lastRealtimeAt: -10,
  minInterval: 0.500,
  fallbackMinInterval: 0.320,
  realtimeMinInterval: 0.460,
  realtimeMergeWindow: 0.135,
  attack: 0.028,
  hold: 0.030,
  release: 0.185,
  thetaKick: 0,
  phiKick: 0,
  radiusKick: 0,
  rollKick: 0,
  prevAudioTime: -1,
  stats: { map: 0, live: 0, merged: 0, liveBlocked: 0 }
};
window.liveCamAvg = 0;
window.liveCamPeak = 0.28;
window.liveCamLastRaw = 0;
window.cinemaDynamics = { avg: 0, lowAvg: 0, peak: 0.30, scale: 0.82 };
var cinemaTrackProfile = {
  scale: 1.0,
  target: 1.0,
  nameHint: 1.0,
  frames: 0,
  energyAvg: 0,
  lowAvg: 0,
  vocalAvg: 0,
  melodyAvg: 0,
  punchPeak: 0.10,
  density: 0
};
var rtBeat = {
  subFast: 0, subSlow: 0, lowFast: 0, lowSlow: 0,
  bodyFast: 0, bodySlow: 0, vocalFast: 0, vocalSlow: 0, snapFast: 0, snapSlow: 0,
  prevSub: 0, prevLow: 0, prevBody: 0, prevVocal: 0, prevSnap: 0, prevRms: 0,
  onsetAvg: 0.012, onsetPeak: 0.060,
  subPeak: 0.14, lowPeak: 0.18, bodyPeak: 0.16, vocalPeak: 0.16, snapPeak: 0.14,
  lastHitAt: -10,
  tempoGap: 0,
  tempoConfidence: 0,
  beatCount: 0,
  primedFrames: 0,
  warmupUntil: 0,
  pulse: 0,
  score: 0,
  stats: { hits: 0, blocked: 0, assisted: 0, strong: 0, rejected: 0 }
};
var djMode = {
  active: false,
  songKey: '',
  startedAt: 0,
  lastNoticeAt: -100000,
  tempoGap: 0,
  tempoConfidence: 0,
  sectionEnergy: 0,
  sectionLow: 0,
  sectionChange: 0,
  visualPulse: 0,
  lastBeatAt: -10
};

window.isPodcastSong = function(song) {
  return !!(song && song.type === 'podcast');
}

window.djSongKey = function(song) {
  if (!song) return '';
  if (song.localKey) return 'local:' + song.localKey;
  return 'podcast:' + (song.programId || song.id || song.name || '');
}

window.resetDjModeMeter = function() {
  djMode.tempoGap = 0;
  djMode.tempoConfidence = 0;
  djMode.sectionEnergy = 0;
  djMode.sectionLow = 0;
  djMode.sectionChange = 0;
  djMode.visualPulse = 0;
  djMode.lastBeatAt = -10;
}

window.resetDjBeatMapState = function() {
  currentDjBeatMap = null;
  djBeatMapNextIdx = 0;
  djBeatPulseNextIdx = 0;
}

window.cancelDjBeatAnalysisTimer = function() {
  if (djBeatAnalysisTimer) {
    clearTimeout(djBeatAnalysisTimer);
    djBeatAnalysisTimer = null;
  }
}

window.setDjModeActive = function(active, song) {
  active = !!active;
  var key = active ? djSongKey(song) : '';
  var changed = djMode.active !== active || djMode.songKey !== key;
  djMode.active = active;
  djMode.songKey = key;
  if (changed) {
    djMode.startedAt = performance.now();
    resetDjModeMeter();
  }
  if (active) {
    currentBeatMap = null;
    beatMapNextIdx = 0;
    cancelBeatAnalysisTimer();
    hideBeatChip();
  } else {
    djBeatMapToken++;
    cancelDjBeatAnalysisTimer();
    resetDjBeatMapState();
  }
}

window.maybeAnnounceDjMode = function() {
  if (!djMode.active) return;
  var now = performance.now();
  if (now - djMode.lastNoticeAt > 8000) {
    djMode.lastNoticeAt = now;
    showToast('DJ Mode · 离线锁拍');
  }
}

// fx 状态: 预设 + 主滑块 + 开关 + 三态
var DEVELOPMENT_LOCKED_FX = {
  wallpaperMode: true
};
window.isDevelopmentLockedFx = function(key) {
  return !!DEVELOPMENT_LOCKED_FX[key];
}
window.normalizeDevelopmentLockedFxState = function() {
  if (!fx) return;
  fx.wallpaperMode = false;
}
window.playbackVisualPreset = readSavedPlaybackVisualPreset();
window.startupVisualPreviewActive = false;
window.fx = Object.assign({}, fxDefaults, readSavedLyricLayout());
normalizeDevelopmentLockedFxState();
window.presetTransition = { active:false, start:-10, duration:0.92, from:0, to:0 };
window.controlsAutoHide = readBooleanPreference(CONTROLS_AUTO_HIDE_STORE_KEY, false);
window.controlsHovering = false;
window.controlsHideTimer = null;
window.controlsHandleDimTimer = null;
window.controlsLastMoveAt = 0;
window.controlsShelfSuppressUntil = 0;
window.cursorHideTimer = null;
window.CURSOR_HIDE_DELAY = 2500;
window.fxPanelPinned = false;
window.playlistPanelPinned = readBooleanPreference(PLAYLIST_PANEL_PIN_STORE_KEY, false);
window.userCapsuleAutoHide = readBooleanPreference(USER_CAPSULE_AUTO_HIDE_STORE_KEY, false);
window.fxFabAutoHide = readBooleanPreference(FX_FAB_AUTO_HIDE_STORE_KEY, false);
window.fxFabAutoHideRevealArmed = true;
window.hotkeySettings = readHotkeySettings();
window.immersiveMode = false;
var immersiveState = {
  shelfMode: null,
  shelfPinnedOpen: false,
  lyrics: true,
  controlsAutoHide: true,
  bottomVisible: false
};

// 鼠标 / 摄像头视差
window.pointerParallax = { x:0, y:0 };
window.pointerTarget = { x:0, y:0 };
window.headParallax = { x:0, y:0, active:false };
window.headNeutral = null;

window.pulseObjectValue = function(target, key, amount, duration) {
  if (!target) return;
  target[key] = Math.max(target[key] || 0, amount || 1);
  if (window.gsap) {
    window.gsap.killTweensOf(target, key);
    var vars = { duration: duration || 0.42, ease: 'power3.out' };
    vars[key] = 0;
    window.gsap.to(target, vars);
  } else {
    setTimeout(function(){ if (target) target[key] = 0; }, (duration || 0.42) * 1000);
  }
}

var desktopRuntimeState = {
  desktop: !!window.desktopWindow,
  minimized: false,
  visible: true,
  focused: true,
  fullscreen: false
};
window.renderPowerState = { mode: '', width: 0, height: 0, pixelRatio: 0 };
window.backgroundCacheTrimTimer = 0;
var runtimePerfState = {
  lastCacheTrimAt: 0,
  cacheTrimCount: 0,
  lastCacheTrimReason: '',
  lastHeapSampleAt: 0,
  heapMB: 0,
  cacheCounts: {}
};
window.isDeepBackgroundMode = function() {
  if (isLiveBackgroundKeepMode()) return false;
  var ds = desktopRuntimeState || {};
  return !!(document.hidden || ds.minimized || ds.visible === false);
}
window.currentPerformanceBackgroundMode = function() {
  return normalizePerformanceBackgroundMode((fx||{}).performanceBackground, (fx||{}).liveBackgroundKeep === true);
}
window.isLiveBackgroundKeepMode = function() {
  return currentPerformanceBackgroundMode() === 'keep';
}
window.isBackgroundReleaseMode = function() {
  return currentPerformanceBackgroundMode() === 'release';
}
window.isHiddenForBackgroundOptimization = function() {
  return !!(document.hidden && !isLiveBackgroundKeepMode());
}
window.isVisibleBackgroundMode = function() {
  return false;
}
window.updateRenderPowerClasses = function() {
  document.body.classList.toggle('render-deep-sleep', isDeepBackgroundMode());
  document.body.classList.toggle('render-background-eco', isVisibleBackgroundMode());
}
window.safeObjectKeys = function(obj) {
  try { return obj ? Object.keys(obj) : []; } catch (e) { return []; }
}
window.markProtectedKey = function(map, key) {
  if (key) map[String(key)] = true;
}
window.collectProtectedCoverUrls = function() {
  var keep = Object.create(null);
  function mark(url) { if (url) keep[String(url)] = true; }
  try {
    var song = (typeof currentCoverSong === 'function') ? currentCoverSong() : (playQueue && currentIdx >= 0 ? playQueue[currentIdx] : null);
    if (song) {
      mark(song.cover);
      if (typeof songCoverSrc === 'function') {
        mark(songCoverSrc(song, 60));
        mark(songCoverSrc(song, 360));
        mark(songCoverSrc(song, 400));
      }
    }
    if (typeof currentCoverSource !== 'undefined' && currentCoverSource && currentCoverSource.src) mark(currentCoverSource.src);
    if (typeof playlistPanelDetailState !== 'undefined' && playlistPanelDetailState && playlistPanelDetailState.playlist) {
      var cover = playlistPanelDetailState.playlist.cover;
      mark(cover);
      if (typeof coverUrlWithSize === 'function') {
        mark(coverUrlWithSize(cover, 88));
        mark(coverUrlWithSize(cover, 96));
      }
    }
    if (shelfManager && shelfManager.getCards) {
      shelfManager.getCards().forEach(function(card){
        if (card && card.item) mark(card.item.cover);
      });
    }
  } catch (e) {}
  return keep;
}
window.collectProtectedBeatMapKeys = function() {
  var keep = Object.create(null);
  try {
    if (typeof beatMapSongKey === 'function' && playQueue && playQueue.length) {
      var start = Math.max(0, currentIdx - 5);
      var end = Math.min(playQueue.length - 1, currentIdx + 5);
      for (var i = start; i <= end; i++) markProtectedKey(keep, beatMapSongKey(playQueue[i]));
    }
    if (typeof beatPrefetchLastKey !== 'undefined') markProtectedKey(keep, beatPrefetchLastKey);
    if (typeof djMode !== 'undefined' && djMode && djMode.songKey) markProtectedKey(keep, djMode.songKey);
    if (typeof localBeatAnalysis !== 'undefined' && localBeatAnalysis && localBeatAnalysis.song && typeof beatMapSongKey === 'function') {
      markProtectedKey(keep, beatMapSongKey(localBeatAnalysis.song));
    }
  } catch (e) {}
  return keep;
}
window.collectProtectedCoverDepthIds = function() {
  var keep = Object.create(null);
  try {
    if (typeof coverDepthCacheId !== 'function') return keep;
    var candidates = [];
    if (typeof currentCoverSource !== 'undefined' && currentCoverSource && currentCoverSource.src) candidates.push(currentCoverSource.src);
    var song = (typeof currentCoverSong === 'function') ? currentCoverSong() : null;
    if (song && typeof songCoverSrc === 'function') {
      candidates.push(songCoverSrc(song, 360));
      candidates.push(songCoverSrc(song, 400));
    }
    var texImg = (typeof coverTex !== 'undefined' && coverTex && coverTex.image) ? coverTex.image : null;
    var w = texImg && texImg.width ? texImg.width : 0;
    var h = texImg && texImg.height ? texImg.height : 0;
    candidates.forEach(function(src){
      if (src) markProtectedKey(keep, coverDepthCacheId(src + '|tex=' + w + 'x' + h));
    });
  } catch (e) {}
  return keep;
}
window.trimObjectCache = function(cache, keep, protectedKeys, skipRecord) {
  var keys = safeObjectKeys(cache);
  if (!cache || keys.length <= keep) return 0;
  var drop = keys.length - keep;
  var dropped = 0;
  for (var i = 0; i < keys.length && drop > 0; i++) {
    var key = keys[i];
    if (protectedKeys && protectedKeys[key]) continue;
    var rec = cache[key];
    if (skipRecord && skipRecord(rec, key)) continue;
    delete cache[key];
    drop--;
    dropped++;
  }
  return dropped;
}
window.trimCoverDepthCache = function(keep, protectedKeys) {
  if (!coverDepthCache || !coverDepthCacheKeys) return 0;
  var keys = coverDepthCacheKeys.filter(function(key){ return !!coverDepthCache[key]; });
  if (keys.length <= keep) {
    coverDepthCacheKeys = keys;
    return 0;
  }
  var keepSet = Object.create(null);
  var count = 0;
  for (var i = keys.length - 1; i >= 0 && count < keep; i--) {
    keepSet[keys[i]] = true;
    count++;
  }
  Object.keys(protectedKeys || {}).forEach(function(key){ keepSet[key] = true; });
  var dropped = 0;
  keys.forEach(function(key){
    if (keepSet[key]) return;
    delete coverDepthCache[key];
    dropped++;
  });
  coverDepthCacheKeys = keys.filter(function(key){ return !!coverDepthCache[key]; });
  return dropped;
}
window.collectRuntimePerfSnapshot = function(now) {
  now = now || performance.now();
  runtimePerfState.cacheCounts = {
    playlistCovers: safeObjectKeys(playlistCoverCache).length,
    coverDepth: coverDepthCacheKeys ? coverDepthCacheKeys.length : 0,
    beatMaps: safeObjectKeys(beatMapCache).length,
    djBeatMaps: safeObjectKeys(djBeatMapCache).length
  };
  if (performance && performance.memory && now - runtimePerfState.lastHeapSampleAt > 12000) {
    runtimePerfState.lastHeapSampleAt = now;
    runtimePerfState.heapMB = Math.round((performance.memory.usedJSHeapSize || 0) / 1048576);
  }
  return {
    render: (typeof renderPerfState !== 'undefined') ? {
      mode: renderPerfState.mode,
      fps: renderPerfState.fps,
      skipped: renderPerfState.skipped,
      longFrames: renderPerfState.longFrames
    } : null,
    runtime: runtimePerfState,
    renderer: (typeof renderer !== 'undefined' && renderer && renderer.info) ? {
      geometries: renderer.info.memory && renderer.info.memory.geometries,
      textures: renderer.info.memory && renderer.info.memory.textures,
      calls: renderer.info.render && renderer.info.render.calls,
      triangles: renderer.info.render && renderer.info.render.triangles
    } : null,
    viewport: (typeof renderer !== 'undefined' && renderer && renderer.domElement) ? {
      width: innerWidth,
      height: innerHeight,
      devicePixelRatio: window.devicePixelRatio || 1,
      renderPixelRatio: renderer.getPixelRatio ? Number(renderer.getPixelRatio().toFixed(3)) : 0,
      canvasWidth: renderer.domElement.width || 0,
      canvasHeight: renderer.domElement.height || 0,
      renderPixels: (renderer.domElement.width || 0) * (renderer.domElement.height || 0),
      targetFps: (typeof getAdaptiveRenderFps === 'function') ? getAdaptiveRenderFps() : 0,
      interactionBoost: (typeof isRenderInteractionActive === 'function') ? isRenderInteractionActive() : false,
      interactionReason: (typeof renderInteractionReason !== 'undefined') ? renderInteractionReason : ''
    } : null,
    deepSleep: isDeepBackgroundMode()
  };
}
window.__mineradioPerfSnapshot = collectRuntimePerfSnapshot;
window.trimRuntimeCaches = function(reason, aggressive) {
  var protectedCovers = collectProtectedCoverUrls();
  var protectedBeats = collectProtectedBeatMapKeys();
  var dropped = 0;
  dropped += trimObjectCache(playlistCoverCache, aggressive ? 72 : 180, protectedCovers, function(rec){
    return rec && rec.loading;
  });
  dropped += trimCoverDepthCache(aggressive ? 4 : 10, collectProtectedCoverDepthIds());
  dropped += trimObjectCache(beatMapCache, aggressive ? 12 : 36, protectedBeats);
  dropped += trimObjectCache(djBeatMapCache, aggressive ? 4 : 12, protectedBeats);
  if (aggressive && typeof renderer !== 'undefined' && renderer && renderer.renderLists && renderer.renderLists.dispose) {
    try { renderer.renderLists.dispose(); } catch (e) {}
  }
  runtimePerfState.lastCacheTrimAt = performance.now();
  runtimePerfState.cacheTrimCount += 1;
  runtimePerfState.lastCacheTrimReason = reason || (aggressive ? 'deep' : 'active');
  collectRuntimePerfSnapshot(runtimePerfState.lastCacheTrimAt);
  return dropped;
}
window.trimVisualCachesForBackground = function() {
  if (!isDeepBackgroundMode()) return;
  trimRuntimeCaches('deep-background', true);
}
window.scheduleBackgroundCacheTrim = function() {
  if (!isDeepBackgroundMode()) return;
  if (backgroundCacheTrimTimer) clearTimeout(backgroundCacheTrimTimer);
  backgroundCacheTrimTimer = setTimeout(function(){
    backgroundCacheTrimTimer = 0;
    trimVisualCachesForBackground();
  }, 900);
}
window.maybeTrimRuntimeCaches = function(now) {
  now = now || performance.now();
  var deep = isDeepBackgroundMode();
  var gap = deep ? (isBackgroundReleaseMode() ? 3600 : 7000) : 45000;
  if (!deep && now < 30000) return;
  if (now - runtimePerfState.lastCacheTrimAt < gap) return;
  trimRuntimeCaches(deep ? (isBackgroundReleaseMode() ? 'release-frame' : 'deep-frame') : 'active-frame', deep);
}
window.applyRendererPowerMode = function() {
  if (typeof renderer === 'undefined' || !renderer) return;
  var deep = isDeepBackgroundMode();
  var width = deep ? 4 : Math.max(1, innerWidth);
  var height = deep ? 4 : Math.max(1, innerHeight);
  var pixelRatio = getRenderPixelRatio();
  var mode = deep ? 'sleep' : 'active';
  if (renderPowerState.mode === mode && renderPowerState.width === width && renderPowerState.height === height && Math.abs(renderPowerState.pixelRatio - pixelRatio) < 0.001) return;
  renderPowerState = { mode: mode, width: width, height: height, pixelRatio: pixelRatio };
  renderer.setPixelRatio(pixelRatio);
  renderer.setSize(width, height, false);
  if (typeof uniforms !== 'undefined' && uniforms && uniforms.uPixel) uniforms.uPixel.value = renderer.getPixelRatio();
  if (deep) {
    if (renderer.renderLists && renderer.renderLists.dispose) renderer.renderLists.dispose();
    scheduleBackgroundCacheTrim();
  }
}
window.updateDesktopRuntimeState = function(state) {
  state = state || {};
  var wasFullscreen = desktopRuntimeState.fullscreen;
  var wasDeep = isDeepBackgroundMode();
  desktopRuntimeState.desktop = !!window.desktopWindow;
  desktopRuntimeState.minimized = !!state.isMinimized;
  desktopRuntimeState.visible = state.isVisible !== false;
  desktopRuntimeState.focused = state.isFocused !== false;
  desktopRuntimeState.fullscreen = !!(state.isFullScreen || state.isNativeFullScreen || state.isHtmlFullScreen || state.isWindowFullScreen);
  updateRenderPowerClasses();
  applyRendererPowerMode();
  if (fx && (fx.desktopLyrics || fx.wallpaperMode)) setTimeout(syncDesktopOverlayState, 0);
  if (wasDeep && !isDeepBackgroundMode()) recoverVisualsAfterBackground('desktop-runtime-state');
  if (desktopRuntimeState.fullscreen !== wasFullscreen) scheduleMainRendererViewportRefresh('desktop-runtime-state');
}
window.installRenderPowerHooks = function() {
  updateRenderPowerClasses();
  document.addEventListener('visibilitychange', function(){
    updateRenderPowerClasses();
    applyRendererPowerMode();
    if (!isDeepBackgroundMode()) recoverVisualsAfterBackground('visibilitychange');
  });
  window.addEventListener('focus', function(){
    desktopRuntimeState.focused = true;
    updateRenderPowerClasses();
    applyRendererPowerMode();
    if (!isDeepBackgroundMode()) recoverVisualsAfterBackground('focus');
  });
  window.addEventListener('blur', function(){
    desktopRuntimeState.focused = false;
    updateRenderPowerClasses();
    applyRendererPowerMode();
  });
  if (window.desktopWindow && typeof window.desktopWindow.onStateChange === 'function') {
    window.desktopWindow.onStateChange(updateDesktopRuntimeState);
    if (typeof window.desktopWindow.getState === 'function') {
      window.desktopWindow.getState().then(updateDesktopRuntimeState).catch(function(){});
    }
  }
}

