window.Mineradio = window.Mineradio || {};
window.Mineradio.platforms = window.Mineradio.platforms || {};

try {
  window.Mineradio.platforms.neteaseUI = {};
} catch(e) {
  console.warn('Netease UI stub failed:', e.message);
  window.Mineradio.platforms.neteaseUI = null;
}
