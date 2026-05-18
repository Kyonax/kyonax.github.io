<script setup>
/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 *
 * Eager-bundled fallback for `defineAsyncComponent` so the click
 * registers visually before the lazy chunk lands. Intentionally
 * propless — the real modal swaps in once the chunk resolves.
 */
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
</script>

<template>
  <div class="modal-loading">
    <span class="sr-only" aria-live="polite">{{ t('kyo-web.landing.modal.loading') }}</span>
    <div class="modal-loading__backdrop" aria-hidden="true" />
    <div class="modal-loading__frame" aria-hidden="true">
      <div class="modal-loading__skeleton" />
    </div>
  </div>
</template>

<style lang="scss" scoped>
.modal-loading {
  position: fixed;
  inset: 0;
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  /* Whole shell fades in over one frame so the placeholder doesn't
     "snap" on top of the page. */
  animation: modal-loading-fade-in 120ms ease-out;

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }

  @include max-media-query(md) {
    padding: 0.5rem;
  }

  &__backdrop {
    position: absolute;
    inset: 0;
    background: color-mix(in srgb, var(--clr-neutral-500) 78%, transparent);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    transform: translateZ(0);
    will-change: transform;
  }

  &__frame {
    position: relative;
    width: min(85dvw, 900px);
    aspect-ratio: 16 / 10;
    max-height: 85dvh;
    border: 1px solid var(--clr-border-100);
    background: color-mix(in srgb, var(--clr-neutral-500) 92%, var(--clr-primary-100) 4%);
    overflow: hidden;
    isolation: isolate;
  }

  &__skeleton { @include media-skeleton(2); }
}

@keyframes modal-loading-fade-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}
</style>
