# Mineradio Isolation + Migration Plan

## 目标
1. 添加 Event Bus 基础设施
2. 将全局函数（`neteaseSearch()`）迁移到命名空间（`Mineradio.platforms.netease.search()`）
3. 逐步删除旧的全局函数

## 调用方清单（42 处，11 个文件，Oracle 修订版）

### 分类 A：迁移到 namespace（39 处，保留返回值）

| 调用方 | 文件（v3 路径） | 迁移目标 |
|--------|----------------|---------|
| `neteaseSearch()` | ui/32-controls.js | `Mineradio.platforms.netease.search()` |
| `qqSearch()` | ui/32-controls.js | `Mineradio.platforms.qq.search()` |
| `youtubeSearch()` | ui/32-controls.js | `Mineradio.platforms.youtube.search()` |
| `neteaseUserPlaylists()` | ui/32-controls.js | `Mineradio.platforms.netease.userPlaylists()` |
| `neteasePodcastHot/Search/Programs/My()` | ui/32-controls.js | `Mineradio.platforms.netease.podcast*()` |
| `neteaseSongUrl()` | features/12-playback.js | `Mineradio.platforms.netease.songUrl()` |
| `qqSongUrl()` | features/12-playback.js | `Mineradio.platforms.qq.songUrl()` |
| `youtubeSongUrl()` | features/12-playback.js | `Mineradio.platforms.youtube.songUrl()` |
| `neteaseSongUrl()` | state/06-beat-analysis.js | `Mineradio.platforms.netease.songUrl()` |
| `qqSongUrl()` | state/06-beat-analysis.js | `Mineradio.platforms.qq.songUrl()` |
| `neteaseBeatmapCacheStatus/Get()` | state/06-beat-analysis.js | `Mineradio.platforms.netease.beatmapCache*()` |
| `neteaseLike/LikeCheck()` | features/15-like.js | `Mineradio.platforms.netease.like/likeCheck()` |
| `neteasePlaylist*()` | features/16-collect.js | `Mineradio.platforms.netease.playlist*()` |
| `neteaseLogin*()` | ui/30-login.js | `Mineradio.platforms.netease.login*()` |
| `neteasePlaylistTracks()` | visual/22-shelf.js | `Mineradio.platforms.netease.playlistTracks()` |
| `qqPlaylistTracks()` | visual/22-shelf.js | `Mineradio.platforms.qq.playlistTracks()` |
| `neteasePodcastMyItems/Programs()` | ui/33-playlists.js | `Mineradio.platforms.netease.podcast*()` |
| `neteasePlaylistTracks()` | ui/33-playlists.js | `Mineradio.platforms.netease.playlistTracks()` |
| `qqPlaylistTracks()` | ui/33-playlists.js | `Mineradio.platforms.qq.playlistTracks()` |
| `neteaseUpdateLatest()` | ui/33-playlists.js | `Mineradio.platforms.netease.updateLatest()` |
| `neteaseDiscoverHome()` | features/14-discover.js | `Mineradio.platforms.netease.discoverHome()` |
| `neteaseWeatherIpLocation()` | features/14-discover.js | `Mineradio.platforms.netease.weatherIpLocation()` |

**小计**：39 处 → 改 namespace

### 分类 B：迁移到 Event Bus（3 处，fire-and-forget）

| 当前写法 | 改为 | 监听方 |
|---------|------|--------|
| 切歌后直接调歌词加载、封面更新 | `bus.emit('player:trackchange', { song, token })` | 歌词、封面 |
| 播放/暂停后更新 UI 按钮状态 | `bus.emit('player:statechange', { playing })` | 登录提示 |
| 登录后各处查登录状态 | `bus.emit('login:statechange', status)` | 搜索源切换、歌单刷新 |

## Event Bus 迁移清单（3 处旧调用 + 未来新功能）

### 迁移 3 处旧调用到事件驱动

| 事件 | 触发方 | 监听方 | 说明 |
|------|--------|--------|------|
| `player:trackchange` | `features/12-playback.js` 切歌时 | `features/13-lyrics.js` 加载歌词、封面模块更新封面 | event 含 `{ song, token }` |
| `player:statechange` | `features/12-playback.js` 播放/暂停 | `ui/30-login.js` 更新登录提示状态 | 只有 login.js 消费 `playing` 状态，console.js 不需要 |
| `login:statechange` | `ui/30-login.js` 登录/登出 | `ui/33-playlists.js` 刷新歌单、`ui/32-controls.js` 更新搜索源 | 替换直接调 `refreshUserPlaylists()` |

### Event Bus 事件清单（含预留）

| 事件名 | 触发方 | 监听方（现在+未来） |
|--------|--------|-------------------|
| `player:trackchange` | playback.js | 歌词、封面、推荐、desktop overlay |
| `player:statechange` | playback.js | 播放按钮、mini bar、desktop 同步 |
| `login:statechange` | login.js | 搜索源切换、用户菜单 |

当前**只迁移以上 3 处**。其他 39 处旧调用继续走 namespace。新功能可以自由加新事件。

## 执行步骤

### Step 1 — 兜底桩（shared.js，15 min）
追加 40 行，按返回类型分组。

### Step 2 — onerror（index.html，2 min）
3 个 platform 文件加 `onerror`。

### Step 3 — Event Bus（新文件 js/core/bus.js，10 min）

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

**关键**：window 和 namespace 同时写，迁移期间两套都可用。Step 7 只删 `window[fnName] = fn`，保留 namespace 赋值。

### Step 5 — 迁移调用方到 namespace（42 处，11 文件，按文件分批）

**Batch A**（2 文件，4 处）：
- `features/15-like.js` — `neteaseLike` → `Mineradio.platforms.netease.like()`，`neteaseLikeCheck` → `neteasePlatform.likeCheck()`
- `features/16-collect.js` — `neteasePlaylistCreate` → `neteasePlatform.playlistCreate()`，`neteasePlaylistAddSong` → `neteasePlatform.playlistAddSong()`

**Batch B**（3 文件，10 处）：
- `features/12-playback.js` — songUrl 4 处
- `state/06-beat-analysis.js` — songUrl 2 处 + beatmapCache 2 处
- `features/14-discover.js` — discoverHome + weatherIpLocation 2 处

**Batch C**（2 文件，~15 处）：
- `ui/32-controls.js` — search(6) + userPlaylists(1) + podcast(4) = ~11 处
- `ui/30-login.js` — loginQrKey/Create/Check/Status 4 处

**Batch D + E**（3 文件，8 处 + 3 处 Event Bus）：
- `visual/22-shelf.js` — playlistTracks 2 处
- `ui/33-playlists.js` — playlistTracks(2) + podcast(2) + updateLatest(1)
- `features/12-playback.js` — **Event Bus**: 切歌时 emit `player:trackchange` + 播放/暂停时 emit `player:statechange`
- `ui/30-login.js` — **Event Bus**: 登录/登出时 emit `login:statechange`
- `features/13-lyrics.js` + cover 模块 — 添加 `bus.on('player:trackchange')` 监听

每批改完立即测试该模块功能。

### Step 5.5 — 全局 grep 确认无遗漏
迁移完成后，在所有 JS 文件中搜索旧函数名：
```
grep -rn "neteaseSearch\|neteaseSongUrl\|neteaseLoginQr\|neteasePlaylist\|qqSearch\|qqSongUrl\|qqPlaylistTracks\|youtubeSearch\|youtubeSongUrl" public/js/
```
如果还有匹配（排除 platform 文件中的定义行），说明有遗漏，补修。

### Step 6 — animate 拆分（init.js，2-4 h）

### Step 7 — 清理（10 min）
删除 platform 自动生成循环中的 `window[fnName] = fn;`，保留 namespace 赋值：
```js
// 删除这行:
// window[fnName] = fn;
// 保留这行:
window.Mineradio.platforms[platformName][key] = fn;
```
同时删除 shared.js 中的兜底桩数组（不再需要）。

## 工作量估算

| Step | 内容 | 时间 |
|------|------|------|
| 1 | 兜底桩 | 15 min |
| 2 | onerror | 2 min |
| 3 | Event Bus | 10 min |
| 4 | 修改自动生成循环（同时写 window + namespace） | 15 min |
| 5 | 迁移 39 处调用方到 namespace（4 个 Batch） | 5-7 h |
| 6 | 迁移 3 处旧调用到 Event Bus + 添加监听方 | 1-2 h |
| 7 | 全局 grep 确认无遗漏 | 5 min |
| 8 | animate 拆分 | 2-4 h |
| 9 | 删除 window 全局函数 | 10 min |
| **总计** | | **9-14 h** |

## 不做的
- ~~旧调用方改成 Event Bus~~ — 等以后确定有多个监听方时再改
- ~~IIFE 包裹~~ — v2 已证明不可行
