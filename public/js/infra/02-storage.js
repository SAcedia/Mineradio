// 02-storage.js — localStorage utilities extracted from shared.js + prefs.js
// Loads after 01-constants.js (store keys, fxDefaults) and shared.js (clampRange, VISUAL_PRESET_SCHEMA)

function readDiyModePreference() {
  try { return localStorage.getItem(window.DIY_MODE_STORE_KEY) === '1'; } catch (e) { return false; }
};

function readBooleanPreference(key, fallback) {
  try { var v = localStorage.getItem(key); return v == null ? !!fallback : (v === 'true' || v === '1'); } catch (e) { return !!fallback; }
};

function readSavedVolume() {
  try {
    var v = parseFloat(localStorage.getItem('apex-player-volume'));
    return isFinite(v) ? Math.max(0, Math.min(1, v)) : 1.0;
  } catch (e) {
    return 1.0;
  }
};

function saveDiyModePreference(on) {
  try { localStorage.setItem(window.DIY_MODE_STORE_KEY, on ? '1' : '0'); } catch (e) {}
};

function saveBooleanPreference(key, on) {
  try { localStorage.setItem(key, on ? '1' : '0'); } catch (e) {}
};

function readSavedPlaybackVisualPreset() {
  try {
    var raw = JSON.parse(localStorage.getItem(window.LYRIC_LAYOUT_STORE_KEY) || '{}') || {};
    if (!Object.prototype.hasOwnProperty.call(raw, 'preset')) return window.fxDefaults.preset;
    var savedPreset = window.clampRange(Number(raw.preset) || 0, 0, 6);
    if (savedPreset === 3 && raw.visualPresetSchema !== window.VISUAL_PRESET_SCHEMA) savedPreset = 5;
    return savedPreset;
  } catch (e) {
    return window.fxDefaults.preset;
  }
};
