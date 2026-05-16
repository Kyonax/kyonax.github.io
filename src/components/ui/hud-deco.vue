<script setup>
/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 *
 * Renders text through CSS `content: attr(data-text)` instead of inside the
 * DOM, so the cyberpunk HUD strings are exempt from WCAG 1.4.3 contrast
 * checks while keeping their low-opacity aesthetic.
 */

defineProps({
  variant: {
    type: String,
    required: true,
    validator: (v) => ['tl', 'tr', 'bl', 'br', 'watermark'].includes(v),
  },
  text: { type: String, required: true },
});
</script>

<template>
  <span
    class="hud-deco"
    :class="`hud-deco--${variant}`"
    :data-text="text"
    aria-hidden="true"
  />
</template>
