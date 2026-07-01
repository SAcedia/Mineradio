# empty-home UI 优化方案

## 现状

empty-home 是未播放歌曲时的首页，布局：左 Hero 大卡片 | 右 2×2 入口卡片 | 底部 1×5 推荐 Tile。搜索栏固定在顶部。

## 问题

1. Hero 区的 Mosaic 和大图视觉区占空间但无功能
2. 卡片和背景不透明，遮挡了 canvas 粒子/3D 视觉特效
3. 底部控制栏在 home 模式和普通模式间样式不一致
4. 大屏卡片被拉伸过宽
5. Tile 行固定 5 列，窄屏拥挤

## 改动方案

### 1. 背景：让视觉特效透出（base.css）

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

/* 底部控制栏在 home 模式下 */
body.empty-home-active #bottom-bar.visible {
  background: rgba(6,8,12,.35); /* 从 .58 降到 .35 */
}
```

### 2. 去掉装饰性元素

- 去掉 `home-visual`（大图视觉区）
- 去掉 `home-mosaic`（3 格背景装饰）
- 去掉 `home-hero::after`（底部装饰线）
- 不改变 HTML 结构，仅 CSS `display:none`

### 3. Tile 行自适应

已改：`grid-template-columns: repeat(auto-fill, minmax(min(170px,100%), 1fr))`

### 4. 卡片 hover 微动效

```css
.home-card:hover {
  transform: translateY(-2px);
  border-color: color-mix(in srgb, var(--tone-a) 36%, rgba(255,255,255,.12));
  box-shadow: 0 24px 64px rgba(0,0,0,.28), 0 0 28px color-mix(in srgb, var(--tone-a) 10%, transparent);
}
```

### 5. 底部控制栏融合

```css
body.empty-home-active #bottom-bar.visible {
  background: rgba(6,8,12,.35);
  backdrop-filter: blur(14px) saturate(1.4);
}
body.empty-home-active .ctrl-btn {
  color: rgba(255,255,255,.50); /* 更低饱和度 */
}
```

### 6. 大屏适配

`.home-grid` 已加 `max-width: 820px`，卡片不拉伸。

### 7. 左面板

不做特殊处理，保持当前滑出覆盖行为（z-index:17），不修改。

### 不动的内容

- 搜索栏位置和样式
- 4 个入口卡片的数量和位置
- Hero 区的基本结构（保留标题、天气、快速操作）
- 响应式断点

## 实施步骤

1. base.css: Hero + 卡片 + Tile 背景透明度和 blur 调整
2. base.css: Mosaic / Visual 装饰元素隐藏
3. base.css: 控制栏 home 模式透明度降低
4. base.css: 卡片 hover 微动效
