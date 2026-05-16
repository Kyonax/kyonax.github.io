<script setup>
/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 */

import { BRAND_SVG_SOURCES } from '@data/brand-icons';

const SPRITE_MARKUP = (() => {
  const symbols = [];
  for (const [id, raw] of Object.entries(BRAND_SVG_SOURCES)) {
    const view_box = raw.match(/<svg\b[^>]*viewBox\s*=\s*"([^"]+)"/);
    const inner = raw
      .replace(/^[\s\S]*?<svg[^>]*>/, '')
      .replace(/<\/svg>[\s\S]*$/, '')
      .trim();
    const vb = view_box ? view_box[1] : '0 0 24 24';
    symbols.push(
      `<symbol id="brand-${id}" viewBox="${vb}">${inner}</symbol>`,
    );
  }
  return symbols.join('');
})();
</script>

<template>
  <svg
    class="icon-sprite"
    width="0"
    height="0"
    aria-hidden="true"
    focusable="false"
    v-html="SPRITE_MARKUP" />
</template>

<style lang="scss" scoped>
.icon-sprite {
  position: absolute;
  width: 0;
  height: 0;
  overflow: hidden;
  pointer-events: none;
}
</style>
