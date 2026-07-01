// Second-pass codemod: convert bare references to window.*  
// After Phase 1 converted declarations (var→window.), this converts REFERENCES
// Works for ALL 27 files — replaces known custom globals with window.X inside function bodies
const fs = require('fs'), path = require('path');
const jsDir = path.join(__dirname, '..', 'public', 'js');

// All custom globals (same as KNOWN_GLOBALS from the plugin)
const GLOBALS = [
  'audio','audioCtx','source','analyser','beatAnalyser','gainNode','audioReady',
  'clamp01','clampRange','songProviderKey','openGsapModal','closeGsapModal','bindModalBackdropClose',
  'fxDefaults','VISUAL_PRESET_SCHEMA','PACKAGED_DEFAULT_FX_SNAPSHOT',
  'clonePackagedDefaultFxSnapshot','packagedDefaultLyricLayoutRaw',
  '_audioUrlCache','_prefetchAudioEls','_cacheKeyForSong','_prefetchToken',
  'CUSTOM_COVER_STORE_KEY','CUSTOM_LYRIC_STORE_KEY','CUSTOM_LYRIC_PREF_STORE_KEY',
  'LYRIC_LAYOUT_STORE_KEY','PLAYBACK_QUALITY_STORE_KEY','UPLOAD_TIP_STORE_KEY',
  'DIY_MODE_STORE_KEY','PLAYLIST_PANEL_PIN_STORE_KEY','USER_CAPSULE_AUTO_HIDE_STORE_KEY',
  'FX_FAB_AUTO_HIDE_STORE_KEY','CONTROLS_AUTO_HIDE_STORE_KEY','FREE_CAMERA_STORE_KEY',
  'HOTKEY_SETTINGS_STORE_KEY','VISUAL_GUIDE_SEEN_STORE_KEY','LOCAL_BEATMAP_STORE_KEY',
  'LOCAL_BEAT_PREF_STORE_KEY','LOCAL_BEAT_COMBOS','HOTKEY_ACTIONS',
  'hotkeyCaptureState','hotkeyGlobalStatus','diyPlayerMode',
  'customCoverMap','customLyricMap','customLyricPrefs',
  'readDiyModePreference','readBooleanPreference','readHotkeySettings','getHotkeyDefaults',
  'shelfPinnedOpen','playlistPanelLazyBound',
  'uiSfxCtx','FFT_SIZE','frequencyData','timeDomainData',
  'BEAT_FFT_SIZE','beatFrequencyData','beatTimeDomainData',
  'bass','mid','treble','audioEnergy','beatPulse','prevEnergy',
  'smoothBass','smoothMid','smoothTreb','smoothEnergy',
  'bassPeak','midPeak','treblePeak','energyPeak',
  'beatOnsetFlag','lastStrongDrop',
  'lyricsLines','lyricsVisible','lyricsHasNativeKaraoke','lyricsTimingSource',
  'playlist','playQueue','currentIdx','playing','playToggleBusy',
  'searchMode','podcastResults','podcastPrograms','podcastCurrentRadio',
  'loginStatus','qqLoginStatus','loginProvider','activeAccountProvider','dualAccountMode',
  'qqCookieBusy','neteaseWebLoginBusy','qqWebLoginBusy','qqManualCookieOpen',
  'loginStatusChecked','loginStatusCheckFailed','qrPollTimer','qrKey',
  'volumeTween','trackSwitchToken','audioFadeTimer','audioElementFadeFrame','audioFadeSerial',
  'AUDIO_FADE_IN_MS','AUDIO_FADE_OUT_MS','AUDIO_SILENCE_GAIN',
  'userPlaylists','qqPlaylists','myPodcastCollections','myPodcastItems','playlistCoverCache',
  'targetVolume','lastNonZeroVolume','playbackQuality','fx','playbackVisualPreset',
  'controlsAutoHide','hotkeySettings','immersiveMode','immersiveState',
  'playlistPanelPinned','userCapsuleAutoHide','fxFabAutoHide','fxFabAutoHideRevealArmed',
  'controlGlassRendered','volumePopoverOpen','qualityPopoverOpen','miniQueueOpen',
  'pointerParallax','pointerTarget','renderPowerState','desktopRuntimeState',
  '_lyricOffset','lyricSourceMode',
  'freeCamera','beatCam','idleGuideCanvas','idleGuideW','idleGuideH',
  'idleGuideInteraction','idleGuideAnimationId',
  'apiJson','escHtml','normalizePlaybackQuality','playbackQualityLabel',
  'playbackQualityShortLabel','playbackQualityRank','playbackQualityWasDowngraded',
  'playbackBitrateLabel','playbackResolvedQualityText',
  'readPlaybackQualityPreference','savePlaybackQualityPreference',
  'updatePlaybackQualityUi','setPlaybackQuality','canReloadCurrentTrackForQuality',
  'applyPlaybackQualityToCurrentTrack','toggleQualityPanel','bindQualityControl','isTypingTarget',
  'currentCoverSong','songDurationLabel','songSourceLabel','detailRow',
  'currentArtistNames','normalizeArtistNameForMatch','artistNameMatches',
  'currentArtistId','currentQQArtistMid',
  'commentTimeLabel','renderDetailComments','renderArtistSongList',
  'playArtistDetailSong','collectArtistDetailSong','queueArtistDetailSongNext',
  'bindTrackDetailScrollers','closeTrackDetailModal','openTrackDetailModal',
  'openArtistDetailForSong','resolveArtistSongForDetail',
  'readCustomLyricMap','saveCustomLyricMap','readCustomLyricPrefs','saveCustomLyricPrefs',
  'songCustomLyricKey','currentLyricSong','getCustomLyricEntry','hasCustomLyricForSong',
  'cloneLyricLine','cloneLyricLines','setOriginalLyricsState','applyLyricsState',
  'applyOriginalLyricsState','parseCustomLyricText','applyCustomLyricState',
  'preferredLyricSourceForSong','applyPreferredLyricsForCurrent',
  'setLyricSourceMode','updateCustomLyricControls','setCustomLyricStatus',
  'openCustomLyricModal','closeCustomLyricModal','saveCustomLyricForCurrent','deleteCustomLyricForCurrent',
  'cloneSong','avatarSrc',
  'readCustomCoverMap','saveCustomCoverMap','isInlineCoverSrc','isProxyableCoverUrl',
  'coverProxySrc','coverUrlWithSize','songCustomCoverKey','getCustomCoverForSong',
  'hydrateCustomCover','songCoverSrc','cssImageUrl',
  'setCustomCoverForCurrent','updateCustomCoverButton','clearCustomCoverForCurrent',
  'isCloudSong','isSongLiked','ensureLoggedInForAction','updateLikeButtons',
  'heartIconSvg','playlistPlusIconSvg','artistCollectTrayIconSvg','artistNextPlusIconSvg',
  'songActionHtml','syncLikeStatusForSongs','syncLikeStatusForSong',
  'isLikedPlaylistContext','markSongsLiked','refreshSearchResultActionStates',
  'toggleLikeSong','toggleLikeCurrent','toggleLikeSearchResult','toggleLikeQueueIndex','toggleLikeDetailSong',
  'openCollectModal','openCollectModalForCurrent','collectSearchResult','collectQueueIndex',
  'collectDetailSong','closeCollectModal','renderCollectModal','setCollectBusyPid',
  'createPlaylistFromCollect','collectResultMessage','verifySongInPlaylist','addCollectTargetToPlaylist',
  'setHomeArt','compactHomeCount','loadListenStatsState','saveListenStatsState',
  'listenSongSnapshot','beginListenSession','updateListenStatsTick','finalizeListenSession',
  'mostPlayedSong','topListenArtist','homeListenSummary','listenStatsState','listenSession',
  'searchTimer','searchRequestSeq','searchLastResultQuery','SEARCH_HISTORY_STORE_KEY',
  'queueViewTab','queuePanelDirty','queueRenderSeq','miniQueueRenderSeq','playlistRefreshSeq',
  'smoothWheelScrollBound','controlsHovering','controlsHideTimer',
  'renderSearchResults','safeRenderQueuePanel','safeRenderMiniQueuePanel',
  'forcePlaybackControlsInteractive','scheduleControlsHide',
  'togglePlaylistPanel','switchPlaylistTab','refreshUserPlaylists',
  'cyclePlayMode','shuffleQueue','clearQueue','toggleImmersiveMode','toggleFullscreen',
  'playMode','playModeLabel','playModeIcon',
  'showLoginModal','closeLoginModal','setLoginProvider','updateLoginProviderUi',
  'openQQWebLogin','openNeteaseWebLogin','openProviderWebLogin','openProviderLogin',
  'refreshQQLoginStatus','submitQQCookieLogin','toggleQQCookiePanel',
  'hasAnyPlatformLogin','hasPlatformLogin','platformMeta','platformStatus',
  'showUserModal','closeUserModal','logoutActiveAccount',
  'LOCAL_PLAYLIST_STORAGE_KEY','loadLocalPlaylists','saveLocalPlaylists',
  'createLocalPlaylist','deleteLocalPlaylist','getLocalLikedSongs','toStandardSongs',
  'playLocalPlaylistSongs','showLocalPlaylistDetail','hideLocalPlaylistDetail',
  'localDetailPlaylistId','localDetailSongs','renderLocalPlaylistsIntoView',
  'playlistPanelDetailState','playlistPanelKey','playlistPanelDetailHtml',
  'renderUserPlaylistsList','loadPlaylistIntoQueueById',
  'shouldHandleIdleGuidePointer','idleGuidePointerMove','visualGuideActive',
  'showToast','showSourceFallbackNotice','closeSourceFallbackNotice',
  'closeVisualGuide','applyDiyMode','toggleDiyMode','syncDiyModeButton','isDiyMode',
  'updateDesktopRuntimeState','installRenderPowerHooks',
  'playQueueAt','togglePlay','nextTrack','prevTrack','queueSong','queueSongNext',
  'playSearchResult','setPlayIcon','cancelBeatAnalysisTimer','cancelBeatPrefetchTimer',
  'cancelLocalBeatAnalysis','beatMapSongKey','beatMapToken',
  'localBeatAnalysis','localBeatMapCache','localBeatMapPrefs','djMode','beatMapCache',
  'currentBeatMap','beatMapNextIdx','beatMapBusy',
  'pauseCurrentAudioForTrackSwitch','fadeOutAndPauseAudio','attemptAudioPlay',
  'safePlaybackStep','markRenderInteraction','showLoading','hideLoading',
  'safeShelfRebuild','fetchLyric','renderLyrics','toggleLyricsPanel',
  '_lyricSources','_lyricSourceLabels','_lyricSourceIdx','_lyricOffsetToastTimer',
  '_saveLyricOffset','_loadLyricOffset','updateLyricOffsetVisibility','showLyricOffsetToast',
  'cycleLyricSource','setLyricSource','adjustLyricOffset','adjustPlaybackSpeed',
  'updateMiniSourceBar','updateMiniSourceButtons',
  'scene','camera','renderer','uniforms','particlePointerFrame',
  'shelfManager','makeShelfManager','scheduleShelfRebuild','safeShelfCloseContent',
  'compactCount','shelfAccentHex','shelfAccentRgba','shelfPane','setShelfPinnedOpen',
  'shelfAlwaysVisible','stageLyrics','readSavedLyricLayout','normalizeHexColor',
  'normalizeShelfCameraMode','shelfDefaultAngleForCameraMode','normalizeCoverResolution',
  'normalizeLyricFontKey','normalizeDesktopLyricsFps',
  'normalizePerformanceBackgroundMode','normalizePerformanceQuality',
  'coverParticleGridForResolution','coverTextureSizeForResolution','makeDotTexture',
  'neteaseSearch','neteaseSongUrl','neteasePlaylistTracks',
  'neteaseLoginQrKey','neteaseLoginQrCreate','neteaseLoginQrCheck',
  'neteaseLoginStatus','neteaseUserPlaylists','neteaseLyric','neteaseLyricSearch',
  'neteaseLike','neteaseLikeCheck','neteasePlaylistCreate','neteasePlaylistAddSong',
  'neteaseDiscoverHome','neteaseWeatherIpLocation','neteaseBeatmapCacheStatus',
  'neteaseBeatmapCacheGet','neteaseUpdateLatest',
  'neteasePodcastHot','neteasePodcastSearch','neteasePodcastPrograms',
  'neteasePodcastMy','neteasePodcastMyItems','neteaseLoginCookie',
  'qqApi','qqSearch','qqSongUrl','qqPlaylistTracks','qqLoginStatus','qqLoginCookie',
  'qqLogout','qqUserPlaylists','youtubeApi','youtubeSearch','youtubeSongUrl',
  'youtubeTrending','youtubeLogin','youtubeLogout','youtubePlaylists',
  'youtubeLikeCheck','youtubeLike',
  'loginYouTube','searchSourceEnabled','toggleSearchSource','initSearchSourceToggles',
  'loadYouTubeTrending',
  'initMineradioSplashWebgl','playMineradioIntroSound','splashReadyToEnter',
  'splashAnimating','splashCanvas','splashCtx',
  'firstPlayDone','prevTime','startupVisualPreviewActive','presetTransition',
  'DEVELOPMENT_LOCKED_FX','isDevelopmentLockedFx','normalizeDevelopmentLockedFxState',
].filter((v, i, a) => a.indexOf(v) === i); // dedup
GLOBALS.sort((a, b) => b.length - a.length); // sort by length (longest first to avoid partial matches)

function walkDir(dir, files = []) {
  fs.readdirSync(dir, { withFileTypes: true }).forEach(e => {
    if (e.isDirectory()) walkDir(path.join(dir, e.name), files);
    else if (e.name.endsWith('.js')) files.push(path.join(dir, e.name));
  });
  return files;
}

const jsFiles = walkDir(jsDir);
let totalChanges = 0;

jsFiles.forEach(filePath => {
  let content = fs.readFileSync(filePath, 'utf8');
  let changes = 0;

  GLOBALS.forEach(name => {
    // Replace bare references (not preceded by . or window.) with window.NAME
    // But NOT when it's on the left side of = or : (declarations)
    // and NOT when it's inside a string
    const re = new RegExp(
      '(?<!\\.)(?<!window\\.)' +  // not preceded by . or window.
      '\\b' + name + '\\b' +      // word boundary + name + word boundary
      '(?!\\s*[=:])',             // not followed by = or : (declaration)
      'g'
    );
    
    const newContent = content.replace(re, (match, offset) => {
      // Don't replace inside strings or comments
      const lineStart = content.lastIndexOf('\n', offset) + 1;
      const prefix = content.slice(lineStart, offset);
      if (/\/\//.test(prefix) || /['"`]/.test(prefix.split(/\/\/|['"`]/).pop() || '')) return match;
      changes++;
      return 'window.' + match;
    });
    
    if (newContent !== content) {
      content = newContent;
    }
  });

  if (changes > 0) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`  ${path.relative(jsDir, filePath)}: ${changes} references`);
    totalChanges += changes;
  }
});

console.log(`\nTotal: ${totalChanges} reference changes across ${jsFiles.length} files`);
