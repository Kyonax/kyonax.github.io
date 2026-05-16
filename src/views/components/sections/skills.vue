<script setup>
/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 */

import { BRAND_ICON_IDS } from '@data/brand-icons';
import { TECH_BY_ID } from '@data/data';
import BrandIcon from '@ui/brand-icon.vue';
import UiHudDeco from '@ui/hud-deco.vue';
import UiSectionHeader from '@ui/section-header.vue';
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

const { t, locale } = useI18n();

const CATEGORIES = [
  {
    id: 'frontend',
    glyph: '\uF121',
    ids: ['html', 'css', 'scss', 'ts', 'react', 'next', 'vue', 'pug', 'stylus'],
  },
  {
    id: 'backend',
    glyph: '\uF233',
    ids: ['node', 'express', 'nest', 'symfony', 'postgresql', 'mongodb'],
  },
  {
    id: 'devops',
    glyph: '\uF0C2',
    ids: ['docker', 'githubactions', 'vite', 'eslint', 'vitest', 'playwright', 'storybook'],
  },
  {
    id: 'ai',
    glyph: '\uF2DB',
    ids: ['claude', 'openai', 'gemini', 'grok', 'gptel', 'n8n', 'bash', 'litellm', 'ai-workflows'],
  },
];


const display_name = (tech) =>
  (tech.name && (tech.name[locale.value] || tech.name.en)) || tech.id;

const abbr = (tech) => {
  const name = display_name(tech);
  const parts = name.split(/\s+/);
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return parts.slice(0, 2).map((w) => w[0]).join('').toUpperCase();
};

const grouped = computed(() =>
  CATEGORIES.map((cat) => ({
    id:    cat.id,
    glyph: cat.glyph,
    label: t(`kyo-web.landing.skills.categories.${cat.id}`),
    items: cat.ids
      .map((id) => TECH_BY_ID[id])
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
    class="skills kyo-section"
    :aria-label="t('kyo-web.landing.skills.label')"
  >
    <UiHudDeco variant="tr" text="// SYNC :: 31 NODES" />
    <UiHudDeco variant="bl" text="// デベロッパー" />
    <UiHudDeco variant="watermark" text="開発者" class="skills__watermark" />
    <UiSectionHeader
      tag="// 02"
      :title="t('kyo-web.landing.skills.label')"
      :subtitle="t('kyo-web.landing.skills.subtitle')"
    />

    <div class="skills__categories">
      <article
        v-for="cat in grouped"
        :key="cat.id"
        class="skills__category"
      >
        <header class="skills__category-header">
          <span class="icon-glyph icon-glyph--lg" :data-text="cat.glyph" aria-hidden="true" />
          <h3 class="skills__category-label">
            {{ cat.label }}
          </h3>
          <span class="skills__category-count">{{ String(cat.items.length).padStart(2, '0') }}</span>
        </header>

        <ul class="skills__grid" role="list">
          <li
            v-for="item in cat.items"
            :key="item.id"
            class="skills__item element-flare"
            :style="{ '--element-flare-delay': item.delay }"
          >
            <BrandIcon
              v-if="item.brand"
              class="skills__item-icon brand-icon--xl"
              :name="item.brand"
            />
            <span
              v-else-if="item.glyph"
              class="icon-glyph icon-glyph--xl skills__item-icon"
              :data-text="item.glyph"
              aria-hidden="true"
            />
            <span
              v-else
              class="skills__item-abbr"
              aria-hidden="true"
            >{{ item.abbr }}</span>
            <span class="skills__item-name">{{ item.name }}</span>
          </li>
        </ul>
      </article>
    </div>
  </section>
</template>

<style lang="scss" scoped>
.skills {
  &__watermark {
    top: 2rem;
    right: -1.5rem;

    @include min-media-query(md) {
      top: 3rem;
      right: 1rem;
    }
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
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.4rem;

    @include min-media-query(sm) {
      grid-template-columns: repeat(4, minmax(0, 1fr));
      gap: 0.5rem;
    }
    @include min-media-query(lg) {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
  }

  &__item {
    display: grid;
    grid-template-rows: 1.5rem auto;
    align-items: center;
    justify-items: center;
    gap: 0.3rem;
    padding: 1rem 0.35rem 0.55rem;
    min-height: 4.25rem;
    background: var(--clr-neutral-500);
    border: 1px solid var(--clr-border-100);
    color: var(--clr-neutral-100);
    transition: color 0.2s ease, border-color 0.2s ease, transform 0.2s ease;
    cursor: default;
    isolation: isolate;
    --element-flare-spread: 1px;
    --element-flare-color: var(--clr-border-50);
    --element-flare-opacity: 0.05;

    @include min-media-query(md) {
      grid-template-rows: 1.85rem auto;
      gap: 0.4rem;
      padding: 1.1rem 0.5rem 0.75rem;
      min-height: 5.25rem;
    }

    @include min-media-query(lg) {
      grid-template-rows: 2.25rem auto;
      gap: 0.5rem;
      padding: 0.85rem 0.5rem;
      min-height: 6rem;
    }

    &:hover {
      color: var(--clr-primary-100);
      border-color: var(--clr-primary-100);
      transform: translateY(-2px);
      --element-flare-color: var(--clr-primary-100);
      --element-flare-opacity: 0.09;
    }
  }

  &__item-icon {
    color: inherit;

    &.brand-icon--xl,
    &.icon-glyph--xl {
      font-size: 1.35rem;

      @include min-media-query(md) {
        font-size: 1.65rem;
      }

      @include min-media-query(lg) {
        font-size: 2rem;
      }
    }
  }

  &__item-abbr {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1.4rem;
    height: 1.4rem;
    font-family: "SpaceMono", monospace;
    font-size: var(--fs-100);
    font-weight: 700;
    letter-spacing: 0.04em;
    color: inherit;
    border: 1px solid currentColor;
    background: color-mix(in srgb, currentColor 6%, transparent);
    position: relative;

    @include min-media-query(md) {
      width: 1.7rem;
      height: 1.7rem;
      font-size: var(--fs-200);
    }

    @include min-media-query(lg) {
      width: 2rem;
      height: 2rem;
      font-size: var(--fs-300);
    }

    &::before, &::after {
      content: "";
      position: absolute;
      width: 5px;
      height: 5px;
      border: 1px solid currentColor;
      pointer-events: none;
    }
    &::before {
      top: -3px;
      left: -3px;
      border-right: none;
      border-bottom: none;
    }
    &::after {
      bottom: -3px;
      right: -3px;
      border-left: none;
      border-top: none;
    }
  }

  &__item-name {
    font-family: "SpaceMono", monospace;
    font-size: var(--fs-100);
    color: var(--clr-neutral-300);
    text-align: center;
    line-height: 1.15;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 2.3em;

    @include min-media-query(md) {
      font-size: var(--fs-200);
      line-height: 1.18;
      min-height: 2.35em;
    }

    @include min-media-query(lg) {
      font-size: var(--fs-200);
      line-height: 1.2;
      min-height: 2.4em;
    }
  }
}
</style>
