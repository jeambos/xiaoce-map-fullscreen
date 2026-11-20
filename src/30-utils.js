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
