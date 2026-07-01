//  Cover helpers
// ============================================================
window.readCustomCoverMap = function() {
  try {
    var raw = localStorage.getItem(window.CUSTOM_COVER_STORE_KEY);
    var parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (e) {
    return {};
  }
}
window.saveCustomCoverMap = function() {
  try {
    localStorage.setItem(window.CUSTOM_COVER_STORE_KEY, JSON.stringify(window.customCoverMap || {}));
    return true;
  } catch (e) {
    console.warn('custom cover save failed:', e);
    return false;
  }
}
window.isInlineCoverSrc = function(src) {
  return typeof src === 'string' && (/^data:image\//i.test(src) || /^blob:/i.test(src));
}
window.isProxyableCoverUrl = function(url) {
  return /^https?:\/\//i.test(String(url || ''));
}
window.coverProxySrc = function(url, cacheBust) {
  if (!url) return '';
  if (window.isInlineCoverSrc(url)) return url;
  if (!window.isProxyableCoverUrl(url)) return '';
  return '/api/cover?url=' + encodeURIComponent(url) + (cacheBust ? '&v=' + Date.now() : '');
}
window.coverUrlWithSize = function(url, size) {
  if (!url || window.isInlineCoverSrc(url) || !/^https?:\/\//i.test(url)) return url || '';
  if (!size) return url;
  var param = 'param=' + size + 'y' + size;
  if (/[?&]param=\d+y\d+/i.test(url)) return url.replace(/([?&])param=\d+y\d+/i, '$1' + param);
  return url + (url.indexOf('?') >= 0 ? '&' : '?') + param;
}
window.songCustomCoverKey = function(song) {
  if (!song) return '';
  if (song.customCoverKey) return String(song.customCoverKey);
  if (song.provider === 'qq' || song.source === 'qq' || song.type === 'qq') return 'qq:' + (song.mid || song.songmid || song.id || (song.name + '|' + song.artist));
  if (song.localKey) return 'local:' + song.localKey;
  if (song.type === 'podcast' && song.programId) return 'podcast:' + song.programId;
  if (song.id != null && song.id !== '') return 'id:' + song.id;
  var title = String(song.name || song.title || '').trim();
  var artist = String(song.artist || '').trim();
  return (title || artist) ? ('meta:' + (title + '|' + artist).slice(0, 220)) : '';
}
window.getCustomCoverForSong = function(song) {
  if (!song || typeof song !== "object") return "";
  if (!song) return '';
  if (song.customCover) return song.customCover;
  var key = window.songCustomCoverKey(song);
  return key && window.customCoverMap[key] ? window.customCoverMap[key] : '';
}
window.hydrateCustomCover = function(song) {
  if (!song) return song;
  var custom = window.getCustomCoverForSong(song);
  if (custom) song.customCover = custom;
  return song;
}
window.songCoverSrc = function(song, size) {
  var custom = window.getCustomCoverForSong(song);
  if (custom) return custom;
  return song && song.cover ? window.coverUrlWithSize(song.cover, size) : '';
}
window.cssImageUrl = function(url) {
  return String(url || '').replace(/\\/g, '\\\\').replace(/"/g, '%22');
}
window.setCustomCoverForCurrent = function(dataUrl, opts) {
  if (!dataUrl) return;
  var song = window.currentCoverSong();
  var saved = false;
  var hasKey = false;
  if (song) {
    var key = window.songCustomCoverKey(song);
    song.customCover = dataUrl;
    if (key) {
      hasKey = true;
      window.customCoverMap[key] = dataUrl;
      saved = window.saveCustomCoverMap();
      for (var i = 0; i < window.playQueue.length; i++) {
        if (window.songCustomCoverKey(window.playQueue[i]) === key) window.playQueue[i].customCover = dataUrl;
      }
      if (currentLocalSong && window.songCustomCoverKey(currentLocalSong) === key) currentLocalSong.customCover = dataUrl;
    }
  }
  applyCoverDataUrl(dataUrl, opts);
  window.safeRenderQueuePanel('custom-cover-apply', { scrollCurrent: window.miniQueueOpen });
  window.safeShelfRebuild('custom-cover-apply');
  window.updateCustomCoverButton();
  window.showToast(song ? (!hasKey ? '封面已应用' : (saved ? '封面已保存' : '封面已应用，存储空间不足')) : '已应用临时封面');
}
window.updateCustomCoverButton = function() {
  var btn = document.getElementById('clear-cover-btn');
  var hasCover = !!window.getCustomCoverForSong(window.currentCoverSong());
  var area = document.getElementById('search-area');
  if (area) area.classList.toggle('has-cover-action', hasCover);
  if (!btn) return;
  btn.classList.toggle('has-cover', hasCover);
  btn.title = hasCover ? '取消自定义封面' : '当前没有自定义封面';
  btn.setAttribute('aria-label', btn.title);
}
window.clearCustomCoverForCurrent = function() {
  var song = window.currentCoverSong();
  if (!song) {
    window.showToast('先播放或选择一首歌');
    window.updateCustomCoverButton();
    return;
  }
  var custom = window.getCustomCoverForSong(song);
  if (!custom) {
    window.showToast('当前没有自定义封面');
    window.updateCustomCoverButton();
    return;
  }
  var key = window.songCustomCoverKey(song);
  if (key && window.customCoverMap[key]) {
    delete window.customCoverMap[key];
    window.saveCustomCoverMap();
  }
  delete window.playlistCoverCache[custom];
  delete song.customCover;
  if (key) {
    for (var i = 0; i < window.playQueue.length; i++) {
      if (window.songCustomCoverKey(window.playQueue[i]) === key) delete window.playQueue[i].customCover;
    }
  }
  if (key && currentLocalSong && window.songCustomCoverKey(currentLocalSong) === key) delete currentLocalSong.customCover;
  if (window.currentIdx >= 0 && window.playQueue[window.currentIdx] && window.playQueue[window.currentIdx].cover) loadCoverFromUrl(window.coverUrlWithSize(window.playQueue[window.currentIdx].cover, 400));
  else loadCoverFromUrl('');
  window.safeRenderQueuePanel('custom-cover-clear', { scrollCurrent: window.miniQueueOpen });
  window.safeShelfRebuild('custom-cover-clear');
  window.updateCustomCoverButton();
  window.showToast('已恢复默认封面');
}
