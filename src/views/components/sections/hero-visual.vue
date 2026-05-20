<script setup>
/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 */

import { warmImageViewer } from '@composables/use-warm-modal';
import UiImage from '@ui/image.vue';

defineProps({
  ariaLabel: { type: String, required: true },
  alt: { type: String, required: true },
});

defineEmits(['open']);
</script>

<template>
  <div class="hero-visual">
    <button
      type="button"
      class="hero-visual__frame"
      :aria-label="ariaLabel"
      @click="$emit('open')"
      @pointerenter="warmImageViewer"
      @focus="warmImageViewer"
    >
      <UiImage
        img="kyonax_portrait"
        :alt="alt"
        aspect="3 / 4"
        :size="{ sm: 240, md: 300, lg: 360, xl: 420 }"
        fit="cover"
        position="top center"
        sizes="(max-width: 768px) 70vw, 380px"
        eager
      />
      <div class="hero-visual__inner" aria-hidden="true" />
    </button>
    <div class="hero-visual__meta" aria-hidden="true">
      <span class="hero-visual__meta-frame">
        <span class="ccs-glyph">▣</span>
      </span>
      <span class="hero-visual__meta-handle" />
    </div>
  </div>
</template>

<style lang="scss" scoped>
.hero-visual {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
  justify-self: center;

  @include max-media-query(lg) {
    justify-self: stretch;
    width: 100%;
  }

  &__frame {
    position: relative;
    padding: 0.5rem;
    border: 1px solid var(--clr-border-100);
    background: var(--clr-neutral-500);
    overflow: hidden;
    display: flex;
    color: inherit;
    font: inherit;
    cursor: zoom-in;
    text-align: left;
    transition: border-color 0.2s ease;

    &:hover {
      border-color: var(--clr-primary-100);
    }

    &:focus-visible {
      outline: 2px solid var(--clr-primary-100);
      outline-offset: 4px;
    }

    :deep(.ui-image) { display: block; }

    @include max-media-query(lg) {
      display: block;
      width: 100%;
      max-width: 320px;
      margin-inline: auto;

      :deep(.ui-image) {
        width: 100%;
        margin: 0;
      }

      :deep(.ui-image__frame) {
        aspect-ratio: 1 / 1 !important;
        width: 100% !important;
        max-width: none !important;
      }
    }

    &::before,
    &::after {
      content: "";
      position: absolute;
      width: 16px;
      height: 16px;
      border: 1px solid var(--clr-border-100);
      pointer-events: none;
      z-index: 2;
      transition: border-color 0.2s ease;
    }
    &::before { top: -5px; left: -5px;  border-right: 0; border-bottom: 0; }
    &::after  { bottom: -5px; right: -5px; border-left: 0;  border-top: 0; }
    &:hover::before,
    &:hover::after { border-color: var(--clr-primary-100); }
  }

  &__inner {
    position: absolute;
    inset: 0;
    pointer-events: none;
    background:
      linear-gradient(
        to bottom,
        transparent 0%,
        color-mix(in srgb, var(--clr-primary-100) 6%, transparent) 38%,
        color-mix(in srgb, var(--clr-primary-100) 28%, transparent) 50%,
        color-mix(in srgb, var(--clr-primary-100) 6%, transparent) 62%,
        transparent 100%
      );
    mix-blend-mode: screen;
    opacity: 0.55;
    animation: hero-visual-scan 12s linear infinite;
    z-index: 1;
  }

  &__meta {
    display: flex;
    justify-content: space-between;
    width: 100%;
    max-width: 380px;
    font-family: "SpaceMono", monospace;
    font-size: var(--fs-100);
    color: var(--clr-neutral-300);
    letter-spacing: 0.08em;

    /* Decorative text rendered via CSS `content:` so the low-contrast aesthetic
       is exempt from WCAG 1.4.3 — same pattern as <UiHudDeco>. */
    &-frame {
      &::before { content: "FRAME // "; }
      &::after  { content: "-001"; }
    }
    &-handle::before { content: "@KYONAX_ON_TECH"; }
  }
}

@keyframes hero-visual-scan {
  0%   { transform: translateY(-100%); }
  100% { transform: translateY(100%); }
}
</style>
