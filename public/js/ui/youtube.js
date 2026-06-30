// ============================================================
//  YouTube
// ============================================================
function loginYouTube() {
  var api = window.desktopWindow;
  if (api && api.isDesktop) {
    window.open('https://www.youtube.com', '_blank');
  } else {
    window.open('https://www.youtube.com', '_blank');
  }
  showToast('请在浏览器中登录 YouTube，登录后即可播放');
}
function searchSourceEnabled(provider) {
  try {
    var v = localStorage.getItem('mineradio-source-' + provider);
    if (provider === 'youtube') return v === '1'; // YouTube defaults OFF
    return v !== '0';
  } catch(e) { return provider !== 'youtube'; }
}
function toggleSearchSource(provider) {
  var on = searchSourceEnabled(provider);
  var next = !on;
  try { localStorage.setItem('mineradio-source-' + provider, next ? '1' : '0'); } catch(e) {}
  ['toggle-' + provider + '-btn', 'login-' + provider + '-toggle'].forEach(function(id){
    var btn = document.getElementById(id);
    if (btn) {
      btn.classList.toggle('active', next);
    }
  });
  if (!next && searchMode === provider) setSearchMode('song');
}
function initSearchSourceToggles() {
  ['netease', 'qq', 'youtube'].forEach(function(provider){
    var on = searchSourceEnabled(provider);
    var btn1 = document.getElementById('toggle-' + provider + '-btn');
    if (btn1) btn1.classList.toggle('active', on);
    var btn2 = document.getElementById('login-' + provider + '-toggle');
    if (btn2) btn2.classList.toggle('active', on);
  });
}
initSearchSourceToggles();
async function loadYouTubeTrending() {
  var requestSeq = ++searchRequestSeq;
  $results.innerHTML = '<div class="search-empty">Loading YouTube trending...</div>';
  $results.classList.add('show');
  try {
    var data = await youtubeTrending();
    if (requestSeq !== searchRequestSeq || searchMode !== 'youtube') return;
    if (data && data.songs && data.songs.length) {
      playlist = data.songs;
      renderSearchResults(data.songs, 'YouTube Trending');
    } else {
      $results.innerHTML = '<div class="search-empty">No trending content</div>';
    }
  } catch (err) {
    console.error('YouTube trending:', err);
    if (requestSeq === searchRequestSeq) $results.innerHTML = '<div class="search-empty">YouTube load failed</div>';
  }
}
