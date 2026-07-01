window.Mineradio = window.Mineradio || {};
window.Mineradio.platforms = window.Mineradio.platforms || {};

try {
  // ============================================================
  //  platforms/netease.js — 网易云音乐 API 封装
  //  函数由配置表 neteaseAPIList 自动生成
  // ============================================================

  window.neteaseApi = function(path, params) {
    var qs = params ? '?' + (typeof params === 'string' ? params : new URLSearchParams(params).toString()) : '';
    return window.apiJson('/api' + path + qs);
  }

  // 将参数名数组转为编码后的 query string
  window.neteaseQs = function(names, args) {
    var parts = [];
    for (var i = 0; i < names.length; i++) {
      var key = names[i];
      // 特殊参数：_join 表示将数组 join(',') 编码
      if (key === '_join') { parts.push(key + '=' + encodeURIComponent(args[key].join(','))); continue; }
      var val = args[key];
      if (val != null) parts.push(key + '=' + encodeURIComponent(val));
    }
    return parts.join('&');
  }

  // API 配置表：{ name, path, params }
  // name→neteaseXxx，params 数组中参数按序映射到函数形参
  // 特殊参数名：_join 表示数组参数需要 join(',')
  var neteaseAPIList = [
    { name: 'Search',           path: '/search',             params: ['keywords','limit'] },
    { name: 'SongUrl',          path: '/song/url',           params: ['id','quality'] },
    { name: 'PlaylistTracks',   path: '/window.playlist/tracks',    params: ['id'] },
    { name: 'PlaylistCreate',   path: '/window.playlist/create',    params: ['name'] },
    { name: 'PlaylistAddSong',  path: '/window.playlist/add-song',  params: ['pid','songId'] },
    { name: 'LikeCheck',        path: '/song/like/check',    params: ['_join'] },
    { name: 'Like',             path: '/song/like',          params: ['id','like'] },
    { name: 'Lyric',            path: '/lyric',              params: ['id'] },
    { name: 'LyricSearch',      path: '/lyric/search',       params: ['name','artist'] },
    { name: 'LoginStatus',      path: '/login/status',       params: [] },
    { name: 'LoginQrKey',       path: '/login/qr/key',       params: [] },
    { name: 'LoginQrCreate',    path: '/login/qr/create',    params: ['key'] },
    { name: 'LoginQrCheck',     path: '/login/qr/check',     params: ['key'] },
    { name: 'LoginCookie',      path: '/login/cookie',       params: ['cookie'] },
    { name: 'UserPlaylists',    path: '/user/playlists',     params: [] },
    { name: 'PodcastHot',       path: '/podcast/hot',        params: ['limit'] },
    { name: 'PodcastSearch',    path: '/podcast/search',     params: ['keywords','limit'] },
    { name: 'PodcastPrograms',  path: '/podcast/programs',   params: ['id','limit'] },
    { name: 'PodcastMy',        path: '/podcast/my',         params: [] },
    { name: 'PodcastMyItems',   path: '/podcast/my/items',   params: ['key','limit'] },
    { name: 'DiscoverHome',     path: '/discover/home',      params: [] },
    { name: 'WeatherIpLocation',path: '/weather/ip-location', params: [] },
    { name: 'BeatmapCacheStatus',path: '/beatmap/cache/status', params: [] },
    { name: 'BeatmapCacheGet',  path: '/beatmap/cache',      params: ['key'] },
    { name: 'UpdateLatest',     path: '/update/latest',      params: [] },
  ];

  // 部分 API 需要额外处理 params，用 _override 覆盖
  var neteaseOverrides = {
    LikeCheck:  function(ids)    { return neteaseApi('/song/like/check', neteaseQs(['_join'], { _join: ids })); },
    Like:       function(id,like){ return neteaseApi('/song/like', neteaseQs(['id','like'], { id:id, like:like })); },
    PlaylistAddSong: function(pid,songId) { return neteaseApi('/window.playlist/add-song', neteaseQs(['pid','songId'], { pid:pid, songId:songId })); },
    BeatmapCacheGet: function(key) { return neteaseApi('/beatmap/cache', neteaseQs(['key'], { key:key }) + '&t=' + Date.now()); },
    UpdateLatest: function()    { return neteaseApi('/update/latest', 't=' + Date.now()); },
    DiscoverHome: function()    { return neteaseApi('/discover/home', 't=' + Date.now()); },
    WeatherIpLocation: function(){ return neteaseApi('/weather/ip-location', 't=' + Date.now()); },
    BeatmapCacheStatus: function(){ return neteaseApi('/beatmap/cache/status', 't=' + Date.now()); },
  };

  // 自动生成函数
  for (var i = 0; i < neteaseAPIList.length; i++) {
    (function(entry) {
      var fnName = 'netease' + entry.name;
      var fn = neteaseOverrides[entry.name];
      if (!fn) {
        fn = function() {
          var args = {};
          for (var ai = 0; ai < entry.params.length; ai++) args[entry.params[ai]] = arguments[ai];
          return neteaseApi(entry.path, neteaseQs(entry.params, args));
        };
      }
      window[fnName] = fn;
    })(neteaseAPIList[i]);
  }

  window.Mineradio.platforms.netease = {
    search: neteaseSearch,
    songUrl: neteaseSongUrl,
    playlistTracks: neteasePlaylistTracks,
    loginQrKey: neteaseLoginQrKey,
    loginQrCreate: neteaseLoginQrCreate,
    loginQrCheck: neteaseLoginQrCheck,
    loginStatus: neteaseLoginStatus,
    loginCookie: neteaseLoginCookie,
    userPlaylists: neteaseUserPlaylists,
    likeCheck: neteaseLikeCheck,
    like: neteaseLike,
    playlistCreate: neteasePlaylistCreate,
    playlistAddSong: neteasePlaylistAddSong,
    lyric: neteaseLyric,
    lyricSearch: neteaseLyricSearch,
    discoverHome: neteaseDiscoverHome,
    weatherIpLocation: neteaseWeatherIpLocation,
    podcastHot: neteasePodcastHot,
    podcastSearch: neteasePodcastSearch,
    podcastPrograms: neteasePodcastPrograms,
    podcastMy: neteasePodcastMy,
    podcastMyItems: neteasePodcastMyItems,
    beatmapCacheStatus: neteaseBeatmapCacheStatus,
    beatmapCacheGet: neteaseBeatmapCacheGet,
    updateLatest: neteaseUpdateLatest,
  };
} catch(e) {
  console.warn('Netease platform failed:', e.message);
  window.Mineradio.platforms.netease = null;
}
