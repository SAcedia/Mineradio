# Desktop 桌面壁纸模式

## 目标

安装后，歌词粒子特效、歌单面板、DIY 面板、底部控制栏等可以直接显示在电脑桌面上，不影响正常使用电脑（打开文件、软件等）。

## 方案：Windows 原生 API（ffi-napi）

不依赖第三方壁纸模块。用 `ffi-napi` 直接调用 Windows 内置 `user32.dll`，
将 Electron 窗口插入壁纸层与桌面图标层之间。

### 架构

```
桌面图标层 ← 正常点击操作透过窗口到达图标
我们的窗口 ← 半透明，鼠标默认穿透，托盘/快捷键交互
Windows 壁纸层
```

### 模式切换

- **启动方式**：`npm run start:wallpaper` 启动桌面壁纸模式；`npm start` 启动普通窗口模式
- **检测**：`package.json` 中 `scripts.start:wallpaper = "electron . --wallpaper"`
- **运行时切换**：系统托盘菜单提供"切换到窗口模式"和"退出"
- **普通窗口模式入口**: `require('./desktop/normal-window').createNormalWindow()`（现有代码迁移）

### 音频架构

- 壁纸窗口加载同一个 `public/index.html`，**独立播放音频**
- 不和普通窗口并存（一次只能运行一个实例）
- 启动参数 `--wallpaper` 控制前端通过 `window.__wallpaperMode` 标志调整 UI

## 技术实现

### 1. 安装依赖

```bash
npm install ffi-napi
```

`ffi-napi` 是通用 FFI 库，活跃维护。

### 2. 共享工具模块（desktop/shared.js）

避免循环依赖和 `execJS` 未定义问题。所有模块从这里导入共享函数。

```javascript
const { app } = require('electron');

let _wallpaperWin = null;

function setWallpaperWin(win) { _wallpaperWin = win; }
function getWallpaperWin() { return _wallpaperWin; }

// 安全执行 JS
function execJS(code) {
  const win = getWallpaperWin();
  if (win) win.webContents.executeJavaScript(code).catch(() => {});
}

module.exports = { setWallpaperWin, getWallpaperWin, execJS };
```

### 3. 核心：壁纸窗口 + WorkerW 查找（desktop/wallpaper.js）

```javascript
const ffi = require('ffi-napi');
const { BrowserWindow } = require('electron');
const path = require('path');
const shared = require('./shared');

const user32 = ffi.Library('user32.dll', {
  'FindWindowW': ['long', ['string', 'string']],
  'FindWindowExW': ['long', ['long', 'long', 'string', 'string']],
  'SetParent': ['long', ['long', 'long']],
  'GetWindow': ['long', ['long', 'int']],
  'SendMessageW': ['long', ['long', 'long', 'long']]
});
const GW_HWNDNEXT = 2;
const WM_USER = 0x0400;
const WM_SPAWN_WORKER = 0x052C;

// 找到壁纸层的 WorkerW（不带 SHELLDLL_DefView 的那个）
// 经典算法：
//   1. 找到 Progman
//   2. 发 0x052C 创建 DefView WorkerW
//   3. 找到该 WorkerW 并记录
//   4. 发第二次 0x052C 创建壁纸层 WorkerW
//   5. 遍历找到下一个不带 DefView 的 WorkerW
function findWallpaperWorkerW(progman) {
  // 第一次 0x052C：创建或找到桌面图标的 WorkerW
  user32.SendMessageW(progman, WM_SPAWN_WORKER, 0, 0);
  // 第二次 0x052C：创建壁纸层的 WorkerW
  user32.SendMessageW(progman, WM_SPAWN_WORKER, 0, 0);

  // 遍历所有 WorkerW，跳过带 SHELLDLL_DefView 的（桌面图标层）
  let workerw = user32.FindWindowW('WorkerW', null);
  while (workerw) {
    const defview = user32.FindWindowExW(workerw, 0, 'SHELLDLL_DefView', null);
    if (!defview) {
      return workerw; // 不带 DefView → 壁纸层
    }
    workerw = user32.GetWindow(workerw, GW_HWNDNEXT);
  }
  return 0;
}

function createWallpaperWindow() {
  const wallpaperWin = new BrowserWindow({
    width: 1920,
    height: 1080,
    transparent: true,
    frame: false,
    resizable: false,
    focusable: false,
    skipTaskbar: true,
    show: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: false // 不使用 remote，改用 IPC
    }
  });

  wallpaperWin.loadURL(`file://${path.join(__dirname, '../public/index.html')}?mode=wallpaper`);

  wallpaperWin.webContents.on('did-finish-load', () => {
    const buf = wallpaperWin.getNativeWindowHandle();
    const hwnd = buf.readInt32LE(0);
    const progman = user32.FindWindowW('Progman', null);
    const workerw = findWallpaperWorkerW(progman);
    if (workerw) {
      user32.SetParent(hwnd, workerw);
      wallpaperWin.setIgnoreMouseEvents(true, { forward: true });
      wallpaperWin.show();
    }
  });

  shared.setWallpaperWin(wallpaperWin);
  return wallpaperWin;
}

module.exports = { createWallpaperWindow };
```

### 4. 系统托盘（desktop/tray.js）

```javascript
const { Tray, Menu, app } = require('electron');
const path = require('path');
const shared = require('./shared');
const normalWindow = require('./normal-window');

let tray = null;

function createTray() {
  tray = new Tray(path.join(__dirname, '../build/icon.png'));
  const menu = Menu.buildFromTemplate([
    { label: '显示控制面板', click: showControlPanel },
    { type: 'separator' },
    { label: '下一首', click: () => shared.execJS('nextTrack()') },
    { label: '播放/暂停', click: () => shared.execJS('togglePlay()') },
    { label: '上一首', click: () => shared.execJS('prevTrack()') },
    { type: 'separator' },
    { label: '切换到窗口模式', click: switchToWindowMode },
    { label: '退出', click: () => app.quit() }
  ]);
  tray.setToolTip('Mineradio 桌面模式');
  tray.setContextMenu(menu);
}

function showControlPanel() {
  const win = shared.getWallpaperWin();
  if (!win) return;
  win.setIgnoreMouseEvents(false);
  win.webContents.executeJavaScript('window.__showDesktopControls()');
  setTimeout(() => {
    win.setIgnoreMouseEvents(true, { forward: true });
    win.webContents.executeJavaScript('window.__hideDesktopControls()');
  }, 8000);
}

function switchToWindowMode() {
  const win = shared.getWallpaperWin();
  if (win) { win.close(); shared.setWallpaperWin(null); }
  if (tray) { tray.destroy(); tray = null; }
  normalWindow.createNormalWindow();
}

module.exports = { createTray };
```

### 5. 前端适配（public/js/desktop-wallpaper.js）

使用 `ipcRenderer` 替代废弃的 `electron.remote`：

```javascript
(function() {
  // 检测壁纸模式：URL 参数 ?mode=wallpaper 或 window.__wallpaperMode
  var isWP = window.__wallpaperMode || location.search.indexOf('mode=wallpaper') >= 0;
  if (!isWP) return;

  var ctrlPanelVisible = false;
  var ipc = null;
  try { ipc = require('electron').ipcRenderer; } catch(e) {}

  window.__showDesktopControls = function() {
    ctrlPanelVisible = true;
    document.body.classList.add('wallpaper-controls');
    var bar = document.getElementById('bottom-bar');
    if (bar) bar.classList.add('visible');
  };

  window.__hideDesktopControls = function() {
    ctrlPanelVisible = false;
    document.body.classList.remove('wallpaper-controls');
    var bar = document.getElementById('bottom-bar');
    if (bar) bar.classList.remove('visible');
  };

  // hover 到控制栏区域时通过 IPC 通知主进程切换鼠标穿透
  var bar = document.getElementById('bottom-bar');
  if (bar && ipc) {
    bar.addEventListener('mouseenter', function() {
      ipc.send('wallpaper-set-ignore-mouse', false);
    });
    bar.addEventListener('mouseleave', function() {
      if (!ctrlPanelVisible) ipc.send('wallpaper-set-ignore-mouse', true);
    });
  }
})();
```

### 6. 全局快捷键（desktop/shortcuts.js）

```javascript
const { globalShortcut } = require('electron');
const shared = require('./shared');

function registerShortcuts() {
  globalShortcut.register('MediaPlayPause', () => shared.execJS('togglePlay()'));
  globalShortcut.register('MediaNextTrack', () => shared.execJS('nextTrack()'));
  globalShortcut.register('MediaPreviousTrack', () => shared.execJS('prevTrack()'));
}

function unregisterShortcuts() {
  globalShortcut.unregisterAll();
}

module.exports = { registerShortcuts, unregisterShortcuts };
```

### 7. 普通窗口入口（desktop/normal-window.js）

```javascript
// 从现有 desktop/main.js 迁移过来的普通窗口创建逻辑
const { BrowserWindow } = require('electron');
const path = require('path');

let mainWindow = null;

function createNormalWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    // ... 现有窗口配置
  });
  mainWindow.loadURL(`file://${path.join(__dirname, '../public/index.html')}`);
  return mainWindow;
}

module.exports = { createNormalWindow };
```

### 8. 启动入口（desktop/main.js）

```javascript
const { app, ipcMain } = require('electron');
const shared = require('./shared');

// IPC 处理：前端控制鼠标穿透
ipcMain.on('wallpaper-set-ignore-mouse', (event, ignore) => {
  const win = shared.getWallpaperWin();
  if (win) win.setIgnoreMouseEvents(ignore, { forward: true });
});

const isWallpaperMode = process.argv.includes('--wallpaper');

app.whenReady().then(() => {
  if (isWallpaperMode) {
    const wallpaper = require('./wallpaper');
    const tray = require('./tray');
    const shortcuts = require('./shortcuts');
    wallpaper.createWallpaperWindow();
    tray.createTray();
    shortcuts.registerShortcuts();
  } else {
    const normalWindow = require('./normal-window');
    normalWindow.createNormalWindow();
  }
});
```

### 交互模式

| 状态 | 鼠标行为 | 交互方式 |
|------|---------|---------|
| 默认 | 穿透到桌面 | 托盘菜单、全局快捷键 |
| 鼠标移到控制栏 | 临时可点击 | IPC 通知主进程关闭穿透 |
| 控制面板打开（8s） | 不穿透 | 点击界面操作 |
| 快捷键 | 不受影响 | 全局 Media 键 |

### Windows API WorkerW 查找算法说明

```
Progman (桌面根窗口)
├── WorkerW #1 (带 SHELLDLL_DefView) ← 桌面图标层，跳过
├── WorkerW #2 (不带 SHELLDLL_DefView) ← 壁纸层，插入这里
└── 其他 WorkerW ...
```

发送两次 `0x052C` 给 Progman：
1. 第一次创建或激活带 `SHELLDLL_DefView` 的 WorkerW（图标层）
2. 第二次创建不带 `SHELLDLL_DefView` 的 WorkerW（壁纸层）

遍历 WorkerW，找到**没有** `SHELLDLL_DefView` 子窗口的，将我们的窗口设为它的子窗口。

### 注意事项

- Windows only（user32.dll 是 Windows 特有）
- `ffi-napi` 需要 `node-gyp` 编译
- 窗口默认 `focusable: false` + `skipTaskbar: true`，不干扰用户操作
- 普通模式和壁纸模式互斥，一次只运行一个实例
- 用 `ipcMain/ipcRenderer` 替代废弃的 `electron.remote`
- `package.json` 添加 `scripts.start:wallpaper = "electron . --wallpaper"`

### 前端检测

前端通过 URL 参数 `?mode=wallpaper` 或 `window.__wallpaperMode` 判断当前模式：
`desktop-wallpaper.js` 启动时自动检测这两者。
- 壁纸模式：控制栏初始隐藏，hover 显示
- 普通模式：控制栏正常显示
- 其余 UI 逻辑完全一致

### 与现有架构的关系

- 不修改 `public/` 下现有代码（CSS/JS/HTML）
- 新增 `desktop/wallpaper.js`、`desktop/tray.js`、`desktop/shortcuts.js`、`desktop/shared.js`、`desktop/normal-window.js`
- 新增 `public/js/desktop-wallpaper.js`（条件加载）
- 现有 `desktop/main.js` 重构为 `desktop/normal-window.js` + `desktop/main.js`
- `package.json` 添加新启动脚本
