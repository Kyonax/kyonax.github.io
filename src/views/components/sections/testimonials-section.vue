<script setup>
/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 */

import useInViewport from '@composables/use-in-viewport';
import { LINKEDIN_RECS_URL, TESTIMONIALS } from '@data/testimonials';
import BrandIcon     from '@ui/brand-icon.vue';
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const section_ref  = ref(null);
const carousel_ref = ref(null);
useInViewport(section_ref);

const COUNT   = TESTIMONIALS.length;
const AUTO_MS = 7500;
const DRAG_PX = 52;

const idx       = ref(0);
const dir       = ref(1);
const is_paused = ref(false);

const _mod = (n) => ((n % COUNT) + COUNT) % COUNT;

const go_to = (n, d) => {
  dir.value = d; idx.value = _mod(n); 
};
const next  = () => go_to(idx.value + 1,  1);
const prev  = () => go_to(idx.value - 1, -1);

const display_items = computed(() => [
  { ...TESTIMONIALS[_mod(idx.value - 1)], slot: 'prev' },
  { ...TESTIMONIALS[idx.value],            slot: 'center' },
  { ...TESTIMONIALS[_mod(idx.value + 1)], slot: 'next' },
]);

let _timer   = null;
let _drag_x  = 0;
let _dragging = false;

const _start = () => {
  _stop(); _timer = setInterval(next, AUTO_MS); 
};
const _stop  = () => {
  if (_timer) {
    clearInterval(_timer); _timer = null; 
  } 
};

watch(is_paused, (p) => (p ? _stop() : _start()));

/*
 * Size the carousel from CARD heights only — not slot heights.
 * The center slot is taller than peek slots because it includes the badge
 * (a flow element below the card). Using slot heights creates a visible
 * 35px empty zone below peek cards before the dots.
 * The badge hangs below the carousel boundary and is made visible via
 * clip-path (see __carousel CSS). Re-runs after document.fonts.ready
 * so SpaceMono line-heights are correct before measuring.
 */
const _sync_height = () => {
  const cards = [...(carousel_ref.value?.querySelectorAll('.testimonials-section__card') ?? [])];
  if (!cards.length) {
    return;
  }
  const max_h = Math.max(...cards.map((c) => c.offsetHeight));
  if (max_h > 0) {
    carousel_ref.value.style.height = `${max_h + 20}px`;
  }
};

onMounted(() => {
  _start();
  nextTick(_sync_height);
  if (typeof document !== 'undefined' && document.fonts?.ready) {
    document.fonts.ready.then(_sync_height);
  }
});
onBeforeUnmount(_stop);

/*
 * Drag detection — setPointerCapture is intentionally deferred to pointermove.
 * Calling it immediately in pointerdown prevents the click event from firing on
 * the slot-overlay buttons (the browser routes pointerup to the capturing element
 * instead of the button, so the synthetic click never synthesises).
 * Waiting until ≥8px of horizontal movement means a simple tap completes
 * normally while an actual swipe still gets captured for reliable tracking.
 */
const on_drag_start = (e) => {
  if (e.button !== 0 && e.pointerType === 'mouse') {
    return;
  }
  _drag_x   = e.clientX;
  _dragging = true;
};
const on_drag_move = (e) => {
  if (!_dragging) {
    return;
  }
  if (Math.abs(e.clientX - _drag_x) >= 8 && !e.currentTarget.hasPointerCapture(e.pointerId)) {
    e.currentTarget.setPointerCapture(e.pointerId);
  }
};
const on_drag_end = (e) => {
  if (!_dragging) {
    return;
  }
  _dragging = false;
  const delta = e.clientX - _drag_x;
  if (delta < -DRAG_PX) {
    next();
  } else if (delta > DRAG_PX) {
    prev();
  }
};
const on_drag_cancel = () => {
  _dragging = false; 
};
</script>

<template>
  <section
    id="testimonials"
    ref="section_ref"
    class="testimonials-section kyo-section"
    :aria-label="t('kyo-web.landing.testimonials.section-aria')"
    @mouseenter="is_paused = true"
    @mouseleave="is_paused = false"
    @focusin="is_paused = true"
    @focusout="is_paused = false"
  >
    <h2 class="testimonials-section__lead kyo-prose">
      {{ t('kyo-web.landing.testimonials.lead') }}
    </h2>

    <div
      ref="carousel_ref"
      class="testimonials-section__carousel"
      aria-live="polite"
      aria-atomic="false"
    >
      <Transition :name="dir > 0 ? 'ts-fwd' : 'ts-bck'">
        <div
          :key="idx"
          class="testimonials-section__cards-group"
          @pointerdown="on_drag_start"
          @pointermove="on_drag_move"
          @pointerup="on_drag_end"
          @pointerleave="on_drag_cancel"
          @pointercancel="on_drag_cancel"
        >
          <!--
            Each __slot holds the card + source badge below it.
            Grid auto-equalises slot heights → all cards same height.
            Peek slots: __slot-overlay button covers the entire slot so tapping
            anywhere on the visible peek (card or badge area) advances the carousel.
          -->
          <div
            v-for="item in display_items"
            :key="item.slot"
            class="testimonials-section__slot"
            :class="[`is-${item.slot}`]"
          >
            <!-- Overlay for peek slots — covers full slot area (card + badge) -->
            <button
              v-if="item.slot !== 'center'"
              type="button"
              class="testimonials-section__slot-overlay"
              :aria-label="item.slot === 'prev'
                ? t('kyo-web.landing.testimonials.prev')
                : t('kyo-web.landing.testimonials.next')"
              @click.stop="item.slot === 'prev' ? prev() : next()"
            />

            <article
              class="testimonials-section__card"
              role="group"
              aria-roledescription="slide"
              :aria-label="`${t('kyo-web.landing.testimonials.section-aria')} — ${t(`kyo-web.landing.testimonials.items.${item.id}.author`)}, ${t(`kyo-web.landing.testimonials.items.${item.id}.role`)}`"
            >
              <!-- Link overlay for center card only (whole card → LinkedIn) -->
              <a
                v-if="item.slot === 'center'"
                :href="LINKEDIN_RECS_URL"
                class="testimonials-section__card-overlay"
                target="_blank"
                rel="noopener"
                :aria-label="`${t('kyo-web.landing.testimonials.source-aria-prefix')} ${t(`kyo-web.landing.testimonials.items.${item.id}.author`)}`"
              />

              <!-- Flag — decorative, top-right, within extra right-padding zone -->
              <span v-if="item.flag" class="testimonials-section__flag" aria-hidden="true">
                {{ item.flag }}
              </span>

              <blockquote class="testimonials-section__quote kyo-prose" :cite="LINKEDIN_RECS_URL">
                <p class="testimonials-section__quote-text">
                  {{ t(`kyo-web.landing.testimonials.items.${item.id}.quote`) }}
                </p>
              </blockquote>

              <footer class="testimonials-section__author">
                <div class="testimonials-section__avatar-wrap" aria-hidden="true">
                  <img
                    v-if="item.avatar"
                    class="testimonials-section__avatar"
                    :src="item.avatar"
                    :alt="t(`kyo-web.landing.testimonials.items.${item.id}.author`)"
                    loading="lazy"
                    decoding="async"
                  />
                  <span v-else class="testimonials-section__avatar testimonials-section__avatar--fallback">
                    {{ item.initials }}
                  </span>
                </div>
                <div class="testimonials-section__meta">
                  <cite class="testimonials-section__name">
                    {{ t(`kyo-web.landing.testimonials.items.${item.id}.author`) }}
                  </cite>
                  <span class="testimonials-section__role">
                    {{ t(`kyo-web.landing.testimonials.items.${item.id}.role`) }}
                  </span>
                </div>
              </footer>
            </article>

            <!-- Source badge — only rendered for the center slot -->
            <a
              v-if="item.slot === 'center'"
              :href="LINKEDIN_RECS_URL"
              class="testimonials-section__source"
              target="_blank"
              rel="noopener"
            >
              <BrandIcon name="linkedin" class="testimonials-section__source-icon" aria-hidden="true" />
              <span class="testimonials-section__source-label">
                {{ t('kyo-web.landing.testimonials.source-label') }}
              </span>
            </a>
          </div>
        </div>
      </Transition>
    </div>

    <!-- Controls: dots centered, no badge here any more -->
    <div
      class="testimonials-section__dots"
      role="tablist"
      :aria-label="t('kyo-web.landing.testimonials.section-aria')"
    >
      <button
        v-for="(_, n) in TESTIMONIALS"
        :key="n"
        type="button"
        class="testimonials-section__dot"
        :class="{ 'is-active': idx === n }"
        role="tab"
        :aria-selected="idx === n"
        :aria-label="t('kyo-web.landing.testimonials.slide-of', { n: n + 1, count: COUNT })"
        @click="go_to(n, n > idx ? 1 : -1)"
      />
    </div>
  </section>
</template>

<style lang="scss" scoped>
/* CSS vars at section level so __carousel and future additions inherit them */
.testimonials-section {
  --card-w:   540px;
  --card-gap: 1.75rem;

  @include max-media-query(md) { --card-w: 380px; --card-gap: 1.25rem; }
  @include max-media-query(sm) { --card-w: 260px; --card-gap: 1rem;   }

  /* ── Lead ──────────────────────────────────────────────────────────── */
  &__lead {
    font-size: var(--fs-300);
    font-weight: 400;
    text-align: center;
    margin: 0 0 2rem;
  }

  /* ── Carousel ──────────────────────────────────────────────────────── */
  &__carousel {
    max-width: calc(var(--card-w) * 1.5 + var(--card-gap) * 2);
    margin: 0 auto;
    min-height: 320px; /* safe mobile fallback — clip-path allows +48px beyond this */

    @include min-media-query(md) {
      min-height: 200px;
    }
    position: relative;
    /*
     * overflow: visible + clip-path on all sizes.
     * clip-path: inset(0 0 -3rem 0) clips left/right at the element's
     * edges (hiding peek card overflow) while allowing up to 3rem of
     * content below the carousel boundary — the center slot's LinkedIn
     * badge hangs below the card border without being clipped and without
     * adding phantom height that creates a gap below peek cards.
     * Dot clearance is handled by padding-top on __dots below.
     */
    overflow: visible;
    clip-path: inset(0 0 -3rem 0);

    &::before,
    &::after {
      content: '';
      position: absolute;
      top: 0; bottom: 0;
      width: calc(var(--card-w) * 0.26);
      z-index: 2;
      pointer-events: none;
    }
    &::before { left:  -0.1rem; background: linear-gradient(to right, var(--clr-neutral-500), transparent); }
    &::after  { right: 0; background: linear-gradient(to left,  var(--clr-neutral-500), transparent); }
  }

  /* ── Cards group ───────────────────────────────────────────────────── */
  &__cards-group {
    position: absolute;
    top: 10px;
    left: calc(50% - var(--card-w) * 1.5 - var(--card-gap));
    display: grid;
    grid-template-columns: repeat(3, var(--card-w));
    align-items: start;    /* slots size to their content; JS sets carousel height */
    gap: var(--card-gap);
    cursor: grab;
    touch-action: pan-y;
    user-select: none;

    &:active { cursor: grabbing; }
  }

  /* ── Slot: card + badge wrapper ────────────────────────────────────── */
  &__slot {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: flex-end;  /* badge right-aligns naturally */
    gap: 0.5rem;
    opacity: 0.3;
    pointer-events: none;

    &.is-prev,
    &.is-next {
      pointer-events: auto;
      cursor: pointer;
    }

    &.is-center {
      opacity: 1;
      pointer-events: auto;
      cursor: default;

      /* Hover: card lifts + border brightens (same white hue, higher opacity) */
      &:hover .testimonials-section__card,
      &:focus-within .testimonials-section__card {
        border-color: color-mix(in srgb, var(--clr-neutral-100) 45%, transparent);
        transform: translateY(-4px);
      }
    }
  }

  /* Overlay for peek slots — covers entire slot (card + badge) */
  &__slot-overlay {
    position: absolute;
    inset: 0;
    z-index: 3;
    background: transparent;
    border: 0;
    cursor: pointer;

    &:focus-visible {
      outline: 2px solid var(--clr-primary-100);
      outline-offset: -2px;
    }
  }

  /* ── Card ──────────────────────────────────────────────────────────── */
  &__card {
    position: relative;
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;                              /* gap between quote and author */
    /* extra top padding creates breathing room above the flag emoji */
    padding: 1.75rem 2rem 1.25rem 1.25rem;
    overflow: hidden;
    contain: layout paint;

    border: 1px solid var(--clr-border-100);
    transition: transform 0.25s ease, border-color 0.2s ease, background 0.25s ease;
  }

  /* Link overlay for center card (whole card → LinkedIn) */
  &__card-overlay {
    position: absolute;
    inset: 0;
    z-index: 1;
    background: transparent;
    border: 0;
    cursor: pointer;
    border-radius: inherit;

    &:focus-visible {
      outline: 2px solid var(--clr-primary-100);
      outline-offset: -2px;
    }
  }

  /* ── Flag ──────────────────────────────────────────────────────────── */
  &__flag {
    position: absolute;
    top: 0.75rem;
    right: 0.75rem;
    font-size: 1rem;
    line-height: 1;
    opacity: 0.6;
    z-index: 0;
    pointer-events: none;
  }

  /* ── Quote ─────────────────────────────────────────────────────────── */
  &__quote {
    margin: 0;
    padding: 0;
    flex-shrink: 0;
  }

  &__quote-text {
    font-size: var(--fs-300);
    font-style: italic;
    display: -webkit-box;
    -webkit-line-clamp: 5;
    -webkit-box-orient: vertical;
    overflow: hidden;
    margin: 0;

    &::before { content: '\201C'; }
    &::after  { content: '\201D'; }

    @include max-media-query(sm) {
      -webkit-line-clamp: 8;
    }
  }

  /* ── Author ────────────────────────────────────────────────────────── */
  &__author {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-shrink: 0;
  }

  &__avatar-wrap { flex-shrink: 0; }

  &__avatar {
    width: 2.625rem;
    height: 2.625rem;
    object-fit: cover;
    display: block;
    border: 1px solid var(--clr-border-100);
  }

  &__avatar--fallback {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-family: "SpaceMono", monospace;
    font-size: var(--fs-200);
    font-weight: 700;
    letter-spacing: 0.04em;
    color: var(--clr-neutral-300);
    border: 1px solid currentColor;
    background: color-mix(in srgb, currentColor 6%, transparent);
  }

  &__meta {
    display: flex;
    flex-direction: column;
    gap: 0;
    min-width: 0;
  }

  &__name {
    font-family: "Geomanist", sans-serif;
    font-size: var(--fs-300);
    font-weight: 700;
    font-style: normal;
    color: var(--clr-neutral-100);
    letter-spacing: 0.01em;
    white-space: normal;
    overflow-wrap: break-word;
    line-height: 1.25;
    margin: 0;
  }

  &__role {
    font-family: "SpaceMono", monospace;
    font-size: var(--fs-100);
    color: var(--clr-neutral-300);
    letter-spacing: 0.06em;
    white-space: normal;
    overflow-wrap: break-word;
    line-height: 1.35;
    margin: 0;
  }

  /* ── Source badge — outside __card, right-aligned in __slot ────────── */
  &__source {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.25rem 0.5rem;
    font-family: "SpaceMono", monospace;
    font-size: var(--fs-100);
    letter-spacing: 0.07em;
    color: var(--clr-neutral-300);
    background: color-mix(in srgb, var(--clr-neutral-900) 72%, transparent);
    backdrop-filter: blur(6px);
    -webkit-backdrop-filter: blur(6px);
    border: 1px solid color-mix(in srgb, var(--clr-neutral-100) 15%, transparent);
    text-decoration: none;
    line-height: 1;
    /* Peek slots: badge not independently interactive (slot-overlay handles tap) */
    .is-prev &,
    .is-next & { pointer-events: none; }

    &:focus-visible {
      outline: 2px solid var(--clr-primary-100);
      outline-offset: 2px;
    }
  }

  &__source-icon {
    font-size: 1.05em;
    color: var(--clr-linkedin-blue);
  }

  /* ── Pagination dots ───────────────────────────────────────────────── */
  &__dots {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding-top: 2rem;

    @include min-media-query(md) {
      gap: 0.875rem;
      padding-top: 2.5rem;
    }
  }

  &__dot {
    width: 0.6rem;
    height: 0.6rem;
    padding: 0;
    border: 1px solid var(--clr-primary-100);
    background: transparent;
    cursor: pointer;
    transition: transform 0.2s ease;

    &.is-active {
      background: var(--clr-primary-100);
      transform: scale(1.25);
    }

    &:hover,
    &:focus-visible {
      background: color-mix(in srgb, var(--clr-primary-100) 40%, transparent);
    }

    &:focus-visible {
      outline: 2px solid var(--clr-primary-100);
      outline-offset: 2px;
    }
  }
}

/* ── Slide transitions ─────────────────────────────────────────────────── */
.ts-fwd-enter-active,
.ts-bck-enter-active  { transition: transform 0.4s var(--ease-standard), opacity 0.35s ease; z-index: 1; }
.ts-fwd-leave-active,
.ts-bck-leave-active  { transition: transform 0.4s var(--ease-standard), opacity 0.35s ease; z-index: 0; pointer-events: none; }

.ts-fwd-enter-from { transform: translateX(calc(var(--card-w, 540px) + var(--card-gap, 1.75rem))); opacity: 0; }
.ts-fwd-leave-to   { transform: translateX(calc(-1 * (var(--card-w, 540px) + var(--card-gap, 1.75rem)))); opacity: 0; }
.ts-bck-enter-from { transform: translateX(calc(-1 * (var(--card-w, 540px) + var(--card-gap, 1.75rem)))); opacity: 0; }
.ts-bck-leave-to   { transform: translateX(calc(var(--card-w, 540px) + var(--card-gap, 1.75rem))); opacity: 0; }
</style>
