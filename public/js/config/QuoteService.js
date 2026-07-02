// ============================================================
//  QuoteService — Strategy pattern with fallback + cache
// ============================================================
(function() {
  var config = window.Mineradio && Mineradio.config;
  if (!config) return;

  var storageGet = (window.Mineradio && Mineradio.util && Mineradio.util.storageGet) || function(){ return null; };
  var storageSet = (window.Mineradio && Mineradio.util && Mineradio.util.storageSet) || function(){};

  // 预置兜底名言
  var fallbacks = config.fallbackQuotes || [];

  // 策略注册中心：根据 lang + style 返回对应的 fetcher
  var strategies = {
    'zh:classic': fetchChinesePoetry,
    'zh:modern':  fetchChineseModern,
    'zh:zen':     fetchChineseModern,
    'en:zen':     fetchEnglishZen,
    'en:modern':  fetchEnglishGeneral,
    'en:classic': fetchEnglishGeneral,
  };

  function pickFallback() {
    return fallbacks.length ? fallbacks[Math.floor(Math.random() * fallbacks.length)] : { text: '—', author: '', source: 'local' };
  }

  // --- Fetchers ---

  async function fetchChinesePoetry() {
    var r = await fetch(config.quoteEndpoints.chinese.poetry, { signal: AbortSignal.timeout(config.quoteEndpoints.timeout) });
    var d = await r.json();
    return { text: d.content || d, author: d.author || '', source: 'jinrishici', category: 'poetry' };
  }

  async function fetchChineseModern() {
    var r = await fetch(config.quoteEndpoints.chinese.modern, { signal: AbortSignal.timeout(config.quoteEndpoints.timeout) });
    var d = await r.json();
    return { text: d.content || d.data || d, author: d.author || '', source: 'xygeng', category: 'modern' };
  }

  async function fetchEnglishZen() {
    var r = await fetch(config.quoteEndpoints.english.zen, { signal: AbortSignal.timeout(config.quoteEndpoints.timeout) });
    var text = await r.text();
    return { text: text.trim(), author: 'GitHub', source: 'github-zen', category: 'zen' };
  }

  async function fetchEnglishGeneral() {
    var r = await fetch(config.quoteEndpoints.english.general, { signal: AbortSignal.timeout(config.quoteEndpoints.timeout) });
    var d = await r.json();
    return { text: d.content, author: d.author || '', source: 'quotable', category: 'general' };
  }

  // --- Public API ---

  window.QuoteService = {
    /** 获取名言，返回 Promise<{text, author, source, category}> */
    fetch: async function(opts) {
      opts = opts || {};
      var lang = opts.lang || 'zh';
      var style = opts.style || 'classic';
      var key = lang + ':' + style;
      var fetcher = strategies[key] || fetchChinesePoetry;

      // 先读缓存
      var cacheKey = 'mineradio-quote-cache';
      var cache = storageGet(cacheKey) || [];
      if (cache.length > 0 && !opts.force) return cache[0];

      try {
        var result = await fetcher();
        if (result && result.text) {
          // 缓存最新 5 条
          cache.unshift(result);
          storageSet(cacheKey, cache.slice(0, 5));
          return result;
        }
      } catch (e) {
        console.warn('[QuoteService] fetch failed, using fallback:', e.message);
      }
      return pickFallback();
    },

    /** 强制刷新（跳过缓存） */
    refresh: function(opts) {
      return this.fetch(Object.assign({}, opts || {}, { force: true }));
    },

    /** 获取本地兜底 */
    fallback: pickFallback,
  };
})();
