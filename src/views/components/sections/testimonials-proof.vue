<script setup>
/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 *
 * Testimonials — three equal cards per page (Pager showcase) using the
 * production card treatment: the LinkedIn-source badge, and the lift +
 * border-brighten hover. Whole cards link to the source recommendation page.
 * Lead + nav sit at the top; dots + arrows page through sets of three. Stars
 * render only for rated sources (LinkedIn has none).
 */

import BlastImage from '@components/blast-image.vue';
import useInViewport from '@composables/use-in-viewport';
import useTestimonials from '@composables/use-testimonials';
import BrandIcon from '@ui/brand-icon.vue';
import { computed, ref } from 'vue';
import { useI18n } from 'vue-i18n';

defineProps({ sectionId: { type: String, default: 'testimonials' } });

const { t, locale } = useI18n();
const { items, sources, count, recsUrl } = useTestimonials();

const section_ref = ref(null);
useInViewport(section_ref);

const PER_PAGE = 3;
const active = ref(0);

const fmt_date = (ym) => {
  const [y, m] = ym.split('-');
  return new Date(Number(y), Number(m) - 1, 1)
    .toLocaleDateString(locale.value === 'es' ? 'es' : 'en', { month: 'short', year: 'numeric' });
};

const pages = computed(() => {
  const out = [];
  for (let i = 0; i < items.value.length; i += PER_PAGE) {
    out.push(items.value.slice(i, i + PER_PAGE));
  }
  return out;
});

const go = (n) => {
  active.value = (n + pages.value.length) % pages.value.length; 
};
</script>

<template>
  <section
    :id="sectionId"
    ref="section_ref"
    class="t-proof kyo-section"
    :aria-label="t('kyo-web.landing.testimonials.section-aria')"
  >
    <div class="t-proof__top">
      <h2 class="t-proof__lead kyo-prose">
        {{ t('kyo-web.landing.testimonials.lead') }}
      </h2>
      <div v-if="pages.length > 1" class="t-proof__nav">
        <button
          type="button"
          class="t-proof__arrow"
          :aria-label="t('kyo-web.landing.testimonials.prev')"
          @click="go(active - 1)"
        >
          ‹
        </button>
        <button
          type="button"
          class="t-proof__arrow"
          :aria-label="t('kyo-web.landing.testimonials.next')"
          @click="go(active + 1)"
        >
          ›
        </button>
      </div>
    </div>

    <div class="t-proof__stage" aria-live="polite">
      <div
        v-for="(page, p) in pages"
        v-show="p === active"
        :key="p"
        class="t-proof__grid"
      >
        <div
          v-for="item in page"
          :key="item.id"
          class="t-proof__item"
        >
          <article class="t-proof__card">
            <blockquote class="t-proof__quote kyo-prose" :cite="recsUrl">
              {{ item.quote }}
            </blockquote>

            <footer class="t-proof__author">
              <span class="t-proof__avatar-wrap" aria-hidden="true">
                <BlastImage
                  v-if="item.avatar"
                  class="t-proof__avatar"
                  :img="item.avatar"
                  :alt="item.author"
                  sizes="48px"
                />
                <span v-else class="t-proof__avatar t-proof__avatar--fallback">{{ item.initials }}</span>
              </span>
              <span class="t-proof__meta">
                <cite class="t-proof__name">{{ item.author }}</cite>
                <span class="t-proof__role">{{ item.role }}</span>
              </span>
              <span class="t-proof__flag" aria-hidden="true">{{ item.flag }}</span>
            </footer>
          </article>

          <!-- Source badge sits OUTSIDE the card, left-aligned (original style) -->
          <div class="t-proof__meta-row">
            <span class="t-proof__source">
              <BrandIcon
                :name="item.source_meta.icon"
                class="t-proof__source-icon"
                :class="`t-proof__source-icon--${item.source_meta.icon}`"
                aria-hidden="true"
              />
              <span>{{ t('kyo-web.landing.testimonials.source-label', { source: item.source_meta.name }) }}</span>
            </span>
            <time class="t-proof__date" :datetime="item.date">{{ fmt_date(item.date) }}</time>
          </div>
        </div>
      </div>
    </div>

    <div class="t-proof__foot">
      <div class="t-proof__foot-info">
        <p class="t-proof__count">
          {{ t('kyo-web.landing.testimonials.count-label', { count }) }}
        </p>
        <a
          v-for="src in sources"
          :key="src.name"
          class="t-proof__recs-link"
          :href="src.url"
          target="_blank"
          rel="noopener"
        >
          <BrandIcon
            :name="src.icon"
            class="t-proof__recs-icon"
            :class="`t-proof__recs-icon--${src.icon}`"
            aria-hidden="true"
          />
          <span>{{ src.name }}</span>
        </a>
      </div>
      <div v-if="pages.length > 1" class="t-proof__dots" role="tablist">
        <button
          v-for="(page, p) in pages"
          :key="p"
          type="button"
          class="t-proof__dot"
          :class="{ 'is-active': p === active }"
          role="tab"
          :aria-selected="p === active"
          :aria-label="t('kyo-web.landing.testimonials.slide-of', { n: p + 1, count: pages.length })"
          @click="go(p)"
        />
      </div>
    </div>
  </section>
</template>

<style lang="scss" scoped>
.t-proof {
  /* ── Lead + nav (Pager placement) ──────────────────────────────────── */
  &__top {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 1.5rem;
    margin-bottom: 1.5rem;
  }

  &__lead {
    margin: 0;
    font-size: var(--fs-300);
    font-weight: 400;
  }

  &__nav { display: flex; gap: 0.5rem; flex-shrink: 0; }

  &__arrow {
    width: 2.5rem;
    height: 2.5rem;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-family: "SpaceMono", monospace;
    font-size: var(--fs-500);
    line-height: 1;
    color: var(--clr-neutral-100);
    background: transparent;
    border: 1px solid var(--clr-border-100);
    cursor: pointer;
    transition: border-color 0.2s ease, color 0.2s ease;

    &:hover,
    &:focus-visible { color: var(--clr-primary-100); border-color: var(--clr-primary-100); }
    &:focus-visible { outline: 2px solid var(--clr-primary-100); outline-offset: 2px; }
  }

  /* ── Page grid ─────────────────────────────────────────────────────── */
  &__grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 1.5rem;

    @include min-media-query(lg) { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  }

  /* Card + external badge stack; grid stretches every item to equal height */
  &__item {
    display: flex;
    flex-direction: column;
    gap: 0.65rem;
    height: 100%;
  }

  /* ── Card (production treatment) ───────────────────────────────────── */
  /* Presentational only — cards are not links, so no hover/lift affordance. */
  &__card {
    position: relative;
    flex: 1;
    min-height: 17rem;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
    padding: 1.5rem;
    border: 1px solid var(--clr-border-100);
  }


  &__quote {
    margin: 0;
    font-size: var(--fs-300);
    font-style: italic;
    flex: 1;
    display: -webkit-box;
    -webkit-line-clamp: 6;
    -webkit-box-orient: vertical;
    overflow: hidden;

    &::before { content: '\201C'; }
    &::after  { content: '\201D'; }
  }

  /* ── Author ────────────────────────────────────────────────────────── */
  &__author {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  &__avatar-wrap { flex-shrink: 0; }

  &__avatar {
    width: 2.625rem;
    height: 2.625rem;
    display: block;
    overflow: hidden;
    border: 1px solid var(--clr-border-100);

    :deep(img) {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
  }

  &__avatar--fallback {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 2.625rem;
    height: 2.625rem;
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
    min-width: 0;
    flex: 1;
  }

  &__name {
    font-family: "Geomanist", sans-serif;
    font-size: var(--fs-300);
    font-weight: 700;
    font-style: normal;
    color: var(--clr-neutral-100);
    line-height: 1.25;
  }

  /* Flag shown the Pager way — its own slot at the end of the author row,
     vertically centered with the avatar (not pinned to the name). */
  &__flag {
    flex-shrink: 0;
    font-size: 1.15rem;
    line-height: 1;
    opacity: 0.7;
  }

  &__role {
    font-family: "SpaceMono", monospace;
    font-size: var(--fs-100);
    color: var(--clr-neutral-300);
    letter-spacing: 0.06em;
    line-height: 1.35;
  }

  /* ── Source badge OUTSIDE the card (left) + date (right) ───────────── */
  /* Stacked layout shows badge + date on TOP; 3-col grid keeps them below. */
  &__meta-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
    order: -1;

    @include min-media-query(lg) { order: 0; }
  }

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
    line-height: 1;
  }

  &__source-icon { font-size: 1.05em; }
  &__source-icon--linkedin { color: var(--clr-linkedin-blue); }

  &__date {
    font-family: "SpaceMono", monospace;
    font-size: var(--fs-100);
    letter-spacing: 0.05em;
    color: var(--clr-neutral-300);
    text-transform: uppercase;
    white-space: nowrap;
  }

  /* ── Foot — dynamic count + page dots ──────────────────────────────── */
  &__foot {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    margin-top: 1.5rem;
  }

  &__count {
    margin: 0;
    font-family: "SpaceMono", monospace;
    font-size: var(--fs-100);
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--clr-neutral-300);
  }

  /* Single section-level source link (replaces the redundant per-card links) */
  &__foot-info {
    display: flex;
    align-items: center;
    gap: 0.85rem 1.25rem;
    flex-wrap: wrap;
  }

  &__recs-link {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    font-family: "SpaceMono", monospace;
    font-size: var(--fs-100);
    letter-spacing: 0.07em;
    text-transform: uppercase;
    color: var(--clr-neutral-100);
    text-decoration: none;
    border-bottom: 1px solid color-mix(in srgb, var(--clr-neutral-100) 28%, transparent);
    transition: color 0.2s ease, border-color 0.2s ease;

    &::after { content: "\2197"; font-size: 0.95em; }

    &:hover,
    &:focus-visible { color: var(--clr-primary-100); border-color: var(--clr-primary-100); }
    &:focus-visible { outline: 2px solid var(--clr-primary-100); outline-offset: 2px; }
  }

  &__recs-icon { font-size: 1.05em; }
  &__recs-icon--linkedin { color: var(--clr-linkedin-blue); }

  &__dots { display: flex; align-items: center; }

  /* 27px touch target (>=24px, WCAG 2.5.8; root is 12px) — small visible pip via ::before */
  &__dot {
    width: 2.25rem;
    height: 2.25rem;
    padding: 0;
    border: 0;
    background: transparent;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;

    &::before {
      content: "";
      width: 0.6rem;
      height: 0.6rem;
      border: 1px solid var(--clr-primary-100);
      background: transparent;
      transition: transform 0.2s ease, background 0.2s ease;
    }

    &.is-active::before { background: var(--clr-primary-100); transform: scale(1.25); }
    &:hover::before,
    &:focus-visible::before { background: color-mix(in srgb, var(--clr-primary-100) 40%, transparent); }
    &:focus-visible { outline: 2px solid var(--clr-primary-100); outline-offset: 2px; }
  }
}
</style>
