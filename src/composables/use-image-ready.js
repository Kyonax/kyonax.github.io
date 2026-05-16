/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 *
 * `v-image-ready` directive — fires its handler on the <img>'s `load`
 * event OR immediately if the browser already has the bytes cached.
 * Closes the gap between preload-finishes-first and Vue-attaches-listener
 * later (without that, hot-cached images never fire `@load` and any
 * dependent UI state stalls). The handler receives the <img> element so
 * consumers can read `el.currentSrc` for cache-pin work. Also fires on
 * `error` so a failed network doesn't leave placeholders spinning.
 */

export const vImageReady = {
  mounted(el, binding) {
    const fire = () => {
      try {
        binding.value?.(el); 
      } catch { /* swallow — UI-only handler */ }
    };
    if (el.complete && el.naturalWidth > 0) {
      fire();
      return;
    }
    el.addEventListener('load', fire, { once: true });
    el.addEventListener('error', fire, { once: true });
  },
};
