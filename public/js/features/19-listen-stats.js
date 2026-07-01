// Listen Statistics / Tracking
// ============================================================
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
window.listenSongSnapshot = function(song) {
  song = song || {};
  return {
    key: queueItemKey(song),
    id: song.id || '',
    mid: song.mid || song.songmid || '',
    mediaMid: song.mediaMid || song.media_mid || '',
    type: song.type || 'song',
    sourceKey: song.source || song.provider || '',
    name: song.name || song.title || '未知歌曲',
    artist: song.artist || '',
    cover: window.songCoverSrc(song, 220) || song.cover || '',
    source: window.songSourceLabel(song),
    provider: song.provider || song.source || song.type || '',
    duration: Number(song.duration) || 0,
  };
}
window.beginListenSession = function(song, context) {
  if (!song) return;
  var snap = window.listenSongSnapshot(song);
  if (!snap.key) return;
  if (window.listenSession && window.listenSession.key !== snap.key) window.finalizeListenSession(false);
  listenSession = {
    key: snap.key,
    song: snap,
    context: context || activeRadioContext || null,
    startedAt: Date.now(),
    lastWallAt: Date.now(),
    lastAudioTime: window.audio && isFinite(window.audio.currentTime) ? window.audio.currentTime : 0,
    listenMs: 0,
    maxProgress: 0,
  };
}
window.updateListenStatsTick = function(force) {
  if (!window.audio || !window.audio.duration || window.audio.paused) return;
  var song = window.currentCoverSong();
  if (!song) return;
  var key = queueItemKey(song);
  if (!window.listenSession || window.listenSession.key !== key) window.beginListenSession(song, activeRadioContext);
  if (!window.listenSession) return;
  var now = Date.now();
  var audioTime = isFinite(window.audio.currentTime) ? window.audio.currentTime : 0;
  var deltaByAudio = Math.max(0, audioTime - (window.listenSession.lastAudioTime || 0)) * 1000;
  var deltaByWall = Math.max(0, now - (window.listenSession.lastWallAt || now));
  var delta = deltaByAudio > 0 ? Math.min(deltaByAudio, deltaByWall || deltaByAudio, 4200) : 0;
  if (force && delta <= 0) delta = Math.min(deltaByWall, 1500);
  if (delta > 0 && delta < 8000) window.listenSession.listenMs += delta;
  window.listenSession.lastWallAt = now;
  window.listenSession.lastAudioTime = audioTime;
  window.listenSession.maxProgress = Math.max(window.listenSession.maxProgress || 0, window.audio.duration ? audioTime / window.audio.duration : 0);
}
window.finalizeListenSession = function(completed) {
  if (!window.listenSession) return;
  window.updateListenStatsTick(true);
  var session = window.listenSession;
  listenSession = null;
  var effective = completed || session.listenMs >= 45000 || session.maxProgress >= 0.5 || (!window.audio || !window.audio.duration ? session.listenMs >= 30000 : false);
  if (!effective) return;
  var now = Date.now();
  var snap = session.song || {};
  var record = {
    key: session.key,
    id: snap.id || '',
    mid: snap.mid || '',
    mediaMid: snap.mediaMid || '',
    type: snap.type || 'song',
    sourceKey: snap.sourceKey || '',
    name: snap.name || '未知歌曲',
    artist: snap.artist || '',
    cover: snap.cover || '',
    source: snap.source || '',
    playedAt: now,
    listenMs: Math.round(session.listenMs),
    completed: !!completed,
    context: session.context || null,
  };
  window.listenStatsState.history = [record].concat((window.listenStatsState.history || []).filter(function(item){ return item && item.key !== record.key; })).slice(0, 180);
  var songStat = window.listenStatsState.songs[record.key] || { key: record.key, name: record.name, artist: record.artist, cover: record.cover, source: record.source, plays: 0, listenMs: 0, completed: 0, lastPlayedAt: 0 };
  songStat.name = record.name;
  songStat.artist = record.artist;
  songStat.cover = record.cover || songStat.cover || '';
  songStat.source = record.source || songStat.source || '';
  songStat.plays += 1;
  songStat.listenMs += record.listenMs;
  songStat.completed += completed ? 1 : 0;
  songStat.lastPlayedAt = now;
  window.listenStatsState.songs[record.key] = songStat;
  String(record.artist || '').split(/\s*\/\s*|\s*,\s*|、|&/).forEach(function(name){
    name = name.trim();
    if (!name) return;
    var artistStat = window.listenStatsState.artists[name] || { name: name, plays: 0, listenMs: 0, lastPlayedAt: 0 };
    artistStat.plays += 1;
    artistStat.listenMs += record.listenMs;
    artistStat.lastPlayedAt = now;
    window.listenStatsState.artists[name] = artistStat;
  });
  window.saveListenStatsState();
  if (emptyHomeActive) renderHomeDiscover();
}
window.mostPlayedSong = function() {
  var list = Object.keys((window.listenStatsState || {}).songs || {}).map(function(key){ return window.listenStatsState.songs[key]; });
  list.sort(function(a, b){ return (b.plays - a.plays) || (b.listenMs - a.listenMs) || (b.lastPlayedAt - a.lastPlayedAt); });
  return list[0] || null;
}
window.topListenArtist = function() {
  var list = Object.keys((window.listenStatsState || {}).artists || {}).map(function(key){ return window.listenStatsState.artists[key]; });
  list.sort(function(a, b){ return (b.plays - a.plays) || (b.listenMs - a.listenMs) || (b.lastPlayedAt - a.lastPlayedAt); });
  return list[0] || null;
}
