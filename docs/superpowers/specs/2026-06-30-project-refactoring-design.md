# Mineradio 项目重构设计文档

## 概述

将 `public/index.html` 27,796 行的单体文件拆分为多文件结构，保持行为不变，提高可维护性。

## 原则

1. **无构建工具** — server.js 直接 serve 静态文件，零 build 步骤
2. **行为不变** — 不修改任何功能逻辑，只移动代码
3. **轻量优先** — 不引入 npm 依赖增加内存/CPU 负担
4. **按依赖顺序加载** — 用 `<script>` 标签顺序保证初始化顺序

## 目录结构

```
public/
  index.html              # 入口：骨架 HTML + script/link 引用
  css/
    tokens.css            # :root CSS 变量（颜色/字体/glass 参数）
    base.css              # Reset, 全局排版, 滚动条, utility
    desktop-shell.css     # 标题栏, 窗口控制按钮
    components.css        # 所有 UI 组件样式（含 section 注释）
    glass-filters.css     # 3 组 SVG glass filter
  js/
    core/
      state.js            # L2715 — 全局变量 (~1050行)
      utils.js            # 工具函数 (formatTime, clamp, debounce 等)
      api-helper.js       # apiJson 等 HTTP 请求抽象
    platforms/
      netease.js          # 网易云搜索/歌单/评论/用户 API
      qq.js               # QQ 音乐搜索/歌单/quality API
      youtube.js          # YouTube 搜索/音频 URL API
    audio/
      audio-engine.js     # initAudio, AudioContext, analyser 节点
      beat-analysis.js    # 离线节拍预解析 + beat map 缓存
      playback.js         # 播放队列, play/pause/next/retry
      lyrics.js           # 歌词 fetch/display/karaoke/source 切换
    ui/
      controls.js         # 底部控件, 搜索 UI, 播放列表面板
      modals.js           # 登录/用户/裁剪/收藏 模态框
      console.js          # DIY 视觉控制台 + preset 系统
      login.js            # Netease/QQ 登录系统
    splash.js             # 启动页: Canvas 2D + WebGL + 音效 + DOM
    desktop-overlay.js    # Electron IPC: 桌面歌词/壁纸状态推送
    three/
      three-scene.js      # Three.js 场景/相机/渲染器/指针控制
      particles.js        # 主粒子系统 + 5 presets + 浮空/骷髅/背封层
      three-lyrics.js     # 3D 舞台歌词系统
      shelf.js            # 3D 歌单架 + PSP 布局 + 交互
    init.js               # 启动序列 + 主循环
```

## CSS 文件详情

### tokens.css
- 所有 `:root{}` 变量（约 6 个 `:root` 块合并为一）
- 字体栈、颜色、glass shadow 参数、saved panel 变量
- 来源：index.html L24-L27

### base.css
- `*,*::before,*::after` reset
- `html,body` 全局样式
- `body.cursor-hidden`
- 自定义滚动条
- 通用 utility class
- 来源：index.html L19-L34

### desktop-shell.css
- `#desktop-window-shell`, `#desktop-titlebar`
- `.desktop-drag-region`, `.desktop-window-controls`
- `.desktop-window-btn`
- 来源：index.html L36-L50+

### components.css
- 所有 UI 组件样式（splash/search/home/console/playlist/controls/modals 等）
- 保持原有 section 注释分隔
- 来源：index.html L51-L1865

### glass-filters.css
- 3 组 SVG `<filter>`：`mineradio-control-glass-filter`、`mineradio-search-box-glass-filter`、`mineradio-search-pill-glass-filter`
- 来源：index.html L2375-L2499

## JS 文件详情

### core/state.js
功能：声明所有全局变量
- audio, audioCtx, analyser, gainNode 等音频全局
- lyricsLines, playlist, playQueue, currentIdx, playing
- loginStatus, qqLoginStatus
- fx 对象、presetMeta
- Three.js 相关（scene, camera, renderer 等）
- splash 相关（splashCanvas, splashGl 等）
- 桌面歌词相关
- 文件行：L2715-L3767

### core/utils.js
功能：通用工具函数
- formatTime, clamp, clamp01, clampRange
- debounce, throttle
- songProviderKey, _cacheKeyForSong
- 其他纯函数工具

### core/api-helper.js
功能：HTTP 请求封装
- `apiJson()`, `apiForm()`, `apiPost()`
- 文件行：L15205-L17425

### platforms/netease.js
功能：网易云音乐 API 调用
- `searchNetease()`, `cloudsearch()`
- 歌单操作：playlist_tracks, playlist_track_all 等
- 用户：login, logout, user_playlist
- 评论：comment_music
- 来源：从 api-helper 及其后提取网易云相关

### platforms/qq.js
功能：QQ 音乐 API 调用
- `searchQQ()`, `qqSongUrl()` 等
- QQ 登录相关
- quality 探测
- 来源：从 api-helper 及其他部分提取

### platforms/youtube.js
功能：YouTube API 调用
- `searchYoutube()`, `getYoutubeSongUrl()`
- 每日推荐
- 来源：从 api-helper 及其他部分提取

### audio/audio-engine.js
功能：音频引擎初始化
- `initAudio()`
- AudioContext, analyser, gainNode 创建
- 频谱数据更新
- 文件行：L18023-L18340

### audio/beat-analysis.js
功能：节拍分析
- 离线节拍预解析 (fetch → OfflineAudioContext → kick 检测)
- beat map 缓存读写
- 文件行：L9999-L12872

### audio/playback.js
功能：播放控制
- 播放队列管理（playQueue, currentIdx）
- play/pause/next/prev
- YT retry 逻辑
- QQ quality fallback
- 文件行：L18340-L19378

### audio/lyrics.js
功能：歌词系统
- `fetchLyric()` 多源歌词获取
- 歌词显示、karaoke 进度
- 歌词源切换
- 文件行：L19378-L19666

### ui/controls.js
功能：UI 控件
- 底部控件（播放/暂停/下一首/音量）
- 搜索 UI
- 播放列表面板
- 文件行：L19666-L19982 + L17425-L18023 搜索 UI 部分

### ui/modals.js
功能：模态框
- 登录模态框
- 用户模态框
- 封面裁剪模态框
- 收藏到歌单模态框
- 文件行：L2500-L2585（HTML）+ L24039-L24856（JS 登录部分）

### ui/console.js
功能：DIY 视觉控制台
- preset 卡片
- 滑块/开关/三态
- fx 参数绑定
- lyric palette 保存
- 文件行：L20962-L23520

### ui/login.js
功能：登录系统
- Netease 扫码登录
- QQ 登录
- 登录状态管理
- 来源：从 modals/login 部分提取

### splash.js
功能：启动页
- WebGL splash shader
- Canvas 2D 粒子/条纹/碎片
- 启动音效
- splash enter/dismiss 逻辑
- 文件行：L26431-L27180（除去 desktop-overlay 部分）

### desktop-overlay.js
功能：Electron 桌面歌词/壁纸 IPC
- `pushDesktopLyricsState()`, `pushWallpaperState()`
- `currentDesktopSongMeta()`, `desktopLyricsPayload()`
- 全屏/窗口控制
- 文件行：L27054-L27290

### three/three-scene.js
功能：Three.js 场景基础设施
- Scene, Camera, Renderer 初始化
- 相机系统（orbit, cinemaOffset, userOrbit）
- 指针/拖拽控制
- resize 处理
- 文件行：L3767-L5727

### three/particles.js
功能：粒子系统
- 主粒子系统 + 5 presets
- 浮空粒子层
- 安魂 3D 骷髅
- 封面背面粒子层
- 涟漪触发系统
- 封面处理（depth/edge）
- 文件行：L5728-L9998（排除 beat-analysis；3D 歌词代码 L7252-L9410 嵌入在此段内，提取至 three-lyrics.js）

### three/three-lyrics.js
功能：3D 舞台歌词
- Three.js 文字平面
- 歌词跟随粒子 3D 运动
- lyric particles
- 文件行：L7252-L9410（注意：这段代码嵌入在 particles 段内，非连续提取时需要区分）

### three/shelf.js
功能：3D 歌单架
- 双模式（side/stage）
- PSP 弧形布局
- 卡片交互
- 二级内容框
- 文件行：L12872-L15204

### init.js
功能：启动序列 + 主循环
- `applyDiyMode()` 等启动调用
- 主循环 `animate()`（定义在 L19670，playlist-panel 段内，提取到此文件）
- 渲染性能管理
- 文件行：L27409-27796 + animate 定义（L19670-L19674）

## 加载顺序

```
tokens.css
base.css
desktop-shell.css
components.css
glass-filters.css

state.js
utils.js
api-helper.js
platforms/netease.js
platforms/qq.js
platforms/youtube.js
audio/audio-engine.js
audio/beat-analysis.js
audio/playback.js
audio/lyrics.js
ui/controls.js
ui/modals.js
ui/console.js
ui/login.js
splash.js
desktop-overlay.js
three/three-scene.js
three/particles.js
three/three-lyrics.js
three/shelf.js
init.js
```

## server.js 变更

- 无需结构性改动
- static file serving 通过 `public/` 目录自动工作
- platform 路由（YouTube、QQ 等）保持原样，不移动

## 风险与缓解

| 风险 | 缓解 |
|------|------|
| 全局变量在多文件中可见性 | 所有变量用 `var` 声明，文件加载顺序保证初始化顺序 |
| 函数定义顺序错误 | `init.js` 最后加载，脚本加载顺序严格按依赖链 |
| CSS 类名冲突 | 保持原有选择器，不改变任何 class/id 名 |
| HTML id 引用 | 保持 HTML 结构不变 |
| 重构后未找到函数 | 每个文件提取后 `node --check server.js` + 手动验证 |
| desktop/main.js 未改动 | desktop/ 保持原样（后续可独立重构） |

## 重构步骤

1. 创建目录结构
2. 提取 CSS 到 5 个文件
3. 提取 JS state
4. 提取 JS core + platforms
5. 提取 JS audio
6. 提取 JS UI
7. 提取 JS splash + desktop-overlay
8. 提取 JS three
9. 提取 JS init + animate
10. 重建 index.html 引用（HTML 结构本身不动，只替换 `<style>` 为 `<link>`、替换 `<script>` 内联块为多文件引用）
11. 验证：`git diff --check`、`node --check server.js`、浏览器打开检查关键交互（搜索/播放/歌词/3D）

## 注意事项

- **HTML 保持不变**：所有内联 HTML 结构保留在 index.html 中（不拆 HTML），只提取 CSS 和 JS
- **非连续提取**：某些 JS 段（如 particles 内含 three-lyrics）需要逐行甄别归属，而非按连续行号切分
- **登录系统与模态框分离**：login.js 处理登录逻辑，modals.js 处理模态框 UI 交互，HTML 模态框结构保留在 index.html
