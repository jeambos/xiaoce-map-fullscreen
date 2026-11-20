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
