# Mineradio Isolation + Migration Plan

## 目标
1. 添加 Event Bus 基础设施
2. 将全局函数（`neteaseSearch()`）迁移到命名空间（`Mineradio.platforms.netease.search()`）
3. 逐步删除旧的全局函数

**规则**：Namespace 用于 request-response（API 调用，需要返回值）。Event Bus 用于 fire-and-forget（跨模块通知，发送方不需要返回值）。

## 调用方清单（48 处，11 个文件，v5 实际审计）

### 分类 A：迁移到 namespace（43 处，保留返回值）

| 调用方 | 文件（v3 路径） | 迁移目标 |
|--------|----------------|---------|
| `neteaseSearch()` | features/11-search.js | `Mineradio.platforms.netease.search()` |
| `qqSearch()` | features/11-search.js | `Mineradio.platforms.qq.search()` |
| `youtubeSearch()` | features/11-search.js | `Mineradio.platforms.youtube.search()` |
| `neteasePodcastHot/Search/Programs()` | features/11-search.js | `Mineradio.platforms.netease.podcast*()` |
| `neteaseUserPlaylists()` | ui/32-controls.js | `Mineradio.platforms.netease.userPlaylists()` |
| `neteasePodcastMy()` | ui/32-controls.js | `Mineradio.platforms.netease.podcastMy()` |
| `qqUserPlaylists()` | ui/32-controls.js | `Mineradio.platforms.qq.userPlaylists()` |
| `neteaseSongUrl()` | features/12-playback.js | `Mineradio.platforms.netease.songUrl()` |
| `qqSongUrl()` | features/12-playback.js | `Mineradio.platforms.qq.songUrl()` |
| `youtubeSongUrl()` | features/12-playback.js | `Mineradio.platforms.youtube.songUrl()` |
| `neteaseSongUrl()` | state/06-beat-analysis.js | `Mineradio.platforms.netease.songUrl()` |
| `qqSongUrl()` | state/06-beat-analysis.js | `Mineradio.platforms.qq.songUrl()` |
| `neteaseBeatmapCacheStatus/Get()` | state/06-beat-analysis.js | `Mineradio.platforms.netease.beatmapCache*()` |
| `neteaseLike/LikeCheck()` | features/15-like.js | `Mineradio.platforms.netease.like/likeCheck()` |
| `neteasePlaylistCreate/Tracks()` | features/16-collect.js | `Mineradio.platforms.netease.playlist*()` |
| `neteaseLoginStatus/QrKey/QrCreate/QrCheck()` | ui/30-login.js | `Mineradio.platforms.netease.login*()` |
| `qqLogout()` | ui/30-login.js | `Mineradio.platforms.qq.logout()` |
| `qqLoginStatus()` | ui/30-login.js | `Mineradio.platforms.qq.loginStatus()` |
| `neteasePlaylistTracks()` | visual/22-shelf.js | `Mineradio.platforms.netease.playlistTracks()` |
| `qqPlaylistTracks()` | visual/22-shelf.js | `Mineradio.platforms.qq.playlistTracks()` |
| `neteasePodcastMyItems()` | visual/22-shelf.js | `Mineradio.platforms.netease.podcastMyItems()` |
| `neteasePlaylistTracks()` | ui/33-playlists.js | `Mineradio.platforms.netease.playlistTracks()` |
| `qqPlaylistTracks()` | ui/33-playlists.js | `Mineradio.platforms.qq.playlistTracks()` |
| `neteasePodcastMyItems/Programs()` | ui/33-playlists.js | `Mineradio.platforms.netease.podcast*()` |
| `neteaseUpdateLatest()` | ui/33-playlists.js | `Mineradio.platforms.netease.updateLatest()` |
| `neteaseDiscoverHome()` | features/14-discover.js | `Mineradio.platforms.netease.discoverHome()` |
| `neteaseWeatherIpLocation()` | features/14-discover.js | `Mineradio.platforms.netease.weatherIpLocation()` |
| `youtubeTrending()` | platforms/youtube-ui.js | `Mineradio.platforms.youtube.trending()` |

**小计**：43 处 → 改 namespace（11 文件）

### 分类 B：迁移到 Event Bus（5 处，fire-and-forget）

| 当前写法 | 改为 | 监听方 |
|---------|------|--------|
| 切歌后直接调歌词加载、封面更新 | `bus.emit('player:trackchange', { song, token })` | 歌词、封面 |
| 播放/暂停后更新 UI 按钮状态 | `bus.emit('player:statechange', { playing })` | 登录提示 |
| 登录后各处查登录状态 | `bus.emit('login:statechange', status)` | 搜索源切换、歌单刷新 |

## Event Bus 迁移清单（5 处旧调用 + 未来新功能）

### 迁移 5 处旧调用到事件驱动

| 事件 | 触发方 | 监听方 | 说明 |
|------|--------|--------|------|
| `player:trackchange` | `features/12-playback.js` 切歌时 | `features/13-lyrics.js` 加载歌词、封面模块更新封面 | event 含 `{ song, token }` |
| `player:statechange` | `features/12-playback.js` 播放/暂停 | `ui/30-login.js` 更新登录提示状态 | 只有 login.js 消费 `playing` 状态，console.js 不需要 |
| `login:statechange` | `ui/30-login.js` 登录/登出 | `ui/33-playlists.js` 刷新歌单、`ui/32-controls.js` 更新搜索源 | 替换直接调 `refreshUserPlaylists()` |
| `queue:change` | `features/12-playback.js` 队列操作 | `ui/32-controls.js` 刷新队列面板、`visual/22-shelf.js` 刷新歌单架 | 替换 6+ 处 `safeRenderQueuePanel`+`safeShelfRebuild` |
| `like:toggle` | `features/15-like.js` 点赞/取消 | `ui/32-controls.js` 刷新队列面板、`features/11-search.js` 刷新搜索结果按钮 | 乐观+最终两阶段 `{ song, liked, phase }` |

### Event Bus 事件清单（含预留）

| 事件名 | 触发方 | 监听方（现在+未来） |
|--------|--------|-------------------|
| `player:trackchange` | playback.js | 歌词、封面、推荐、desktop overlay |
| `player:statechange` | playback.js | 播放按钮、mini bar、desktop 同步 |
| `login:statechange` | login.js | 搜索源切换、用户菜单 |
| `queue:change` | playback.js | 队列面板、歌单架、desktop 同步 |
| `like:toggle` | like.js | 队列面板、搜索结果按钮 |

当前**确定迁移 5 处**：player:trackchange、player:statechange、login:statechange、queue:change、like:toggle。

以下候选事件经 Oracle review 评估后**跳过或推迟**：

| 事件 | 触发方 | 结论 | 理由 |
|------|--------|------|------|
| `preset:change` | visual/20-three-core.js setPreset | ❌ 跳过 | preset 是变量读取，不在 render loop 外触发，加事件徒增开销 |
| `fx:controlchange` | ui/31-console.js bindFxPanel | ⏳ 推迟 | toggleFx 本身需要独立重构，非本 plan 范围 |
| `desktopLyrics:toggle` | app/41-desktop-overlay.js | ❌ 跳过 | 监听方太少，不值得 |
| `search:modechange` | ui/32-controls.js setSearchMode | ❌ 跳过 | 基本是 intra-file |
| `fullscreen:change` | app/41-desktop-overlay.js | ❌ 跳过 | 由 Electron 原生事件处理 |

## 执行步骤

### Step 1 — 预检查（10 min）

```
node --check public/js/infra/*.js public/js/state/*.js public/js/platforms/*.js public/js/features/*.js public/js/visual/*.js public/js/ui/*.js public/js/app/*.js
```

1. 确认所有 33 个 v5 文件通过 `node --check`
2. 确认 `index.html` 中脚本加载顺序正确（infra → state → platforms → features → visual → ui → app）
3. 确认 `window.Mineradio` 全局 namespace 存在（如没有则在 `infra/00-utils.js` 顶部加一行 `window.Mineradio = window.Mineradio || {};`）

### Step 2 — onerror 加载失败检测（index.html，2 min）

在 `index.html` 中 3 个 platform 文件的 `<script>` 标签上添加 `onerror` 属性：

```html
<script src="js/platforms/netease.js?v=17" onerror="console.error('[load] netease.js FAILED — platform APIs unavailable')"></script>
<script src="js/platforms/qq.js?v=17" onerror="console.error('[load] qq.js FAILED — platform APIs unavailable')"></script>
<script src="js/platforms/youtube.js?v=17" onerror="console.error('[load] youtube.js FAILED — platform APIs unavailable')"></script>
```

**作用**：如果某个 platform 文件因网络/打包错误加载失败，onerror 会在控制台明确标记。这比静默失败容易排查。

**注意**：不会影响 Step 4 的自动生成循环——Step 4 仍然操作 `window[fnName] = fn`，两者无冲突。

### Step 3 — Event Bus（新文件 js/infra/03-bus.js，10 min）

在 `index.html` 中 `<script src="js/infra/02-storage.js?v=13"></script>` 之后添加：
```html
<script src="js/infra/03-bus.js?v=1"></script>
```
（确保 bus 在 `state/04-state.js` 及后续模块之前加载。）

`js/infra/03-bus.js` 内容：

```js
window.Mineradio = window.Mineradio || {};
window.Mineradio.bus = {
  _listeners: {},
  _log: [],
  on: function(name, fn) {
    (this._listeners[name] = this._listeners[name] || []).push(fn);
  },
  emit: function(name, data) {
    if (window.Mineradio.debug) console.log('[bus]', name, data);
    this._log.push({ name: name, data: data, at: Date.now() });
    if (this._log.length > 1000) this._log.splice(0, 200);
    (this._listeners[name] || []).forEach(function(fn) {
      try { fn(data); } catch(e) { console.warn('[bus] ' + name, e.message); }
    });
  },
  getLog: function() { return this._log.slice(); }
};
```

### Step 4 — 修改自动生成循环，同时写 window + namespace（15 min，3 个 platform 文件）

不要追加单独的 namespace 块。直接在**现有的自动生成循环**里加一行 namespace 赋值。

**当前代码**（netease.js, qq.js, youtube.js 里都类似）：
```js
for (var i = 0; i < xxxAPIList.length; i++) {
  (function(entry) {
    // ... 生成函数 fn ...
    window[fnName] = fn;                          // 只写了 window
  })(xxxAPIList[i]);
}
```

**改为**：
```js
window.Mineradio.platforms = window.Mineradio.platforms || {};
// 初始化命名空间对象
var platformName = 'netease'; // 每个文件对应: 'netease', 'qq', 'youtube'
window.Mineradio.platforms[platformName] = {};

for (var i = 0; i < xxxAPIList.length; i++) {
  (function(entry) {
    // ... 生成函数 fn ...
    window[fnName] = fn;                          // ← 保留，迁移期间需要
    // 同时写 namespace
    var key = entry.name.charAt(0).toLowerCase() + entry.name.slice(1);
    window.Mineradio.platforms[platformName][key] = fn;  // ← 新增
  })(xxxAPIList[i]);
}
```

**关键**：window 和 namespace 同时写，迁移期间两套都可用。Step 9 只删 `window[fnName] = fn`，保留 namespace 赋值。

### Step 5 — 迁移调用方到 namespace（43 处，11 文件，按文件分批）

**Batch A**（2 文件，4 处）：
- `features/15-like.js` — `neteaseLike` → `Mineradio.platforms.netease.like()`，`neteaseLikeCheck` → `Mineradio.platforms.netease.likeCheck()`
- `features/16-collect.js` — `neteasePlaylistCreate` → `Mineradio.platforms.netease.playlistCreate()`，`neteasePlaylistTracks` → `Mineradio.platforms.netease.playlistTracks()`

**Batch B**（3 文件，10 处）：
- `features/12-playback.js` — songUrl 4 处
- `state/06-beat-analysis.js` — songUrl 2 处 + beatmapCache 2 处
- `features/14-discover.js` — discoverHome + weatherIpLocation 2 处

**Batch C**（2 文件，12 处）：
- `features/11-search.js` — search(6) + podcast(3) = 9 处
- `ui/32-controls.js` — userPlaylists(1) + podcastMy(1) + qqUserPlaylists(1) = 3 处

**Batch D（namespace）**（4 文件，17 处）：
- `ui/30-login.js` — loginQrKey/Create/Check/Status(4) + qqLogout(1) + qqLoginStatus(1) = 6 处
- `ui/33-playlists.js` — playlistTracks(4) + podcast(2) + updateLatest(1) = 7 处
- `visual/22-shelf.js` — playlistTracks(2) + podcastMyItems(1) = 3 处
- `platforms/youtube-ui.js` — youtubeTrending(1) = 1 处

每批改完立即测试该模块功能。

### Step 6 — Event Bus 迁移（Batch E，5 事件，~1 h）

**Batch E（Event Bus）**（5 事件，~57 行）：
- `features/12-playback.js` — emit: player:trackchange + player:statechange + queue:change
- `features/15-like.js` — emit: like:toggle（optimistic + final 两阶段）
- `ui/30-login.js` — emit: login:statechange
- `features/13-lyrics.js` — bus.on('player:trackchange')
- 封面模块 — bus.on('player:trackchange')
- `ui/32-controls.js` — bus.on('queue:change') + bus.on('like:toggle')
- `visual/22-shelf.js` — bus.on('queue:change')

每批改完立即测试该模块功能。

### Step 7 — 全局 grep 确认无遗漏

**注意**：每批改完**立即**测试该模块功能（不等到 Step 7）。Step 7 是全量最终确认。

迁移完成后，在所有 JS 文件中搜索旧函数名：
```
grep -rnE "\b(netease|qq|youtube)[A-Z][a-zA-Z]+\(" public/js/
```
如果还有匹配（排除 platform 文件中的定义行），说明有遗漏，补修。

### Step 8 — animate 拆分（app/42-app.js，2-4 h）

`animate()` 函数目前位于 `app/42-app.js`，是 300+ 行的单体函数，包含：
- 音频分析（getByteFrequencyData、音量计算、能量检测）
- 节拍检测（能量差分、峰值检测）
- 粒子系统同步（three.js 粒子位置/颜色随音乐变化）
- 3D 摄像机/歌单架/歌词 DOM 更新
- requestAnimationFrame 循环协调
- 性能监控（FPS 统计）

**拆分方案**（新建 2 个文件，原文件保留协调逻辑）：

**8a. 新建 `state/07-audio-analyzer.js`（40 min）**
```js
// 音频分析模块：只读 state，不涉及 DOM 或 three.js
window.Mineradio.audio = window.Mineradio.audio || {};
window.Mineradio.audio.analyzer = {
  _analyser: null,
  _dataArray: null,
  init: function(analyserNode) {
    this._analyser = analyserNode;
    this._dataArray = new Uint8Array(analyserNode.frequencyBinCount);
  },
  getFrequencyData: function() {
    this._analyser.getByteFrequencyData(this._dataArray);
    return this._dataArray;
  },
  getVolume: function() {
    var data = this.getFrequencyData();
    var sum = 0;
    for (var i = 0; i < data.length; i++) sum += data[i];
    return sum / data.length / 256;
  },
  detectBeat: function(threshold) {
    // 能量差分节拍检测
    var energy = this.getVolume();
    var beat = energy > threshold;
    return { energy: energy, beat: beat };
  }
};
```
从原 `animate()` 中提取音频分析逻辑到此模块。原函数调用 `window.Mineradio.audio.analyzer.getFrequencyData()` 等。

**8b. 新建 `visual/25-music-sync.js`（40 min）**
```js
// 音乐同步模块：将音频数据映射到粒子/视觉参数
window.Mineradio.visual = window.Mineradio.visual || {};
window.Mineradio.visual.musicSync = {
  updateParticles: function(audioData, preset) {
    // 从 audioData 计算粒子速度/大小/颜色
    // 根据 preset 选择映射策略
    // ... 从原 animate 中对应逻辑提取 ...
  },
  updateCamera: function(audioData) {
    // 根据音量/频率更新摄像机位置/旋转
    // ... 从原 animate 中对应逻辑提取 ...
  }
};
```
从原 `animate()` 中提取粒子同步和摄像机响应逻辑到此模块。

**8c. 精简 `app/42-app.js` 中的 `animate()`（40 min）**
原 `animate()` 简化为循环协调器：
```js
function animate() {
  requestAnimationFrame(animate);
  var audioData = window.Mineradio.audio.analyzer.getFrequencyData();
  var volume = window.Mineradio.audio.analyzer.getVolume();
  var beatInfo = window.Mineradio.audio.analyzer.detectBeat(volume > 0.15 ? 0.6 : 0.4);
  // 更新粒子
  window.Mineradio.visual.musicSync.updateParticles(audioData, fx.preset);
  // 更新摄像机
  window.Mineradio.visual.musicSync.updateCamera(audioData);
  // 更新 DOM（歌词/播放进度等留在原函数）
  // ... 保留原有的歌词/进度 DOM 更新逻辑 ...
  renderer.render(scene, camera);
}
```

**8d. 加载顺序 & 验证**（10 min）
- `index.html` 中添加 `<script src="js/state/07-audio-analyzer.js?v=1"></script>` 和 `<script src="js/visual/25-music-sync.js?v=1"></script>`
- 确认加载顺序：`infra → state/04-state → state/07-audio-analyzer → platforms → features → visual/25-music-sync → app/42-app`
- `node --check public/js/state/07-audio-analyzer.js public/js/visual/25-music-sync.js`
- 打开 Electron 验证 3D 粒子/歌单架/歌词正常运动

### Step 9 — 清理（10 min）
删除 platform 自动生成循环中的 `window[fnName] = fn;`，保留 namespace 赋值：
```js
// 删除这行:
// window[fnName] = fn;
// 保留这行:
window.Mineradio.platforms[platformName][key] = fn;
```
同时确认 `window.Mineradio.bus` 和 `window.Mineradio.platforms` 在最终代码中无死引用。

## 工作量估算

| Step | 内容 | 时间 |
|------|------|------|
| 1 | 预检查（node --check + index.html 加载顺序） | 10 min |
| 2 | onerror 加载失败检测（index.html） | 2 min |
| 3 | Event Bus | 10 min |
| 4 | 修改自动生成循环（同时写 window + namespace） | 15 min |
| 5 | 迁移 43 处调用方到 namespace（Batch A-D） | 5.5-7.5 h |
| 6 | 迁移 5 处旧调用到 Event Bus（Batch E） | 1 h |
| 7 | 全局 grep 确认无遗漏 | 5 min |
| 8 | animate 拆分 | 2-4 h |
| 9 | 删除 window 全局函数 | 10 min |
| **总计** | | **10-15 h** |

## 不做的
- ~~旧调用方改成 Event Bus~~ — 等以后确定有多个监听方时再改
- ~~IIFE 包裹~~ — v2 已证明不可行
