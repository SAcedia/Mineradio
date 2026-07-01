# Desktop 桌面壁纸模式

## 目标

安装后，歌词粒子特效、歌单面板、DIY 面板、底部控制栏等可以直接显示在电脑桌面上，不影响正常使用电脑（打开文件、软件等）。

## 方案：electron-wallpaper

用 `@phoeshow/electron-wallpaper` 将 Electron 窗口插入 Windows 壁纸层与桌面图标层之间。

### 架构

```
桌面图标层 ← 正常操作不受影响
我们的窗口 （通过 electron-wallpaper 插入）
Windows 壁纸层
```

### 技术实现

#### 1. 安装依赖

```bash
npm install @phoeshow/electron-wallpaper
```

只在 Windows 下有效，需加 `optionalDependencies` 或运行时检测平台。

#### 2. 创建壁纸窗口（desktop/main.js）

```javascript
const { app, BrowserWindow, Tray, Menu } = require('electron');
const path = require('path');

let wallpaperWin = null;
let tray = null;

function createWallpaperWindow() {
  wallpaperWin = new BrowserWindow({
    width: 1920,
    height: 1080,
    transparent: true,
    frame: false,
    resizable: false,
    focusable: false,     // 不获取焦点，不干扰正常操作
    skipTaskbar: true,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  // 加载现有前端页面
  wallpaperWin.loadURL(`file://${path.join(__dirname, '../public/index.html')}`);

  // 插入壁纸层
  const electronWallpaper = require('@phoeshow/electron-wallpaper');
  electronWallpaper.attachWindow(wallpaperWin);

  // 鼠标穿透（让点击透过窗口到桌面）
  wallpaperWin.setIgnoreMouseEvents(true, { forward: true });
}

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

- Windows only（electron-wallpaper 不支持 Mac/Linux）
- `setIgnoreMouseEvents(true, { forward: true })` 确保鼠标事件穿透到桌面图标
- 需要在 `package.json` 的 `build.win` 配置中包含原生模块

### 与现有架构的关系

- 不修改现有 `public/` 前端代码
- 新增 `desktop/` 下的壁纸窗口逻辑
- 共用同一套 `public/index.html`
- 支持普通窗口模式和桌面壁纸模式切换
