# 已取消任务复活 — 设计文档

## 概述
将 `public/index.html` 重构中已取消的 4 个 JS 提取任务重新评估并实现。

## Task 1: core/utils.js

从各文件提取纯工具函数：

| 函数 | 来源 | 性质 |
|---|---|---|
| `clamp01(v)` | `three-lyrics.js:261` | 纯函数 |
| `clampRange(v, min, max)` | `three-lyrics.js:300` | 纯函数 |
| `songProviderKey(song)` | `ui/controls.js:365` | 纯函数 |
| `_cacheKeyForSong(s)` | `core/state.js:83` | 纯函数 |

加载顺序：`state.js → utils.js → ...`

## Task 2: platforms/*.js

三个平台文件，每个封装业务方法：

```
platforms/netease.js   — neteaseSearch(), neteaseSongUrl(), neteasePlaylistTracks()
platforms/qq.js        — qqSearch(), qqSongUrl(), qqPlaylistTracks()
platforms/youtube.js   — youtubeSearch(), youtubeSongUrl()
```

调用方从直接 `apiJson('/api/...')` 改为调平台方法。约 15 个函数，15 处调用更新。

## Task 3: ui/modals.js

从 `ui/login.js:3-56` 提取 `openGsapModal()`、`closeGsapModal()`、`bindModalBackdropClose()`。

加载顺序：`... → modals.js → login.js → ...`

## Task 4: desktop/desktop-overlay.js

从 `splash.js:630-856` 提取桌面歌词 IPC 函数（`pushDesktopLyricsState`、`pushWallpaperState` 等 18 个函数）。

`initDesktopWindowShell()`、`toggleFullscreen()` 留在 splash.js。
