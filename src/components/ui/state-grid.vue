<script setup>
/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 *
 * 3×3 micro-loader pattern. All styling lives in the global `.state-grid`
 * utility (src/scss/abstracts/_theme.scss); this primitive just stamps the
 * 9-span markup so callers don't hand-copy it.
 */
</script>

<template>
  <span class="state-grid" aria-hidden="true">
    <span /><span /><span />
    <span /><span /><span />
    <span /><span /><span />
  </span>
</template>
