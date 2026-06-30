// ============================================================
//  platforms/youtube.js — YouTube API 封装
// ============================================================

function youtubeApi(path, params) {
  var qs = params ? '?' + (typeof params === 'string' ? params : new URLSearchParams(params).toString()) : '';
  return apiJson('/api/youtube' + path + qs);
}

function youtubeSearch(keywords, limit) {
  return youtubeApi('/search', 'keywords=' + encodeURIComponent(keywords) + '&limit=' + (limit || 18));
}

function youtubeSongUrl(id, quality) {
  var params = 'id=' + encodeURIComponent(id);
  if (quality) params += '&quality=' + encodeURIComponent(quality);
  return youtubeApi('/song/url', params);
}

function youtubeTrending() {
  return youtubeApi('/trending', 't=' + Date.now());
}