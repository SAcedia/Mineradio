# 项目复查问题清单（2026-06-30）

## 🔴 严重问题

### 1. `init.js:56-311` — animate() 256 行巨型函数
- 主循环中混合：频谱分析、节拍引擎、峰值跟踪、歌词溢光、DJ 模式、粒子更新、uniform 赋值、镜头运动
- 建议：拆分为 8-10 个命名函数

### 2. `api-helper.js:1-2207` — 9 个功能域混合
- 建议：拆分为 quality.js、covers.js、listen-stats.js、home.js、track-detail.js、lyrics-custom.js、like-collect.js

### 3. `netease.js` — 22 个重复 API 包装器
- 每个函数重复 `neteaseApi('/xxx', 'p1=...')` 模式
- 建议：配置表动态生成

## 🟡 中等问题

### 4. `desktop-overlay.js:213` — 25+ 条件 key 字符串
### 5. `splash.js` — 命名风格 3 种模式混用
### 6. 魔法数字遍布（0.030、260、1400 等）
### 7. `server.js` 路由匹配重复 15 次

## 🟢 小问题

### 8. `utils.js` — _cacheKeyForSong 下划线前缀不一致
### 9. 所有文件缺失 JSDoc
### 10. `init.js` — env() 内嵌函数

## ❓ 待复查（hyperplan 超时）

### 11. 代码正确性 — server.js 路由 + context 注入 + api-helper.js 逻辑
### 12. YouTube 功能完整性和正确性
