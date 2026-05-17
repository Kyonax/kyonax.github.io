<script setup>
/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 */

import cv_en_url from '@assets/cv/cv_cristian_d_moreno_en.pdf?url';
import cv_es_url from '@assets/cv/cv_cristian_d_moreno_es.pdf?url';
import useObfuscatedEmail from '@composables/use-obfuscated-email';
import { TECHNOLOGIES } from '@data/data';
import { PROJECTS } from '@data/projects';
import HeroVisual from '@sections/hero-visual.vue';
import BrandIcon from '@ui/brand-icon.vue';
import UiHudDeco from '@ui/hud-deco.vue';
import UiLink from '@ui/link.vue';
import ModalLoading from '@ui/modal-loading.vue';
import UiStateGrid from '@ui/state-grid.vue';
import { computed, defineAsyncComponent, onBeforeUnmount,onMounted, ref } from 'vue';
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

const cv_href = computed(() => (locale.value === 'es' ? cv_es_url : cv_en_url));
const cv_filename = computed(() =>
  locale.value === 'es' ? 'cv_cristian_d_moreno_es.pdf' : 'cv_cristian_d_moreno_en.pdf',
);
const cv_label = computed(() =>
  t(locale.value === 'es' ? 'kyo-web.content-data.download.cv-es' : 'kyo-web.content-data.download.cv-en'),
);

const active_projects = computed(
  () => Object.values(PROJECTS).filter((p) => !p.featured).length,
);
const stack_count = computed(() => TECHNOLOGIES.length);

const years_suffix = computed(() => locale.value === 'es' ? 'AÑOS' : 'YEARS');

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
/* 1200px = SCSS `lg` token. Keep in lockstep with the grid's
   `@include min-media-query(lg)` in the SCSS below — otherwise the
   v-show branch and the grid layout disagree at iPad-landscape
   (1024-1199px), producing content-first / image-below order. */
/* is_desktop initializes to false on BOTH SSR and CSR so the hydration
   diff is empty. _viewport_mq is read inside onMounted (post-hydration)
   and the visible instance flips reactively. */
const is_desktop = ref(false);
let _viewport_mq = null;
const _on_viewport_change = (event) => {
  is_desktop.value = event.matches;
};

onMounted(() => {
  _viewport_mq = window.matchMedia('(min-width: 1200px)');
  is_desktop.value = _viewport_mq.matches;
  _viewport_mq.addEventListener('change', _on_viewport_change);
});
onBeforeUnmount(() => _viewport_mq?.removeEventListener('change', _on_viewport_change));


const GLYPH_ARROW = '\uF063';

const contact_email_href = useObfuscatedEmail('work', 'kyonax.com');
</script>

<template>
  <section
    id="hero"
    class="hero"
    :aria-label="t('kyo-web.landing.hero.tag')"
  >
    <UiHudDeco variant="tr" text="// HANDSHAKE :: VERIFIED" />
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
        <div class="hero__tag-row">
          <a
            class="hero__tag"
            href="https://github.com/ccs-devhub"
            target="_blank"
            rel="noopener noreferrer"
          >
            <UiStateGrid />
            <span v-html="t('kyo-web.landing.hero.tag')" />
          </a>
          <a
            class="hero__orcid"
            href="https://orcid.org/0009-0006-4459-5538"
            target="_blank"
            rel="noopener noreferrer"
            :aria-label="t('kyo-web.landing.hero.orcid-aria')"
          >
            <BrandIcon class="hero__orcid-icon" name="orcid" />
            <span class="hero__orcid-label">ORCID</span>
          </a>
        </div>

        <h1 class="hero__title">
          <span class="hero__name">{{ t('kyo-web.persistent-data.name') }}</span>
          <span class="hero__alias">A.K.A. KYONAX<sup>京</sup></span>
        </h1>

        <p class="hero__role">
          {{ t('kyo-web.landing.hero.role-value') }}
        </p>

        <p class="hero__summary" v-html="t('kyo-web.landing.hero.summary')" />

        <dl class="hero__stats">
          <div class="hero__stat">
            <dt>{{ t('kyo-web.landing.hero.stats.years-label') }}</dt>
            <dd>
              {{ t('kyo-web.landing.hero.stats.years-value') }}<span class="hero__stat-suffix">{{ years_suffix }}</span>
            </dd>
          </div>
          <div class="hero__stat">
            <dt>{{ t('kyo-web.landing.hero.stats.stack-label') }}</dt>
            <dd>{{ stack_count }}</dd>
          </div>
          <div class="hero__stat">
            <dt>{{ t('kyo-web.landing.hero.stats.projects-label') }}</dt>
            <dd>{{ active_projects }}</dd>
          </div>
          <div class="hero__stat">
            <dt>{{ t('kyo-web.landing.hero.stats.languages-label') }}</dt>
            <dd>{{ t('kyo-web.landing.hero.stats.languages-value') }}</dd>
          </div>
        </dl>

        <div class="hero__meta">
          <div class="hero__meta-item">
            <span class="hero__meta-label">{{ t('kyo-web.landing.hero.location-label') }}</span>
            <span class="hero__meta-value">{{ t('kyo-web.landing.hero.location-value') }}</span>
          </div>
          <div class="hero__meta-item">
            <span class="hero__meta-status">
              <span class="hero__meta-dot" aria-hidden="true" />
              {{ t('kyo-web.landing.hero.available') }}
            </span>
          </div>
        </div>

        <div class="hero__ctas">
          <UiLink
            :href="cv_href"
            variant="cyber"
            size="lg"
            :download="cv_filename"
          >
            {{ cv_label }}
          </UiLink>
          <UiLink
            :href="contact_email_href"
            variant="cyber-outline"
            size="lg"
            external
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

    <a class="hero__scroll-hint" href="#skills" :aria-label="t('kyo-web.landing.hero.scroll-hint')">
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
      ellipse at 80% 20%,
      color-mix(in srgb, var(--clr-primary-100) 8%, transparent),
      transparent 55%
    ),
    var(--clr-neutral-500);

  @include min-media-query(md) {
    padding: 10rem 2rem 3rem;
  }

  @include max-media-query(md) {
    padding-bottom: 5rem;

    :deep(.hud-deco--tr) {
      top: 0.6rem;
    }
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

    @include min-media-query(lg) {
      grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr);
      gap: 4rem;

      /* Pin to row 1 — sparse auto-placement otherwise drops the
         later child to row 2. */
      & > .hero__content { grid-column: 1; grid-row: 1; }
      & > .hero__visual  { grid-column: 2; grid-row: 1; }
    }
  }

  &__tag-row {
    display: inline-flex;
    align-items: stretch;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-bottom: 1.5rem;
  }

  &__tag {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    font-family: "SpaceMono", monospace;
    font-size: var(--fs-200);
    letter-spacing: 0.12em;
    color: var(--clr-neutral-200);
    border: 1px solid var(--clr-border-100);
    padding: 0.4rem 0.8rem;
    background: color-mix(in srgb, var(--clr-neutral-500) 60%, transparent);
    text-decoration: none;
    cursor: pointer;
    width: fit-content;

    &:hover,
    &:focus,
    &:focus-visible,
    &:active {
      color: var(--clr-neutral-200);
      border-color: var(--clr-border-100);
      background: color-mix(in srgb, var(--clr-neutral-500) 60%, transparent);
      outline: none;
    }

    &:focus-visible {
      outline: 2px solid var(--clr-primary-100);
      outline-offset: 3px;
    }
  }


  &__title {
    font-family: "Geomanist", sans-serif;
    font-size: var(--fs-700);
    font-weight: 700;
    line-height: 1;
    margin: 0 0 1rem;
    letter-spacing: -0.01em;
    color: var(--clr-neutral-50);

    @include min-media-query(md) { font-size: var(--fs-800); }
  }

  &__name { display: block; }

  &__orcid {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    font-family: "SpaceMono", monospace;
    font-size: var(--fs-200);
    letter-spacing: 0.12em;
    font-weight: 700;
    color: color-mix(in srgb, var(--clr-success-100) 55%, transparent);
    background: color-mix(in srgb, var(--clr-neutral-500) 60%, transparent);
    border: 1px solid color-mix(in srgb, var(--clr-success-100) 55%, transparent);
    padding: 0.4rem 0.8rem;
    text-decoration: none;
    cursor: pointer;

    &:hover,
    &:focus,
    &:focus-visible,
    &:active {
      color: color-mix(in srgb, var(--clr-success-100) 55%, transparent);
      border-color: color-mix(in srgb, var(--clr-success-100) 55%, transparent);
      background: color-mix(in srgb, var(--clr-neutral-500) 60%, transparent);
      outline: none;
    }

    &:focus-visible {
      outline: 2px solid var(--clr-success-100);
      outline-offset: 3px;
    }
  }

  &__orcid-icon {
    font-size: 1.1em;
    line-height: 1;
    color: inherit;
    transform: translateY(0.06em);
  }

  &__orcid-label {
    line-height: 1;
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

  &__summary {
    font-family: "Geomanist", sans-serif;
    font-size: var(--fs-400);
    line-height: 1.55;
    letter-spacing: 0.012em;
    word-spacing: 0.05em;
    color: var(--clr-neutral-100);
    margin: 0 0 2rem;
    max-width: 100%;

    @include min-media-query(lg) {
      max-width: 80ch;
    }

    :deep(strong) {
      color: var(--clr-primary-100);
      font-weight: 700;
    }
  }

  &__stats {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.5rem;
    margin: 0 0 1.5rem;
    padding: 0;

    @include min-media-query(sm) {
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }
  }

  &__stat {
    border: 1px solid var(--clr-border-100);
    background: color-mix(in srgb, var(--clr-neutral-500) 70%, transparent);
    padding: 0.75rem;
    display: grid;
    gap: 0.25rem;

    dt {
      font-family: "SpaceMono", monospace;
      font-size: var(--fs-200);
      color: var(--clr-neutral-200);
      letter-spacing: 0.08em;
      text-transform: uppercase;
      margin: 0;
    }

    dd {
      font-family: "Geomanist", sans-serif;
      font-size: var(--fs-600);
      color: var(--clr-primary-100);
      margin: 0;
      line-height: 1;
      font-weight: 700;
    }
  }

  &__stat-suffix {
    font-family: "SpaceMono", monospace;
    font-size: 0.38em;
    font-weight: 700;
    letter-spacing: 0.06em;
    margin-left: 0.2em;
    vertical-align: 0.85em;
    color: var(--clr-primary-100);
  }

  &__meta {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem 1.5rem;
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

  &__meta-label {
    color: var(--clr-neutral-300);
    letter-spacing: 0.08em;
  }

  &__meta-value {
    color: var(--clr-neutral-50);
  }

  &__meta-status {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    color: var(--clr-success-100);
    letter-spacing: 0.08em;
  }

  &__meta-dot {
    width: 6px;
    height: 6px;
    background: var(--clr-success-100);
    border-radius: 50%;
    box-shadow: 0 0 6px var(--clr-success-100);
  }

  &__ctas {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
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
    transition: color 0.2s ease;
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
</style>
