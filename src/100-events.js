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
