// 02-storage.js — localStorage preference read/write functions
// Extracted from shared.js + core/prefs.js

function readDiyModePreference() {
  try { return localStorage.getItem(DIY_MODE_STORE_KEY) === '1'; } catch (e) { return false; }
}

function readBooleanPreference(key, fallback) {
  try { var v = localStorage.getItem(key); return v == null ? !!fallback : (v === 'true' || v === '1'); } catch (e) { return !!fallback; }
}

function readSavedVolume() {
  try {
    var v = parseFloat(localStorage.getItem('apex-player-volume'));
    return isFinite(v) ? Math.max(0, Math.min(1, v)) : 1.0;
  } catch (e) {
    return 1.0;
  }
}

function saveDiyModePreference(on) {
  try { localStorage.setItem(DIY_MODE_STORE_KEY, on ? '1' : '0'); } catch (e) {}
}

function saveBooleanPreference(key, on) {
  try { localStorage.setItem(key, on ? '1' : '0'); } catch (e) {}
}

function readSavedPlaybackVisualPreset() {
  try {
    var raw = JSON.parse(localStorage.getItem(LYRIC_LAYOUT_STORE_KEY) || '{}') || {};
    if (!Object.prototype.hasOwnProperty.call(raw, 'preset')) return fxDefaults.preset;
    var savedPreset = clampRange(Number(raw.preset) || 0, 0, 6);
    if (savedPreset === 3 && raw.visualPresetSchema !== VISUAL_PRESET_SCHEMA) savedPreset = 5;
    return savedPreset;
  } catch (e) {
    return fxDefaults.preset;
  }
}
