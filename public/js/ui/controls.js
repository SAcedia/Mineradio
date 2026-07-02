// ============================================================
//  Controls — queue rendering, playlist panel, transport
// ============================================================

// 32-controls.js — Queue rendering, playlist panel, transport controls
// Extracted from ui/controls.js (control portion, lines 570-878)

window.Mineradio.bus.on('login:statechange', function(data) {
  // controls.js already updates search source directly
});
window.Mineradio.bus.on('queue:change', function(data) {
  safeRenderQueuePanel();
});
window.Mineradio.bus.on('like:toggle', function(data) {
  safeRenderQueuePanel();
});

function animateListItems(container, selector, opts) {
  if (!container || !window.gsap) return;
  opts = opts || {};
  var items = Array.prototype.slice.call(container.querySelectorAll(selector));
  if (!items.length) return;
  var limit = opts.limit || 18;
  var targets = items.slice(0, limit);
  window.gsap.killTweensOf(targets);
  window.gsap.fromTo(targets, {
    autoAlpha: 0,
    y: opts.y == null ? 8 : opts.y,
    x: opts.x == null ? -6 : opts.x
  }, {
    autoAlpha: 1,
    y: 0,
    x: 0,
    duration: opts.duration || 0.22,
    stagger: opts.stagger || 0.012,
    ease: opts.ease || 'power2.out',
    force3D: true,
    overwrite: true
  });
}
function smoothScrollToItem(scroller, item, opts) {
  if (!scroller || !item) return;
  opts = opts || {};
  var target = item.offsetTop - Math.max(0, (scroller.clientHeight - item.offsetHeight) * (opts.align == null ? 0.42 : opts.align));
  target = Math.max(0, Math.min(target, Math.max(0, scroller.scrollHeight - scroller.clientHeight)));
  if (window.gsap) {
    if (typeof scroller.__syncSmoothWheelTarget === 'function') scroller.__syncSmoothWheelTarget(target);
    window.gsap.killTweensOf(scroller);
    window.gsap.to(scroller, { scrollTop: target, duration: opts.duration || 0.30, ease: opts.ease || 'power2.out', overwrite: true });
  } else if (scroller.scrollTo) {
    scroller.scrollTo({ top: target, behavior: 'smooth' });
  } else {
    scroller.scrollTop = target;
  }
}
function bindSmoothWheelScroll(scroller) {
  if (!scroller || scroller.__smoothWheelBound) return;
  scroller.__smoothWheelBound = true;
  var targetTop = scroller.scrollTop;
  var tween = null;
  scroller.__syncSmoothWheelTarget = function(top){
    if (tween) {
      tween.kill();
      tween = null;
    }
    targetTop = isFinite(top) ? top : scroller.scrollTop;
  };
  scroller.addEventListener('wheel', function(e){
    if (!window.gsap || e.ctrlKey) return;
    var max = Math.max(0, scroller.scrollHeight - scroller.clientHeight);
    if (max <= 0 || Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return;
    var delta = e.deltaY;
    if (e.deltaMode === 1) delta *= 18;
    else if (e.deltaMode === 2) delta *= scroller.clientHeight;
    var current = tween ? targetTop : scroller.scrollTop;
    var next = Math.max(0, Math.min(max, current + delta));
    if (next === current && ((delta < 0 && scroller.scrollTop <= 0) || (delta > 0 && scroller.scrollTop >= max - 1))) {
      targetTop = scroller.scrollTop;
      return;
    }
    e.preventDefault();
    targetTop = next;
    if (tween) tween.kill();
    tween = window.gsap.to(scroller, {
      scrollTop: targetTop,
      duration: 0.24,
      ease: 'power2.out',
      overwrite: true,
      onComplete: function(){
        tween = null;
        targetTop = scroller.scrollTop;
      }
    });
  }, { passive: false });
  scroller.addEventListener('scroll', function(){
    if (!tween) targetTop = scroller.scrollTop;
  }, { passive: true });
}
function bindSmoothQueueScrolling() {
  if (smoothWheelScrollBound) return;
  smoothWheelScrollBound = true;
  [
    'mini-queue-list',
    'search-results',
    'fx-panel',
    'playlist-panel',
    'track-detail-body'
  ].forEach(function(id){
    bindSmoothWheelScroll(document.getElementById(id));
  });
}
function animateVisiblePanelList(listEl, selector, scroller, activeSelector, opts) {
  if (!listEl) return;
  opts = opts || {};
  requestAnimationFrame(function(){
    animateListItems(listEl, selector, { x: -8, y: 6, stagger: 0.01, duration: 0.20, limit: 16 });
    var active = activeSelector ? listEl.querySelector(activeSelector) : null;
    if (active && scroller && opts.scrollActive !== false) smoothScrollToItem(scroller, active, { duration: 0.32 });
  });
}
function miniQueueSkeleton() {
  return '<div class="mini-queue-skeleton"></div><div class="mini-queue-skeleton"></div><div class="mini-queue-skeleton"></div>';
}
function togglePlaylistPanel(force) {
  var el = document.getElementById('playlist-panel');
  if (force === false) el.classList.remove('show');
  else if (force === true) el.classList.add('show');
  else el.classList.toggle('show');
  if (el.classList.contains('show')) {
    if (window.gsap) window.gsap.fromTo(el, { x: -12, autoAlpha: 0.92 }, { x: 0, autoAlpha: 1, duration: 0.22, ease: 'power2.out', overwrite: true });
    scheduleUiWarmTask(function(){
      flushDeferredQueuePanel('playlist-panel-open');
      if (!playQueue.length && queueViewTab === 'queue') switchPlaylistTab('playlists');
      if (playQueue.length && currentIdx >= 0 && queueViewTab !== 'queue') switchPlaylistTab('queue');
      if (queueViewTab === 'queue') animateVisiblePanelList(document.getElementById('queue-list'), '.queue-item', el, '.queue-item.now', { scrollActive: false });
      else if (queueViewTab === 'playlists') animateVisiblePanelList(document.getElementById('pl-list'), '.pl-card', el);
      else animateVisiblePanelList(document.getElementById('podcast-list'), '.pl-card', el);
    }, 180);
  }
}
function applyPlaylistPanelPinState(openPanel) {
  var panel = document.getElementById('playlist-panel');
  var btn = document.getElementById('playlist-pin-btn');
  if (panel) {
    panel.classList.toggle('pinned', !!playlistPanelPinned);
    if (playlistPanelPinned || openPanel) {
      panel.dataset.preserveTabOnOpen = '1';
      setPeek(panel, true, 'pl');
    }
  }
  if (btn) {
    btn.classList.toggle('active', !!playlistPanelPinned);
    btn.title = playlistPanelPinned ? '取消常开歌单' : '常开歌单';
  }
}
function setPlaylistPanelPinned(on, silent) {
  playlistPanelPinned = !!on;
  saveBooleanPreference(PLAYLIST_PANEL_PIN_STORE_KEY, playlistPanelPinned);
  applyPlaylistPanelPinState(playlistPanelPinned);
  if (!silent) showToast(playlistPanelPinned ? '左侧歌单已常开' : '左侧歌单已恢复自动隐藏');
}
function togglePlaylistPanelPinned() {
  setPlaylistPanelPinned(!playlistPanelPinned);
}
function scrollPlaylistPanelToCurrent() {
  var panel = document.getElementById('playlist-panel');
  var list = document.getElementById('queue-list');
  if (!panel || !list || queueViewTab !== 'queue') return;
  var now = performance.now();
  if (panel.__lastCurrentScrollAt && now - panel.__lastCurrentScrollAt < 650) return;
  panel.__lastCurrentScrollAt = now;
  requestAnimationFrame(function(){
    smoothScrollToItem(panel, list.querySelector('.queue-item.now'), { duration: 0.28, align: 0.34 });
  });
}
function switchPlaylistTab(tab) {
  tab = tab === 'podcasts' ? 'podcasts' : (tab === 'playlists' ? 'playlists' : 'queue');
  if (tab !== 'playlists') hideLocalPlaylistDetail();
  queueViewTab = tab;
  document.getElementById('tab-queue').classList.toggle('active', tab === 'queue');
  document.getElementById('tab-pl').classList.toggle('active', tab === 'playlists');
  var podcastTab = document.getElementById('tab-podcast');
  if (podcastTab) podcastTab.classList.toggle('active', tab === 'podcasts');
  document.getElementById('queue-pane').style.display = tab === 'queue' ? '' : 'none';
  document.getElementById('pl-pane').style.display = tab === 'playlists' ? '' : 'none';
  var podcastPane = document.getElementById('podcast-pane');
  if (podcastPane) podcastPane.style.display = tab === 'podcasts' ? '' : 'none';
  if (tab === 'playlists' || tab === 'podcasts') refreshUserPlaylists();
  if (tab === 'queue') animateVisiblePanelList(document.getElementById('queue-list'), '.queue-item', document.getElementById('playlist-panel'), '.queue-item.now');
  if (tab === 'playlists') { renderLocalPlaylistsIntoView(); animateVisiblePanelList(document.getElementById('pl-list'), '.pl-card', document.getElementById('playlist-panel')); }
  if (tab === 'podcasts') animateVisiblePanelList(document.getElementById('podcast-list'), '.pl-card', document.getElementById('playlist-panel'));
}
function setMiniQueueOpen(open) {
  miniQueueOpen = !!open;
  var pop = document.getElementById('mini-queue-popover');
  var btn = document.getElementById('mini-queue-btn');
  if (pop) pop.classList.toggle('show', miniQueueOpen);
  if (btn) btn.classList.toggle('active', miniQueueOpen);
  if (miniQueueOpen) {
    var seq = ++miniQueueRenderSeq;
    requestAnimationFrame(function(){
      if (seq !== miniQueueRenderSeq || !miniQueueOpen) return;
      renderMiniQueuePanel({ animate: true, scrollCurrent: true });
    });
    revealBottomControls(1300);
  }
}
function toggleMiniQueue(e) {
  if (e) { e.preventDefault(); e.stopPropagation(); }
  setMiniQueueOpen(!miniQueueOpen);
}
function closeMiniQueue() {
  setMiniQueueOpen(false);
}
// ============================================================
//  Tabs — switch playlist view
// ============================================================
function openPlaylistPanelTab(tab, preserve) {
  tab = tab === 'podcasts' ? 'podcasts' : (tab === 'playlists' ? 'playlists' : 'queue');
  var panel = document.getElementById('playlist-panel');
  if (panel && panel.dataset && preserve !== false) panel.dataset.preserveTabOnOpen = '1';
  switchPlaylistTab(tab);
  setPeek(panel, true, 'pl');
}
function renderMiniQueuePanel(opts) {
  opts = opts || {};
  var $list = document.getElementById('mini-queue-list');
  var $count = document.getElementById('mini-queue-count');
  if (!$list || !$count) return;
  var total = playQueue.length;
  $count.textContent = total ? (total + ' 首' + (currentIdx >= 0 ? ' · 正在播放 ' + (currentIdx + 1) : '')) : '0 首';
  if (!miniQueueOpen && !opts.animate && !opts.scrollCurrent) return;
  if (!total) {
    $list.innerHTML = '<div class="mini-queue-empty">队列为空，先搜索或打开歌单</div>';
    return;
  }
  $list.innerHTML = playQueue.map(function(song, i){
    var thumb = songCoverSrc(song, 60);
    var imgTag = thumb ? '<img src="' + thumb + '" alt="" loading="lazy" decoding="async" onerror="this.style.opacity=0.2">' : '<div class="mini-queue-cover"></div>';
    return '<div class="mini-queue-item' + (i === currentIdx ? ' now' : '') + '" onclick="playQueueAt(' + i + ')">' +
      imgTag +
      '<div class="mini-queue-info"><div class="mini-queue-name">' + escHtml(song.name) + '</div><div class="mini-queue-sub">' + escHtml(song.artist || '') + '</div></div>' +
      '<button class="mini-queue-remove mini-queue-next" onclick="event.stopPropagation();queueIndexNext(' + i + ')" title="下一首播放">下</button>' +
      '<button class="mini-queue-remove" onclick="event.stopPropagation();removeFromQueue(' + i + ')" title="移除">×</button>' +
    '</div>';
  }).join('');
  if (opts.animate || opts.scrollCurrent) {
    requestAnimationFrame(function(){
      if (opts.animate) animateListItems($list, '.mini-queue-item', { x: 0, y: 6, stagger: 0.01, duration: 0.20, limit: 16 });
      if (opts.scrollCurrent) smoothScrollToItem($list, $list.querySelector('.mini-queue-item.now'), { duration: 0.30, align: 0.42 });
    });
  }
}
document.addEventListener('click', function(e){
  if (miniQueueOpen && !(e.target && e.target.closest && e.target.closest('#bottom-bar'))) closeMiniQueue();
});
bindSmoothQueueScrolling();
// ============================================================
//  Queue — render panel
// ============================================================
function renderQueuePanel(opts) {
  opts = opts || {};
  var $ql = document.getElementById('queue-list');
  var seq = ++queueRenderSeq;
  if (!playQueue.length) {
    $ql.innerHTML = '<div style="text-align:center;padding:24px 0;color:rgba(255,255,255,.32);font-size:11.5px">队列为空，搜索后点 + 设为下一首</div>';
    renderMiniQueuePanel();
    var panel = document.getElementById('playlist-panel');
    if (panel && (panel.classList.contains('show') || panel.classList.contains('peek')) && queueViewTab === 'queue') switchPlaylistTab('playlists');
    return;
  }
  $ql.innerHTML = playQueue.map(function(song, i){
    var thumb = songCoverSrc(song, 60);
    var imgTag = thumb ? '<img src="' + thumb + '" alt="" loading="lazy" decoding="async" onerror="this.style.opacity=0.2">' : '<div style="width:38px;height:38px;border-radius:6px;background:rgba(255,255,255,.06);flex-shrink:0"></div>';
    return '<div class="queue-item' + (i === currentIdx ? ' now' : '') + '" onclick="playQueueAt(' + i + ')">' +
      imgTag +
      '<div class="qi-info"><div class="qi-name">' + escHtml(song.name) + '</div><div class="qi-sub"><button class="queue-artist-link" type="button" onclick="event.stopPropagation();openQueueArtist(' + i + ')">' + escHtml(song.artist || '未知歌手') + '</button></div></div>' +
      '<div class="qi-act">' +
        '<button class="' + (isSongLiked(song) ? 'liked' : '') + '" onclick="event.stopPropagation();toggleLikeQueueIndex(' + i + ')" title="' + (isSongLiked(song) ? '取消红心' : '红心喜欢') + '">' + heartIconSvg() + '</button>' +
        '<button class="queue-next" onclick="event.stopPropagation();queueIndexNext(' + i + ')" title="下一首播放">下</button>' +
        '<button onclick="event.stopPropagation();collectQueueIndex(' + i + ')" title="收藏到歌单">' + playlistPlusIconSvg() + '</button>' +
        '<button onclick="event.stopPropagation();removeFromQueue(' + i + ')" title="移除">×</button>' +
      '</div>' +
    '</div>';
  }).join('');
  if (opts.animate && seq === queueRenderSeq) animateVisiblePanelList($ql, '.queue-item', document.getElementById('playlist-panel'), '.queue-item.now');
  renderMiniQueuePanel({ scrollCurrent: miniQueueOpen });
}
async function refreshUserPlaylists(force) {
  if (!loginStatus.loggedIn && !qqLoginStatus.loggedIn) {
    resetPlaylistPanelRenderLimit();
    document.getElementById('pl-list').innerHTML = '<div style="text-align:center;padding:24px 0;color:rgba(255,255,255,.32);font-size:11.5px">登录后显示个人歌单</div>';
    var podcastListLoggedOut = document.getElementById('podcast-list');
    if (podcastListLoggedOut) podcastListLoggedOut.innerHTML = '<div style="text-align:center;padding:14px 0;color:rgba(255,255,255,.28);font-size:11.5px">登录后显示我的播客</div>';
    return;
  }
  if (force) resetPlaylistPanelRenderLimit();
  var hasCachedQQPlaylists = userPlaylists.some(function(pl){ return pl && pl.provider === 'qq'; });
  var needsQQRefresh = qqLoginStatus.loggedIn && !hasCachedQQPlaylists;
  if (!force && !needsQQRefresh && (userPlaylists.length || myPodcastCollections.length)) {
    var cachedAnimate = isPlaylistPanelVisibleForRender();
    renderUserPlaylistsList({ animate: cachedAnimate });
    renderMyPodcastCollections({ animate: cachedAnimate });
    return;
  }
  var $pl = document.getElementById('pl-list');
  if ($pl) {
    $pl.innerHTML = miniQueueSkeleton();
    if (window.gsap) animateListItems($pl, '.mini-queue-skeleton', { x: 0, y: 6, stagger: 0.018, duration: 0.18, limit: 3 });
  }
  var $pod = document.getElementById('podcast-list');
  if ($pod) $pod.innerHTML = miniQueueSkeleton();
  try {
    var result = await Promise.all([
      loginStatus.loggedIn ? Mineradio.platforms.netease.userPlaylists() : Promise.resolve({ playlists: [] }),
      loginStatus.loggedIn ? Mineradio.platforms.netease.podcastMy() : Promise.resolve({ collections: [], loggedIn: false }),
      qqLoginStatus.loggedIn ? Mineradio.platforms.qq.userPlaylists() : Promise.resolve({ playlists: [] }),
      Promise.resolve({ playlists: [] })
    ]);
    var neteaseLists = (result[0].playlists || []).map(function(pl){ pl.provider = 'netease'; pl.source = 'netease'; return pl; });
    qqPlaylists = (result[2].playlists || []).map(function(pl){ pl.provider = 'qq'; pl.source = 'qq'; return pl; });
    userPlaylists = neteaseLists.concat(qqPlaylists);
    myPodcastCollections = result[1].collections || [];
    var animatePanel = isPlaylistPanelVisibleForRender();
    renderUserPlaylistsList({ animate: animatePanel, reset: true });
    renderMyPodcastCollections({ animate: animatePanel });
    if (emptyHomeActive) renderHomeDiscover();
    scheduleShelfRebuild('refresh-user-playlists', true);
  } catch (e) { console.warn(e); }
}

// --- Namespace exports ---
Mineradio.controls = {
  animateListItems: animateListItems,
  smoothScrollToItem: smoothScrollToItem,
  bindSmoothWheelScroll: bindSmoothWheelScroll,
  bindSmoothQueueScrolling: bindSmoothQueueScrolling,
  animateVisiblePanelList: animateVisiblePanelList,
  miniQueueSkeleton: miniQueueSkeleton,
  togglePlaylistPanel: togglePlaylistPanel,
  applyPlaylistPanelPinState: applyPlaylistPanelPinState,
  setPlaylistPanelPinned: setPlaylistPanelPinned,
  togglePlaylistPanelPinned: togglePlaylistPanelPinned,
  scrollPlaylistPanelToCurrent: scrollPlaylistPanelToCurrent,
  switchPlaylistTab: switchPlaylistTab,
  setMiniQueueOpen: setMiniQueueOpen,
  toggleMiniQueue: toggleMiniQueue,
  closeMiniQueue: closeMiniQueue,
  openPlaylistPanelTab: openPlaylistPanelTab,
  renderMiniQueuePanel: renderMiniQueuePanel,
  renderQueuePanel: renderQueuePanel,
  refreshUserPlaylists: refreshUserPlaylists
};

// ============================================================

