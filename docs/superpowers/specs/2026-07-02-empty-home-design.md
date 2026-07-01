# empty-home UI 优化方案

## 现状

empty-home 是未播放歌曲时的首页，布局：左 Hero 大卡片 | 右 2×2 入口卡片 | 底部 1×5 推荐 Tile。搜索栏固定在顶部。

## 目标文件

- CSS：`public/css/base.css`
- JS（Mosaic 数据）：`public/js/features/discover.js`

## 问题

1. Hero 区的 Mosaic 和大图视觉区占空间但无功能
2. 卡片和背景不透明，遮挡了 canvas 粒子/3D 视觉特效
3. 底部控制栏在 home 模式和普通模式间样式不一致
4. 大屏卡片被拉伸过宽，超宽屏字号偏小
5. Tile 行固定 5 列，窄屏拥挤

## 已完成的改动（不在本次范围）

- Tile 行自适应：`grid-template-columns: repeat(auto-fill, minmax(min(170px,100%), 1fr))` ✅
- 大屏卡片 max-width：`.home-grid { max-width: 820px }` ✅
- 左面板：不做处理，保持现有行为 ✅

## 本次改动方案

### 1. Mosaic 重新设计 — 三个功能区域

保留 Mosaic 结构（3 格），移除装饰性的 `home-visual`，改为动态内容：

```
┌───────────────────────┬────────────┐
│  ① 每日一言 (大格)     │ ② 本周听歌 │
│                       ├────────────┤
│  "名言文字"            │ ③ 队列概要 │
│  — 作者               │            │
└───────────────────────┴────────────┘
```

#### ① 每日一言（大格）

调用免费名言 API（如 `https://api.quotable.io/random`），每天展示一句与音乐/生活相关的名言。
- 缓存一天到 localStorage，避免重复请求
- 无网络时显示本地兜底文案（如："音乐是灵魂的语言 — 尼采"）
- 来源：`public/js/features/discover.js` 新增 `loadDailyQuote()`

#### ② 本周听歌（右上）

本周播放总时长 + 歌数 + 歌手数。
- 数据：`listenStatsState`，纯本地计算
- 来源：`public/js/features/discover.js` 现有 `homeListenSummary()`

#### ③ 队列概要（右下）

"队列 12 首 · 约 45 分钟"
- 数据：`playQueue` 长度 + 估算总时长
- 来源：`public/js/features/discover.js` 新增 `renderMosaicQueueSummary()`

### 2. 背景：让视觉特效透出（public/css/base.css）

```css
/* Hero 卡片背景 - 更低不透明度 + 更高 blur */
.home-hero {
  background: linear-gradient(145deg, rgba(33,29,34,.40), rgba(9,10,14,.50) 48%, rgba(17,20,25,.42));
  backdrop-filter: blur(40px) saturate(1.1);
  -webkit-backdrop-filter: blur(40px) saturate(1.1);
}

/* 右卡片 - 同样降低不透明度 */
.home-card {
  background: linear-gradient(142deg, rgba(18,21,26,.40), rgba(8,9,13,.50));
  backdrop-filter: blur(36px);
  -webkit-backdrop-filter: blur(36px);
}

/* Tile 行 */
.home-tile {
  background: linear-gradient(145deg, rgba(255,255,255,.035), rgba(255,255,255,.015));
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
}
```

### 3. 去掉装饰性元素（public/css/base.css）

- 去掉 `home-visual`（大图视觉区）
- 去掉 `home-hero::after`（底部装饰线）
- 保留 Mosaic（改为功能区域）
- 不改变 HTML 结构，仅 CSS `display:none`

### 4. 底部控制栏融合（public/css/base.css）

```css
body.empty-home-active #bottom-bar.visible {
  background: rgba(6,8,12,.35);
  backdrop-filter: blur(14px) saturate(1.4);
}
body.empty-home-active .ctrl-btn {
  color: rgba(255,255,255,.50);
}
```

### 5. 卡片 hover 微动效（public/css/base.css）

```css
.home-card:hover {
  transform: translateY(-2px);
  border-color: color-mix(in srgb, var(--tone-a) 36%, rgba(255,255,255,.12));
  box-shadow: 0 24px 64px rgba(0,0,0,.28), 0 0 28px color-mix(in srgb, var(--tone-a) 10%, transparent);
}
```

### 6. 大屏适配（public/css/base.css）

超宽屏（≥2000px）整体放大 1.15x：

```css
@media (min-width: 2000px) {
  .home-title { font-size: clamp(40px, 3.2vw, 64px); }
  .home-card { min-height: 148px; padding: 18px; }
  .home-card-title { font-size: 18px; }
  .home-card-sub { font-size: 12px; }
  .home-tile { min-height: 148px; }
  .home-tile-cover { height: 80px; }
  .home-tile-title { font-size: 13px; }
  .home-hero { padding: 32px; border-radius: 32px; }
  .home-sub { font-size: 14px; }
}
```

### 不动的内容

- 搜索栏位置和样式
- 4 个入口卡片的数量和位置
- Hero 区的标题、天气、快速操作
- 现有响应式断点
- HTML 结构（`index.html`）
- 其他 JavaScript 逻辑

## 验证标准

- Mosaic 显示每日一言、本周统计、队列概要，内容随状态变化
- 背景能透出 canvas 粒子/视觉特效，不再是一整块深色背景
- Hero 区无 `home-visual` 装饰线
- 底部控制栏在 home 模式下颜色更淡，融入背景
- 卡片 hover 时轻微上浮 + 边框发光
- 搜索栏位置和功能不变
- ≥2000px 宽屏下整体字号和间距等比放大

## 实施步骤

1. `public/css/base.css`: Hero + 卡片 + Tile 背景透明度和 blur 调整
2. `public/css/base.css`: home-visual / hero::after 隐藏（保留 Mosaic）
3. `public/css/base.css`: 控制栏 home 模式透明度 + ctrl-btn 颜色
4. `public/css/base.css`: 卡片 hover 微动效
5. `public/css/base.css`: 超宽屏 ≥2000px 放大规则
6. `public/js/features/discover.js`: Mosaic 三个功能区域的数据填充
