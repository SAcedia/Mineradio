// ============================================================
//  platforms/qq.js — QQ 音乐 API 封装
// ============================================================

function qqApi(path, params) {
  var qs = params ? '?' + (typeof params === 'string' ? params : new URLSearchParams(params).toString()) : '';
  return apiJson('/api/qq' + path + qs);
}

function qqSearch(keywords, limit) {
  return qqApi('/search', 'keywords=' + encodeURIComponent(keywords) + '&limit=' + (limit || 12));
}

function qqSongUrl(song, quality) {
  var mid = encodeURIComponent(song.mid || song.songmid || song.id || '');
  var mediaMid = encodeURIComponent(song.mediaMid || song.media_mid || '');
  var qs = 'mid=' + mid + '&mediaMid=' + mediaMid;
  if (quality) qs += '&quality=' + encodeURIComponent(quality);
  return qqApi('/song/url', qs);
}

function qqPlaylistTracks(id) {
  return qqApi('/playlist/tracks', 'id=' + encodeURIComponent(id));
}

function qqLoginStatus() {
  return qqApi('/login/status', 't=' + Date.now());
}

function qqLoginCookie(cookieStr) {
  return qqApi('/login/cookie', 'cookie=' + encodeURIComponent(cookieStr));
}

function qqLogout() {
  return qqApi('/logout');
}

function qqUserPlaylists() {
  return qqApi('/user/playlists');
}