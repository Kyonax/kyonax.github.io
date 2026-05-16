<script setup>
/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 */

import { computed } from 'vue';

const props = defineProps({
  level:   {
    type: String,
    default: '3',
    validator: (l) => ['2', '3', '4'].includes(l),
  },
  variant: {
    type: String,
    default: 'global',
    validator: (v) => ['global', 'hud'].includes(v),
  },
});

const tag = computed(() => `h${props.level}`);

const class_list = computed(() => [
  'ui-section-heading',
  `ui-section-heading--${props.variant}`,
]);
</script>

<template>
  <component
    :is="tag"
    :class="class_list"
  >
    <slot />
  </component>
</template>

<style lang="scss" scoped>
.ui-section-heading {
  margin: 0;
  letter-spacing: 0.04em;

  &--global {
    font-family: "Geomanist", sans-serif;
    font-size: var(--fs-500);
    font-weight: 700;
    color: var(--clr-primary-100);
    text-transform: uppercase;
    margin-bottom: 0.75rem;
  }

  &--hud {
    font-family: "SpaceMono", monospace;
    font-size: var(--fs-200);
    font-weight: 400;
    color: var(--clr-neutral-300);
    border: 1px solid var(--clr-border-100);
    padding: 0.4rem 0.6rem;
    text-transform: uppercase;
  }
}
</style>
