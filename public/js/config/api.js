// ============================================================
//  API Endpoints & Keys — centralized config
// ============================================================
window.Mineradio = window.Mineradio || {};
window.Mineradio.config = window.Mineradio.config || {};

// 名言 API 端点
Mineradio.config.quoteEndpoints = {
  // 中文
  chinese: {
    poetry: 'https://v1.jinrishici.com/all.json',         // 古诗词·一言
    modern: 'https://api.xygeng.cn/one',                   // 一言·现代
  },
  // 英文
  english: {
    zen: 'https://api.github.com/zen',                     // GitHub Zen (返回纯文本)
    general: 'https://api.quotable.io/random?maxLength=120', // Quotable
  },
  // 超时 (ms)
  timeout: 5000,
};

// 本地兜底名言库
Mineradio.config.fallbackQuotes = [
  { text: '音乐是灵魂的语言', author: '尼采', source: 'local', category: 'classic' },
  { text: '生活不仅是活着，还要活出色彩', author: '罗曼·罗兰', source: 'local', category: 'modern' },
  { text: 'Less is more', author: 'Ludwig Mies van der Rohe', source: 'local', category: 'zen' },
  { text: '山重水复疑无路，柳暗花明又一村', author: '陆游', source: 'local', category: 'poetry' },
  { text: 'Stay hungry, stay foolish', author: 'Steve Jobs', source: 'local', category: 'zen' },
  { text: '世界那么大，我想去看看', author: '顾少强', source: 'local', category: 'modern' },
  { text: '海内存知己，天涯若比邻', author: '王勃', source: 'local', category: 'poetry' },
  { text: 'The only way to do great work is to love what you do', author: 'Steve Jobs', source: 'local', category: 'zen' },
  { text: '长风破浪会有时，直挂云帆济沧海', author: '李白', source: 'local', category: 'poetry' },
  { text: '人生如逆旅，我亦是行人', author: '苏轼', source: 'local', category: 'poetry' },
  { text: '知行合一', author: '王阳明', source: 'local', category: 'classic' },
  { text: 'Simplicity is the ultimate sophistication', author: 'Leonardo da Vinci', source: 'local', category: 'zen' },
];

// 布局模式
Mineradio.config.layoutModes = {
  AUTO: 'auto',
  SIDE: 'side',      // 左右布局
  STACK: 'stack',    // 上下堆叠
};

// 默认设置
Mineradio.config.defaults = {
  layoutMode: 'auto',
  quoteLang: 'zh',
  quoteStyle: 'classic',
};
