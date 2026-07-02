// 19-listen-stats.js — Play counting and listening history
// Extracted from core/api-helper.js

function loadListenStatsState() {
  try {
    var raw = JSON.parse(Mineradio.util.storageGet("mineradio-listen-stats-v1") || "{}") || {};
    window.listenStatsState = { songs: raw.songs || {}, artists: raw.artists || {}, history: raw.history || [], recents: raw.recents || [], lastWriteAt: raw.lastWriteAt || 0 };
    if (!window.listenStatsState.lastWriteAt) window.listenStatsState.lastWriteAt = Date.now();
  } catch (e) {
    window.listenStatsState = { songs: {}, artists: {}, history: [], recents: [], lastWriteAt: Date.now() };
  }
}
function saveListenStatsState() {
  try {
    window.listenStatsState.lastWriteAt = Date.now();
    Mineradio.util.storageSet("mineradio-listen-stats-v1", window.listenStatsState);
  } catch (e) {}
}
function songFromListenRecord(record) {
  if (!record) return null;
  return { id: record.id, name: record.name, artist: record.artist, album: record.album, duration: record.duration, provider: record.provider, cover: record.cover };
}
loadListenStatsState();

// ============================================================
//  Namespace Exports — Mineradio.listenStats
// ============================================================
window.Mineradio = window.Mineradio || {};
Mineradio.listenStats = {
  loadListenStatsState: loadListenStatsState,
  saveListenStatsState: saveListenStatsState,
  songFromListenRecord: songFromListenRecord
};
