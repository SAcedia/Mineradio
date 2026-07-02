// 00-utils.js — Pure utility functions (no side effects, no DOM, no localStorage)
// Extracted from shared.js

function clamp01(v) {
  return Math.max(0, Math.min(1, v));
}

function clampRange(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function songProviderKey(song) {
  if (song && (song.provider === 'qq' || song.source === 'qq' || song.type === 'qq')) return 'qq';
  if (song && (song.provider === 'youtube' || song.source === 'youtube' || song.type === 'youtube')) return 'youtube';
  return 'netease';
}

function openGsapModal(mask) {
  if (!mask) return;
  var panel = mask.querySelector('.modal');
  mask.classList.add('show');
  if (window.gsap) {
    window.gsap.killTweensOf(mask);
    if (panel) window.gsap.killTweensOf(panel);
    window.gsap.set(mask, { display: 'flex', visibility: 'visible' });
    window.gsap.fromTo(mask,
      { autoAlpha: 0 },
      { autoAlpha: 1, duration: 0.38, ease: 'power2.out', overwrite: true }
    );
    if (panel) {
      window.gsap.fromTo(panel,
        { autoAlpha: 0, y: 26, scale: 0.965, filter: 'blur(12px)' },
        { autoAlpha: 1, y: 0, scale: 1, filter: 'blur(0px)', duration: 0.68, ease: 'expo.out', overwrite: true }
      );
    }
  } else {
    mask.style.display = 'flex';
    mask.style.visibility = 'visible';
    mask.style.opacity = '1';
  }
}

function closeGsapModal(mask, afterClose) {
  if (!mask || !mask.classList.contains('show')) {
    if (afterClose) afterClose();
    return;
  }
  var panel = mask.querySelector('.modal');
  function finish() {
    mask.classList.remove('show');
    if (window.gsap) {
      window.gsap.set(mask, { clearProps: 'display,visibility,opacity' });
      if (panel) window.gsap.set(panel, { clearProps: 'opacity,visibility,transform,filter' });
    } else {
      mask.style.display = '';
      mask.style.visibility = '';
      mask.style.opacity = '';
    }
    if (afterClose) afterClose();
  }
  if (window.gsap) {
    window.gsap.killTweensOf(mask);
    if (panel) {
      window.gsap.killTweensOf(panel);
      window.gsap.to(panel, { autoAlpha: 0, y: 18, scale: 0.976, filter: 'blur(8px)', duration: 0.28, ease: 'power2.in', overwrite: true });
    }
    window.gsap.to(mask, { autoAlpha: 0, duration: 0.34, ease: 'power2.inOut', overwrite: true, onComplete: finish });
  } else {
    finish();
  }
}

function bindModalBackdropClose() {
  [
    ['track-detail-modal', closeTrackDetailModal],
    ['login-modal', closeLoginModal],
    ['user-modal', closeUserModal],
    ['custom-lyric-modal', closeCustomLyricModal],
    ['update-modal', closeUpdatePanel]
  ].forEach(function(pair){
    var mask = document.getElementById(pair[0]);
    var close = pair[1];
    if (!mask || !close || mask.__backdropCloseBound) return;
    mask.__backdropCloseBound = true;
    mask.addEventListener('click', function(e){
      if (e.target === mask) close();
    });
  });
}

function getHotkeyDefaults() {
  var defaults = { local: {}, global: {} };
  HOTKEY_ACTIONS.forEach(function(action){
    defaults.local[action.key] = action.local || '';
    defaults.global[action.key] = action.global || '';
  });
  return defaults;
}

function readHotkeySettings() {
  var defaults = getHotkeyDefaults();
  try {
    var raw = JSON.parse(localStorage.getItem(HOTKEY_SETTINGS_STORE_KEY) || '{}') || {};
    return {
      local: Object.assign({}, defaults.local, raw.local || {}),
      global: Object.assign({}, defaults.global, raw.global || {})
    };
  } catch (e) {
    return defaults;
  }
}

function _cacheKeyForSong(song) {
  var provider = songProviderKey(song);
  return provider + ':' + (song.id || song.mid || song.songmid || (song.name + '|' + song.artist));
}

function clonePackagedDefaultFxSnapshot() {
  return Object.assign({}, PACKAGED_DEFAULT_FX_SNAPSHOT);
}

function packagedDefaultLyricLayoutRaw() {
  return Object.assign({ desktopLyricsSchema: 'desktop-lyrics-v3' }, clonePackagedDefaultFxSnapshot());
}
function escHtml(s) { var d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

// ============================================================
//  Storage — safe JSON localStorage wrapper
// ============================================================
function storageGet(key, fallback) {
  try {
    var raw = localStorage.getItem(key);
    if (raw == null) return fallback;
    // 尝试 JSON 解析；若失败（纯字符串存储），返回原值
    try { return JSON.parse(raw); } catch (e) { return raw; }
  } catch (e) { return fallback; }
}
function storageSet(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch (e) { return false; }
}
function storageRemove(key) {
  try { localStorage.removeItem(key); return true; } catch (e) { return false; }
}

// ============================================================
//  API — async fetch wrapper
// ============================================================
window.apiJson = async function(url, opts) {
  opts = opts || {};
  var timeoutMs = Number(opts.timeoutMs) || 0;
  var fetchOpts = Object.assign({}, opts);
  delete fetchOpts.timeoutMs;
  var timer = null;
  if (timeoutMs && window.AbortController && !fetchOpts.signal) {
    var controller = new AbortController();
    fetchOpts.signal = controller.signal;
    timer = setTimeout(function() { controller.abort(); }, timeoutMs);
  }
  try {
    return (await fetch(url, fetchOpts)).json();
  } finally {
    if (timer) clearTimeout(timer);
  }
};

// ============================================================
//  Namespace Exports
// ============================================================
window.Mineradio = window.Mineradio || {};
Mineradio.util = {
  clamp01: clamp01,
  clampRange: clampRange,
  songProviderKey: songProviderKey,
  openGsapModal: openGsapModal,
  closeGsapModal: closeGsapModal,
  bindModalBackdropClose: bindModalBackdropClose,
  getHotkeyDefaults: getHotkeyDefaults,
  readHotkeySettings: readHotkeySettings,
  _cacheKeyForSong: _cacheKeyForSong,
  clonePackagedDefaultFxSnapshot: clonePackagedDefaultFxSnapshot,
  packagedDefaultLyricLayoutRaw: packagedDefaultLyricLayoutRaw,
  escHtml: escHtml,
  apiJson: apiJson,
  storageGet: storageGet,
  storageSet: storageSet,
  storageRemove: storageRemove
};