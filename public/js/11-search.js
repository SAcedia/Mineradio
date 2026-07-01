// ============================================================
//  搜索
// ============================================================
window.searchResultKey = function(q, mode) {
  return (mode || window.searchMode || 'song') + '|' + String(q || '').trim();
}
window.clearSearchResults = function() {
  window.searchRequestSeq++;
  searchLastResultQuery = '';
  playlist = [];
  podcastResults = [];
  podcastPrograms = [];
  podcastCurrentRadio = null;
  $results.innerHTML = '';
  $results.classList.remove('show');
}
window.renderSearchHistory = function() {
  if (window.searchMode !== 'song' && window.searchMode !== 'netease' && window.searchMode !== 'qq' && window.searchMode !== 'youtube') return false;
  var items = readSearchHistory();
  if (!items.length) {
    $results.innerHTML = '';
    $results.classList.remove('show');
    return false;
  }
  $results.innerHTML =
    '<div class="search-history">' +
      '<div class="search-history-head"><span>搜索历史</span><button class="search-history-clear" type="button" data-clear-history="1">清空</button></div>' +
      '<div class="search-history-list">' +
        items.map(function(q){ return '<button class="search-history-chip" type="button" data-history-query="' + window.escHtml(q) + '">' + window.escHtml(q) + '</button>'; }).join('') +
      '</div>' +
    '</div>';
  $results.classList.add('show');
  requestAnimationFrame(updateSearchPillGlassDisplacementMap);
  return true;
}
window.updateSearchModeTabs = function() {
  var songBtn = document.getElementById('search-mode-song');
  var neteaseBtn = document.getElementById('search-mode-netease');
  var qqBtn = document.getElementById('search-mode-qq');
  var podcastBtn = document.getElementById('search-mode-podcast');
  if (songBtn) {
    songBtn.classList.toggle('active', searchMode === 'song');
    songBtn.setAttribute('aria-selected', searchMode === 'song' ? 'true' : 'false');
  }
  if (neteaseBtn) {
    neteaseBtn.classList.toggle('active', searchMode === 'netease');
    neteaseBtn.setAttribute('aria-selected', searchMode === 'netease' ? 'true' : 'false');
  }
  if (qqBtn) {
    qqBtn.classList.toggle('active', searchMode === 'qq');
    qqBtn.setAttribute('aria-selected', searchMode === 'qq' ? 'true' : 'false');
  }
  if (podcastBtn) {
    podcastBtn.classList.toggle('active', searchMode === 'podcast');
    podcastBtn.setAttribute('aria-selected', searchMode === 'podcast' ? 'true' : 'false');
  }
  var ytBtn = document.getElementById('search-mode-youtube');
  if (ytBtn) {
    var ytEnabled = typeof searchSourceEnabled === 'function' ? window.searchSourceEnabled('youtube') : true;
    ytBtn.style.display = ytEnabled ? '' : 'none';
    ytBtn.classList.toggle('active', searchMode === 'youtube');
    ytBtn.setAttribute('aria-selected', searchMode === 'youtube' ? 'true' : 'false');
    if (!ytEnabled && searchMode === 'youtube') setSearchMode('song');
  }
  if ($input) {
    var ph = '搜索歌曲、歌手...';
    if (searchMode === 'podcast') ph = '搜索播客、电台...';
    else if (searchMode === 'qq') ph = '搜索 QQ 音乐...';
    else if (searchMode === 'netease') ph = '搜索网易云音乐...';
    else if (searchMode === 'youtube') ph = '搜索 YouTube...';
    $input.placeholder = ph;
  }
  requestAnimationFrame(updateSearchPillGlassDisplacementMap);
}
window.setSearchMode = function(mode) {
  mode = (mode === 'podcast' || mode === 'netease' || mode === 'qq' || mode === 'youtube') ? mode : 'song';
  if (searchMode === mode) return;
  searchMode = mode;
  updateSearchModeTabs();
  clearSearchResults();
  var searchArea = document.getElementById('search-area');
  if (searchArea) setPeek(searchArea, true, 'search');
  var q = $input ? $input.value.trim() : '';
  if (searchMode === 'podcast') {
    if (q) doSearch(q);
    else loadPodcastHot();
  } else if (q) {
    doSearch(q);
  } else {
    renderSearchHistory();
  }
}
window.songSourceTagHtml = function(song) {
  var key = window.songProviderKey(song);
  var label = ({ netease: 'NE', qq: 'QQ', youtube: 'YT' })[key] || key.toUpperCase();
  return '<span class="tag-window.source ' + key + '">' + label + '</span>';
}
window.mergeSongSearchResults = function(neteaseSongs, qqSongs, limit, q, youtubeSongs) {
  var out = [];
  var seen = {};
  function push(song, sourceIndex) {
    if (!song || !song.name) return;
    var key = window.songProviderKey(song) + ':' + (song.mid || song.id || (song.name + '|' + song.artist));
    if (seen[key]) return;
    seen[key] = true;
    song._searchScore = scoreSongSearchResult(song, q, sourceIndex);
    out.push(song);
  }
  (neteaseSongs || []).forEach(function(song, i){ push(song, i); });
  (qqSongs || []).forEach(function(song, i){ push(song, i); });
  (youtubeSongs || []).forEach(function(song, i){ push(song, i); });
  out.sort(function(a, b){ return (b._searchScore || 0) - (a._searchScore || 0); });
  return out.slice(0, limit);
}
window.fetchMusicSearchResults = async function(q, mode) {
  if (mode === 'qq') {
    var qqOnly = await window.qqSearch(q, 12);
    return mergeSongSearchResults([], qqOnly.songs || [], 18, q);
  }
  if (mode === 'netease') {
    var neOnly = await window.neteaseSearch(q, 18);
    return mergeSongSearchResults(neOnly.songs || [], [], 18, q);
  }
  if (mode === 'youtube') {
    if (!window.searchSourceEnabled('youtube')) { window.showToast('YouTube 已关闭'); return []; }
    var ytOnly = await window.youtubeSearch(q, 18);
    return mergeSongSearchResults([], [], 18, q, ytOnly.songs || []);
  }
  // 'song' (all) mode: parallel search across all platforms
  var promises = [
    window.neteaseSearch(q, 10),
    window.qqSearch(q, 8)
  ];
  if (window.searchSourceEnabled('youtube')) {
    promises.push(window.youtubeSearch(q, 8));
  }
  var result = await Promise.allSettled(promises);
  var neteaseSongs = result[0].status === 'fulfilled' ? ((result[0].value && result[0].value.songs) || []) : [];
  var qqSongs = result[1].status === 'fulfilled' ? ((result[1].value && result[1].value.songs) || []) : [];
  var youtubeSongs = [];
  if (window.searchSourceEnabled('youtube')) {
    youtubeSongs = result[2].status === 'fulfilled' ? ((result[2].value && result[2].value.songs) || []) : [];
  }
  return mergeSongSearchResults(neteaseSongs, qqSongs, 18, q, youtubeSongs);
}
window.doSearch = async function(q, opts) {
  opts = opts || {};
  q = String(q || '').trim();
  if (!q) {
    if (searchMode === 'podcast') loadPodcastHot();
    else if (searchMode === 'youtube') window.loadYouTubeTrending();
    else renderSearchHistory();
    return;
  }
  if (searchMode === 'podcast') {
    doPodcastSearch(q);
    return;
  }
  var requestSeq = ++window.searchRequestSeq;
  try {
    var mode = window.searchMode;
    var songs = await fetchMusicSearchResults(q, mode);
    if (requestSeq !== window.searchRequestSeq || $input.value.trim() !== q) return;
    if (!songs.length) {
      playlist = [];
      searchLastResultQuery = '';
      $results.innerHTML = '<div class="search-empty">没有找到相关歌曲</div>';
      $results.classList.add('show');
      return;
    }
    searchLastResultQuery = searchResultKey(q, mode);
    rememberSearchQuery(q);
    renderSongSearchResults(songs);
    if (opts.autoPlayFirst) window.playSearchResult(0);
  } catch (err) { console.error('Search:', err); }
}
