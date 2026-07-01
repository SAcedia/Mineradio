// 11-search.js — Search orchestration, multi-platform result merge
// Extracted from ui/controls.js (search portion, lines 1-566)

// ============================================================
//  搜索
// ============================================================
// Forward-decl: real impl in 12-playback.js (loads after this file)
function updateSearchPillGlassDisplacementMap() {}
window.Mineradio.bus.on('like:toggle', function(data) {
  refreshSearchResultActionStates();
});
var searchTimer = null;
var searchRequestSeq = 0;
var searchLastResultQuery = '';
var SEARCH_HISTORY_STORE_KEY = 'mineradio-search-history';
var $input = document.getElementById('search-input');
var $results = document.getElementById('search-results');
var $loading = document.getElementById('loading-overlay');
function syncSearchAreaResultState() {
  var searchArea = document.getElementById('search-area');
  if (!searchArea || !$results) return;
  var hasVisibleResults = $results.classList.contains('show') && $results.children.length > 0;
  var hasIntent = !!($input && String($input.value || '').trim()) || searchMode === 'podcast';
  searchArea.classList.toggle('has-results', hasVisibleResults && hasIntent);
}
if (window.MutationObserver && $results) {
  new MutationObserver(syncSearchAreaResultState).observe($results, { childList: true, attributes: true, attributeFilter: ['class'] });
}
function isMusicSearchMode(mode) {
  return mode !== 'podcast';
}
function searchResultKey(q, mode) {
  return (mode || searchMode || 'song') + '|' + String(q || '').trim();
}
function clearSearchResults() {
  searchRequestSeq++;
  searchLastResultQuery = '';
  playlist = [];
  podcastResults = [];
  podcastPrograms = [];
  podcastCurrentRadio = null;
  $results.innerHTML = '';
  $results.classList.remove('show');
}
function readSearchHistory() {
  try {
    var raw = JSON.parse(localStorage.getItem(SEARCH_HISTORY_STORE_KEY) || '[]');
    return Array.isArray(raw) ? raw.map(function(v){ return String(v || '').trim(); }).filter(Boolean).slice(0, 10) : [];
  } catch (e) {
    return [];
  }
}
function writeSearchHistory(items) {
  try { localStorage.setItem(SEARCH_HISTORY_STORE_KEY, JSON.stringify((items || []).slice(0, 10))); } catch (e) {}
}
function rememberSearchQuery(q) {
  q = String(q || '').trim();
  if (!q) return;
  var items = readSearchHistory().filter(function(item){ return item.toLowerCase() !== q.toLowerCase(); });
  items.unshift(q);
  writeSearchHistory(items);
}
function renderSearchHistory() {
  if (searchMode !== 'song' && searchMode !== 'netease' && searchMode !== 'qq' && searchMode !== 'youtube') return false;
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
        items.map(function(q){ return '<button class="search-history-chip" type="button" data-history-query="' + Mineradio.util.escHtml(q) + '">' + Mineradio.util.escHtml(q) + '</button>'; }).join('') +
      '</div>' +
    '</div>';
  $results.classList.add('show');
  requestAnimationFrame(updateSearchPillGlassDisplacementMap);
  return true;
}
function clearSearchHistory() {
  writeSearchHistory([]);
  renderSearchHistory();
}
function runSearchHistory(q) {
  q = String(q || '').trim();
  if (!q) return;
  $input.value = q;
  setPeek(document.getElementById('search-area'), true, 'search');
  doSearch(q);
  $input.focus();
}
function updateSearchModeTabs() {
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
    var ytEnabled = typeof searchSourceEnabled === 'function' ? searchSourceEnabled('youtube') : true;
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

function setSearchMode(mode) {
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
function podcastMetaText(item) {
  item = item || {};
  var bits = [];
  if (item.djName) bits.push(item.djName);
  if (item.programCount) bits.push(item.programCount + ' episodes');
  if (item.subCount) bits.push(Math.round(item.subCount / 1000) + 'k follows');
  return bits.join('  ·  ');
}
function formatProgramTime(sec) {
  sec = Math.max(0, Number(sec) || 0);
  var h = Math.floor(sec / 3600);
  var m = Math.floor((sec % 3600) / 60);
  var s = Math.floor(sec % 60);
  return h ? (h + ':' + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0')) : (m + ':' + String(s).padStart(2, '0'));
}
function programMetaText(item) {
  item = item || {};
  var bits = [];
  if (item.radioName || item.artist) bits.push(item.radioName || item.artist);
  if (item.djName && item.djName !== item.artist) bits.push(item.djName);
  if (item.duration) bits.push(formatProgramTime(Math.round(item.duration / 1000)));
  return bits.join('  ·  ');
}
function searchThumbHtml(src) {
  return src
    ? '<img src="' + coverUrlWithSize(src, 80) + '" alt="" loading="lazy" onerror="this.style.opacity=0.2">'
    : '<div style="width:40px;height:40px;border-radius:6px;background:rgba(255,255,255,0.06);flex-shrink:0"></div>';
}
function renderPodcastRadios(items, label) {
  podcastResults = items || [];
  podcastPrograms = [];
  playlist = [];
  if (!podcastResults.length) {
    $results.innerHTML = '<div class="search-empty">No podcast found</div>';
    $results.classList.add('show');
    return;
  }
  $results.innerHTML = podcastResults.map(function(p, i){
    return '<div class="search-result">' +
      '<div style="display:flex;align-items:center;gap:12px;flex:1;min-width:0" onclick="openPodcastPrograms(' + i + ')">' +
        searchThumbHtml(p.cover) +
        '<div class="search-result-info">' +
          '<div class="search-result-title">' + Mineradio.util.escHtml(p.name || '') + '<span class="tag-podcast">Podcast</span></div>' +
          '<div class="search-result-meta">' + Mineradio.util.escHtml(podcastMetaText(p) || label || 'NetEase Radio') + '</div>' +
        '</div>' +
      '</div>' +
      '<button class="add-btn" title="Open" onclick="event.stopPropagation();openPodcastPrograms(' + i + ')">›</button>' +
    '</div>';
  }).join('');
  $results.classList.add('show');
  if (window.gsap) animateListItems($results, '.search-result', { x: 0, y: 6, stagger: 0.012, duration: 0.18, limit: 18 });
}
async function loadPodcastHot() {
  var requestSeq = ++searchRequestSeq;
  $results.innerHTML = '<div class="search-empty">Loading podcasts...</div>';
  $results.classList.add('show');
  try {
    var data = await Mineradio.platforms.netease.podcastHot(18);
    if (requestSeq !== searchRequestSeq || searchMode !== 'podcast') return;
    renderPodcastRadios(data.podcasts || [], 'Hot podcasts');
  } catch (err) {
    console.error('Podcast hot:', err);
    if (requestSeq === searchRequestSeq) $results.innerHTML = '<div class="search-empty">Podcast load failed</div>';
  }
}
async function doPodcastSearch(q) {
  var requestSeq = ++searchRequestSeq;
  try {
    var data = await Mineradio.platforms.netease.podcastSearch(q, 18);
    if (requestSeq !== searchRequestSeq || searchMode !== 'podcast' || $input.value.trim() !== q) return;
    renderPodcastRadios(data.podcasts || [], 'Search results');
  } catch (err) {
    console.error('Podcast search:', err);
  }
}
async function openPodcastPrograms(i) {
  var radio = podcastResults[i]; if (!radio) return;
  var requestSeq = ++searchRequestSeq;
  podcastCurrentRadio = radio;
  $results.innerHTML = '<div class="search-empty">Loading episodes...</div>';
  $results.classList.add('show');
  try {
    var data = await Mineradio.platforms.netease.podcastPrograms(radio.id, 36);
    if (requestSeq !== searchRequestSeq || searchMode !== 'podcast') return;
    podcastCurrentRadio = Object.assign({}, radio, data.radio || {});
    podcastPrograms = data.programs || [];
    playlist = podcastPrograms;
    renderPodcastPrograms();
  } catch (err) {
    console.error('Podcast programs:', err);
    if (requestSeq === searchRequestSeq) $results.innerHTML = '<div class="search-empty">Episodes load failed</div>';
  }
}
function renderPodcastPrograms() {
  var radio = podcastCurrentRadio || {};
  if (!podcastPrograms.length) {
    $results.innerHTML = '<div class="podcast-result-head"><button class="podcast-back-btn" onclick="event.stopPropagation();renderPodcastRadios(podcastResults)">‹</button><div class="search-result-info"><div class="search-result-title">' + Mineradio.util.escHtml(radio.name || 'Podcast') + '</div><div class="search-result-meta">No playable episodes</div></div></div>';
    $results.classList.add('show');
    return;
  }
  $results.innerHTML =
    '<div class="podcast-result-head">' +
      '<button class="podcast-back-btn" onclick="event.stopPropagation();renderPodcastRadios(podcastResults)">‹</button>' +
      searchThumbHtml(radio.cover) +
      '<div class="search-result-info"><div class="search-result-title">' + Mineradio.util.escHtml(radio.name || 'Podcast') + '<span class="tag-podcast">Podcast</span></div><div class="search-result-meta">' + Mineradio.util.escHtml(radio.djName || (podcastPrograms.length + ' episodes')) + '</div></div>' +
    '</div>' +
    podcastPrograms.map(function(p, i){
      return '<div class="search-result">' +
        '<div style="display:flex;align-items:center;gap:12px;flex:1;min-width:0" onclick="playPodcastProgram(' + i + ')">' +
          searchThumbHtml(p.cover) +
          '<div class="search-result-info">' +
            '<div class="search-result-title">' + Mineradio.util.escHtml(p.name || '') + '</div>' +
            '<div class="search-result-meta">' + Mineradio.util.escHtml(programMetaText(p)) + '</div>' +
          '</div>' +
        '</div>' +
        '<button class="add-btn" title="下一首播放" onclick="event.stopPropagation();queuePodcastProgram(' + i + ')">+</button>' +
      '</div>';
    }).join('');
  $results.classList.add('show');
  if (window.gsap) animateListItems($results, '.search-result', { x: 0, y: 6, stagger: 0.010, duration: 0.18, limit: 18 });
}
function queuePodcastProgram(i) {
  var item = podcastPrograms[i]; if (!item) return;
  queueSongNext(item);
  showToast('已设为下一首: ' + item.name);
}
function playPodcastProgram(i) {
  var item = podcastPrograms[i]; if (!item) return;
  playSearchResult(i);
}

$input.addEventListener('input', function(){
  clearTimeout(searchTimer);
  var q = $input.value.trim();
  if (!q) {
    if (searchMode === 'podcast') loadPodcastHot();
    else renderSearchHistory();
    return;
  }
  if (isMusicSearchMode(searchMode)) {
    $results.innerHTML = '<div class="search-empty">正在搜索 “' + Mineradio.util.escHtml(q) + '”…</div>';
    $results.classList.add('show');
  }
  searchTimer = setTimeout(function(){ doSearch(q); }, 180);
});
$input.addEventListener('focus', function(){
  var searchArea = document.getElementById('search-area');
  if (searchArea) setPeek(searchArea, true, 'search');
  if (!$input.value.trim() && isMusicSearchMode(searchMode)) renderSearchHistory();
  else if ($results.children.length > 0) $results.classList.add('show');
  else if (searchMode === 'podcast') loadPodcastHot();
});
var searchBoxEl = document.getElementById('search-box');
if (searchBoxEl) {
  searchBoxEl.addEventListener('click', function(){
    if ($input) $input.focus();
    var area = document.getElementById('search-area');
    if (area && !area.classList.contains('peek')) {
      setPeek(area, true, 'search');
      if (typeof markRenderInteraction === 'function') markRenderInteraction('search-click', 600);
    }
  });
}
$input.addEventListener('keydown', function(e){
  if (e.key === 'Enter') {
    e.preventDefault();
    clearTimeout(searchTimer);
    var q = $input.value.trim();
    if (isMusicSearchMode(searchMode) && q && playlist.length && searchLastResultQuery === searchResultKey(q)) $results.classList.add('show');
    else doSearch(q, { autoPlayFirst: false });
  } else if (e.key === 'Escape') {
    clearTimeout(searchTimer);
    $input.blur();
    clearSearchResults();
    if (!emptyHomeActive) setPeek(document.getElementById('search-area'), false, 'search');
  }
});
$results.addEventListener('click', function(e){
  var clearBtn = e.target && e.target.closest ? e.target.closest('[data-clear-history]') : null;
  if (clearBtn) {
    e.preventDefault();
    e.stopPropagation();
    clearSearchHistory();
    return;
  }
  var item = e.target && e.target.closest ? e.target.closest('[data-history-query]') : null;
  if (item) {
    e.preventDefault();
    e.stopPropagation();
    runSearchHistory(item.getAttribute('data-history-query') || '');
  }
});
document.addEventListener('click', function(e){
  var searchArea = document.getElementById('search-area');
  if (!searchArea.contains(e.target)) {
    $results.classList.remove('show');
    if (!emptyHomeActive) setPeek(searchArea, false, 'search');
  }
});
updateSearchModeTabs();

function songSourceTagHtml(song) {
  var key = Mineradio.util.songProviderKey(song);
  var label = ({ netease: 'NE', qq: 'QQ', youtube: 'YT' })[key] || key.toUpperCase();
  return '<span class="tag-source ' + key + '">' + label + '</span>';
}
function searchResultMetaText(song) {
  var bits = [];
  if (song.artist) bits.push(song.artist);
  if (song.album) bits.push(song.album);
  if (Mineradio.util.songProviderKey(song) === 'qq' && !song.playable) bits.push('QQ 播放需会话/授权');
  return bits.join('  ·  ') || songSourceLabel(song);
}
function searchResultMetaHtml(song, index) {
  song = song || {};
  var artist = String(song.artist || '').trim();
  var bits = [];
  if (song.album) bits.push(song.album);
  if (Mineradio.util.songProviderKey(song) === 'qq' && !song.playable) bits.push('QQ 播放需会话/授权');
  var tail = bits.length ? (' · ' + Mineradio.util.escHtml(bits.join('  ·  '))) : '';
  if (!artist) return Mineradio.util.escHtml(searchResultMetaText(song));
  return '<button class="search-artist-link" type="button" onclick="event.stopPropagation();openSearchResultArtist(' + index + ')">' + Mineradio.util.escHtml(artist) + '</button>' + tail;
}
function openSearchResultArtist(index) {
  var song = playlist && playlist[index];
  if (!song) return;
  openArtistDetailForSong(song);
}
function searchIntentPrefersQQ(q) {
  q = String(q || '').toLowerCase();
  return /(^|\s)qq($|\s)|qq音乐|qq音樂|周杰伦|周杰倫|jay\s*chou|jay/.test(q);
}
function simpleSearchNorm(text) {
  return String(text || '').toLowerCase()
    .replace(/[（(【\[].*?[）)】\]]/g, '')
    .replace(/[\s·・,，。.!！?？'"“”‘’|\-_/]+/g, '');
}
function searchMentionsKnownArtist(q, artist) {
  var rawQ = String(q || '').toLowerCase();
  var rawArtist = String(artist || '').toLowerCase();
  if (!rawArtist) return false;
  if (/周杰伦|周杰倫|jay\s*chou/.test(rawQ) && /周杰伦|周杰倫|jay\s*chou/.test(rawArtist)) return true;
  var nq = simpleSearchNorm(q);
  var na = simpleSearchNorm(artist);
  return !!(na && na.length >= 2 && nq.indexOf(na) >= 0);
}
function searchLooksLikeDerivative(text) {
  return /(翻唱|cover|伴奏|instrumental|remix|片段|demo|女声|男声|karaoke|完整版\s*cover|抖音版|dj版|合唱版|改编版|赵露思版|超燃|硬曲|剪辑|二创|tribute|made\s*famous\s*by)/i.test(String(text || ''));
}
var SEARCH_ORIGINAL_ARTIST_HINTS = [
  { titles: ['日落大道'], artists: ['梁博'] },
  { titles: ['beautyandabeat', 'beauty and a beat'], artists: ['justin bieber', 'nicki minaj'] }
];
function canonicalOriginalArtistsForSearch(q, song) {
  var qNorm = simpleSearchNorm(q);
  var titleNorm = simpleSearchNorm(song && song.name);
  var joined = qNorm + ' ' + titleNorm;
  var artists = [];
  SEARCH_ORIGINAL_ARTIST_HINTS.forEach(function(rule){
    var matched = (rule.titles || []).some(function(title){
      var nt = simpleSearchNorm(title);
      var titleMatches = !!(titleNorm && (titleNorm === nt || titleNorm.indexOf(nt) >= 0));
      return !!(nt && (qNorm.indexOf(nt) >= 0 || titleMatches));
    });
    if (matched) {
      (rule.artists || []).forEach(function(artist){
        if (artists.indexOf(artist) < 0) artists.push(artist);
      });
    }
  });
  return artists;
}
function songArtistMatchesAny(song, artists) {
  var songArtist = simpleSearchNorm(song && song.artist);
  if (!songArtist || !artists || !artists.length) return false;
  return artists.some(function(artist){
    var na = simpleSearchNorm(artist);
    return !!(na && (songArtist.indexOf(na) >= 0 || na.indexOf(songArtist) >= 0));
  });
}
function searchLooksLikeSameTitleCover(song, nq, name, album, raw, originalArtistMatch, sourceIndex) {
  if (!song || !nq || !name || originalArtistMatch) return false;
  var sameTitle = name === nq || nq.indexOf(name) >= 0 || name.indexOf(nq) === 0;
  if (!sameTitle) return false;
  var selfTitledSingle = !!(album && (album === name || album === nq || album.indexOf(name) >= 0 || name.indexOf(album) >= 0));
  return selfTitledSingle || searchLooksLikeDerivative(raw) || (sourceIndex || 0) > 0;
}
function scoreSongSearchResult(song, q, sourceIndex) {
  var nq = simpleSearchNorm(q);
  var name = simpleSearchNorm(song && song.name);
  var artist = simpleSearchNorm(song && song.artist);
  var album = simpleSearchNorm(song && song.album);
  var raw = String(((song && song.name) || '') + ' ' + ((song && song.artist) || '') + ' ' + ((song && song.album) || '')).toLowerCase();
  var qAsksDerivative = /(live|现场|翻唱|cover|伴奏|instrumental|remix|dj|片段|demo|女声|男声|karaoke)/i.test(String(q || ''));
  var derivative = searchLooksLikeDerivative(raw);
  var artistMentioned = searchMentionsKnownArtist(q, song && song.artist);
  var originalArtists = canonicalOriginalArtistsForSearch(q, song);
  var originalArtistMatch = songArtistMatchesAny(song, originalArtists);
  var score = 0;
  if (name === nq) score += 90;
  else if (name.indexOf(nq) === 0) score += 55;
  else if (name.indexOf(nq) >= 0) score += 32;
  if (name && nq && nq.indexOf(name) >= 0) score += name.length >= 2 ? 68 : 18;
  if (originalArtistMatch && name && nq && (name === nq || nq.indexOf(name) >= 0 || name.indexOf(nq) >= 0)) score += 122;
  else if (!qAsksDerivative && originalArtists.length && name && nq && (name === nq || nq.indexOf(name) >= 0 || name.indexOf(nq) >= 0)) score -= 58;
  if (artistMentioned) score += 96;
  else if (artist && nq && nq.indexOf(artist) >= 0) score += 64;
  else if (artist && artist.indexOf(nq) >= 0) score += 22;
  if (artistMentioned && name && nq.indexOf(name) >= 0) score += 34;
  if (/周杰伦|周杰倫|jay\s*chou/i.test(String(q || '')) && !artistMentioned) score -= 28;
  if (album && nq && (album.indexOf(nq) >= 0 || nq.indexOf(album) >= 0)) score += 8;
  if (Mineradio.util.songProviderKey(song) === 'qq') score += searchIntentPrefersQQ(q) ? 48 : 4;
  if (song && song.playable === false) score -= 12;
  if (!qAsksDerivative) {
    if (derivative) score -= artistMentioned ? 76 : 96;
    if (/(live|现场)/i.test(raw)) score -= artistMentioned ? 28 : 42;
    if (originalArtists.length && searchLooksLikeSameTitleCover(song, nq, name, album, raw, originalArtistMatch, sourceIndex)) score -= 46;
  }
  score -= (sourceIndex || 0) * 0.75;
  return score;
}
function mergeSongSearchResults(neteaseSongs, qqSongs, limit, q, youtubeSongs) {
  var out = [];
  var seen = {};
  function push(song, sourceIndex) {
    if (!song || !song.name) return;
    var key = Mineradio.util.songProviderKey(song) + ':' + (song.mid || song.id || (song.name + '|' + song.artist));
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
async function fetchMusicSearchResults(q, mode) {
  if (mode === 'qq') {
    var qqOnly = await Mineradio.platforms.qq.search(q, 12);
    return mergeSongSearchResults([], qqOnly.songs || [], 18, q);
  }
  if (mode === 'netease') {
    var neOnly = await Mineradio.platforms.netease.search(q, 18);
    return mergeSongSearchResults(neOnly.songs || [], [], 18, q);
  }
  if (mode === 'youtube') {
    if (!searchSourceEnabled('youtube')) { showToast('YouTube 已关闭'); return []; }
    var ytOnly = await Mineradio.platforms.youtube.search(q, 18);
    return mergeSongSearchResults([], [], 18, q, ytOnly.songs || []);
  }
  // 'song' (all) mode: parallel search across all platforms
  var promises = [
    Mineradio.platforms.netease.search(q, 10),
    Mineradio.platforms.qq.search(q, 8)
  ];
  if (searchSourceEnabled('youtube')) {
    promises.push(Mineradio.platforms.youtube.search(q, 8));
  }
  var result = await Promise.allSettled(promises);
  var neteaseSongs = result[0].status === 'fulfilled' ? ((result[0].value && result[0].value.songs) || []) : [];
  var qqSongs = result[1].status === 'fulfilled' ? ((result[1].value && result[1].value.songs) || []) : [];
  var youtubeSongs = [];
  if (searchSourceEnabled('youtube')) {
    youtubeSongs = result[2].status === 'fulfilled' ? ((result[2].value && result[2].value.songs) || []) : [];
  }
  return mergeSongSearchResults(neteaseSongs, qqSongs, 18, q, youtubeSongs);
}
function renderSongSearchResults(songs) {
  playlist = songs || [];
  $results.innerHTML = playlist.map(function(s, i){
    var vipTag = (s.fee === 1) ? '<span class="tag-vip">VIP</span>' : '';
    var sourceTag = songSourceTagHtml(s);
    var sourceClass = Mineradio.util.songProviderKey(s) + '-source';
    var thumb = songCoverSrc(s, 80);
    var imgTag = thumb
      ? '<img src="' + thumb + '" alt="" loading="lazy" onerror="this.style.opacity=0.2">'
      : '<div style="width:40px;height:40px;border-radius:6px;background:rgba(255,255,255,0.06);flex-shrink:0"></div>';
    return '<div class="search-result ' + sourceClass + '">' +
      '<div style="display:flex;align-items:center;gap:12px;flex:1;min-width:0" onclick="playSearchResult(' + i + ')">' +
        imgTag +
        '<div class="search-result-info">' +
          '<div class="search-result-title">' + Mineradio.util.escHtml(s.name) + sourceTag + vipTag + '</div>' +
          '<div class="search-result-meta">' + searchResultMetaHtml(s, i) + '</div>' +
        '</div>' +
      '</div>' +
      '<button class="song-action-btn' + (isSongLiked(s) ? ' liked' : '') + '" data-like-index="' + i + '" title="' + (isSongLiked(s) ? '取消红心' : '红心喜欢') + '" onclick="event.stopPropagation();toggleLikeSearchResult(' + i + ')">' + heartIconSvg() + '</button>' +
      '<button class="song-action-btn" title="收藏到歌单" onclick="event.stopPropagation();collectSearchResult(' + i + ')">' + playlistPlusIconSvg() + '</button>' +
      '<button class="add-btn" title="下一首播放" onclick="event.stopPropagation();queueSearchResult(' + i + ')">+</button>' +
    '</div>';
  }).join('');
  $results.classList.add('show');
  syncLikeStatusForSongs(playlist);
  if (window.gsap) animateListItems($results, '.search-result', { x: 0, y: 6, stagger: 0.012, duration: 0.18, limit: 18 });
}

async function doSearch(q, opts) {
  opts = opts || {};
  q = String(q || '').trim();
  if (!q) {
    if (searchMode === 'podcast') loadPodcastHot();
    else if (searchMode === 'youtube') loadYouTubeTrending();
    else renderSearchHistory();
    return;
  }
  if (searchMode === 'podcast') {
    doPodcastSearch(q);
    return;
  }
  var requestSeq = ++searchRequestSeq;
  try {
    var mode = searchMode;
    var songs = await fetchMusicSearchResults(q, mode);
    if (requestSeq !== searchRequestSeq || $input.value.trim() !== q) return;
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
    if (opts.autoPlayFirst) playSearchResult(0);
  } catch (err) { console.error('Search:', err); }
}

// ============================================================
//  Namespace Exports — Mineradio.search
// ============================================================
window.Mineradio = window.Mineradio || {};
Mineradio.search = {
  updateSearchPillGlassDisplacementMap: updateSearchPillGlassDisplacementMap,
  syncSearchAreaResultState: syncSearchAreaResultState,
  isMusicSearchMode: isMusicSearchMode,
  searchResultKey: searchResultKey,
  clearSearchResults: clearSearchResults,
  readSearchHistory: readSearchHistory,
  writeSearchHistory: writeSearchHistory,
  rememberSearchQuery: rememberSearchQuery,
  renderSearchHistory: renderSearchHistory,
  clearSearchHistory: clearSearchHistory,
  runSearchHistory: runSearchHistory,
  updateSearchModeTabs: updateSearchModeTabs,
  setSearchMode: setSearchMode,
  podcastMetaText: podcastMetaText,
  formatProgramTime: formatProgramTime,
  programMetaText: programMetaText,
  searchThumbHtml: searchThumbHtml,
  renderPodcastRadios: renderPodcastRadios,
  loadPodcastHot: loadPodcastHot,
  doPodcastSearch: doPodcastSearch,
  openPodcastPrograms: openPodcastPrograms,
  renderPodcastPrograms: renderPodcastPrograms,
  queuePodcastProgram: queuePodcastProgram,
  playPodcastProgram: playPodcastProgram,
  songSourceTagHtml: songSourceTagHtml,
  searchResultMetaText: searchResultMetaText,
  searchResultMetaHtml: searchResultMetaHtml,
  openSearchResultArtist: openSearchResultArtist,
  searchIntentPrefersQQ: searchIntentPrefersQQ,
  simpleSearchNorm: simpleSearchNorm,
  searchMentionsKnownArtist: searchMentionsKnownArtist,
  searchLooksLikeDerivative: searchLooksLikeDerivative,
  canonicalOriginalArtistsForSearch: canonicalOriginalArtistsForSearch,
  songArtistMatchesAny: songArtistMatchesAny,
  searchLooksLikeSameTitleCover: searchLooksLikeSameTitleCover,
  scoreSongSearchResult: scoreSongSearchResult,
  mergeSongSearchResults: mergeSongSearchResults,
  fetchMusicSearchResults: fetchMusicSearchResults,
  renderSongSearchResults: renderSongSearchResults,
  doSearch: doSearch
};
