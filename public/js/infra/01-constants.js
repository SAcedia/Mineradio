// 01-constants.js — extracted constants and defaults from shared.js + state.js
// Loads early (after vendors, before module JS)

// ── Store Keys ──
window.CUSTOM_COVER_STORE_KEY = 'mineradio-custom-covers';
window.CUSTOM_LYRIC_STORE_KEY = 'mineradio-custom-lyrics-v1';
window.CUSTOM_LYRIC_PREF_STORE_KEY = 'mineradio-custom-lyric-prefs-v1';
window.LYRIC_LAYOUT_STORE_KEY = 'mineradio-lyric-layout-v1';
window.VISUAL_PRESET_SCHEMA = 'skull-preset-v2';
window.PLAYBACK_QUALITY_STORE_KEY = 'mineradio-playback-quality-v1';
window.UPLOAD_TIP_STORE_KEY = 'mineradio-upload-tip-seen';
window.DIY_MODE_STORE_KEY = 'mineradio-diy-player-mode-v1';
window.PLAYLIST_PANEL_PIN_STORE_KEY = 'mineradio-window.playlist-panel-pinned-v1';
window.USER_CAPSULE_AUTO_HIDE_STORE_KEY = 'mineradio-user-capsule-auto-hide-v1';
window.FX_FAB_AUTO_HIDE_STORE_KEY = 'mineradio-window.fx-fab-auto-hide-v1';
window.CONTROLS_AUTO_HIDE_STORE_KEY = 'mineradio-controls-auto-hide-v1';
window.FREE_CAMERA_STORE_KEY = 'mineradio-free-window.camera-v1';
window.HOTKEY_SETTINGS_STORE_KEY = 'mineradio-hotkey-settings-v1';
window.VISUAL_GUIDE_SEEN_STORE_KEY = 'mineradio-visual-guide-seen-v2';
window.LOCAL_BEATMAP_STORE_KEY = 'mineradio-local-beatmaps-v1';
window.LOCAL_BEAT_PREF_STORE_KEY = 'mineradio-local-beatmap-prefs-v1';
window.LOCAL_BEAT_COMBOS = ['', 'downbeat', 'push', 'drop', 'rebound', 'accent'];

// ── Hotkeys ──
window.HOTKEY_ACTIONS = [
  { key:'window.togglePlay', label:'播放 / 暂停', category:'播放', local:'Space', global:'Ctrl+Alt+Space' },
  { key:'window.prevTrack', label:'上一首', category:'播放', local:'ArrowLeft', global:'Ctrl+Alt+ArrowLeft' },
  { key:'window.nextTrack', label:'下一首', category:'播放', local:'ArrowRight', global:'Ctrl+Alt+ArrowRight' },
  { key:'volumeUp', label:'音量增加', category:'音量', local:'ArrowUp', global:'Ctrl+Alt+ArrowUp' },
  { key:'volumeDown', label:'音量降低', category:'音量', local:'ArrowDown', global:'Ctrl+Alt+ArrowDown' },
  { key:'window.toggleFullscreen', label:'全屏', category:'窗口', local:'KeyF', global:'Ctrl+Alt+KeyF' },
  { key:'toggleDesktopLyrics', label:'桌面歌词', category:'歌词', local:'Alt+KeyL', global:'Ctrl+Alt+KeyL' }
];
function getHotkeyDefaults() {
  var defaults = { local: {}, global: {} };
  window.HOTKEY_ACTIONS.forEach(function(action){
    defaults.local[action.key] = action.local || '';
    defaults.global[action.key] = action.global || '';
  });
  return defaults;
};
function readHotkeySettings() {
  var defaults = window.getHotkeyDefaults();
  try {
    var raw = JSON.parse(localStorage.getItem(window.HOTKEY_SETTINGS_STORE_KEY) || '{}') || {};
    return {
      local: Object.assign({}, defaults.local, raw.local || {}),
      global: Object.assign({}, defaults.global, raw.global || {})
    };
  } catch (e) {
    return defaults;
  }
};

// ── Audio / FFT Constants ──
window.FFT_SIZE = 2048;
window.BEAT_FFT_SIZE = 2048;
window.AUDIO_FADE_IN_MS = 460;
window.AUDIO_FADE_OUT_MS = 420;
window.AUDIO_SILENCE_GAIN = 0.0001;

// ── fxDefaults ──
window.fxDefaults = {
  preset: 0,
  intensity: 0.85,
  cinemaShake: 0.5,
  depth: 1.0,
  coverResolution: 1.55,
  point: 1.0, speed: 1.0, twist: 0.0, color: 1.10, scatter: 0.0, bgFade: 0.20,
  bloomStrength: 0.62,
  lyricGlowStrength: 0.28,
  lyricScale: 1.0,
  lyricOffsetX: 0,
  lyricOffsetY: 0,
  lyricOffsetZ: 0,
  lyricTiltX: 0,
  lyricTiltY: 0,
  lyricColorMode: 'auto',
  lyricColor: '#a9b8c8',
  lyricHighlightMode: 'auto',
  lyricHighlightColor: '#fac900',
  lyricGlowLinked: true,
  lyricGlowColor: '#008aff',
  lyricFont: 'hei',
  lyricLetterSpacing: 0,
  lyricLineHeight: 1.0,
  lyricWeight: 900,
  visualTintMode: 'auto',
  visualTintColor: '#9db8cf',
  uiAccentColor: '#ffffff',
  homeAccentColor: '#ffffff',
  homeIconColor: '#ffffff',
  visualIconColor: '#ffffff',
  backgroundColorMode: 'cover',
  backgroundColor: '#000000',
  backgroundOpacity: 1,
  controlGlassChromaticOffset: 90,
  backgroundColorCustom: false,
  backgroundImage: '',
  backgroundMedia: null,
  desktopLyrics: false,
  desktopLyricsSize: 1.0,
  desktopLyricsOpacity: 0.92,
  desktopLyricsY: 0.76,
  desktopLyricsClickThrough: false,
  desktopLyricsCinema: true,
  desktopLyricsHighlight: false,
  desktopLyricsFps: 60,
  wallpaperMode: false,
  wallpaperOpacity: 1,
  floatLayer: false, cinema: true, edge: false, aiDepth: false, bloom: false, lyricGlow: true,
  lyricGlowBeat: true,
  lyricGlowParticles: false,
  lyricCameraLock: false,
  particleLyrics: true,
  backCover: false,
  shelf: 'side',
  shelfCameraMode: 'static',
  shelfPresence: 'always',
  shelfShowPodcasts: false,
  shelfMergeCollections: false,
  shelfSize: 1,
  shelfOffsetX: 0,
  shelfOffsetY: 0,
  shelfOffsetZ: 0,
  shelfAngleY: -15,
  shelfAngleYManual: false,
  shelfOpacity: 1,
  shelfBgOpacity: 0.90,
  shelfAccentColor: '#ffffff',
  performanceBackground: 'auto',
  performanceQuality: 'high',
  liveBackgroundKeep: false,
  cam: 'off',
};

// ── Packaged Defaults ──
window.PACKAGED_DEFAULT_USER_FX_ARCHIVE_NAME = '默认测试';
window.PACKAGED_DEFAULT_USER_FX_ARCHIVE_EXPORTED_AT = 1782276031784;
window.PACKAGED_DEFAULT_USER_FX_ARCHIVE_SAVED_AT = 1782273019045;
window.PACKAGED_DEFAULT_FX_SNAPSHOT = Object.freeze({
  visualPresetSchema: window.VISUAL_PRESET_SCHEMA,
  preset: 0,
  intensity: 0.85,
  cinemaShake: 0.5,
  depth: 1,
  coverResolution: 1.55,
  point: 1,
  speed: 1,
  twist: 0,
  color: 1.1,
  scatter: 0,
  bgFade: 0.2,
  bloomStrength: 0.62,
  lyricGlowStrength: 0.28,
  lyricScale: 1,
  lyricOffsetX: 0,
  lyricOffsetY: 0,
  lyricOffsetZ: 0,
  lyricTiltX: 0,
  lyricTiltY: 0,
  lyricCameraLock: false,
  lyricColorMode: 'auto',
  lyricColor: '#a9b8c8',
  lyricHighlightMode: 'auto',
  lyricHighlightColor: '#fac900',
  lyricGlowLinked: true,
  lyricGlowColor: '#008aff',
  lyricFont: 'hei',
  lyricLetterSpacing: 0,
  lyricLineHeight: 1,
  lyricWeight: 900,
  visualTintMode: 'auto',
  visualTintColor: '#9db8cf',
  uiAccentColor: '#ffffff',
  homeAccentColor: '#ffffff',
  homeIconColor: '#ffffff',
  visualIconColor: '#ffffff',
  backgroundColorMode: 'cover',
  backgroundColor: '#000000',
  backgroundOpacity: 1,
  controlGlassChromaticOffset: 90,
  backgroundColorCustom: false,
  floatLayer: false,
  cinema: true,
  edge: false,
  aiDepth: false,
  bloom: false,
  lyricGlow: true,
  lyricGlowBeat: true,
  lyricGlowParticles: false,
  desktopLyrics: false,
  desktopLyricsSize: 1,
  desktopLyricsOpacity: 0.92,
  desktopLyricsY: 0.76,
  desktopLyricsClickThrough: false,
  desktopLyricsCinema: true,
  desktopLyricsHighlight: false,
  desktopLyricsFps: 60,
  performanceBackground: 'auto',
  performanceQuality: 'high',
  liveBackgroundKeep: false,
  particleLyrics: true,
  backCover: false,
  shelf: 'side',
  shelfCameraMode: 'static',
  shelfPresence: 'always',
  shelfShowPodcasts: false,
  shelfMergeCollections: false,
  shelfSize: 1,
  shelfOffsetX: 0,
  shelfOffsetY: 0,
  shelfOffsetZ: 0,
  shelfAngleY: -15,
  shelfAngleYManual: false,
  shelfOpacity: 1,
  shelfBgOpacity: 0.9,
  shelfAccentColor: '#ffffff',
  cam: 'off'
});
function clonePackagedDefaultFxSnapshot() {
  return Object.assign({}, window.PACKAGED_DEFAULT_FX_SNAPSHOT);
};
function packagedDefaultLyricLayoutRaw() {
  return Object.assign({ desktopLyricsSchema: 'desktop-lyrics-v3' }, window.clonePackagedDefaultFxSnapshot());
};
