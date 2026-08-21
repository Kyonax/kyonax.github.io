/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 */

import { onBeforeUnmount, onMounted } from 'vue';

/* Falloff radius per input. The coarse band is tighter because its pointer
   never moves off the viewport centre — at 180 two cards stay half-lit. */
const THRESHOLD       = 180;
const FOCUS_THRESHOLD = 90;

export default function useProximityHover(
  containerRef, selector, options = {},
) {
  /* Bail out early on reduced motion, and on touch-primary devices unless
     they opted in. pointer:coarse devices (phones, most tablets) never fire
     pointermove with the fine precision the effect needs, so without
     `mobileFocus` they skip setup entirely — that removes the full
     listener-triple + ResizeObserver cost from mobile hydration (saved
     ~170ms TBT on the slow-4G Lighthouse profile). With it they get the
     scroll-driven path below, which reads no layout per frame. */
  if (typeof window === 'undefined') {
    return;
  }
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return;
  }

  const focus_mode = window.matchMedia('(pointer: coarse)').matches;
  if (focus_mode && !options.mobileFocus) {
    return;
  }

  let _items = [];
  let _rects = [];
  let _raf   = null;
  let _last  = 0;
  let _dirty = true;
  let _lit   = false;

  /* Viewport-space for the pointer path, document-space for the focus path.
     Document-space survives a scroll, which is what lets the focus path run
     without a getBoundingClientRect on every frame. */
  function _cache() {
    const root = containerRef.value;
    if (!root) {
      return;
    }
    const sx = focus_mode ? window.scrollX : 0;
    const sy = focus_mode ? window.scrollY : 0;
    _items = [...root.querySelectorAll(selector)];
    _rects = _items.map((el) => {
      const r = el.getBoundingClientRect();
      return {
        left: r.left + sx, top: r.top + sy,
        width: r.width, height: r.height,
      };
    });
    _dirty = false;
  }

  function _invalidate() {
    _dirty = true;
  }

  function _reset() {
    for (const el of _items) {
      el.style.removeProperty('--prox');
    }
    _lit = false;
  }

  /* One distance model for both inputs: a virtual pointer at (x, y), and a
     falloff that saturates anywhere inside an item's own box. */
  function _apply(x, y, threshold) {
    if (_dirty) {
      _cache();
    }
    for (const [i, el] of _items.entries()) {
      const r = _rects[i];
      if (!r) {
        continue;
      }
      const dx = Math.max(0, Math.max(r.left - x, x - (r.left + r.width)));
      const dy = Math.max(0, Math.max(r.top  - y, y - (r.top  + r.height)));
      const d  = Math.sqrt(dx ** 2 + dy ** 2);
      const t  = Math.max(0, 1 - d / threshold);
      el.style.setProperty('--prox', t.toFixed(3));
    }
    _lit = true;
  }

  function _onMove(e) {
    const now = performance.now();
    if (now - _last < 16) {
      return;
    }
    if (_raf) {
      cancelAnimationFrame(_raf);
    }
    const { clientX: x, clientY: y } = e;
    _raf = requestAnimationFrame(() => {
      _last = now;
      _apply(x, y, THRESHOLD);
    });
  }

  function _onLeave() {
    if (_raf) {
      cancelAnimationFrame(_raf);
    }
    _reset();
  }

  /* Touch has no cursor to follow, so the middle of the viewport becomes the
     pointer: whichever card the visitor has scrolled to centre lights up,
     and the reading position drives the effect the way the mouse does on
     desktop. Rects are document-space, so a scroll frame is pure arithmetic. */
  function _onScroll() {
    if (_raf) {
      cancelAnimationFrame(_raf);
    }
    _raf = requestAnimationFrame(() => {
      _apply(
        window.scrollX + window.innerWidth  / 2,
        window.scrollY + window.innerHeight / 2,
        FOCUS_THRESHOLD,
      );
    });
  }

  function _refresh() {
    _invalidate();
    _onScroll();
  }

  /* Only the section on screen pays for scroll. A card that scrolls away
     keeps its last --prox otherwise, which reads as a stuck highlight. */
  function _onIntersect(entries) {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        _refresh();
      } else if (_lit) {
        if (_raf) {
          cancelAnimationFrame(_raf);
        }
        _reset();
      }
    }
  }

  let _ro = null;
  let _io = null;

  onMounted(() => {
    const root = containerRef.value;
    if (!root) {
      return;
    }
    if (focus_mode) {
      window.addEventListener('scroll', _onScroll, { passive: true });
      window.addEventListener('resize', _refresh, { passive: true });
      if (typeof IntersectionObserver === 'undefined') {
        _refresh();
      } else {
        _io = new IntersectionObserver(_onIntersect, { threshold: 0 });
        _io.observe(root);
      }
    } else {
      root.addEventListener('pointermove', _onMove, { passive: true });
      root.addEventListener('pointerleave', _onLeave);
      window.addEventListener('scroll', _invalidate, { passive: true });
    }
    _ro = new ResizeObserver(focus_mode ? _refresh : _invalidate);
    _ro.observe(root);
  });

  onBeforeUnmount(() => {
    const root = containerRef.value;
    if (root && !focus_mode) {
      root.removeEventListener('pointermove', _onMove);
      root.removeEventListener('pointerleave', _onLeave);
    }
    window.removeEventListener('scroll', focus_mode ? _onScroll : _invalidate);
    window.removeEventListener('resize', _refresh);
    if (_raf) {
      cancelAnimationFrame(_raf);
    }
    if (_ro) {
      _ro.disconnect();
    }
    if (_io) {
      _io.disconnect();
    }
    _reset();
  });
}
