// ============================================================
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
