// 18-detail.js — Track/artist detail modal, comments, custom lyrics
// Extracted from core/api-helper.js

function currentCoverSong() {
  if (currentIdx >= 0 && playQueue[currentIdx]) return playQueue[currentIdx];
  return currentLocalSong || null;
}
function songDurationLabel(song) {
  var sec = playbackDurationFromSong(song);
  if (!sec && audio && isFinite(audio.duration) && audio.duration > 0) sec = audio.duration;
  if (!sec) return '未知';
  return formatProgramTime(sec);
}
function songSourceLabel(song) {
  if (!song) return '未知';
  if (song.provider === 'qq' || song.source === 'qq' || song.type === 'qq') return 'QQ 音乐';
  if (song.provider === 'youtube' || song.source === 'youtube' || song.type === 'youtube') return 'YouTube';
  if (song.type === 'local') return '本地上传';
  if (song.type === 'podcast' || song.source === 'podcast') return '网易云播客';
  return '网易云音乐';
}
function detailRow(label, value) {
  value = value == null || value === '' ? '未知' : value;
  return '<div class="detail-k">' + escHtml(label) + '</div><div class="detail-v">' + escHtml(String(value)) + '</div>';
}
function currentArtistNames(song) {
  var text = String((song && song.artist) || '').trim();
  if (!text) return [];
  return text.split(/\s*\/\s*|\s*,\s*|、/).map(function(s){ return s.trim(); }).filter(Boolean);
}
var trackDetailSeq = 0;
var detailArtistSongs = [];
function normalizeArtistNameForMatch(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/[\s·・,，、/\\|&＋+_-]+/g, '')
    .replace(/[()（）\[\]【】"'“”‘’]/g, '');
}
function artistNameMatches(expectedNames, actualName) {
  var actual = normalizeArtistNameForMatch(actualName);
  if (!actual) return false;
  return (expectedNames || []).some(function(name){
    var expected = normalizeArtistNameForMatch(name);
    return expected && (expected === actual || expected.indexOf(actual) >= 0 || actual.indexOf(expected) >= 0);
  });
}
function currentArtistId(song) {
  if (!song) return '';
  if (!isCloudSong(song)) return '';
  if (song.artistId) return String(song.artistId);
  var artists = song.artists || [];
  for (var i = 0; i < artists.length; i++) {
    if (artists[i] && artists[i].id) return String(artists[i].id);
  }
  return '';
}
function currentQQArtistMid(song) {
  if (!song || songProviderKey(song) !== 'qq') return '';
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
    var avatar = user.avatar ? coverUrlWithSize(user.avatar, 64) : '';
    return '<div class="comment-item">' +
      (avatar ? '<img class="comment-avatar" src="' + avatar + '" alt="">' : '<div class="comment-avatar"></div>') +
      '<div class="comment-main"><div class="comment-meta">' + escHtml(user.nickname || '音乐用户') + (c.likedCount ? (' · ' + c.likedCount + ' 赞') : '') + (c.time ? (' · ' + escHtml(commentTimeLabel(c.time))) : '') + '</div>' +
      '<div class="comment-text">' + escHtml(c.content || '') + '</div></div>' +
    '</div>';
  }).join('') + '</div>';
}
function renderArtistSongList(songs) {
  detailArtistSongs = (songs || []).map(cloneSong);
  if (!detailArtistSongs.length) return '<div class="detail-empty">暂无热门歌曲</div>';
  return '<div class="detail-scroll">' + detailArtistSongs.map(function(s, i){
    var cover = songCoverSrc(s, 80);
    var coverHtml = cover ? '<img class="artist-song-cover" src="' + escHtml(cover) + '" alt="" onerror="this.style.opacity=0.18">' : '<div class="artist-song-cover"></div>';
    var actionsHtml = '<div class="artist-song-actions">' +
      '<button class="artist-song-action collect" type="button" title="收藏到歌单" aria-label="收藏到歌单" onclick="event.stopPropagation();collectArtistDetailSong(' + i + ')">' + artistCollectTrayIconSvg() + '</button>' +
      '<button class="artist-song-action next" type="button" title="下一首播放" aria-label="下一首播放" onclick="event.stopPropagation();queueArtistDetailSongNext(' + i + ')">' + artistNextPlusIconSvg() + '</button>' +
    '</div>';
    return '<div class="artist-song-item" onclick="playArtistDetailSong(' + i + ')">' +
      '<div class="artist-song-rank">' + String(i + 1).padStart(2, '0') + '</div>' +
      coverHtml +
      '<div class="artist-song-main"><div class="artist-song-name">' + escHtml(s.name || '') + '</div>' +
      '<div class="artist-song-meta">' + escHtml((s.album || '未知专辑') + (s.duration ? (' · ' + songDurationLabel(s)) : '')) + '</div></div>' +
      actionsHtml +
    '</div>';
  }).join('') + '</div>';
}
function playArtistDetailSong(i) {
  var song = detailArtistSongs[i];
  if (!song) return;
  playQueue = detailArtistSongs.map(cloneSong);
  currentIdx = i;
  safeRenderQueuePanel('artist-detail-play');
  safeShelfRebuild('artist-detail-play', true);
  closeTrackDetailModal();
  playQueueAt(i).catch(function(e){ console.warn('[ArtistDetailPlay]', e); });
}
function collectArtistDetailSong(i) {
  var song = detailArtistSongs[i];
  if (!song) return;
  collectDetailSong(song);
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
  closeGsapModal(document.getElementById('track-detail-modal'));
}
function openTrackDetailModal(type, songOverride) {
  var song = songOverride || currentCoverSong();
  if (!song) { showToast('先播放或选择一首歌'); return; }
  if (immersiveMode) setImmersiveMode(false);
  var heading = document.getElementById('track-detail-heading');
  var body = document.getElementById('track-detail-body');
  if (!heading || !body) return;
  var cover = songCoverSrc(song, 180);
  var coverHtml = cover ? '<img class="detail-cover" src="' + cover + '" alt="">' : '<div class="detail-cover"></div>';
  var title = song.name || '当前歌曲';
  var artists = currentArtistNames(song);
  var seq = ++trackDetailSeq;
  if (type === 'artist') {
    var artistId = currentArtistId(song);
    var qqArtistMid = currentQQArtistMid(song);
    var isYT = songProviderKey(song) === 'youtube';
    var artistDetailUrl = artistId
      ? ('/api/artist/detail?id=' + encodeURIComponent(artistId) + '&limit=36')
      : (qqArtistMid ? ('/api/qq/artist/detail?mid=' + encodeURIComponent(qqArtistMid) + '&limit=36') : '');
    if (!artistDetailUrl && isYT && artistName) {
      artistDetailUrl = '/api/youtube/search?keywords=' + encodeURIComponent(artistName) + '&limit=36';
    }
    var artistName = artists.join(' / ') || song.artist || '未知歌手';
    var artistNamesForMatch = artists.length ? artists : (song.artist ? [song.artist] : []);
    var artistInitial = artistName && artistName !== '未知歌手' ? artistName.slice(0, 1) : '歌';
    var artistCoverHtml = '<div id="artist-detail-cover" class="detail-cover detail-artist-avatar">' + escHtml(artistInitial) + '</div>';
    var artistEmptyText = songProviderKey(song) === 'qq'
      ? '当前 QQ 歌曲缺少 singerMid，无法打开 QQ 歌手主页。'
      : '当前歌曲缺少可用的歌手主页信息';
    var artistLoadingText = songProviderKey(song) === 'qq' ? '正在载入 QQ 歌手主页...' : '正在载入歌手主页...';
    heading.textContent = '歌手详情';
    body.innerHTML =
      '<div class="detail-hero">' + artistCoverHtml +
        '<div style="min-width:0;flex:1"><div class="detail-title">' + escHtml(artistName) + '</div>' +
        '<div class="detail-sub">来自当前播放 · ' + escHtml(title) + '</div></div>' +
      '</div>' +
      '<div class="detail-grid">' +
        detailRow('当前歌曲', title) +
        detailRow('关联歌手', artistName) +
        detailRow('所属专辑', song.album || (song.type === 'podcast' ? (song.radioName || 'Podcast') : '未知')) +
        detailRow('来源', songSourceLabel(song)) +
      '</div>' +
      '<div class="detail-chip-row">' + (artists.length ? artists.map(function(name){ return '<span class="detail-chip">' + escHtml(name) + '</span>'; }).join('') : '<span class="detail-chip">未知歌手</span>') + '</div>' +
      '<div class="detail-section"><div class="detail-section-head"><div class="detail-section-title">热门歌曲</div></div><div id="artist-hot-songs">' + (artistDetailUrl ? '<div class="detail-loading">' + escHtml(artistLoadingText) + '</div>' : '<div class="detail-empty">' + escHtml(artistEmptyText) + '</div>') + '</div></div>';
    if (artistDetailUrl) {
      apiJson(artistDetailUrl).then(function(r){
        if (seq !== trackDetailSeq) return;
        var returnedName = r && r.artist && r.artist.name;
        var target = document.getElementById('artist-hot-songs');
        if (returnedName && artistNamesForMatch.length && !artistNameMatches(artistNamesForMatch, returnedName)) {
          if (target) target.innerHTML = '<div class="detail-empty">歌手资料与当前歌曲不匹配，已停止展示错误主页。</div>';
          bindTrackDetailScrollers();
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
            avatarEl.style.backgroundImage = 'url("' + coverUrlWithSize(r.artist.avatar, 180).replace(/"/g, '\\"') + '")';
            avatarEl.style.backgroundSize = 'cover';
            avatarEl.style.backgroundPosition = 'center';
          }
        }
        if (target) target.innerHTML = r && !r.error ? renderArtistSongList(r.songs || []) : '<div class="detail-empty">歌手主页加载失败</div>';
        bindTrackDetailScrollers();
      }).catch(function(){
        var target = document.getElementById('artist-hot-songs');
        if (seq === trackDetailSeq && target) target.innerHTML = '<div class="detail-empty">歌手主页加载失败</div>';
        bindTrackDetailScrollers();
      });
    }
  } else {
    heading.textContent = '歌曲详情';
    var detailIsQQ = songProviderKey(song) === 'qq';
    var detailIsYT = songProviderKey(song) === 'youtube';
    var detailCanLoadComments = isCloudSong(song) || detailIsQQ;
    var detailCommentTitle = detailIsQQ ? 'QQ 音乐评论' : (detailIsYT ? 'YouTube' : '网易云评论');
    var detailEmptyText = detailIsQQ ? '当前 QQ 歌曲暂无评论' : (detailIsYT ? 'YouTube 歌曲暂不支持评论查看' : '本地文件暂无网易云评论');
    body.innerHTML =
      '<div class="detail-hero">' + coverHtml +
        '<div style="min-width:0;flex:1"><div class="detail-title">' + escHtml(title) + '</div>' +
        '<div class="detail-sub">' + escHtml(song.artist || (song.type === 'local' ? '本地文件' : '未知歌手')) + '</div></div>' +
      '</div>' +
      '<div class="detail-grid">' +
        detailRow('歌曲名', title) +
        detailRow('歌手', song.artist || '未知歌手') +
        detailRow('专辑', song.album || (song.type === 'podcast' ? (song.radioName || 'Podcast') : '未知')) +
        detailRow('时长', songDurationLabel(song)) +
        detailRow('来源', songSourceLabel(song)) +
        detailRow('歌词源', lyricSourceMode === 'custom' ? '自定义歌词' : (lyricsTimingSource === 'fallback' ? '占位歌词' : '原词')) +
      '</div>' +
      '<div class="detail-chip-row">' +
        '<span class="detail-chip">' + escHtml(songSourceLabel(song)) + '</span>' +
        (isSongLiked(song) ? '<span class="detail-chip">红心喜欢</span>' : '') +
        (getCustomCoverForSong(song) ? '<span class="detail-chip">自定义封面</span>' : '') +
        (hasCustomLyricForSong(song) ? '<span class="detail-chip">自定义歌词</span>' : '') +
      '</div>' +
      '<div class="detail-section"><div class="detail-section-head"><div class="detail-section-title">' + detailCommentTitle + '</div></div><div id="song-comments">' + (detailCanLoadComments ? '<div class="detail-loading">正在载入评论...</div>' : '<div class="detail-empty">' + detailEmptyText + '</div>') + '</div></div>';
    if (detailCanLoadComments) {
      var commentUrl = detailIsQQ
        ? ('/api/qq/song/comments?id=' + encodeURIComponent(song.qqId || '') + '&mid=' + encodeURIComponent(song.mid || song.songmid || song.id || '') + '&limit=18')
        : ('/api/song/comments?id=' + encodeURIComponent(song.id) + '&limit=18');
      apiJson(commentUrl).then(function(r){
        if (seq !== trackDetailSeq) return;
        var target = document.getElementById('song-comments');
        if (target) target.innerHTML = r && !r.error ? renderDetailComments(r.comments || []) : '<div class="detail-empty">评论加载失败</div>';
        bindTrackDetailScrollers();
      }).catch(function(){
        var target = document.getElementById('song-comments');
        if (seq === trackDetailSeq && target) target.innerHTML = '<div class="detail-empty">评论加载失败</div>';
        bindTrackDetailScrollers();
      });
    }
  }
  bindTrackDetailScrollers();
  openGsapModal(document.getElementById('track-detail-modal'));
}
function openArtistDetailForSong(song) {
  if (!song) { showToast('未找到歌手信息'); return; }
  if (currentArtistId(song) || currentQQArtistMid(song)) {
    openTrackDetailModal('artist', song);
    return;
  }
  var artist = String(song.artist || '').split(/\s*\/\s*|\s*,\s*|、|&| feat\.? | ft\.? /i).filter(Boolean)[0] || '';
  if (artist) {
    resolveArtistSongForDetail(song, artist).then(function(found){
      openTrackDetailModal('artist', found || Object.assign({}, song, { artist: artist }));
    }).catch(function(){
      openTrackDetailModal('artist', Object.assign({}, song, { artist: artist }));
    });
    showToast('正在查找歌手主页: ' + artist);
  } else {
    showToast('当前歌曲缺少歌手主页信息');
  }
}
function resolveArtistSongForDetail(song, artist) {
  var provider = songProviderKey(song) === 'qq' ? 'qq' : (songProviderKey(song) === 'youtube' ? 'youtube' : 'netease');
  var url = provider === 'qq'
    ? '/api/qq/search?keywords=' + encodeURIComponent(artist) + '&limit=8'
    : provider === 'youtube'
    ? '/api/youtube/search?keywords=' + encodeURIComponent(artist) + '&limit=10'
    : '/api/search?keywords=' + encodeURIComponent(artist) + '&limit=10';
  return apiJson(url).then(function(r){
    var songs = (r && r.songs) || [];
    for (var i = 0; i < songs.length; i++) {
      var candidate = songs[i];
      if (!candidate) continue;
      if (!artistNameMatches([artist], candidate.artist || '')) continue;
      if (currentArtistId(candidate) || currentQQArtistMid(candidate)) return candidate;
    }
    return null;
  });
}

function updateCustomLyricControls() {
  var song = currentLyricSong();
  var hasCustom = hasCustomLyricForSong(song);
  var originalBtn = document.getElementById('lyric-source-original');
  var customBtn = document.getElementById('lyric-source-custom');
  if (originalBtn) {
    originalBtn.classList.toggle('active', lyricSourceMode !== 'custom');
    originalBtn.title = '使用网易云或本地解析歌词';
  }
  if (customBtn) {
    customBtn.classList.toggle('active', lyricSourceMode === 'custom');
    customBtn.classList.toggle('has-custom', hasCustom);
    customBtn.title = hasCustom ? '打开并编辑自定义歌词' : '新增自定义歌词';
  }
}
function setCustomLyricStatus(text, tone) {
  var el = document.getElementById('custom-lyric-status');
  if (!el) return;
  el.textContent = text || '';
  el.classList.toggle('good', tone === 'good');
  el.classList.toggle('fail', tone === 'fail');
}
function openCustomLyricModal() {
  var song = currentLyricSong();
  if (!song) {
    showToast('先播放或选择一首歌');
    return;
  }
  if (immersiveMode) setImmersiveMode(false);
  var entry = getCustomLyricEntry(song);
  var title = document.getElementById('custom-lyric-title');
  var sub = document.getElementById('custom-lyric-sub');
  var input = document.getElementById('custom-lyric-input');
  if (title) title.textContent = song.name || '当前歌曲';
  if (sub) sub.textContent = (song.artist || (song.type === 'podcast' ? 'Podcast' : '')) + (entry ? ' · 已保存自定义歌词' : ' · 可粘贴 LRC 或逐行输入');
  if (input) input.value = entry ? (entry.text || '') : '';
  setCustomLyricStatus(entry ? '已读取本地自定义歌词' : '提示：带 [00:12.00] 时间轴会更精准；纯文本会自动铺开', entry ? 'good' : '');
  openGsapModal(document.getElementById('custom-lyric-modal'));
  setTimeout(function(){ if (input) input.focus(); }, 120);
}
function closeCustomLyricModal() {
  closeGsapModal(document.getElementById('custom-lyric-modal'));
}
function saveCustomLyricForCurrent() {
  var song = currentLyricSong();
  var key = songCustomLyricKey(song);
  var input = document.getElementById('custom-lyric-input');
  var text = input ? String(input.value || '').trim() : '';
  if (!song || !key) {
    setCustomLyricStatus('请先播放或选择一首歌', 'fail');
    showToast('先播放或选择一首歌');
    return;
  }
  if (!text) {
    setCustomLyricStatus('请输入歌词内容', 'fail');
    return;
  }
  var lines = parseCustomLyricText(text);
  if (!lines.length) {
    setCustomLyricStatus('没有识别到可显示的歌词行', 'fail');
    return;
  }
  customLyricMap[key] = { text: text, updatedAt: Date.now() };
  customLyricPrefs[key] = 'custom';
  var saved = saveCustomLyricMap();
  saveCustomLyricPrefs();
  applyCustomLyricState(song, true);
  setCustomLyricStatus(saved ? ('已保存 ' + lines.length + ' 行，并切换为自定义歌词') : '已应用，但本地存储空间不足', saved ? 'good' : 'fail');
  showToast(saved ? '自定义歌词已保存' : '自定义歌词已应用');
  setTimeout(function(){ closeCustomLyricModal(); }, 520);
}
function deleteCustomLyricForCurrent() {
  var song = currentLyricSong();
  var key = songCustomLyricKey(song);
  if (!song || !key) {
    setCustomLyricStatus('请先播放或选择一首歌', 'fail');
    return;
  }
  if (!customLyricMap[key]) {
    setCustomLyricStatus('当前歌曲没有自定义歌词', 'fail');
    return;
  }
  delete customLyricMap[key];
  delete customLyricPrefs[key];
  saveCustomLyricMap();
  saveCustomLyricPrefs();
  applyOriginalLyricsState();
  var input = document.getElementById('custom-lyric-input');
  if (input) input.value = '';
  setCustomLyricStatus('已删除，恢复原歌词', 'good');
  showToast('已恢复原歌词');
}
function cloneSong(song){ return hydrateCustomCover(Object.assign({}, song)); }
function avatarSrc(url) {
  if (!url) return '';
  return coverProxySrc(url, true);
}
