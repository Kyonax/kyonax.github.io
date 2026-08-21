/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 */

import { onBeforeUnmount, onMounted, ref } from 'vue';

const MAX_SCALE     = 4;
const ZOOM_STEP     = 2;     // double-tap / double-click target scale
const DOUBLE_TAP_MS = 300;
const DOUBLE_TAP_PX = 30;
const WHEEL_FACTOR  = 1.15;

/*
 * Pinch-zoom, double-tap (and double-click) zoom, and drag-to-pan for a single
 * image inside a lightbox. The gesture surface owns ALL of its touch input
 * (the container carries `touch-action: none`), so the browser's native page
 * pinch-zoom is never triggered here — it stays fully available everywhere
 * else on the page (WCAG 1.4.4 is untouched).
 *
 * `containerRef` is the stable wrapper; the transformed element is resolved by
 * `selector` on each gesture start, so swapping the lightbox source is safe.
 * Transform is written imperatively (not through a reactive ref) because
 * pinch/pan fire at pointer frequency — a ref would thrash Vue's scheduler
 * (same rationale as use-proximity-hover's CSS-var writes).
 */
export default function useImageZoom(containerRef, selector) {
  const is_zoomed = ref(false);

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

  let mode = 'idle';      // 'idle' | 'pinch' | 'pan'
  let dragging = false;   // mouse drag

  const _reduced = () =>
    typeof window !== 'undefined'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function _target() {
    const root = containerRef.value;
    return root ? root.querySelector(selector) : null;
  }

  /* Recover the element's untransformed geometry from its live rect. With
     transform-origin 0 0: rect.topLeft = origin + translate, and
     rect.size = base * scale — so both invert cleanly at any transform. */
  function _measure(target) {
    const r = target.getBoundingClientRect();
    origin_x = r.left - tx;
    origin_y = r.top - ty;
    base_w = r.width / scale;
    base_h = r.height / scale;
  }

  /* Keep the scaled image covering its own box (no empty gutters). At scale 1
     the range collapses to 0, so panning is impossible until zoomed in. */
  function _clamp() {
    tx = Math.min(0, Math.max(base_w * (1 - scale), tx));
    ty = Math.min(0, Math.max(base_h * (1 - scale), ty));
  }

  function _apply(animate) {
    if (!el) {
      return;
    }
    el.style.transformOrigin = '0 0';
    el.style.transition = (animate && !_reduced()) ? 'transform 0.25s ease' : 'none';
    el.style.transform = `translate3d(${tx}px, ${ty}px, 0) scale(${scale})`;
    el.style.cursor = scale > 1 ? 'grab' : '';
    is_zoomed.value = scale > 1;
  }

  /* Zoom to `target_scale` while keeping the content point under (sx, sy)
     anchored to that same screen position. */
  function _zoom_to(target_scale, sx, sy, animate) {
    if (!el) {
      return;
    }
    _measure(el);
    const cx = (sx - origin_x - tx) / scale;
    const cy = (sy - origin_y - ty) / scale;
    scale = Math.min(MAX_SCALE, Math.max(1, target_scale));
    tx = sx - origin_x - scale * cx;
    ty = sy - origin_y - scale * cy;
    _clamp();
    _apply(animate);
  }

  function reset(animate = false) {
    scale = 1;
    tx = 0;
    ty = 0;
    el = el || _target();
    _apply(animate);
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
    if (event.touches.length === 2) {
      event.preventDefault();
      mode = 'pinch';
      _measure(el);
      start_dist = _dist(event.touches) || 1;
      start_scale = scale;
      const m = _mid(event.touches);
      pivot_x = (m.x - origin_x - tx) / scale;
      pivot_y = (m.y - origin_y - ty) / scale;
    } else if (event.touches.length === 1 && scale > 1) {
      mode = 'pan';
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
      moved = true;
      tx = pan_tx + (event.touches[0].clientX - pan_x);
      ty = pan_ty + (event.touches[0].clientY - pan_y);
      _clamp();
      _apply(false);
    }
  }

  function on_touch_end(event) {
    /* Clean, non-moving single tap → double-tap detection. */
    if (!moved && mode === 'idle' && event.changedTouches.length === 1) {
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
  function on_dblclick(event) {
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
    const factor = event.deltaY < 0 ? WHEEL_FACTOR : 1 / WHEEL_FACTOR;
    _zoom_to(scale * factor, event.clientX, event.clientY, false);
  }

  function on_mousedown(event) {
    if (scale <= 1) {
      return;
    }
    el = _target();
    if (!el) {
      return;
    }
    dragging = true;
    pan_x = event.clientX;
    pan_y = event.clientY;
    pan_tx = tx;
    pan_ty = ty;
    el.style.cursor = 'grabbing';
  }
  function on_mousemove(event) {
    if (!dragging) {
      return;
    }
    tx = pan_tx + (event.clientX - pan_x);
    ty = pan_ty + (event.clientY - pan_y);
    _clamp();
    _apply(false);
  }
  function on_mouseup() {
    if (!dragging) {
      return;
    }
    dragging = false;
    if (el) {
      el.style.cursor = scale > 1 ? 'grab' : '';
    }
  }

  onMounted(() => {
    const root = containerRef.value;
    if (!root) {
      return;
    }
    root.addEventListener('touchstart', on_touch_start, { passive: false });
    root.addEventListener('touchmove', on_touch_move, { passive: false });
    root.addEventListener('touchend', on_touch_end, { passive: true });
    root.addEventListener('dblclick', on_dblclick);
    root.addEventListener('wheel', on_wheel, { passive: false });
    root.addEventListener('mousedown', on_mousedown);
    window.addEventListener('mousemove', on_mousemove, { passive: true });
    window.addEventListener('mouseup', on_mouseup, { passive: true });
  });

  onBeforeUnmount(() => {
    const root = containerRef.value;
    if (root) {
      root.removeEventListener('touchstart', on_touch_start);
      root.removeEventListener('touchmove', on_touch_move);
      root.removeEventListener('touchend', on_touch_end);
      root.removeEventListener('dblclick', on_dblclick);
      root.removeEventListener('wheel', on_wheel);
      root.removeEventListener('mousedown', on_mousedown);
    }
    window.removeEventListener('mousemove', on_mousemove);
    window.removeEventListener('mouseup', on_mouseup);
  });

  return { isZoomed: is_zoomed, reset };
}
