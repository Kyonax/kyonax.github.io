<script setup>
/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 */

import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import BrandIcon from '@ui/brand-icon.vue';
import UiImage from '@ui/image.vue';
import UiLink from '@ui/link.vue';

import { PROJECTS } from '@data/projects';
import { TECHNOLOGIES } from '@data/data';

import cv_en_url from '@assets/cv/cv_cristian_d_moreno_en.pdf?url';
import cv_es_url from '@assets/cv/cv_cristian_d_moreno_es.pdf?url';

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


const GLYPH_DOWNLOAD = '';
const GLYPH_ARROW    = '';
</script>

<template>
  <section
    id="hero"
    class="hero"
    role="region"
    :aria-label="t('kyo-web.landing.hero.tag')">
    <span class="hud-deco hud-deco--tr" aria-hidden="true">// HANDSHAKE :: VERIFIED</span>
    <span class="hud-deco hud-deco--bl" aria-hidden="true">// VECTOR :: KYO-001</span>
    <div class="hero__inner">
      <div class="hero__content">
        <div class="hero__tag-row">
          <a
            class="hero__tag"
            href="https://github.com/ccs-devhub"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Cyber Code Syndicate on GitHub">
            <span class="state-grid" aria-hidden="true">
              <span /><span /><span />
              <span /><span /><span />
              <span /><span /><span />
            </span>
            <span v-html="t('kyo-web.landing.hero.tag')" />
          </a>
          <a
            class="hero__orcid"
            href="https://orcid.org/0009-0006-4459-5538"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="ORCID profile">
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
            :download="cv_filename">
            {{ cv_label }}
          </UiLink>
          <UiLink
            href="mailto:kyonax.corp@gmail.com"
            variant="cyber-outline"
            size="lg"
            external>
            {{ t('kyo-web.landing.hero.secondary-cta') }}
          </UiLink>
        </div>
      </div>

      <aside class="hero__visual" aria-hidden="true">
        <div class="hero__visual-frame">
          <UiImage
            img="kyonax_multiverse_characters"
            alt="Kyonax multiverse characters portrait"
            aspect="3 / 4"
            :size="{ sm: 240, md: 300, lg: 360, xl: 420 }"
            fit="cover"
            position="top center"
            sizes="(max-width: 768px) 70vw, 380px"
            eager />
          <div class="hero__visual-frame-inner" />
        </div>
        <div class="hero__visual-meta">
          <span>FRAME // <span class="ccs-glyph">▣</span>-001</span>
          <span>@KYONAX_ON_TECH</span>
        </div>
      </aside>
    </div>

    <a class="hero__scroll-hint" href="#skills" :aria-label="t('kyo-web.landing.hero.scroll-hint')">
      <span>{{ t('kyo-web.landing.hero.scroll-hint') }}</span>
      <span class="icon-glyph" aria-hidden="true">{{ GLYPH_ARROW }}</span>
    </a>
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
    :deep(.hud-deco--tr) {
      top: 0.6rem;
    }
    :deep(.hud-deco--bl) {
      bottom: 0.6rem;
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
      grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr);
      gap: 4rem;
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
    color: color-mix(in srgb, var(--clr-orcid-bg) 55%, transparent);
    background: color-mix(in srgb, var(--clr-neutral-500) 60%, transparent);
    border: 1px solid color-mix(in srgb, var(--clr-orcid-bg) 55%, transparent);
    padding: 0.4rem 0.8rem;
    text-decoration: none;
    cursor: pointer;

    &:hover,
    &:focus,
    &:focus-visible,
    &:active {
      color: color-mix(in srgb, var(--clr-orcid-bg) 55%, transparent);
      border-color: color-mix(in srgb, var(--clr-orcid-bg) 55%, transparent);
      background: color-mix(in srgb, var(--clr-neutral-500) 60%, transparent);
      outline: none;
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
    max-width: 80ch;

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
    transition: border-color 0.2s ease;

    &:hover { border-color: var(--clr-primary-100); }

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

  &__visual {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
    justify-self: center;

    @include max-media-query(md) {
      order: -1;
      justify-self: stretch;
      width: 100%;
      align-items: center;
    }
  }

  &__visual-frame {
    position: relative;
    padding: 0.5rem;
    border: 1px solid var(--clr-primary-100);
    background: color-mix(in srgb, var(--clr-primary-100) 5%, var(--clr-neutral-500));
    overflow: hidden;
    display: flex;

    /* Force block on UiImage's inline-block default — kills the
       baseline strut that breaks the frame's symmetric padding. */
    :deep(.ui-image) { display: block; }

    /* On max-md the frame switches to block + percent width so the
       inner UiImage chain doesn't collapse via circular min-content. */
    @include max-media-query(md) {
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
      border: 1px solid var(--clr-primary-100);
      pointer-events: none;
      z-index: 2;
    }

    &::before { top: -5px; left: -5px;  border-right: 0; border-bottom: 0; }
    &::after  { bottom: -5px; right: -5px; border-left: 0;  border-top: 0; }
  }

  &__visual-frame-inner {
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
    animation: hero-scan 12s linear infinite;
    z-index: 1;
  }

  &__visual-meta {
    display: flex;
    justify-content: space-between;
    width: 100%;
    max-width: 380px;
    font-family: "SpaceMono", monospace;
    font-size: var(--fs-100);
    color: var(--clr-neutral-300);
    letter-spacing: 0.08em;
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
      outline: none;
    }

    .icon-glyph { animation: hero-bounce 1.5s ease-in-out infinite; }
  }
}

@keyframes hero-scan {
  0%   { transform: translateY(-100%); }
  100% { transform: translateY(100%); }
}

@keyframes hero-bounce {
  0%, 100% { transform: translateY(0); }
  50%      { transform: translateY(4px); }
}
</style>
