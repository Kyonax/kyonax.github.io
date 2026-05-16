<script setup>
/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 */

import BlastImage from '@components/blast-image.vue';
import { vImageReady } from '@composables/use-image-ready';
import { retainImageUrl } from '@composables/use-warm-modal';
import UiModal from '@ui/modal.vue';
import { computed, defineAsyncComponent, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

/* YoutubeFacade only renders when picture.kind === 'youtube', which in
   the current flows is unreachable from non-YT call-sites (hero portrait
   uses `img`, now-projects opens image-viewer only via the non-YT button
   branch). Keeping it lazy means callers that never trigger the YT path
   pay zero bytes for the facade. */
const YoutubeFacade = defineAsyncComponent(() => import('@ui/youtube-facade.vue'));

const props = defineProps({
  isOpen: { type: Boolean, required: true },
  closeLabel: { type: String, default: 'Close' },
  ariaLabel: { type: String, default: '' },
  img: { type: String, default: '' },
  picture: { type: Object, default: null },
  alt: { type: String, default: '' },
});

defineEmits(['close']);

const is_youtube = computed(() => props.picture?.kind === 'youtube');

const loaded = ref(false);
const on_loaded = (el) => {
  loaded.value = true;
  /* `currentSrc` is the URL the browser actually picked from <picture>
     negotiation. Pin it so reopening this lightbox doesn't re-fetch.
     The directive passes the <img> element; BlastImage emits load
     without an arg, so we skip the pin step there (BlastImage already
     pins via its own `_on_load`). */
  if (el?.currentSrc) retainImageUrl(el.currentSrc);
};

/* Reset every time the viewer opens a new source. Cached browser hits will
   re-emit `load` synchronously and flip `loaded` back to true within the
   same tick, so the skeleton flashes only on cold network. */
watch(
  () => [props.isOpen, props.img, props.picture?.fallback],
  () => { loaded.value = false; },
);

const label = computed(() => {
  if (is_youtube.value) {
    return `// YT :: ${(props.picture.id || '').toUpperCase()}`;
  }
  if (props.picture) {
    const name = (props.picture.name || '').toUpperCase();
    const ext = props.picture.ext ? `.${props.picture.ext.toUpperCase()}` : '';
    return `// IMG :: ${name}${ext}`;
  }
  if (props.img) {
    return `// IMG :: ${props.img.toUpperCase()}.JPG`;
  }
  return '';
});

const { t } = useI18n();
const dialog_label = computed(() =>
  props.ariaLabel
    || props.alt
    || (props.picture?.title)
    || (props.picture?.name)
    || props.img
    || t('kyo-web.landing.modal.image-viewer-default'),
);
</script>

<template>
  <UiModal
    :is-open="isOpen"
    size="lg"
    chromeless
    :aria-label="dialog_label"
    :close-label="closeLabel"
    @close="$emit('close')"
  >
    <div
      class="image-viewer"
      :class="{ 'image-viewer--video': is_youtube, 'is-loaded': loaded || is_youtube }"
    >
      <YoutubeFacade
        v-if="is_youtube"
        class="image-viewer__video"
        :video-id="picture.id"
        :title="picture.title || alt"
        :poster="picture"
        :channel="picture.channel"
        :show-channel="picture.showChannel"
        auto-load
      />
      <BlastImage
        v-else-if="img"
        class="image-viewer__picture"
        :img="img"
        :alt="alt"
        sizes="95vw"
        eager
        @load="on_loaded"
      />
      <picture v-else-if="picture" class="image-viewer__picture">
        <source v-if="picture.avif" :srcset="picture.avif" type="image/avif" />
        <source v-if="picture.webp" :srcset="picture.webp" type="image/webp" />
        <img
          v-image-ready="on_loaded"
          :src="picture.fallback"
          :alt="alt"
          class="image-viewer__img"
          loading="eager"
          decoding="async"
        />
      </picture>
      <div
        v-if="!is_youtube"
        class="image-viewer__skeleton"
        aria-hidden="true"
      />
      <span v-if="label" class="image-viewer__name" aria-hidden="true">
        {{ label }}
      </span>
    </div>
  </UiModal>
</template>

<style lang="scss" scoped>
.image-viewer {
  display: inline-flex;
  position: relative;
  /* Generous default canvas: until <img> reports intrinsic dimensions the
     wrapper would otherwise collapse and the skeleton would render as a
     thin sliver. Tuned to ~80% of the viewport so the placeholder feels
     "modal-sized" rather than chip-sized. 16/10 matches typical screenshot
     ratios used in the project carousel. The `is-loaded` reset below drops
     these constraints so the real image owns its own box. */
  width: min(85dvw, 960px);
  max-height: 85dvh;
  aspect-ratio: 16 / 10;

  &--video {
    display: block;
    width: min(95dvw, calc(90dvh * 16 / 9));
    aspect-ratio: 16 / 9;
    background: var(--clr-neutral-900);
    max-height: none;
  }

  &.is-loaded {
    width: auto;
    max-height: none;
    aspect-ratio: auto;
  }

  &__video {
    position: absolute;
    inset: 0;
  }

  &__picture {
    display: block;
    position: relative;
    z-index: 2;

    :deep(img) {
      display: block;
      max-width: 95dvw;
      max-height: 90dvh;
      width: auto;
      height: auto;
      opacity: 0;
      transition: opacity 0.4s ease;
    }
  }

  &.is-loaded &__picture :deep(img),
  &.is-loaded &__img {
    opacity: 1;
  }

  &__img {
    display: block;
    max-width: 95dvw;
    max-height: 90dvh;
    width: auto;
    height: auto;
    opacity: 0;
    transition: opacity 0.4s ease;
  }

  &__skeleton { @include media-skeleton; }
  &.is-loaded &__skeleton { opacity: 0; }

  @media (prefers-reduced-motion: reduce) {
    &__picture :deep(img),
    &__img,
    &__skeleton { transition: none; }
  }

  &__name {
    position: absolute;
    bottom: 0.6rem;
    right: 0.6rem;
    z-index: 4;
    font-family: "SpaceMono", monospace;
    font-size: var(--fs-100);
    letter-spacing: 0.12em;
    color: var(--clr-neutral-200);
    background: color-mix(in srgb, var(--clr-neutral-500) 80%, transparent);
    padding: 0.35rem 0.6rem;
    backdrop-filter: blur(4px);
    -webkit-backdrop-filter: blur(4px);
    pointer-events: none;
    line-height: 1;
  }
}
</style>
