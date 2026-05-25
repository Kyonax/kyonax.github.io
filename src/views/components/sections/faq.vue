<script setup>
/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 */

import useInViewport from '@composables/use-in-viewport';
import { vProseLinks } from '@composables/use-prose-links';
import UiHudDeco from '@ui/hud-deco.vue';
import UiSectionHeader from '@ui/section-header.vue';
import { nextTick, ref } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const ITEM_IDS = ['what-i-do', 'hire-me', 'technologies', 'projects-companies', 'hiring-criteria', 'contact', 'latam', 'frontend-vs-fullstack', 'performance-seo'];

const active_id = ref(null);

const toggle = (id) => {
  const closing = active_id.value === id;
  active_id.value = closing ? null : id;
  if (closing) {
    nextTick(() => document.querySelector(`#faq-question-${id}`)?.focus());
  }
};

const GLYPH_CHEVRON = '\uF054';

const section_ref = ref(null);
useInViewport(section_ref);
</script>

<template>
  <section
    id="faq"
    ref="section_ref"
    class="faq kyo-section"
    :aria-label="t('kyo-web.landing.faq.section-aria')"
  >
    <UiHudDeco variant="tr" text="// DIALOG :: ACTIVE" />
    <UiHudDeco variant="bl" text="// 質問" />
    <UiHudDeco variant="watermark" text="応答" class="faq__watermark" />

    <UiSectionHeader
      :tag="t('kyo-web.landing.faq.tag')"
      :title="t('kyo-web.landing.faq.title')"
      :subtitle="t('kyo-web.landing.faq.subtitle')"
    />

    <ul class="faq__list" role="list">
      <li
        v-for="(id, i) in ITEM_IDS"
        :key="id"
        class="faq__item"
        :class="{ 'faq__item--open': active_id === id }"
      >
        <h3 class="faq__heading">
          <button
            :id="`faq-question-${id}`"
            type="button"
            class="faq__summary"
            :aria-expanded="String(active_id === id)"
            :aria-controls="`faq-answer-${id}`"
            @click="toggle(id)"
            @keydown.escape="if (active_id === id) toggle(id)"
          >
            <span class="faq__num kyo-chip" :data-text="String(i + 1).padStart(2, '0')" aria-hidden="true" />
            <span class="faq__question">{{ t(`kyo-web.landing.faq.items.${id}.question`) }}</span>
            <span class="icon-glyph faq__chevron" :data-text="GLYPH_CHEVRON" aria-hidden="true" />
          </button>
        </h3>
        <div
          :id="`faq-answer-${id}`"
          class="faq__panel"
          role="region"
          :aria-labelledby="`faq-question-${id}`"
          :aria-hidden="active_id !== id"
          :inert="active_id !== id"
        >
          <div class="faq__panel-inner">
            <div
              v-prose-links="t('kyo-web.landing.modal.opens-new-tab')"
              class="faq__answer kyo-prose"
              v-html="t(`kyo-web.landing.faq.items.${id}.answer`)"
            />
          </div>
        </div>
      </li>
    </ul>
  </section>
</template>

<style lang="scss" scoped>
.faq {
  &__watermark {
    top: 2rem;
    right: -1.5rem;

    @include min-media-query(md) {
      top: 3rem;
      right: 1rem;
    }
  }

  &__list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 0.85rem;
  }

  &__item {
    --element-flare-opacity: 0.05;
    --element-flare-blur: 0;
    position: relative;
    border: 1px solid var(--clr-border-100);
    background: color-mix(in srgb, var(--clr-neutral-500) 75%, transparent);
    isolation: isolate;
    contain: layout paint;
    &:hover {
      border-color: color-mix(in srgb, var(--clr-primary-100) 35%, var(--clr-border-100));
    }

    &--open {
      --element-flare-opacity: 0.12;
      border-color: var(--clr-primary-100);

      .faq__chevron {
        transform: rotate(90deg);
      }

      .faq__num {
        background: color-mix(in srgb, var(--clr-primary-100) 18%, transparent);
      }
    }
  }

  &__heading {
    margin: 0;
    font: inherit;
    font-weight: inherit;
  }

  &__summary {
    width: 100%;
    background: transparent;
    border: 0;
    cursor: pointer;
    display: grid;
    grid-template-columns: auto 1fr auto;
    align-items: center;
    gap: 1rem;
    padding: 1.1rem 1.15rem;
    text-align: left;
    color: inherit;
    font: inherit;

    @include min-media-query(md) {
      gap: 1.25rem;
      padding: 1.25rem 1.4rem;
    }
  }

  &__num {
    font-size: var(--fs-200);
    padding: 0.3rem 0.5rem;
    transition: background 0.25s ease;
  }

  &__question {
    font-family: "Geomanist", sans-serif;
    font-weight: 700;
    font-size: var(--fs-300);
    color: var(--clr-neutral-100);
    line-height: 1.35;
    letter-spacing: 0.03em;

    @include min-media-query(md) {
      font-size: var(--fs-400);
    }
  }

  &__chevron {
    color: var(--clr-primary-100);
    font-size: 0.85em;
    transition: transform 0.3s ease;
    transform-origin: center;
  }

  /* grid-template-rows 0fr to 1fr animates auto-height content without
     measuring it. Falls back to instant in older browsers. */
  &__panel {
    display: grid;
    grid-template-rows: 0fr;
    transition: grid-template-rows 0.35s var(--ease-standard);
  }

  &__item--open &__panel {
    grid-template-rows: 1fr;
  }

  &__panel-inner {
    overflow: hidden;
  }

  &__answer {
    padding: 1.25rem 1.15rem 1.35rem;
    border-top: 1px dashed color-mix(in srgb, var(--clr-border-100) 50%, transparent);
    margin-top: 0.25rem;
    font-size: var(--fs-300);

    @include min-media-query(md) {
      font-size: var(--fs-400);
      padding: 1.25rem 1.4rem 1.55rem;
    }
  }


  @media (prefers-reduced-motion: reduce) {
    &__panel,
    &__chevron,
    &__num {
      transition: none;
    }
  }
}
</style>
