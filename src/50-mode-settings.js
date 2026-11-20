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
