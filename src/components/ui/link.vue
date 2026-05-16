<script setup>
/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 */

import { computed, useAttrs } from 'vue';

defineOptions({ inheritAttrs: false });

const props = defineProps({
  href:        { type: String, required: true },
  variant:     {
    type: String,
    default: 'secondary',
    validator: (v) => ['primary', 'secondary', 'ghost', 'card', 'cyber', 'cyber-outline'].includes(v),
  },
  size:        {
    type: String,
    default: 'md',
    validator: (s) => ['sm', 'md', 'lg'].includes(s),
  },
  download:    { type: [Boolean, String], default: false },
  external:    { type: Boolean, default: false },
  flareDelay:  { type: String, default: '' },
});

const attrs = useAttrs();

const class_list = computed(() => [
  'ui-link',
  `ui-link--${props.variant}`,
  `ui-link--size-${props.size}`,
  props.flareDelay ? 'element-flare' : null,
]);

const inline_style = computed(() =>
  props.flareDelay ? { '--element-flare-delay': props.flareDelay } : null,
);

const target_attr = computed(() => (props.external ? '_blank' : null));
const rel_attr    = computed(() => (props.external ? 'noopener' : null));

const download_attr = computed(() => {
  if (props.download === false) return null;
  if (props.download === true) return '';
  return props.download;
});
</script>

<template>
  <a
    :href="href"
    :target="target_attr"
    :rel="rel_attr"
    :download="download_attr"
    :class="class_list"
    :style="inline_style"
    v-bind="attrs">
    <slot />
  </a>
</template>

<style lang="scss" scoped>
.ui-link {
  text-decoration: none;
  font-family: "Geomanist", sans-serif;
  letter-spacing: 0.04em;
  transition:
    background-color 0.2s ease,
    border-color    0.2s ease,
    color           0.2s ease,
    transform       0.2s ease;

  &--size-sm { padding: 0.4rem 0.6rem; font-size: var(--fs-200); }
  &--size-md { padding: 0.6rem 1rem;   font-size: var(--fs-300); }
  &--size-lg { padding: 0.8rem 1.4rem; font-size: var(--fs-400); }

  &--primary {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.4rem;
    line-height: 1;
    text-align: center;
    background: var(--clr-neutral-500);
    color: var(--clr-primary-100);
    border: 1px solid var(--clr-border-100);
    font-weight: 700;

    &:hover,
    &:focus-visible {
      background: var(--clr-primary-100);
      color: var(--clr-neutral-500);
    }
  }

  &--secondary {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.4rem;
    line-height: 1;
    text-align: center;
    background: transparent;
    color: var(--clr-neutral-200);
    border: 1px solid var(--clr-border-100);

    &:hover,
    &:focus-visible {
      color: var(--clr-primary-100);
      border-color: var(--clr-primary-100);
    }
  }

  &--ghost {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0.25rem 0.5rem;
    background: transparent;
    color: var(--clr-neutral-50);
    border: 0;

    &:hover,
    &:focus-visible {
      color: var(--clr-primary-100);
    }
  }

  &--card {
    display: block;
    width: 100%;
    padding: 1rem;
    background: var(--clr-neutral-500);
    color: var(--clr-neutral-50);
    border: 1px solid var(--clr-border-100);

    &:hover,
    &:focus-visible {
      border-color: var(--clr-primary-100);
      color: var(--clr-primary-100);
    }
  }


  &--cyber {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.4rem;
    line-height: 1;
    text-align: center;
    background: var(--clr-neutral-500);
    color: var(--clr-primary-100);
    border: 1px solid var(--clr-primary-100);
    font-family: "SpaceMono", monospace;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.16em;
    transition: transform 0.2s ease;
    clip-path: polygon(
      0 0,
      calc(100% - 14px) 0,
      100% 14px,
      100% 100%,
      14px 100%,
      0 calc(100% - 14px)
    );

    &:hover,
    &:focus-visible {
      color: var(--clr-neutral-50);
      background: color-mix(in srgb, var(--clr-primary-100) 12%, var(--clr-neutral-500));
      transform: translateY(-2px);
      outline: none;
    }

    &:focus-visible {
      box-shadow: inset 0 0 0 2px var(--clr-neutral-50);
    }
  }


  &--cyber-outline {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.4rem;
    line-height: 1;
    text-align: center;
    background: transparent;
    color: var(--clr-neutral-50);
    border: 1px solid var(--clr-border-100);
    font-family: "SpaceMono", monospace;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.16em;
    transition:
      background-color 0.3s ease,
      color 0.3s ease,
      transform 0.2s ease;

    &::before,
    &::after {
      content: "";
      position: absolute;
      width: 14px;
      height: 14px;
      border: 1px solid var(--clr-primary-100);
      pointer-events: none;
      transition:
        width 0.4s var(--ease-standard),
        height 0.4s var(--ease-standard) 0.2s;
    }
    &::before { top: -1px;    left: -1px;    border-right: 0; border-bottom: 0; }
    &::after  { bottom: -1px; right: -1px;   border-left: 0;  border-top: 0; }

    &:hover,
    &:focus-visible {
      color: var(--clr-primary-100);
      background: color-mix(in srgb, var(--clr-primary-100) 5%, transparent);
      outline: none;

      &::before,
      &::after {
        width: calc(100% + 2px);
        height: calc(100% + 2px);
      }
    }

    &:focus-visible {
      outline: 2px solid var(--clr-primary-100);
      outline-offset: 4px;
    }
  }
}
</style>
