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
