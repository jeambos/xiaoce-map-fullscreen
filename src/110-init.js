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
