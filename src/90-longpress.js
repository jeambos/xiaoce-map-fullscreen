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
