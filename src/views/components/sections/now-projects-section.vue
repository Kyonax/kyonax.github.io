<script setup>
/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 */

import { computed, ref, onMounted, onBeforeUnmount } from 'vue';
import { useI18n } from 'vue-i18n';

import { PROJECTS, PROJECT_STATUS, NOW_STATUS_PRIORITY } from '@data/projects';
import useProjectCountdowns from '@composables/use-project-countdowns';

const { t, locale } = useI18n();

const NOW_MAX = 6;
const FEATURED_MAX = 9;

/* 1Hz tick for the WORKING_ON count-up. Deadline countdown stays
   on the worker; count-up is elapsed-from-start arithmetic. */
const _now_ms = ref(Date.now());
let _tick_id = null;

onMounted(() => {
  _tick_id = setInterval(() => { _now_ms.value = Date.now(); }, 1000);
});
onBeforeUnmount(() => {
  if (_tick_id) { clearInterval(_tick_id); _tick_id = null; }
});

const _format_elapsed_segments = (started_ms, now_ms) => {
  if (!Number.isFinite(started_ms)) return [];
  const diff_ms = Math.max(0, now_ms - started_ms);
  const sec = Math.floor(diff_ms / 1000) % 60;
  const min = Math.floor(diff_ms / 60000) % 60;
  const hr  = Math.floor(diff_ms / 3600000) % 24;
  const day = Math.floor(diff_ms / 86400000);
  return [
    `${day}d`,
    `${String(hr).padStart(2, '0')}h`,
    `${String(min).padStart(2, '0')}m`,
    `${String(sec).padStart(2, '0')}s`,
  ];
};

/* Deadlines authored in Bogotá local (UTC-5). Always render in
   Bogotá TZ. Uppercase to match the HUD register. */
const _format_deadline = (deadline_str) => {
  if (!deadline_str) return null;
  const ms = Date.parse(`${deadline_str} GMT-0500`);
  if (!Number.isFinite(ms)) return null;
  return new Intl.DateTimeFormat(
    locale.value === 'es' ? 'es-CO' : 'en-US',
    {
      timeZone: 'America/Bogota',
      month:    'short',
      day:      'numeric',
      year:     'numeric',
      hour:     'numeric',
      minute:   '2-digit',
    },
  ).format(new Date(ms)).toUpperCase();
};

const GLYPH_REPO     = '';
const GLYPH_LINK     = '';
const GLYPH_ENDED    = '';
const GLYPH_FEATURED = '';

const now_keys = Object.keys(PROJECTS).filter((k) => !PROJECTS[k].featured);
const countdowns = useProjectCountdowns(now_keys);

const _deadline_ms = (project) => {
  if (!project.deadlines) return Number.POSITIVE_INFINITY;
  const first = Object.values(project.deadlines)[0];
  if (!first) return Number.POSITIVE_INFINITY;
  const t_ = Date.parse(first);
  return Number.isFinite(t_) ? t_ : Number.POSITIVE_INFINITY;
};

const _status_color = (status_id) =>
  PROJECT_STATUS[status_id]?.color || 'primary';
const _status_label_key = (status_id) =>
  PROJECT_STATUS[status_id]?.labelKey || 'kyo-web.landing.projects.status.in-progress';

const buildNowCard = (key) => {
  const project = PROJECTS[key];
  const cd = countdowns[key];
  const ended = cd && !cd.countdown;
  const status_id = project.status || 'IN_PROGRESS';
  const deadline_str = Object.values(project.deadlines || {})[0] || '';
  const started_str  = project.started || '';
  const started_ms   = started_str
    ? Date.parse(`${started_str} GMT-0500`)
    : null;
  return {
    key,
    name:        project.name,
    url:         project.url || '',
    has_link:    Boolean(project.url),
    version:     project.version || '',
    status_id,
    status_color: _status_color(status_id),
    status_label: t(_status_label_key(status_id)),
    label:       project.description || cd?.label || Object.keys(project.deadlines || {})[0] || '',
    countdown:   cd?.countdown || null,
    deadline_text: _format_deadline(deadline_str),
    ended,
    is_working_on: status_id === 'WORKING_ON' && Number.isFinite(started_ms),
    started_ms,
    started_text: started_str ? _format_deadline(started_str) : null,
  };
};

const buildFeaturedCard = (key) => {
  const project = PROJECTS[key];
  const status_id = project.status || 'LIVE';
  return {
    key,
    name:        project.name,
    url:         project.url || '',
    has_link:    Boolean(project.url),
    version:     project.version || '',
    status_id,
    status_color: _status_color(status_id),
    status_label: t(_status_label_key(status_id)),
  };
};

const main_cards = computed(() => {
  return now_keys
    .map(buildNowCard)
    .sort((a, b) => {
      const pa = NOW_STATUS_PRIORITY[a.status_id] ?? 99;
      const pb = NOW_STATUS_PRIORITY[b.status_id] ?? 99;
      if (pa !== pb) return pa - pb;
      return _deadline_ms(PROJECTS[a.key]) - _deadline_ms(PROJECTS[b.key]);
    })
    .slice(0, NOW_MAX);
});

const featured_cards = computed(() =>
  Object.keys(PROJECTS)
    .filter((k) => PROJECTS[k].featured)
    .slice(0, FEATURED_MAX)
    .map(buildFeaturedCard),
);

const segments = (countdown) => {
  if (!countdown) return [];
  return countdown.split('_').filter(Boolean);
};

const elapsed_segments = (started_ms) =>
  _format_elapsed_segments(started_ms, _now_ms.value);
</script>

<template>
  <section
    id="projects"
    class="now-projects-section"
    role="region"
    :aria-label="t('kyo-web.landing.projects.label')">
    <span class="hud-deco hud-deco--tr" aria-hidden="true">// PIPELINE :: OPEN</span>
    <span class="hud-deco hud-deco--bl" aria-hidden="true">// 未来</span>
    <span class="hud-deco hud-deco--watermark now-projects-section__watermark" aria-hidden="true">未来</span>
    <header class="now-projects-section__header">
      <span class="now-projects-section__index">// 04</span>
      <h2 class="now-projects-section__title">
        {{ t('kyo-web.landing.projects.label') }}
      </h2>
      <p class="now-projects-section__subtitle">
        {{ t('kyo-web.landing.projects.subtitle') }}
      </p>
    </header>

    <ul class="now-projects-section__cards" role="list">
      <li
        v-for="(card, idx) in main_cards"
        :key="card.key"
        class="now-projects-section__card-wrap">
        <component
          :is="card.has_link ? 'a' : 'div'"
          :href="card.has_link ? card.url : null"
          :target="card.has_link ? '_blank' : null"
          :rel="card.has_link ? 'noopener noreferrer' : null"
          class="now-projects-section__card element-flare"
          :class="{
            'is-ended':  card.ended,
            'is-static': !card.has_link,
          }"
          :style="{
            '--state-color': `var(--clr-${card.status_color}-100)`,
            '--element-flare-delay': `${idx * 0.6}s`,
          }">
          <header class="now-projects-section__card-header">
            <span class="now-projects-section__status">
              <span class="state-grid" aria-hidden="true">
                <span /><span /><span />
                <span /><span /><span />
                <span /><span /><span />
              </span>
              {{ card.status_label }}
            </span>
            <span class="now-projects-section__index-num">#{{ String(idx + 1).padStart(2, '0') }}</span>
          </header>

          <div class="now-projects-section__name-block">
            <h3 class="now-projects-section__name">{{ card.name }}</h3>
            <span v-if="card.version" class="now-projects-section__version">{{ card.version }}</span>
          </div>

          <p class="now-projects-section__milestone">
            // {{ card.label.toUpperCase() }}
          </p>
          <div v-if="card.is_working_on" class="now-projects-section__countdown">
            <div class="now-projects-section__countdown-head">
              <span class="now-projects-section__countdown-label">
                {{ t('kyo-web.landing.projects.started-in-prefix') }}
              </span>
              <span v-if="card.started_text" class="now-projects-section__countdown-date">
                {{ card.started_text }}
              </span>
            </div>
            <div class="now-projects-section__countdown-segments">
              <span
                v-for="seg in elapsed_segments(card.started_ms)"
                :key="seg"
                class="now-projects-section__segment">{{ seg }}</span>
            </div>
            <span class="now-projects-section__countdown-tz">
              {{ t('kyo-web.landing.projects.timezone-label') }}
            </span>
          </div>
          <div v-else-if="!card.ended && card.countdown" class="now-projects-section__countdown">
            <div class="now-projects-section__countdown-head">
              <span class="now-projects-section__countdown-label">
                {{ t('kyo-web.landing.projects.ends-in-prefix') }}
              </span>
              <span v-if="card.deadline_text" class="now-projects-section__countdown-date">
                {{ card.deadline_text }}
              </span>
            </div>
            <div class="now-projects-section__countdown-segments">
              <span
                v-for="seg in segments(card.countdown)"
                :key="seg"
                class="now-projects-section__segment">{{ seg }}</span>
            </div>
            <span class="now-projects-section__countdown-tz">
              {{ t('kyo-web.landing.projects.timezone-label') }}
            </span>
          </div>
          <div v-else-if="card.ended" class="now-projects-section__ended-state">
            <span class="icon-glyph" aria-hidden="true">{{ GLYPH_ENDED }}</span>
            <span>{{ t('kyo-web.landing.projects.ended-state') }}</span>
          </div>
          <span v-if="card.has_link" class="now-projects-section__link">
            <span class="icon-glyph icon-glyph--lg" aria-hidden="true">{{ GLYPH_REPO }}</span>
            <span class="now-projects-section__link-text">{{ t('kyo-web.landing.projects.view-repo') }}</span>
            <span class="icon-glyph now-projects-section__link-external" aria-hidden="true">{{ GLYPH_LINK }}</span>
          </span>
          <span v-else class="now-projects-section__no-link">
            {{ t('kyo-web.landing.projects.no-link') }}
          </span>
        </component>
      </li>
    </ul>

    <section class="now-projects-section__featured">
      <h3 class="now-projects-section__featured-label">
        <span class="icon-glyph" aria-hidden="true">{{ GLYPH_FEATURED }}</span>
        {{ t('kyo-web.landing.projects.featured-label') }}
      </h3>
      <div class="now-projects-section__featured-grid">
        <component
          v-for="(card, idx) in featured_cards"
          :key="card.key"
          :is="card.has_link ? 'a' : 'div'"
          :href="card.has_link ? card.url : null"
          :target="card.has_link ? '_blank' : null"
          :rel="card.has_link ? 'noopener noreferrer' : null"
          class="now-projects-section__featured-item element-flare"
          :class="{ 'is-static': !card.has_link }"
          :style="{
            '--state-color': `var(--clr-${card.status_color}-100)`,
            '--element-flare-delay': `${idx * 0.4 + 1}s`,
          }">
          <header class="now-projects-section__featured-head">
            <span class="now-projects-section__status">
              <span class="state-square" aria-hidden="true" />
              {{ card.status_label }}
            </span>
            <span v-if="card.has_link" class="icon-glyph" aria-hidden="true">{{ GLYPH_LINK }}</span>
            <span v-else class="now-projects-section__featured-no-link">
              {{ t('kyo-web.landing.projects.no-link') }}
            </span>
          </header>
          <div class="now-projects-section__featured-name-block">
            <h4 class="now-projects-section__featured-name">{{ card.name }}</h4>
            <span v-if="card.version" class="now-projects-section__version">{{ card.version }}</span>
          </div>
        </component>
      </div>
    </section>
  </section>
</template>

<style lang="scss" scoped>
/* The .state-grid primitive lives in src/scss/abstracts/_theme.scss and
   is consumed here for the NOW SHIPPING status badges. It picks up the
   --state-color set on the parent card automatically.

   .state-square is project-local — only the FEATURED grid uses it. */
.state-square {
  display: inline-block;
  width: 8px;
  height: 8px;
  background: var(--state-color, var(--clr-primary-100));
  flex-shrink: 0;
  box-shadow: 0 0 6px color-mix(in srgb, var(--state-color, var(--clr-primary-100)) 60%, transparent);
}

.now-projects-section {
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

  &__cards {
    list-style: none;
    margin: 0 0 4rem;
    padding: 0;
    display: grid;
    grid-template-columns: 1fr;
    gap: 1.25rem;

    @include min-media-query(md) {
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 1.5rem;
    }
    @include min-media-query(lg) {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
  }

  &__card-wrap { display: contents; }

  &__card {
    position: relative;
    display: grid;
    grid-template-rows: auto auto auto auto auto;
    gap: 1rem;
    padding: 1.5rem;
    text-decoration: none;
    cursor: pointer;
    color: inherit;

    &.is-static {
      cursor: default;

      &:hover, &:focus-visible {
        transform: none;
      }
    }
    background:
      linear-gradient(
        135deg,
        color-mix(in srgb, var(--clr-primary-100) 6%, transparent) 0%,
        var(--clr-neutral-500) 60%
      );
    border: 1px solid var(--clr-primary-100);
    isolation: isolate;
    --element-flare-spread: 2px;
    --element-flare-color: var(--clr-primary-100);
    --element-flare-opacity: 0.12;
    transition: transform 0.25s ease, border-color 0.25s ease;

    &:hover, &:focus-visible {
      transform: translateY(-4px);
      outline: none;
    }

    &.is-ended {
      border-color: var(--clr-warning-100);
      --element-flare-color: var(--clr-warning-100);
    }
  }

  &__card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-family: "SpaceMono", monospace;
    font-size: var(--fs-200);
    letter-spacing: 0.12em;
  }

  &__status {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    color: var(--state-color, var(--clr-primary-100));
    font-weight: 700;
  }

  &__index-num {
    color: var(--clr-neutral-300);
  }

  &__name-block {
    display: flex;
    align-items: baseline;
    flex-wrap: wrap;
    gap: 0.5rem 0.75rem;
  }

  &__name {
    font-family: "Geomanist", sans-serif;
    font-size: var(--fs-500);
    color: var(--clr-neutral-50);
    margin: 0;
    letter-spacing: 0.02em;
    line-height: 1.1;
  }

  &__version {
    font-family: "SpaceMono", monospace;
    font-size: var(--fs-200);
    color: var(--clr-primary-100);
    letter-spacing: 0.08em;
    padding: 0.15rem 0.45rem;
    border: 1px solid var(--clr-primary-100);
    background: color-mix(in srgb, var(--clr-primary-100) 8%, transparent);
    line-height: 1;
  }

  &__milestone {
    font-family: "SpaceMono", monospace;
    font-size: var(--fs-200);
    color: var(--clr-neutral-300);
    letter-spacing: 0.08em;
    margin: 0;
  }

  &__countdown {
    border: 1px solid var(--clr-border-100);
    background: var(--clr-neutral-500);
    padding: 0.75rem;
    display: grid;
    gap: 0.5rem;
  }

  &__countdown-head {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 0.5rem 0.75rem;
  }

  &__countdown-label {
    font-family: "SpaceMono", monospace;
    font-size: var(--fs-200);
    letter-spacing: 0.12em;
    color: var(--clr-primary-100);
  }

  &__countdown-date {
    font-family: "SpaceMono", monospace;
    font-size: var(--fs-200);
    letter-spacing: 0.12em;
    color: var(--clr-primary-100);
  }

  &__countdown-tz {
    font-family: "SpaceMono", monospace;
    font-size: var(--fs-100);
    letter-spacing: 0.16em;
    color: var(--clr-neutral-300);
  }

  &__no-link {
    border-top: 1px dashed var(--clr-border-100);
    padding-top: 0.85rem;
    font-family: "SpaceMono", monospace;
    font-size: var(--fs-200);
    letter-spacing: 0.12em;
    color: var(--clr-neutral-300);
  }

  &__countdown-segments {
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem;
  }

  &__segment {
    font-family: "SpaceMono", monospace;
    font-size: var(--fs-300);
    font-weight: 700;
    padding: 0.4rem 0.6rem;
    background: color-mix(in srgb, var(--clr-primary-100) 10%, var(--clr-neutral-500));
    border: 1px solid var(--clr-primary-100);
    color: var(--clr-primary-100);
    letter-spacing: 0.04em;
    line-height: 1;
    min-width: 2.5rem;
    text-align: center;
  }

  &__ended-state {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.6rem 0.8rem;
    border: 1px solid var(--clr-warning-100);
    color: var(--clr-warning-100);
    font-family: "SpaceMono", monospace;
    font-size: var(--fs-200);
    letter-spacing: 0.12em;
    font-weight: 700;
    background: color-mix(in srgb, var(--clr-warning-100) 6%, transparent);
  }

  &__link {
    display: inline-flex;
    align-items: center;
    gap: 0.85rem;
    color: var(--clr-neutral-100);
    font-family: "SpaceMono", monospace;
    font-size: var(--fs-200);
    letter-spacing: 0.08em;
    border-top: 1px dashed var(--clr-border-100);
    padding-top: 0.85rem;
    transition: color 0.2s ease;
  }

  &__link-text {
    flex: 1;
  }

  &__link-external {
    --icon-glyph-size: 0.85em;
  }

  &__card:hover &__link,
  &__card:focus-visible &__link {
    color: var(--clr-primary-100);
  }

  &__featured {
    border-top: 1px solid var(--clr-border-100);
    padding-top: 2.5rem;
  }

  &__featured-label {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    font-family: "SpaceMono", monospace;
    font-size: var(--fs-300);
    color: var(--clr-primary-100);
    letter-spacing: 0.12em;
    margin: 0 0 1.5rem;
    text-transform: uppercase;
  }

  &__featured-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 0.75rem;

    @include min-media-query(md) {
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 1rem;
    }
  }

  &__featured-item {
    display: grid;
    gap: 0.75rem;
    padding: 1.25rem;
    background: var(--clr-neutral-500);
    border: 1px solid var(--clr-border-100);
    color: var(--clr-neutral-50);
    text-decoration: none;
    cursor: pointer;
    transition: border-color 0.2s ease, transform 0.2s ease;
    isolation: isolate;

    &.is-static {
      cursor: default;

      &:hover, &:focus-visible {
        transform: none;
        border-color: var(--clr-border-100);
      }
    }

    --element-flare-spread: 1px;
    --element-flare-color: var(--clr-border-50);
    --element-flare-opacity: 0.12;

    &:hover, &:focus-visible {
      border-color: var(--clr-primary-100);
      transform: translateY(-2px);
      outline: none;
      --element-flare-color: var(--clr-primary-100);
      --element-flare-opacity: 0.18;
    }
  }

  &__featured-item &__version {
    color: var(--state-color, var(--clr-primary-100));
    border-color: var(--state-color, var(--clr-primary-100));
    background: color-mix(in srgb, var(--state-color, var(--clr-primary-100)) 8%, transparent);
  }

  &__featured-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    color: var(--clr-neutral-300);
    font-family: "SpaceMono", monospace;
    font-size: var(--fs-100);
  }

  &__featured-no-link {
    font-size: var(--fs-100);
    letter-spacing: 0.14em;
    color: var(--clr-neutral-300);
  }

  &__featured-name-block {
    display: flex;
    align-items: baseline;
    flex-wrap: wrap;
    gap: 0.4rem 0.6rem;
  }

  &__featured-name {
    font-family: "Geomanist", sans-serif;
    font-size: var(--fs-400);
    margin: 0;
    letter-spacing: 0.04em;
    color: var(--clr-neutral-50);
  }
}
</style>
