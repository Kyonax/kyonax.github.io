import { onBeforeUnmount, onMounted } from 'vue';

const THRESHOLD = 180;

export default function useProximityHover(containerRef, selector) {
  if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return;
  }

  let _items = [];
  let _rects = [];
  let _raf   = null;
  let _last  = 0;
  let _dirty = true;

  function _cache() {
    const root = containerRef.value;
    if (!root) {
      return;
    }
    _items = [...root.querySelectorAll(selector)];
    _rects = _items.map((el) => {
      const r = el.getBoundingClientRect();
      return { left: r.left, top: r.top, width: r.width, height: r.height };
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
  }

  function _onMove(e) {
    const now = performance.now();
    if (now - _last < 16) {
      return;
    }
    if (_dirty) {
      _cache();
    }
    if (_raf) {
      cancelAnimationFrame(_raf);
    }
    _raf = requestAnimationFrame(() => {
      _last = now;
      const { clientX: x, clientY: y } = e;
      for (const [i, el] of _items.entries()) {
        const r = _rects[i];
        if (!r) {
          continue;
        }
        const dx = Math.max(0, Math.max(r.left - x, x - (r.left + r.width)));
        const dy = Math.max(0, Math.max(r.top  - y, y - (r.top  + r.height)));
        const d  = Math.sqrt(dx ** 2 + dy ** 2);
        const t  = Math.max(0, 1 - d / THRESHOLD);
        el.style.setProperty('--prox', t.toFixed(3));
      }
    });
  }

  function _onLeave() {
    if (_raf) {
      cancelAnimationFrame(_raf);
    }
    _reset();
  }

  let _ro = null;

  onMounted(() => {
    const root = containerRef.value;
    if (!root) {
      return;
    }
    root.addEventListener('pointermove', _onMove, { passive: true });
    root.addEventListener('pointerleave', _onLeave);
    window.addEventListener('scroll', _invalidate, { passive: true });
    _ro = new ResizeObserver(_invalidate);
    _ro.observe(root);
  });

  onBeforeUnmount(() => {
    const root = containerRef.value;
    if (root) {
      root.removeEventListener('pointermove', _onMove);
      root.removeEventListener('pointerleave', _onLeave);
    }
    window.removeEventListener('scroll', _invalidate);
    if (_raf) {
      cancelAnimationFrame(_raf);
    }
    if (_ro) {
      _ro.disconnect();
    }
    _reset();
  });
}
