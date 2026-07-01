//  API 助手
// ============================================================
window.apiJson = async function(url, opts) {
  opts = opts || {};
  var timeoutMs = Number(opts.timeoutMs) || 0;
  var fetchOpts = Object.assign({}, opts);
  delete fetchOpts.timeoutMs;
  var timer = null;
  if (timeoutMs && window.AbortController && !fetchOpts.signal) {
    var controller = new AbortController();
    fetchOpts.signal = controller.signal;
    timer = setTimeout(function(){ controller.abort(); }, timeoutMs);
  }
  try {
    var res = await fetch(url, fetchOpts);
    return res.json();
  } finally {
    if (timer) clearTimeout(timer);
  }
}
window.escHtml = function(s) {
 var d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
window.normalizePlaybackQuality = function(value) {
  value = String(value || '').toLowerCase();
  if (value === 'jymaster' || value === 'master' || value === 'svip') return 'jymaster';
  if (value === 'hires' || value === 'hi-res' || value === 'highres' || value === 'highest') return 'hires';
  if (value === 'lossless' || value === 'flac' || value === 'sq') return 'lossless';
  if (value === 'exhigh' || value === 'high' || value === '320k' || value === 'hq') return 'exhigh';
  if (value === 'standard' || value === 'normal' || value === 'std') return 'standard';
  return 'hires';
}
window.playbackQualityLabel = function(value) {
  value = window.normalizePlaybackQuality(value);
  if (value === 'jymaster') return '超清母带';
  if (value === 'hires') return '高清臻音';
  if (value === 'lossless') return '无损';
  if (value === 'exhigh') return '极高';
  if (value === 'standard') return '标准';
  return '高清臻音';
}
window.playbackQualityShortLabel = function(value) {
  value = window.normalizePlaybackQuality(value);
  if (value === 'jymaster') return '母带';
  if (value === 'hires') return '臻音';
  if (value === 'lossless') return 'SQ';
  if (value === 'exhigh') return 'HQ';
  if (value === 'standard') return 'STD';
  return '臻音';
}
window.playbackQualityRank = function(value) {
  value = window.normalizePlaybackQuality(value);
  if (value === 'jymaster') return 5;
  if (value === 'hires') return 4;
  if (value === 'lossless') return 3;
  if (value === 'exhigh') return 2;
  if (value === 'standard') return 1;
  return 4;
}
window.playbackQualityWasDowngraded = function(requested, resolved) {
  return window.playbackQualityRank(resolved) < window.playbackQualityRank(requested);
}
window.playbackBitrateLabel = function(br) {
  br = Number(br) || 0;
  if (!br) return '';
  if (br >= 1000000) return (br / 1000000).toFixed(br >= 2000000 ? 1 : 2).replace(/\.0+$/, '') + ' Mbps';
  return Math.round(br / 1000) + ' kbps';
}
window.playbackResolvedQualityText = function(data) {
  data = data || {};
  var label = window.playbackQualityLabel(data.level || data.quality || window.playbackQuality);
  var br = window.playbackBitrateLabel(data.br);
  return br ? (label + ' · ' + br) : label;
}
window.readPlaybackQualityPreference = function() {
  try {
    return window.normalizePlaybackQuality(localStorage.getItem(window.PLAYBACK_QUALITY_STORE_KEY) || 'hires');
  } catch (e) {
    return 'hires';
  }
}
window.savePlaybackQualityPreference = function() {
  try { localStorage.setItem(window.PLAYBACK_QUALITY_STORE_KEY, window.playbackQuality); } catch (e) {}
}
window.updatePlaybackQualityUi = function() {
  var label = document.getElementById('quality-btn-label');
  var btn = document.getElementById('quality-btn');
  var wrap = document.getElementById('quality-control');
  var song = window.currentCoverSong();
  var isYT = song && window.songProviderKey(song) === 'youtube';
  if (wrap) wrap.style.display = isYT ? 'none' : '';
  if (isYT) return;
  var canUseSvip = hasProviderSvip('netease', window.loginStatus);
  var displayQuality = playbackQuality === 'jymaster' && !canUseSvip ? 'hires' : window.playbackQuality;
  if (label) label.textContent = window.playbackQualityShortLabel(displayQuality);
  if (btn) btn.title = playbackQuality === 'jymaster' && !canUseSvip
    ? '音质: ' + window.playbackQualityLabel(displayQuality) + ' · 超清母带需网易云 SVIP'
    : '音质: ' + window.playbackQualityLabel(displayQuality);
  document.querySelectorAll('.quality-option').forEach(function(option){
    var q = window.normalizePlaybackQuality(option.dataset.quality);
    var locked = option.dataset.svip === '1' && !canUseSvip;
    option.classList.toggle('active', q === displayQuality);
    option.classList.toggle('locked', locked);
    option.disabled = locked;
    option.title = locked ? '需要网易云 SVIP 账号' : window.playbackQualityLabel(q);
  });
}
window.setPlaybackQuality = function(value) {
  var next = window.normalizePlaybackQuality(value);
  if (next === 'jymaster' && !hasProviderSvip('netease', window.loginStatus)) {
    window.showToast(window.hasPlatformLogin('netease') ? '超清母带需要网易云 SVIP' : '登录网易云 SVIP 后可用超清母带');
    if (!window.hasPlatformLogin('netease')) window.openProviderLogin('netease');
    return;
  }
  playbackQuality = next;
  window.savePlaybackQualityPreference();
  window.updatePlaybackQualityUi();
  var wrap = document.getElementById('quality-control');
  if (wrap) wrap.classList.remove('open');
  window.applyPlaybackQualityToCurrentTrack(next);
}
window.canReloadCurrentTrackForQuality = function() {
  if (window.currentIdx < 0 || window.currentIdx >= window.playQueue.length) return false;
  if (!window.audio || !window.audio.src || window.audio.paused || window.audio.ended) return false;
  var song = window.playQueue[window.currentIdx];
  if (!song || song.type === 'local' || song.source === 'local') return false;
  return window.songProviderKey(song) === 'netease' || window.songProviderKey(song) === 'qq';
}
window.applyPlaybackQualityToCurrentTrack = function(nextQuality) {
  var label = window.playbackQualityLabel(nextQuality || window.playbackQuality);
  if (!window.canReloadCurrentTrackForQuality()) {
    window.showToast('音质偏好: ' + label + ' · 下次播放生效');
    return;
  }
  var resumeAt = window.audio && isFinite(window.audio.currentTime) ? window.audio.currentTime : 0;
  window.showToast('正在切换音质: ' + label);
  Promise.resolve(window.playQueueAt(window.currentIdx, {
    qualityOverride: nextQuality || window.playbackQuality,
    qualitySwitch: true,
    resumeAt: resumeAt,
    preserveHomeState: true,
  })).catch(function(e){
    console.warn('[QualitySwitch]', e);
    window.showToast('音质切换失败，已保留偏好');
  }).finally(window.forcePlaybackControlsInteractive);
}
window.toggleQualityPanel = function(e) {
  if (e) e.stopPropagation();
  var wrap = document.getElementById('quality-control');
  if (wrap) wrap.classList.toggle('open');
}
window.bindQualityControl = function() {
  var wrap = document.getElementById('quality-control');
  if (wrap) {
    wrap.addEventListener('mouseenter', function(){ wrap.classList.add('open'); });
    wrap.addEventListener('mouseleave', function(){ setTimeout(function(){ if (!wrap.matches(':hover')) wrap.classList.remove('open'); }, 260); });
  }
  document.addEventListener('click', function(e){
    if (wrap && !wrap.contains(e.target)) wrap.classList.remove('open');
  });
  window.updatePlaybackQualityUi();
}
window.isTypingTarget = function(target) {
  if (!target) return false;
  var tag = String(target.tagName || '').toUpperCase();
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  return !!(target.isContentEditable || (target.closest && target.closest('[contenteditable="true"]')));
}
window.loadListenStatsState = function() {
  try {
    var raw = localStorage.getItem(HOME_LISTEN_STATS_KEY);
    if (!raw) return { history: [], songs: {}, artists: {}, updatedAt: 0 };
    var data = JSON.parse(raw);
    return {
      history: Array.isArray(data.history) ? data.history.slice(0, 180) : [],
      songs: data.songs && typeof data.songs === 'object' ? data.songs : {},
      artists: data.artists && typeof data.artists === 'object' ? data.artists : {},
      updatedAt: Number(data.updatedAt) || 0,
    };
  } catch (e) {
    return { history: [], songs: {}, artists: {}, updatedAt: 0 };
  }
}
window.saveListenStatsState = function() {
  try {
    window.listenStatsState.updatedAt = Date.now();
    localStorage.setItem(HOME_LISTEN_STATS_KEY, JSON.stringify(window.listenStatsState));
  } catch (e) {}
}
window.songFromListenRecord = function(record) {
  if (!record) return null;
  var provider = record.sourceKey || '';
  if (!provider && record.type === 'qq') provider = 'qq';
  if (!provider) provider = record.mid ? 'qq' : 'netease';
  return {
    provider: provider,
    source: provider,
    type: record.type || (provider === 'qq' ? 'qq' : 'song'),
    id: record.id || record.mid || record.key || '',
    mid: record.mid || '',
    songmid: record.mid || '',
    mediaMid: record.mediaMid || '',
    name: record.name || '继续听',
    artist: record.artist || '',
    cover: record.cover || '',
  };
}
window.playHomeRecent = async function(record) {
  record = record || window.homeListenSummary().recent;
  if (!record) {
    window.showToast('还没有听歌记录');
    return;
  }
  var song = songFromListenRecord(record);
  if (!song || (!song.id && !song.mid)) {
    runHomeSearch(record.name || '');
    return;
  }
  activeRadioContext = null;
  playQueue = [window.cloneSong(song)];
  currentIdx = 0;
  window.safeRenderQueuePanel('home-recent-song');
  window.safeShelfRebuild('home-recent-song', true);
  window.forcePlaybackControlsInteractive();
  await window.playQueueAt(0);
}
window.openHomeInsight = function() {
  var summary = window.homeListenSummary();
  if (summary.topArtist && summary.topArtist.name) {
    runHomeSearch(summary.topArtist.name);
    return;
  }
  if (summary.topSong && summary.topSong.name) {
    runHomeSearch(summary.topSong.name);
    return;
  }
  window.showToast('播放几首歌后会生成听歌画像');
}
window.playWeatherSong = async function(index) {
  var radio = homeWeatherRadioState.radio;
  var songs = radio && radio.songs || [];
  if (!songs[index]) {
    startWeatherRadio();
    return;
  }
  activeRadioContext = weatherRadioContext();
  playQueue = songs.map(function(song){
    var cloned = window.cloneSong(song);
    cloned.radioContext = activeRadioContext;
    return cloned;
  });
  currentIdx = index;
  window.safeRenderQueuePanel('weather-radio-song');
  window.safeShelfRebuild('weather-radio-song', true);
  window.forcePlaybackControlsInteractive();
  await window.playQueueAt(index, { context: activeRadioContext });
}
window.handleHomeTileClick = function(index) {
  var row = document.getElementById('home-tile-row');
  var item = row && row._homeTiles && row._homeTiles[index];
  if (!item) return;
  if (item.kind === 'weatherSong') playWeatherSong(item.index);
  else if (item.kind === 'recent') playHomeRecent(item.record);
  else if (item.kind === 'profile') openHomeInsight();
  else if (item.kind === 'song') playHomeSong(item.index);
  else if (item.kind === 'login') window.showLoginModal({ source: 'home-tile' });
  else if (item.kind === 'local') openHomeLocalImport();
  else if (item.kind === 'guide') openHomeProductGuide();
  else if (item.kind === 'window.playlist') openHomePlaylist(item.index);
  else if (item.kind === 'podcast') openHomePodcast(item.index);
  else if (item.kind === 'podcastSearch') { setSearchMode('podcast'); loadPodcastHot(); }
  else if (item.kind === 'library') openHomeLibrary();
  else runHomeSearch(item.query || item.title || '');
}
window.currentCoverSong = function() {
  if (window.currentIdx >= 0 && window.playQueue[window.currentIdx]) return window.playQueue[window.currentIdx];
  return currentLocalSong || null;
}
window.songDurationLabel = function(song) {
  var sec = playbackDurationFromSong(song);
  if (!sec && window.audio && isFinite(window.audio.duration) && window.audio.duration > 0) sec = window.audio.duration;
  if (!sec) return '未知';
  return formatProgramTime(sec);
}
window.songSourceLabel = function(song) {
  if (!song) return '未知';
  if (song.provider === 'qq' || song.source === 'qq' || song.type === 'qq') return 'QQ 音乐';
  if (song.provider === 'youtube' || song.source === 'youtube' || song.type === 'youtube') return 'YouTube';
  if (song.type === 'local') return '本地上传';
  if (song.type === 'podcast' || song.source === 'podcast') return '网易云播客';
  return '网易云音乐';
}
window.detailRow = function(label, value) {
  value = value == null || value === '' ? '未知' : value;
  return '<div class="detail-k">' + window.escHtml(label) + '</div><div class="detail-v">' + window.escHtml(String(value)) + '</div>';
}
window.currentArtistNames = function(song) {
  var text = String((song && song.artist) || '').trim();
  if (!text) return [];
  return text.split(/\s*\/\s*|\s*,\s*|、/).map(function(s){ return s.trim(); }).filter(Boolean);
}
window.trackDetailSeq = 0;
window.detailArtistSongs = [];
window.normalizeArtistNameForMatch = function(name) {
  return String(name || '')
    .toLowerCase()
    .replace(/[\s·・,，、/\\|&＋+_-]+/g, '')
    .replace(/[()（）\[\]【】"'“”‘’]/g, '');
}
window.artistNameMatches = function(expectedNames, actualName) {
  var actual = window.normalizeArtistNameForMatch(actualName);
  if (!actual) return false;
  return (expectedNames || []).some(function(name){
    var expected = window.normalizeArtistNameForMatch(name);
    return expected && (expected === actual || expected.indexOf(actual) >= 0 || actual.indexOf(expected) >= 0);
  });
}
window.currentArtistId = function(song) {
  if (!song) return '';
  if (!window.isCloudSong(song)) return '';
  if (song.artistId) return String(song.artistId);
  var artists = song.artists || [];
  for (var i = 0; i < artists.length; i++) {
    if (artists[i] && artists[i].id) return String(artists[i].id);
  }
  return '';
}
window.currentQQArtistMid = function(song) {
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
window.commentTimeLabel = function(ms) {
  var t = Number(ms) || 0;
  if (!t) return '';
  try {
    return new Date(t).toLocaleDateString('zh-CN', { month:'short', day:'numeric' });
  } catch (e) {
    return '';
  }
}
window.renderDetailComments = function(comments) {
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
window.renderArtistSongList = function(songs) {
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
window.playArtistDetailSong = function(i) {
  var song = detailArtistSongs[i];
  if (!song) return;
  playQueue = detailArtistSongs.map(window.cloneSong);
  currentIdx = i;
  window.safeRenderQueuePanel('artist-detail-play');
  window.safeShelfRebuild('artist-detail-play', true);
  window.closeTrackDetailModal();
  window.playQueueAt(i).catch(function(e){ console.warn('[ArtistDetailPlay]', e); });
}
window.collectArtistDetailSong = function(i) {
  var song = detailArtistSongs[i];
  if (!song) return;
  window.collectDetailSong(song);
}
window.queueArtistDetailSongNext = function(i) {
  var song = detailArtistSongs[i];
  if (!song) return;
  queueDetailSongNext(song);
}
window.bindTrackDetailScrollers = function() {
  var body = document.getElementById('track-detail-body');
  bindSmoothWheelScroll(body);
  if (body) body.querySelectorAll('.detail-scroll').forEach(bindSmoothWheelScroll);
}
window.closeTrackDetailModal = function() {
  window.closeGsapModal(document.getElementById('track-detail-modal'));
}
window.openTrackDetailModal = function(type, songOverride) {
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
window.openArtistDetailForSong = function(song) {
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
window.resolveArtistSongForDetail = function(song, artist) {
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
window.readCustomLyricMap = function() {
  try {
    var raw = JSON.parse(localStorage.getItem(window.CUSTOM_LYRIC_STORE_KEY) || '{}') || {};
    var out = {};
    Object.keys(raw).forEach(function(key){
      var item = raw[key];
      if (typeof item === 'string') out[key] = { text: item, updatedAt: 0 };
      else if (item && typeof item.text === 'string') out[key] = { text: item.text, updatedAt: item.updatedAt || 0 };
    });
    return out;
  } catch (e) {
    return {};
  }
}
window.saveCustomLyricMap = function() {
  try {
    localStorage.setItem(window.CUSTOM_LYRIC_STORE_KEY, JSON.stringify(window.customLyricMap || {}));
    return true;
  } catch (e) {
    console.warn('custom lyric save failed:', e);
    return false;
  }
}
window.readCustomLyricPrefs = function() {
  try { return JSON.parse(localStorage.getItem(window.CUSTOM_LYRIC_PREF_STORE_KEY) || '{}') || {}; }
  catch (e) { return {}; }
}
window.saveCustomLyricPrefs = function() {
  try { localStorage.setItem(window.CUSTOM_LYRIC_PREF_STORE_KEY, JSON.stringify(window.customLyricPrefs || {})); } catch (e) {}
}
window.songCustomLyricKey = function(song) {
  return window.songCustomCoverKey(song);
}
window.currentLyricSong = function() {
  if (window.currentIdx >= 0 && window.playQueue[window.currentIdx]) return window.playQueue[window.currentIdx];
  return currentLocalSong || null;
}
window.getCustomLyricEntry = function(song) {
  var key = window.songCustomLyricKey(song);
  return key && window.customLyricMap[key] ? window.customLyricMap[key] : null;
}
window.hasCustomLyricForSong = function(song) {
  var entry = window.getCustomLyricEntry(song);
  return !!(entry && String(entry.text || '').trim());
}
window.cloneLyricLine = function(line) {
  var copy = Object.assign({}, line || {});
  if (line && Array.isArray(line.words)) copy.words = line.words.map(function(w){ return Object.assign({}, w); });
  return copy;
}
window.cloneLyricLines = function(lines) {
  return (Array.isArray(lines) ? lines : []).map(window.cloneLyricLine);
}
window.setOriginalLyricsState = function(lines, hasNativeKaraoke, timingSource) {
  originalLyricsState = {
    lines: window.cloneLyricLines(lines || []),
    hasNativeKaraoke: !!hasNativeKaraoke,
    timingSource: timingSource || 'fallback'
  };
}
window.applyLyricsState = function(lines, hasNativeKaraoke, timingSource) {
  lyricsHasNativeKaraoke = !!hasNativeKaraoke;
  lyricsTimingSource = timingSource || 'fallback';
  lyricsLines = window.cloneLyricLines(lines || []);
  if (!window.lyricsLines.length) lyricsLines = withLyricFallback([]);
  if (window.lyricsLines.length && window.lyricsLines[0].fallback) lyricsTimingSource = 'fallback';
  window.renderLyrics();
  window.updateCustomLyricControls();
}
window.applyOriginalLyricsState = function() {
  lyricSourceMode = 'original';
  window.applyLyricsState(originalLyricsState.lines, originalLyricsState.hasNativeKaraoke, originalLyricsState.timingSource);
}
window.parseCustomLyricText = function(text) {
  var raw = String(text || '').trim();
  if (!raw) return [];
  var lrcLines = parseLyricText(raw);
  if (lrcLines.length && !lrcLines.every(function(line){ return isNoLyricText(line.text); })) {
    return lrcLines.map(function(line){
      var copy = window.cloneLyricLine(line);
      copy.source = 'custom-lrc';
      return copy;
    });
  }
  var rows = raw.split(/\r?\n/).map(function(line){ return line.trim(); }).filter(function(line){ return line && !isNoLyricText(line); });
  if (!rows.length) return [];
  var duration = window.audio && isFinite(window.audio.duration) && window.audio.duration > 8 ? window.audio.duration : 0;
  var gap = duration ? Math.max(2.8, Math.min(7.2, duration / Math.max(1, rows.length))) : 4.8;
  return finalizeLyricLineDurations(rows.map(function(line, i){
    return { t: i * gap, duration: gap, text: line, source: 'custom-text', charCount: Math.max(1, line.length) };
  }));
}
window.applyCustomLyricState = function(song, silent) {
  song = song || window.currentLyricSong();
  var entry = window.getCustomLyricEntry(song);
  if (!entry || !String(entry.text || '').trim()) {
    if (!silent) window.openCustomLyricModal();
    window.updateCustomLyricControls();
    return false;
  }
  var lines = window.parseCustomLyricText(entry.text);
  if (!lines.length) {
    if (!silent) window.showToast('自定义歌词内容为空');
    window.updateCustomLyricControls();
    return false;
  }
  lyricSourceMode = 'custom';
  lyricsHasNativeKaraoke = false;
  lyricsTimingSource = lines[0] && lines[0].source === 'custom-lrc' ? 'custom-lrc' : 'custom-text';
  lyricsLines = withLyricFallback(lines);
  if (window.lyricsLines.length && window.lyricsLines[0].fallback) lyricsTimingSource = 'fallback';
  window.renderLyrics();
  window.updateCustomLyricControls();
  return true;
}
window.preferredLyricSourceForSong = function(song) {
  var key = window.songCustomLyricKey(song);
  var hasCustom = window.hasCustomLyricForSong(song);
  if (!hasCustom) return 'original';
  var pref = key ? window.customLyricPrefs[key] : '';
  if (pref === 'custom') return 'custom';
  if (pref === 'original') return 'original';
  return originalLyricsState.timingSource === 'fallback' ? 'custom' : 'original';
}
window.applyPreferredLyricsForCurrent = function(silent) {
  var song = window.currentLyricSong();
  if (window.preferredLyricSourceForSong(song) === 'custom' && window.applyCustomLyricState(song, true)) return;
  window.applyOriginalLyricsState();
  if (!silent) window.updateCustomLyricControls();
}
window.setLyricSourceMode = function(mode, silent) {
  var song = window.currentLyricSong();
  var key = window.songCustomLyricKey(song);
  mode = mode === 'custom' ? 'custom' : 'original';
  if (mode === 'custom') {
    if (!window.applyCustomLyricState(song, true)) {
      if (!silent) window.openCustomLyricModal();
      return false;
    }
    if (!silent) window.openCustomLyricModal();
  } else {
    window.applyOriginalLyricsState();
  }
  if (key) {
    window.customLyricPrefs[key] = mode;
    window.saveCustomLyricPrefs();
  }
  if (!silent) window.showToast(mode === 'custom' ? '已切换到自定义歌词' : '已切换到原歌词');
  window.updateCustomLyricControls();
  return true;
}
window.updateCustomLyricControls = function() {
  var song = window.currentLyricSong();
  var hasCustom = window.hasCustomLyricForSong(song);
  var originalBtn = document.getElementById('lyric-window.source-original');
  var customBtn = document.getElementById('lyric-window.source-custom');
  if (originalBtn) {
    originalBtn.classList.toggle('active', window.lyricSourceMode !== 'custom');
    originalBtn.title = '使用网易云或本地解析歌词';
  }
  if (customBtn) {
    customBtn.classList.toggle('active', lyricSourceMode === 'custom');
    customBtn.classList.toggle('has-custom', hasCustom);
    customBtn.title = hasCustom ? '打开并编辑自定义歌词' : '新增自定义歌词';
  }
}
window.setCustomLyricStatus = function(text, tone) {
  var el = document.getElementById('custom-lyric-status');
  if (!el) return;
  el.textContent = text || '';
  el.classList.toggle('good', tone === 'good');
  el.classList.toggle('fail', tone === 'fail');
}
window.openCustomLyricModal = function() {
  var song = window.currentLyricSong();
  if (!song) {
    window.showToast('先播放或选择一首歌');
    return;
  }
  if (window.immersiveMode) setImmersiveMode(false);
  var entry = window.getCustomLyricEntry(song);
  var title = document.getElementById('custom-lyric-title');
  var sub = document.getElementById('custom-lyric-sub');
  var input = document.getElementById('custom-lyric-input');
  if (title) title.textContent = song.name || '当前歌曲';
  if (sub) sub.textContent = (song.artist || (song.type === 'podcast' ? 'Podcast' : '')) + (entry ? ' · 已保存自定义歌词' : ' · 可粘贴 LRC 或逐行输入');
  if (input) input.value = entry ? (entry.text || '') : '';
  window.setCustomLyricStatus(entry ? '已读取本地自定义歌词' : '提示：带 [00:12.00] 时间轴会更精准；纯文本会自动铺开', entry ? 'good' : '');
  window.openGsapModal(document.getElementById('custom-lyric-modal'));
  setTimeout(function(){ if (input) input.focus(); }, 120);
}
window.closeCustomLyricModal = function() {
  window.closeGsapModal(document.getElementById('custom-lyric-modal'));
}
window.saveCustomLyricForCurrent = function() {
  var song = window.currentLyricSong();
  var key = window.songCustomLyricKey(song);
  var input = document.getElementById('custom-lyric-input');
  var text = input ? String(input.value || '').trim() : '';
  if (!song || !key) {
    window.setCustomLyricStatus('请先播放或选择一首歌', 'fail');
    window.showToast('先播放或选择一首歌');
    return;
  }
  if (!text) {
    window.setCustomLyricStatus('请输入歌词内容', 'fail');
    return;
  }
  var lines = window.parseCustomLyricText(text);
  if (!lines.length) {
    window.setCustomLyricStatus('没有识别到可显示的歌词行', 'fail');
    return;
  }
  window.customLyricMap[key] = { text: text, updatedAt: Date.now() };
  window.customLyricPrefs[key] = 'custom';
  var saved = window.saveCustomLyricMap();
  window.saveCustomLyricPrefs();
  window.applyCustomLyricState(song, true);
  window.setCustomLyricStatus(saved ? ('已保存 ' + lines.length + ' 行，并切换为自定义歌词') : '已应用，但本地存储空间不足', saved ? 'good' : 'fail');
  window.showToast(saved ? '自定义歌词已保存' : '自定义歌词已应用');
  setTimeout(function(){ window.closeCustomLyricModal(); }, 520);
}
window.deleteCustomLyricForCurrent = function() {
  var song = window.currentLyricSong();
  var key = window.songCustomLyricKey(song);
  if (!song || !key) {
    window.setCustomLyricStatus('请先播放或选择一首歌', 'fail');
    return;
  }
  if (!window.customLyricMap[key]) {
    window.setCustomLyricStatus('当前歌曲没有自定义歌词', 'fail');
    return;
  }
  delete window.customLyricMap[key];
  delete window.customLyricPrefs[key];
  window.saveCustomLyricMap();
  window.saveCustomLyricPrefs();
  window.applyOriginalLyricsState();
  var input = document.getElementById('custom-lyric-input');
  if (input) input.value = '';
  window.setCustomLyricStatus('已删除，恢复原歌词', 'good');
  window.showToast('已恢复原歌词');
}
window.cloneSong = function(song) {
 return window.hydrateCustomCover(Object.assign({}, song)); }
window.avatarSrc = function(url) {
  if (!url) return '';
  return window.coverProxySrc(url, true);
}

listenStatsState = window.loadListenStatsState();
customCoverMap = window.readCustomCoverMap();
customLyricMap = window.readCustomLyricMap();
customLyricPrefs = window.readCustomLyricPrefs();
