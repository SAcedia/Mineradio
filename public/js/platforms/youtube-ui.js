// ============================================================
//  platforms/youtube-ui.js — YouTube UI 交互
// ============================================================

window.Mineradio = window.Mineradio || {};
window.Mineradio.platforms = window.Mineradio.platforms || {};

try {
  window.Mineradio.platforms.youtubeUI = {
    loginYouTube: function() {
      var api = window.desktopWindow;
      if (api && api.isDesktop) {
        window.open('https://www.youtube.com', '_blank');
      } else {
        window.open('https://www.youtube.com', '_blank');
      }
      window.showToast('请在浏览器中登录 YouTube，登录后即可播放');
    },

    searchSourceEnabled: function(provider) {
      try {
        var v = localStorage.getItem('mineradio-window.source-' + provider);
        if (provider === 'youtube') return v === '1';
        return v !== '0';
      } catch(e) { return provider !== 'youtube'; }
    },

    toggleSearchSource: function(provider) {
      var on = window.Mineradio.platforms.youtubeUI.searchSourceEnabled(provider);
      var next = !on;
      try { localStorage.setItem('mineradio-window.source-' + provider, next ? '1' : '0'); } catch(e) {}
      ['toggle-' + provider + '-btn', 'login-' + provider + '-toggle'].forEach(function(id){
        var btn = document.getElementById(id);
        if (btn) {
          btn.classList.toggle('active', next);
        }
      });
      if (!next && searchMode === provider) setSearchMode('song');
    },

    initSearchSourceToggles: function() {
      ['netease', 'qq', 'youtube'].forEach(function(provider){
        var on = window.Mineradio.platforms.youtubeUI.searchSourceEnabled(provider);
        var btn1 = document.getElementById('toggle-' + provider + '-btn');
        if (btn1) btn1.classList.toggle('active', on);
        var btn2 = document.getElementById('login-' + provider + '-toggle');
        if (btn2) btn2.classList.toggle('active', on);
      });
    },

    loadYouTubeTrending: async function() {
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
    },

    toggleLikeSong: function(song) {
      if (!song || !song.id) return;
      var id = String(song.id);
      if (window.songProviderKey(song) === 'youtube') {
        var key = 'mineradio-local-like-youtube:' + id;
        var next = !likedSongMap[id];
        likeBusyMap[id] = true;
        likedSongMap[id] = next;
        try {
          if (next) {
            localStorage.setItem(key, JSON.stringify({ liked: true, name: song.name, artist: song.artist, cover: song.cover, savedAt: Date.now() }));
          } else {
            localStorage.removeItem(key);
          }
        } catch(e) {}
        likeBusyMap[id] = false;
        window.updateLikeButtons(song);
        window.safeRenderQueuePanel('like-toggle-optimistic', { scrollCurrent: window.miniQueueOpen });
        window.refreshSearchResultActionStates();
        window.showToast(next ? '已加入红心喜欢' : '已取消红心');
        return true;
      }
    },
  };

  // Auto-init search source toggles on load
  window.Mineradio.platforms.youtubeUI.initSearchSourceToggles();
} catch(e) {
  console.warn('YouTube UI failed:', e.message);
  window.Mineradio.platforms.youtubeUI = null;
}

// Backward compatibility: expose as window.* globals
if (window.Mineradio.platforms.youtubeUI) {
  window.loginYouTube = window.Mineradio.platforms.youtubeUI.loginYouTube;
  window.searchSourceEnabled = window.Mineradio.platforms.youtubeUI.searchSourceEnabled;
  window.toggleSearchSource = window.Mineradio.platforms.youtubeUI.toggleSearchSource;
  window.initSearchSourceToggles = window.Mineradio.platforms.youtubeUI.initSearchSourceToggles;
  window.loadYouTubeTrending = window.Mineradio.platforms.youtubeUI.loadYouTubeTrending;
}
