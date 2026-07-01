//  Collect / playlist helpers
// ============================================================
function openCollectModal(song) {
  if (!isCloudSong(song) && Mineradio.util.songProviderKey(song) !== 'youtube') {
    showToast(Mineradio.util.songProviderKey(song) === 'qq' ? 'QQ 音乐收藏到歌单待登录接口接入' : '本地文件暂不支持收藏到网易云歌单');
    return;
  }
  if (Mineradio.util.songProviderKey(song) === 'youtube') {
    collectTargetSong = song;
    renderCollectModal();
    Mineradio.util.openGsapModal(document.getElementById('collect-modal'));
    return;
  }
  if (!ensureLoggedInForAction()) return;
  collectTargetSong = song;
  renderCollectModal();
  Mineradio.util.openGsapModal(document.getElementById('collect-modal'));
  refreshUserPlaylists(true).then(function(){ renderCollectModal(); }).catch(function(){ renderCollectModal(); });
}
function openCollectModalForCurrent() { openCollectModal(currentCoverSong()); }
function collectSearchResult(i) { if (playlist[i]) openCollectModal(playlist[i]); }
function collectQueueIndex(i) { if (playQueue[i]) openCollectModal(playQueue[i]); }
function collectDetailSong(song) { openCollectModal(song); }
function closeCollectModal() {
  Mineradio.util.closeGsapModal(document.getElementById('collect-modal'), function(){
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
  var cover = songCoverSrc(song, 80);
  current.innerHTML = (cover ? '<img src="' + cover + '" alt="">' : '<div class="cover-placeholder"></div>') +
    '<div style="min-width:0"><div class="collect-title">' + Mineradio.util.escHtml(song.name || '当前歌曲') + '</div><div class="collect-sub">' + Mineradio.util.escHtml(song.artist || '') + '</div></div>';
  if (!loginStatus.loggedIn) {
    list.innerHTML = '<div class="collect-empty">登录后显示你的歌单</div>';
    return;
  }
  if (!userPlaylists.length) {
    list.innerHTML = miniQueueSkeleton();
    return;
  }
  var mine = userPlaylists.filter(function(pl){ return !pl.subscribed; });
  if (!mine.length) {
    list.innerHTML = '<div class="collect-empty">还没有可写入的歌单，可以先新建一个</div>';
    return;
  }
  list.innerHTML = mine.map(function(pl){
    var thumb = pl.cover ? coverUrlWithSize(pl.cover, 80) : '';
    return '<div class="collect-item" data-collect-pid="' + Mineradio.util.escHtml(String(pl.id || '')) + '" onclick="addCollectTargetToPlaylist(this.getAttribute(\'data-collect-pid\'))">' +
      (thumb ? '<img src="' + thumb + '" alt="">' : '<div class="cover-placeholder"></div>') +
      '<div style="min-width:0"><div class="collect-title">' + Mineradio.util.escHtml(pl.name || '') + '</div><div class="collect-sub">' + (pl.trackCount || 0) + ' 首</div></div>' +
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
  if (!ensureLoggedInForAction()) return;
  var input = document.getElementById('collect-new-name');
  var name = input ? input.value.trim() : '';
  if (!name) { showToast('先输入歌单名称'); return; }
  try {
    var r = await Mineradio.platforms.netease.playlistCreate(name);
    if (r && r.error) throw new Error(r.error);
    if (input) input.value = '';
    showToast('歌单已创建');
    await refreshUserPlaylists(true);
    renderCollectModal();
    var created = r && r.playlist;
    var pid = created && created.id;
    if (pid && collectTargetSong) addCollectTargetToPlaylist(pid);
  } catch (err) {
    showToast('创建歌单失败');
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
      var detail = await Mineradio.platforms.netease.playlistTracks(pid);
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
  setCollectBusyPid(pid, true);
  updateLikeButtons();
  showToast('正在收藏到歌单...');
  try {
    var songId = String(collectTargetSong.id || '');
    var r = await Mineradio.util.apiJson('/api/playlist/add-song', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pid: pid, id: songId })
    });
    if (!(r && r.success)) throw new Error(collectResultMessage(r));
    showToast('已收藏到歌单');
    closeCollectModal();
    refreshUserPlaylists(true);
    setTimeout(function(){
      verifySongInPlaylist(pid, songId).then(function(ok){
        if (!ok) console.warn('collect submitted but verify did not find song yet:', pid, songId);
      });
    }, 900);
  } catch (err) {
    showToast(err && err.message ? err.message : '收藏失败');
  } finally {
    collectBusy = false;
    setCollectBusyPid(pid, false);
    updateLikeButtons();
  }
}

// ============================================================
//  Namespace Exports — Mineradio.collect
// ============================================================
window.Mineradio = window.Mineradio || {};
Mineradio.collect = {
  openCollectModal: openCollectModal,
  openCollectModalForCurrent: openCollectModalForCurrent,
  collectSearchResult: collectSearchResult,
  collectQueueIndex: collectQueueIndex,
  collectDetailSong: collectDetailSong,
  closeCollectModal: closeCollectModal,
  renderCollectModal: renderCollectModal,
  setCollectBusyPid: setCollectBusyPid,
  createPlaylistFromCollect: createPlaylistFromCollect,
  collectResultMessage: collectResultMessage,
  verifySongInPlaylist: verifySongInPlaylist,
  addCollectTargetToPlaylist: addCollectTargetToPlaylist
};
