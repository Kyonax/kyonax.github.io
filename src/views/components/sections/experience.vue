<script setup>
/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 */

import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const ENTRIES = [
  { id: 'zeronet',             tone: 'primary' },
  { id: 'softtek',             tone: 'neutral' },
  { id: 'cr-senior-fullstack', tone: 'neutral' },
  { id: 'cr-web-dev',          tone: 'neutral' },
  { id: 'cr-growth',           tone: 'neutral' },
];
</script>

<template>
  <section
    id="experience"
    class="experience-section"
    role="region"
    :aria-label="t('kyo-web.landing.experience.label')">
    <span class="hud-deco hud-deco--tr" aria-hidden="true">// LOG :: VERIFIED</span>
    <span class="hud-deco hud-deco--bl" aria-hidden="true">// 進化</span>
    <span class="hud-deco hud-deco--watermark experience-section__watermark" aria-hidden="true">過去</span>
    <header class="experience-section__header">
      <span class="experience-section__index">// 03</span>
      <h2 class="experience-section__title">
        {{ t('kyo-web.landing.experience.label') }}
      </h2>
      <p class="experience-section__subtitle">
        {{ t('kyo-web.landing.experience.subtitle') }}
      </p>
    </header>

    <ol class="experience-section__timeline">
      <li
        v-for="(entry, idx) in ENTRIES"
        :key="entry.id"
        class="experience-section__node"
        :class="`experience-section__node--${entry.tone}`">
        <div class="experience-section__rail" aria-hidden="true">
          <span class="experience-section__dot" />
          <span v-if="idx < ENTRIES.length - 1" class="experience-section__line" />
        </div>

        <article class="experience-section__card element-flare" :style="{ '--element-flare-delay': `${idx * 0.5}s` }">
          <header class="experience-section__card-header">
            <h3 class="experience-section__role">
              {{ t(`kyo-web.content-data.experience.${entry.id}.role`) }}
            </h3>
            <p
              class="experience-section__specs"
              v-html="t(`kyo-web.content-data.experience.${entry.id}.specs`)" />
          </header>

          <p
            class="experience-section__description"
            v-html="t(`kyo-web.content-data.experience.${entry.id}.description`)" />

          <footer class="experience-section__tools">
            <span class="experience-section__tools-label">
              {{ t('kyo-web.landing.experience.tools-label') }}
            </span>
            <p
              class="experience-section__tools-list"
              v-html="t(`kyo-web.content-data.experience.${entry.id}.tools`)" />
          </footer>
        </article>
      </li>
    </ol>
  </section>
</template>

<style lang="scss" scoped>
.experience-section {
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
    right: -2rem;

    @include min-media-query(md) {
      top: 3rem;
      right: 2rem;
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

  &__timeline {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    gap: 0;
  }

  &__node {
    display: grid;
    grid-template-columns: 32px minmax(0, 1fr);
    gap: 1rem;

    @include min-media-query(md) {
      grid-template-columns: 48px minmax(0, 1fr);
      gap: 1.5rem;
    }
  }

  &__rail {
    position: relative;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding-top: 1.25rem;
  }

  &__dot {
    width: 14px;
    height: 14px;
    border: 2px solid var(--clr-primary-100);
    background: var(--clr-neutral-500);
    border-radius: 50%;
    flex-shrink: 0;
    box-shadow: 0 0 8px color-mix(in srgb, var(--clr-primary-100) 40%, transparent);
    z-index: 1;
  }

  &__node--primary &__dot {
    background: var(--clr-primary-100);
    box-shadow: 0 0 14px var(--clr-primary-100);
  }

  &__line {
    flex: 1;
    width: 1px;
    background: linear-gradient(
      to bottom,
      var(--clr-primary-100) 0%,
      var(--clr-border-100) 100%
    );
    margin-top: 0.4rem;
  }

  &__card {
    border: 1px solid var(--clr-border-100);
    background: color-mix(in srgb, var(--clr-neutral-500) 75%, transparent);
    padding: 1.25rem;
    margin-bottom: 1.5rem;
    transition: border-color 0.25s ease, transform 0.25s ease;
    isolation: isolate;
    --element-flare-spread: 2px;
    --element-flare-opacity: 0.18;

    &:hover {
      border-color: var(--clr-primary-100);
      transform: translateX(4px);
    }

    @include min-media-query(md) {
      padding: 1.5rem;
    }
  }

  &__node--primary &__card {
    border-color: var(--clr-primary-100);
    background:
      linear-gradient(
        135deg,
        color-mix(in srgb, var(--clr-primary-100) 8%, transparent) 0%,
        color-mix(in srgb, var(--clr-neutral-500) 80%, transparent) 100%
      );
  }

  &__card-header {
    margin-bottom: 1rem;
    border-bottom: 1px dashed var(--clr-border-100);
    padding-bottom: 0.75rem;
  }

  &__role {
    font-family: "Geomanist", sans-serif;
    
    font-size: var(--fs-500);
    font-weight: 700;
    color: var(--clr-primary-100);
    margin: 0 0 0.4rem;
    letter-spacing: 0.02em;
    line-height: 1.2;
  }

  &__specs {
    font-family: "SpaceMono", monospace;
    font-size: var(--fs-200);
    color: var(--clr-neutral-300);
    letter-spacing: 0.06em;
    margin: 0;

    :deep(strong) {
      color: var(--clr-neutral-50);
      font-weight: 700;
    }
  }

  &__description {
    font-family: "Geomanist", sans-serif;
    font-size: var(--fs-300);
    line-height: 1.65;
    letter-spacing: 0.018em;
    word-spacing: 0.06em;
    color: var(--clr-neutral-100);
    margin: 0 0 1rem;

    :deep(strong) {
      color: var(--clr-neutral-50);
      font-weight: 700;
    }
  }

  &__tools {
    border-top: 1px dashed var(--clr-border-100);
    padding-top: 0.75rem;
  }

  &__tools-label {
    display: inline-block;
    font-family: "SpaceMono", monospace;
    font-size: var(--fs-100);
    color: var(--clr-primary-100);
    letter-spacing: 0.12em;
    margin-bottom: 0.4rem;
    border: 1px solid var(--clr-border-100);
    padding: 0.2rem 0.5rem;
  }

  &__tools-list {
    font-family: "SpaceMono", monospace;
    font-size: var(--fs-200);
    color: var(--clr-neutral-200);
    line-height: 1.7;
    margin: 0;

    :deep(strong) {
      color: var(--clr-neutral-50);
      font-weight: 700;
      background: color-mix(in srgb, var(--clr-primary-100) 10%, transparent);
      padding: 0.1rem 0.35rem;
      margin-right: 0.2rem;
      display: inline-block;
      border-radius: 2px;
    }
  }
}
</style>
