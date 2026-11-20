  const MAP_SELECTOR = [
    '#when-where-map',
    '.leaflet-container',
    '.mapboxgl-map',
    '.maplibregl-map',
  ].join(',');

  const BUTTON_CLASS = 'xcf-map-fullscreen-btn';
  const MODE_CLASS = 'xcf-map-fs-mode';
  const MODE_OPTION_CLASS = 'xcf-map-fs-mode-option';
  const QUESTION_TOGGLE_CLASS = 'xcf-map-question-toggle';
  const MAP_FS_CLASS = 'xcf-map-fullscreen';
  const ROOT_FS_CLASS = 'xcf-map-fullscreen-active';
  const PLACEHOLDER_CLASS = 'xcf-map-fullscreen-placeholder';
  const STYLE_ID = 'xcf-map-fullscreen-style';

  // 显示题面浮层用的类名。
  const Q_HEADER_CLASS = 'xcf-map-question-header';
  const Q_COUNTER_CLASS = 'xcf-map-question-counter';
  const Q_BODY_CLASS = 'xcf-map-question-body';
  const Q_TEXT_CLASS = 'xcf-map-question-text';
  const Q_SUBMIT_CLASS = 'xcf-map-question-submit';
  const Q_VIEW_CLASS = 'xcf-map-question-view';
  const Q_IMAGE_HIDDEN_CLASS = 'xcf-map-question-image-hidden';

  const MODE_WEB = 'web';
  const MODE_SCREEN = 'screen';
  const MODE_STORAGE_KEY = 'xcf-map-fullscreen-mode';
  const QUESTION_STORAGE_KEY = 'xcf-map-question-visible';

  // 长按缩放的节奏：按住 420ms 后开始，以固定速度连续缩放（约 1.2 级/秒）。
  // 缩放过程复用 Leaflet 双指捏合的 _move 路径：只缩放当前画面，不逐级重新加载瓦片。
  const LONG_PRESS_DELAY = 420;
  const LONG_PRESS_MOVE_TOLERANCE = 8;
  const AUTO_ZOOM_RATE = 2;
  const CLICK_SUPPRESS_MS = 400;

  // 触摸端：浏览器会在手指抬起后补发一套鼠标事件，用它来区分真实指针。
  // 双击手势则用触摸事件自行识别，不依赖 iOS Safari 是否合成 dblclick。
  const TOUCH_SYNTH_MS = 600;
  const TOUCH_DOUBLE_TAP_MS = 320;
  const TOUCH_DOUBLE_TAP_DIST = 32;
  const TOUCH_TAP_MAX_MS = 280;

  const states = new WeakMap();
  let active = null;
  let screenRequestSerial = 0;
  let scanScheduled = false;
  let leafletPatchedFor = null;
  let pressOwner = null;
  let lastTouchAt = 0;
  let lastTouchDoubleTapAt = 0;

  // 题面浮层只属于当前正在全屏的地图。
  let questionOwner = null;
  let questionEnabled = readQuestionEnabled();
  let questionLayoutTimer = 0;
  let questionRefreshTimer = 0;
