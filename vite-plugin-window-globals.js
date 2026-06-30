// Vite plugin: auto-inject window globals as module-level const destructuring
// Scans each file for known global names, injects `const { name1, name2 } = window;` at top

const KNOWN_GLOBALS = [
  // shared.js
  'audio', 'audioCtx', 'source', 'analyser', 'beatAnalyser', 'gainNode', 'audioReady',
  'clamp01', 'clampRange', 'songProviderKey',
  'openGsapModal', 'closeGsapModal', 'bindModalBackdropClose',
  'fxDefaults', 'VISUAL_PRESET_SCHEMA', 'PACKAGED_DEFAULT_FX_SNAPSHOT',
  'clonePackagedDefaultFxSnapshot', 'packagedDefaultLyricLayoutRaw',
  'PACKAGED_DEFAULT_USER_FX_ARCHIVE_NAME', 'PACKAGED_DEFAULT_USER_FX_ARCHIVE_EXPORTED_AT', 'PACKAGED_DEFAULT_USER_FX_ARCHIVE_SAVED_AT',
  '_audioUrlCache', '_prefetchAudioEls', '_cacheKeyForSong', '_prefetchToken',
  'CUSTOM_COVER_STORE_KEY', 'CUSTOM_LYRIC_STORE_KEY', 'CUSTOM_LYRIC_PREF_STORE_KEY',
  'LYRIC_LAYOUT_STORE_KEY', 'PLAYBACK_QUALITY_STORE_KEY', 'UPLOAD_TIP_STORE_KEY',
  'DIY_MODE_STORE_KEY', 'PLAYLIST_PANEL_PIN_STORE_KEY', 'USER_CAPSULE_AUTO_HIDE_STORE_KEY',
  'FX_FAB_AUTO_HIDE_STORE_KEY', 'CONTROLS_AUTO_HIDE_STORE_KEY', 'FREE_CAMERA_STORE_KEY',
  'HOTKEY_SETTINGS_STORE_KEY', 'VISUAL_GUIDE_SEEN_STORE_KEY', 'LOCAL_BEATMAP_STORE_KEY',
  'LOCAL_BEAT_PREF_STORE_KEY', 'LOCAL_BEAT_COMBOS', 'HOTKEY_ACTIONS',
  'hotkeyCaptureState', 'hotkeyGlobalStatus', 'diyPlayerMode',
  'customCoverMap', 'customLyricMap', 'customLyricPrefs',
  'readDiyModePreference', 'readBooleanPreference', 'readHotkeySettings', 'getHotkeyDefaults',
  'shelfPinnedOpen', 'playlistPanelLazyBound',
  // state.js
  'uiSfxCtx', 'lastShelfSelectSfxAt', 'FFT_SIZE', 'frequencyData', 'timeDomainData',
  'BEAT_FFT_SIZE', 'beatFrequencyData', 'beatTimeDomainData',
  'bass', 'mid', 'treble', 'audioEnergy', 'beatPulse', 'prevEnergy',
  'lyricSunEnergy', 'lyricSunTarget', 'lyricSunHold', 'lyricSunAvg', 'lyricSunPeak',
  'smoothBass', 'smoothMid', 'smoothTreb', 'smoothEnergy',
  'bassPeak', 'midPeak', 'treblePeak', 'energyPeak',
  'beatOnsetFlag', 'lastStrongDrop',
  'lyricsLines', 'lyricsVisible', 'lyricsHasNativeKaraoke', 'lyricsTimingSource',
  'playlist', 'playQueue', 'currentIdx', 'playing', 'playToggleBusy',
  'searchMode', 'podcastResults', 'podcastPrograms', 'podcastCurrentRadio',
  'loginStatus', 'qqLoginStatus', 'loginProvider', 'activeAccountProvider', 'dualAccountMode',
  'qqCookieBusy', 'neteaseWebLoginBusy', 'qqWebLoginBusy', 'qqManualCookieOpen',
  'loginStatusChecked', 'loginStatusCheckFailed', 'qrPollTimer', 'qrKey',
  'volumeTween', 'trackSwitchToken', 'audioFadeTimer', 'audioElementFadeFrame', 'audioFadeSerial',
  'AUDIO_FADE_IN_MS', 'AUDIO_FADE_OUT_MS', 'AUDIO_SILENCE_GAIN',
  'userPlaylists', 'qqPlaylists', 'myPodcastCollections', 'myPodcastItems', 'playlistCoverCache',
  'qqLoginAutoRefreshTimer', 'qqLoginWasLoggedIn',
  'targetVolume', 'lastNonZeroVolume',
  'playbackQuality', 'fx', 'playbackVisualPreset', 'controlsAutoHide',
  'hotkeySettings', 'immersiveMode', 'immersiveState',
  'userCapsuleAutoHide', 'fxFabAutoHide', 'fxFabAutoHideRevealArmed',
  'playlistPanelPinned', 'searchHistoryChipsBuilt',
  'controlGlassRendered', 'volumePopoverOpen', 'qualityPopoverOpen', 'miniQueueOpen',
  'pointerParallax', 'pointerTarget', 'renderPowerState', 'desktopRuntimeState',
  '_lyricOffset', 'lyricSourceMode', 'lyricsTimingSource',
  'freeCamera', 'beatCam', 'idleGuideCanvas', 'idleGuideW', 'idleGuideH',
  'idleGuideInteraction', 'idleGuideAnimationId',
  // api-helper
  'apiJson', 'escHtml', 'normalizePlaybackQuality', 'playbackQualityLabel', 'playbackQualityShortLabel',
  'playbackQualityRank', 'playbackQualityWasDowngraded', 'playbackBitrateLabel', 'playbackResolvedQualityText',
  'readPlaybackQualityPreference', 'savePlaybackQualityPreference',
  'updatePlaybackQualityUi', 'setPlaybackQuality', 'canReloadCurrentTrackForQuality',
  'applyPlaybackQualityToCurrentTrack', 'toggleQualityPanel', 'bindQualityControl', 'isTypingTarget',
  'currentCoverSong', 'songDurationLabel', 'songSourceLabel', 'detailRow',
  'currentArtistNames', 'normalizeArtistNameForMatch', 'artistNameMatches', 'currentArtistId', 'currentQQArtistMid',
  'commentTimeLabel', 'renderDetailComments', 'renderArtistSongList',
  'playArtistDetailSong', 'collectArtistDetailSong', 'queueArtistDetailSongNext',
  'bindTrackDetailScrollers', 'closeTrackDetailModal', 'openTrackDetailModal',
  'openArtistDetailForSong', 'resolveArtistSongForDetail',
  'readCustomLyricMap', 'saveCustomLyricMap', 'readCustomLyricPrefs', 'saveCustomLyricPrefs',
  'songCustomLyricKey', 'currentLyricSong', 'getCustomLyricEntry', 'hasCustomLyricForSong',
  'cloneLyricLine', 'cloneLyricLines', 'setOriginalLyricsState', 'applyLyricsState',
  'applyOriginalLyricsState', 'parseCustomLyricText', 'applyCustomLyricState',
  'preferredLyricSourceForSong', 'applyPreferredLyricsForCurrent',
  'setLyricSourceMode', 'updateCustomLyricControls', 'setCustomLyricStatus',
  'openCustomLyricModal', 'closeCustomLyricModal', 'saveCustomLyricForCurrent', 'deleteCustomLyricForCurrent',
  'cloneSong', 'avatarSrc',
  'readCustomCoverMap', 'saveCustomCoverMap', 'isInlineCoverSrc', 'isProxyableCoverUrl',
  'coverProxySrc', 'coverUrlWithSize', 'songCustomCoverKey', 'getCustomCoverForSong',
  'hydrateCustomCover', 'songCoverSrc', 'cssImageUrl',
  'setCustomCoverForCurrent', 'updateCustomCoverButton', 'clearCustomCoverForCurrent',
  'isCloudSong', 'isSongLiked', 'ensureLoggedInForAction', 'updateLikeButtons',
  'heartIconSvg', 'playlistPlusIconSvg', 'artistCollectTrayIconSvg', 'artistNextPlusIconSvg',
  'songActionHtml', 'syncLikeStatusForSongs', 'syncLikeStatusForSong',
  'isLikedPlaylistContext', 'markSongsLiked', 'refreshSearchResultActionStates',
  'toggleLikeSong', 'toggleLikeCurrent', 'toggleLikeSearchResult', 'toggleLikeQueueIndex', 'toggleLikeDetailSong',
  'openCollectModal', 'openCollectModalForCurrent', 'collectSearchResult', 'collectQueueIndex',
  'collectDetailSong', 'closeCollectModal', 'renderCollectModal', 'setCollectBusyPid',
  'createPlaylistFromCollect', 'collectResultMessage', 'verifySongInPlaylist', 'addCollectTargetToPlaylist',
  'setHomeArt', 'compactHomeCount', 'loadListenStatsState', 'saveListenStatsState',
  'listenSongSnapshot', 'beginListenSession', 'updateListenStatsTick', 'finalizeListenSession',
  'mostPlayedSong', 'topListenArtist', 'homeListenSummary',
  'listenStatsState', 'listenSession', 'appPerfMarks',
  'logListenEvent', 'markAppPerf', 'collectRuntimePerfSnapshot', 'trimRuntimeCaches',
  // ui/controls
  'searchTimer', 'searchRequestSeq', 'searchLastResultQuery', 'SEARCH_HISTORY_STORE_KEY',
  'searchHistoryChipsBuilt', 'queueViewTab', 'queuePanelDirty', 'queueRenderSeq',
  'miniQueueRenderSeq', 'playlistRefreshSeq', 'smoothWheelScrollBound',
  'controlsHovering', 'controlsHideTimer',
  'renderSearchResults', 'safeRenderQueuePanel', 'safeRenderMiniQueuePanel',
  'forcePlaybackControlsInteractive', 'scheduleControlsHide',
  'togglePlaylistPanel', 'togglePlaylistPanelPinned', 'switchPlaylistTab',
  'refreshUserPlaylists', 'cyclePlayMode', 'shuffleQueue', 'clearQueue',
  'toggleControlsAutoHide', 'toggleImmersiveMode', 'toggleFullscreen',
  'playMode', 'playModeLabel', 'playModeIcon',
  // ui/login
  'qqWebLoginBusy', 'neteaseWebLoginBusy',
  'refreshQr', 'startQrPoll', 'stopQrPoll', 'checkQr',
  'showLoginModal', 'closeLoginModal', 'setLoginProvider', 'updateLoginProviderUi',
  'openQQWebLogin', 'openNeteaseWebLogin', 'openProviderWebLogin',
  'openProviderLogin', 'refreshQQLoginStatus', 'submitQQCookieLogin',
  'toggleQQCookiePanel', 'hasAnyPlatformLogin', 'hasPlatformLogin',
  'platformMeta', 'platformStatus', 'providerVipType', 'providerVipLevel',
  'hasProviderSvip', 'setActiveAccountProvider', 'enableDualAccountView',
  'showUserModal', 'closeUserModal', 'logoutActiveAccount',
  'requestDualLoginMode', 'skipLoginAndFocusSearch',
  // ui/playlists
  'LOCAL_PLAYLIST_STORAGE_KEY', 'loadLocalPlaylists', 'saveLocalPlaylists',
  'createLocalPlaylist', 'createLocalPlaylistFromPicker', 'deleteLocalPlaylist',
  'getLocalLikedSongs', 'toStandardSongs', 'playLocalPlaylistSongs',
  'showLocalPlaylistDetail', 'hideLocalPlaylistDetail', 'localDetailPlaylistId', 'localDetailSongs',
  'renderLocalPlaylistsIntoView', 'playlistPanelDetailState',
  'playlistPanelKey', 'playlistPanelDetailHtml', 'bindPlaylistPanelLazyRender',
  'renderUserPlaylistsList', 'loadPlaylistIntoQueueById',
  'growPlaylistPanelRenderLimit', 'growPlaylistPanelDetailRenderLimit',
  'playlistPanelRenderLimit', 'playlistRenderSeq',
  // ui/misc
  'idleGuideCanvas', 'idleGuideW', 'idleGuideH', 'idleGuideInteraction', 'idleGuideAnimationId',
  'shouldHandleIdleGuidePointer', 'idleGuidePointerMove',
  'visualGuideActive', 'visualGuideStep', 'visualGuideSeen',
  'showToast', 'showSourceFallbackNotice', 'closeSourceFallbackNotice',
  'toggleVisualGuide', 'closeVisualGuide', 'nextVisualGuideStep',
  'uploadTipSeen', 'uploadTipDismissed',
  'applyDiyMode', 'toggleDiyMode', 'syncDiyModeButton', 'isDiyMode',
  'updateDesktopRuntimeState', 'installRenderPowerHooks',
  // audio
  'playQueueAt', 'togglePlay', 'nextTrack', 'prevTrack',
  'queueSong', 'queueSongNext', 'playSearchResult',
  'setPlayIcon', 'cancelBeatAnalysisTimer', 'cancelBeatPrefetchTimer',
  'cancelLocalBeatAnalysis', 'beatMapSongKey', 'beatMapToken',
  'localBeatAnalysis', 'localBeatMapCache', 'localBeatMapPrefs',
  'djMode', 'beatMapCache', 'currentBeatMap',
  'pauseCurrentAudioForTrackSwitch', 'fadeOutAndPauseAudio', 'attemptAudioPlay',
  'safePlaybackStep', 'markRenderInteraction', 'markPlayPhase',
  'showLoading', 'hideLoading', 'scheduleShelBuild', 'safeShelfRebuild',
  'beatAnalysisContext', 'beatAnalysisState', 'beatAnalysisResults',
  'fetchLyric', 'renderLyrics', 'toggleLyricsPanel',
  '_lyricSources', '_lyricSourceLabels', '_lyricSourceIdx', '_lyricOffsetToastTimer',
  '_saveLyricOffset', '_loadLyricOffset', 'updateLyricOffsetVisibility', 'showLyricOffsetToast',
  'cycleLyricSource', 'setLyricSource', 'adjustLyricOffset', 'adjustPlaybackSpeed',
  'updateMiniSourceBar', 'updateMiniSourceButtons',
  // three
  'scene', 'camera', 'renderer', 'uniforms', 'postProcessing',
  'particleSystem', 'particleState', 'particlePointerFrame',
  'shelfManager', 'makeShelfManager', 'safeShelfRebuild', 'scheduleShelfRebuild',
  'safeShelfCloseContent', 'compactCount', 'shelfAccentHex', 'shelfAccentRgba',
  'shelfPane', 'setShelfPinnedOpen', 'shelfAlwaysVisible',
  'stageLyrics', 'readSavedLyricLayout', 'normalizeHexColor', 'normalizeShelfCameraMode',
  'shelfDefaultAngleForCameraMode', 'normalizeCoverResolution',
  'normalizeLyricFontKey', 'normalizeDesktopLyricsFps',
  'normalizePerformanceBackgroundMode', 'normalizePerformanceQuality',
  'coverParticleGridForResolution', 'coverTextureSizeForResolution',
  'makeDotTexture', 'coverPickerCanvas',
  // platforms
  'neteaseApi', 'neteaseQs', 'neteaseAPIList', 'neteaseOverrides',
  'neteaseSearch', 'neteaseSongUrl', 'neteasePlaylistTracks',
  'neteaseLoginQrKey', 'neteaseLoginQrCreate', 'neteaseLoginQrCheck',
  'neteaseLoginStatus', 'neteaseUserPlaylists',
  'neteaseLyric', 'neteaseLyricSearch', 'neteaseLike', 'neteaseLikeCheck',
  'neteasePlaylistCreate', 'neteasePlaylistAddSong',
  'neteaseDiscoverHome', 'neteaseWeatherIpLocation',
  'neteaseBeatmapCacheStatus', 'neteaseBeatmapCacheGet', 'neteaseUpdateLatest',
  'neteasePodcastHot', 'neteasePodcastSearch', 'neteasePodcastPrograms',
  'neteasePodcastMy', 'neteasePodcastMyItems', 'neteaseLoginCookie',
  'qqApi', 'qqSearch', 'qqSongUrl', 'qqPlaylistTracks',
  'qqLoginStatus', 'qqLoginCookie', 'qqLogout', 'qqUserPlaylists',
  'youtubeApi', 'youtubeSearch', 'youtubeSongUrl', 'youtubeTrending',
  'youtubeLogin', 'youtubeLogout', 'youtubePlaylists', 'youtubeLikeCheck', 'youtubeLike',
  // ui/youtube
  'loginYouTube', 'searchSourceEnabled', 'toggleSearchSource', 'initSearchSourceToggles',
  'loadYouTubeTrending',
  // splash/init
  'initMineradioSplashWebgl', 'playMineradioIntroSound', 'splashReadyToEnter',
  'splashAnimating', 'splashCanvas', 'splashCtx',
  'splashGl', 'splashGlProgram', 'splashGlBuffer', 'splashGlUniforms',
  'splashW', 'splashH', 'splashDust', 'splashStreaks', 'splashShards',
  'splashPixelRatio', 'splashStartedAt', 'splashSoundPlayed', 'splashAudioCtx',
  'splashSoundFallbackArmed', 'splashTimer', 'reduceSplashMotion',
  'splashClamp01', 'splashSmoothstep', 'splashEaseOutCubic',
  'firstPlayDone', 'prevTime', 'startupVisualPreviewActive',
  'presetTransition', 'DEVELOPMENT_LOCKED_FX', 'isDevelopmentLockedFx', 'normalizeDevelopmentLockedFxState',
];

export function injectWindowGlobals() {
  return {
    name: 'inject-window-globals',
    enforce: 'pre',
    transform(code, id) {
      if (!id.includes('/js/') || !id.endsWith('.js')) return null;
      
      // Filter out globals that are DEFINED in this file (via window.name = ...)
      const definedHere = new Set();
      const defRe = /window\.(\w+)\s*=\s*(?:function|async|class|[{\[('"0-9])/g;
      let m;
      while ((m = defRe.exec(code)) !== null) {
        definedHere.add(m[1]);
      }

      const usedGlobals = KNOWN_GLOBALS.filter(name => {
        if (definedHere.has(name)) return false;
        const re = new RegExp('(?<!window\\.)(?<!\\.)\\b' + name + '\\b(?!\\s*[:=])');
        return re.test(code);
      });

      if (usedGlobals.length === 0) return null;

      const destructure = usedGlobals.map(name => `var ${name} = window.${name};`).join('\n') + '\n';
      return { code: destructure + code, map: null };
    }
  };
}
