<script setup>
/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 */

import useCursorTooltip from '@composables/use-cursor-tooltip';
import useInViewport from '@composables/use-in-viewport';
import useObfuscatedEmail from '@composables/use-obfuscated-email';
import { vProseLinks } from '@composables/use-prose-links';
import { warmRoute } from '@composables/use-warm-route';
import HeroVisual from '@sections/hero-visual.vue';
import { RESUME_ROUTE_BY_LOCALE } from '@seo/routes';
import AppIcon from '@ui/app-icon.vue';
import CursorTooltip from '@ui/cursor-tooltip.vue';
import UiHudDeco from '@ui/hud-deco.vue';
import UiLink from '@ui/link.vue';
import ModalLoading from '@ui/modal-loading.vue';
import { computed, defineAsyncComponent, onBeforeUnmount, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';

/* UiImageViewer (modal + image-viewer chunk) loads on first portrait open.
   `ModalLoading` ships eagerly so the click feels instantaneous even on
   cold cache — the placeholder appears immediately, the real viewer
   swaps in once the chunk arrives. */
const UiImageViewer = defineAsyncComponent({
  loader: () => import('@ui/image-viewer.vue'),
  loadingComponent: ModalLoading,
  delay: 0,
});

const { t, locale } = useI18n();

/* Primary CTA -> the HTML resume page, not the PDF. The page carries the same
   content in crawlable HTML (and offers the PDF from its own nav), so sending
   visitors there keeps them on-site and gives the CV a rankable destination. */
const cv_href = computed(() => RESUME_ROUTE_BY_LOCALE[locale.value] || RESUME_ROUTE_BY_LOCALE.en);

/* Hover/focus is a strong signal the visitor is about to open the CV, so the
   resume document is prefetched before the click. warmRoute dedups, so binding
   it on every pointerenter costs nothing after the first. */
const warmResume = () => warmRoute(cv_href.value);
const cv_label = computed(() =>
  t(locale.value === 'es' ? 'kyo-web.content-data.download.cv-es' : 'kyo-web.content-data.download.cv-en'),
);

const summary_ref = ref(null);
const { visible: zeronet_tooltip_visible, x: zeronet_x, y: zeronet_y } = useCursorTooltip(
  () => summary_ref.value?.querySelector('a[href*="zeronet-labs"], a[href*="kyonax"]') ?? null,
);
const { visible: mr_tooltip_visible, x: mr_x, y: mr_y } = useCursorTooltip(
  () => summary_ref.value?.querySelector('a[href*="madison-reed"]') ?? null,
);
const { visible: ae_tooltip_visible, x: ae_x, y: ae_y } = useCursorTooltip(
  () => summary_ref.value?.querySelector('a[href*="agileengine"]') ?? null,
);

const portrait_viewer_open = ref(false);
const open_portrait_viewer  = () => {
  portrait_viewer_open.value = true; 
};
const close_portrait_viewer = () => {
  portrait_viewer_open.value = false; 
};

const portrait_aria = computed(() =>
  `${t('kyo-web.persistent-data.name')} — ${t('kyo-web.landing.hero.open-portrait')}`,
);

/* Two HeroVisual instances render at every breakpoint; v-show hides the
   off-breakpoint one via display:none, which browsers skip from tab order.
   The mobile instance sits before .hero__content (source order: visual →
   content) so mobile keyboard users tab visual-first. The desktop instance
   sits after .hero__content (content → visual) so desktop tab order is
   content-first, matching the grid layout. */
/* 1024px = SCSS `md` token. Keep in lockstep with the grid's
   `@include min-media-query(md)` in the SCSS below — otherwise the
   v-show branch and the grid layout disagree across the 768-1023px
   portrait-tablet band, producing content-first / image-below order. */
/* is_desktop initializes to false on BOTH SSR and CSR so the hydration
   diff is empty. _viewport_mq is read inside onMounted (post-hydration)
   and the visible instance flips reactively. */
const is_desktop = ref(false);
let _viewport_mq = null;
const _on_viewport_change = (event) => {
  is_desktop.value = event.matches;
};

onMounted(() => {
  _viewport_mq = window.matchMedia('(min-width: 1024px)');
  is_desktop.value = _viewport_mq.matches;
  _viewport_mq.addEventListener('change', _on_viewport_change);
});
onBeforeUnmount(() => _viewport_mq?.removeEventListener('change', _on_viewport_change));


const GLYPH_ARROW = '\uF063';

const contact_email_href = useObfuscatedEmail('kyonax.corp', 'gmail.com');

const section_ref = ref(null);
useInViewport(section_ref);
</script>

<template>
  <section
    id="hero"
    ref="section_ref"
    class="hero"
    :aria-label="t('kyo-web.landing.hero.section-aria')"
  >
    <UiHudDeco variant="bl" text="// VECTOR :: KYO-001" />
    <div class="hero__inner">
      <HeroVisual
        v-show="!is_desktop"
        class="hero__visual"
        :aria-label="portrait_aria"
        :alt="t('kyo-web.landing.hero.portrait-alt')"
        @open="open_portrait_viewer"
      />

      <div class="hero__content">
        <h1 class="hero__title">
          <span class="hero__name">{{ t('kyo-web.persistent-data.name') }}</span>
          <span class="hero__alias">A.K.A. KYONAX<sup lang="ja">京</sup></span>
        </h1>

        <h2 class="hero__role">
          {{ t('kyo-web.landing.hero.role-value') }}
        </h2>

        <p
          ref="summary_ref"
          v-prose-links="t('kyo-web.landing.modal.opens-new-tab')"
          class="hero__summary kyo-prose"
          v-html="t('kyo-web.landing.hero.summary')"
        />
        <CursorTooltip :visible="zeronet_tooltip_visible" :x="zeronet_x" :y="zeronet_y">
          {{ t('kyo-web.landing.hero.tooltip.zeronet') }}
        </CursorTooltip>
        <CursorTooltip :visible="mr_tooltip_visible" :x="mr_x" :y="mr_y">
          {{ t('kyo-web.landing.hero.tooltip.madison-reed') }}
        </CursorTooltip>
        <CursorTooltip :visible="ae_tooltip_visible" :x="ae_x" :y="ae_y">
          {{ t('kyo-web.landing.hero.tooltip.agileengine') }}
        </CursorTooltip>

        <div class="hero__meta">
          <div class="hero__meta-item hero__meta-item--location">
            <AppIcon
              class="hero__meta-icon"
              name="map-marker"
              :alt="t('kyo-web.landing.hero.location-label')"
            />
            <span class="hero__meta-value">
              <span class="hero__meta-city hero__meta-city--full">{{ t('kyo-web.landing.hero.location-city') }}</span>
              <span class="hero__meta-city hero__meta-city--short">{{ t('kyo-web.landing.hero.location-city-short') }}</span>
              {{ t('kyo-web.landing.hero.location-country') }}
            </span>
          </div>
          <span class="hero__meta-dot" aria-hidden="true" />
          <div class="hero__meta-item">
            <span class="hero__meta-status">
              {{ t('kyo-web.landing.hero.available') }}
            </span>
          </div>
        </div>

        <div class="hero__ctas">
          <UiLink
            :href="cv_href"
            variant="cyber"
            size="lg"
            @pointerenter="warmResume"
            @focus="warmResume"
          >
            {{ cv_label }}
          </UiLink>
          <UiLink
            :href="contact_email_href"
            variant="cyber-outline"
            size="lg"
          >
            {{ t('kyo-web.landing.hero.secondary-cta') }}
          </UiLink>
        </div>
      </div>

      <HeroVisual
        v-show="is_desktop"
        class="hero__visual"
        :aria-label="portrait_aria"
        :alt="t('kyo-web.landing.hero.portrait-alt')"
        @open="open_portrait_viewer"
      />
    </div>

    <a class="hero__scroll-hint" href="#testimonials" :aria-label="t('kyo-web.landing.hero.scroll-hint')">
      <span>{{ t('kyo-web.landing.hero.scroll-hint') }}</span>
      <span class="icon-glyph" :data-text="GLYPH_ARROW" aria-hidden="true" />
    </a>

    <UiImageViewer
      v-if="portrait_viewer_open"
      :is-open="true"
      :close-label="t('kyo-web.landing.modal.close')"
      img="kyonax_portrait"
      alt="Cristian D. Moreno (Kyonax) portrait"
      @close="close_portrait_viewer"
    />
  </section>
</template>

<style lang="scss" scoped>
.hero {
  position: relative;
  width: 100%;
  padding: 3rem 1.5rem 2.5rem;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  background:
    radial-gradient(
      ellipse at 80% 35%,
      color-mix(in srgb, var(--clr-primary-100) 4%, transparent),
      transparent 40%
    ),
    var(--clr-neutral-500);

  @include min-media-query(md) {
    padding: 10rem 2rem 3rem;
  }

  @include max-media-query(md) {
    padding-bottom: 5rem;

    :deep(.hud-deco--bl) {
      bottom: 1.75rem;
    }
  }

  &::before {
    content: "";
    position: absolute;
    inset: 0;
    background-image: repeating-linear-gradient(
      0deg,
      transparent 0,
      transparent 3px,
      color-mix(in srgb, var(--clr-neutral-50) 2%, transparent) 3px,
      color-mix(in srgb, var(--clr-neutral-50) 2%, transparent) 4px
    );
    pointer-events: none;
    mix-blend-mode: overlay;
    opacity: 0.4;
  }

  &__inner {
    position: relative;
    z-index: 1;
    width: 100%;
    max-width: 1280px;
    margin: 0 auto;
    display: grid;
    grid-template-columns: 1fr;
    gap: 3rem;
    align-items: center;

    @include min-media-query(md) {
      grid-template-columns: minmax(0, 1.6fr) minmax(0, 0.85fr);
      gap: 4rem;

      /* Pin to row 1 — sparse auto-placement otherwise drops the
         later child to row 2. */
      & > .hero__content { grid-column: 1; grid-row: 1; }
      & > .hero__visual  { grid-column: 2; grid-row: 1; justify-self: end; }
    }
  }

  &__title {
    font-family: "Geomanist", sans-serif;
    font-size: 4.5rem;
    font-weight: 700;
    line-height: 1;
    margin: 0 0 1rem;
    letter-spacing: -0.01em;
    color: var(--clr-neutral-100);

    @include min-media-query(sm) {
      font-size: 5rem;
    }

    @include min-media-query(lg) {
      font-size: var(--fs-800);
    }
  }

  &__name {
    display: block;

    @media (max-width: 558px) {
      text-align-last: right;
    }
  }

  &__alias {
    display: block;
    color: var(--clr-primary-100);
    font-size: 0.32em;
    font-weight: 400;
    letter-spacing: 0.12em;
    margin-top: 0.4rem;
    text-transform: uppercase;

    @include max-media-query(md) {
      font-size: 0.5em;
    }

    sup {
      font-size: 0.85em;
      color: var(--clr-neutral-50);
      margin-left: 0.15em;
    }
  }

  &__role {
    font-family: "SpaceMono", monospace;
    font-size: var(--fs-300);
    color: var(--clr-primary-100);
    letter-spacing: 0.08em;
    margin: 0 0 1.25rem;
    text-transform: uppercase;
  }

  /* Type comes from .kyo-prose; only size, rhythm and measure are local. */
  &__summary {
    font-size: var(--fs-400);
    margin: 0 0 2rem;
    max-width: 100%;

    @include min-media-query(lg) {
      max-width: 80ch;
    }
  }

  &__meta {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem;
    /* Owns the stacking context so the dot's radar pseudo (z-index -1) drops
       BEHIND every item in this row — the flag and the status label included —
       instead of only behind the dot itself. */
    isolation: isolate;
    margin-bottom: 1.75rem;
    font-family: "SpaceMono", monospace;
    font-size: var(--fs-100);

    @include min-media-query(md) {
      font-size: var(--fs-200);
    }
  }

  &__meta-item {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    color: var(--clr-neutral-200);
  }

  &__meta-icon {
    font-size: 1.15em;
    color: var(--clr-neutral-300);
  }

  &__meta-value {
    color: var(--clr-neutral-50);
  }

  &__meta-city--short { display: none; }

  @media (max-width: 414px) {
    &__meta-city--full { display: none; }
    &__meta-city--short { display: inline; }
  }

  &__meta-status {
    display: inline-flex;
    align-items: center;
    color: var(--clr-success-100);
    letter-spacing: 0.08em;
  }

  &__meta-dot {
    position: relative;
    flex-shrink: 0;
    width: 6px;
    height: 6px;
    margin-left: 0.5rem;
    margin-right: 0.5rem;
    background: var(--clr-success-100);
    border-radius: 50%;

    /* Radar ping instead of a static glow. Three things keep it smooth, and
       each replaces a defect in the first cut:
         · z-index -1 — the disc passes BEHIND the core, so the dot no longer
           brightens as the ping crosses it (it read as a flicker);
         · inset -7px + scale 0.3 -> 1 — the layer rasterises at its LARGEST
           size and is scaled DOWN, where the first cut magnified a 6px raster
           3.4x and stair-stepped the edge;
         · opacity ramps from 0 and returns to 0 at 100% — the first cut
           snapped 0 -> 0.5 at the loop boundary, which read as a blink.
       transform + opacity only, so it still composites off the main thread. */
    &::after {
      content: '';
      position: absolute;
      inset: -7px;
      z-index: -1;
      border-radius: inherit;
      /* A HARD disc in the family's SHADOW shade — not a translucent bright green
         and not a blur. The reference halo sits 19% of the way from the page
         background to the dot, which in OKLCH lightness is L=25.1%;
         --clr-success-500 is L=26.1%, so the token IS the shadow colour and the
         disc can render at full opacity with a crisp edge. */
      background: var(--clr-success-500);
      /* Base state is invisible, so under reduced motion — where the global
         reduce block collapses the animation to one 0.01ms pass — the ring
         resolves to nothing and the dot degrades to a plain dot. */
      opacity: 0;
      animation: hero-radar 2s linear infinite;
    }
  }

  &__ctas {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;

    @media (max-width: 374px) {
      :deep(.ui-link--size-lg) {
        font-size: var(--fs-300);
        padding: 0.65rem 1rem;
      }
    }
  }

  &__scroll-hint {
    align-self: center;
    margin-top: 3.5rem;
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    gap: 0.4rem;
    font-family: "SpaceMono", monospace;
    font-size: var(--fs-200);
    letter-spacing: 0.12em;
    color: var(--clr-neutral-200);
    text-decoration: none;
    z-index: 2;

    @include max-media-query(md) {
      display: none;
    }

    &:hover, &:focus-visible {
      color: var(--clr-primary-100);
    }

    .icon-glyph { animation: hero-bounce 1.5s ease-in-out infinite; }
  }
}

@keyframes hero-bounce {
  0%, 100% { transform: translateY(0); }
  50%      { transform: translateY(4px); }
}

/* Holds at 0 through the tail so the ping reads as a sweep, not a heartbeat. */
/* Starts and ends at opacity 0, so the loop boundary is invisible.
   THE PACING IS THE WHOLE POINT. A 6px dot only gives ~12px of radius travel, so
   spreading that over a full 2.4s linear cycle moved the edge 0.097px per frame —
   it crossed a pixel boundary about once every ten frames, which is what read as a
   bad frame rate even at a measured 59.9fps. The sweep is therefore FRONT-LOADED
   into the first third of the cycle (0.63px/frame over the first 160ms, ~6x) and
   the rest of the cycle is a deliberate rest beat. The extra stops do the easing
   rather than a cubic-bezier, because a timing function applies per KEYFRAME
   SEGMENT, not across the whole animation. */
@keyframes hero-radar {
  0%   { transform: scale(0.3);  opacity: 0; }
  4%   { opacity: 1; }
  8%   { transform: scale(0.6); }
  18%  { transform: scale(0.84); opacity: 0.7; }
  35%  { transform: scale(1);    opacity: 0; }
  /* No 100% stop on purpose: the element's own base is already `transform: none`
     (the identity, i.e. scale(1)) and `opacity: 0`, so 35%->100% interpolates
     between identical values and holds the rest beat for free. */
}
</style>
