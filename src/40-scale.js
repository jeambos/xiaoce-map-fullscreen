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
