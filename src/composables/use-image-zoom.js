/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 */

import { computed, ref, watch } from 'vue';

/* Eight, not four: a chart is a vector drawing, and the reader who opens one is
   reading its smallest labels, not glancing at it. The CSS scale stays sharp
   at eight because the chart is still an SVG (measured: see RASTER in
   chart-picture.js). A photograph is only as sharp as the file it came in. */
const MAX_SCALE     = 8;
const STEP          = 1.35;  // "+", "-" and the keys: the diagram viewer's
const ZOOM_STEP     = 2;     // double-tap / double-click target scale
const PAN_KEY       = 0.12;  // an arrow key moves the frame 12% of its size
const PERCENT       = 100;
const DOUBLE_TAP_MS = 300;
const DOUBLE_TAP_PX = 30;
const TAP_SLOP_PX   = 10;    // a finger that drifts less than this still taps
const WHEEL_FACTOR  = 1.15;
/* A wheel's pixels to a zoom factor. A mouse notch (~100px) saturates at
   WHEEL_FACTOR, exactly as before; a trackpad sends dozens of 2-10px events
   a second, and taking each as a full notch flung the picture to the limit. */
const WHEEL_RATE    = 0.0025;
const LINE_PX       = 16;    // deltaMode 1 — Firefox's mouse wheel, in lines
const PAGE_PX       = 400;   // deltaMode 2
/* How long after a finger lifts a `dblclick` is taken to be the browser's echo
   of that touch rather than a mouse. Comfortably longer than DOUBLE_TAP_MS. */
const TOUCH_ECHO_MS = 700;

/*
 * Pinch-zoom, double-tap (and double-click) zoom, wheel zoom, drag-to-pan, the
 * toolbar's steps and the keyboard, for a single image inside a lightbox. The
 * gesture surface owns ALL of its touch input (the viewer around it carries
 * `touch-action: none`), so the browser's native page pinch-zoom is never
 * triggered here — it stays fully available everywhere else on the page (WCAG
 * 1.4.4 is untouched).
 *
 * `containerRef` is the frame that clips the picture; the transformed element
 * is resolved by `selector` on each gesture start, so swapping the lightbox
 * source is safe. Transform is written imperatively (not through a reactive
 * ref) because pinch/pan fire at pointer frequency — a ref would thrash Vue's
 * scheduler (same rationale as use-proximity-hover's CSS-var writes). The two
 * reactive values, `isZoomed` and `percent`, change only when the zoom does,
 * so a pan never reaches Vue at all.
 */
export default function useImageZoom(containerRef, selector) {
  const is_zoomed = ref(false);
  const percent = ref(PERCENT);

  let scale = 1;
  let tx = 0;
  let ty = 0;

  let el = null;          // current transformed element
  let origin_x = 0;       // untransformed top-left of `el`, in screen coords
  let origin_y = 0;
  let base_w = 0;         // untransformed width / height of `el`
  let base_h = 0;

  /* pinch baseline */
  let start_dist = 0;
  let start_scale = 1;
  let pivot_x = 0;        // content point under the initial pinch midpoint
  let pivot_y = 0;

  /* pan baseline (shared by touch-pan and mouse-drag) */
  let pan_x = 0;
  let pan_y = 0;
  let pan_tx = 0;
  let pan_ty = 0;

  /* double-tap bookkeeping */
  let last_tap = 0;
  let last_tap_x = 0;
  let last_tap_y = 0;
  let moved = false;
  let one_finger = false; // this touch began as the only finger down
  let last_touch_end = 0; // when a finger last lifted — see on_dblclick

  let mode = 'idle';      // 'idle' | 'pinch' | 'pan'
  let dragging = false;   // mouse drag

  const _reduced = () =>
    typeof window !== 'undefined'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function _target() {
    const root = containerRef.value;
    return root ? root.querySelector(selector) : null;
  }

  /*
   * THE FRAME IS MEASURED, NOT THE PICTURE. The frame shrink-wraps the picture
   * and never transforms, so its rect IS the picture's untransformed box at any
   * zoom. Reading the picture's own rect and inverting the transform works
   * only at rest: a "+" pressed while the last one's eased zoom is still in
   * flight would read a half-finished transform, and the picture would jump.
   */
  function _measure() {
    const r = containerRef.value.getBoundingClientRect();
    origin_x = r.left;
    origin_y = r.top;
    base_w = r.width;
    base_h = r.height;
  }

  /* Keep the scaled image covering its own box (no empty gutters). At scale 1
     the range collapses to 0, so panning is impossible until zoomed in. */
  function _clamp() {
    tx = Math.min(0, Math.max(base_w * (1 - scale), tx));
    ty = Math.min(0, Math.max(base_h * (1 - scale), ty));
  }

  /* The cursor says what a press will do: at 100% a double click zooms, past
     it the picture can be taken hold of, and during a drag it is held. */
  function _cursor() {
    const root = containerRef.value;
    if (!root) {
      return;
    }
    if (dragging) {
      root.style.cursor = 'grabbing';
    } else {
      root.style.cursor = scale > 1 ? 'grab' : 'zoom-in';
    }
  }

  /* Every zoom path — buttons, wheel, pinch, double tap, keys — ends here, so
     the readout can never disagree with the picture. */
  function _apply(animate) {
    if (!el) {
      return;
    }
    el.style.transformOrigin = '0 0';
    el.style.transition = (animate && !_reduced()) ? 'transform 0.25s ease' : 'none';
    el.style.transform = `translate3d(${tx}px, ${ty}px, 0) scale(${scale})`;
    _cursor();
    is_zoomed.value = scale > 1;
    percent.value = Math.round(scale * PERCENT);
  }

  /* Zoom to `target_scale` while keeping the content point under (sx, sy)
     anchored to that same screen position. A step back down that lands a
     hair above 1 (1.35 in, 1.35 out) is 1. */
  function _zoom_to(target_scale, sx, sy, animate) {
    if (!el) {
      return;
    }
    _measure();
    const cx = (sx - origin_x - tx) / scale;
    const cy = (sy - origin_y - ty) / scale;
    scale = Math.min(MAX_SCALE, Math.max(1, target_scale));
    if (scale < 1 + 1 / PERCENT / 2) {
      scale = 1;
    }
    tx = sx - origin_x - scale * cx;
    ty = sy - origin_y - scale * cy;
    _clamp();
    _apply(animate);
  }

  function reset(animate = false) {
    scale = 1;
    tx = 0;
    ty = 0;
    el = _target() || el;
    _apply(animate);
  }

  /* ---------- toolbar and keyboard ---------- */

  /* No pointer to anchor on, so the middle of the frame stays put. */
  function _zoom_centre(factor) {
    el = _target();
    if (!el) {
      return;
    }
    _measure();
    const mid_x = origin_x + base_w / 2;
    const mid_y = origin_y + base_h / 2;
    _zoom_to(scale * factor, mid_x, mid_y, true);
  }

  const zoomIn = () => _zoom_centre(STEP);
  const zoomOut = () => _zoom_centre(1 / STEP);
  const fit = () => reset(true);

  /* Which way the PICTURE moves, so the view moves the way the arrow points. */
  const PAN_KEYS = new Map([
    ['ArrowLeft', [1, 0]],
    ['ArrowRight', [-1, 0]],
    ['ArrowUp', [0, 1]],
    ['ArrowDown', [0, -1]],
  ]);

  /*
   * The diagram viewer's keys: + and = in, - and _ out, 0 back to fit, the
   * arrows pan once zoomed. A chord with ctrl, cmd or alt is the browser's
   * (ctrl + is page zoom) and is left alone. Returns whether the key was
   * spent, so an unused one keeps its default.
   */
  function onKeydown(event) {
    if (event.ctrlKey || event.metaKey || event.altKey || !_target()) {
      return false;
    }
    const { key } = event;
    const pan = PAN_KEYS.get(key);
    if (key === '+' || key === '=') {
      zoomIn();
    } else if (key === '-' || key === '_') {
      zoomOut();
    } else if (key === '0') {
      fit();
    } else if (pan && scale > 1) {
      el = _target();
      _measure();
      tx += pan[0] * base_w * PAN_KEY;
      ty += pan[1] * base_h * PAN_KEY;
      _clamp();
      _apply(true);
    } else {
      return false;
    }
    event.preventDefault();
    return true;
  }

  /* ---------- touch ---------- */
  function _dist(touches) {
    return Math.hypot(
      touches[0].clientX - touches[1].clientX,
      touches[0].clientY - touches[1].clientY,
    );
  }
  function _mid(touches) {
    return {
      x: (touches[0].clientX + touches[1].clientX) / 2,
      y: (touches[0].clientY + touches[1].clientY) / 2,
    };
  }

  function on_touch_start(event) {
    el = _target();
    if (!el) {
      return;
    }
    moved = false;
    one_finger = event.touches.length === 1;
    if (event.touches.length === 2) {
      event.preventDefault();
      mode = 'pinch';
      _measure();
      start_dist = _dist(event.touches) || 1;
      start_scale = scale;
      const m = _mid(event.touches);
      pivot_x = (m.x - origin_x - tx) / scale;
      pivot_y = (m.y - origin_y - ty) / scale;
    } else if (event.touches.length === 1 && scale > 1) {
      mode = 'pan';
      _measure();
      pan_x = event.touches[0].clientX;
      pan_y = event.touches[0].clientY;
      pan_tx = tx;
      pan_ty = ty;
    } else {
      mode = 'idle';
    }
  }

  function on_touch_move(event) {
    if (mode === 'pinch' && event.touches.length === 2) {
      event.preventDefault();
      moved = true;
      const m = _mid(event.touches);
      scale = Math.min(MAX_SCALE, Math.max(1, start_scale * (_dist(event.touches) / start_dist)));
      tx = m.x - origin_x - scale * pivot_x;
      ty = m.y - origin_y - scale * pivot_y;
      _clamp();
      _apply(false);
    } else if (mode === 'pan' && event.touches.length === 1) {
      event.preventDefault();
      const dx = event.touches[0].clientX - pan_x;
      const dy = event.touches[0].clientY - pan_y;
      moved = moved || Math.hypot(dx, dy) > TAP_SLOP_PX;
      tx = pan_tx + dx;
      ty = pan_ty + dy;
      _clamp();
      _apply(false);
    }
  }

  function on_touch_end(event) {
    last_touch_end = Date.now();
    /*
     * A clean single tap → double-tap detection. On a zoomed picture every
     * finger starts a pan — that is how one finger takes hold — and the check
     * used to demand an idle gesture, so a double tap could zoom in but never
     * back out, and the dblclick that would have (below) is the touch echo it
     * ignores. A pan that never travelled past TAP_SLOP_PX is a tap.
     */
    if (!moved && one_finger && mode !== 'pinch'
        && event.touches.length === 0 && event.changedTouches.length === 1) {
      const t = event.changedTouches[0];
      const now = Date.now();
      if (now - last_tap < DOUBLE_TAP_MS
          && Math.abs(t.clientX - last_tap_x) < DOUBLE_TAP_PX
          && Math.abs(t.clientY - last_tap_y) < DOUBLE_TAP_PX) {
        last_tap = 0;
        if (scale > 1) {
          reset(true);
        } else {
          _zoom_to(ZOOM_STEP, t.clientX, t.clientY, true);
        }
      } else {
        last_tap = now;
        last_tap_x = t.clientX;
        last_tap_y = t.clientY;
      }
    }

    /* Snap a barely-zoomed pinch back to a clean identity. */
    if (scale !== 1 && scale <= 1.02) {
      reset(true);
    }

    /* A finger lifted mid-pinch → keep panning with the one that remains. */
    if (event.touches.length === 1 && scale > 1) {
      mode = 'pan';
      pan_x = event.touches[0].clientX;
      pan_y = event.touches[0].clientY;
      pan_tx = tx;
      pan_ty = ty;
    } else if (event.touches.length === 0) {
      mode = 'idle';
    }
  }

  /* ---------- desktop ---------- */

  /*
   * A DOUBLE TAP IS ALSO A DOUBLE CLICK, AND IT CANCELLED ITSELF.
   *
   * Mobile browsers synthesize mouse events after touch ones, `dblclick`
   * included. So a double tap zoomed in on its second touchend (above) and the
   * `dblclick` that followed, seeing a zoomed image, reset it: on a phone the
   * gesture flashed and did nothing. Traced event by event: touchstart,
   * touchend, click, touchstart, touchend, click, dblclick. A `dblclick` that
   * lands within TOUCH_ECHO_MS of a lifted finger is that echo, and the touch
   * path has already handled the gesture. A real mouse never lifts a finger.
   */
  function on_dblclick(event) {
    if (Date.now() - last_touch_end < TOUCH_ECHO_MS) {
      return;
    }
    el = _target();
    if (!el) {
      return;
    }
    if (scale > 1) {
      reset(true);
    } else {
      _zoom_to(ZOOM_STEP, event.clientX, event.clientY, true);
    }
  }

  function on_wheel(event) {
    el = _target();
    if (!el) {
      return;
    }
    event.preventDefault();
    let px = event.deltaY;
    if (event.deltaMode === 1) {
      px *= LINE_PX;
    } else if (event.deltaMode === 2) {
      px *= PAGE_PX;
    }
    const factor = Math.exp(-px * WHEEL_RATE);
    const step = Math.min(WHEEL_FACTOR, Math.max(1 / WHEEL_FACTOR, factor));
    _zoom_to(scale * step, event.clientX, event.clientY, false);
  }

  /*
   * THE MOUSE DRAGS THROUGH POINTER EVENTS, captured. Capture keeps the drag —
   * and its grabbing cursor — alive when the pointer leaves the frame, which
   * the old window-level mousemove could move but could not dress. Touch
   * pointers are ignored here: the touch path above owns them, and its
   * double-tap guard is built on touch events.
   */
  function on_pointer_down(event) {
    if (event.pointerType !== 'mouse' || event.button !== 0 || scale <= 1) {
      return;
    }
    el = _target();
    if (!el) {
      return;
    }
    _measure();
    dragging = true;
    pan_x = event.clientX;
    pan_y = event.clientY;
    pan_tx = tx;
    pan_ty = ty;
    try {
      containerRef.value.setPointerCapture(event.pointerId);
    } catch {
      /* drag without it: it only stops at the frame's edge */
    }
    _cursor();
  }
  function on_pointer_move(event) {
    if (!dragging) {
      return;
    }
    tx = pan_tx + (event.clientX - pan_x);
    ty = pan_ty + (event.clientY - pan_y);
    _clamp();
    _apply(false);
  }
  function on_pointer_up() {
    if (!dragging) {
      return;
    }
    dragging = false;
    _cursor();
  }

  /* An <img> is natively draggable: the first drag of a zoomed picture lifted
     a ghost copy of it off the page instead of moving it. */
  function on_drag_start(event) {
    event.preventDefault();
  }

  const LISTENERS = [
    ['touchstart', on_touch_start, { passive: false }],
    ['touchmove', on_touch_move, { passive: false }],
    ['touchend', on_touch_end, { passive: true }],
    ['dblclick', on_dblclick],
    ['wheel', on_wheel, { passive: false }],
    ['pointerdown', on_pointer_down],
    ['pointermove', on_pointer_move, { passive: true }],
    ['pointerup', on_pointer_up],
    ['pointercancel', on_pointer_up],
    ['dragstart', on_drag_start],
  ];

  /* Bound to whichever frame the ref holds: the viewer renders none for a
     YouTube embed, whose iframe handles its own input. Nothing is bound to
     `window`, so an unmounted viewer leaves nothing behind. */
  watch(containerRef, (root, previous) => {
    for (const [type, handler, options] of LISTENERS) {
      previous?.removeEventListener(type, handler, options);
      root?.addEventListener(type, handler, options);
    }
    _cursor();
  }, { flush: 'post' });

  return {
    isZoomed: is_zoomed,
    percent,
    canZoomIn: computed(() => percent.value < MAX_SCALE * PERCENT),
    canZoomOut: computed(() => percent.value > PERCENT),
    zoomIn,
    zoomOut,
    fit,
    reset,
    onKeydown,
  };
}
