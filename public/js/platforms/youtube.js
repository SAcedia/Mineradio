// ============================================================
//  platforms/youtube.js — YouTube API 封装
// ============================================================

window.Mineradio = window.Mineradio || {};
window.Mineradio.platforms = window.Mineradio.platforms || {};

try {
  window.youtubeApi = function(path, params) {
    var qs = params ? '?' + (typeof params === 'string' ? params : new URLSearchParams(params).toString()) : '';
    return window.apiJson('/api/youtube' + path + qs);
  }

  window.youtubeQs = function(names, args) {
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
          return window.youtubeApi(entry.path, youtubeQs(entry.params, args));
        };
      }
      window[fnName] = fn;
    })(youtubeAPIList[i]);
  }

  window.Mineradio.platforms.youtube = {
    search: window.youtubeSearch,
    songUrl: window.youtubeSongUrl,
    trending: window.youtubeTrending,
    loginCookie: window.youtubeLogin,
    logout: window.youtubeLogout,
    playlists: window.youtubePlaylists,
    likeCheck: window.youtubeLikeCheck,
    likeToggle: window.youtubeLike,
  };
} catch(e) {
  console.warn('YouTube platform failed to load:', e.message);
  window.Mineradio.platforms.youtube = null;
}
