//  Collect / playlist helpers
// ============================================================
function openCollectModal(song) {
  if (!window.isCloudSong(song) && window.songProviderKey(song) !== 'youtube') {
    window.showToast(window.songProviderKey(song) === 'qq' ? 'QQ 音乐收藏到歌单待登录接口接入' : '本地文件暂不支持收藏到网易云歌单');
    return;
  }
  if (window.songProviderKey(song) === 'youtube') {
    collectTargetSong = song;
    window.renderCollectModal();
    window.openGsapModal(document.getElementById('collect-modal'));
    return;
  }
  if (!window.ensureLoggedInForAction()) return;
  collectTargetSong = song;
  window.renderCollectModal();
  window.openGsapModal(document.getElementById('collect-modal'));
  window.refreshUserPlaylists(true).then(function(){ window.renderCollectModal(); }).catch(function(){ window.renderCollectModal(); });
}
function openCollectModalForCurrent() {
 window.openCollectModal(window.currentCoverSong()); }
function collectSearchResult(i) {
 if (window.playlist[i]) window.openCollectModal(window.playlist[i]); }
function collectQueueIndex(i) {
 if (window.playQueue[i]) window.openCollectModal(window.playQueue[i]); }
function collectDetailSong(song) {
 window.openCollectModal(song); }
function closeCollectModal() {
  window.closeGsapModal(document.getElementById('collect-modal'), function(){
    collectTargetSong = null;
    var input = document.getElementById('collect-new-name');
    if (input) input.value = '';
  });
}
function renderCollectModal() {
  var current = document.getElementById('collect-current');
  var list = document.getElementById('collect-list');
  if (!current || !list) return;
  var song = collectTargetSong || {};
  var cover = window.songCoverSrc(song, 80);
  current.innerHTML = (cover ? '<img src="' + cover + '" alt="">' : '<div class="cover-placeholder"></div>') +
    '<div style="min-width:0"><div class="collect-title">' + window.escHtml(song.name || '当前歌曲') + '</div><div class="collect-sub">' + window.escHtml(song.artist || '') + '</div></div>';
  if (!window.loginStatus.loggedIn) {
    list.innerHTML = '<div class="collect-empty">登录后显示你的歌单</div>';
    return;
  }
  if (!window.userPlaylists.length) {
    list.innerHTML = miniQueueSkeleton();
    return;
  }
  var mine = window.userPlaylists.filter(function(pl){ return !pl.subscribed; });
  if (!mine.length) {
    list.innerHTML = '<div class="collect-empty">还没有可写入的歌单，可以先新建一个</div>';
    return;
  }
  list.innerHTML = mine.map(function(pl){
    var thumb = pl.cover ? window.coverUrlWithSize(pl.cover, 80) : '';
    return '<div class="collect-item" data-collect-pid="' + window.escHtml(String(pl.id || '')) + '" onclick="window.addCollectTargetToPlaylist(this.getAttribute(\'data-collect-pid\'))">' +
      (thumb ? '<img src="' + thumb + '" alt="">' : '<div class="cover-placeholder"></div>') +
      '<div style="min-width:0"><div class="collect-title">' + window.escHtml(pl.name || '') + '</div><div class="collect-sub">' + (pl.trackCount || 0) + ' 首</div></div>' +
    '</div>';
  }).join('');
  if (window.gsap) animateListItems(list, '.collect-item', { x: 0, y: 6, stagger: 0.012, duration: 0.18, limit: 18 });
}
function setCollectBusyPid(pid, busy) {
  var list = document.getElementById('collect-list');
  if (!list) return;
  list.querySelectorAll('.collect-item').forEach(function(item){
    item.classList.toggle('busy', !!busy && item.getAttribute('data-collect-pid') === String(pid));
  });
}
async function createPlaylistFromCollect() {
  if (!window.ensureLoggedInForAction()) return;
  var input = document.getElementById('collect-new-name');
  var name = input ? input.value.trim() : '';
  if (!name) { window.showToast('先输入歌单名称'); return; }
  try {
    var r = await window.neteasePlaylistCreate(name);
    if (r && r.error) throw new Error(r.error);
    if (input) input.value = '';
    window.showToast('歌单已创建');
    await window.refreshUserPlaylists(true);
    window.renderCollectModal();
    var created = r && r.playlist;
    var pid = created && created.id;
    if (pid && collectTargetSong) window.addCollectTargetToPlaylist(pid);
  } catch (err) {
    window.showToast('创建歌单失败');
  }
}
function collectResultMessage(r) {
  if (!r) return '收藏失败';
  var msg = r.error || r.message || r.msg || '';
  if (msg === 'LOGIN_REQUIRED') return '登录后可同步到网易云';
  if (/exist|重复|已存在|already/i.test(String(msg))) return '歌曲已在歌单中';
  return msg ? ('收藏失败: ' + msg) : '收藏失败';
}
async function verifySongInPlaylist(pid, songId) {
  songId = String(songId || '');
  if (!pid || !songId) return false;
  for (var attempt = 0; attempt < 3; attempt++) {
    if (attempt) {
      await new Promise(function(resolve){ setTimeout(resolve, attempt === 1 ? 360 : 820); });
    }
    try {
      var detail = await window.neteasePlaylistTracks(pid);
      var tracks = (detail && detail.tracks) || [];
      for (var i = 0; i < tracks.length; i++) {
        if (String(tracks[i].id) === songId) return true;
      }
    } catch (e) {
      console.warn('collect verify failed:', e);
    }
  }
  return false;
}
async function addCollectTargetToPlaylist(pid) {
  if (collectBusy || !collectTargetSong || !pid) return;
  collectBusy = true;
  window.setCollectBusyPid(pid, true);
  window.updateLikeButtons();
  window.showToast('正在收藏到歌单...');
  try {
    var songId = String(collectTargetSong.id || '');
    var r = await window.apiJson('/api/window.playlist/add-song', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pid: pid, id: songId })
    });
    if (!(r && r.success)) throw new Error(window.collectResultMessage(r));
    window.showToast('已收藏到歌单');
    window.closeCollectModal();
    window.refreshUserPlaylists(true);
    setTimeout(function(){
      window.verifySongInPlaylist(pid, songId).then(function(ok){
        if (!ok) console.warn('collect submitted but verify did not find song yet:', pid, songId);
      });
    }, 900);
  } catch (err) {
    window.showToast(err && err.message ? err.message : '收藏失败');
  } finally {
    collectBusy = false;
    window.setCollectBusyPid(pid, false);
    window.updateLikeButtons();
  }
}
