/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 */

import { onBeforeUnmount, onMounted, ref } from 'vue';

const DEFAULT_THRESHOLD_PX = 300;

/**
 * @param {number} threshold_px — distance from page top before flipping.
 * @returns {{ scrolled: import('vue').Ref<boolean> }}
 */
export const useScrolledClass = (threshold_px = DEFAULT_THRESHOLD_PX) => {
  const scrolled = ref(false);
  let sentinel = null;
  let observer = null;

  onMounted(() => {
    sentinel = document.createElement('div');
    sentinel.style.cssText =
      `position:absolute;top:${threshold_px}px;height:1px;width:1px;` +
      'pointer-events:none;visibility:hidden;';
    document.body.appendChild(sentinel);

    observer = new IntersectionObserver(
      ([entry]) => {
        scrolled.value = !entry.isIntersecting;
      },
      { rootMargin: '0px', threshold: 0 },
    );
    observer.observe(sentinel);
  });

  onBeforeUnmount(() => {
    if (observer) {
      observer.disconnect();
      observer = null;
    }
    if (sentinel && sentinel.parentNode) {
      sentinel.parentNode.removeChild(sentinel);
      sentinel = null;
    }
  });

  return { scrolled };
};

export default useScrolledClass;
