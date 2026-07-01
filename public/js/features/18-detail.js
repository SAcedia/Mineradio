// Track / Artist Detail Modal
// ============================================================
window.trackDetailSeq = 0;
window.detailArtistSongs = [];
function currentArtistNames(song) {
  var text = String((song && song.artist) || '').trim();
  if (!text) return [];
  return text.split(/\s*\/\s*|\s*,\s*|、/).map(function(s){ return s.trim(); }).filter(Boolean);
}
function normalizeArtistNameForMatch(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/[\s·・,，、/\\|&＋+_-]+/g, '')
    .replace(/[()（）\[\]【】"'“”‘’]/g, '');
}
function artistNameMatches(expectedNames, actualName) {
  var actual = window.normalizeArtistNameForMatch(actualName);
  if (!actual) return false;
  return (expectedNames || []).some(function(name){
    var expected = window.normalizeArtistNameForMatch(name);
    return expected && (expected === actual || expected.indexOf(actual) >= 0 || actual.indexOf(expected) >= 0);
  });
}
function currentArtistId(song) {
  if (!song) return '';
  if (!window.isCloudSong(song)) return '';
  if (song.artistId) return String(song.artistId);
  var artists = song.artists || [];
  for (var i = 0; i < artists.length; i++) {
    if (artists[i] && artists[i].id) return String(artists[i].id);
  }
  return '';
}
function currentQQArtistMid(song) {
  if (!song || window.songProviderKey(song) !== 'qq') return '';
  if (song.artistMid) return String(song.artistMid);
  if (song.singerMid) return String(song.singerMid);
  if (song.artistId && !/^\d+$/.test(String(song.artistId))) return String(song.artistId);
  var artists = song.artists || [];
  for (var i = 0; i < artists.length; i++) {
    if (artists[i] && artists[i].mid) return String(artists[i].mid);
    if (artists[i] && artists[i].id && !/^\d+$/.test(String(artists[i].id))) return String(artists[i].id);
  }
  return '';
}
function commentTimeLabel(ms) {
  var t = Number(ms) || 0;
  if (!t) return '';
  try {
    return new Date(t).toLocaleDateString('zh-CN', { month:'short', day:'numeric' });
  } catch (e) {
    return '';
  }
}
function renderDetailComments(comments) {
  if (!comments || !comments.length) return '<div class="detail-empty">暂无评论</div>';
  return '<div class="detail-scroll">' + comments.map(function(c){
    var user = c.user || {};
    var avatar = user.avatar ? window.coverUrlWithSize(user.avatar, 64) : '';
    return '<div class="comment-item">' +
      (avatar ? '<img class="comment-avatar" src="' + avatar + '" alt="">' : '<div class="comment-avatar"></div>') +
      '<div class="comment-main"><div class="comment-meta">' + window.escHtml(user.nickname || '音乐用户') + (c.likedCount ? (' · ' + c.likedCount + ' 赞') : '') + (c.time ? (' · ' + window.escHtml(window.commentTimeLabel(c.time))) : '') + '</div>' +
      '<div class="comment-text">' + window.escHtml(c.content || '') + '</div></div>' +
    '</div>';
  }).join('') + '</div>';
}
function renderArtistSongList(songs) {
  detailArtistSongs = (songs || []).map(window.cloneSong);
  if (!detailArtistSongs.length) return '<div class="detail-empty">暂无热门歌曲</div>';
  return '<div class="detail-scroll">' + detailArtistSongs.map(function(s, i){
    var cover = window.songCoverSrc(s, 80);
    var coverHtml = cover ? '<img class="artist-song-cover" src="' + window.escHtml(cover) + '" alt="" onerror="this.style.opacity=0.18">' : '<div class="artist-song-cover"></div>';
    var actionsHtml = '<div class="artist-song-actions">' +
      '<button class="artist-song-action collect" type="button" title="收藏到歌单" aria-label="收藏到歌单" onclick="event.stopPropagation();window.collectArtistDetailSong(' + i + ')">' + window.artistCollectTrayIconSvg() + '</button>' +
      '<button class="artist-song-action next" type="button" title="下一首播放" aria-label="下一首播放" onclick="event.stopPropagation();window.queueArtistDetailSongNext(' + i + ')">' + window.artistNextPlusIconSvg() + '</button>' +
    '</div>';
    return '<div class="artist-song-item" onclick="window.playArtistDetailSong(' + i + ')">' +
      '<div class="artist-song-rank">' + String(i + 1).padStart(2, '0') + '</div>' +
      coverHtml +
      '<div class="artist-song-main"><div class="artist-song-name">' + window.escHtml(s.name || '') + '</div>' +
      '<div class="artist-song-meta">' + window.escHtml((s.album || '未知专辑') + (s.duration ? (' · ' + window.songDurationLabel(s)) : '')) + '</div></div>' +
      actionsHtml +
    '</div>';
  }).join('') + '</div>';
}
function playArtistDetailSong(i) {
  var song = detailArtistSongs[i];
  if (!song) return;
  playQueue = detailArtistSongs.map(window.cloneSong);
  currentIdx = i;
  window.safeRenderQueuePanel('artist-detail-play');
  window.safeShelfRebuild('artist-detail-play', true);
  window.closeTrackDetailModal();
  window.playQueueAt(i).catch(function(e){ console.warn('[ArtistDetailPlay]', e); });
}
function collectArtistDetailSong(i) {
  var song = detailArtistSongs[i];
  if (!song) return;
  window.collectDetailSong(song);
}
function queueArtistDetailSongNext(i) {
  var song = detailArtistSongs[i];
  if (!song) return;
  queueDetailSongNext(song);
}
function bindTrackDetailScrollers() {
  var body = document.getElementById('track-detail-body');
  bindSmoothWheelScroll(body);
  if (body) body.querySelectorAll('.detail-scroll').forEach(bindSmoothWheelScroll);
}
function closeTrackDetailModal() {
  window.closeGsapModal(document.getElementById('track-detail-modal'));
}
function openTrackDetailModal(type, songOverride) {
  var song = songOverride || window.currentCoverSong();
  if (!song) { window.showToast('先播放或选择一首歌'); return; }
  if (window.immersiveMode) setImmersiveMode(false);
  var heading = document.getElementById('track-detail-heading');
  var body = document.getElementById('track-detail-body');
  if (!heading || !body) return;
  var cover = window.songCoverSrc(song, 180);
  var coverHtml = cover ? '<img class="detail-cover" src="' + cover + '" alt="">' : '<div class="detail-cover"></div>';
  var title = song.name || '当前歌曲';
  var artists = window.currentArtistNames(song);
  var seq = ++trackDetailSeq;
  if (type === 'artist') {
    var artistId = window.currentArtistId(song);
    var qqArtistMid = window.currentQQArtistMid(song);
    var isYT = window.songProviderKey(song) === 'youtube';
    var artistDetailUrl = artistId
      ? ('/api/artist/detail?id=' + encodeURIComponent(artistId) + '&limit=36')
      : (qqArtistMid ? ('/api/qq/artist/detail?mid=' + encodeURIComponent(qqArtistMid) + '&limit=36') : '');
    if (!artistDetailUrl && isYT && artistName) {
      artistDetailUrl = '/api/youtube/search?keywords=' + encodeURIComponent(artistName) + '&limit=36';
    }
    var artistName = artists.join(' / ') || song.artist || '未知歌手';
    var artistNamesForMatch = artists.length ? artists : (song.artist ? [song.artist] : []);
    var artistInitial = artistName && artistName !== '未知歌手' ? artistName.slice(0, 1) : '歌';
    var artistCoverHtml = '<div id="artist-detail-cover" class="detail-cover detail-artist-avatar">' + window.escHtml(artistInitial) + '</div>';
    var artistEmptyText = window.songProviderKey(song) === 'qq'
      ? '当前 QQ 歌曲缺少 singerMid，无法打开 QQ 歌手主页。'
      : '当前歌曲缺少可用的歌手主页信息';
    var artistLoadingText = window.songProviderKey(song) === 'qq' ? '正在载入 QQ 歌手主页...' : '正在载入歌手主页...';
    heading.textContent = '歌手详情';
    body.innerHTML =
      '<div class="detail-hero">' + artistCoverHtml +
        '<div style="min-width:0;flex:1"><div class="detail-title">' + window.escHtml(artistName) + '</div>' +
        '<div class="detail-sub">来自当前播放 · ' + window.escHtml(title) + '</div></div>' +
      '</div>' +
      '<div class="detail-grid">' +
        window.detailRow('当前歌曲', title) +
        window.detailRow('关联歌手', artistName) +
        window.detailRow('所属专辑', song.album || (song.type === 'podcast' ? (song.radioName || 'Podcast') : '未知')) +
        window.detailRow('来源', window.songSourceLabel(song)) +
      '</div>' +
      '<div class="detail-chip-row">' + (artists.length ? artists.map(function(name){ return '<span class="detail-chip">' + window.escHtml(name) + '</span>'; }).join('') : '<span class="detail-chip">未知歌手</span>') + '</div>' +
      '<div class="detail-section"><div class="detail-section-head"><div class="detail-section-title">热门歌曲</div></div><div id="artist-hot-songs">' + (artistDetailUrl ? '<div class="detail-loading">' + window.escHtml(artistLoadingText) + '</div>' : '<div class="detail-empty">' + window.escHtml(artistEmptyText) + '</div>') + '</div></div>';
    if (artistDetailUrl) {
      window.apiJson(artistDetailUrl).then(function(r){
        if (seq !== trackDetailSeq) return;
        var returnedName = r && r.artist && r.artist.name;
        var target = document.getElementById('artist-hot-songs');
        if (returnedName && artistNamesForMatch.length && !window.artistNameMatches(artistNamesForMatch, returnedName)) {
          if (target) target.innerHTML = '<div class="detail-empty">歌手资料与当前歌曲不匹配，已停止展示错误主页。</div>';
          window.bindTrackDetailScrollers();
          return;
        }
        if (returnedName) {
          var titleEl = body.querySelector('.detail-title');
          if (titleEl) titleEl.textContent = r.artist.name;
        }
        if (r && r.artist && r.artist.avatar) {
          var avatarEl = document.getElementById('artist-detail-cover');
          if (avatarEl) {
            avatarEl.textContent = '';
            avatarEl.style.backgroundImage = 'url("' + window.coverUrlWithSize(r.artist.avatar, 180).replace(/"/g, '\\"') + '")';
            avatarEl.style.backgroundSize = 'cover';
            avatarEl.style.backgroundPosition = 'center';
          }
        }
        if (target) target.innerHTML = r && !r.error ? window.renderArtistSongList(r.songs || []) : '<div class="detail-empty">歌手主页加载失败</div>';
        window.bindTrackDetailScrollers();
      }).catch(function(){
        var target = document.getElementById('artist-hot-songs');
        if (seq === trackDetailSeq && target) target.innerHTML = '<div class="detail-empty">歌手主页加载失败</div>';
        window.bindTrackDetailScrollers();
      });
    }
  } else {
    heading.textContent = '歌曲详情';
    var detailIsQQ = window.songProviderKey(song) === 'qq';
    var detailIsYT = window.songProviderKey(song) === 'youtube';
    var detailCanLoadComments = window.isCloudSong(song) || detailIsQQ;
    var detailCommentTitle = detailIsQQ ? 'QQ 音乐评论' : (detailIsYT ? 'YouTube' : '网易云评论');
    var detailEmptyText = detailIsQQ ? '当前 QQ 歌曲暂无评论' : (detailIsYT ? 'YouTube 歌曲暂不支持评论查看' : '本地文件暂无网易云评论');
    body.innerHTML =
      '<div class="detail-hero">' + coverHtml +
        '<div style="min-width:0;flex:1"><div class="detail-title">' + window.escHtml(title) + '</div>' +
        '<div class="detail-sub">' + window.escHtml(song.artist || (song.type === 'local' ? '本地文件' : '未知歌手')) + '</div></div>' +
      '</div>' +
      '<div class="detail-grid">' +
        window.detailRow('歌曲名', title) +
        window.detailRow('歌手', song.artist || '未知歌手') +
        window.detailRow('专辑', song.album || (song.type === 'podcast' ? (song.radioName || 'Podcast') : '未知')) +
        window.detailRow('时长', window.songDurationLabel(song)) +
        window.detailRow('来源', window.songSourceLabel(song)) +
        window.detailRow('歌词源', lyricSourceMode === 'custom' ? '自定义歌词' : (lyricsTimingSource === 'fallback' ? '占位歌词' : '原词')) +
      '</div>' +
      '<div class="detail-chip-row">' +
        '<span class="detail-chip">' + window.escHtml(window.songSourceLabel(song)) + '</span>' +
        (window.isSongLiked(song) ? '<span class="detail-chip">红心喜欢</span>' : '') +
        (window.getCustomCoverForSong(song) ? '<span class="detail-chip">自定义封面</span>' : '') +
        (window.hasCustomLyricForSong(song) ? '<span class="detail-chip">自定义歌词</span>' : '') +
      '</div>' +
      '<div class="detail-section"><div class="detail-section-head"><div class="detail-section-title">' + detailCommentTitle + '</div></div><div id="song-comments">' + (detailCanLoadComments ? '<div class="detail-loading">正在载入评论...</div>' : '<div class="detail-empty">' + detailEmptyText + '</div>') + '</div></div>';
    if (detailCanLoadComments) {
      var commentUrl = detailIsQQ
        ? ('/api/qq/song/comments?id=' + encodeURIComponent(song.qqId || '') + '&mid=' + encodeURIComponent(song.mid || song.songmid || song.id || '') + '&limit=18')
        : ('/api/song/comments?id=' + encodeURIComponent(song.id) + '&limit=18');
      window.apiJson(commentUrl).then(function(r){
        if (seq !== trackDetailSeq) return;
        var target = document.getElementById('song-comments');
        if (target) target.innerHTML = r && !r.error ? window.renderDetailComments(r.comments || []) : '<div class="detail-empty">评论加载失败</div>';
        window.bindTrackDetailScrollers();
      }).catch(function(){
        var target = document.getElementById('song-comments');
        if (seq === trackDetailSeq && target) target.innerHTML = '<div class="detail-empty">评论加载失败</div>';
        window.bindTrackDetailScrollers();
      });
    }
  }
  window.bindTrackDetailScrollers();
  window.openGsapModal(document.getElementById('track-detail-modal'));
}
function openArtistDetailForSong(song) {
  if (!song) { window.showToast('未找到歌手信息'); return; }
  if (window.currentArtistId(song) || window.currentQQArtistMid(song)) {
    window.openTrackDetailModal('artist', song);
    return;
  }
  var artist = String(song.artist || '').split(/\s*\/\s*|\s*,\s*|、|&| feat\.? | ft\.? /i).filter(Boolean)[0] || '';
  if (artist) {
    window.resolveArtistSongForDetail(song, artist).then(function(found){
      window.openTrackDetailModal('artist', found || Object.assign({}, song, { artist: artist }));
    }).catch(function(){
      window.openTrackDetailModal('artist', Object.assign({}, song, { artist: artist }));
    });
    window.showToast('正在查找歌手主页: ' + artist);
  } else {
    window.showToast('当前歌曲缺少歌手主页信息');
  }
}
function resolveArtistSongForDetail(song, artist) {
  var provider = window.songProviderKey(song) === 'qq' ? 'qq' : (window.songProviderKey(song) === 'youtube' ? 'youtube' : 'netease');
  var url = provider === 'qq'
    ? '/api/qq/search?keywords=' + encodeURIComponent(artist) + '&limit=8'
    : provider === 'youtube'
    ? '/api/youtube/search?keywords=' + encodeURIComponent(artist) + '&limit=10'
    : '/api/search?keywords=' + encodeURIComponent(artist) + '&limit=10';
  return window.apiJson(url).then(function(r){
    var songs = (r && r.songs) || [];
    for (var i = 0; i < songs.length; i++) {
      var candidate = songs[i];
      if (!candidate) continue;
      if (!window.artistNameMatches([artist], candidate.artist || '')) continue;
      if (window.currentArtistId(candidate) || window.currentQQArtistMid(candidate)) return candidate;
    }
    return null;
  });
}

function closeCustomLyricModal() {
  closeGsapModal(document.getElementById('custom-lyric-modal'));
};
