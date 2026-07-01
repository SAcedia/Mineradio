window.readSavedVolume = function() {
  try {
    var v = parseFloat(localStorage.getItem('apex-player-volume'));
    return isFinite(v) ? Math.max(0, Math.min(1, v)) : 1.0;
  } catch (e) {
    return 1.0;
  }
}
window.saveDiyModePreference = function(on) {
  try { localStorage.setItem(window.DIY_MODE_STORE_KEY, on ? '1' : '0'); } catch (e) {}
}
window.saveBooleanPreference = function(key, on) {
  try { localStorage.setItem(key, on ? '1' : '0'); } catch (e) {}
}
window.readSavedPlaybackVisualPreset = function() {
  try {
    var raw = JSON.parse(localStorage.getItem(window.LYRIC_LAYOUT_STORE_KEY) || '{}') || {};
    if (!Object.prototype.hasOwnProperty.call(raw, 'preset')) return window.fxDefaults.preset;
    var savedPreset = window.clampRange(Number(raw.preset) || 0, 0, 6);
    if (savedPreset === 3 && raw.visualPresetSchema !== window.VISUAL_PRESET_SCHEMA) savedPreset = 5;
    return savedPreset;
  } catch (e) {
    return window.fxDefaults.preset;
  }
}
