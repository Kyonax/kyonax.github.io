<script setup>
/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 */

import { computed, useAttrs } from 'vue';

defineOptions({ inheritAttrs: false });

const props = defineProps({
  name: { type: String, required: true },
  alt:  { type: String, default: '' },
});

const attrs = useAttrs();

/* Build at module scope so every <UiIcon> instance shares the same map. */
const icon_modules = import.meta.glob(
  '@assets/app/*.svg',
  { eager: true, query: '?url', import: 'default' },
);

const icon_map = Object.fromEntries(
  Object.entries(icon_modules).map(([path, url]) => {
    const file = path.split('/').pop();
    const base = file.replace(/\.svg$/, '');
    return [base, url];
  }),
);

const resolved = computed(() => icon_map[props.name] || null);
const alt_text = computed(() => props.alt || props.name);
</script>

<template>
  <img
    v-if="resolved"
    :src="resolved"
    :alt="alt_text"
    v-bind="attrs"
    decoding="async"
  />
</template>
