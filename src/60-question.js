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
