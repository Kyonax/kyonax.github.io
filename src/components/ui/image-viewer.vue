<script setup>
/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 */

import BlastImage from '@components/blast-image.vue';
import { vImageReady } from '@composables/use-image-ready';
import useImageZoom from '@composables/use-image-zoom';
import { retainImageUrl } from '@composables/use-warm-modal';
import UiModal from '@ui/modal.vue';
import {
  computed,
  defineAsyncComponent,
  onBeforeUnmount,
  ref,
  useId,
  watch,
} from 'vue';
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

/* Pinch / double-tap / wheel / drag-to-pan zoom, the toolbar's steps and the
   keys, for the still-image branches. The composable owns the stage's touch
   input, so native page zoom stays intact elsewhere; a YouTube embed renders
   no stage and is left untouched. */
const stage_ref = ref(null);
const {
  isZoomed,
  percent,
  canZoomIn,
  canZoomOut,
  zoomIn,
  zoomOut,
  fit,
  reset: resetZoom,
  onKeydown,
} = useImageZoom(stage_ref, '.image-viewer__picture');

const hint_id = useId();

const is_youtube = computed(() => props.picture?.kind === 'youtube');

const loaded = ref(false);
const on_loaded = (el) => {
  loaded.value = true;
  /* `currentSrc` is the URL the browser actually picked from <picture>
     negotiation. Pin it so reopening this lightbox doesn't re-fetch.
     The directive passes the <img> element; BlastImage emits load
     without an arg, so we skip the pin step there (BlastImage already
     pins via its own `_on_load`). */
  if (el?.currentSrc) {
    retainImageUrl(el.currentSrc);
  }
};

/* Reset every time the viewer opens a new source. Cached browser hits will
   re-emit `load` synchronously and flip `loaded` back to true within the
   same tick, so the skeleton flashes only on cold network. */
watch(
  () => [props.isOpen, props.img, props.picture?.fallback],
  () => {
    loaded.value = false;
    resetZoom();
  },
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

const zoom_label = computed(() =>
  t('kyo-web.landing.modal.zoom-level', { pct: percent.value }),
);

/*
 * THE STAGE TAKES THE FOCUS ITSELF, AND GIVES IT BACK.
 *
 * Every caller mounts this viewer already open (`v-if` + `:is-open="true"`),
 * and UiModal moves focus only when `isOpen` CHANGES — so it never moved: the
 * focus stayed on the button behind the backdrop, Tab walked the page under
 * the dialog, and Escape and every zoom key fired on the page, where nothing
 * listens for them (the dialog's keydown handler never saw them). The stage is
 * labelled and described, so a screen reader says what it is and how it
 * moves; a mouse opening shows no ring, a keyboard one does. The opener gets
 * the focus back on close. A YouTube embed has no stage and keeps its old
 * behaviour.
 *
 * Keyed on the stage's ref, not on `isOpen` plus a nextTick: template refs
 * land in the post-flush queue, which the app's <Suspense> can hold past that
 * tick, and the first version focused a ref that was still null.
 */
let opener = null;
watch(
  stage_ref,
  (stage) => {
    if (!stage || !props.isOpen) {
      return;
    }
    opener = document.activeElement;
    stage.focus({ preventScroll: true });
  },
  { flush: 'post' },
);
onBeforeUnmount(() => {
  if (stage_ref.value && opener?.isConnected && opener !== document.body) {
    opener.focus({ preventScroll: true });
  }
});
</script>

<template>
  <UiModal
    :is-open="isOpen"
    size="lg"
    chromeless
    :aria-label="dialog_label"
    :close-label="closeLabel"
    @close="$emit('close')"
    @keydown="onKeydown"
  >
    <div
      class="image-viewer"
      :class="{
        'image-viewer--video': is_youtube,
        'image-viewer--still': !is_youtube,
        'is-loaded': loaded || is_youtube,
        'is-zoomed': isZoomed,
      }"
    >
      <template v-if="is_youtube">
        <YoutubeFacade
          class="image-viewer__video"
          :video-id="picture.id"
          :title="picture.title || alt"
          :poster="picture"
          :channel="picture.channel"
          :show-channel="picture.showChannel"
          auto-load
        />
        <span v-if="label" class="image-viewer__name" aria-hidden="true">
          {{ label }}
        </span>
      </template>

      <template v-else>
        <!-- The stage is what the reader moves: it clips the picture, takes
             the gestures and, focused, the keys. The toolbar sits OUTSIDE it,
             so a quick double tap on "+" is two steps, never a stage zoom. -->
        <div
          ref="stage_ref"
          class="image-viewer__stage"
          role="application"
          tabindex="0"
          :aria-label="dialog_label"
          :aria-describedby="hint_id"
        >
          <BlastImage
            v-if="img"
            class="image-viewer__picture"
            :img="img"
            :alt="alt"
            sizes="95vw"
            eager
            @load="on_loaded"
          />
          <picture v-else-if="picture" class="image-viewer__picture">
            <source
              v-if="picture.avif"
              :srcset="picture.avif"
              type="image/avif"
            />
            <source
              v-if="picture.webp"
              :srcset="picture.webp"
              type="image/webp"
            />
            <img
              v-image-ready="on_loaded"
              :src="picture.fallback"
              :alt="alt"
              class="image-viewer__img"
              loading="eager"
              decoding="async"
            />
          </picture>
          <div class="image-viewer__skeleton" aria-hidden="true" />
          <span v-if="label" class="image-viewer__name" aria-hidden="true">
            {{ label }}
          </span>
        </div>

        <!-- aria-disabled, not disabled: a native disabled button drops the
             focus it holds, and FIT disables itself on every press — the
             keyboard reader would land on <body>, outside the dialog's trap.
             At a limit each action is already a no-op. -->
        <div class="image-viewer__tools">
          <button
            type="button"
            class="image-viewer__tool image-viewer__tool--sign"
            :aria-label="t('kyo-web.landing.modal.zoom-out')"
            :aria-disabled="!canZoomOut"
            @click="zoomOut"
          />
          <span
            class="image-viewer__zoom"
            role="status"
            :aria-label="zoom_label"
          >{{ percent }}%</span>
          <button
            type="button"
            class="image-viewer__tool image-viewer__tool--sign is-plus"
            :aria-label="t('kyo-web.landing.modal.zoom-in')"
            :aria-disabled="!canZoomIn"
            @click="zoomIn"
          />
          <button
            type="button"
            class="image-viewer__tool"
            :aria-label="t('kyo-web.landing.modal.zoom-fit-aria')"
            :aria-disabled="!canZoomOut"
            @click="fit"
          >
            {{ t('kyo-web.landing.modal.zoom-fit') }}
          </button>
        </div>
        <p :id="hint_id" class="sr-only">
          {{ t('kyo-web.landing.modal.zoom-hint') }}
        </p>
      </template>
    </div>
  </UiModal>
</template>

<style lang="scss" scoped>
.image-viewer {
  display: inline-flex;
  position: relative;
  /* Clip the picture once it is scaled past its own box so panning reveals
     the off-screen regions instead of overflowing the modal. */
  overflow: hidden;

  /* A toolbar button, and the height the toolbar takes from the picture: the
     button, the box's padding and hairlines, and the gap above it. 27px
     clears WCAG 2.5.8's 24px floor; a thumb gets 44px. */
  --image-viewer-tool: 2.25rem;
  --image-viewer-bar: calc(var(--image-viewer-tool) + 1rem);

  /* The still-image branch owns all of its touch input (pinch / pan), so the
     browser never starts a competing native gesture. Scoped away from the
     video variant, whose iframe handles its own interaction. */
  &:not(.image-viewer--video) {
    touch-action: none;
  }

  @media (pointer: coarse) {
    --image-viewer-tool: 44px;
  }

  &--video {
    display: block;
    width: min(95dvw, calc(90dvh * 16 / 9));
    aspect-ratio: 16 / 9;
    background: var(--clr-neutral-900);
    max-height: none;
  }

  /* The video variant is always `is-loaded`, so this is the box it renders
     at; the still branch's canvas lives on the stage, below. */
  &.is-loaded {
    width: auto;
    max-height: none;
    aspect-ratio: auto;
  }

  &__video {
    position: absolute;
    inset: 0;
  }

  /* A STILL IS A COLUMN: the stage, then the toolbar under it. The clipping
     above moves down to the stage, the part that zooms; the column only
     stacks the two, and must not clip the toolbar's focus ring. */
  &--still {
    flex-direction: column;
    align-items: center;
    overflow: visible;
  }

  &__stage {
    display: inline-flex;
    position: relative;
    overflow: hidden;
    /* The zoomed picture and its chip stack inside the stage, so the modal's
       close button always paints over them rather than trading places. */
    isolation: isolate;
    /* Generous default canvas: until <img> reports intrinsic dimensions the
       stage would otherwise collapse and the skeleton would render as a
       thin sliver. Tuned to ~80% of the viewport so the placeholder feels
       "modal-sized" rather than chip-sized. 16/10 matches typical screenshot
       ratios used in the project carousel. The `is-loaded` reset below drops
       these constraints so the real image owns its own box. */
    width: min(85dvw, 960px);
    max-height: calc(85dvh - var(--image-viewer-bar));
    aspect-ratio: 16 / 10;
    cursor: zoom-in;
    user-select: none;

    /* THE RING IS DRAWN INSIDE, AND ON A LAYER OF ITS OWN. The global ring
       sits 2px outside the box, which this frame's neighbours crowd, so it
       moves inside (outline-offset -2px), as the article's code blocks do. But
       an element's own outline paints UNDER its z-indexed picture, and the
       first ring was there and invisible; a layer above picture and chip
       (z-index 2 and 4) carries it instead. */
    &:focus-visible {
      outline: none;

      &::after {
        content: "";
        position: absolute;
        inset: 0;
        z-index: 5;
        outline: 2px solid var(--clr-primary-100);
        outline-offset: -2px;
        pointer-events: none;
      }
    }
  }

  &.is-loaded &__stage {
    width: auto;
    max-height: none;
    aspect-ratio: auto;
  }

  &__picture {
    display: block;
    position: relative;
    z-index: 2;

    :deep(img) {
      display: block;
      max-width: 95dvw;
      max-height: calc(90dvh - var(--image-viewer-bar));
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
    max-height: calc(90dvh - var(--image-viewer-bar));
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
    --kyo-backdrop-r: 4px;
    backdrop-filter: var(--kyo-backdrop);
    transform: translateZ(0);
    will-change: transform;
    pointer-events: none;
    line-height: 1;
    opacity: 1;
    transition: opacity 0.2s ease;
  }

  /* Fade the filename chip out while zoomed so it never overlaps the panned
     region the user is inspecting. */
  &.is-zoomed &__name { opacity: 0; }

  /*
   * THE TOOLBAR — the diagram viewer's, in this site's furniture: mono caps at
   * label size, muted ink, one hairline box on the page's ground.
   *
   * IT HAS A ROW OF ITS OWN, under the picture, never over it. A chart keeps
   * its labels in its corners — the top tick and the axis title on the left,
   * the first category along the foot — and a box laid over either corner hid
   * them at 100% on a phone, the one zoom where nothing can be panned into
   * view. The diagram viewer gives its controls a strip for the same reason.
   * Under the picture it also clears the close button (top right) and the name
   * chip (on the picture, bottom right) at every width, and a pan never
   * reaches it.
   */
  &__tools {
    display: inline-flex;
    align-self: flex-start;
    align-items: center;
    gap: 2px;
    margin-top: 0.4rem;
    padding: 2px;
    border: 1px solid var(--clr-border-100);
    background: var(--clr-neutral-500);
    font-family: "SpaceMono", monospace;
    font-size: var(--fs-200);
    letter-spacing: 0.12em;
    line-height: 1;
    text-transform: uppercase;
  }

  /* Square, one hairline, no radius. The accent is STATE — hover, focus and
     the press take it, a resting button never does — and the border follows
     the ink through currentColor, so the state is one token. Hover only where
     a pointer can hover: a tapped "+" kept it on a phone until the next tap. */
  &__tool {
    display: inline-flex;
    position: relative;
    align-items: center;
    justify-content: center;
    min-width: var(--image-viewer-tool);
    height: var(--image-viewer-tool);
    padding: 0 0.6rem;
    border: 1px solid transparent;
    border-radius: 0;
    background: transparent;
    color: var(--clr-neutral-200);
    font: inherit;
    letter-spacing: inherit;
    text-transform: inherit;
    cursor: pointer;
    transition: color 0.15s ease, border-color 0.15s ease;

    &:not([aria-disabled="true"]) {
      @media (hover: hover) {
        &:hover {
          border-color: currentColor;
          color: var(--clr-primary-100);
        }
      }

      &:focus-visible,
      &:active {
        border-color: currentColor;
        color: var(--clr-primary-100);
      }
    }

    &[aria-disabled="true"] {
      opacity: 0.4;
      cursor: default;
    }
  }

  /* THE SIGNS ARE DRAWN, NOT SET. The subset SpaceMono ships has no U+2212,
     so a typed "−" fell back to another face beside SpaceMono's own "+", and
     the hyphen standing in for it was a stub half the plus's width. Two bars
     of one weight make a pair that match each other and stay square. */
  &__tool--sign::before,
  &__tool--sign.is-plus::after {
    content: "";
    position: absolute;
    inset: 0;
    width: 0.9rem;
    height: 2px;
    margin: auto;
    background: currentColor;
  }

  &__tool--sign.is-plus::after {
    width: 2px;
    height: 0.9rem;
  }

  /* Wide enough for "800%", so the buttons never shift as the number grows. */
  &__zoom {
    min-width: 5.5ch;
    text-align: center;
    color: var(--clr-neutral-300);
  }
}
</style>

