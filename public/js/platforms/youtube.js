// ============================================================
//  platforms/youtube.js — YouTube API 封装
// ============================================================

function youtubeApi(path, params) {
  var qs = params ? '?' + (typeof params === 'string' ? params : new URLSearchParams(params).toString()) : '';
  return apiJson('/api/youtube' + path + qs);
}

function youtubeQs(names, args) {
  var parts = [];
  for (var i = 0; i < names.length; i++) {
    var key = names[i];
    var val = args[key];
    if (val != null) parts.push(key + '=' + encodeURIComponent(val));
  }
  return parts.join('&');
}

var youtubeAPIList = [
  { name: 'Search',      path: '/search',     params: ['keywords','limit'] },
  { name: 'SongUrl',     path: '/song/url',   params: ['id','quality'] },
  { name: 'Trending',    path: '/trending',   params: ['region'] },
  { name: 'Login',       path: '/login',      params: ['cookie'] },
  { name: 'Logout',      path: '/logout',     params: [] },
  { name: 'Playlists',   path: '/playlists',  params: [] },
  { name: 'LikeCheck',   path: '/like/check', params: ['id'] },
  { name: 'Like',        path: '/like',       params: ['id','like'] },
];

for (var i = 0; i < youtubeAPIList.length; i++) {
  (function(entry) {
    var fnName = 'youtube' + entry.name;
    var fn = window[fnName];
    if (!fn) {
      fn = function() {
        var args = {};
        for (var ai = 0; ai < entry.params.length; ai++) args[entry.params[ai]] = arguments[ai];
        return youtubeApi(entry.path, youtubeQs(entry.params, args));
      };
    }
    window[fnName] = fn;
  })(youtubeAPIList[i]);
}