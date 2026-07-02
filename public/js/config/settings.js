// ============================================================
//  Settings — layout mode + quote preferences (IPC-persisted)
// ============================================================
(function() {
  var config = window.Mineradio && Mineradio.config;
  if (!config) return;

  var defaults = config.defaults || {};
  var api = window.desktopWindow || window.api || {};

  // 当前设置（内存快照）
  var current = {};

  // 异步初始化
  async function init() {
    try {
      var res = await api.getSetting && api.getSetting(null);
      if (res && res.value) current = res.value;
    } catch (e) {}
    // 合入默认值
    Object.keys(defaults).forEach(function(k) {
      if (current[k] == null) current[k] = defaults[k];
    });
    applyLayoutMode(current.layoutMode || defaults.layoutMode);
    return current;
  }

  // 获取单值
  function get(key) {
    return key ? current[key] : current;
  }

  // 设置单值并持久化
  async function set(key, value) {
    current[key] = value;
    try { await api.setSetting && api.setSetting(key, value); } catch (e) {}
    // 布局变化立即应用
    if (key === 'layoutMode') applyLayoutMode(value);
    // 名言变化通知 QuoteService（如果用户重新打开页面会使用新配置）
    if (key === 'quoteLang' || key === 'quoteStyle') {
      if (window.QuoteService) window.QuoteService._configChanged = true;
    }
    return true;
  }

  // 应用布局模式到 DOM
  function applyLayoutMode(mode) {
    var el = document.getElementById('empty-home');
    if (!el) return;
    // auto → 不移除 data-layout（CSS 用 :not([data-layout]) 处理）
    if (mode === 'auto') {
      el.removeAttribute('data-layout');
    } else {
      el.setAttribute('data-layout', mode);
    }
  }

  // 暴露全局
  window.Mineradio = window.Mineradio || {};
  Mineradio.settings = {
    init: init,
    get: get,
    set: set,
    applyLayoutMode: applyLayoutMode,
  };

  // DOMContentLoaded 后自动初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() { init(); });
  } else {
    init();
  }
})();
