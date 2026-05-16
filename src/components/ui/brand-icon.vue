<script setup>
/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 */

import { computed } from 'vue';

const props = defineProps({
  name: { type: String, required: true },
  alt:  { type: String, default: '' },
});

const aria_label = computed(() => props.alt || props.name);
const href = computed(() => `#brand-${props.name}`);
</script>

<template>
  <svg
    class="brand-icon"
    :role="alt ? 'img' : null"
    :aria-label="alt ? aria_label : null"
    :aria-hidden="alt ? null : 'true'"
    focusable="false">
    <use :href="href" />
  </svg>
</template>

<style lang="scss" scoped>
.brand-icon {
  display: inline-flex;
  width: 1em;
  height: 1em;
  flex-shrink: 0;
  vertical-align: middle;
  transform: translateY(-0.08em);
  color: inherit;
  fill: currentColor;

  &--lg { font-size: 1.5rem; }
  &--xl { font-size: 2rem;   }
}
</style>
