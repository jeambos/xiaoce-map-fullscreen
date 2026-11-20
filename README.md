# 猜盐地图全屏 · 开发者说明

猜盐（[xiaoce.fun](https://xiaoce.fun/)）地理类游戏的用户脚本：给地图加全屏、题面浮层、长按缩放和比例尺同步。

- 用户文档（Greasy Fork 发布用）：[`README.user.md`](./README.user.md)
- 版本历史：[`CHANGELOG.md`](./CHANGELOG.md)
- 构建产物：`xiaoce-map-fullscreen.user.js`

## 目录结构

```
.
├── src/                          # 源码（按顺序拼接成最终脚本）
│   ├── 00-header.txt             # ==UserScript== 元数据 + 版本历史注释
│   ├── 10-constants.js           # 类名、存储键、常量、模块级状态
│   ├── 20-style.js               # 注入的 CSS（模板字符串）
│   ├── 30-utils.js               # DOM 查找、Leaflet 实例补丁、通用判断
│   ├── 40-scale.js               # 比例尺同步、markUserZoomIntent
│   ├── 50-mode-settings.js       # 全屏方式偏好读写与胶囊按钮状态
│   ├── 60-question.js            # 显示题面：节点查找、原生图片预览入口、浮层布局
│   ├── 70-fullscreen.js          # 进入/退出全屏、Fullscreen API 兼容
│   ├── 80-controls.js            # 右下角按钮、左下角胶囊、显示题面开关
│   ├── 90-longpress.js           # 长按连续缩放（复用 Leaflet pinch 路径）
│   ├── 100-events.js             # 扫描、文档级事件、触摸双击识别
│   └── 110-init.js               # 启动：注入样式、首次扫描、监听
├── build.mjs                     # 构建脚本（零依赖）
├── xiaoce-map-fullscreen.user.js # 构建产物，请勿直接编辑
├── CHANGELOG.md
├── README.md                     # 本文件（开发者）
└── README.user.md                # 用户文档（Greasy Fork）
```

`src/*.js` 不是独立模块：构建时按顺序放进同一个 IIFE，共享作用域。因此：

- 新文件要登记到 `build.mjs` 的 `chunks` 数组里，并遵守数字前缀顺序。
- 可以依赖函数声明提升，但不要跨文件依赖顶层 `const` / `let` 的初始化顺序。
- 不要使用 `import` / `export`；最终产物是单文件用户脚本。

## 构建

```bash
node build.mjs
node --check xiaoce-map-fullscreen.user.js
```

构建会生成根目录的 `xiaoce-map-fullscreen.user.js`。该文件是唯一发布物，**不要直接编辑**；所有修改都落在 `src/`。

## 源码模块要点

| 模块 | 职责与注意点 |
| --- | --- |
| `10-constants` | 所有 CSS 类名、localStorage 键、时序常量。长按/双击阈值都在这里调整。 |
| `20-style` | 用模板字符串注入 `<style>`，全部带 `!important`，覆盖站点样式。全屏层 z-index `2147483000`，题面 `2147483002`，站点弹窗和图片预览抬到 `2147483010`。 |
| `30-utils` | `findContainer` / `isUiTarget`；对 `L.Map.prototype` 做无侵入包装，把实例记录到容器 `__xcfLeafletMap` 上，只用于 `invalidateSize()` 和读视图。 |
| `40-scale` | 记录用户是否主动缩放过；未缩放过时用进入前的 bounds 计算铺满视口的 zoom。 |
| `50-mode-settings` | 「网页全屏 / 屏幕全屏」偏好持久化与胶囊 UI。 |
| `60-question` | 直接复用站点真实 DOM 节点（标题、题号、题面、提交按钮），只加类名和样式；含图片的题目收起图片，按钮点击原图以打开站点预览。切题时 React 可能替换节点，靠 `questionPartsMissing` 检测并重新挂载。 |
| `70-fullscreen` | CSS `position: fixed` 全屏 + 同尺寸占位元素；屏幕模式对 `documentElement` 请求 Fullscreen API，失败自动回退网页模式。全屏/退出全屏兼容标准、`webkit`、`moz`、`ms` 前缀。 |
| `80-controls` | 右下角按钮、左下角胶囊、「显示题面」开关。按钮挂在地图容器内，并阻止事件冒泡给 Leaflet。 |
| `90-longpress` | 按住 420ms 后以约 2 级/秒连续缩放。缩放期间临时 `zoomSnap = 0`，用 Leaflet 捏合同款 `_move(center, zoom, { pinch: true })` 保持旧瓦片可见；松手后 `_animateZoom` 收尾并恢复 `zoomSnap`。只响应真实鼠标 / 触控板。 |
| `100-events` | MutationObserver 驱动 `scan()`；`scan()` 同时负责检测结算（见下）与重挂题面。另有 Esc、点击抑制、触摸双击识别。 |
| `110-init` | 入口：`injectStyle()`、`scan()`、注册文档级监听、Leaflet 懒加载轮询。 |

### 游戏结束自动退出

站点在最后一题提交后，把「提交 / 下一题」换成结算面板，并出现一个可见的「分享成绩」按钮。`100-events.js` 里的 `isGameFinished()` 用这个按钮判定结束；`scan()` 只在当前全屏期间从答题切换到结算时调用 `exitFullscreen()`。结算后用户主动重新全屏会保持全屏，下一局开始后重新允许自动退出。如果站点改文案，需要同步调整该函数。

### 加载与重建

脚本不依赖 React 内部实现：`scan()` 每次找到地图容器就确保控件存在，并处理地图重建（Leaflet 实例变化时重新绑定）。所有对站点的修改都通过类名和 CSS 完成。

## 发版流程

1. 修改 `src/` 下的源码。
2. 更新 `src/00-header.txt`：提升 `@version`、改 `@changelog` 一行摘要，并在版本历史注释顶部加一节。
3. 在 `CHANGELOG.md` 顶部「未发布」下方新增对应版本条目（遵循 Keep a Changelog + SemVer）。
4. 构建并检查语法：

   ```bash
   node build.mjs
   node --check xiaoce-map-fullscreen.user.js
   ```

5. 在目标页面检查功能，确认无回归。
6. 把 `xiaoce-map-fullscreen.user.js` 发布到 Greasy Fork，正文使用 `README.user.md` 的内容。

版本规则见 `CHANGELOG.md` 开头。

## 已知限制

- 长按缩放、比例尺同步依赖 Leaflet 实例；Mapbox / MapLibre 地图只支持全屏。
- 双击切全屏会占用 Leaflet 原生的双击放大；触摸端双击的第一次轻点仍会先到达站点（和桌面双击一致）。
- 屏幕全屏需要用户手势触发；Safari / iOS 不支持元素全屏时自动回退网页全屏。
- 依赖站点类名（如 `._wrapper_10jzm_1`）的地方已尽量收敛，但站点大改版仍可能需要同步调整选择器。

## 版本

当前版本：**1.6.2**（MIT License）
