<script setup>
/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 */

import { computed } from 'vue';

const props = defineProps({
  name:  { type: String, required: true },
  alt:   { type: String, default: '' },
});

const svg_modules = import.meta.glob(
  '@assets/brands/*.svg',
  { eager: true, query: '?raw', import: 'default' },
);

const svg_map = Object.fromEntries(
  Object.entries(svg_modules).map(([path, src]) => {
    const file = path.split('/').pop();
    const base = file.replace(/\.svg$/, '');
    return [base, src];
  }),
);

const svg_markup = computed(() => svg_map[props.name] || '');
const aria_label = computed(() => props.alt || props.name);
</script>

<template>
  <span
    v-if="svg_markup"
    class="brand-icon"
    :role="alt ? 'img' : null"
    :aria-label="alt ? aria_label : null"
    :aria-hidden="alt ? null : 'true'"
    v-html="svg_markup" />
</template>

<style lang="scss" scoped>
.brand-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1em;
  height: 1em;
  flex-shrink: 0;
  
  vertical-align: middle;
  transform: translateY(-0.08em);
  color: inherit;

  &--lg { font-size: 1.5rem; }
  &--xl { font-size: 2rem;   }

  
  :deep(svg) {
    width: 1em;
    height: 1em;
    fill: currentColor;
  }
}
</style>
