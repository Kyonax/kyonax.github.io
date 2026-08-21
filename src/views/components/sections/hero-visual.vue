<script setup>
/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 */

import { warmImageViewer } from '@composables/use-warm-modal';
import HeroDataFeed from '@sections/hero-data-feed.vue';
import UiImage from '@ui/image.vue';

defineProps({
  ariaLabel: { type: String, required: true },
  alt: { type: String, required: true },
});

defineEmits(['open']);
</script>

<template>
  <div class="hero-visual">
    <div class="hero-visual__unit">
      <div class="hero-visual__meta" aria-hidden="true">
        <span class="hero-visual__meta-frame">
          <span class="ccs-glyph">▣</span>
        </span>
        <span class="hero-visual__meta-handle" />
      </div>
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
          aspect="1 / 1"
          :size="{ sm: 240, md: 300, lg: 360, xl: 420 }"
          fit="cover"
          position="top center"
          sizes="(max-width: 768px) 70vw, 380px"
          eager
        />
        <div class="hero-visual__inner" aria-hidden="true" />
      </button>
      <HeroDataFeed />
    </div>
  </div>
</template>

<style lang="scss" scoped>
.hero-visual {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-self: center;

  @include max-media-query(lg) {
    justify-self: stretch;
    width: 100%;
  }

  /* Frame + data feed share one continuous outline: the feed draws its own
     side/bottom borders with border-top: 0, so the frame's bottom hairline
     doubles as the divider and the whole unit reads as one instrument. */
  &__unit {
    position: relative;
    display: flex;
    flex-direction: column;

    @include max-media-query(lg) {
      width: 100%;
      max-width: 320px;
      margin-inline: auto;
    }

    /* 810-1023px the hero is one column and the 320px unit leaves ~300px dead
       on each side, so the feed moves beside the frame. Grid, not flex: the
       meta strip must stay above the frame while the feed spans neither. */
    @include between-media-query(tab, md) {
      display: grid;
      /* px, not rem: the unit's own max-width is px and the root font-size
         drops to 12px in this band, which would shrink the portrait. */
      grid-template-columns: 320px minmax(0, 1fr);
      max-width: 704px;
    }
  }

  /* Column 1 keeps the meta strip stacked over the frame; the feed takes
     column 2 on the frame's row only, so their top and bottom edges align. */
  @include between-media-query(tab, md) {
    &__meta { grid-column: 1; grid-row: 1; }

    &__frame { grid-column: 1; grid-row: 2; }

    :deep(.hero-data-feed) { grid-column: 2; grid-row: 2; }
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

  /* Inside __unit so both lines end exactly on the frame's right edge at
     every breakpoint — the unit is the width authority, not a magic number. */
  &__meta {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    text-align: right;

    /* Beside the frame the strip reads as the unit's masthead, so it hangs
       off the left edge instead of trailing the portrait's right. */
    @include between-media-query(tab, md) {
      align-items: flex-start;
      text-align: left;
    }
    margin-bottom: 0.75rem;
    font-family: "SpaceMono", monospace;
    font-size: var(--fs-100);
    line-height: 1.5;
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
