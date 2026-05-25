<script setup>
/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 */

import useInViewport from '@composables/use-in-viewport';
import useCursorTooltip from '@composables/use-cursor-tooltip';
import { vProseLinks } from '@composables/use-prose-links';
import { warmModal } from '@composables/use-warm-modal';
import { BRAND_ICON_IDS } from '@data/brand-icons';
import { TECH_BY_ID } from '@data/data';
import BrandIcon from '@ui/brand-icon.vue';
import UiHudDeco from '@ui/hud-deco.vue';
import ModalLoading from '@ui/modal-loading.vue';
import UiSectionHeader from '@ui/section-header.vue';
import { computed, defineAsyncComponent, nextTick, ref } from 'vue';
import { useI18n } from 'vue-i18n';

/* UiModal chunk loads on first card-open instead of shipping with the
   initial bundle. `ModalLoading` renders synchronously (eager import)
   the instant the modal mounts so the click registers visually even
   when the chunk is still arriving from network. delay:0 = no debounce. */
const UiModal = defineAsyncComponent({
  loader: () => import('@ui/modal.vue'),
  loadingComponent: ModalLoading,
  delay: 0,
});

const { t, locale } = useI18n();

const ENTRIES = [
  { id: 'agile-engine',        tone: 'primary' },
  { id: 'zeronet',             tone: 'neutral' },
  { id: 'softtek',             tone: 'neutral' },
  { id: 'cr-senior-fullstack', tone: 'neutral' },
  { id: 'cr-web-dev',          tone: 'neutral' },
  { id: 'cr-growth',           tone: 'neutral' },
];

const TOKEN_ALIASES = {
  'vue3': 'vue', 'vuejs': 'vue', 'vue.js': 'vue',
  'reactjs': 'react', 'react.js': 'react',
  'nextjs': 'next', 'next.js': 'next',
  'nodejs': 'node', 'node.js': 'node',
  'nestjs': 'nest', 'nest.js': 'nest',
  'gulp.js': 'gulp', 'grunt.js': 'grunt',
  'sass/scss': 'scss', 'sass': 'scss',
  'typescript': 'ts',
  'javascript': 'js',
  'claude-code': 'claude',
  'gpt': 'openai',
};


const TOKEN_DISPLAY = {
  'fedcm': 'FedCM',
  'rspec': 'RSpec',
  'graphql': 'GraphQL',
  'a/b-testing': 'A/B Testing',
};

const _format_label = (raw) =>
  raw
    .replace(/_/g, ' ')
    .split('-')
    .map((seg) =>
      seg.length <= 4
        ? seg.toUpperCase()
        : seg[0].toUpperCase() + seg.slice(1),
    )
    .join('-');

/* Split only on " - " (whitespace BOTH sides) so internal hyphens
   in tokens like `json-ld`, `claude-code`, `a/b-testing` survive. */
const _parse_tools_string = (html) => {
  if (!html) {
    return [];
  }
  return html
    .replace(/<[^>]+>/g, '')
    .split(/\s+-\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
};

const _tech_abbr = (id) => (id.length >= 2 ? id.slice(0, 2).toUpperCase() : id.toUpperCase());
const _token_to_chip = (raw_token) => {
  const normalized = raw_token.toLowerCase().trim();
  const id = TOKEN_ALIASES[normalized] || normalized;
  const tech = TECH_BY_ID[id];
  const fallback_abbr = raw_token.replace(/[^a-z0-9]/gi, '').slice(0, 2).toUpperCase();
  return {
    id:    tech ? id : (id || raw_token),
    label: tech ? (tech.name[locale.value] || tech.name.en) : (TOKEN_DISPLAY[normalized] || _format_label(raw_token)),
    brand: BRAND_ICON_IDS.has(id) ? id : null,
    glyph: tech?.iconGlyph || '',
    abbr:  tech ? _tech_abbr(id) : fallback_abbr,
  };
};

const _chip_cache = new Map();
const stack_chips_for = (entry_id) => {
  const cache_key = `${entry_id}:${locale.value}`;
  if (_chip_cache.has(cache_key)) {
    return _chip_cache.get(cache_key);
  }
  const tools = t(`kyo-web.content-data.experience.${entry_id}.tools`);
  const chips = _parse_tools_string(tools).map(_token_to_chip);
  _chip_cache.set(cache_key, chips);
  return chips;
};

const active_id = ref(null);
const active_entry = computed(() =>
  active_id.value ? ENTRIES.find((e) => e.id === active_id.value) : null,
);

let _modal_trigger_el = null;

const open_modal = (id) => {
  _modal_trigger_el = document.activeElement;
  active_id.value = id;
};

const close_modal = () => {
  active_id.value = null;
  nextTick(() => {
    _modal_trigger_el?.focus();
    _modal_trigger_el = null;
  });
};

const section_ref = ref(null);
useInViewport(section_ref);

const { visible: zl_visible, x: zl_x, y: zl_y } = useCursorTooltip(
  () => section_ref.value?.querySelector('.experience-section__description a[href*="zeronet-labs"]') ?? null,
);
</script>

<template>
  <section
    id="experience"
    ref="section_ref"
    class="experience-section kyo-section"
    :aria-label="t('kyo-web.landing.experience.label')"
  >
    <UiHudDeco variant="tr" text="// LOG :: VERIFIED" />
    <UiHudDeco variant="bl" text="// 進化" />
    <UiHudDeco variant="watermark" text="過去" class="experience-section__watermark" />
    <UiSectionHeader
      tag="// 03"
      :title="t('kyo-web.landing.experience.label')"
      :subtitle="t('kyo-web.landing.experience.subtitle')"
    />

    <ol class="experience-section__timeline">
      <li
        v-for="(entry, idx) in ENTRIES"
        :key="entry.id"
        class="experience-section__node"
        :class="`experience-section__node--${entry.tone}`"
      >
        <div class="experience-section__rail" aria-hidden="true">
          <span class="experience-section__dot" />
          <span v-if="idx < ENTRIES.length - 1" class="experience-section__line" />
        </div>

        <article
          class="experience-section__card element-flare"
          :class="{ 'is-static': idx !== 0 }"
          :style="{ '--element-flare-delay': `${idx * 0.5}s` }"
        >
          <button
            class="experience-section__card-btn"
            :aria-label="`${t(`kyo-web.content-data.experience.${entry.id}.role`)} — ${t('kyo-web.landing.experience.read-more')}`"
            @click="open_modal(entry.id)"
            @pointerenter="warmModal"
            @focusin="warmModal"
          />
          <header class="experience-section__card-header">
            <h2 class="experience-section__role">
              {{ t(`kyo-web.content-data.experience.${entry.id}.role`) }}
            </h2>
            <p
              v-prose-links="t('kyo-web.landing.modal.opens-new-tab')"
              class="experience-section__specs"
              v-html="t(`kyo-web.content-data.experience.${entry.id}.specs`)"
            />
          </header>

          <p
            v-prose-links="t('kyo-web.landing.modal.opens-new-tab')"
            class="experience-section__description kyo-prose"
            v-html="t(`kyo-web.content-data.experience.${entry.id}.description`)"
          />
          <div
            class="sr-only"
            aria-hidden="true"
            v-html="t(`kyo-web.content-data.experience.${entry.id}.bullets`)"
          />
          <span class="experience-section__view-more" aria-hidden="true">
            {{ t('kyo-web.landing.experience.read-more') }}
            <span class="experience-section__view-more-glyph">›</span>
          </span>
        </article>
      </li>
    </ol>

    <UiModal
      v-if="active_entry"
      :is-open="true"
      :title="active_entry ? t(`kyo-web.content-data.experience.${active_entry.id}.role`) : ''"
      :subtitle="active_entry ? t(`kyo-web.content-data.experience.${active_entry.id}.specs`) : ''"
      subtitle-html
      :close-label="t('kyo-web.landing.modal.close')"
      size="lg"
      @close="close_modal"
    >
      <div class="experience-modal">
        <div
          class="experience-modal__description kyo-prose"
          v-html="t(`kyo-web.content-data.experience.${active_entry?.id}.description`)"
        />
        <p class="experience-modal__section-title">
          {{ t('kyo-web.landing.modal.highlights') }}
        </p>
        <ul
          v-prose-links="t('kyo-web.landing.modal.opens-new-tab')"
          class="experience-modal__bullets kyo-prose"
          v-html="t(`kyo-web.content-data.experience.${active_entry?.id}.bullets`)"
        />
        <p class="experience-modal__section-title">
          {{ t('kyo-web.landing.experience.tools-label') }}
        </p>
        <ul class="experience-modal__stack" role="list">
          <li
            v-for="chip in stack_chips_for(active_entry.id)"
            :key="chip.id"
            class="experience-modal__stack-item"
          >
            <BrandIcon
              v-if="chip.brand"
              class="experience-modal__stack-icon brand-icon--lg"
              :name="chip.brand"
            />
            <span
              v-else-if="chip.glyph"
              class="icon-glyph icon-glyph--lg experience-modal__stack-icon"
              :data-text="chip.glyph"
              aria-hidden="true"
            />
            <span v-else class="experience-modal__stack-abbr">
              {{ chip.abbr }}
            </span>
            <span class="experience-modal__stack-name">{{ chip.label }}</span>
          </li>
        </ul>
      </div>
    </UiModal>
    <Teleport to="body">
      <Transition name="kyo-ct">
        <div
          v-if="zl_visible"
          class="kyo-cursor-tooltip"
          :style="{ left: zl_x + 'px', top: zl_y + 'px' }"
        >
          {{ t('kyo-web.landing.hero.tooltip.zeronet') }}
        </div>
      </Transition>
    </Teleport>
  </section>
</template>

<style lang="scss" scoped>
.experience-section {
  &__watermark {
    top: 2rem;
    right: -2rem;

    @include min-media-query(md) {
      top: 3rem;
      right: 2rem;
    }
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
    grid-template-columns: 20px minmax(0, 1fr);
    gap: 0.5rem;

    @include min-media-query(sm) {
      grid-template-columns: 32px minmax(0, 1fr);
      gap: 1rem;
    }

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
    width: 10px;
    height: 10px;
    border: 2px solid var(--clr-primary-100);
    background: var(--clr-neutral-500);
    border-radius: 50%;
    flex-shrink: 0;
    box-shadow: 0 0 8px color-mix(in srgb, var(--clr-primary-100) 40%, transparent);
    z-index: 1;

    @include min-media-query(sm) {
      width: 14px;
      height: 14px;
    }
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
    cursor: pointer;
    transition: transform 0.25s ease;
    isolation: isolate;
    --element-flare-spread: 2px;
    --element-flare-opacity: 0.04;

    &:hover,
    &:has(:focus-visible) {
      border-color: var(--clr-primary-100);
      background:
        linear-gradient(
          135deg,
          color-mix(in srgb, var(--clr-primary-100) 8%, transparent) 0%,
          color-mix(in srgb, var(--clr-neutral-500) 80%, transparent) 100%
        );
      transform: translateX(4px);
      --element-flare-opacity: 0.16;
    }
  }

  &__card-btn {
    position: absolute;
    inset: 0;
    background: transparent;
    border: 0;
    cursor: pointer;
    z-index: 1;
    border-radius: inherit;

    &:focus-visible {
      outline: 2px solid var(--clr-primary-100);
      outline-offset: 2px;
    }
  }

  &__card {

    @include min-media-query(md) {
      padding: 1.5rem;
    }
  }

  &__node:not(:first-child) &__card {
    --element-flare-opacity: 0;

    &:hover,
    &:focus-visible {
      --element-flare-opacity: 0.16;
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

  /* Neutral cards on hover get a softer gradient than the primary card —
     half the yellow tint and a less opaque neutral floor — so the primary
     card stays the visual standout in the timeline. */
  &__node--neutral &__card:hover,
  &__node--neutral &__card:focus-visible {
    background:
      linear-gradient(
        135deg,
        color-mix(in srgb, var(--clr-primary-100) 4%, transparent) 0%,
        color-mix(in srgb, var(--clr-neutral-500) 70%, transparent) 100%
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
    color: var(--clr-neutral-100);
    margin: 0 0 0.4rem;
    letter-spacing: 0.02em;
    line-height: 1.2;
  }

  &__card:hover &__role,
  &__card:has(:focus-visible) &__role {
    color: var(--clr-primary-100);
  }

  &__node--primary &__role {
    color: var(--clr-primary-100);
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
    font-size: var(--fs-400);
    margin: 0 0 0.4rem;
    display: -webkit-box;
    -webkit-line-clamp: 7;
    line-clamp: 7;
    -webkit-box-orient: vertical;
    overflow: hidden;

    @include min-media-query(sm) {
      -webkit-line-clamp: 8;
      line-clamp: 8;
    }
  }

  &__view-more {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    font-family: "SpaceMono", monospace;
    font-size: var(--fs-100);
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: var(--clr-primary-100);
    margin: 0 0 1rem;
    pointer-events: none;
  }

  &__card:hover &__view-more-glyph,
  &__card:has(:focus-visible) &__view-more-glyph {
    transform: translateX(4px);
  }

  &__view-more-glyph {
    font-size: 1.2em;
    transition: transform 0.2s ease;
    line-height: 1;
    transform: translateY(-0.05em);
    transition: transform 0.2s ease;
  }

  &__card:hover &__view-more-glyph,
  &__card:focus-visible &__view-more-glyph {
    transform: translate(0.2rem, -0.05em);
  }

}

.experience-modal {
  font-family: "Geomanist", sans-serif;
  color: var(--clr-neutral-200);

  &__description {
    font-size: var(--fs-400);
    margin: 0 0 1.5rem;
  }

  &__section-title {
    font-family: "SpaceMono", monospace;
    font-size: var(--fs-200);
    color: var(--clr-primary-100);
    letter-spacing: 0.16em;
    text-transform: uppercase;
    margin: 2rem 0 1rem;
    padding: 0.5rem 0.75rem;
    border-left: 2px solid var(--clr-primary-100);
    background: color-mix(in srgb, var(--clr-primary-100) 4%, transparent);

    &:first-of-type {
      margin-top: 0;
    }
  }

  &__bullets {
    list-style: none;
    margin: 0;
    padding: 0;
    counter-reset: kyo-bullet;

    :deep(li) {
      counter-increment: kyo-bullet;
      position: relative;
      font-size: var(--fs-400);
      padding: 1rem 0 1rem 3rem;
      margin: 0;
      border-bottom: 1px dashed color-mix(in srgb, var(--clr-border-100) 50%, transparent);

      @include min-media-query(md) {
        padding-left: 3.5rem;
      }

      &::before {
        @include kyo-chip;
        content: counter(kyo-bullet, decimal-leading-zero);
        position: absolute;
        left: 0;
        top: 1.1rem;
        font-size: var(--fs-200);
        color: var(--clr-primary-100);
        padding: 0.1rem 0.4rem;
      }

      &:first-child {
        padding-top: 0.5rem;

        &::before { top: 0.6rem; }
      }

      &:last-child {
        margin-bottom: 0;
        border-bottom: none;
      }
    }
  }

  &__stack {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: 0.75rem;

    @include max-media-query(md) {
      grid-template-columns: repeat(auto-fit, minmax(110px, 1fr));
      gap: 0.5rem;
    }
  }

  &__stack-item { @include tech-stack-item; }

  &__stack-icon { @include tech-stack-icon; }

  &__stack-abbr { @include tech-stack-abbr; }

  &__stack-name {
    color: inherit;
  }
}
</style>
