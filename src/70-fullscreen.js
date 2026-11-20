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
