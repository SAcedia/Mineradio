window.Mineradio = window.Mineradio || {};
window.Mineradio.platforms = window.Mineradio.platforms || {};

try {
  window.Mineradio.platforms.qqUI = {};
} catch(e) {
  console.warn('QQ UI stub failed:', e.message);
  window.Mineradio.platforms.qqUI = null;
}
