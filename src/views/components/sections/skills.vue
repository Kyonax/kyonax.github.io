<script setup>
/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 */

import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

import BrandIcon from '@ui/brand-icon.vue';
import { TECHNOLOGIES } from '@data/data';

const BRAND_ICON_IDS = new Set([
  'css', 'ts', 'next', 'vue', 'jest', 'node', 'express', 'symfony',
  'vite', 'nest', 'postgresql', 'mongodb', 'githubactions',
]);

const { t, locale } = useI18n();

const CATEGORIES = [
  {
    id: 'frontend',
    glyph: '',
    ids: ['html', 'css', 'scss', 'js', 'ts', 'react', 'next', 'vue', 'vite'],
  },
  {
    id: 'backend',
    glyph: '',
    ids: ['node', 'express', 'nest', 'php', 'symfony', 'python', 'postgresql', 'mongodb'],
  },
  {
    id: 'devops',
    glyph: '',
    ids: ['docker', 'aws', 'git', 'githubactions', 'jest'],
  },
];

const tech_by_id = Object.fromEntries(TECHNOLOGIES.map((t_) => [t_.id, t_]));

const display_name = (tech) =>
  (tech.name && (tech.name[locale.value] || tech.name.en)) || tech.id;

const abbr = (tech) => {
  const name = display_name(tech);
  return name.split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
};

const grouped = computed(() =>
  CATEGORIES.map((cat) => ({
    id:    cat.id,
    glyph: cat.glyph,
    label: t(`kyo-web.landing.skills.categories.${cat.id}`),
    items: cat.ids
      .map((id) => tech_by_id[id])
      .filter(Boolean)
      .map((tech, idx) => ({
        id:    tech.id,
        name:  display_name(tech),
        glyph: tech.iconGlyph,
        abbr:  abbr(tech),
        brand: BRAND_ICON_IDS.has(tech.id) ? tech.id : null,
        delay: `${(idx % 6) * 0.4}s`,
      })),
  })),
);
</script>

<template>
  <section
    id="skills"
    class="skills"
    role="region"
    :aria-label="t('kyo-web.landing.skills.label')">
    <span class="hud-deco hud-deco--tr" aria-hidden="true">// SYNC :: 22 NODES</span>
    <span class="hud-deco hud-deco--bl" aria-hidden="true">// デベロッパー</span>
    <span class="hud-deco hud-deco--watermark skills__watermark" aria-hidden="true">開発者</span>
    <header class="skills__header">
      <span class="skills__index">// 02</span>
      <h2 class="skills__title">{{ t('kyo-web.landing.skills.label') }}</h2>
      <p class="skills__subtitle">{{ t('kyo-web.landing.skills.subtitle') }}</p>
    </header>

    <div class="skills__categories">
      <article
        v-for="cat in grouped"
        :key="cat.id"
        class="skills__category">
        <header class="skills__category-header">
          <span class="icon-glyph icon-glyph--lg" aria-hidden="true">{{ cat.glyph }}</span>
          <h3 class="skills__category-label">{{ cat.label }}</h3>
          <span class="skills__category-count">{{ String(cat.items.length).padStart(2, '0') }}</span>
        </header>

        <ul class="skills__grid" role="list">
          <li
            v-for="item in cat.items"
            :key="item.id"
            class="skills__item element-flare"
            :style="{ '--element-flare-delay': item.delay }"
            tabindex="0"
            :aria-label="item.name">
            <BrandIcon
              v-if="item.brand"
              class="skills__item-icon brand-icon--xl"
              :name="item.brand" />
            <span
              v-else-if="item.glyph"
              class="icon-glyph icon-glyph--xl skills__item-icon"
              aria-hidden="true">{{ item.glyph }}</span>
            <span
              v-else
              class="skills__item-abbr"
              aria-hidden="true">{{ item.abbr }}</span>
            <span class="skills__item-name">{{ item.name }}</span>
          </li>
        </ul>
      </article>
    </div>
  </section>
</template>

<style lang="scss" scoped>
.skills {
  position: relative;
  padding: 5rem 1.5rem;
  max-width: 1280px;
  margin: 0 auto;
  
  overflow: hidden;

  @include min-media-query(md) {
    padding: 6rem 2rem;
  }

  
  &__watermark {
    top: 2rem;
    right: -1.5rem;

    @include min-media-query(md) {
      top: 3rem;
      right: 1rem;
    }
  }

  &__header {
    margin-bottom: 3rem;
    border-bottom: 1px solid var(--clr-border-100);
    padding-bottom: 1.25rem;
  }

  &__index {
    font-family: "SpaceMono", monospace;
    font-size: var(--fs-200);
    color: var(--clr-primary-100);
    letter-spacing: 0.12em;
    display: block;
    margin-bottom: 0.5rem;
  }

  &__title {
    font-family: "Geomanist", sans-serif;
    font-size: var(--fs-700);
    color: var(--clr-neutral-50);
    margin: 0 0 0.5rem;
    letter-spacing: -0.01em;
    line-height: 1;
  }

  &__subtitle {
    font-family: "Geomanist", sans-serif;
    
    font-size: var(--fs-400);
    line-height: 1.6;
    letter-spacing: 0.012em;
    word-spacing: 0.04em;
    color: var(--clr-neutral-100);
    margin: 0;
    max-width: 60ch;
  }

  &__categories {
    display: grid;
    grid-template-columns: 1fr;
    gap: 1.5rem;

    @include min-media-query(md) {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 2rem;
    }
    @include min-media-query(lg) {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
  }

  &__category {
    border: 1px solid var(--clr-border-100);
    background: color-mix(in srgb, var(--clr-neutral-500) 70%, transparent);
    padding: 1.25rem;
    transition: border-color 0.25s ease;

    &:hover { border-color: var(--clr-primary-100); }
  }

  &__category-header {
    display: grid;
    grid-template-columns: auto 1fr auto;
    align-items: center;
    gap: 0.75rem;
    border-bottom: 1px dashed var(--clr-border-100);
    padding-bottom: 0.75rem;
    margin-bottom: 1rem;
    color: var(--clr-primary-100);
  }

  &__category-label {
    font-family: "Geomanist", sans-serif;
    font-size: var(--fs-400);
    color: var(--clr-neutral-50);
    margin: 0;
    letter-spacing: 0.06em;
  }

  &__category-count {
    font-family: "SpaceMono", monospace;
    font-size: var(--fs-200);
    color: var(--clr-neutral-300);
  }

  &__grid {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.5rem;

    @include min-media-query(sm) {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
    @include min-media-query(lg) {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    @include min-media-query(xl) {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
  }

  &__item {
    display: grid;
    grid-template-rows: auto auto;
    align-items: center;
    justify-items: center;
    gap: 0.4rem;
    padding: 0.75rem 0.5rem;
    background: var(--clr-neutral-500);
    border: 1px solid var(--clr-border-100);
    color: var(--clr-neutral-100);
    transition: color 0.2s ease, border-color 0.2s ease, transform 0.2s ease;
    cursor: default;
    outline: none;
    isolation: isolate;
    --element-flare-spread: 1px;
    --element-flare-color: var(--clr-border-50);
    --element-flare-opacity: 0.08;

    &:hover,
    &:focus-visible {
      color: var(--clr-primary-100);
      border-color: var(--clr-primary-100);
      transform: translateY(-2px);
      --element-flare-color: var(--clr-primary-100);
      --element-flare-opacity: 0.12;
    }
  }

  &__item-icon {
    color: inherit;
  }

  &__item-abbr {
    font-family: "Geomanist", sans-serif;
    font-size: var(--fs-500);
    font-weight: 700;
    letter-spacing: 0.04em;
  }

  &__item-name {
    font-family: "SpaceMono", monospace;
    font-size: var(--fs-200);
    color: var(--clr-neutral-300);
    text-align: center;
    line-height: 1.2;
  }
}
</style>
