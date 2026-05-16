<script setup>
/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 */

import { computed } from 'vue';

const props = defineProps({
  tag: { type: String, required: true },
  title: { type: String, required: true },
  subtitle: { type: String, default: '' },
  level: {
    type: String,
    default: '2',
    validator: (l) => ['2', '3', '4'].includes(l),
  },
});

const heading_tag = computed(() => `h${props.level}`);
</script>

<template>
  <header class="ui-section-header">
    <span class="ui-section-header__index">{{ tag }}</span>
    <component :is="heading_tag" class="ui-section-header__title">
      {{ title }}
    </component>
    <p v-if="subtitle" class="ui-section-header__subtitle">
      {{ subtitle }}
    </p>
  </header>
</template>

<style lang="scss" scoped>
.ui-section-header {
  margin-bottom: 3rem;
  border-bottom: 1px solid var(--clr-border-100);
  padding-bottom: 1.25rem;

  &__index {
    font-family: "SpaceMono", monospace;
    font-size: var(--fs-200);
    color: var(--clr-primary-100);
    letter-spacing: 0.12em;
    display: block;
    margin-bottom: 0.5rem;
  }

  &__title {
    font-family: "Geomanist", sans-serif;
    font-size: var(--fs-700);
    color: var(--clr-neutral-50);
    margin: 0 0 0.5rem;
    letter-spacing: -0.01em;
    line-height: 1;
  }

  &__subtitle {
    font-family: "Geomanist", sans-serif;
    font-size: var(--fs-400);
    line-height: 1.6;
    letter-spacing: 0.012em;
    word-spacing: 0.04em;
    color: var(--clr-neutral-100);
    margin: 0;
    max-width: 60ch;
  }
}
</style>
