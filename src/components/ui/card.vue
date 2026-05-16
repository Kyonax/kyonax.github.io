<script setup>
/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 */

import { computed } from 'vue';

const props = defineProps({
  padding:     {
    type: String,
    default: 'md',
    validator: (p) => ['sm', 'md', 'lg', 'none'].includes(p),
  },
  interactive: { type: Boolean, default: false },
  as:          { type: String, default: 'div' },
});

const class_list = computed(() => [
  'ui-card',
  `ui-card--padding-${props.padding}`,
  props.interactive ? 'ui-card--interactive' : null,
]);
</script>

<template>
  <component
    :is="as"
    :class="class_list"
  >
    <slot />
  </component>
</template>

<style lang="scss" scoped>
.ui-card {
  position: relative;
  background: var(--clr-neutral-500);
  border: 1px solid var(--clr-border-100);
  transition: border-color 0.2s ease;

  &--padding-none { padding: 0; }
  &--padding-sm   { padding: 0.5rem; }
  &--padding-md   { padding: 1rem; }
  &--padding-lg   { padding: 1.5rem; }

  &--interactive {
    cursor: pointer;

    &:hover,
    &:focus-within {
      border-color: var(--clr-primary-100);
    }
  }
}
</style>
