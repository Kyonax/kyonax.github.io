<script setup>
/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 *
 * Generic star rating — renders `max` pips, filling `rating` of them. Sources
 * without a rating (e.g. LinkedIn recommendations) simply don't mount it, so
 * stars only ever appear for rated reviews (Google, etc.).
 */

import { computed } from 'vue';

const props = defineProps({
  rating: { type: Number, required: true },
  max:    { type: Number, default: 5 },
  label:  { type: String, default: '' },
});

const pips = computed(() =>
  Array.from({ length: props.max }, (_, i) => i < Math.round(props.rating)),
);
</script>

<template>
  <span class="ui-rating-stars" role="img" :aria-label="label">
    <span
      v-for="(filled, i) in pips"
      :key="i"
      class="ui-rating-stars__star"
      :class="{ 'is-empty': !filled }"
      aria-hidden="true"
    />
  </span>
</template>

<style lang="scss" scoped>
.ui-rating-stars {
  display: inline-flex;
  align-items: center;
  gap: 0.22rem;
  flex-shrink: 0;

  &__star {
    width: 0.72rem;
    height: 0.72rem;
    background: var(--clr-primary-100);
    clip-path: polygon(50% 0, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%);

    &.is-empty {
      background: color-mix(in srgb, var(--clr-neutral-100) 22%, transparent);
    }
  }
}
</style>
