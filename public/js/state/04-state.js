// ============================================================
window.normalizeCoverResolution = function(v) {
  if (v == null) return 1.50;
  v = clampRange(Number(v) || 1.50, 0.60, 1.65);
  v = Math.round(v / 0.05) * 0.05;
  return v;
};
window.normalizePerformanceBackgroundMode = function(v, liveKeepFallback) {
  if (liveKeepFallback) return 'keep';
  if (v === 'release' || v === 'deep') return v;
  return 'auto';
};
window.normalizePerformanceQuality = function(v) {
  return /^(eco|balanced|high|ultra)$/.test(v) ? v : 'high';
};
window.coverParticleGridForResolution = function(v) {
  v = normalizeCoverResolution(v);
  if (v >= 1.32) return 256;
  if (v >= 1.10) return 196;
  return 128;
};
window.coverTextureSizeForResolution = function(v) {
  v = normalizeCoverResolution(v);
  if (v >= 1.32) return 512;
  if (v >= 1.10) return 384;
  return 256;
};
window.readSavedLyricLayout = function() {
  try {
    var savedLayoutRaw = localStorage.getItem(LYRIC_LAYOUT_STORE_KEY);
    var raw = savedLayoutRaw ? (JSON.parse(savedLayoutRaw) || {}) : packagedDefaultLyricLayoutRaw();
    var savedPreset = clampRange(Number(raw.preset) || 0, 0, 6);
    if (savedPreset === 3 && raw.visualPresetSchema !== VISUAL_PRESET_SCHEMA) savedPreset = 5;
    var savedBgColor = normalizeHexColor(raw.backgroundColor || '#000000', '#000000');
    var savedBgOpacity = clampRange(raw.backgroundOpacity == null ? fxDefaults.backgroundOpacity : Number(raw.backgroundOpacity), 0, 1);
    var savedGlassOffset = clampRange(raw.controlGlassChromaticOffset == null ? fxDefaults.controlGlassChromaticOffset : Number(raw.controlGlassChromaticOffset), 0, 140);
    var savedBgMode = /^(cover|custom)$/.test(String(raw.backgroundColorMode || '')) ? String(raw.backgroundColorMode) : '';
    var savedBgCustom = savedBgMode ? savedBgMode === 'custom' : (raw.backgroundColorCustom === true || (raw.backgroundColorCustom !== false && savedBgColor !== '#000000') || savedBgOpacity < 1);
    var desktopLyricsSchemaReady = raw.desktopLyricsSchema === 'desktop-lyrics-v3';
    var savedShelfCameraMode = normalizeShelfCameraMode(raw.shelfCameraMode || fxDefaults.shelfCameraMode);
    var savedShelfAngleManual = raw.shelfAngleYManual === true;
    var savedShelfAngle = savedShelfAngleManual ? clampRange(raw.shelfAngleY == null ? shelfDefaultAngleForCameraMode(savedShelfCameraMode) : Number(raw.shelfAngleY), -30, 30) : shelfDefaultAngleForCameraMode(savedShelfCameraMode);
    return {
      preset: savedPreset, intensity: clampRange(Number(raw.intensity) || fxDefaults.intensity, 0.2, 1.6),
      cinemaShake: clampRange(Number(raw.cinemaShake) || fxDefaults.cinemaShake, 0, 1.8),
      depth: clampRange(Number(raw.depth) || fxDefaults.depth, 0.2, 1.8),
      point: clampRange(Number(raw.point) || fxDefaults.point, 0.5, 2.2),
      speed: clampRange(Number(raw.speed) || fxDefaults.speed, 0.2, 2.5),
      twist: clampRange(Number(raw.twist) || fxDefaults.twist, 0, 0.6),
      color: clampRange(Number(raw.color) || fxDefaults.color, 0.5, 2.0),
      scatter: clampRange(Number(raw.scatter) || fxDefaults.scatter, 0, 0.5),
      bgFade: clampRange(Number(raw.bgFade) || fxDefaults.bgFade, 0, 1.2),
      bloomStrength: clampRange(Number(raw.bloomStrength) || fxDefaults.bloomStrength, 0, 1.6),
      lyricGlowStrength: clampRange(Number(raw.lyricGlowStrength) || fxDefaults.lyricGlowStrength, 0, 0.85),
      lyricScale: clampRange(Number(raw.lyricScale) || fxDefaults.lyricScale, 0.35, 1.65),
      lyricOffsetX: clampRange(Number(raw.lyricOffsetX) || fxDefaults.lyricOffsetX, -2.0, 2.0),
      lyricOffsetY: clampRange(Number(raw.lyricOffsetY) || fxDefaults.lyricOffsetY, -1.2, 1.35),
      lyricOffsetZ: clampRange(Number(raw.lyricOffsetZ) || fxDefaults.lyricOffsetZ, -1.6, 1.6),
      lyricTiltX: clampRange(Number(raw.lyricTiltX) || fxDefaults.lyricTiltX, -42, 42),
      lyricTiltY: clampRange(Number(raw.lyricTiltY) || fxDefaults.lyricTiltY, -42, 42),
      lyricCameraLock: !!raw.lyricCameraLock, lyricColorMode: raw.lyricColorMode === 'custom' ? 'custom' : 'auto',
      lyricColor: normalizeHexColor(raw.lyricColor || '#a9b8c8'),
      lyricHighlightMode: raw.lyricHighlightMode === 'custom' ? 'custom' : 'auto',
      lyricHighlightColor: normalizeHexColor(raw.lyricHighlightColor || '#fff0b8'),
      lyricGlowLinked: raw.lyricGlowLinked !== false,
      lyricGlowColor: normalizeHexColor(raw.lyricGlowColor || '#9db8cf'),
      lyricFont: normalizeLyricFontKey(raw.lyricFont),
      lyricLetterSpacing: clampRange(Number(raw.lyricLetterSpacing) || fxDefaults.lyricLetterSpacing, -0.04, 0.18),
      lyricLineHeight: clampRange(Number(raw.lyricLineHeight) || fxDefaults.lyricLineHeight, 0.86, 1.35),
      lyricWeight: clampRange(Number(raw.lyricWeight) || fxDefaults.lyricWeight, 500, 900),
      visualTintMode: raw.visualTintMode === 'custom' ? 'custom' : 'auto',
      visualTintColor: normalizeHexColor(raw.visualTintColor || '#9db8cf'),
      uiAccentColor: normalizeHexColor(raw.uiAccentColor || '#00f5d4', '#00f5d4'),
      homeAccentColor: normalizeHexColor(raw.homeAccentColor || '#00f5d4'),
      homeIconColor: normalizeHexColor(raw.homeIconColor || '#f4d28a', '#f4d28a'),
      visualIconColor: normalizeHexColor(raw.visualIconColor || '#7fd8ff', '#7fd8ff'),
      backgroundColorMode: savedBgMode || 'cover',
      backgroundColor: savedBgColor,
      backgroundOpacity: savedBgOpacity,
      controlGlassChromaticOffset: savedGlassOffset,
      backgroundColorCustom: savedBgCustom,
      backgroundImage: String(raw.backgroundImage || ''),
      backgroundMedia: raw.backgroundMedia || null,
      desktopLyrics: !!raw.desktopLyrics,
      desktopLyricsSize: clampRange(Number(raw.desktopLyricsSize) || fxDefaults.desktopLyricsSize, 0.72, 1.55),
      desktopLyricsOpacity: clampRange(raw.desktopLyricsOpacity == null ? fxDefaults.desktopLyricsOpacity : Number(raw.desktopLyricsOpacity), 0.28, 1),
      desktopLyricsY: clampRange(raw.desktopLyricsY == null ? fxDefaults.desktopLyricsY : Number(raw.desktopLyricsY), 0.08, 0.92),
      desktopLyricsClickThrough: desktopLyricsSchemaReady ? raw.desktopLyricsClickThrough === true : fxDefaults.desktopLyricsClickThrough,
      desktopLyricsCinema: desktopLyricsSchemaReady ? raw.desktopLyricsCinema !== false : fxDefaults.desktopLyricsCinema,
      desktopLyricsHighlight: desktopLyricsSchemaReady ? raw.desktopLyricsHighlight === true : fxDefaults.desktopLyricsHighlight,
      desktopLyricsFps: desktopLyricsSchemaReady ? normalizeDesktopLyricsFps(raw.desktopLyricsFps) : fxDefaults.desktopLyricsFps,
      wallpaperMode: raw.wallpaperMode === true,
      wallpaperOpacity: clampRange(raw.wallpaperOpacity == null ? fxDefaults.wallpaperOpacity : Number(raw.wallpaperOpacity), 0.35, 1),
      floatLayer: savedBgCustom === true || !!raw.floatLayer,
      shelf: /^(off|side|stage)$/.test(String(raw.shelf || '')) ? raw.shelf : fxDefaults.shelf,
      shelfCameraMode: savedShelfCameraMode,
      shelfPresence: normalizeShelfPresence(raw.shelfPresence || fxDefaults.shelfPresence),
      shelfShowPodcasts: raw.shelfShowPodcasts !== false,
      shelfMergeCollections: raw.shelfMergeCollections === true,
      shelfSize: clampRange(raw.shelfSize == null ? fxDefaults.shelfSize : Number(raw.shelfSize), 0.65, 1.45),
      shelfOffsetX: clampRange(raw.shelfOffsetX == null ? fxDefaults.shelfOffsetX : Number(raw.shelfOffsetX), -1.2, 1.2),
      shelfOffsetY: clampRange(raw.shelfOffsetY == null ? fxDefaults.shelfOffsetY : Number(raw.shelfOffsetY), -0.9, 0.9),
      shelfOffsetZ: clampRange(raw.shelfOffsetZ == null ? fxDefaults.shelfOffsetZ : Number(raw.shelfOffsetZ), -0.9, 0.9),
      shelfAngleY: savedShelfAngle,
      shelfAngleYManual: savedShelfAngleManual,
      shelfOpacity: clampRange(raw.shelfOpacity == null ? fxDefaults.shelfOpacity : Number(raw.shelfOpacity), 0.25, 1),
      shelfBgOpacity: clampRange(raw.shelfBgOpacity == null ? fxDefaults.shelfBgOpacity : Number(raw.shelfBgOpacity), 0.25, 0.98),
      shelfAccentColor: normalizeHexColor(raw.shelfAccentColor || fxDefaults.shelfAccentColor, fxDefaults.shelfAccentColor),
      cam: /^(off|gesture)$/.test(String(raw.cam || '')) ? raw.cam : fxDefaults.cam
    };
  } catch (e) {
    return Object.assign({}, fxDefaults);
  }
};

window.normalizeHexColor = function(value, fallback) {
  if (value && typeof value === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(value)) return value;
  return (fallback || '#000000');
};
window.normalizeDesktopLyricsFps = function(value) {
  value = Math.round(Number(value) || 60);
  if (value > 0 && value <= 60) return value;
  return 60;
};
window.normalizeShelfCameraMode = function(value) {
  return value === 'dynamic' ? 'dynamic' : 'static';
};
window.shelfDefaultAngleForCameraMode = function(mode) {
  return normalizeShelfCameraMode(mode) === 'static' ? -15 : 0;
};
window.normalizeLyricFontKey = function(value) {
  return value === 'hei' ? 'hei' : 'sans';
};
window.normalizeShelfPresence = function(value) {
  return value === 'always' ? 'always' : 'auto';
};

window.isDeepBackgroundMode = function() {
  if (typeof window.isLiveBackgroundKeepMode === 'function' && window.isLiveBackgroundKeepMode()) return false;
  var ds = (typeof window.desktopRuntimeState !== 'undefined' ? window.desktopRuntimeState : null) || {};
  return !!(document.hidden || ds.minimized || ds.visible === false);
};

window.currentCoverSong = function() {
  if (typeof window.playQueue === 'undefined' || !window.playQueue || !window.playQueue.length || window.currentIdx < 0) return null;
  return window.playQueue[window.currentIdx];
};

window.saveUserFxArchives = function() {
  try { localStorage.setItem(USER_FX_ARCHIVE_STORE_KEY, JSON.stringify(userFxArchives)); }
  catch (e) { showToast('用户存档保存失败'); }
};
// 04-state.js — All global state variables
// Extracted from core/state.js; function definitions remain there.
// ============================================================

// ---- Audio Analysis State ----
window.uiSfxCtx = null;
window.lastShelfSelectSfxAt = 0;
window.FFT_SIZE = 2048;
window.frequencyData = new Uint8Array(window.FFT_SIZE / 2);
window.timeDomainData = new Uint8Array(window.FFT_SIZE);
window.BEAT_FFT_SIZE = 2048;
window.beatFrequencyData = new Uint8Array(window.BEAT_FFT_SIZE / 2);
window.beatTimeDomainData = new Uint8Array(window.BEAT_FFT_SIZE);
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
var beatOnsetFlag = false;
var lastStrongDrop = 0;

// ---- Lyric + Playlist State ----
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

// ---- Login State ----
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

// ---- Playback State ----
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
var localBeatMapCache = null;
var localBeatMapPrefs = null;
var playbackQuality = null;
window.qqPlaybackQualityCeiling = '';
window.coverCropState = null;
window.coverCropBound = false;
window.currentLocalSong = null;
window.lyricSourceMode = 'original';
window.originalLyricsState = { lines: [], hasNativeKaraoke: false, timingSource: 'none' };
var _lyricOffset = 0;
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
var listenStatsState = null;
window.listenSession = null;
window.appPerfMarks = [];

// ---- Queue / Panel State ----
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

// ---- Volume State ----
window.targetVolume = readSavedVolume();
window.lastNonZeroVolume = window.targetVolume > 0.01 ? targetVolume : 0.8;
window.volumeCloseTimer = null;

// ---- Beat Analysis State ----
var beatMapCache = {};
var currentBeatMap = null;
var beatMapNextIdx = 0;
var beatMapBusy = false;
var beatMapToken = 0;
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

// ---- FX / Visual State ----
var DEVELOPMENT_LOCKED_FX = {
  wallpaperMode: true
};
window.playbackVisualPreset = readSavedPlaybackVisualPreset();
window.startupVisualPreviewActive = false;
window.fx = Object.assign({}, window.fxDefaults, window.readSavedLyricLayout());
window.presetTransition = { active:false, start:-10, duration:0.92, from:0, to:0 };
window.controlsAutoHide = window.readBooleanPreference(window.CONTROLS_AUTO_HIDE_STORE_KEY, false);
window.controlsHovering = false;
window.controlsHideTimer = null;
window.controlsHandleDimTimer = null;
window.controlsLastMoveAt = 0;
window.controlsShelfSuppressUntil = 0;
window.cursorHideTimer = null;
window.CURSOR_HIDE_DELAY = 2500;
window.fxPanelPinned = false;
window.playlistPanelPinned = window.readBooleanPreference(window.PLAYLIST_PANEL_PIN_STORE_KEY, false);
window.userCapsuleAutoHide = window.readBooleanPreference(window.USER_CAPSULE_AUTO_HIDE_STORE_KEY, false);
window.fxFabAutoHide = window.readBooleanPreference(window.FX_FAB_AUTO_HIDE_STORE_KEY, false);
window.fxFabAutoHideRevealArmed = true;
window.hotkeySettings = window.readHotkeySettings();
window.immersiveMode = false;
var immersiveState = {
  shelfMode: null,
  shelfPinnedOpen: false,
  lyrics: true,
  controlsAutoHide: true,
  bottomVisible: false
};
window.pointerParallax = { x:0, y:0 };
window.pointerTarget = { x:0, y:0 };
window.headParallax = { x:0, y:0, active:false };
window.headNeutral = null;

// ---- Desktop / Render Power State ----
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

// Functions extracted from visual/23-lyrics-3d.js to EARLIER layer
// These are utility/config functions needed by state/04-state.js and infra/03-api.js


// Render power hooks (was in state.js but not extracted)
window.installRenderPowerHooks = function() {
  window.updateDesktopRuntimeState({ mode: 'shelf', panel: 'playlists' });
  window.addEventListener('resize', function(){ applyRendererPowerMode(); });
  if (typeof window.scheduleShelfRebuild === 'function') window.scheduleShelfRebuild('install-power', 200);
};
window.applyRendererPowerMode = function() {
  if (typeof window.renderer === 'undefined' || !window.renderer) return;
  var deep = window.isDeepBackgroundMode();
  var width = deep ? 4 : Math.max(1, innerWidth);
  var height = deep ? 4 : Math.max(1, innerHeight);
  var pixelRatio = deep ? 0.08 : Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  var mode = deep ? 'sleep' : 'active';
  var rs = window.renderPowerState || {};
  if (rs.mode === mode && rs.width === width && rs.height === height && Math.abs(rs.pixelRatio - pixelRatio) < 0.001) return;
  window.renderPowerState = { mode: mode, width: width, height: height, pixelRatio: pixelRatio };
  window.renderer.setPixelRatio(pixelRatio);
  window.renderer.setSize(width, height, false);
  if (typeof window.uniforms !== 'undefined' && window.uniforms && window.uniforms.uPixel) window.uniforms.uPixel.value = window.renderer.getPixelRatio();
  if (deep) { if (window.renderer.domElement) { window.renderer.domElement.style.opacity = '0'; } }
  else { if (window.renderer.domElement) { window.renderer.domElement.style.opacity = ''; } }
};
window.getRenderPixelRatio = function() {
  var device = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  if (window.isDeepBackgroundMode()) return Math.min(device, 0.30);
  return device;
};


window.updateDesktopRuntimeState = function(state) {
  if (typeof window.desktopRuntimeState === 'undefined') window.desktopRuntimeState = {};
  if (state) Object.assign(window.desktopRuntimeState, state);
  if (typeof window.updateRenderPowerClasses === 'function') window.updateRenderPowerClasses();
  if (typeof window.applyRendererPowerMode === 'function') window.applyRendererPowerMode();
};

window.updateUserCapsuleAutoHideFromPointer = function(x, y) {
  if (!userCapsuleAutoHide || immersiveMode) {
    document.body.classList.remove('user-capsule-peek');
    return;
  }
  var nearTopRight = x > innerWidth - 112 && y < 126;
  document.body.classList.toggle('user-capsule-peek', nearTopRight);
};
