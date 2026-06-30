//  Like helpers
// ============================================================
window.isCloudSong = function(song) {
  if (!song || !song.id) return false;
  if (song.provider === 'qq' || song.source === 'qq' || song.type === 'qq') return false;
  if (song.type === 'local' || song.type === 'podcast' || song.source === 'podcast') return false;
  return !song.provider || song.provider === 'netease' || song.source === 'netease' || song.type === 'song';
}
window.isSongLiked = function(song) {
  if (!song || !song.id) return false;
  if (likedSongMap[String(song.id)]) return true;
  if (songProviderKey(song) === 'youtube') {
    try { return localStorage.getItem('mineradio-local-like-youtube:' + String(song.id)) !== null; } catch(e) { return false; }
  }
  return false;
}
window.ensureLoggedInForAction = function() {
  if (loginStatus.loggedIn) return true;
  showToast('登录后可同步到网易云');
  showLoginModal();
  return false;
}
window.updateLikeButtons = function(song) {
  song = song || currentCoverSong();
  var liked = isSongLiked(song);
  var busy = !!(song && song.id && likeBusyMap[String(song.id)]);
  var btn = document.getElementById('heart-btn');
  if (btn) {
    btn.classList.toggle('liked', liked);
    btn.classList.toggle('busy', busy);
    btn.title = liked ? '取消红心' : '红心喜欢';
  }
  var collectBtn = document.getElementById('collect-btn');
  if (collectBtn) collectBtn.classList.toggle('busy', collectBusy);
}
window.heartIconSvg = function() {
  return '<svg class="heart-svg" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21.45c-.32 0-.62-.12-.86-.34l-1.23-1.12C5.54 16.03 2.25 13.05 2.25 8.9 2.25 5.48 4.88 2.9 8.28 2.9c1.7 0 3.35.72 4.52 1.96C13.97 3.62 15.62 2.9 17.32 2.9c3.4 0 6.03 2.58 6.03 6 0 4.15-3.29 7.13-7.66 11.09l-1.23 1.12c-.24.22-.54.34-.86.34z"/></svg>';
}
window.playlistPlusIconSvg = function() {
  return '<svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h10"/><path d="M4 11h10"/><path d="M4 16h7"/><path d="M18 14v6"/><path d="M15 17h6"/></svg>';
}
window.artistCollectTrayIconSvg = function() {
  return '<svg fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v9"/><path d="M7.5 9.5h9"/><path d="M4.5 12.5v6h15v-6"/></svg>';
}
window.artistNextPlusIconSvg = function() {
  return '<svg fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5.5v13"/><path d="M5.5 12h13"/></svg>';
}
window.songActionHtml = function(kind, source, index, song) {
  var liked = isSongLiked(song);
  if (kind === 'like') {
    return '<button class="song-action-btn' + (liked ? ' liked' : '') + '" title="' + (liked ? '取消红心' : '红心喜欢') + '" onclick="event.stopPropagation();toggleLike' + source + '(' + index + ')">' + heartIconSvg() + '</button>';
  }
  return '<button class="song-action-btn" title="收藏到歌单" onclick="event.stopPropagation();collect' + source + '(' + index + ')">' + playlistPlusIconSvg() + '</button>';
}
window.syncLikeStatusForSongs = function(songs) {
  if (!loginStatus.loggedIn || !songs || !songs.length) return;
  var ids = songs.filter(isCloudSong).map(function(s){ return String(s.id); });
  if (!ids.length) return;
  var token = ++likeStatusToken;
  neteaseLikeCheck(ids).then(function(r){
    if (token < likeStatusToken - 3 || !r || !r.liked) return;
    Object.keys(r.liked).forEach(function(id){ likedSongMap[String(id)] = !!r.liked[id]; });
    safeRenderQueuePanel('like-status-sync', { scrollCurrent: miniQueueOpen });
    if ($results && $results.classList.contains('show')) refreshSearchResultActionStates();
    updateLikeButtons();
  }).catch(function(err){ console.warn('like check failed:', err); });
}
window.syncLikeStatusForSong = function(song) {
  if (!isCloudSong(song)) { updateLikeButtons(song); return; }
  syncLikeStatusForSongs([song]);
}
window.isLikedPlaylistContext = function(id, title, meta) {
  var sid = String(id || '');
  var text = String(title || (meta && meta.name) || '').trim();
  var hit = userPlaylists.find(function(pl){ return String(pl.id || '') === sid; });
  if (hit) {
    if (Number(hit.specialType || 0) === 5) return true;
    text = text || hit.name || '';
  }
  return /我喜欢|喜欢的音乐|liked/i.test(text);
}
window.markSongsLiked = function(songs, liked) {
  (songs || []).forEach(function(song){
    if (isCloudSong(song)) likedSongMap[String(song.id)] = !!liked;
  });
}
window.refreshSearchResultActionStates = function() {
  if (!playlist || !$results || !$results.children.length) return;
  Array.prototype.forEach.call($results.querySelectorAll('[data-like-index]'), function(btn){
    var i = Number(btn.getAttribute('data-like-index'));
    var song = playlist[i];
    var liked = isSongLiked(song);
    btn.classList.toggle('liked', liked);
    btn.title = liked ? '取消红心' : '红心喜欢';
  });
}
window.toggleLikeSong = async function(song) {
  if (!song || !song.id) return;
  var id = String(song.id);
  if (songProviderKey(song) === 'youtube') {
    var key = 'mineradio-local-like-youtube:' + id;
    var next = !likedSongMap[id];
    likeBusyMap[id] = true;
    likedSongMap[id] = next;
    try {
      if (next) {
        localStorage.setItem(key, JSON.stringify({ liked: true, name: song.name, artist: song.artist, cover: song.cover, savedAt: Date.now() }));
      } else {
        localStorage.removeItem(key);
      }
    } catch(e) {}
    likeBusyMap[id] = false;
    updateLikeButtons(song);
    safeRenderQueuePanel('like-toggle-optimistic', { scrollCurrent: miniQueueOpen });
    refreshSearchResultActionStates();
    showToast(next ? '已加入红心喜欢' : '已取消红心');
    return;
  }
  if (!isCloudSong(song)) {
    showToast(songProviderKey(song) === 'qq' ? 'QQ 音乐红心同步待登录接口接入' : '本地文件暂不支持红心同步');
    return;
  }
  if (!ensureLoggedInForAction()) return;
  var id = String(song.id);
  if (likeBusyMap[id]) return;
  var next = !likedSongMap[id];
  likeBusyMap[id] = true;
  likedSongMap[id] = next;
  updateLikeButtons(song);
  safeRenderQueuePanel('like-toggle-optimistic', { scrollCurrent: miniQueueOpen });
  refreshSearchResultActionStates();
  try {
    var r = await neteaseLike(id, String(next));
    if (r && r.error) throw new Error(r.error);
    likedSongMap[id] = next;
    showToast(next ? '已加入红心喜欢' : '已取消红心');
  } catch (err) {
    likedSongMap[id] = !next;
    showToast('红心操作失败');
  } finally {
    delete likeBusyMap[id];
    updateLikeButtons(song);
    safeRenderQueuePanel('like-toggle-final', { scrollCurrent: miniQueueOpen });
    refreshSearchResultActionStates();
  }
}
window.toggleLikeCurrent = function() {
 toggleLikeSong(currentCoverSong()); }
window.toggleLikeSearchResult = function(i) {
 if (playlist[i]) toggleLikeSong(playlist[i]); }
window.toggleLikeQueueIndex = function(i) {
 if (playQueue[i]) toggleLikeSong(playQueue[i]); }
window.toggleLikeDetailSong = function(song) {
 toggleLikeSong(song); }
