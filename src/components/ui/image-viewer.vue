<script setup>
/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 */

import { computed } from 'vue';

import UiModal from '@ui/modal.vue';
import BlastImage from '@components/blast-image.vue';
import YoutubeFacade from '@ui/youtube-facade.vue';

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

const dialog_label = computed(() =>
  props.ariaLabel
    || props.alt
    || (props.picture?.title)
    || (props.picture?.name)
    || props.img
    || 'Image viewer',
);
</script>

<template>
  <UiModal
    :is-open="isOpen"
    size="lg"
    chromeless
    :aria-label="dialog_label"
    :close-label="closeLabel"
    @close="$emit('close')">
    <div class="image-viewer" :class="{ 'image-viewer--video': is_youtube }">
      <YoutubeFacade
        v-if="is_youtube"
        class="image-viewer__video"
        :video-id="picture.id"
        :title="picture.title || alt"
        :poster="picture"
        :channel="picture.channel"
        :show-channel="picture.showChannel"
        auto-load />
      <BlastImage
        v-else-if="img"
        class="image-viewer__picture"
        :img="img"
        :alt="alt"
        sizes="95vw"
        eager />
      <picture v-else-if="picture" class="image-viewer__picture">
        <source v-if="picture.avif" :srcset="picture.avif" type="image/avif">
        <source v-if="picture.webp" :srcset="picture.webp" type="image/webp">
        <img
          :src="picture.fallback"
          :alt="alt"
          class="image-viewer__img"
          loading="eager"
          decoding="async">
      </picture>
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

  &--video {
    display: block;
    width: min(95dvw, calc(90dvh * 16 / 9));
    aspect-ratio: 16 / 9;
    background: var(--clr-neutral-900);
  }

  &__video {
    position: absolute;
    inset: 0;
  }

  &__picture {
    display: block;

    :deep(img) {
      display: block;
      max-width: 95dvw;
      max-height: 90dvh;
      width: auto;
      height: auto;
    }
  }

  &__img {
    display: block;
    max-width: 95dvw;
    max-height: 90dvh;
    width: auto;
    height: auto;
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
