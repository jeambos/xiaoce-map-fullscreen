// ==UserScript==
// @name         猜盐地图全屏
// @namespace    https://xiaoce.fun/
// @version      1.6.2
// @description  为猜盐的地理类游戏地图添加全屏按钮：支持网页全屏/屏幕全屏切换、双击切换、Esc 退出，左右键长按平滑缩放，全屏时自动同步比例尺，并可将题面叠加显示在地图上；游戏结束后自动退出全屏。
// @author       xiaoce-map-fullscreen
// @match        https://xiaoce.fun/*
// @match        https://www.xiaoce.fun/*
// @grant        none
// @run-at       document-idle
// @noframes
// @license      MIT
// @changelog    1.6.2 游戏结束时只自动退出全屏一次，结算后用户可主动重新全屏。
// ==/UserScript==

/* --------------------------------------------------------------------------
 * 版本历史（发布新版本时请同步这里和 CHANGELOG.md，并提升 @version）
 *
 * 1.6.2
 *   - 只在全屏期间首次出现结算时自动退出；结算后仍可手动进入全屏。
 *   - 下一局开始后重新允许结算自动退出。
 *
 * 1.6.1
 *   - 文字与图片混合的题目也收起图片，保留题目文字。
 *   - 「查看本题配图」调用网页原生图片预览，使用站点提供的缩放操作。
 *
 * 1.6.0
 *   - 修复退出或切换模式后，迟到的屏幕全屏请求可能让浏览器停留在全屏的问题。
 *   - 结算检测只检查当前游戏区域，避免页面其他位置的「分享成绩」触发退出。
 *   - 地图在长按期间重建时，恢复原地图的缩放设置，不影响新地图。
 *
 * 1.5.1
 *   - 左下角「网页全屏 / 屏幕全屏」「显示题面」的悬停效果与右下角「退出全屏」统一：
 *     只改变按钮填充，不改变文字颜色，避免悬停时文字变白看不清。
 *
 * 1.5.0
 *   - 游戏结束后（出现「分享成绩」结算面板）自动退出全屏，直接展示结算结果。
 *   - 「显示题面」改为默认开启，新用户首次全屏即可看到题面；之前手动关闭的仍然保持关闭。
 *   - 长按缩放速度由约 1.2 级/秒提升到约 2 级/秒。
 *   - 左下角按钮悬停时只轻微提亮，已启用按钮保持深色文字，修复悬停时白底白字。
 *
 * 1.4.0
 *   - 「显示题面」开启后，文字后面显示亮蓝色对勾。
 *   - 长按缩放改用 Leaflet 双指捏合相同的 _move 路径：
 *     缩放过程中只变换当前画面，不再每缩放一步就重新加载地图/出现空白。
 *   - 松开后才提交最终比例尺并加载新瓦片，旧画面保留到新瓦片可用。
 *   - 触摸端（iOS Safari / Android）双击地图切换全屏，不依赖浏览器补发 dblclick；
 *     长按缩放改为只响应真实鼠标 / 触控板，触摸端缩放使用双指捏合。

 *   - 全屏时禁止长按地图弹出系统菜单，底部按钮避开 iPhone 安全区。
 *   - 补充 Firefox、Chrome、Edge、Safari 的全屏 API、CSS 定位和悬浮效果兼容处理。
 *
 * 1.3.0
 *   - 长按左右键改为固定速度的连续缩放（约 1.2 级/秒），不再一格一格跳。
 *   - 统一左下角「网页全屏 / 屏幕全屏」和「显示题面」的配色：
 *     未启用为深灰底 + 浅灰字，已启用为亮色底 + 深灰字 + 深灰内边框。
 *   - 题面浮层（标题、简介、题号、题目文字）改为透明背景，减少对地图的干扰；
 *     提交按钮保持原样。
 *   - 图片题收起的按钮文案由「查看图片」改为「查看本题配图」。
 *
 * 1.2.0
 *   - 全屏左下角新增「显示题面」开关（位于全屏方式胶囊右侧）。
 *   - 开启后把标题、简介、题号和提交按钮固定在地图上层；文字题目直接显示。
 *   - 图片题目改为「查看图片」按钮，避免图片遮住地图、影响点击；
 *     点按钮打开大图预览，点背景/图片/关闭按钮或按 Esc 关闭。
 *
 * 1.1.0
 *   - 全屏左下角新增胶囊选择器，可在「网页全屏」和「屏幕全屏」之间即时切换，
 *     选择会被记住，之后的全屏操作沿用该设置。
 *   - 左键长按地图自动放大，右键长按自动缩小；以按下的位置为中心连续缩放。
 *   - 用户尚未缩放过比例尺时，进入全屏会自动放大地图，让原先的画面铺满屏幕；
 *     用户缩放过后则保持同一比例尺，两种模式之间切换不再改变地图尺寸。
 *
 * 1.0.0
 *   - 首个公开版本。
 *   - 在猜盐地图答题区右下角添加「全屏」按钮，全屏时显示「退出全屏」。
 *   - 双击地图切换全屏，Esc 退出全屏；全屏只铺满网页视口，不触发浏览器原生全屏。
 *   - 用同尺寸占位元素撑住原布局，退出后地图回到原位。
 *   - 对 Leaflet 实例调用 invalidateSize()，全屏后瓦片和控件正确铺满。
 *   - 通过 MutationObserver 适配单页应用切题、地图重建与动态加载的地图。
 *   - 地图有版权信息时按钮自动上移，避免遮挡；兼容深色模式。
 * -------------------------------------------------------------------------- */

(function () {
  'use strict';

  const MAP_SELECTOR = [
    '#when-where-map',
    '.leaflet-container',
    '.mapboxgl-map',
    '.maplibregl-map',
  ].join(',');

  const BUTTON_CLASS = 'xcf-map-fullscreen-btn';
  const MODE_CLASS = 'xcf-map-fs-mode';
  const MODE_OPTION_CLASS = 'xcf-map-fs-mode-option';
  const QUESTION_TOGGLE_CLASS = 'xcf-map-question-toggle';
  const MAP_FS_CLASS = 'xcf-map-fullscreen';
  const ROOT_FS_CLASS = 'xcf-map-fullscreen-active';
  const PLACEHOLDER_CLASS = 'xcf-map-fullscreen-placeholder';
  const STYLE_ID = 'xcf-map-fullscreen-style';

  // 显示题面浮层用的类名。
  const Q_HEADER_CLASS = 'xcf-map-question-header';
  const Q_COUNTER_CLASS = 'xcf-map-question-counter';
  const Q_BODY_CLASS = 'xcf-map-question-body';
  const Q_TEXT_CLASS = 'xcf-map-question-text';
  const Q_SUBMIT_CLASS = 'xcf-map-question-submit';
  const Q_VIEW_CLASS = 'xcf-map-question-view';
  const Q_IMAGE_HIDDEN_CLASS = 'xcf-map-question-image-hidden';

  const MODE_WEB = 'web';
  const MODE_SCREEN = 'screen';
  const MODE_STORAGE_KEY = 'xcf-map-fullscreen-mode';
  const QUESTION_STORAGE_KEY = 'xcf-map-question-visible';

  // 长按缩放的节奏：按住 420ms 后开始，以固定速度连续缩放（约 1.2 级/秒）。
  // 缩放过程复用 Leaflet 双指捏合的 _move 路径：只缩放当前画面，不逐级重新加载瓦片。
  const LONG_PRESS_DELAY = 420;
  const LONG_PRESS_MOVE_TOLERANCE = 8;
  const AUTO_ZOOM_RATE = 2;
  const CLICK_SUPPRESS_MS = 400;

  // 触摸端：浏览器会在手指抬起后补发一套鼠标事件，用它来区分真实指针。
  // 双击手势则用触摸事件自行识别，不依赖 iOS Safari 是否合成 dblclick。
  const TOUCH_SYNTH_MS = 600;
  const TOUCH_DOUBLE_TAP_MS = 320;
  const TOUCH_DOUBLE_TAP_DIST = 32;
  const TOUCH_TAP_MAX_MS = 280;

  const states = new WeakMap();
  let active = null;
  let screenRequestSerial = 0;
  let scanScheduled = false;
  let leafletPatchedFor = null;
  let pressOwner = null;
  let lastTouchAt = 0;
  let lastTouchDoubleTapAt = 0;

  // 题面浮层只属于当前正在全屏的地图。
  let questionOwner = null;
  let questionEnabled = readQuestionEnabled();
  let questionLayoutTimer = 0;
  let questionRefreshTimer = 0;

  /* ------------------------------------------------------------------ */
  /* 样式                                                               */
  /* ------------------------------------------------------------------ */

  function injectStyle() {
    if (document.getElementById(STYLE_ID)) return;

    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      html.${ROOT_FS_CLASS},
      html.${ROOT_FS_CLASS} body {
        overflow: hidden !important;
        overscroll-behavior: none !important;
      }

      .${MAP_FS_CLASS} {
        position: fixed !important;
        top: 0 !important;
        right: 0 !important;
        bottom: 0 !important;
        left: 0 !important;
        inset: 0 !important;
        width: 100vw !important;
        height: 100vh !important;
        height: 100dvh !important;
        min-width: 0 !important;
        min-height: 0 !important;
        max-width: none !important;
        max-height: none !important;
        margin: 0 !important;
        padding: 0 !important;
        border: 0 !important;
        border-radius: 0 !important;
        box-shadow: none !important;
        z-index: 2147483000 !important;
        background: #fff !important;
        /* iOS Safari：长按地图时不要弹出“存储图像 / 拷贝”系统菜单。 */
        -webkit-touch-callout: none !important;
        -webkit-user-select: none !important;
        user-select: none !important;
      }

      .${PLACEHOLDER_CLASS} {
        pointer-events: none !important;
        visibility: hidden !important;
        flex: none !important;
      }

      /* 全屏时让站点的提示、弹窗和图片预览仍然显示在地图上方。 */
      html.${ROOT_FS_CLASS} .ant-message,
      html.${ROOT_FS_CLASS} .ant-notification,
      html.${ROOT_FS_CLASS} .ant-popover,
      html.${ROOT_FS_CLASS} .ant-dropdown,
      html.${ROOT_FS_CLASS} .ant-tooltip,
      html.${ROOT_FS_CLASS} .ant-modal-mask,
      html.${ROOT_FS_CLASS} .ant-modal-wrap,
      html.${ROOT_FS_CLASS} .ant-image-preview-mask,
      html.${ROOT_FS_CLASS} .ant-image-preview-wrap,
      html.${ROOT_FS_CLASS} .ant-drawer-mask,
      html.${ROOT_FS_CLASS} .ant-drawer-content-wrapper {
        z-index: 2147483010 !important;
      }

      .${BUTTON_CLASS} {
        position: absolute !important;
        right: calc(12px + env(safe-area-inset-right, 0px)) !important;
        bottom: calc(12px + env(safe-area-inset-bottom, 0px)) !important;
        z-index: 1000 !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        gap: 4px !important;
        box-sizing: border-box !important;
        margin: 0 !important;
        padding: 8px 13px !important;
        border: 0 !important;
        border-radius: 999px !important;
        background: rgba(0, 0, 0, 0.66) !important;
        color: #fff !important;
        font: 600 13px/1 -apple-system, BlinkMacSystemFont, "Segoe UI",
          "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif !important;
        letter-spacing: 0.02em !important;
        white-space: nowrap !important;
        cursor: pointer !important;
        user-select: none !important;
        -webkit-user-select: none !important;
        -webkit-tap-highlight-color: transparent !important;
        touch-action: manipulation !important;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.24) !important;
        backdrop-filter: blur(6px) !important;
        -webkit-backdrop-filter: blur(6px) !important;
        transition: background 0.15s ease, transform 0.15s ease !important;
      }

      .${BUTTON_CLASS}:hover {
        background: rgba(0, 0, 0, 0.82) !important;
      }

      .${BUTTON_CLASS}:active {
        transform: scale(0.96) !important;
      }

      .${BUTTON_CLASS}:focus-visible {
        outline: 2px solid #1677ff !important;
        outline-offset: 2px !important;
      }

      .${BUTTON_CLASS}.xcf-map-fullscreen-btn--attribution {
        bottom: calc(42px + env(safe-area-inset-bottom, 0px)) !important;
      }

      .${MODE_CLASS} {
        position: absolute !important;
        left: calc(12px + env(safe-area-inset-left, 0px)) !important;
        bottom: calc(12px + env(safe-area-inset-bottom, 0px)) !important;
        z-index: 1000 !important;
        display: none !important;
        align-items: center !important;
        box-sizing: border-box !important;
        margin: 0 !important;
        padding: 2px !important;
        border-radius: 999px !important;
        background: rgba(0, 0, 0, 0.66) !important;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.24) !important;
        backdrop-filter: blur(6px) !important;
        -webkit-backdrop-filter: blur(6px) !important;
        user-select: none !important;
        -webkit-user-select: none !important;
        -webkit-tap-highlight-color: transparent !important;
        touch-action: manipulation !important;
        font: 600 12px/1 -apple-system, BlinkMacSystemFont, "Segoe UI",
          "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif !important;
      }

      .${MAP_FS_CLASS} > .${MODE_CLASS} {
        display: inline-flex !important;
      }

      .${MODE_OPTION_CLASS} {
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        box-sizing: border-box !important;
        margin: 0 !important;
        padding: 6px 10px !important;
        border: 0 !important;
        border-radius: 999px !important;
        background: transparent !important;
        color: rgba(255, 255, 255, 0.72) !important;
        font: inherit !important;
        line-height: 1 !important;
        white-space: nowrap !important;
        cursor: pointer !important;
        transition: background 0.15s ease, color 0.15s ease !important;
      }

      .${MODE_OPTION_CLASS}.is-active {
        background: #f7f7f7 !important;
        color: #333 !important;
        box-shadow: inset 0 0 0 1px #666,
          0 1px 4px rgba(0, 0, 0, 0.2) !important;
      }

      /* 悬停只改变填充，不改变文字颜色（与右下角「退出全屏」一致）。 */
      @media (hover: hover) and (pointer: fine) {
        .${MODE_OPTION_CLASS}:hover {
          background: rgba(255, 255, 255, 0.14) !important;
        }

        .${MODE_OPTION_CLASS}.is-active:hover {
          background: #fff !important;
        }
      }

      .${MODE_OPTION_CLASS}:focus-visible {
        outline: 2px solid #1677ff !important;
        outline-offset: 1px !important;
      }

      .${QUESTION_TOGGLE_CLASS} {
        position: absolute !important;
        left: var(--xcf-question-toggle-left, 160px) !important;
        bottom: calc(12px + env(safe-area-inset-bottom, 0px)) !important;
        z-index: 1000 !important;
        display: none !important;
        align-items: center !important;
        justify-content: center !important;
        box-sizing: border-box !important;
        margin: 0 !important;
        padding: 8px 12px !important;
        border: 0 !important;
        border-radius: 999px !important;
        background: rgba(0, 0, 0, 0.66) !important;
        color: rgba(255, 255, 255, 0.72) !important;
        font: 600 12px/1 -apple-system, BlinkMacSystemFont, "Segoe UI",
          "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif !important;
        white-space: nowrap !important;
        cursor: pointer !important;
        user-select: none !important;
        -webkit-user-select: none !important;
        -webkit-tap-highlight-color: transparent !important;
        touch-action: manipulation !important;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.24) !important;
        backdrop-filter: blur(6px) !important;
        -webkit-backdrop-filter: blur(6px) !important;
        transition: background 0.15s ease, color 0.15s ease !important;
      }

      .${QUESTION_TOGGLE_CLASS}.is-active {
        background: #f7f7f7 !important;
        color: #333 !important;
        box-shadow: inset 0 0 0 1px #666,
          0 2px 8px rgba(0, 0, 0, 0.2) !important;
      }

      .${QUESTION_TOGGLE_CLASS}.is-active::after {
        content: '' !important;
        display: block !important;
        box-sizing: border-box !important;
        width: 4px !important;
        height: 8px !important;
        margin-left: 6px !important;
        border: solid #1677ff !important;
        border-width: 0 2px 2px 0 !important;
        transform: rotate(45deg) translateY(-1px) !important;
      }

      /* 与右下角「退出全屏」一致：悬停只加深 / 提亮填充。 */
      @media (hover: hover) and (pointer: fine) {
        .${QUESTION_TOGGLE_CLASS}:hover {
          background: rgba(0, 0, 0, 0.82) !important;
        }

        .${QUESTION_TOGGLE_CLASS}.is-active:hover {
          background: #fff !important;
        }
      }

      .${QUESTION_TOGGLE_CLASS}:focus-visible {
        outline: 2px solid #1677ff !important;
        outline-offset: 2px !important;
      }

      .${MAP_FS_CLASS} > .${QUESTION_TOGGLE_CLASS} {
        display: inline-flex !important;
      }

      /* ---------- 全屏时叠加显示的题面 ---------- */

      .${Q_HEADER_CLASS} {
        position: fixed !important;
        top: 8px !important;
        left: 50% !important;
        transform: translateX(-50%) !important;
        box-sizing: border-box !important;
        width: 94vw !important;
        max-width: 720px !important;
        max-height: 32vh !important;
        overflow: auto !important;
        overscroll-behavior: contain !important;
        margin: 0 !important;
        padding: 10px 14px 12px !important;
        border-radius: 14px !important;
        background: transparent !important;
        backdrop-filter: none !important;
        -webkit-backdrop-filter: none !important;
        box-shadow: none !important;
        text-shadow: 0 1px 2px rgba(255, 255, 255, 0.9),
          0 0 10px rgba(255, 255, 255, 0.55) !important;
        z-index: 2147483002 !important;
        touch-action: manipulation !important;
      }

      .${Q_COUNTER_CLASS} {
        position: fixed !important;
        top: var(--xcf-question-counter-top, 96px) !important;
        left: 50% !important;
        transform: translateX(-50%) !important;
        box-sizing: border-box !important;
        width: max-content !important;
        max-width: 94vw !important;
        margin: 0 !important;
        padding: 4px 12px !important;
        border-radius: 999px !important;
        background: transparent !important;
        backdrop-filter: none !important;
        -webkit-backdrop-filter: none !important;
        box-shadow: none !important;
        pointer-events: none !important;
        text-shadow: 0 1px 2px rgba(255, 255, 255, 0.9),
          0 0 10px rgba(255, 255, 255, 0.55) !important;
        z-index: 2147483002 !important;
      }

      .${Q_BODY_CLASS} {
        position: fixed !important;
        top: var(--xcf-question-body-top, 128px) !important;
        left: 50% !important;
        transform: translateX(-50%) !important;
        box-sizing: border-box !important;
        width: 94vw !important;
        max-width: 576px !important;
        max-height: var(--xcf-question-body-max, 46vh) !important;
        overflow: auto !important;
        overscroll-behavior: contain !important;
        margin: 0 !important;
        z-index: 2147483002 !important;
      }

      .${Q_BODY_CLASS}.${Q_TEXT_CLASS} {
        padding: 0 !important;
        border-radius: 0 !important;
        background: transparent !important;
        backdrop-filter: none !important;
        -webkit-backdrop-filter: none !important;
        box-shadow: none !important;
        text-shadow: 0 1px 2px rgba(255, 255, 255, 0.9),
          0 0 10px rgba(255, 255, 255, 0.55) !important;
      }

      .${Q_IMAGE_HIDDEN_CLASS} {
        display: none !important;
      }

      .${Q_VIEW_CLASS} {
        position: fixed !important;
        top: var(--xcf-question-view-top, 128px) !important;
        left: 50% !important;
        transform: translateX(-50%) !important;
        z-index: 2147483002 !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        box-sizing: border-box !important;
        margin: 0 !important;
        padding: 10px 18px !important;
        border: 0 !important;
        border-radius: 999px !important;
        background: rgba(0, 0, 0, 0.74) !important;
        color: #fff !important;
        font: 600 13px/1 -apple-system, BlinkMacSystemFont, "Segoe UI",
          "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif !important;
        white-space: nowrap !important;
        cursor: pointer !important;
        user-select: none !important;
        -webkit-user-select: none !important;
        -webkit-tap-highlight-color: transparent !important;
        touch-action: manipulation !important;
        box-shadow: 0 4px 16px rgba(0, 0, 0, 0.28) !important;
        backdrop-filter: blur(6px) !important;
        -webkit-backdrop-filter: blur(6px) !important;
      }

      .${Q_VIEW_CLASS}:hover {
        background: rgba(0, 0, 0, 0.88) !important;
      }

      .${Q_VIEW_CLASS}:focus-visible {
        outline: 2px solid #1677ff !important;
        outline-offset: 2px !important;
      }

      .${Q_SUBMIT_CLASS} {
        position: fixed !important;
        left: 50% !important;
        bottom: calc(56px + env(safe-area-inset-bottom, 0px)) !important;
        transform: translateX(-50%) !important;
        box-sizing: border-box !important;
        width: 94vw !important;
        max-width: 576px !important;
        margin: 0 !important;
        z-index: 2147483002 !important;
        box-shadow: 0 6px 20px rgba(0, 0, 0, 0.24) !important;
      }

      @media (max-width: 480px) {
        .${BUTTON_CLASS} {
          padding: 7px 11px !important;
          font-size: 12px !important;
        }

        .${MODE_OPTION_CLASS} {
          padding: 5px 8px !important;
        }

        .${QUESTION_TOGGLE_CLASS} {
          padding: 7px 10px !important;
          font-size: 11px !important;
        }
      }
    `;
    (document.head || document.documentElement).appendChild(style);
  }

  /* ------------------------------------------------------------------ */
  /* 工具                                                               */
  /* ------------------------------------------------------------------ */

  function isMapReady(container) {
    return (
      container.classList.contains('leaflet-container') ||
      container.classList.contains('mapboxgl-map') ||
      container.classList.contains('maplibregl-map') ||
      !!container.querySelector('.leaflet-pane, .mapboxgl-canvas, .maplibregl-canvas')
    );
  }

  function findContainer(node) {
    if (!node || node.nodeType !== 1) return null;
    const element =
      node.closest && node.closest(MAP_SELECTOR)
        ? node.closest(MAP_SELECTOR)
        : null;
    return element && isMapReady(element) ? element : null;
  }

  /** 是否点在了脚本或地图自带的控件上（这些位置不触发长按缩放 / 双击全屏）。 */
  function isUiTarget(target) {
    if (!target || target.nodeType !== 1 || !target.closest) return false;
    return !!target.closest(
      `.${BUTTON_CLASS}, .${MODE_CLASS}, .${QUESTION_TOGGLE_CLASS}, .leaflet-control, .mapboxgl-ctrl, .maplibregl-ctrl`
    );
  }

  /**
   * Leaflet 实例没有全局注册表。这里给 L.Map 做一个无侵入的小补丁：
   * 1. 新地图创建后把实例记到容器上；
   * 2. 对于脚本启动前就已经存在的地图，在首次鼠标事件时记下实例。
   * 只用于调用 invalidateSize() 和读取视图，不会改变地图行为。
   */
  function patchLeaflet(container) {
    const L = window.L;
    if (!L || !L.Map || !L.Map.prototype) return;

    const proto = L.Map.prototype;
    if (leafletPatchedFor !== L) {
      leafletPatchedFor = L;

      const originalInitialize = proto.initialize;
      if (typeof originalInitialize === 'function') {
        proto.initialize = function (...args) {
          const result = originalInitialize.apply(this, args);
          try {
            if (this._container) this._container.__xcfLeafletMap = this;
          } catch (_) {
            /* ignore */
          }
          return result;
        };
      }

      const originalFindEventTargets = proto._findEventTargets;
      if (typeof originalFindEventTargets === 'function') {
        proto._findEventTargets = function (...args) {
          try {
            if (this._container) this._container.__xcfLeafletMap = this;
          } catch (_) {
            /* ignore */
          }
          return originalFindEventTargets.apply(this, args);
        };
      }
    }

    if (!container || container.__xcfLeafletMap) return;

    // 触发一次无害的 mousemove，让旧地图的 _findEventTargets 补丁抓住实例。
    try {
      const rect = container.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      container.dispatchEvent(
        new MouseEvent('mousemove', {
          bubbles: true,
          cancelable: true,
          clientX: rect.left + rect.width / 2,
          clientY: rect.top + rect.height / 2,
        })
      );
    } catch (_) {
      /* ignore */
    }
  }

  function getLeafletMap(container) {
    return container && container.__xcfLeafletMap;
  }

  function isOwnMap(state) {
    const map = state.map;
    return !!(
      map &&
      typeof map.getContainer === 'function' &&
      map.getContainer() === state.container
    );
  }

  /** 取地图实例；如果地图被重建则重新绑定并重置缩放状态。 */
  function getStateMap(state) {
    const map = getLeafletMap(state.container);
    if (map && map !== state.map) bindMap(state);
    return isOwnMap(state) ? state.map : null;
  }

  function refreshMapSize(container) {
    const map = getLeafletMap(container);
    if (
      map &&
      typeof map.invalidateSize === 'function' &&
      (!map.getContainer || map.getContainer() === container)
    ) {
      try {
        // 保留默认的 pan: true —— 容器变大/变小时 Leaflet 会平移地图，
        // 让视口中心的地理位置保持不变，这是“同步比例尺”能对上的前提。
        map.invalidateSize({ animate: false });
        return;
      } catch (_) {
        /* ignore and fall back to resize event */
      }
    }

    try {
      window.dispatchEvent(new Event('resize'));
    } catch (_) {
      /* ignore */
    }
  }

  /* ------------------------------------------------------------------ */
  /* 比例尺同步                                                          */
  /* ------------------------------------------------------------------ */

  /**
   * 计算“把 bounds 完整装进当前视口”所需的缩放级别。
   * 不直接用 map.getBoundsZoom()，因为它会按 zoomSnap 取整；
   * 这里返回精确的小数，避免全屏后地图被裁掉一部分或留下大片空白。
   */
  function computeFitZoom(map, bounds) {
    if (!bounds || typeof map.project !== 'function') return null;

    const size = map.getSize();
    if (!size || !size.x || !size.y) return null;

    const zoom = map.getZoom();
    let nw;
    let se;
    try {
      nw = map.project(bounds.getNorthWest(), zoom);
      se = map.project(bounds.getSouthEast(), zoom);
    } catch (_) {
      return null;
    }

    const width = Math.abs(se.x - nw.x);
    const height = Math.abs(se.y - nw.y);
    if (!(width > 0) || !(height > 0)) return null;

    const scale = Math.min(size.x / width, size.y / height);
    if (!(scale > 0) || !isFinite(scale)) return null;

    let target = zoom + Math.log(scale) / Math.LN2;
    const min = typeof map.getMinZoom === 'function' ? map.getMinZoom() : target;
    const max = typeof map.getMaxZoom === 'function' ? map.getMaxZoom() : target;
    target = Math.max(min, Math.min(max, target));
    return Math.round(target * 10000) / 10000;
  }

  /** 让地图保持中心不变，并按 bounds 适配到当前视口。 */
  function applyFittedView(state, bounds) {
    const map = state.map;
    if (!isOwnMap(state) || !bounds) return;

    const target = computeFitZoom(map, bounds);
    if (target == null || !isFinite(target)) return;
    if (Math.abs(target - map.getZoom()) < 0.0001) return;

    const snap = map.options ? map.options.zoomSnap : undefined;
    state.internalZoom = true;
    try {
      // 站点地图默认 zoomSnap = 1，会强行把小数缩放取整。临时关掉它，
      // 只为了让这一次适配保持精确；调用结束后立即还原。
      if (snap) map.options.zoomSnap = 0;
      map.setView(map.getCenter(), target, { animate: false });
    } catch (_) {
      /* ignore */
    } finally {
      if (snap) map.options.zoomSnap = snap;
      state.internalZoom = false;
    }
  }

  /** 全屏尺寸变化后：未缩放过则把进入前的画面重新铺满视口。 */
  function syncViewAfterResize(state) {
    if (!active || active.state !== state) return;
    if (state.userZoomed || !state.syncBounds) return;
    applyFittedView(state, state.syncBounds);
  }

  /** 记录地图的缩放事件，用来判断用户是否亲自调整过比例尺。 */
  function bindMap(state) {
    const map = getLeafletMap(state.container);
    if (!map || map === state.map) return;

    if (state.map && state.onZoomStart && state.map.off) {
      try {
        state.map.off('zoomstart', state.onZoomStart);
      } catch (_) {
        /* ignore */
      }
    }

    state.map = map;
    state.userZoomed = false;
    state.syncBounds = null;
    state.userZoomIntentUntil = 0;

    state.onZoomStart = () => {
      if (state.internalZoom) return;
      // 只有用户自己触发的缩放才算“缩放过比例尺”，站点代码的自动缩放不算。
      if (Date.now() > (state.userZoomIntentUntil || 0)) return;
      state.userZoomed = true;
    };

    if (typeof map.on === 'function') {
      try {
        map.on('zoomstart', state.onZoomStart);
      } catch (_) {
        /* ignore */
      }
    }
  }

  /** 标记“接下来的缩放来自用户操作”，给 zoomstart 判断用。 */
  function markUserZoomIntent(state) {
    if (!state) return;
    state.userZoomIntentUntil = Date.now() + 1500;
  }

  /* ------------------------------------------------------------------ */
  /* 全屏方式设置                                                        */
  /* ------------------------------------------------------------------ */

  function readPreferredMode() {
    try {
      const value = window.localStorage.getItem(MODE_STORAGE_KEY);
      if (value === MODE_WEB || value === MODE_SCREEN) return value;
    } catch (_) {
      /* ignore */
    }
    return MODE_WEB;
  }

  function savePreferredMode(mode) {
    try {
      window.localStorage.setItem(MODE_STORAGE_KEY, mode);
    } catch (_) {
      /* ignore */
    }
  }

  function updateModeUI(state) {
    if (!state.capsule) return;
    const options = state.capsule.querySelectorAll(`[data-mode]`);
    for (const option of options) {
      const on = option.getAttribute('data-mode') === state.mode;
      option.classList.toggle('is-active', on);
      option.setAttribute('aria-pressed', on ? 'true' : 'false');
    }
  }

  function updateModeVisibility(state) {
    if (!state.capsule) return;
    state.capsule.setAttribute(
      'aria-hidden',
      active && active.state === state ? 'false' : 'true'
    );
  }

  /* ------------------------------------------------------------------ */
  /* 显示题面                                                            */
  /* ------------------------------------------------------------------ */

  function readQuestionEnabled() {
    try {
      const value = window.localStorage.getItem(QUESTION_STORAGE_KEY);
      if (value === '0') return false;
      if (value === '1') return true;
    } catch (_) {
      /* ignore */
    }
    // 没有保存过选择时默认开启（新用户第一次全屏就能看到题面）。
    return true;
  }

  function saveQuestionEnabled(value) {
    try {
      window.localStorage.setItem(QUESTION_STORAGE_KEY, value ? '1' : '0');
    } catch (_) {
      /* ignore */
    }
  }

  function updateQuestionUI() {
    const toggles = document.querySelectorAll(`.${QUESTION_TOGGLE_CLASS}`);
    for (const toggle of toggles) {
      toggle.classList.toggle('is-active', questionEnabled);
      toggle.setAttribute('aria-pressed', questionEnabled ? 'true' : 'false');
      toggle.title = questionEnabled
        ? '隐藏题面（标题、简介和题目）'
        : '在地图上叠加显示标题、简介和题目';
    }
  }

  function updateQuestionVisibility(state) {
    if (!state.questionToggle) return;
    state.questionToggle.setAttribute(
      'aria-hidden',
      active && active.state === state ? 'false' : 'true'
    );
  }

  /** 让「显示题面」紧跟在全屏方式胶囊右侧。 */
  function syncQuestionTogglePosition(state) {
    if (!state || !state.questionToggle || !state.capsule) return;
    const width = state.capsule.getBoundingClientRect().width;
    const left = 12 + (width > 0 ? width : 136) + 8;
    state.questionToggle.style.setProperty(
      '--xcf-question-toggle-left',
      `${Math.round(left)}px`
    );
  }

  function directChildContaining(parent, node) {
    let current = node;
    while (current && current.parentElement !== parent) {
      current = current.parentElement;
    }
    return current && current.parentElement === parent ? current : null;
  }

  /** 从地图往上找包含页面标题的那层容器（猜盐的题目卡片）。 */
  function findQuestionWrapper(container) {
    let node = container;
    for (let i = 0; i < 8; i += 1) {
      node = node.parentElement;
      if (!node) break;
      try {
        if (
          node.querySelector &&
          node.querySelector('[data-xiaoce-page-title]')
        ) {
          return node;
        }
      } catch (_) {
        /* ignore */
      }
      if (node === document.body) break;
    }
    return null;
  }

  /**
   * 找出题目卡片里的标题、题号、题面和提交按钮。
   * 这些元素保持原地不动，只通过 fixed 定位和 z-index 浮到地图上方，
   * 因此站点的点击处理和 React 渲染都不受影响。
   */
  function findQuestionParts(container) {
    const parts = {
      header: null,
      counter: null,
      body: null,
      submit: null,
      images: [],
    };

    const wrapper = findQuestionWrapper(container);
    if (wrapper) {
      const title =
        wrapper.querySelector('[data-xiaoce-page-title]') ||
        wrapper.querySelector('h1, h2, h3');
      if (title) {
        const candidate = directChildContaining(wrapper, title);
        if (
          candidate &&
          !candidate.contains(container) &&
          !candidate.querySelector(MAP_SELECTOR)
        ) {
          parts.header = candidate;
        }
      }
    }

    const mapParent = container.parentElement;
    if (mapParent) {
      for (const child of mapParent.children) {
        if (child === container) continue;
        if (
          child.tagName === 'BUTTON' ||
          child.classList.contains('ant-btn') ||
          child.getAttribute('role') === 'button'
        ) {
          parts.submit = child;
          break;
        }
      }

      const contentFlex = mapParent.parentElement;
      if (contentFlex) {
        const children = [...contentFlex.children];
        const index = children.indexOf(mapParent);
        const before = index >= 0 ? children.slice(0, index) : [];
        parts.counter =
          before.find((element) => element.tagName === 'SPAN') || null;
        const bodyCandidates = before.filter(
          (element) => element !== parts.counter && !element.contains(container)
        );
        parts.body = bodyCandidates.length
          ? bodyCandidates[bodyCandidates.length - 1]
          : null;
      }
    }

    if (parts.body) {
      parts.images = [...parts.body.querySelectorAll('img')];
    }
    return parts;
  }

  function isImageQuestion(parts) {
    if (!parts || !parts.body || !parts.images.length) return false;
    return parts.body.textContent.replace(/\s+/g, '') === '';
  }

  function refreshQuestionContent(owner) {
    if (!owner || !owner.parts) return;
    const parts = owner.parts;
    for (const host of owner.hiddenImageHosts || []) {
      host.classList.remove(Q_IMAGE_HIDDEN_CLASS);
    }
    owner.hiddenImageHosts = [];
    if (parts.body) {
      parts.images = [...parts.body.querySelectorAll('img')];
    }

    // 图片无论是否伴随文字都收起；文字仍留在题面浮层。
    const imageQuestion = isImageQuestion(parts);
    owner.imageQuestion = imageQuestion;
    owner.hasQuestionImages = parts.images.length > 0;

    if (parts.body) {
      parts.body.classList.toggle(Q_BODY_CLASS, !imageQuestion);
      parts.body.classList.toggle(Q_TEXT_CLASS, !imageQuestion);
    }

    if (owner.hasQuestionImages) {
      for (const image of parts.images) {
        const host = image.closest('.ant-image') || image;
        host.classList.add(Q_IMAGE_HIDDEN_CLASS);
        owner.hiddenImageHosts.push(host);
      }
      ensureQuestionViewButton(owner);
    } else {
      removeQuestionViewButton(owner);
    }
  }

  function ensureQuestionViewButton(owner) {
    if (!owner.viewButton || !owner.viewButton.isConnected) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = Q_VIEW_CLASS;
      button.textContent = '查看本题配图';
      button.setAttribute('aria-label', '查看本题配图');
      button.title = '查看本题配图';
      button.addEventListener(
        'click',
        (event) => {
          event.preventDefault();
          event.stopPropagation();
          openQuestionImagePreview(owner);
        },
        true
      );
      document.body.appendChild(button);
      owner.viewButton = button;
    }
    owner.viewButton.setAttribute('aria-hidden', 'false');
  }

  function removeQuestionViewButton(owner) {
    if (!owner) return;
    if (owner.viewButton) {
      owner.viewButton.remove();
      owner.viewButton = null;
    }
  }

  function openQuestionImagePreview(owner) {
    if (!owner || !owner.parts.images.length) return;
    owner.parts.images[0].click();
  }

  function clearQuestionOverlay(state) {
    const owner = questionOwner;
    if (!owner) return;
    if (state && owner.state !== state) return;

    if (owner.observer) {
      owner.observer.disconnect();
      owner.observer = null;
    }

    const parts = owner.parts;
    for (const host of owner.hiddenImageHosts || []) {
      host.classList.remove(Q_IMAGE_HIDDEN_CLASS);
    }
    if (parts) {
      [parts.header, parts.counter, parts.body, parts.submit].forEach(
        (element) => {
          if (!element) return;
          element.classList.remove(
            Q_HEADER_CLASS,
            Q_COUNTER_CLASS,
            Q_BODY_CLASS,
            Q_TEXT_CLASS,
            Q_SUBMIT_CLASS
          );
        }
      );
    }

    removeQuestionViewButton(owner);

    if (owner.state) owner.state.questionParts = null;
    questionOwner = null;

    const root = document.documentElement;
    root.style.removeProperty('--xcf-question-counter-top');
    root.style.removeProperty('--xcf-question-body-top');
    root.style.removeProperty('--xcf-question-body-max');
    root.style.removeProperty('--xcf-question-view-top');
  }

  function layoutQuestionOverlay(state) {
    const owner = questionOwner;
    if (!active || active.state !== state || !owner || owner.state !== state) {
      return;
    }

    const { header, counter, body, submit } = owner.parts;
    const viewportHeight =
      window.innerHeight || document.documentElement.clientHeight || 0;
    const measure = (element) =>
      element && element.isConnected ? element.getBoundingClientRect() : null;

    const headerRect = measure(header);
    const counterRect = measure(counter);
    const submitRect = measure(submit);
    const bodyRect = measure(body);

    const top = 8;
    const counterTop =
      top + (headerRect ? headerRect.height : 0) + (headerRect ? 6 : 0);
    const bodyTop =
      counterTop +
      (counterRect ? counterRect.height : 0) +
      (counterRect ? 6 : 0);

    const submitHeight = submitRect ? submitRect.height : 36;
    const submitTop = viewportHeight - 56 - submitHeight;
    const bodyMax = Math.max(80, submitTop - bodyTop - 12);

    const root = document.documentElement;
    root.style.setProperty(
      '--xcf-question-counter-top',
      `${Math.round(counterTop)}px`
    );
    root.style.setProperty(
      '--xcf-question-body-top',
      `${Math.round(bodyTop)}px`
    );
    root.style.setProperty(
      '--xcf-question-body-max',
      `${Math.round(bodyMax)}px`
    );
    root.style.setProperty(
      '--xcf-question-view-top',
      `${Math.round(owner.imageQuestion ? bodyTop : Math.min(submitTop - 48, bodyTop + (bodyRect ? bodyRect.height : 0) + 8))}px`
    );
  }

  function scheduleQuestionLayout(state) {
    clearTimeout(questionLayoutTimer);
    questionLayoutTimer = setTimeout(() => {
      if (!active || active.state !== state) return;
      layoutQuestionOverlay(state);
    }, 60);
  }

  function refreshQuestionOverlay(state) {
    const owner = questionOwner;
    if (!active || active.state !== state || !owner || owner.state !== state) {
      return;
    }

    const { header, counter, body, submit } = owner.parts;
    if (!body || !body.isConnected) {
      applyQuestionOverlay(state);
      return;
    }

    if (header && header.isConnected) header.classList.add(Q_HEADER_CLASS);
    if (counter && counter.isConnected) counter.classList.add(Q_COUNTER_CLASS);
    if (submit && submit.isConnected) submit.classList.add(Q_SUBMIT_CLASS);
    refreshQuestionContent(owner);
    scheduleQuestionLayout(state);
  }

  function scheduleQuestionRefresh() {
    clearTimeout(questionRefreshTimer);
    questionRefreshTimer = setTimeout(() => {
      if (!active || !questionOwner) return;
      refreshQuestionOverlay(active.state);
    }, 80);
  }

  function applyQuestionOverlay(state) {
    if (!active || active.state !== state || !questionEnabled) return;

    if (
      questionOwner &&
      questionOwner.state === state &&
      questionOwner.parts.body &&
      questionOwner.parts.body.isConnected
    ) {
      const current = questionOwner.parts;
      const allConnected = [
        current.header,
        current.counter,
        current.body,
        current.submit,
      ].every((element) => !element || element.isConnected);
      if (allConnected) {
        refreshQuestionOverlay(state);
        return;
      }
    }

    clearQuestionOverlay();

    const parts = findQuestionParts(state.container);
    if (!parts.header && !parts.counter && !parts.body && !parts.submit) {
      return;
    }

    if (parts.header) parts.header.classList.add(Q_HEADER_CLASS);
    if (parts.counter) parts.counter.classList.add(Q_COUNTER_CLASS);
    if (parts.submit) parts.submit.classList.add(Q_SUBMIT_CLASS);

    const owner = {
      state,
      parts,
      observer: null,
      imageQuestion: false,
      hasQuestionImages: false,
      hiddenImageHosts: [],
      viewButton: null,
    };
    questionOwner = owner;
    state.questionParts = parts;

    refreshQuestionContent(owner);

    if (typeof MutationObserver !== 'undefined') {
      owner.observer = new MutationObserver(() => scheduleQuestionRefresh());
      [parts.body, parts.header, parts.counter].forEach((element) => {
        if (!element) return;
        try {
          owner.observer.observe(element, {
            childList: true,
            subtree: true,
            characterData: true,
            attributes: true,
            attributeFilter: ['src'],
          });
        } catch (_) {
          /* ignore */
        }
      });
    }

    layoutQuestionOverlay(state);
    scheduleQuestionLayout(state);
  }

  function toggleQuestion(state) {
    questionEnabled = !questionEnabled;
    saveQuestionEnabled(questionEnabled);
    updateQuestionUI();

    if (!active || active.state !== state) return;
    if (questionEnabled) {
      applyQuestionOverlay(state);
    } else {
      clearQuestionOverlay(state);
    }
  }

  /* ------------------------------------------------------------------ */
  /* 全屏切换                                                           */
  /* ------------------------------------------------------------------ */

  function getFullscreenElement() {
    return (
      document.fullscreenElement ||
      document.webkitFullscreenElement ||
      document.webkitCurrentFullScreenElement ||
      document.mozFullScreenElement ||
      document.msFullscreenElement ||
      null
    );
  }

  function isDocumentFullscreenOf(container) {
    const element = getFullscreenElement();
    if (!element) return false;
    // 屏幕全屏会请求整个文档（这样题面浮层也能显示），同时兼容旧行为。
    return (
      element === document.documentElement ||
      element === document.body ||
      element === container
    );
  }

  function enterDocumentFullscreen() {
    const target = document.documentElement || document.body;
    if (!target) return Promise.reject(new Error('unsupported'));

    const request =
      target.requestFullscreen ||
      target.webkitRequestFullscreen ||
      target.webkitRequestFullScreen ||
      target.mozRequestFullScreen ||
      target.msRequestFullscreen;

    if (!request) return Promise.reject(new Error('unsupported'));

    try {
      const result = request.call(target);
      return result && typeof result.then === 'function'
        ? result
        : Promise.resolve();
    } catch (error) {
      return Promise.reject(error);
    }
  }

  function exitDocumentFullscreen() {
    if (!getFullscreenElement()) return;
    try {
      const exit =
        document.exitFullscreen ||
        document.webkitExitFullscreen ||
        document.webkitCancelFullScreen ||
        document.mozCancelFullScreen ||
        document.msExitFullscreen;
      if (!exit) return;
      const result = exit.call(document);
      if (result && typeof result.catch === 'function') {
        result.catch(() => {});
      }
    } catch (_) {
      /* ignore */
    }
  }

  /** 屏幕全屏申请失败时，回退到网页全屏，避免按钮状态和实际状态不一致。 */
  function fallbackToWebMode(state) {
    if (state.mode !== MODE_SCREEN) return;
    state.mode = MODE_WEB;
    savePreferredMode(MODE_WEB);
    updateModeUI(state);
  }

  function requestScreenMode(state) {
    if (isDocumentFullscreenOf(state.container)) return;

    const requestSerial = ++screenRequestSerial;
    enterDocumentFullscreen().then(
      () => {
        if (
          requestSerial !== screenRequestSerial ||
          !active ||
          active.state !== state ||
          state.mode !== MODE_SCREEN
        ) {
          if ((!active || active.state.mode !== MODE_SCREEN) &&
              isDocumentFullscreenOf(state.container)) {
            exitDocumentFullscreen();
          }
          return;
        }
        scheduleSizeRefresh(state);
      },
      () => {
        if (
          requestSerial === screenRequestSerial &&
          active && active.state === state && state.mode === MODE_SCREEN
        ) {
          if (isDocumentFullscreenOf(state.container)) {
            scheduleSizeRefresh(state);
          } else {
            fallbackToWebMode(state);
          }
        }
      }
    );
  }

  function switchMode(state, mode) {
    if (mode !== MODE_WEB && mode !== MODE_SCREEN) return;
    if (state.mode === mode) return;

    state.mode = mode;
    savePreferredMode(mode);
    updateModeUI(state);

    if (!active || active.state !== state) return;

    if (mode === MODE_SCREEN) {
      requestScreenMode(state);
    } else {
      screenRequestSerial += 1;
      // 先切到网页模式，再退出系统全屏；fullscreenchange 会因此保持网页全屏。
      exitDocumentFullscreen();
    }
  }

  function updateButton(state) {
    const { button, container } = state;
    const isFullscreen = container.classList.contains(MAP_FS_CLASS);
    const label = isFullscreen ? '退出全屏' : '全屏';
    if (button.textContent !== label) button.textContent = label;
    button.setAttribute('aria-label', isFullscreen ? '退出地图全屏' : '地图全屏');
    button.setAttribute('aria-pressed', isFullscreen ? 'true' : 'false');
    button.title = isFullscreen ? '退出全屏（Esc）' : '全屏查看地图';
  }

  function addPlaceholder(state) {
    const { container } = state;
    const parent = container.parentElement;
    if (!parent) return;

    const rect = container.getBoundingClientRect();
    const placeholder = document.createElement('div');
    placeholder.className = PLACEHOLDER_CLASS;
    placeholder.setAttribute('aria-hidden', 'true');
    placeholder.style.width = `${rect.width}px`;
    placeholder.style.height = `${rect.height}px`;

    parent.insertBefore(placeholder, container);
    state.placeholder = placeholder;
  }

  function removePlaceholder(state) {
    if (state.placeholder && state.placeholder.isConnected) {
      state.placeholder.remove();
    }
    state.placeholder = null;
  }

  function clearSizeTimers(state) {
    if (!state.sizeTimers) return;
    state.sizeTimers.forEach((id) => clearTimeout(id));
    state.sizeTimers = [];
  }

  function scheduleSizeRefresh(state) {
    clearSizeTimers(state);
    const run = () => {
      if (!active || active.state !== state) return;
      refreshMapSize(state.container);
      syncViewAfterResize(state);
      if (questionOwner && questionOwner.state === state) {
        layoutQuestionOverlay(state);
        syncQuestionTogglePosition(state);
      }
    };
    state.sizeTimers = [
      setTimeout(run, 0),
      setTimeout(run, 120),
      setTimeout(run, 480),
    ];
  }
  function enterFullscreen(container, mode) {
    if (active) {
      if (active.container === container) return;
      exitFullscreen();
    }

    const state = states.get(container);
    if (!state) return;

    // 只对正在全屏时新出现的结算执行自动退出；结算页仍可手动全屏。
    state.gameFinished = isGameFinished(container);

    if (mode === MODE_WEB || mode === MODE_SCREEN) {
      state.mode = mode;
      savePreferredMode(mode);
    }

    getStateMap(state);

    state.scrollX = window.scrollX;
    state.scrollY = window.scrollY;
    state.originalAriaHidden = container.getAttribute('aria-hidden');

    // 进入前用户看到的范围。未缩放过时，全屏后用它把画面重新铺满。
    state.syncBounds =
      !state.userZoomed && isOwnMap(state) && typeof state.map.getBounds === 'function'
        ? state.map.getBounds()
        : null;

    addPlaceholder(state);
    container.classList.add(MAP_FS_CLASS);
    container.removeAttribute('aria-hidden');
    document.documentElement.classList.add(ROOT_FS_CLASS);

    active = { container, state };
    updateButton(state);
    updateModeUI(state);
    updateModeVisibility(state);
    updateQuestionVisibility(state);
    syncQuestionTogglePosition(state);

    if (questionEnabled) applyQuestionOverlay(state);

    if (state.mode === MODE_SCREEN) requestScreenMode(state);

    scheduleSizeRefresh(state);
  }

  function exitFullscreen() {
    if (!active) return;

    screenRequestSerial += 1;
    const { container, state } = active;
    const restoreBounds = state.userZoomed ? null : state.syncBounds;

    active = null;
    state.syncBounds = null;
    cancelLongPress(state, false);

    container.classList.remove(MAP_FS_CLASS);
    if (state.originalAriaHidden != null) {
      container.setAttribute('aria-hidden', state.originalAriaHidden);
    } else {
      container.removeAttribute('aria-hidden');
    }

    document.documentElement.classList.remove(ROOT_FS_CLASS);
    removePlaceholder(state);
    clearSizeTimers(state);
    clearTimeout(questionRefreshTimer);
    clearQuestionOverlay(state);
    updateButton(state);
    updateModeVisibility(state);
    updateQuestionVisibility(state);

    if (isDocumentFullscreenOf(container)) exitDocumentFullscreen();

    // 等浏览器完成布局恢复后再让 Leaflet 重新计算尺寸并回到原来的比例尺。
    // 不用 requestAnimationFrame：后台标签页里它可能被暂停。
    const restore = () => {
      if (active) return;
      refreshMapSize(container);
      if (restoreBounds) applyFittedView(state, restoreBounds);
    };

    setTimeout(() => {
      restore();
      window.scrollTo(state.scrollX || 0, state.scrollY || 0);
    }, 0);
    setTimeout(restore, 120);
    setTimeout(restore, 480);
  }

  function toggleFullscreen(container) {
    if (active && active.container === container) {
      exitFullscreen();
    } else {
      enterFullscreen(container);
    }
  }

  /* ------------------------------------------------------------------ */
  /* 按钮与全屏方式选择器                                                */
  /* ------------------------------------------------------------------ */

  function stopMapEvent(event) {
    event.stopPropagation();
  }

  function createButton(state) {
    const { container } = state;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = BUTTON_CLASS;
    button.setAttribute('aria-label', '地图全屏');
    button.setAttribute('aria-pressed', 'false');
    button.textContent = '全屏';

    // 避免 Leaflet / Mapbox 把按钮上的操作当成地图操作（拖拽、点击标点、双击缩放等）。
    ['pointerdown', 'mousedown', 'touchstart', 'dblclick', 'contextmenu'].forEach(
      (type) => {
        button.addEventListener(type, stopMapEvent, { passive: true });
      }
    );

    let lastClickAt = 0;
    button.addEventListener(
      'click',
      (event) => {
        event.preventDefault();
        event.stopPropagation();
        const now = Date.now();
        if (now - lastClickAt < 350) return;
        lastClickAt = now;
        toggleFullscreen(container);
      },
      true
    );

    container.appendChild(button);
    state.button = button;
    updateButton(state);
  }

  function createModeSwitch(state) {
    const { container } = state;
    const capsule = document.createElement('div');
    capsule.className = MODE_CLASS;
    capsule.setAttribute('role', 'group');
    capsule.setAttribute('aria-label', '全屏方式');
    capsule.setAttribute('aria-hidden', 'true');

    const options = [
      {
        mode: MODE_WEB,
        label: '网页全屏',
        title: '地图铺满网页视口，不进入系统全屏',
      },
      {
        mode: MODE_SCREEN,
        label: '屏幕全屏',
        title: '进入浏览器全屏，铺满整个屏幕',
      },
    ];

    options.forEach(({ mode, label, title }) => {
      const option = document.createElement('button');
      option.type = 'button';
      option.className = MODE_OPTION_CLASS;
      option.setAttribute('data-mode', mode);
      option.setAttribute('aria-pressed', 'false');
      option.title = title;
      option.textContent = label;
      capsule.appendChild(option);
    });

    ['pointerdown', 'mousedown', 'touchstart', 'dblclick', 'contextmenu'].forEach(
      (type) => {
        capsule.addEventListener(type, stopMapEvent, { passive: true });
      }
    );

    capsule.addEventListener(
      'click',
      (event) => {
        const option = event.target.closest(`.${MODE_OPTION_CLASS}`);
        if (!option) return;
        event.preventDefault();
        event.stopPropagation();

        const mode = option.getAttribute('data-mode');
        if (active && active.state === state) {
          switchMode(state, mode);
        } else {
          enterFullscreen(container, mode);
        }
      },
      true
    );

    container.appendChild(capsule);
    state.capsule = capsule;
    updateModeUI(state);
  }

  function createQuestionToggle(state) {
    const { container } = state;
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = QUESTION_TOGGLE_CLASS;
    toggle.textContent = '显示题面';
    toggle.setAttribute('aria-pressed', questionEnabled ? 'true' : 'false');
    toggle.setAttribute('aria-hidden', 'true');

    ['pointerdown', 'mousedown', 'touchstart', 'dblclick', 'contextmenu'].forEach(
      (type) => {
        toggle.addEventListener(type, stopMapEvent, { passive: true });
      }
    );

    toggle.addEventListener(
      'click',
      (event) => {
        event.preventDefault();
        event.stopPropagation();
        toggleQuestion(state);
      },
      true
    );

    container.appendChild(toggle);
    state.questionToggle = toggle;
    updateQuestionUI();
    syncQuestionTogglePosition(state);
  }

  function ensureControls(container) {
    if (!container || !isMapReady(container)) return;

    patchLeaflet(container);

    let state = states.get(container);
    if (!state) {
      state = {
        container,
        button: null,
        capsule: null,
        questionToggle: null,
        questionParts: null,
        gameFinished: false,
        placeholder: null,
        sizeTimers: [],
        scrollX: 0,
        scrollY: 0,
        originalAriaHidden: null,
        mode: readPreferredMode(),
        map: null,
        onZoomStart: null,
        internalZoom: false,
        userZoomed: false,
        userZoomIntentUntil: 0,
        syncBounds: null,
        longPress: null,
        suppressClickUntil: 0,
        lastTap: null,
        touchTap: null,
        eventsBound: false,
        resizeObserver: null,
      };
      states.set(container, state);
    }

    bindMap(state);
    bindContainerEvents(state);

    if (!state.button || !state.button.isConnected) {
      createButton(state);
    } else if (state.button.parentElement !== container) {
      // 极端情况下被第三方代码移动，重新挂回地图容器。
      container.appendChild(state.button);
    }

    if (!state.capsule || !state.capsule.isConnected) {
      createModeSwitch(state);
    } else if (state.capsule.parentElement !== container) {
      container.appendChild(state.capsule);
    }

    if (!state.questionToggle || !state.questionToggle.isConnected) {
      createQuestionToggle(state);
    } else if (state.questionToggle.parentElement !== container) {
      container.appendChild(state.questionToggle);
    }

    syncQuestionTogglePosition(state);
    updateQuestionUI();

    if (state.button && state.button.parentElement === container) {
      updateButton(state);
      const hasAttribution = !!container.querySelector(
        '.leaflet-control-attribution'
      );
      state.button.classList.toggle(
        'xcf-map-fullscreen-btn--attribution',
        hasAttribution
      );
    }

    updateModeUI(state);
    updateModeVisibility(state);

    // 地图容器尺寸变化时，通知 Leaflet / Mapbox 重新计算尺寸。
    if (!state.resizeObserver && typeof ResizeObserver !== 'undefined') {
      state.resizeObserver = new ResizeObserver(() => {
        if (active && active.state === state) {
          setTimeout(() => {
            refreshMapSize(container);
            syncViewAfterResize(state);
            if (questionOwner && questionOwner.state === state) {
              scheduleQuestionLayout(state);
              syncQuestionTogglePosition(state);
            }
          }, 0);
        }
      });
      state.resizeObserver.observe(container);
    }
  }

  /* ------------------------------------------------------------------ */
  /* 长按自动缩放                                                        */
  /* ------------------------------------------------------------------ */

  function restoreAutoZoomSnap(state, press) {
    if (!press || !press.snapChanged) return;
    press.snapChanged = false;
    const map = press.map;
    if (!map || !map.options) return;
    try {
      map.options.zoomSnap = press.snap;
    } catch (_) {
      /* ignore */
    }
  }

  /**
   * 长按结束后把临时视图提交为正式视图。
   * 尽量复用 Leaflet 捏合缩放结束时的 _animateZoom：
   * 旧瓦片一直保留并继续缩放，新瓦片加载完成后再淡入替换。
   */
  function finishAutoZoom(state, press) {
    if (!press || !press.active || !press.moved) {
      restoreAutoZoomSnap(state, press);
      return;
    }

    const map = getStateMap(state);
    if (!map || map !== press.map) {
      restoreAutoZoomSnap(state, press);
      return;
    }

    const center = press.finalCenter || map.getCenter();
    const zoom =
      typeof press.finalZoom === 'number' ? press.finalZoom : map.getZoom();

    // 先恢复站点原有的 zoomSnap，再触发收尾动画；
    // 最终级别仍保留小数，不会跳回整数。
    restoreAutoZoomSnap(state, press);

    try {
      // 与 Leaflet 双指捏合结束时的处理完全一致：
      // 旧瓦片继续放大到最终比例尺，新瓦片加载后在过渡结束时替换。
      if (map._zoomAnimated && typeof map._animateZoom === 'function') {
        map._animateZoom(center, zoom, true);
        return;
      }
    } catch (_) {
      /* fall through */
    }

    try {
      if (typeof map._resetView === 'function') {
        map._resetView(center, zoom);
      } else if (typeof map.setView === 'function') {
        map.setView(center, zoom, { animate: false });
      }
    } catch (_) {
      /* ignore */
    }
  }

  function cancelLongPress(state, suppress) {
    if (!state || !state.longPress) return;

    const press = state.longPress;
    state.longPress = null;
    if (pressOwner && pressOwner.state === state) pressOwner = null;

    clearTimeout(press.timer);
    if (press.raf) cancelAnimationFrame(press.raf);
    finishAutoZoom(state, press);

    if (suppress) {
      state.suppressClickUntil = Date.now() + CLICK_SUPPRESS_MS;
    }
  }

  function beginAutoZoom(state, press) {
    if (!state || state.longPress !== press) return;

    const map = getStateMap(state);
    if (!map || !press.latlng) {
      cancelLongPress(state, false);
      return;
    }

    // 优先复用 Leaflet 双指捏合的 _move 路径：缩放过程中只变换当前画面，
    // 不逐帧重新加载瓦片，因此不会出现一级一级的空白闪烁。
    const pinchMode =
      typeof map._move === 'function' &&
      typeof map.project === 'function' &&
      typeof map.unproject === 'function';

    if (!pinchMode && typeof map.setZoomAround !== 'function') {
      cancelLongPress(state, false);
      return;
    }

    press.active = true;
    press.map = map;
    press.timer = 0;
    press.direction = press.button === 0 ? 1 : -1;
    press.pinchMode = pinchMode;
    press.moved = false;
    press.finalCenter = null;
    press.finalZoom = null;

    if (pinchMode) {
      try {
        press.containerPoint = map.latLngToContainerPoint(press.latlng);
      } catch (_) {
        press.containerPoint = null;
      }
      if (!press.containerPoint) {
        // 取不到按下点就退回逐帧 setZoomAround。
        press.pinchMode = false;
      }
    }

    // 站点地图默认 zoomSnap = 1，会把小数缩放取整成一格一格跳。
    // 长按期间临时设为 0，松手或退出时恢复。
    press.snap = map.options ? map.options.zoomSnap : 0;
    press.snapChanged = !!press.snap;
    if (press.snapChanged) {
      try {
        map.options.zoomSnap = 0;
      } catch (_) {
        press.snapChanged = false;
      }
    }

    let last = 0;

    const step = (now) => {
      if (!state || state.longPress !== press) return;

      const currentMap = getStateMap(state);
      if (!currentMap || currentMap !== press.map) {
        cancelLongPress(state, false);
        return;
      }

      if (!last) last = now;
      let elapsed = now - last;
      last = now;
      // 标签页切回前台时可能隔了很久，避免一次跳太多。
      if (elapsed > 100) elapsed = 100;
      if (elapsed <= 0) {
        press.raf = requestAnimationFrame(step);
        return;
      }

      // 固定速度：按真实经过的时间计算增量，约 1.2 级/秒。
      const delta = (AUTO_ZOOM_RATE * elapsed) / 1000;

      const current = currentMap.getZoom();
      const min =
        typeof currentMap.getMinZoom === 'function'
          ? currentMap.getMinZoom()
          : current;
      const max =
        typeof currentMap.getMaxZoom === 'function'
          ? currentMap.getMaxZoom()
          : current;

      const next = Math.max(
        min,
        Math.min(max, current + press.direction * delta)
      );

      if (Math.abs(next - current) < 0.0001) {
        // 已到最小/最大级别，停止循环；松手时再提交最终视图。
        press.raf = 0;
        return;
      }

      state.userZoomed = true;

      if (press.pinchMode && typeof currentMap._move === 'function') {
        try {
          if (!press.moved) {
            press.moved = true;
            if (typeof currentMap._moveStart === 'function') {
              currentMap._moveStart(true, false);
            }
          }

          // 保持按下位置的地理坐标不动：根据目标级别重新计算中心点。
          const viewHalf = currentMap.getSize().divideBy(2);
          const offset = press.containerPoint.subtract(viewHalf);
          const center = currentMap.unproject(
            currentMap.project(press.latlng, next).subtract(offset),
            next
          );

          press.finalCenter = center;
          press.finalZoom = next;

          // 和双指捏合一样：pinch 标记让瓦片层只做缩放变换，不重新加载。
          currentMap._move(center, next, { pinch: true, round: false });
        } catch (_) {
          press.pinchMode = false;
        }
      }

      if (!press.pinchMode) {
        try {
          currentMap.setZoomAround(press.latlng, next, { animate: false });
        } catch (_) {
          /* ignore */
        }
      }

      const atLimit =
        press.direction > 0 ? next >= max - 0.0001 : next <= min + 0.0001;
      if (atLimit) {
        press.raf = 0;
        return;
      }

      press.raf = requestAnimationFrame(step);
    };

    press.raf = requestAnimationFrame(step);
  }

  function onMapMouseDown(state, event) {
    if (event.button !== 0 && event.button !== 2) return;
    if (isUiTarget(event.target)) return;

    // 触摸端：鼠标事件是浏览器在手指抬起后补发的，不应当成长按。
    // 触摸端的缩放交给 Leaflet 原生的双指捏合。
    if (Date.now() - lastTouchAt < TOUCH_SYNTH_MS) return;
    if (event.sourceCapabilities && event.sourceCapabilities.firesTouchEvents) {
      return;
    }

    if (!getStateMap(state)) return;

    cancelLongPress(state, false);

    const map = state.map;
    let latlng = null;
    try {
      latlng = map.mouseEventToLatLng(event);
    } catch (_) {
      /* ignore */
    }

    const press = {
      button: event.button,
      startX: event.clientX,
      startY: event.clientY,
      latlng,
      active: false,
      timer: 0,
      raf: 0,
      pinchMode: false,
      moved: false,
      finalCenter: null,
      finalZoom: null,
      containerPoint: null,
    };

    state.longPress = press;
    pressOwner = { state, press };
    press.timer = setTimeout(() => beginAutoZoom(state, press), LONG_PRESS_DELAY);
  }

  /**
   * 触摸端双击地图切换全屏。
   * iOS Safari 不一定会为双击补发 dblclick，这里直接识别两次轻点：
   * 只接受单指、短按且没有拖动的轻点，双指捏合和拖动都不会误触。
   */
  function bindTouchDoubleTap(state) {
    const { container } = state;

    container.addEventListener(
      'touchstart',
      (event) => {
        if (event.touches.length !== 1 || !event.changedTouches.length) {
          // 多指（捏合）或异常情况，作废当前的轻点记录。
          state.touchTap = null;
          state.lastTap = null;
          return;
        }
        if (isUiTarget(event.target)) {
          state.touchTap = null;
          state.lastTap = null;
          return;
        }
        const touch = event.changedTouches[0];
        state.touchTap = {
          x: touch.clientX,
          y: touch.clientY,
          at: Date.now(),
          moved: false,
        };
      },
      { capture: true, passive: true }
    );

    container.addEventListener(
      'touchmove',
      (event) => {
        const tap = state.touchTap;
        if (!tap || event.touches.length !== 1) return;
        const touch = event.touches[0];
        const dx = touch.clientX - tap.x;
        const dy = touch.clientY - tap.y;
        if (dx * dx + dy * dy > 12 * 12) tap.moved = true;
      },
      { capture: true, passive: true }
    );

    const endTap = (event) => {
      const tap = state.touchTap;
      state.touchTap = null;

      if (!tap || event.touches.length > 0 || tap.moved) return;
      if (Date.now() - tap.at > TOUCH_TAP_MAX_MS) return;

      const now = Date.now();
      const previous = state.lastTap;
      state.lastTap = { x: tap.x, y: tap.y, at: now };

      if (!previous || now - previous.at > TOUCH_DOUBLE_TAP_MS) return;

      const dx = tap.x - previous.x;
      const dy = tap.y - previous.y;
      if (dx * dx + dy * dy > TOUCH_DOUBLE_TAP_DIST * TOUCH_DOUBLE_TAP_DIST) {
        return;
      }

      // 双击命中：切换全屏，并吞掉这次触摸补发的点击，
      // 避免顺带在地图上选点或触发站点的双击缩放。
      state.lastTap = null;
      lastTouchDoubleTapAt = now;
      state.suppressClickUntil = now + TOUCH_SYNTH_MS;
      toggleFullscreen(container);
    };

    container.addEventListener('touchend', endTap, {
      capture: true,
      passive: true,
    });
    container.addEventListener(
      'touchcancel',
      () => {
        state.touchTap = null;
        state.lastTap = null;
      },
      { capture: true, passive: true }
    );
  }

  function bindContainerEvents(state) {
    if (state.eventsBound) return;
    state.eventsBound = true;

    const { container } = state;

    bindTouchDoubleTap(state);

    container.addEventListener('mousedown', (event) => {
      onMapMouseDown(state, event);
    });

    // 记录“用户主动缩放”的意图，站点自己的地图动画不会被误判成用户缩放。
    container.addEventListener(
      'mousedown',
      (event) => {
        const target = event.target;
        if (
          target &&
          target.closest &&
          target.closest(
            '.leaflet-control-zoom, .mapboxgl-ctrl-zoom-in, .mapboxgl-ctrl-zoom-out, .maplibregl-ctrl-zoom-in, .maplibregl-ctrl-zoom-out'
          )
        ) {
          markUserZoomIntent(state);
        }
      },
      true
    );

    container.addEventListener('wheel', () => markUserZoomIntent(state), {
      capture: true,
      passive: true,
    });

    container.addEventListener('touchstart', () => markUserZoomIntent(state), {
      capture: true,
      passive: true,
    });

    // 右键长按需要缩放，屏蔽地图上的浏览器右键菜单（站点自己的 contextmenu 事件仍会触发）。
    container.addEventListener(
      'contextmenu',
      (event) => {
        event.preventDefault();
      },
      true
    );
  }

  /* ------------------------------------------------------------------ */
  /* 扫描与事件                                                          */
  /* ------------------------------------------------------------------ */

  function scan() {
    scanScheduled = false;

    if (active) {
      const { container, state } = active;
      const finished = isGameFinished(container);
      const newlyFinished = finished && !state.gameFinished;
      state.gameFinished = finished;
      if (!container.isConnected || newlyFinished) exitFullscreen();
    }

    patchLeaflet();
    document.querySelectorAll(MAP_SELECTOR).forEach(ensureControls);

    // 题目切换时 React 可能替换掉标题/题面节点，重新挂上浮层。
    if (active && questionEnabled) {
      const owner = questionOwner;
      if (!owner || owner.state !== active.state || questionPartsMissing(owner)) {
        applyQuestionOverlay(active.state);
      }
    }
  }

  /**
   * 游戏结束后站点会把「提交 / 下一题」换成结算面板，并出现「分享成绩」按钮。
   * 此时地图已经不再需要，直接把全屏交还给页面，让用户看到结算结果。
   */
  function isGameFinished(container = active && active.container) {
    const wrapper = container && findQuestionWrapper(container);
    if (!wrapper) return false;
    const buttons = wrapper.querySelectorAll('button');
    for (let i = 0; i < buttons.length; i += 1) {
      const button = buttons[i];
      if (!button.getClientRects().length) continue;
      if ((button.textContent || '').replace(/\s+/g, '') === '分享成绩') {
        return true;
      }
    }
    return false;
  }

  function questionPartsMissing(owner) {
    if (!owner || !owner.parts) return true;
    const parts = owner.parts;
    if (!parts.body || !parts.body.isConnected) return true;
    if (parts.header && (!parts.header.isConnected || !parts.header.classList.contains(Q_HEADER_CLASS))) return true;
    if (parts.counter && (!parts.counter.isConnected || !parts.counter.classList.contains(Q_COUNTER_CLASS))) return true;
    if (parts.submit && (!parts.submit.isConnected || !parts.submit.classList.contains(Q_SUBMIT_CLASS))) return true;
    if (owner.hasQuestionImages) {
      if (!owner.viewButton || !owner.viewButton.isConnected) return true;
    }
    if (!owner.imageQuestion && !parts.body.classList.contains(Q_BODY_CLASS)) {
      return true;
    }
    return false;
  }

  function scheduleScan() {
    if (scanScheduled) return;
    scanScheduled = true;
    setTimeout(scan, 0);
  }

  function onDocumentMouseMove(event) {
    if (!pressOwner) return;
    const { state, press } = pressOwner;
    if (press.active) return;

    const dx = event.clientX - press.startX;
    const dy = event.clientY - press.startY;
    if (dx * dx + dy * dy > LONG_PRESS_MOVE_TOLERANCE * LONG_PRESS_MOVE_TOLERANCE) {
      // 鼠标移动了，说明用户是在拖拽地图，不是长按。
      cancelLongPress(state, false);
    }
  }

  function onDocumentMouseUp(event) {
    if (!pressOwner) return;
    const { state, press } = pressOwner;
    if (event.button !== press.button) return;

    const wasActive = press.active;
    cancelLongPress(state, wasActive);
  }

  function onWindowBlur() {
    if (!pressOwner) return;
    cancelLongPress(pressOwner.state, false);
  }

  function onDocumentClick(event) {
    const target = event.target;
    if (!target || target.nodeType !== 1) return;

    const container = findContainer(target);
    if (!container) return;

    const state = states.get(container);
    if (!state) return;

    if (Date.now() < state.suppressClickUntil) {
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
    }
  }

  function onDocumentDoubleClick(event) {
    if (event.defaultPrevented || event.button !== 0) return;

    // 触摸端的双击已经由 bindTouchDoubleTap 处理；
    // iOS 若额外补发 dblclick，这里忽略，避免连续切换两次。
    if (Date.now() - lastTouchDoubleTapAt < TOUCH_SYNTH_MS) return;

    const target = event.target;
    if (!target || target.nodeType !== 1) return;
    if (isUiTarget(target)) return;

    const container = findContainer(target);
    if (!container) return;

    // 在捕获阶段拦截，避免 Leaflet 的双击缩放同时生效。
    event.preventDefault();
    event.stopPropagation();
    toggleFullscreen(container);
  }

  function onDocumentKeyDown(event) {
    // 站点的原生图片预览负责处理 Esc。
    if ((event.key === 'Escape' || event.key === 'Esc') &&
        [...document.querySelectorAll('.ant-image-preview-wrap')].some(
          (preview) => preview.getClientRects().length > 0
        )) {
      return;
    }

    const target = event.target;
    if (target && target.nodeType === 1 && /^[-+_=]$/.test(event.key)) {
      const mapContainer = findContainer(target);
      const state = mapContainer && states.get(mapContainer);
      if (state) markUserZoomIntent(state);
    }

    if (!active) return;
    if (event.key !== 'Escape' && event.key !== 'Esc') return;

    event.preventDefault();
    event.stopPropagation();
    exitFullscreen();
  }

  function onFullscreenChange() {
    const state = active && active.state;
    if (!state) return;

    if (isDocumentFullscreenOf(state.container)) {
      // 进入真正的屏幕全屏，尺寸可能又变了一次。
      updateModeUI(state);
      scheduleSizeRefresh(state);
      return;
    }

    // 文档全屏被浏览器退出（例如按 Esc 或系统手势）。
    // 如果模式已经切回网页全屏，则说明是主动切换，保持当前全屏状态。
    if (state.mode === MODE_SCREEN) {
      exitFullscreen();
    }
  }

  /* ------------------------------------------------------------------ */
  /* 启动                                                               */
  /* ------------------------------------------------------------------ */

  injectStyle();
  scan();

  document.addEventListener('dblclick', onDocumentDoubleClick, true);

  // 记录触摸活动，用来识别浏览器补发的鼠标事件（触摸端不做长按缩放）。
  ['touchstart', 'touchmove', 'touchend', 'touchcancel'].forEach((type) => {
    document.addEventListener(
      type,
      () => {
        lastTouchAt = Date.now();
      },
      { capture: true, passive: true }
    );
  });
  document.addEventListener('keydown', onDocumentKeyDown, true);
  document.addEventListener('mousemove', onDocumentMouseMove, true);
  document.addEventListener('mouseup', onDocumentMouseUp, true);
  document.addEventListener('click', onDocumentClick, true);
  document.addEventListener('fullscreenchange', onFullscreenChange);
  document.addEventListener('webkitfullscreenchange', onFullscreenChange);
  document.addEventListener('mozfullscreenchange', onFullscreenChange);
  document.addEventListener('MSFullscreenChange', onFullscreenChange);
  window.addEventListener('blur', onWindowBlur);

  // Leaflet 可能由懒加载 chunk 稍后才挂到 window.L 上，短暂轮询一下。
  let leafletPollCount = 0;
  const leafletPoll = setInterval(() => {
    leafletPollCount += 1;
    if (window.L) {
      patchLeaflet();
      scan();
      clearInterval(leafletPoll);
    } else if (leafletPollCount >= 60) {
      clearInterval(leafletPoll);
    }
  }, 250);

  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === 'childList') {
        scheduleScan();
        return;
      }
    }
  });
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
})();
