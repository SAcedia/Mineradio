# Desktop 桌面壁纸模式

## 目标

安装后，歌词粒子特效、歌单面板、DIY 面板、底部控制栏等可以直接显示在电脑桌面上，不影响正常使用电脑（打开文件、软件等）。

## 方案：Windows 原生 API（ffi-napi）

不依赖第三方壁纸模块。用 `ffi-napi` 直接调用 Windows 内置 `user32.dll`，
将 Electron 窗口插入壁纸层与桌面图标层之间。

### 架构

```
桌面图标层 ← 正常操作不受影响
我们的窗口 （通过 electron-wallpaper 插入）
Windows 壁纸层
```

### 技术实现

#### 1. 安装依赖

```bash
npm install ffi-napi
```

`ffi-napi` 是通用 FFI 库，活跃维护，不依赖老旧的原生模块。

#### 2. 核心：将窗口插入壁纸层（desktop/wallpaper.js）

```javascript
const ffi = require('ffi-napi');
const { BrowserWindow, app, Tray, Menu, globalShortcut } = require('electron');
const path = require('path');

// Windows API 绑定
const user32 = ffi.Library('user32.dll', {
  'FindWindowW': ['long', ['string', 'string']],
  'FindWindowExW': ['long', ['long', 'long', 'string', 'string']],
  'SetParent': ['long', ['long', 'long']],
  'ShowWindow': ['bool', ['long', 'int']],
  'SendMessageW': ['long', ['long', 'long', 'long']]
});

// 将窗口插入桌面壁纸层
function attachToWallpaper(hwnd) {
  // 1. 找到 Progman 窗口（桌面）
  const progman = user32.FindWindowW('Progman', null);
  // 2. 发送消息让 Progman 创建 WorkerW
  user32.SendMessageW(progman, 0x052C, 0, 0);
  // 3. 找到 WorkerW（壁纸和图标之间的层）
  let workerw = 0;
  // 遍历查找
  // 4. 将我们的窗口设为 WorkerW 的子窗口
  user32.SetParent(hwnd, workerw);
}
```

// 系统托盘：交互入口
function createTray() {
  tray = new Tray('icon.png');
  const contextMenu = Menu.buildFromTemplate([
    { label: '显示控制面板', click: () => showControlPanel() },
    { label: '下一首', click: () => wallpaperWin.webContents.executeJavaScript('nextTrack()') },
    { label: '播放/暂停', click: () => wallpaperWin.webContents.executeJavaScript('togglePlay()') },
    { label: '上一首', click: () => wallpaperWin.webContents.executeJavaScript('prevTrack()') },
    { type: 'separator' },
    { label: '退出桌面模式', click: () => app.quit() }
  ]);
  tray.setToolTip('Mineradio 桌面模式');
  tray.setContextMenu(contextMenu);
}

// 控制浮层：鼠标穿透临时关闭，允许交互
function showControlPanel() {
  wallpaperWin.setIgnoreMouseEvents(false);
  // 显示一个半透明控制界面
  wallpaperWin.webContents.executeJavaScript('showDesktopControls()');
  // 5 秒无操作后恢复穿透
  setTimeout(() => {
    wallpaperWin.setIgnoreMouseEvents(true, { forward: true });
  }, 5000);
}
```

#### 3. 前端适配（public/js/desktop-wallpaper.js）

新增文件，处理桌面模式的特殊交互：

- 通过 `window.Mineradio.desktopWallpaperMode` 标志
- `showDesktopControls()` 临时显示交互界面
- 键盘快捷键（全局热键）用于切歌、调音量
- 默认鼠标穿透，hover 到特定区域时临时关闭穿透

#### 4. 全局快捷键

```javascript
const { globalShortcut } = require('electron');

app.whenReady().then(() => {
  globalShortcut.register('MediaPlayPause', () => togglePlay());
  globalShortcut.register('MediaNextTrack', () => nextTrack());
  globalShortcut.register('MediaPreviousTrack', () => prevTrack());
});
```

### 交互模式

| 状态 | 行为 |
|------|------|
| 默认 | 鼠标穿透，点击透过到桌面 |
| 托盘菜单 | 切歌、调音量、显示控制面板 |
| 控制面板打开（5s） | 鼠标穿透关闭，可点击按钮 |
| 快捷键 | 全局切歌/暂停，不管焦点在哪 |

### 注意事项

- Windows only（user32.dll 是 Windows 特有）
- `ffi-napi` 需要 `node-gyp` 编译，需安装 Windows Build Tools
- `setIgnoreMouseEvents(true, { forward: true })` 确保鼠标事件穿透到桌面图标
- 需要在 `package.json` 的 `build.win` 配置中包含原生模块

### 与现有架构的关系

- 不修改现有 `public/` 前端代码
- 新增 `desktop/` 下的壁纸窗口逻辑
- 共用同一套 `public/index.html`
- 支持普通窗口模式和桌面壁纸模式切换
