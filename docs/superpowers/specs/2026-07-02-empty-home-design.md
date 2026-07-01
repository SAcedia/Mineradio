# empty-home UI 优化方案

## 现状

empty-home 是未播放歌曲时的首页，布局：左 Hero 大卡片 | 右 2×2 入口卡片 | 底部 1×5 推荐 Tile。搜索栏固定在顶部。

## 目标文件

所有 CSS 改动集中在 `public/css/base.css`。不修改 HTML（`public/index.html`）和 JS（`public/js/`）。

## 问题

1. Hero 区的 Mosaic 和大图视觉区占空间但无功能
2. 卡片和背景不透明，遮挡了 canvas 粒子/3D 视觉特效
3. 底部控制栏在 home 模式和普通模式间样式不一致
4. 大屏卡片被拉伸过宽
5. Tile 行固定 5 列，窄屏拥挤

## 已完成的改动（不在本次范围）

- Tile 行自适应：`grid-template-columns: repeat(auto-fill, minmax(min(170px,100%), 1fr))` ✅
- 大屏卡片 max-width：`.home-grid { max-width: 820px }` ✅
- 左面板：不做处理，保持现有行为 ✅

## 本次改动方案

### 1. 背景：让视觉特效透出（public/css/base.css）

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

### 2. 去掉装饰性元素（public/css/base.css）

- 去掉 `home-visual`（大图视觉区）
- 去掉 `home-mosaic`（3 格背景装饰）
- 去掉 `home-hero::after`（底部装饰线）
- 不改变 HTML 结构，仅 CSS `display:none`

### 3. 底部控制栏融合（public/css/base.css）

```css
body.empty-home-active #bottom-bar.visible {
  background: rgba(6,8,12,.35);
  backdrop-filter: blur(14px) saturate(1.4);
}
body.empty-home-active .ctrl-btn {
  color: rgba(255,255,255,.50); /* 更低饱和度 */
}
```

### 4. 卡片 hover 微动效（public/css/base.css）

```css
.home-card:hover {
  transform: translateY(-2px);
  border-color: color-mix(in srgb, var(--tone-a) 36%, rgba(255,255,255,.12));
  box-shadow: 0 24px 64px rgba(0,0,0,.28), 0 0 28px color-mix(in srgb, var(--tone-a) 10%, transparent);
}
```

### 不动的内容

- 搜索栏位置和样式
- 4 个入口卡片的数量和位置
- Hero 区的基本结构（保留标题、天气、快速操作）
- 响应式断点
- HTML 结构（`index.html`）
- JavaScript 逻辑（`discover.js` 等）

## 验证标准

- empty-home 打开时，背景能透出 canvas 粒子/视觉特效，不再是一整块深色背景
- Hero 区无 Mosaic 和装饰线
- 底部控制栏在 home 模式下颜色更淡，融入背景
- 卡片 hover 时轻微上浮 + 边框发光
- 搜索栏位置和功能不变

## 实施步骤

1. `public/css/base.css`: Hero + 卡片 + Tile 背景透明度和 blur 调整
2. `public/css/base.css`: Mosaic / Visual / hero::after 隐藏
3. `public/css/base.css`: 控制栏 home 模式透明度 + ctrl-btn 颜色
4. `public/css/base.css`: 卡片 hover 微动效
