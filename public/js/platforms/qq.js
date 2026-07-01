// ============================================================
//  platforms/qq.js — QQ 音乐 API 封装
// ============================================================

function qqApi(path, params) {
  var qs = params ? '?' + (typeof params === 'string' ? params : new URLSearchParams(params).toString()) : '';
  return apiJson('/api/qq' + path + qs);
}

function qqQs(names, args) {
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
  { name: 'SongUrl',       path: '/song/url',       params: ['mid','mediaMid','quality'] },
  { name: 'PlaylistTracks',path: '/playlist/tracks', params: ['id'] },
  { name: 'LoginStatus',   path: '/login/status',   params: [] },
  { name: 'LoginCookie',   path: '/login/cookie',   params: ['cookie'] },
  { name: 'Logout',        path: '/logout',         params: [] },
  { name: 'UserPlaylists', path: '/user/playlists', params: [] },
];

window.Mineradio.platforms = window.Mineradio.platforms || {};
window.Mineradio.platforms.qq = {};

for (var i = 0; i < qqAPIList.length; i++) {
  (function(entry) {
    var fn = function() {
      var args = {};
      for (var ai = 0; ai < entry.params.length; ai++) args[entry.params[ai]] = arguments[ai];
      return qqApi(entry.path, qqQs(entry.params, args));
    };
    var key = entry.name.charAt(0).toLowerCase() + entry.name.slice(1);
    window.Mineradio.platforms.qq[key] = fn;
  })(qqAPIList[i]);
}