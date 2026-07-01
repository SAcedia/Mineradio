//  本地歌单（localStorage 存储）
// ============================================================
window.LOCAL_PLAYLIST_STORAGE_KEY = 'mineradio-local-playlists-v1';

window.loadLocalPlaylists = function() {
  try {
    var raw = localStorage.getItem(window.LOCAL_PLAYLIST_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {}
  return [];
}

window.saveLocalPlaylists = function(playlists) {
  try {
    localStorage.setItem(window.LOCAL_PLAYLIST_STORAGE_KEY, JSON.stringify(playlists));
  } catch (e) {}
}

window.createLocalPlaylist = function(name) {
  if (name) {
    name = String(name).trim();
    if (!name) return;
    var playlists = window.loadLocalPlaylists();
    if (playlists.some(function(p){ return p.name === name; })) {
      window.showToast('已存在同名歌单');
      return;
    }
    playlists.push({
      id: 'local_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8),
      name: name,
      songs: [],
      createdAt: Date.now(),
    });
    window.saveLocalPlaylists(playlists);
    window.renderLocalPlaylistsIntoView();
    window.showToast('已创建本地歌单：' + name);
    return;
  }
  var mask = document.createElement('div');
  mask.className = 'modal-mask';
  mask.innerHTML = '<div class="modal collect-modal" style="padding:28px;text-align:left;max-width:380px">' +
    '<h2 style="font-size:16px;margin-bottom:12px">新建本地歌单</h2>' +
    '<input id="local-pl-name-input" type="text" placeholder="输入歌单名称" style="width:100%;padding:10px 14px;border-radius:10px;border:1px solid rgba(255,255,255,.12);background:rgba(0,0,0,.42);color:#fff;font-size:13px;font-family:inherit;outline:none;margin-bottom:16px" maxlength="40" autofocus onkeydown="if(event.key===\'Enter\'){var v=this.value.trim();if(v){window.closeGsapModal(this.closest(\'.modal-mask\'));window.createLocalPlaylist(v);}}">' +
    '<div class="btn-row">' +
      '<button class="modal-btn" type="button" onclick="window.closeGsapModal(this.closest(\'.modal-mask\'))">取消</button>' +
      '<button class="modal-btn primary" type="button" onclick="var inp=document.getElementById(\'local-pl-name-input\');if(inp&&inp.value.trim()){window.closeGsapModal(this.closest(\'.modal-mask\'));window.createLocalPlaylist(inp.value);}">创建</button>' +
    '</div></div>';
  document.body.appendChild(mask);
  window.openGsapModal(mask);
  setTimeout(function(){
    var inp = document.getElementById('local-pl-name-input');
    if (inp) inp.focus();
  }, 100);
}

window.deleteLocalPlaylist = function(id) {
  var mask = document.createElement('div');
  mask.className = 'modal-mask';
  mask.innerHTML = '<div class="modal collect-modal" style="padding:28px;text-align:left;max-width:360px">' +
    '<h2 style="font-size:16px;margin-bottom:8px">确定删除？</h2>' +
    '<div class="desc" style="margin-bottom:16px">歌单内的歌曲不会被删除，但歌单本身会永久移除。</div>' +
    '<div class="btn-row">' +
      '<button class="modal-btn" type="button" onclick="window.closeGsapModal(this.closest(\'.modal-mask\'))">取消</button>' +
      '<button class="modal-btn primary" type="button" onclick="window.closeGsapModal(this.closest(\'.modal-mask\'));deleteLocalPlaylistConfirm(\'' + id + '\')" style="background:rgba(255,60,60,.15);border-color:rgba(255,60,60,.35);color:#ff6a6a">删除</button>' +
    '</div></div>';
  document.body.appendChild(mask);
  window.openGsapModal(mask);
}
window.deleteLocalPlaylistConfirm = function(id) {
  var playlists = window.loadLocalPlaylists();
  playlists = playlists.filter(function(p){ return p.id !== id; });
  window.saveLocalPlaylists(playlists);
  window.hideLocalPlaylistDetail();
  window.renderLocalPlaylistsIntoView();
  window.showToast('已删除本地歌单');
}

window.addSongToLocalPlaylist = function(playlistId, song) {
  if (!song || !song.id) return;
  var playlists = window.loadLocalPlaylists();
  var pl = playlists.find(function(p){ return p.id === playlistId; });
  if (!pl) { window.showToast('歌单不存在'); return; }
  var dup = pl.songs.some(function(s){ return s.id === song.id && s.provider === song.provider; });
  if (dup) { window.showToast('歌曲已在歌单中'); return; }
  pl.songs.push({
    id: song.id,
    mid: song.mid || song.songmid || '',
    provider: song.provider || song.source || '',
    name: song.name || '',
    artist: song.artist || '',
    cover: song.cover || '',
    addedAt: Date.now(),
  });
  window.saveLocalPlaylists(playlists);
  window.renderLocalPlaylistsIntoView();
  window.showToast('已添加到「' + pl.name + '」');
  // 自动关闭收藏弹窗
  var mask = document.getElementById('local-collect-mask');
  if (mask) window.closeGsapModal(mask);
}

window.removeSongFromLocalPlaylist = function(playlistId, songIdx) {
  var playlists = window.loadLocalPlaylists();
  var pl = playlists.find(function(p){ return p.id === playlistId; });
  if (!pl) return;
  pl.songs.splice(songIdx, 1);
  window.saveLocalPlaylists(playlists);
  window.renderLocalPlaylistsIntoView();
}

// 从收藏到歌单的输入框创建歌单并直接添加当前歌曲
window.createLocalPlaylistFromPicker = function() {
  var inp = document.getElementById('local-collect-new-name');
  var name = inp ? inp.value.trim() : '';
  if (!name) return;
  var song = window.__localCollectSong;
  if (!song) return;
  var playlists = window.loadLocalPlaylists();
  if (playlists.some(function(p){ return p.name === name; })) { window.showToast('已存在同名歌单'); return; }
  var newId = 'local_' + Date.now() + '_' + Math.random().toString(36).slice(2, 8);
  playlists.push({
    id: newId,
    name: name,
    songs: [],
    createdAt: Date.now(),
  });
  window.saveLocalPlaylists(playlists);
  window.renderLocalPlaylistsIntoView();
  // 自动添加当前歌曲
  addSongToLocalPlaylist(newId, song);
  var mask = document.getElementById('local-collect-mask');
  if (mask) window.closeGsapModal(mask);
  window.showToast('已创建并添加到「' + name + '」');
}

window.showAddToLocalPlaylistPicker = function(song) {
  if (!song || !song.id) return;
  // 清除旧弹窗防止 ID 冲突
  var oldMask = document.getElementById('local-collect-mask');
  if (oldMask) { oldMask.classList.remove('show'); try { oldMask.remove(); } catch(e) { oldMask.parentNode && oldMask.parentNode.removeChild(oldMask); } }
  var playlists = window.loadLocalPlaylists();
  var songId = song.id;
  var songProvider = song.provider || song.source || '';
  var cover = song.cover || window.songCoverSrc(song, 80) || '';
  var coverHtml = cover ? '<img src="' + cover + '" alt="" onerror="this.style.display=\'none\'">' : '<div class="cover-placeholder"></div>';
  var mask = document.createElement('div');
  mask.className = 'modal-mask';
  mask.id = 'local-collect-mask';
  mask.innerHTML = '<div class="modal collect-modal">' +
    '<h2>收藏到歌单</h2>' +
    '<div class="collect-current">' + coverHtml +
      '<div style="min-width:0"><div class="collect-title">' + window.escHtml(song.name || '') + '</div><div class="collect-sub">' + window.escHtml(song.artist || '') + '</div></div>' +
    '</div>' +
    '<div id="local-collect-list" class="collect-list">' +
      playlists.map(function(p){
        var dup = p.songs.some(function(s){ return s.id === songId && s.provider === songProvider; });
        return '<div class="collect-item' + (dup ? ' busy' : '') + '" data-local-pl-id="' + p.id + '">' +
          '<div style="width:38px;height:38px;border-radius:8px;background:rgba(0,245,212,.08);display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:16px;color:rgba(0,245,212,.7)">♡</div>' +
          '<div style="min-width:0"><div class="collect-title">' + window.escHtml(p.name) + '</div><div class="collect-sub">' + p.songs.length + ' 首' + (dup ? ' · 已添加' : '') + '</div></div>' +
        '</div>';
      }).join('') +
    '</div>' +
    '<div class="collect-create" style="margin-top:6px">' +
      '<input id="local-collect-new-name" type="text" placeholder="新建本地歌单" maxlength="40" onkeydown="if(event.key===\'Enter\'){event.preventDefault();createLocalPlaylistFromPicker()}">' +
      '<button class="modal-btn primary" onclick="createLocalPlaylistFromPicker()">创建</button>' +
    '</div>' +
    '<div class="btn-row" style="margin-top:4px"><button class="modal-btn" onclick="window.closeGsapModal(this.closest(\'.modal-mask\'))">取消</button></div></div>';
  try { window.__localCollectSong = song; } catch(e) {}
  document.body.appendChild(mask);
  window.openGsapModal(mask);
  setTimeout(function(){
    var inp = document.getElementById('local-collect-new-name');
    if (inp) inp.focus();
  }, 100);
  var list = document.getElementById('local-collect-list');
  if (list) {
    list.addEventListener('click', function(e){
      var item = e.target && e.target.closest ? e.target.closest('.collect-item:not(.busy)') : null;
      if (!item) return;
      var pid = item.getAttribute('data-local-pl-id');
      addSongToLocalPlaylist(pid, song);
      // 刷新列表保持同步（同一首歌可继续添加到其他歌单）
      var fresh = window.loadLocalPlaylists();
      var html = fresh.map(function(p){
        var dup = p.songs.some(function(s){ return s.id === songId && s.provider === songProvider; });
        return '<div class="collect-item' + (dup ? ' busy' : '') + '" data-local-pl-id="' + p.id + '">' +
          '<div style="width:38px;height:38px;border-radius:8px;background:rgba(0,245,212,.08);display:flex;align-items:center;justify-content:center;flex-shrink:0;font-size:16px;color:rgba(0,245,212,.7)">♡</div>' +
          '<div style="min-width:0"><div class="collect-title">' + window.escHtml(p.name) + '</div><div class="collect-sub">' + p.songs.length + ' 首' + (dup ? ' · 已添加' : '') + '</div></div>' +
        '</div>';
      }).join('');
      list.innerHTML = html;
    });
  }
}

window.playLocalPlaylistSongs = function(songs, startIdx) {
  if (!songs || !songs.length) return;
  startIdx = startIdx || 0;
  activeRadioContext = null;
  playQueue = songs.map(function(s){
    return { id: s.id, mid: s.mid || '', provider: s.provider, source: s.provider, type: 'song', name: s.name, artist: s.artist, cover: s.cover };
  });
  currentIdx = Math.min(startIdx, window.playQueue.length - 1);
  window.safeRenderQueuePanel('local-window.playlist-play');
  window.safeShelfRebuild('local-window.playlist-play', true);
  window.forcePlaybackControlsInteractive();
  window.playQueueAt(window.currentIdx);
}

// 从 localStorage 收集所有已红心的 YT/SP 歌曲（含元数据）
window.getLocalLikedSongs = function() {
  var songs = [];
  try {
    for (var i = 0; i < localStorage.length; i++) {
      var key = localStorage.key(i);
      if (!key || key.indexOf('mineradio-local-like-') !== 0) continue;
      var val = localStorage.getItem(key);
      if (!val) continue;
      var liked = false, meta = null;
      if (val[0] === '{') { try { meta = JSON.parse(val); liked = meta && meta.liked; } catch(e) {} }
      else { liked = val === '1'; }
      if (!liked) continue;
      var rest = key.replace('mineradio-local-like-', '');
      var colonIdx = rest.indexOf(':');
      if (colonIdx < 0) continue;
      var provider = rest.substring(0, colonIdx);
      var songId = rest.substring(colonIdx + 1);
      songs.push({
        id: songId,
        mid: '',
        provider: provider,
        source: provider,
        type: 'song',
        name: (meta && meta.name) || '未知歌曲',
        artist: (meta && meta.artist) || '',
        cover: (meta && meta.cover) || '',
      });
    }
  } catch(e) {}
  return songs;
}

// 构建标准 song 对象用于播放
window.toStandardSongs = function(songs) {
  return songs.map(function(s){
    return { id: s.id, mid: s.mid || '', provider: s.provider || '', source: s.provider || '', type: 'song', name: s.name || '', artist: s.artist || '', cover: s.cover || '' };
  });
}

var localDetailSongs = []; // 当前详情面板的歌曲（标准格式）
var localDetailPlaylistId = ''; // 当前详情面板打开的歌单 id

window.hideLocalPlaylistDetail = function() {
  var panel = document.getElementById('playlist-detail-panel');
  if (panel) panel.classList.remove('show');
  localDetailSongs = [];
  localDetailPlaylistId = '';
}

window.showLocalPlaylistDetail = function(playlistId) {
  var $panel = document.getElementById('playlist-detail-panel');
  var $title = document.getElementById('detail-panel-title');
  var $list = document.getElementById('detail-panel-list');
  if (!$panel || !$title || !$list) return;
  // 点击相同歌单 → 关闭
  if (localDetailPlaylistId === playlistId) { window.hideLocalPlaylistDetail(); return; }
  var songs, title, isLiked = playlistId === '__liked__';
  if (isLiked) {
    songs = window.getLocalLikedSongs();
    title = '我喜欢的音乐';
  } else {
    var playlists = window.loadLocalPlaylists();
    var pl = playlists.find(function(p){ return p.id === playlistId; });
    if (!pl) { window.showToast('歌单不存在'); return; }
    songs = pl.songs;
    title = pl.name;
  }
  if (!songs.length) { window.showToast('歌单为空'); return; }
  localDetailSongs = window.toStandardSongs(songs);
  localDetailPlaylistId = playlistId;
  $title.textContent = title + '（' + songs.length + ' 首）';
  $list.innerHTML = songs.map(function(s, i){
    var thumb = s.cover ? '<img src="' + s.cover + '" alt="" onerror="this.style.opacity=0.2">' : '<div style="width:38px;height:38px;border-radius:6px;background:rgba(255,255,255,.06);flex-shrink:0"></div>';
    return '<div class="queue-item" data-song-idx="' + i + '">' +
      thumb +
      '<div class="qi-info"><div class="qi-name">' + window.escHtml(s.name || '未知歌曲') + '</div><div class="qi-sub">' + window.escHtml(s.artist || '') + '</div></div>' +
    '</div>';
  }).join('');
  $panel.classList.add('show');
}

// 渲染本地歌单卡片 → #local-pl-section
window.renderLocalPlaylistsIntoView = function() {
  var $sec = document.getElementById('local-pl-section');
  if (!$sec) return;
  var playlists = window.loadLocalPlaylists();
  var likedSongs = window.getLocalLikedSongs();
  var html = '<div class="pl-section-label">本地歌单</div>';
  // 我喜欢的音乐
  html += '<div class="pl-card" data-local-pl-id="__liked__">' +
    '<div style="width:44px;height:44px;border-radius:8px;background:rgba(255,255,255,.06);flex-shrink:0"></div>' +
    '<div style="flex:1;min-width:0"><div class="pl-name">我喜欢的音乐<span class="tag-window.source local" style="margin-left:6px;vertical-align:1px">本地</span></div><div class="pl-sub">' + likedSongs.length + ' 首</div></div>' +
  '</div>';
  // 本地歌单
  playlists.forEach(function(pl){
    html += '<div class="pl-card" data-local-pl-id="' + pl.id + '">' +
      '<div style="width:44px;height:44px;border-radius:8px;background:rgba(255,255,255,.06);flex-shrink:0"></div>' +
      '<div style="flex:1;min-width:0"><div class="pl-name">' + window.escHtml(pl.name) + '<span class="tag-window.source local" style="margin-left:6px;vertical-align:1px">本地</span></div><div class="pl-sub">' + pl.songs.length + ' 首</div></div>' +
      '<button class="card-del-btn" onclick="event.stopPropagation();window.deleteLocalPlaylist(\'' + pl.id + '\')" style="flex-shrink:0;width:26px;height:26px;border:0;border-radius:6px;background:rgba(255,60,60,.15);color:#ff6a6a;font-size:13px;line-height:1;cursor:pointer;display:flex;align-items:center;justify-content:center">✕</button>' +
    '</div>';
  });
  html += '<button type="button" class="fx-mini-btn ghost" onclick="window.createLocalPlaylist()" style="width:100%;height:32px;margin-top:2px;font-size:11px">+ 新建本地歌单</button>';
  $sec.innerHTML = html;
}

// 详情面板事件绑定
;(function(){
  var panel = document.getElementById('playlist-detail-panel');
  if (!panel) return;
  // 关闭
  var closeBtn = document.getElementById('detail-panel-close');
  if (closeBtn) closeBtn.addEventListener('click', window.hideLocalPlaylistDetail);
  // 播放全部
  var playAll = document.getElementById('detail-panel-play-all');
  if (playAll) playAll.addEventListener('click', function(){
    if (window.localDetailSongs.length) window.playLocalPlaylistSongs(window.localDetailSongs, 0);
  });
  // 点击歌曲行
  var list = document.getElementById('detail-panel-list');
  if (list) list.addEventListener('click', function(e){
    var row = e.target && e.target.closest ? e.target.closest('[data-song-idx]') : null;
    if (!row) return;
    var idx = Number(row.getAttribute('data-song-idx'));
    if (window.localDetailSongs.length) window.playLocalPlaylistSongs(window.localDetailSongs, Math.min(idx, window.localDetailSongs.length - 1));
  });
})();

// 点击本地歌单卡片 → 打开详情面板
;(function(){
  var sec = document.getElementById('local-pl-section');
  if (!sec) return;
  sec.addEventListener('click', function(e){
    var card = e.target && e.target.closest ? e.target.closest('.pl-card[data-local-pl-id]') : null;
    if (card) {
      e.preventDefault();
      e.stopPropagation();
      window.showLocalPlaylistDetail(card.getAttribute('data-local-pl-id'));
    }
  });
})();

var playlistPanelDetailState = { key: '', loading: false, playlist: null, tracks: [], token: 0, renderLimit: PLAYLIST_DETAIL_INITIAL_RENDER };
window.playlistPanelKey = function(provider, id) {
  if (provider === 'qq') return 'qq:' + String(id || '');
  return 'netease:' + String(id || '');
}
window.playlistPanelProviderId = function(provider, id) {
  if (provider === 'qq') return 'qq:' + id;
  return id;
}
window.playlistPanelDetailHtml = function(pl, provider) {
  var key = window.playlistPanelKey(provider, pl && pl.id);
  if (window.playlistPanelDetailState.key !== key) return '';
  var tracks = window.playlistPanelDetailState.tracks || [];
  var loading = window.playlistPanelDetailState.loading;
  var cover = pl && pl.cover ? (provider === 'qq' ? pl.cover : (pl.cover + '?param=96y96')) : '';
  var img = cover ? '<img class="pl-detail-cover" src="' + window.escHtml(cover) + '" alt="" decoding="async" onerror="this.style.opacity=0.2">' : '<div class="pl-detail-cover"></div>';
  var renderLimit = loading ? 0 : Math.max(PLAYLIST_DETAIL_INITIAL_RENDER, window.playlistPanelDetailState.renderLimit || PLAYLIST_DETAIL_INITIAL_RENDER);
  renderLimit = Math.min(tracks.length, renderLimit);
  var visibleTracks = loading ? [] : tracks.slice(0, renderLimit);
  var rows = loading
    ? '<div class="pl-detail-row"><div style="width:34px;height:34px;border-radius:7px;background:rgba(255,255,255,.06)"></div><div style="flex:1;min-width:0"><div class="pl-detail-row-title">正在载入歌单</div><div class="pl-detail-row-artist">请稍候</div></div></div>'
    : visibleTracks.map(function(song, i){
        var thumb = window.songCoverSrc(song, 60);
        var imgTag = thumb ? '<img src="' + window.escHtml(thumb) + '" alt="" loading="lazy" decoding="async" onerror="this.style.opacity=0.2">' : '<div style="width:34px;height:34px;border-radius:7px;background:rgba(255,255,255,.06);flex:0 0 auto"></div>';
        return '<div class="pl-detail-row" data-pl-detail-row="' + i + '">' +
          imgTag +
          '<div style="flex:1;min-width:0"><div class="pl-detail-row-title">' + window.escHtml(song.name || '') + '</div>' +
          '<button type="button" class="pl-detail-row-artist" data-pl-detail-artist="' + i + '">' + window.escHtml(song.artist || '未知歌手') + '</button></div>' +
        '</div>';
      }).join('');
  if (!loading && !rows) rows = '<div style="text-align:center;padding:14px 0;color:rgba(255,255,255,.30);font-size:11.5px">歌单暂无可播放歌曲</div>';
  if (!loading && tracks.length > renderLimit) {
    rows += '<button type="button" class="fx-mini-btn ghost pl-detail-load-more" data-pl-detail-load-more="1">加载更多 ' + renderLimit + '/' + tracks.length + '</button>';
  } else if (!loading && tracks.length > PLAYLIST_DETAIL_INITIAL_RENDER) {
    rows += '<div class="pl-detail-progress">已显示全部 ' + tracks.length + ' 首</div>';
  }
  return '<div class="pl-inline-detail" data-pl-detail="' + window.escHtml(key) + '">' +
    '<div class="pl-detail-sticky">' +
      '<div class="pl-detail-head">' + img + '<div style="flex:1;min-width:0"><div class="pl-detail-title">' + window.escHtml(pl.name || '歌单详情') + '</div><div class="pl-detail-sub">' + window.escHtml((pl.trackCount || tracks.length || 0) + ' 首 · ' + (pl.creator || (provider === 'qq' ? 'QQ 音乐' : '网易云音乐'))) + '</div></div><div class="pl-detail-count">' + (loading ? '载入中' : (renderLimit + '/' + tracks.length)) + '</div></div>' +
      '<div class="pl-detail-actions"><button class="pl-detail-play" type="button" data-pl-detail-play="' + window.escHtml(key) + '"><svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>播放歌单</button><button class="fx-mini-btn ghost pl-detail-top-btn" type="button" data-pl-detail-top="1">回到顶部</button></div>' +
    '</div>' +
    '<div class="pl-detail-list">' + rows + '</div>' +
  '</div>';
}
window.renderPlaylistPanelDetailState = function() {
  window.renderUserPlaylistsList();
}
window.scrollPlaylistPanelToTop = function() {
  var panel = document.getElementById('playlist-panel');
  if (!panel) return;
  try { panel.scrollTo({ top: 0, behavior: 'smooth' }); }
  catch (e) { panel.scrollTop = 0; }
}
window.scrollPlaylistPanelDetailIntoView = function(key) {
  var panel = document.getElementById('playlist-panel');
  if (!panel || !key) return;
  requestAnimationFrame(function(){
    var detail = null;
    Array.prototype.some.call(panel.querySelectorAll('[data-pl-detail]'), function(node){
      if (node.getAttribute('data-pl-detail') === key) {
        detail = node;
        return true;
      }
      return false;
    });
    if (!detail) return;
    var anchor = detail.previousElementSibling || detail;
    var top = Math.max(0, anchor.offsetTop - 10);
    try { panel.scrollTo({ top: top, behavior: 'smooth' }); }
    catch (e) { panel.scrollTop = top; }
  });
}
window.openPlaylistPanelDetail = async function(provider, pid, title) {
  if (!pid) return;
  provider = provider === 'qq' ? 'qq' : 'netease';
  var key = window.playlistPanelKey(provider, pid);
  var pl = window.userPlaylists.find(function(item){ return window.playlistPanelKey(item.provider === 'qq' ? 'qq' : 'netease', item.id) === key; }) || { id: pid, provider: provider, name: title || '歌单详情' };
  if (window.playlistPanelDetailState.key === key && !window.playlistPanelDetailState.loading && window.playlistPanelDetailState.tracks.length) {
    window.playlistPanelDetailState.key = '';
    window.playlistPanelDetailState.tracks = [];
    window.playlistPanelDetailState.playlist = null;
    window.playlistPanelDetailState.renderLimit = PLAYLIST_DETAIL_INITIAL_RENDER;
    renderPlaylistPanelDetailState();
    return;
  }
  var token = ++window.playlistPanelDetailState.token;
  playlistPanelDetailState = { key: key, loading: true, playlist: pl, tracks: [], token: token, renderLimit: PLAYLIST_DETAIL_INITIAL_RENDER };
  renderPlaylistPanelDetailState();
  scrollPlaylistPanelDetailIntoView(key);
  try {
    var r = provider === 'qq'
      ? await window.qqPlaylistTracks(pid)
      : await window.neteasePlaylistTracks(pid);
    if (window.playlistPanelDetailState.token !== token) return;
    window.playlistPanelDetailState.loading = false;
    window.playlistPanelDetailState.tracks = (r && r.tracks || []).map(window.cloneSong);
    window.playlistPanelDetailState.renderLimit = Math.min(window.playlistPanelDetailState.tracks.length, PLAYLIST_DETAIL_INITIAL_RENDER);
    renderPlaylistPanelDetailState();
  } catch (e) {
    console.warn('[PlaylistPanelDetail]', pid, e);
    if (window.playlistPanelDetailState.token !== token) return;
    window.playlistPanelDetailState.loading = false;
    window.playlistPanelDetailState.tracks = [];
    window.playlistPanelDetailState.renderLimit = PLAYLIST_DETAIL_INITIAL_RENDER;
    renderPlaylistPanelDetailState();
    window.showToast('歌单详情加载失败');
  }
}
window.playPlaylistPanelDetail = function() {
  var st = window.playlistPanelDetailState;
  if (!st || !st.key) return;
  var parts = st.key.split(':');
  var provider = parts[0] === 'qq' ? 'qq' : 'netease';
  var pid = parts.slice(1).join(':');
  window.loadPlaylistIntoQueueById(playlistPanelProviderId(provider, pid), true, st.playlist && st.playlist.name || '');
}
window.playPlaylistPanelDetailTrack = function(index) {
  var tracks = window.playlistPanelDetailState.tracks || [];
  if (!tracks[index]) return;
  playQueue = tracks.map(window.cloneSong);
  currentIdx = index;
  window.safeRenderQueuePanel('window.playlist-panel-detail');
  safeSwitchPlaylistTab('queue', 'window.playlist-panel-detail');
  window.safeShelfRebuild('window.playlist-panel-detail', true);
  window.forcePlaybackControlsInteractive();
  window.playQueueAt(index).catch(function(e){ console.warn('[PlaylistPanelDetailPlay]', e); });
}
window.openPlaylistPanelDetailArtist = function(index) {
  var song = window.playlistPanelDetailState.tracks && window.playlistPanelDetailState.tracks[index];
  if (song) window.openArtistDetailForSong(song);
}
window.growPlaylistPanelDetailRenderLimit = function(amount) {
  var st = window.playlistPanelDetailState;
  var total = st && st.tracks ? st.tracks.length : 0;
  if (!st || st.loading || !st.key || !total) return false;
  var current = Math.max(PLAYLIST_DETAIL_INITIAL_RENDER, st.renderLimit || PLAYLIST_DETAIL_INITIAL_RENDER);
  var next = Math.min(total, current + (amount || PLAYLIST_DETAIL_BATCH_SIZE));
  if (next <= current) return false;
  var panel = document.getElementById('playlist-panel');
  var keepTop = panel ? panel.scrollTop : 0;
  st.renderLimit = next;
  renderPlaylistPanelDetailState();
  if (panel) panel.scrollTop = keepTop;
  return true;
}
window.maybeGrowPlaylistPanelDetailRenderLimit = function() {
  var panel = document.getElementById('playlist-panel');
  var st = window.playlistPanelDetailState;
  if (!panel || !st || st.loading || !st.key || !st.tracks || st.renderLimit >= st.tracks.length) return;
  if (panel.scrollTop + panel.clientHeight >= panel.scrollHeight - 240) {
    growPlaylistPanelDetailRenderLimit();
  }
}
window.resetPlaylistPanelRenderLimit = function() {
  playlistPanelRenderLimit = PLAYLIST_PANEL_BATCH_SIZE;
}
window.growPlaylistPanelRenderLimit = function() {
  if (!window.userPlaylists.length) return;
  var next = Math.min(window.userPlaylists.length, (playlistPanelRenderLimit || PLAYLIST_PANEL_BATCH_SIZE) + PLAYLIST_PANEL_BATCH_SIZE);
  if (next <= playlistPanelRenderLimit) return;
  playlistPanelRenderLimit = next;
  window.renderUserPlaylistsList({ animate: true });
}
window.bindPlaylistPanelLazyRender = function() {
  var panel = document.getElementById('playlist-panel');
  if (!panel || window.playlistPanelLazyBound) return;
  playlistPanelLazyBound = true;
  panel.addEventListener('scroll', function(){
    maybeGrowPlaylistPanelDetailRenderLimit();
    if (window.queueViewTab !== 'playlists' || playlistPanelRenderLimit >= window.userPlaylists.length) return;
    if (panel.scrollTop + panel.clientHeight >= panel.scrollHeight - 180) growPlaylistPanelRenderLimit();
  }, { passive: true });
}
window.renderUserPlaylistsList = function(opts) {
  opts = opts || {};
  window.renderLocalPlaylistsIntoView();
  var $pl = document.getElementById('pl-list');
  var seq = ++playlistRenderSeq;
  if (!window.userPlaylists.length) {
    $pl.innerHTML = '<div style="text-align:center;padding:24px 0;color:rgba(255,255,255,.32);font-size:11.5px">未找到歌单</div>';
    return;
  }
  function playlistCardHtml(pl) {
    var provider = pl.provider === 'qq' ? 'qq' : 'netease';
    var providerLabel = provider === 'qq' ? 'QQ' : 'NE';
    var thumb = pl.cover ? (provider === 'qq' ? pl.cover : (pl.cover + '?param=88y88')) : '';
    var imgTag = thumb ? '<img src="' + thumb + '" alt="" loading="lazy" decoding="async" onerror="this.style.opacity=0.2">' : '<div style="width:44px;height:44px;border-radius:8px;background:rgba(255,255,255,.06);flex-shrink:0"></div>';
    var key = window.playlistPanelKey(provider, pl.id);
    var expanded = window.playlistPanelDetailState.key === key ? ' expanded' : '';
    return '<div class="pl-card' + expanded + '" data-window.playlist-provider="' + provider + '" data-window.playlist-id="' + window.escHtml(String(pl.id || '')) + '" data-window.playlist-title="' + window.escHtml(pl.name || '') + '">' +
      imgTag +
      '<div style="flex:1;min-width:0"><div class="pl-name">' + window.escHtml(pl.name) + '<span class="tag-window.source ' + provider + '" style="margin-left:6px;vertical-align:1px">' + providerLabel + '</span></div><div class="pl-sub">' + pl.trackCount + ' 首 · ' + window.escHtml(pl.creator || '') + '</div></div>' +
    '</div>' + window.playlistPanelDetailHtml(pl, provider);
  }
  var groups = [
    { key:'netease', label:'网易云歌单', items:window.userPlaylists.filter(function(pl){ return pl.provider !== 'qq'; }) },
    { key:'qq', label:'QQ 音乐歌单', items:window.userPlaylists.filter(function(pl){ return pl.provider === 'qq'; }) }
  ];
  if (opts.reset) resetPlaylistPanelRenderLimit();
  playlistPanelRenderLimit = Math.max(PLAYLIST_PANEL_BATCH_SIZE, Math.min(window.userPlaylists.length, playlistPanelRenderLimit || PLAYLIST_PANEL_BATCH_SIZE));
  var renderedCount = 0;
  function visibleGroupItems(items) {
    var room = playlistPanelRenderLimit - renderedCount;
    if (room <= 0) return [];
    var visible = items.slice(0, room);
    renderedCount += visible.length;
    return visible;
  }
  $pl.innerHTML = groups.map(function(group){
    var items = visibleGroupItems(group.items);
    if (!items.length) return '';
    return '<div class="pl-section-label">' + group.label + '</div>' + items.map(playlistCardHtml).join('');
  }).join('') || '<div style="text-align:center;padding:24px 0;color:rgba(255,255,255,.32);font-size:11.5px">未找到歌单</div>';
  if (window.userPlaylists.length > renderedCount) {
    $pl.insertAdjacentHTML('beforeend', '<button type="button" class="fx-mini-btn ghost pl-load-more" data-pl-load-more="1">加载更多 ' + renderedCount + '/' + window.userPlaylists.length + '</button>');
  }
  if (opts.animate && seq === playlistRenderSeq) animateVisiblePanelList($pl, '.pl-card', document.getElementById('playlist-panel'));
}
window.renderMyPodcastCollections = function(opts) {
  opts = opts || {};
  var $pod = document.getElementById('podcast-list');
  if (!$pod) return;
  if (!window.loginStatus.loggedIn) {
    $pod.innerHTML = '<div style="text-align:center;padding:14px 0;color:rgba(255,255,255,.28);font-size:11.5px">登录后显示我的播客</div>';
    return;
  }
  var items = window.myPodcastCollections || [];
  if (!items.length) {
    $pod.innerHTML = '<div style="text-align:center;padding:14px 0;color:rgba(255,255,255,.28);font-size:11.5px">暂无播客数据</div>';
    return;
  }
  $pod.innerHTML = items.map(function(pc){
    var thumb = pc.cover ? window.coverUrlWithSize(pc.cover, 88) : '';
    var imgTag = thumb ? '<img src="' + thumb + '" alt="" loading="lazy" decoding="async" onerror="this.style.opacity=0.2">' : '<div style="width:44px;height:44px;border-radius:8px;background:rgba(0,245,212,.07);flex-shrink:0"></div>';
    return '<div class="pl-card podcast-card" data-podcast-key="' + window.escHtml(pc.key || '') + '" data-podcast-title="' + window.escHtml(pc.title || '') + '">' +
      imgTag +
      '<div style="flex:1;min-width:0"><div class="pl-name">' + window.escHtml(pc.title || '') + '</div><div class="pl-sub">' + (pc.count || 0) + ' 项 · ' + window.escHtml(pc.sub || '') + '</div></div>' +
    '</div>';
  }).join('');
  if (opts.animate) animateVisiblePanelList($pod, '.pl-card', document.getElementById('playlist-panel'));
}
document.getElementById('pl-list').addEventListener('click', function(e){
  var loadMore = e.target && e.target.closest ? e.target.closest('[data-pl-load-more]') : null;
  if (loadMore) {
    e.preventDefault();
    e.stopPropagation();
    growPlaylistPanelRenderLimit();
    return;
  }
  var detailLoadMore = e.target && e.target.closest ? e.target.closest('[data-pl-detail-load-more]') : null;
  if (detailLoadMore) {
    e.preventDefault();
    e.stopPropagation();
    growPlaylistPanelDetailRenderLimit();
    return;
  }
  var detailTop = e.target && e.target.closest ? e.target.closest('[data-pl-detail-top]') : null;
  if (detailTop) {
    e.preventDefault();
    e.stopPropagation();
    scrollPlaylistPanelToTop();
    return;
  }
  var playDetail = e.target && e.target.closest ? e.target.closest('[data-pl-detail-play]') : null;
  if (playDetail) {
    e.preventDefault();
    e.stopPropagation();
    playPlaylistPanelDetail();
    return;
  }
  var artist = e.target && e.target.closest ? e.target.closest('[data-pl-detail-artist]') : null;
  if (artist) {
    e.preventDefault();
    e.stopPropagation();
    openPlaylistPanelDetailArtist(Number(artist.getAttribute('data-pl-detail-artist')));
    return;
  }
  var row = e.target && e.target.closest ? e.target.closest('[data-pl-detail-row]') : null;
  if (row) {
    e.preventDefault();
    e.stopPropagation();
    playPlaylistPanelDetailTrack(Number(row.getAttribute('data-pl-detail-row')));
    return;
  }
  var card = e.target && e.target.closest ? e.target.closest('.pl-card') : null;
  if (!card) return;
  var provider = card.getAttribute('data-window.playlist-provider') || 'netease';
  var pid = card.getAttribute('data-window.playlist-id') || '';
  openPlaylistPanelDetail(provider, pid, card.getAttribute('data-window.playlist-title') || '');
});
var podcastListEl = document.getElementById('podcast-list');
if (podcastListEl) {
  podcastListEl.addEventListener('click', function(e){
    if (e.target && e.target.closest && e.target.closest('[data-podcast-back]')) {
      renderMyPodcastCollections({ animate: true });
      return;
    }
    var radioCard = e.target && e.target.closest ? e.target.closest('[data-podcast-radio-id]') : null;
    if (radioCard) {
      loadPodcastRadioIntoQueue(radioCard.getAttribute('data-podcast-radio-id'), true, radioCard.getAttribute('data-podcast-title') || '');
      return;
    }
    var card = e.target && e.target.closest ? e.target.closest('[data-podcast-key]') : null;
    if (!card) return;
    openMyPodcastCollection(card.getAttribute('data-podcast-key'), card.getAttribute('data-podcast-title') || '');
  });
}
window.renderMyPodcastRadioItems = function(key, title, items) {
  var $pod = document.getElementById('podcast-list');
  if (!$pod) return;
  if (!items.length) {
    $pod.innerHTML = '<div class="podcast-inline-head"><div class="pl-section-label">' + window.escHtml(title || '我的播客') + '</div><button class="fx-mini-btn ghost" data-podcast-back="1" style="height:24px;padding:0 9px;font-size:10.5px">返回</button></div>' +
      '<div style="text-align:center;padding:14px 0;color:rgba(255,255,255,.28);font-size:11.5px">暂无内容</div>';
    return;
  }
  $pod.innerHTML = '<div class="podcast-inline-head"><div class="pl-section-label">' + window.escHtml(title || '我的播客') + '</div><button class="fx-mini-btn ghost" data-podcast-back="1" style="height:24px;padding:0 9px;font-size:10.5px">返回</button></div>' +
    items.map(function(r){
      var thumb = r.cover ? window.coverUrlWithSize(r.cover, 88) : '';
      var imgTag = thumb ? '<img src="' + thumb + '" alt="" loading="lazy" decoding="async" onerror="this.style.opacity=0.2">' : '<div style="width:44px;height:44px;border-radius:8px;background:rgba(0,245,212,.07);flex-shrink:0"></div>';
      return '<div class="pl-card podcast-card podcast-child" data-podcast-radio-id="' + window.escHtml(String(r.id || r.radioId || '')) + '" data-podcast-title="' + window.escHtml(r.name || '') + '">' +
        imgTag +
        '<div style="flex:1;min-width:0"><div class="pl-name">' + window.escHtml(r.name || '') + '</div><div class="pl-sub">' + window.escHtml((r.djName || r.artist || 'Podcast') + (r.programCount ? (' · ' + r.programCount + ' 集') : '')) + '</div></div>' +
      '</div>';
    }).join('');
  animateVisiblePanelList($pod, '.pl-card', document.getElementById('playlist-panel'));
}
window.openMyPodcastCollection = async function(key, title) {
  if (!key) return;
  window.showLoading();
  try {
    var r = await window.neteasePodcastMyItems(key, 36);
    if (r && r.loggedIn === false) { window.showLoginModal(); return; }
    var items = r.items || [];
    window.myPodcastItems[key] = items;
    if (!items.length) {
      window.showToast('暂无内容: ' + (title || key));
      renderMyPodcastRadioItems(key, title, []);
      return;
    }
    if (r.itemType === 'voice' || (items[0] && items[0].type === 'podcast')) {
      playQueue = items.map(window.cloneSong);
      currentIdx = 0;
      window.safeRenderQueuePanel('podcast-collection-voice');
      safeSwitchPlaylistTab('queue', 'podcast-collection-voice');
      window.safeShelfRebuild('podcast-collection-voice', true);
      window.forcePlaybackControlsInteractive();
      await window.playQueueAt(0);
      window.showToast('载入: ' + (title || '喜欢的声音'));
      return;
    }
    renderMyPodcastRadioItems(key, title, items);
  } catch (e) {
    console.warn(e);
    window.showToast('播客加载失败');
  } finally {
    window.hideLoading();
  }
}
window.loadPodcastRadioIntoQueue = async function(id, autoplay, title) {
  if (!id) return;
  window.showLoading();
  try {
    var r = await window.neteasePodcastPrograms(id, 36);
    if (r.error) { window.showToast('播客加载失败: ' + r.error); return; }
    if (!r.programs || !r.programs.length) { window.showToast('播客暂无可播放节目'); return; }
    playQueue = r.programs.map(window.cloneSong);
    currentIdx = 0;
    window.safeRenderQueuePanel('podcast-radio');
    safeSwitchPlaylistTab('queue', 'podcast-radio');
    window.safeShelfRebuild('podcast-radio', true);
    window.forcePlaybackControlsInteractive();
    if (autoplay) await window.playQueueAt(0);
    window.showToast('载入: ' + (title || '播客'));
  } catch (e) {
    console.warn(e);
    window.showToast('播客加载失败');
  } finally {
    window.hideLoading();
  }
}
window.loadPlaylistIntoQueueById = async function(id, autoplay, title) {
  if (!id) return;
  homeForcedOpen = false;
  homeSuppressed = false;
  updateEmptyHomeVisibility();
  window.showLoading();
  var qqPlaylistId = String(id || '').indexOf('qq:') === 0 ? String(id).slice(3) : '';
  var r = null;
  try {
    r = qqPlaylistId
      ? await window.qqPlaylistTracks(qqPlaylistId)
      : await window.neteasePlaylistTracks(id);
  } catch (e) {
    console.warn('[PlaylistLoadApi]', id, e);
    window.showToast('歌单加载失败');
    window.hideLoading();
    return;
  }
  try {
    if (r.error) { window.showToast('歌单加载失败: ' + r.error); return; }
    if (!r.tracks || !r.tracks.length) { window.showToast('歌单为空'); return; }
    playQueue = r.tracks.map(window.cloneSong);
    if (!qqPlaylistId && window.isLikedPlaylistContext(id, title, r.playlist)) window.markSongsLiked(window.playQueue, true);
    if (!qqPlaylistId) window.syncLikeStatusForSongs(window.playQueue);
    currentIdx = 0;
    window.safeRenderQueuePanel('window.playlist-load');
    safeSwitchPlaylistTab('queue', 'window.playlist-load');
    window.safeShelfRebuild('window.playlist-load', true);
    window.forcePlaybackControlsInteractive();
    if (autoplay) {
      try {
        await window.playQueueAt(0);
      } catch (playErr) {
        console.warn('[PlaylistAutoplay]', id, playErr);
        window.showToast('歌单已载入，播放启动失败');
      }
    }
    window.forcePlaybackControlsInteractive();
    window.showToast('载入: ' + (title || ('歌单 ' + id)));
  } catch (e) {
    console.warn('[PlaylistLoadState]', id, e);
    window.forcePlaybackControlsInteractive();
    window.showToast('歌单已载入，界面刷新失败');
  } finally {
    window.hideLoading();
  }
}

// 进度条
var progressDragState = { active: false, lastParticleAt: 0 };
window.normalizePlaybackDurationSeconds = function(value) {
  var raw = Number(value);
  if (!isFinite(raw) || raw <= 0) return 0;
  return raw > 1000 ? raw / 1000 : raw;
}
window.playbackDurationFromSong = function(song) {
  if (!song) return 0;
  return normalizePlaybackDurationSeconds(song.duration || song.durationMs || song.dt || 0);
}
window.getPlaybackDurationSeconds = function() {
  if (window.audio && isFinite(window.audio.duration) && window.audio.duration > 0) return window.audio.duration;
  return playbackDurationFromSong(window.currentCoverSong());
}
window.getPlaybackCurrentSeconds = function() {
  return window.audio && isFinite(window.audio.currentTime) && window.audio.currentTime > 0 ? window.audio.currentTime : 0;
}
window.setProgressVisual = function(percent) {
  percent = window.clampRange(percent || 0, 0, 100);
  var fill = document.getElementById('progress-fill');
  var thumb = document.getElementById('progress-thumb');
  if (fill) fill.style.width = percent + '%';
  if (thumb) thumb.style.left = percent + '%';
}
window.updatePlaybackProgressUi = function() {
  var durationSec = getPlaybackDurationSeconds();
  var currentSec = getPlaybackCurrentSeconds();
  if (durationSec > 0 && currentSec > durationSec) currentSec = durationSec;
  setProgressVisual(durationSec > 0 ? (currentSec / durationSec * 100) : 0);
  var timeDisplay = document.getElementById('time-display');
  if (timeDisplay) timeDisplay.textContent = formatProgramTime(currentSec) + ' / ' + (durationSec > 0 ? formatProgramTime(durationSec) : '0:00');
}
window.bindPlaybackProgressEvents = function(audioEl) {
  if (!audioEl || audioEl._mineradioProgressBound) return;
  audioEl._mineradioProgressBound = true;
  ['loadedmetadata', 'durationchange', 'timeupdate', 'seeked', 'play', 'pause', 'emptied'].forEach(function(name){
    audioEl.addEventListener(name, updatePlaybackProgressUi);
  });
  ['play', 'window.playing', 'pause', 'ended', 'emptied', 'abort', 'error'].forEach(function(name){
    audioEl.addEventListener(name, function(){ syncPlaybackStateFromAudioEvent(name); });
  });
}
window.emitProgressDragParticles = function(x, y) {
  var now = performance.now();
  if (now - progressDragState.lastParticleAt < 46) return;
  progressDragState.lastParticleAt = now;
  for (var i = 0; i < 3; i++) {
    var dot = document.createElement('span');
    dot.className = 'progress-drag-particle';
    var dx = (Math.random() - 0.5) * 34;
    var dy = -10 - Math.random() * 28;
    dot.style.setProperty('--px', x + 'px');
    dot.style.setProperty('--py', y + 'px');
    dot.style.setProperty('--dx', dx + 'px');
    dot.style.setProperty('--dy', dy + 'px');
    document.body.appendChild(dot);
    setTimeout((function(el){ return function(){ if (el && el.parentNode) el.parentNode.removeChild(el); }; })(dot), 700);
  }
}
window.seekFromProgressPointer = function(e, emitParticles) {
  var durationSec = getPlaybackDurationSeconds();
  if (!window.audio || !durationSec) return;
  var bar = document.getElementById('progress-bar');
  var rect = bar.getBoundingClientRect();
  var ratio = window.clampRange((e.clientX - rect.left) / rect.width, 0, 1);
  window.audio.currentTime = ratio * durationSec;
  setProgressVisual(ratio * 100);
  syncBeatMapPlaybackCursor(window.audio.currentTime);
  if (emitParticles) emitProgressDragParticles(e.clientX, rect.top + rect.height / 2);
}
var progressBar = document.getElementById('progress-bar');
progressBar.addEventListener('pointerdown', function(e){
  if (!window.audio || !window.audio.duration) return;
  progressDragState.active = true;
  progressBar.classList.add('is-dragging');
  try { progressBar.setPointerCapture(e.pointerId); } catch (err) {}
  seekFromProgressPointer(e, true);
});
progressBar.addEventListener('pointermove', function(e){
  if (!progressDragState.active) return;
  seekFromProgressPointer(e, true);
});
window.endProgressDrag = function(e) {
  if (!progressDragState.active) return;
  progressDragState.active = false;
  progressBar.classList.remove('is-dragging');
  try { progressBar.releasePointerCapture(e.pointerId); } catch (err) {}
}
progressBar.addEventListener('pointerup', endProgressDrag);
progressBar.addEventListener('pointercancel', endProgressDrag);
progressBar.addEventListener('lostpointercapture', function(){ progressDragState.active = false; progressBar.classList.remove('is-dragging'); });
setInterval(function(){
  if (!window.audio) { updatePlaybackProgressUi(); return; }
  window.updateListenStatsTick(false);
  updatePlaybackProgressUi();
  if (window.audio.currentTime) updateLyricsHighlight();
}, 200);

// ============================================================
//  文件拖放
// ============================================================
document.getElementById('file-input').addEventListener('change', function(e){ handleFiles(e.target.files); e.target.value = ''; });
window.handleFiles = function(files) {
  var audioFile = null, imgFile = null;
  for (var i = 0; i < files.length; i++) {
    var f = files[i];
    if (f.type.startsWith('window.audio/') || /\.(mp3|flac|wav|ogg|m4a)$/i.test(f.name)) audioFile = f;
    else if (f.type.startsWith('image/') || /\.(jpg|jpeg|png|webp)$/i.test(f.name)) imgFile = f;
  }
  if (audioFile) {
    window.finalizeListenSession(false);
    var url = URL.createObjectURL(audioFile);
    var localTitle = audioFile.name.replace(/\.[^.]+$/, '');
    window.trackSwitchToken++;
    var token = window.trackSwitchToken;
    var firstVisualPlay = !window.firstPlayDone;
    if (window.localBeatAnalysis.active) window.cancelLocalBeatAnalysis();
    window.closeGsapModal(document.getElementById('local-beat-modal'));
    window.cancelBeatAnalysisTimer();
    cancelDjBeatAnalysisTimer();
    window.beatMapToken++;
    djBeatMapToken++;
    setDjModeActive(false);
    currentBeatMap = null;
    resetDjBeatMapState();
    beatMapNextIdx = 0;
    resetAudioVisualState();
    resetBeatCameraSync(0);
    currentIdx = -1;
    currentLocalSong = window.hydrateCustomCover({
      type: 'local',
      name: localTitle,
      artist: '本地文件',
      localKey: [audioFile.name, audioFile.size || 0, audioFile.lastModified || 0].join(':'),
      localUrl: url,
      duration: 0
    });
    window.updateCustomCoverButton();
    document.getElementById('hint').classList.add('hidden');
    document.getElementById('thumb-title').textContent = localTitle;
    document.getElementById('thumb-artist').textContent = '本地文件';
    updateControlTrackInfo({ name: localTitle, artist: '本地文件' });
    document.getElementById('thumb-wrap').classList.add('visible');
    window.safeRenderQueuePanel('play-local-file');
    window.safeShelfRebuild('play-local-file', true);
    suppressShelfPreviewForPlaybackSwitch();
    if (firstVisualPlay) { firstPlayDone = true; tweenParticleAlpha(window.uniforms.uAlpha.value || 0, 1.0, 260); }
    if (!window.audio) { audio = new Audio(); window.audio.crossOrigin = 'anonymous'; }
    else window.audio.pause();
    bindPlaybackProgressEvents(window.audio);
    applyVolumeToAudio();
    window.audio.src = url;
    updatePlaybackProgressUi();
    lyricSunEnergy = 0; lyricSunTarget = 0; lyricSunHold = 0; lyricSunAvg = 0; lyricSunPeak = 0.55;
    window.audio.onended = function(){ window.finalizeListenSession(true); playing = false; window.setPlayIcon(false); };
    window.audio.onloadedmetadata = function(){
      if (currentLocalSong && currentLocalSong.localUrl === url) {
        currentLocalSong.duration = window.audio && isFinite(window.audio.duration) ? window.audio.duration : 0;
        if (lyricSourceMode === 'custom') window.applyCustomLyricState(currentLocalSong, true);
      }
    };
    var localLyricLines = withLyricFallback([]);
    window.setOriginalLyricsState(localLyricLines, false, 'fallback');
    window.applyPreferredLyricsForCurrent(true);
    document.getElementById('trial-banner').classList.remove('show');
    window.audio.load();
    playAudio().then(function(ok){
      if (ok && currentLocalSong && currentLocalSong.localUrl === url) window.beginListenSession(currentLocalSong, null);
    });
    setTimeout(function(){
      if (currentLocalSong && currentLocalSong.localUrl === url) prepareLocalBeatAnalysis(currentLocalSong, url);
    }, 520);
    var localCover = window.getCustomCoverForSong(currentLocalSong);
    var localCoverOpts = { trackToken: token, deferHeavy: firstVisualPlay, delay: firstVisualPlay ? 60 : 0, timeout: firstVisualPlay ? 300 : 180 };
    if (localCover) applyCoverDataUrl(localCover, localCoverOpts);
    else if (!imgFile) loadCoverFromUrl('', localCoverOpts);
  }
  if (imgFile) {
    var uploadCoverOpts = audioFile
      ? { trackToken: window.trackSwitchToken, deferHeavy: !!firstVisualPlay, delay: firstVisualPlay ? 60 : 0, timeout: firstVisualPlay ? 300 : 180 }
      : null;
    loadCoverFromFile(imgFile, uploadCoverOpts);
  }
  if (!audioFile) window.updateCustomCoverButton();
}
var dropOv = document.getElementById('drop-overlay'), dragCount = 0;
document.addEventListener('dragenter', function(e){ e.preventDefault(); dragCount++; dropOv.classList.add('show'); });
document.addEventListener('dragleave', function(e){ e.preventDefault(); dragCount--; if (dragCount<=0){ dragCount=0; dropOv.classList.remove('show'); } });
document.addEventListener('dragover',  function(e){ e.preventDefault(); });
document.addEventListener('drop', function(e){
  e.preventDefault(); dragCount = 0; dropOv.classList.remove('show');
  if (e.dataTransfer.files.length) handleFiles(e.dataTransfer.files);
});

// ============================================================
//  更新提示预览
// ============================================================
window.formatUpdateBytes = function(bytes) {
  bytes = Number(bytes) || 0;
  if (bytes >= 1024 * 1024 * 1024) return (bytes / (1024 * 1024 * 1024)).toFixed(2).replace(/\.00$/, '') + ' GB';
  if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1).replace(/\.0$/, '') + ' MB';
  if (bytes >= 1024) return Math.round(bytes / 1024) + ' KB';
  return bytes + ' B';
}
window.formatUpdateSpeed = function(bytesPerSecond) {
  bytesPerSecond = Number(bytesPerSecond) || 0;
  return bytesPerSecond > 0 ? (formatUpdateBytes(bytesPerSecond) + '/s') : '';
}
window.updateProgressDetailText = function() {
  var parts = [];
  if (updatePreviewState.attempts > 1 && updatePreviewState.attempt > 0) {
    parts.push('线路 ' + updatePreviewState.attempt + '/' + updatePreviewState.attempts);
  }
  if (updatePreviewState.sourceLabel) parts.push(updatePreviewState.sourceLabel);
  if (updatePreviewState.received > 0) {
    parts.push(updatePreviewState.total > 0
      ? (formatUpdateBytes(updatePreviewState.received) + ' / ' + formatUpdateBytes(updatePreviewState.total))
      : ('已下载 ' + formatUpdateBytes(updatePreviewState.received)));
  }
  var speed = formatUpdateSpeed(updatePreviewState.speedBps);
  if (speed) parts.push(speed);
  if (updatePreviewState.etaSeconds > 0 && updatePreviewState.etaSeconds < 3600) parts.push('约 ' + updatePreviewState.etaSeconds + ' 秒');
  return parts.join(' · ');
}
window.initUpdatePreview = function() {
  renderUpdatePreviewPanel();
  setUpdatePreviewVisible(true);
  checkLatestUpdate();
  setTimeout(startUpdateIconBreathing, 760);
}

window.setUpdatePreviewVisible = function(visible) {
  updatePreviewState.visible = !!visible;
  var entry = document.getElementById('update-entry');
  if (!entry) return;
  entry.classList.toggle('available', updatePreviewState.visible);
  if (!updatePreviewState.visible && window.gsap) {
    window.gsap.killTweensOf(entry);
    window.gsap.set(entry, { autoAlpha: 0, y: 0, clearProps: 'boxShadow,filter,scale' });
    return;
  }
  if (updatePreviewState.visible && window.gsap) {
    window.gsap.fromTo(entry,
      { autoAlpha: 0, y: -6, scale: 0.92, filter: 'blur(6px)' },
      { autoAlpha: 1, y: 0, scale: 1, filter: 'blur(0px)', duration: 0.62, delay: 0.18, ease: 'expo.out', overwrite: true }
    );
  }
}

window.checkLatestUpdate = async function() {
  try {
    var data = await window.neteaseUpdateLatest();
    applyLatestUpdateInfo(data);
  } catch (e) {
    updatePreviewState.preview = true;
    updatePreviewState.updateAvailable = false;
    updatePreviewState.hero = '当前版本，更新检测已就绪。';
    renderUpdatePreviewPanel();
    setUpdatePreviewVisible(true);
  }
}

window.applyLatestUpdateInfo = function(data) {
  data = data || {};
  var release = data.release || {};
  updatePreviewState.currentVersion = data.currentVersion || updatePreviewState.currentVersion;
  updatePreviewState.version = data.latestVersion || release.version || updatePreviewState.currentVersion;
  updatePreviewState.configured = !!data.configured;
  updatePreviewState.preview = !!data.preview;
  updatePreviewState.updateAvailable = !!data.updateAvailable;
  updatePreviewState.releaseUrl = release.htmlUrl || data.htmlUrl || '';
  updatePreviewState.downloadUrl = release.downloadUrl || data.downloadUrl || '';
  updatePreviewState.patchAvailable = !!(release.patchAvailable && release.patch && release.patch.downloadUrl);
  updatePreviewState.patchUrl = updatePreviewState.patchAvailable ? release.patch.downloadUrl : '';
  updatePreviewState.patchFallbackTried = false;
  updatePreviewState.hero = release.summary || (updatePreviewState.updateAvailable ? '发现新版本，建议更新。' : '当前版本，更新检测已就绪。');
  if (Array.isArray(release.notes) && release.notes.length) {
    updatePreviewState.notes = release.notes.slice(0, 4);
  }
  renderUpdatePreviewPanel();
  setUpdatePreviewVisible(updatePreviewState.updateAvailable || updatePreviewState.preview);
}

window.startUpdateIconBreathing = function() {
  var entry = document.getElementById('update-entry');
  if (!entry || !window.gsap) return;
  var ring = entry.querySelector('.update-ring');
  window.gsap.killTweensOf(entry, 'y,boxShadow');
  window.gsap.set(entry, { autoAlpha: 1 });
  if (ring) window.gsap.killTweensOf(ring);
  window.gsap.to(entry, {
    y: -1.4,
    boxShadow: '0 16px 44px rgba(0,0,0,.32),0 0 24px rgba(244,210,138,.18),0 0 13px rgba(157,184,207,.06),inset 0 1px 0 rgba(255,255,255,.11)',
    duration: 2.6,
    repeat: -1,
    yoyo: true,
    ease: 'sine.inOut'
  });
  if (ring) {
    window.gsap.to(ring, {
      rotate: 18,
      duration: 3.8,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut',
      transformOrigin: '50% 50%'
    });
  }
}

window.renderUpdatePreviewPanel = function() {
  var version = document.getElementById('update-modal-version');
  var hero = document.getElementById('update-hero-main');
  var list = document.getElementById('update-list');
  if (version) version.textContent = 'v' + updatePreviewState.version;
  if (hero) hero.textContent = updatePreviewState.hero || '当前版本，更新检测已就绪。';
  if (list) {
    var notes = Array.isArray(updatePreviewState.notes) && updatePreviewState.notes.length ? updatePreviewState.notes : ['更新检测已就绪'];
    list.innerHTML = notes.map(function(text, i){
      return '<div class="update-item"><span class="update-item-dot" data-index="' + String(i + 1).padStart(2, '0') + '"></span><div class="update-item-text">' + window.escHtml(text) + '</div></div>';
    }).join('');
  }
  updateUpdatePreviewProgress(updatePreviewState.progress);
  syncUpdatePreviewStateClass();
}

window.syncUpdatePreviewStateClass = function() {
  var entry = document.getElementById('update-entry');
  var modal = document.querySelector('#update-modal .update-modal');
  var isDownloading = updatePreviewState.status === 'downloading';
  var isReady = updatePreviewState.status === 'ready';
  var isError = updatePreviewState.status === 'error';
  var isOpening = updatePreviewState.status === 'opening';
  var isPatch = updatePreviewState.mode === 'patch';
  if (entry) {
    entry.classList.toggle('downloading', isDownloading || isOpening);
    entry.classList.toggle('ready', isReady);
  }
  if (modal) {
    modal.classList.toggle('ready', isReady);
    modal.classList.toggle('error', isError);
  }
  var label = document.getElementById('update-btn-label');
  var btn = document.getElementById('update-primary-btn');
  var canDownloadUpdate = updatePreviewState.configured && updatePreviewState.updateAvailable && updatePreviewState.downloadUrl;
  var canOpenRelease = updatePreviewState.configured && updatePreviewState.updateAvailable && !updatePreviewState.downloadUrl && updatePreviewState.releaseUrl;
  if (label) {
    if (isDownloading) label.textContent = (isPatch ? '快速补丁 ' : '正在下载 ') + Math.round(updatePreviewState.progress) + '%';
    else if (isOpening) label.textContent = '正在打开安装包';
    else if (isError && updatePreviewState.mode === 'patch' && updatePreviewState.downloadUrl) label.textContent = '下载完整安装包';
    else if (isError) label.textContent = updatePreviewState.mode === 'installer' ? '重试下载' : '重试更新';
    else if (isReady && isPatch && updatePreviewState.restartRequired) label.textContent = '重启生效';
    else if (isReady && isPatch) label.textContent = '补丁已应用';
    else if (isReady && updatePreviewState.installerOpened) label.textContent = '安装包已打开';
    else if (isReady && updatePreviewState.installerPath) label.textContent = updatePreviewState.cached ? '打开已下载安装包' : '打开安装包';
    else if (isReady) label.textContent = updatePreviewState.configured ? '打开安装包' : '预览完成';
    else label.textContent = updatePreviewState.patchAvailable ? '安装快速补丁' : ((canDownloadUpdate || canOpenRelease) ? '下载完整安装包' : '立即更新');
  }
  if (btn) btn.disabled = false;
  var foot = document.getElementById('update-footnote');
  if (foot) {
    if (isDownloading) foot.textContent = (updatePreviewState.message || (isPatch ? '正在下载快速补丁' : '正在下载完整安装包')) + (updateProgressDetailText() ? ' · ' + updateProgressDetailText() : '');
    else if (isError) foot.textContent = '下载失败：' + (updatePreviewState.errorReason || updatePreviewState.errorDetail || updatePreviewState.message || '请稍后重试') + (updatePreviewState.failedAttempts && updatePreviewState.failedAttempts.length ? ' · 已尝试 ' + updatePreviewState.failedAttempts.length + ' 条线路' : '');
    else if (isReady && isPatch) foot.textContent = updatePreviewState.restartRequired ? '快速补丁已应用，重启 Mineradio 后生效。' : '快速补丁已应用。';
    else if (isReady) foot.textContent = updatePreviewState.cached ? '已复用上次校验通过的安装包，不会重复下载。' : '安装包已准备好，点击按钮后再打开安装。';
    else if (updatePreviewState.patchAvailable) foot.textContent = '优先使用轻量补丁，只更新缺失或变更的资源文件；不适用时可下载完整安装包。';
    else foot.textContent = updatePreviewState.updateAvailable ? '没有可用快速补丁时会下载完整安装包。' : '当前版本已是最新。';
  }
}

window.updateUpdatePreviewProgress = function(progress) {
  updatePreviewState.progress = window.clampRange(Number(progress) || 0, 0, 100);
  var fill = document.getElementById('update-btn-fill');
  if (fill) fill.style.width = updatePreviewState.progress + '%';
  var ring = document.getElementById('update-progress-ring');
  if (ring) {
    var circumference = 55.29;
    ring.style.strokeDashoffset = (circumference * (1 - updatePreviewState.progress / 100)).toFixed(2);
  }
  syncUpdatePreviewStateClass();
}

window.openUpdatePanel = function() {
  var mask = document.getElementById('update-modal');
  var entry = document.getElementById('update-entry');
  if (!mask) return;
  renderUpdatePreviewPanel();
  if (entry && window.gsap) {
    window.gsap.fromTo(entry, { scale: 0.93 }, { scale: 1, duration: 0.42, ease: 'back.out(1.7)', overwrite: 'auto' });
  }
  window.openGsapModal(mask);
  updatePreviewState.open = true;
  animateUpdatePanelContents();
}

window.closeUpdatePanel = function() {
  window.closeGsapModal(document.getElementById('update-modal'), function(){
    updatePreviewState.open = false;
  });
}

window.animateUpdatePanelContents = function() {
  if (!window.gsap) return;
  var modal = document.querySelector('#update-modal .update-modal');
  if (!modal) return;
  var parts = [
    modal.querySelector('.update-kicker'),
    modal.querySelector('.update-version'),
    modal.querySelector('.update-hero')
  ].filter(Boolean);
  var items = Array.prototype.slice.call(modal.querySelectorAll('.update-item'));
  var actions = modal.querySelector('.update-actions');
  window.gsap.fromTo(parts,
    { autoAlpha: 0, x: -7, filter: 'blur(5px)' },
    { autoAlpha: 1, x: 0, filter: 'blur(0px)', duration: 0.50, ease: 'power3.out', stagger: 0.045, delay: 0.10, overwrite: true }
  );
  window.gsap.fromTo(items,
    { autoAlpha: 0, x: -8 },
    { autoAlpha: 1, x: 0, duration: 0.34, ease: 'power3.out', stagger: 0.055, delay: 0.25, overwrite: true }
  );
  if (actions) {
    window.gsap.fromTo(actions,
      { autoAlpha: 0, y: 8 },
      { autoAlpha: 1, y: 0, duration: 0.36, ease: 'power3.out', delay: 0.42, overwrite: true }
    );
  }
}

window.startRealUpdateDownload = async function() {
  if (updatePreviewState.status === 'downloading' || updatePreviewState.status === 'opening') return;
  if (updatePreviewState.status === 'ready' && updatePreviewState.installerPath) {
    openDownloadedUpdateInstaller(updatePreviewState.installerPath);
    return;
  }
  if (updatePreviewState.timer) clearInterval(updatePreviewState.timer);
  if (updatePreviewState.pollTimer) clearInterval(updatePreviewState.pollTimer);
  updatePreviewState.status = 'downloading';
  updatePreviewState.progress = 0;
  updatePreviewState.mode = 'installer';
  updatePreviewState.downloadJobId = '';
  updatePreviewState.installerPath = '';
  updatePreviewState.installerOpened = false;
  updatePreviewState.cached = false;
  updatePreviewState.received = 0;
  updatePreviewState.total = 0;
  updatePreviewState.speedBps = 0;
  updatePreviewState.etaSeconds = 0;
  updatePreviewState.sourceLabel = '';
  updatePreviewState.attempt = 0;
  updatePreviewState.attempts = 0;
  updatePreviewState.errorReason = '';
  updatePreviewState.errorDetail = '';
  updatePreviewState.failedAttempts = [];
  updatePreviewState.message = '正在下载完整安装包';
  updateUpdatePreviewProgress(0);
  try {
    var job = await window.apiJson('/api/update/download', { method: 'POST' });
    if (!job || job.ok === false || !job.id) throw new Error((job && job.error) || 'UPDATE_DOWNLOAD_START_FAILED');
    updatePreviewState.downloadJobId = job.id;
    applyUpdateDownloadJob(job);
    updatePreviewState.pollTimer = setInterval(function(){
      pollUpdateDownloadJob(job.id);
    }, 360);
  } catch (e) {
    updatePreviewState.status = 'error';
    updatePreviewState.errorReason = (e && e.message) || '更新下载启动失败';
    updatePreviewState.errorDetail = updatePreviewState.errorReason;
    updatePreviewState.message = updatePreviewState.errorReason;
    updateUpdatePreviewProgress(0);
    window.showToast('更新下载启动失败：' + updatePreviewState.errorReason);
  }
}
window.startRealUpdatePatch = async function() {
  if (updatePreviewState.status === 'downloading' || updatePreviewState.status === 'opening') return;
  if (updatePreviewState.status === 'ready' && updatePreviewState.mode === 'patch') {
    restartForAppliedPatch();
    return;
  }
  if (updatePreviewState.timer) clearInterval(updatePreviewState.timer);
  if (updatePreviewState.pollTimer) clearInterval(updatePreviewState.pollTimer);
  updatePreviewState.status = 'downloading';
  updatePreviewState.mode = 'patch';
  updatePreviewState.progress = 0;
  updatePreviewState.patchJobId = '';
  updatePreviewState.installerPath = '';
  updatePreviewState.installerOpened = false;
  updatePreviewState.cached = false;
  updatePreviewState.received = 0;
  updatePreviewState.total = 0;
  updatePreviewState.speedBps = 0;
  updatePreviewState.etaSeconds = 0;
  updatePreviewState.sourceLabel = '';
  updatePreviewState.attempt = 0;
  updatePreviewState.attempts = 0;
  updatePreviewState.errorReason = '';
  updatePreviewState.errorDetail = '';
  updatePreviewState.failedAttempts = [];
  updatePreviewState.patchFallbackTried = false;
  updatePreviewState.message = '正在下载快速补丁';
  updateUpdatePreviewProgress(0);
  try {
    var job = await window.apiJson('/api/update/patch', { method: 'POST' });
    if (!job || job.ok === false || !job.id) throw new Error((job && job.error) || 'UPDATE_PATCH_START_FAILED');
    updatePreviewState.patchJobId = job.id;
    applyUpdateDownloadJob(job);
    updatePreviewState.pollTimer = setInterval(function(){
      pollUpdatePatchJob(job.id);
    }, 320);
  } catch (e) {
    updatePreviewState.status = 'error';
    updatePreviewState.errorReason = (e && e.message) || '快速补丁不可用';
    updatePreviewState.errorDetail = updatePreviewState.errorReason;
    updatePreviewState.message = updatePreviewState.errorReason;
    updateUpdatePreviewProgress(0);
    updatePreviewState.patchFallbackTried = true;
    window.showToast('快速补丁不可用，可手动下载完整安装包');
  }
}

window.pollUpdateDownloadJob = async function(id) {
  if (!id) return;
  try {
    var job = await window.apiJson('/api/update/download/status?id=' + encodeURIComponent(id) + '&t=' + Date.now());
    applyUpdateDownloadJob(job);
  } catch (e) {
    if (updatePreviewState.pollTimer) clearInterval(updatePreviewState.pollTimer);
    updatePreviewState.pollTimer = null;
    updatePreviewState.status = 'error';
    updatePreviewState.errorReason = '更新下载状态读取失败';
    updatePreviewState.errorDetail = (e && e.message) || updatePreviewState.errorReason;
    updatePreviewState.message = updatePreviewState.errorReason;
    updateUpdatePreviewProgress(updatePreviewState.progress || 0);
    window.showToast('更新下载状态读取失败');
  }
}
window.pollUpdatePatchJob = async function(id) {
  if (!id) return;
  try {
    var job = await window.apiJson('/api/update/patch/status?id=' + encodeURIComponent(id) + '&t=' + Date.now());
    applyUpdateDownloadJob(job);
  } catch (e) {
    if (updatePreviewState.pollTimer) clearInterval(updatePreviewState.pollTimer);
    updatePreviewState.pollTimer = null;
    updatePreviewState.status = 'error';
    updatePreviewState.errorReason = '快速补丁状态读取失败';
    updatePreviewState.errorDetail = (e && e.message) || updatePreviewState.errorReason;
    updatePreviewState.message = updatePreviewState.errorReason;
    updateUpdatePreviewProgress(updatePreviewState.progress || 0);
    window.showToast('快速补丁状态读取失败');
  }
}

window.applyUpdateDownloadJob = function(job) {
  if (!job || job.ok === false || job.status === 'error') {
    if (updatePreviewState.pollTimer) clearInterval(updatePreviewState.pollTimer);
    updatePreviewState.pollTimer = null;
    updatePreviewState.mode = (job && job.mode) || updatePreviewState.mode || 'installer';
    updatePreviewState.received = Number(job && job.received || 0);
    updatePreviewState.total = Number(job && job.total || 0);
    updatePreviewState.speedBps = Number(job && job.speedBps || 0);
    updatePreviewState.etaSeconds = Number(job && job.etaSeconds || 0);
    updatePreviewState.sourceLabel = (job && job.sourceLabel) || updatePreviewState.sourceLabel || '';
    updatePreviewState.attempt = Number(job && job.attempt || 0);
    updatePreviewState.attempts = Number(job && job.attempts || 0);
    updatePreviewState.errorReason = (job && (job.errorReason || job.message || job.error)) || '请稍后重试';
    updatePreviewState.errorDetail = (job && job.errorDetail) || '';
    updatePreviewState.failedAttempts = Array.isArray(job && job.failedAttempts) ? job.failedAttempts : [];
    updatePreviewState.message = (job && job.message) || updatePreviewState.errorReason;
    updatePreviewState.status = 'error';
    updateUpdatePreviewProgress(job && job.progress || updatePreviewState.progress || 0);
    if (updatePreviewState.mode === 'patch' && updatePreviewState.downloadUrl && !updatePreviewState.patchFallbackTried) {
      updatePreviewState.patchFallbackTried = true;
      window.showToast('快速补丁失败，可手动下载完整安装包：' + updatePreviewState.errorReason);
      return;
    }
    window.showToast('更新下载失败：' + updatePreviewState.errorReason);
    return;
  }
  if (job.id) updatePreviewState.downloadJobId = job.id;
  updatePreviewState.mode = job.mode || updatePreviewState.mode || 'installer';
  if (updatePreviewState.mode === 'patch') updatePreviewState.patchJobId = job.id || updatePreviewState.patchJobId;
  updatePreviewState.received = Number(job.received || 0);
  updatePreviewState.total = Number(job.total || 0);
  updatePreviewState.speedBps = Number(job.speedBps || 0);
  updatePreviewState.etaSeconds = Number(job.etaSeconds || 0);
  updatePreviewState.sourceLabel = job.sourceLabel || '';
  updatePreviewState.attempt = Number(job.attempt || 0);
  updatePreviewState.attempts = Number(job.attempts || 0);
  updatePreviewState.errorReason = job.errorReason || '';
  updatePreviewState.errorDetail = job.errorDetail || '';
  updatePreviewState.failedAttempts = Array.isArray(job.failedAttempts) ? job.failedAttempts : [];
  updatePreviewState.message = job.message || '';
  updatePreviewState.restartRequired = !!job.restartRequired;
  updatePreviewState.cached = !!job.cached;
  if (job.status === 'downloading' || job.status === 'queued') {
    updatePreviewState.status = 'downloading';
    updateUpdatePreviewProgress(job.progress || 0);
    return;
  }
  if (job.status === 'ready') {
    if (updatePreviewState.pollTimer) clearInterval(updatePreviewState.pollTimer);
    updatePreviewState.pollTimer = null;
    updatePreviewState.status = 'ready';
    updatePreviewState.installerPath = job.filePath || '';
    updateUpdatePreviewProgress(100);
    pulseUpdateReady();
    if (updatePreviewState.mode === 'patch') {
      window.showToast(updatePreviewState.restartRequired ? '快速补丁已应用，重启后生效' : '快速补丁已应用');
    } else if (updatePreviewState.installerPath) {
      window.showToast(updatePreviewState.cached ? '已复用上次下载的安装包' : '安装包已下载，点击按钮打开');
    }
  }
}
window.restartForAppliedPatch = async function() {
  if (!updatePreviewState.restartRequired) return;
  try {
    if (window.desktopWindow && typeof window.desktopWindow.restartApp === 'function') {
      await window.desktopWindow.restartApp();
      return;
    }
  } catch (e) {}
  window.showToast('请手动重启 Mineradio 让补丁生效');
}

window.openDownloadedUpdateInstaller = async function(filePath) {
  if (!filePath) return;
  if (updatePreviewState.installerOpened) return;
  updatePreviewState.status = 'opening';
  syncUpdatePreviewStateClass();
  try {
    if (window.desktopWindow && window.desktopWindow.openUpdateInstaller) {
      var result = await window.desktopWindow.openUpdateInstaller(filePath);
      if (!result || result.ok === false) throw new Error((result && result.error) || 'OPEN_UPDATE_FAILED');
      updatePreviewState.installerOpened = true;
      updatePreviewState.status = 'ready';
      syncUpdatePreviewStateClass();
      window.showToast('安装包已打开');
      return;
    }
    throw new Error('DESKTOP_BRIDGE_MISSING');
  } catch (e) {
    updatePreviewState.status = 'ready';
    syncUpdatePreviewStateClass();
    if (updatePreviewState.releaseUrl) window.open(updatePreviewState.releaseUrl, '_blank');
    window.showToast('无法自动打开安装包，已尝试打开更新页面');
  }
}

window.startUpdatePreviewDownload = function() {
  var releaseLink = updatePreviewState.downloadUrl || updatePreviewState.releaseUrl;
  if (updatePreviewState.status === 'ready' && updatePreviewState.mode === 'patch') {
    restartForAppliedPatch();
    return;
  }
  if (updatePreviewState.configured && updatePreviewState.updateAvailable) {
    if (updatePreviewState.patchAvailable && updatePreviewState.patchUrl && !updatePreviewState.patchFallbackTried) {
      startRealUpdatePatch();
    } else if (updatePreviewState.downloadUrl) {
      startRealUpdateDownload();
    } else if (releaseLink) {
      window.open(releaseLink, '_blank');
      window.showToast('已打开更新页面');
    } else {
      window.showToast('这个版本还没有可用下载链接');
    }
    return;
  }
  if (updatePreviewState.status === 'ready') {
    if (window.gsap) {
      var modal = document.querySelector('#update-modal .update-modal');
      if (modal) window.gsap.fromTo(modal, { boxShadow: '0 30px 100px rgba(0,0,0,.62),0 0 0 1px rgba(244,210,138,.16)' }, { boxShadow: '0 30px 100px rgba(0,0,0,.62),0 0 34px rgba(244,210,138,.18)', duration: 0.52, yoyo: true, repeat: 1, ease: 'sine.inOut' });
    }
    window.showToast('正式接入后将重启并安装新版');
    return;
  }
  if (updatePreviewState.status === 'downloading') return;
  if (updatePreviewState.timer) clearInterval(updatePreviewState.timer);
  updatePreviewState.status = 'downloading';
  updateUpdatePreviewProgress(0);
  var btn = document.getElementById('update-primary-btn');
  if (btn && window.gsap) window.gsap.fromTo(btn, { scale: 0.985 }, { scale: 1, duration: 0.34, ease: 'back.out(1.45)', overwrite: true });
  updatePreviewState.timer = setInterval(function(){
    var next = updatePreviewState.progress + 3.2 + Math.random() * 7.5;
    if (next >= 100) {
      clearInterval(updatePreviewState.timer);
      updatePreviewState.timer = null;
      updatePreviewState.status = 'ready';
      updateUpdatePreviewProgress(100);
      pulseUpdateReady();
    } else {
      updateUpdatePreviewProgress(next);
    }
  }, 260);
}

window.pulseUpdateReady = function() {
  var entry = document.getElementById('update-entry');
  var btn = document.getElementById('update-primary-btn');
  if (!window.gsap) return;
  if (entry) {
    window.gsap.fromTo(entry,
      { scale: 0.96, filter: 'drop-shadow(0 0 0 rgba(244,210,138,0))' },
      { scale: 1.04, filter: 'drop-shadow(0 0 14px rgba(244,210,138,.28))', duration: 0.34, yoyo: true, repeat: 1, ease: 'sine.inOut', overwrite: 'auto' }
    );
  }
  if (btn) {
    window.gsap.fromTo(btn,
      { boxShadow: '0 0 0 rgba(244,210,138,0), inset 0 1px 0 rgba(255,255,255,.09)' },
      { boxShadow: '0 0 24px rgba(244,210,138,.16), inset 0 1px 0 rgba(255,255,255,.11)', duration: 0.42, yoyo: true, repeat: 1, ease: 'sine.inOut', overwrite: true }
    );
  }
}

// ============================================================
