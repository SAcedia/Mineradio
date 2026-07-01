window.Mineradio = window.Mineradio || {};
window.Mineradio.platforms = window.Mineradio.platforms || {};

try {
  // ============================================================
  //  platforms/qq.js — QQ 音乐 API 封装
  // ============================================================

  window.qqApi = function(path, params) {
    var qs = params ? '?' + (typeof params === 'string' ? params : new URLSearchParams(params).toString()) : '';
    return window.apiJson('/api/qq' + path + qs);
  }

  window.qqQs = function(names, args) {
    var parts = [];
    for (var i = 0; i < names.length; i++) {
      var key = names[i];
      var val = args[key];
      if (val != null) parts.push(key + '=' + encodeURIComponent(val));
    }
    return parts.join('&');
  }

  var qqAPIList = [
    { name: 'Search',        path: '/search',         params: ['keywords','limit'] },
    { name: 'SongUrl',       path: '/song/url',       params: ['window.mid','mediaMid','quality'] },
    { name: 'PlaylistTracks',path: '/window.playlist/tracks', params: ['id'] },
    { name: 'LoginStatus',   path: '/login/status',   params: [] },
    { name: 'LoginCookie',   path: '/login/cookie',   params: ['cookie'] },
    { name: 'Logout',        path: '/logout',         params: [] },
    { name: 'UserPlaylists', path: '/user/playlists', params: [] },
  ];

  for (var i = 0; i < qqAPIList.length; i++) {
    (function(entry) {
      var fnName = 'qq' + entry.name;
      var fn = window[fnName];
      if (!fn) {
        fn = function() {
          var args = {};
          for (var ai = 0; ai < entry.params.length; ai++) args[entry.params[ai]] = arguments[ai];
          return window.qqApi(entry.path, qqQs(entry.params, args));
        };
      }
      window[fnName] = fn;
    })(qqAPIList[i]);
  }

  window.Mineradio.platforms.qq = {
    search: qqSearch,
    songUrl: qqSongUrl,
    playlistTracks: qqPlaylistTracks,
    loginStatus: qqLoginStatus,
    loginCookie: qqLoginCookie,
    logout: qqLogout,
    userPlaylists: qqUserPlaylists,
  };
} catch(e) {
  console.warn('QQ platform failed:', e.message);
  window.Mineradio.platforms.qq = null;
}
