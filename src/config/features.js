/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 *
 * Build-time feature flags. Read once at build time. Disabled features
 * are tree-shaken out:
 *   - Component chunk never ships (defineAsyncComponent + v-if at use-site)
 *   - Conditional <link> tags are omitted from <head>
 *   - Imports of disabled modules are eliminated
 *
 * Override at compile time:
 *   VITE_VIMEO_ENABLED=false npm run build       — disable Vimeo
 *   VITE_VIMEO_PRECONNECT=false npm run build    — keep embed but skip preconnect
 *
 * Adding a new flag: define it here, plumb it through vite.config.js
 * (define + vite-plugin-html if needed), and gate use-sites with v-if.
 */

const env = (key, fallback) => {
  const val = import.meta.env?.[`VITE_${key}`];
  if (val === undefined || val === null) {
    return fallback;
  }
  if (typeof val === 'boolean') {
    return val;
  }
  return val === 'true' || val === '1';
};

export const FEATURES = {
  vimeo: {
    enabled:    env('VIMEO_ENABLED', false),
    videoEn:    '1114902415',
    videoEs:    '1114902626',
    facade:     true,
    poster:     '/assets/vimeo-poster.webp',
    preconnect: env('VIMEO_PRECONNECT', false),
    autoplay:   false,
    muted:      true,
    loop:       true,
  },
};

export default FEATURES;
