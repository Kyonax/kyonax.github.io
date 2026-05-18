/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
* Distributed under the terms of GPL-2.0-only — see LICENSE.
 */

import { onBeforeUnmount, onMounted, unref } from 'vue';

let _observer = null;
const _targets = new WeakMap();

const _get_observer = () => {
  if (_observer) {
    return _observer;
  }
  if (typeof IntersectionObserver === 'undefined') {
    return null;
  }
  _observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const handler = _targets.get(entry.target);
        if (handler) {
          handler(entry.isIntersecting);
        }
      }
    },
    { rootMargin: '200px 0px', threshold: 0 },
  );
  return _observer;
};

export const useInViewport = (target_ref, options = {}) => {
  const attr = options.attribute || 'data-in-viewport';

  const on_change = (visible) => {
    const el = unref(target_ref);
    if (!el) {
      return;
    }
    el.setAttribute(attr, visible ? 'true' : 'false');
  };

  onMounted(() => {
    const el = unref(target_ref);
    if (!el) {
      return;
    }
    el.setAttribute(attr, 'false');
    const observer = _get_observer();
    if (!observer) {
      el.setAttribute(attr, 'true');
      return;
    }
    _targets.set(el, on_change);
    observer.observe(el);
  });

  onBeforeUnmount(() => {
    const el = unref(target_ref);
    if (!el || !_observer) {
      return;
    }
    _observer.unobserve(el);
    _targets.delete(el);
  });
};

export default useInViewport;
