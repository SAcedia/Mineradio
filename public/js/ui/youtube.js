// ============================================================
//  YouTube
// ============================================================
window.loginYouTube = function() {
  var api = window.desktopWindow;
  if (api && api.isDesktop) {
    window.open('https://www.youtube.com', '_blank');
  } else {
    window.open('https://www.youtube.com', '_blank');
  }
  window.showToast('请在浏览器中登录 YouTube，登录后即可播放');
}
window.searchSourceEnabled = function(provider) {
  try {
    var v = localStorage.getItem('mineradio-window.source-' + provider);
    if (provider === 'youtube') return v === '1'; // YouTube defaults OFF
    return v !== '0';
  } catch(e) { return provider !== 'youtube'; }
}
window.toggleSearchSource = function(provider) {
  var on = window.searchSourceEnabled(provider);
  var next = !on;
  try { localStorage.setItem('mineradio-window.source-' + provider, next ? '1' : '0'); } catch(e) {}
  ['toggle-' + provider + '-btn', 'login-' + provider + '-toggle'].forEach(function(id){
    var btn = document.getElementById(id);
    if (btn) {
      btn.classList.toggle('active', next);
    }
  });
  if (!next && searchMode === provider) setSearchMode('song');
}
window.initSearchSourceToggles = function() {
  ['netease', 'qq', 'youtube'].forEach(function(provider){
    var on = window.searchSourceEnabled(provider);
    var btn1 = document.getElementById('toggle-' + provider + '-btn');
    if (btn1) btn1.classList.toggle('active', on);
    var btn2 = document.getElementById('login-' + provider + '-toggle');
    if (btn2) btn2.classList.toggle('active', on);
  });
}
window.initSearchSourceToggles();
window.loadYouTubeTrending = async function() {
  var requestSeq = ++window.searchRequestSeq;
  $results.innerHTML = '<div class="search-empty">Loading YouTube trending...</div>';
  $results.classList.add('show');
  try {
    var data = await window.youtubeTrending();
    if (requestSeq !== window.searchRequestSeq || window.searchMode !== 'youtube') return;
    if (data && data.songs && data.songs.length) {
      playlist = data.songs;
      window.renderSearchResults(data.songs, 'YouTube Trending');
    } else {
      $results.innerHTML = '<div class="search-empty">No trending content</div>';
    }
  } catch (err) {
    console.error('YouTube trending:', err);
    if (requestSeq === window.searchRequestSeq) $results.innerHTML = '<div class="search-empty">YouTube load failed</div>';
  }
}
