<script setup>
/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 */

import useProjectCountdowns from '@composables/use-project-countdowns';
import { warmYoutube } from '@composables/use-youtube-warmup';
import { BRAND_ICON_IDS } from '@data/brand-icons';
import { TECH_BY_ID } from '@data/data';
import { DEFAULT_FEATURED_STATUS,DEFAULT_NOW_STATUS, NOW_STATUS_PRIORITY, PROJECT_STATUS, PROJECTS } from '@data/projects';
import { normaliseMediaEntry } from '@data/youtube';
import BrandIcon from '@ui/brand-icon.vue';
import UiHudDeco from '@ui/hud-deco.vue';
import UiImageViewer from '@ui/image-viewer.vue';
import UiModal from '@ui/modal.vue';
import UiSectionHeader from '@ui/section-header.vue';
import UiStateGrid from '@ui/state-grid.vue';
import YoutubeFacade from '@ui/youtube-facade.vue';
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

const { t, te, locale } = useI18n();

const NOW_MAX = 6;
const FEATURED_MAX = 9;


const _image_url_map = (() => {
  const modules = import.meta.glob(
    '@assets/projects/*.{jpg,jpeg,png,webp,avif}',
    { eager: true, query: '?url', import: 'default' },
  );
  const map = {};
  for (const [path, url] of Object.entries(modules)) {
    const file = path.split('/').pop();
    map[file] = url;
  }
  return map;
})();

const _resolve_image = (filename) => {
  const base = filename.replace(/\.[^.]+$/, '');
  const ext_match = filename.match(/\.([^.]+)$/);
  const ext = ext_match ? ext_match[1] : '';
  const fallback = _image_url_map[filename];
  if (!fallback) {
    return null;
  }
  return {
    name: base,
    ext,
    fallback,
    avif: _image_url_map[`${base}.avif`] || null,
    webp: _image_url_map[`${base}.webp`] || null,
  };
};

/* 1Hz tick for WORKING_ON count-up. SSR-safe init (no Date.now() at module
   load — would diverge between prerender and first client paint and trigger
   a hydration mismatch). Real value populated inside onMounted's _start_tick. */
const _now_ms = ref(0);
let _tick_id = null;

const _start_tick = () => {
  if (_tick_id) {
    return;
  }
  _now_ms.value = Date.now();
  _tick_id = setInterval(() => {
    _now_ms.value = Date.now(); 
  }, 1000);
};
const _stop_tick = () => {
  if (!_tick_id) {
    return;
  }
  clearInterval(_tick_id);
  _tick_id = null;
};
const _on_visibility = () => {
  if (document.hidden) {
    _stop_tick();
  } else {
    _start_tick();
  }
};

onMounted(() => {
  _start_tick();
  document.addEventListener('visibilitychange', _on_visibility);
});
onBeforeUnmount(() => {
  _stop_tick();
  document.removeEventListener('visibilitychange', _on_visibility);
});

const _format_elapsed_segments = (started_ms, now_ms) => {
  if (!Number.isFinite(started_ms)) {
    return [];
  }
  const diff_ms = Math.max(0, now_ms - started_ms);
  const sec = Math.floor(diff_ms / 1000) % 60;
  const min = Math.floor(diff_ms / 60000) % 60;
  const hr  = Math.floor(diff_ms / 3600000) % 24;
  const day = Math.min(999, Math.floor(diff_ms / 86400000));
  return [
    `${day}d`,
    `${String(hr).padStart(2, '0')}h`,
    `${String(min).padStart(2, '0')}m`,
    `${String(sec).padStart(2, '0')}s`,
  ];
};

const _DEADLINE_FMT_OPTS = {
  timeZone: 'America/Bogota',
  month:    'short',
  day:      'numeric',
  year:     'numeric',
  hour:     'numeric',
  minute:   '2-digit',
};
const _deadline_fmt = {
  en: new Intl.DateTimeFormat('en-US', _DEADLINE_FMT_OPTS),
  es: new Intl.DateTimeFormat('es-CO', _DEADLINE_FMT_OPTS),
};

const _parse_bogota = (s) => {
  if (!s) {
    return null;
  }
  const ms = Date.parse(`${s} GMT-0500`);
  if (!Number.isFinite(ms)) {
    if (import.meta.env.DEV) {
      console.warn(`[projects] unparseable timestamp: ${s}`);
    }
    return null;
  }
  return ms;
};

const _format_deadline_ms = (ms) => {
  if (ms === null || ms === undefined || !Number.isFinite(ms)) {
    return null;
  }
  const fmt = locale.value === 'es' ? _deadline_fmt.es : _deadline_fmt.en;
  return fmt.format(new Date(ms)).toUpperCase();
};

const _format_deadline = (deadline_str) =>
  _format_deadline_ms(_parse_bogota(deadline_str));

const _next_future_deadline = (project) => {
  if (!project.deadlines) {
    return null;
  }
  const now = Date.now();
  let best = null;
  for (const [label, ts] of Object.entries(project.deadlines)) {
    const ms = _parse_bogota(ts);
    if (ms === null || ms === undefined || ms <= now) {
      continue;
    }
    if (!best || ms < best.ms) {
      best = { label, ms };
    }
  }
  return best;
};

const GLYPH_REPO     = '\uF09B';
const GLYPH_LINK     = '\uF08E';
const GLYPH_ENDED    = '\uF058';
const GLYPH_FEATURED = '\uF005';
const GLYPH_PREV     = '\uF053';
const GLYPH_NEXT     = '\uF054';


// `featured` is additive — NOW eligibility is determined by status alone (NOW_STATUS_PRIORITY).
const now_keys = Object.keys(PROJECTS).filter(
  (k) => NOW_STATUS_PRIORITY[PROJECTS[k].status] !== undefined,
);
const countdowns = useProjectCountdowns(now_keys);

const _deadline_ms = (project) => {
  const next = _next_future_deadline(project);
  return next ? next.ms : Number.POSITIVE_INFINITY;
};

const _status_color = (status_id) =>
  PROJECT_STATUS[status_id]?.color || 'primary';
const _status_label_key = (status_id) =>
  PROJECT_STATUS[status_id]?.labelKey || 'kyo-web.landing.projects.status.in-progress';

const _media_cache = new Map();
const _resolve_media = (key, entries = []) => {
  const cache_key = `${key}:${locale.value}`;
  if (_media_cache.has(cache_key)) {
    return _media_cache.get(cache_key);
  }
  const items = entries
    .map((e) => normaliseMediaEntry(e, locale.value, _resolve_image))
    .filter(Boolean);
  _media_cache.set(cache_key, items);
  return items;
};

const _stack_cache = new Map();
const _resolve_stack = (key, ids = []) => {
  const cache_key = `${key}:${locale.value}`;
  if (_stack_cache.has(cache_key)) {
    return _stack_cache.get(cache_key);
  }
  const resolved = ids.map((id) => {
    const tech = TECH_BY_ID[id];
    return {
      id,
      name:  tech ? (tech.name[locale.value] || tech.name.en) : id,
      brand: BRAND_ICON_IDS.has(id) ? id : null,
    };
  });
  _stack_cache.set(cache_key, resolved);
  return resolved;
};

const _modal_description_key = (key) =>
  `kyo-web.content-data.projects.${key}.description`;

const _has_modal_description = (key) => te(_modal_description_key(key));

const buildNowCard = (key) => {
  const project = PROJECTS[key];
  const cd = countdowns[key];
  const ended = cd && !cd.countdown;
  const status_id = project.status || DEFAULT_NOW_STATUS;
  const next = _next_future_deadline(project);
  const deadline_ms = cd?.utc_ts ?? next?.ms ?? null;
  const started_str  = project.started || '';
  const started_ms   = _parse_bogota(started_str);
  const media_urls = _resolve_media(key, project.images);
  const stack      = _resolve_stack(key, project.stack);
  const has_link   = Boolean(project.url);
  const has_modal  = media_urls.length > 0 || _has_modal_description(key);
  return {
    key,
    name:        project.name,
    url:         project.url || '',
    has_link,
    has_modal,
    version:     project.version || project.modality || '',
    status_id,
    status_color: _status_color(status_id),
    status_label: t(_status_label_key(status_id)),
    label:       cd?.label || next?.label?.toUpperCase() || project.description || '',
    countdown:   cd?.countdown || null,
    deadline_text: _format_deadline_ms(deadline_ms),
    ended,
    is_working_on: status_id === 'WORKING_ON' && Number.isFinite(started_ms),
    started_ms,
    started_text: started_str ? _format_deadline(started_str) : null,
    media_urls,
    stack,
  };
};

/* Modal-opening logic lives on a child `.card-hit-area` button (stretched-link
   pattern) so the outer is never a `role="button"` with nested interactives. */
const _card_root_tag = (card) =>
  card.has_modal || !card.has_link ? 'div' : 'a';

const _card_root_attrs = (card) => {
  if (card.has_modal) {
    return {};
  }
  if (card.has_link)  {
    return { href: card.url, target: '_blank', rel: 'noopener noreferrer' };
  }
  return {};
};

const _card_root_class = (card) => ({
  'is-ended':  card.ended,
  'has-modal': card.has_modal,
  'is-static': !card.has_modal && !card.has_link,
});

const _card_hit_label = (card) =>
  `${card.name} — ${t('kyo-web.landing.projects.view-details')}`;

const buildFeaturedCard = (key) => {
  const project = PROJECTS[key];
  const status_id = project.status || DEFAULT_FEATURED_STATUS;
  const status_label = t(_status_label_key(status_id));
  const version = project.version || project.modality || '';
  /* Mirrors every visible text node inside the card so WCAG 2.5.3 passes:
     scanners traverse the DOM for visible text and would otherwise diverge
     from the accname computed across <header>/<h4>/.kyo-chip children. */
  const aria_label = [status_label, project.name, version].filter(Boolean).join(' ');
  return {
    key,
    name:        project.name,
    url:         project.url || '',
    has_link:    Boolean(project.url),
    version,
    status_id,
    status_color: _status_color(status_id),
    status_label,
    aria_label,
  };
};

const main_cards = computed(() => {
  return now_keys
    .map(buildNowCard)
    .sort((a, b) => {
      const pa = NOW_STATUS_PRIORITY[a.status_id] ?? 99;
      const pb = NOW_STATUS_PRIORITY[b.status_id] ?? 99;
      if (pa !== pb) {
        return pa - pb;
      }
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

const modal_cards = computed(() => main_cards.value.filter((c) => c.has_modal));

const segments = (countdown) => {
  if (!countdown) {
    return [];
  }
  return countdown.split('_').filter(Boolean);
};

const elapsed_segments = (started_ms) =>
  _format_elapsed_segments(started_ms, _now_ms.value);

const active_id = ref(null);
const image_viewer = ref(null);
const image_viewer_alt = ref('');

const open_image_viewer = (img, alt = '') => {
  image_viewer.value = img;
  image_viewer_alt.value = alt;
};
const close_image_viewer = () => {
  image_viewer.value = null;
  image_viewer_alt.value = '';
};
const carousel_idx = ref(0);

const open_modal = (key) => {
  active_id.value = key;
  carousel_idx.value = 0;
};

const close_modal = () => {
  active_id.value = null;
};

const carousel_prev = (total) => {
  carousel_idx.value = (carousel_idx.value - 1 + total) % total;
};
const carousel_next = (total) => {
  carousel_idx.value = (carousel_idx.value + 1) % total;
};
const carousel_goto = (idx) => {
  carousel_idx.value = idx;
};

const onModalKeydown = (event, total) => {
  if (!total || total < 2) {
    return;
  }
  if (event.key === 'ArrowLeft')  {
    event.preventDefault(); carousel_prev(total); 
  }
  if (event.key === 'ArrowRight') {
    event.preventDefault(); carousel_next(total); 
  }
};

const facade_refs = ref({});
const bind_facade_ref = (el, key, idx) => {
  if (!facade_refs.value[key]) {
    facade_refs.value[key] = [];
  }
  facade_refs.value[key][idx] = el;
};
const _pause_all_facades = (key) => {
  const list = facade_refs.value[key] || [];
  for (const f of list) {
    if (f && typeof f.pause === 'function') {
      f.pause();
    }
  }
};

watch(carousel_idx, () => {
  if (!active_id.value) {
    return;
  }
  _pause_all_facades(active_id.value);
});

watch(active_id, (next, prev) => {
  if (prev) {
    _pause_all_facades(prev);
  }
  if (next) {
    _warm_modal(next);
  }
});

const _modal_has_youtube = (key) => {
  const card = modal_cards.value.find((c) => c.key === key);
  if (!card) {
    return false;
  }
  return card.media_urls.some((m) => m.kind === 'youtube');
};

const _warm_modal = (key) => {
  if (!_modal_has_youtube(key)) {
    return;
  }
  warmYoutube(`modal:${key}`);
};
</script>

<template>
  <section
    id="projects"
    class="now-projects-section kyo-section"
    :aria-label="t('kyo-web.landing.projects.label')"
  >
    <UiHudDeco variant="tr" text="// PIPELINE :: OPEN" />
    <UiHudDeco variant="bl" text="// 未来" />
    <UiHudDeco variant="watermark" text="未来" class="now-projects-section__watermark" />
    <UiSectionHeader
      tag="// 04"
      :title="t('kyo-web.landing.projects.label')"
      :subtitle="t('kyo-web.landing.projects.subtitle')"
    />

    <ul class="now-projects-section__cards" role="list">
      <li
        v-for="(card, idx) in main_cards"
        :key="card.key"
        class="now-projects-section__card-wrap"
      >
        <component
          :is="_card_root_tag(card)"
          v-bind="_card_root_attrs(card)"
          class="now-projects-section__card element-flare"
          :class="_card_root_class(card)"
          :style="{
            '--state-color': `var(--clr-${card.status_color}-100)`,
            '--element-flare-delay': `${idx * 0.6}s`,
          }"
        >
          <button
            v-if="card.has_modal"
            type="button"
            class="now-projects-section__card-hit-area"
            :aria-label="_card_hit_label(card)"
            @click="open_modal(card.key)"
          />

          <header class="now-projects-section__card-header">
            <span class="now-projects-section__status">
              <UiStateGrid />
              {{ card.status_label }}
            </span>
            <span class="now-projects-section__index-num" :data-text="`#${String(idx + 1).padStart(2, '0')}`" aria-hidden="true" />
          </header>

          <div class="now-projects-section__name-block">
            <h3 class="now-projects-section__name">
              {{ card.name }}
            </h3>
            <span v-if="card.version" class="now-projects-section__version kyo-chip">{{ card.version }}</span>
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
                class="now-projects-section__segment"
              >{{ seg }}</span>
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
                class="now-projects-section__segment"
              >{{ seg }}</span>
            </div>
            <span class="now-projects-section__countdown-tz">
              {{ t('kyo-web.landing.projects.timezone-label') }}
            </span>
          </div>
          <div v-else-if="card.ended" class="now-projects-section__ended-state">
            <span class="icon-glyph" :data-text="GLYPH_ENDED" aria-hidden="true" />
            <span>{{ t('kyo-web.landing.projects.ended-state') }}</span>
          </div>

          <a
            v-if="card.has_modal && card.has_link"
            :href="card.url"
            target="_blank"
            rel="noopener noreferrer"
            class="now-projects-section__link is-corner"
            :aria-label="`${t('kyo-web.landing.projects.view-repo')} — ${card.name}`"
          >
            <span class="icon-glyph icon-glyph--lg" :data-text="GLYPH_REPO" aria-hidden="true" />
            <span class="now-projects-section__link-text">{{ t('kyo-web.landing.projects.view-repo') }}</span>
            <span class="icon-glyph now-projects-section__link-external" :data-text="GLYPH_LINK" aria-hidden="true" />
          </a>
          <span v-else-if="!card.has_modal && card.has_link" class="now-projects-section__link">
            <span class="icon-glyph icon-glyph--lg" :data-text="GLYPH_REPO" aria-hidden="true" />
            <span class="now-projects-section__link-text">{{ t('kyo-web.landing.projects.view-repo') }}</span>
            <span class="icon-glyph now-projects-section__link-external" :data-text="GLYPH_LINK" aria-hidden="true" />
          </span>
          <span v-else class="now-projects-section__no-link">
            {{ t('kyo-web.landing.projects.no-link') }}
          </span>
        </component>
      </li>
    </ul>

    <section class="now-projects-section__featured" aria-labelledby="now-projects-featured-label">
      <h3 id="now-projects-featured-label" class="now-projects-section__featured-label">
        <span class="icon-glyph" :data-text="GLYPH_FEATURED" aria-hidden="true" />
        {{ t('kyo-web.landing.projects.featured-label') }}
      </h3>
      <div class="now-projects-section__featured-grid">
        <div
          v-for="(card, idx) in featured_cards"
          :key="card.key"
          class="now-projects-section__featured-item element-flare"
          :class="{ 'is-static': !card.has_link }"
          :style="{
            '--state-color': `var(--clr-${card.status_color}-100)`,
            '--element-flare-delay': `${idx * 0.4 + 1}s`,
          }"
        >
          <div class="now-projects-section__featured-head">
            <span class="now-projects-section__status">
              <span class="state-square" aria-hidden="true" />
              {{ card.status_label }}
            </span>
            <span v-if="!card.has_link" class="now-projects-section__featured-no-link">
              {{ t('kyo-web.landing.projects.no-link') }}
            </span>
          </div>
          <div class="now-projects-section__featured-name-block">
            <span class="now-projects-section__featured-name">{{ card.name }}</span>
            <span v-if="card.version" class="now-projects-section__featured-version">{{ card.version }}</span>
          </div>
          <a
            v-if="card.has_link"
            :href="card.url"
            target="_blank"
            rel="noopener noreferrer"
            :aria-label="card.aria_label"
            class="now-projects-section__featured-hit"
          />
        </div>
      </div>
    </section>

    <UiModal
      v-for="card in modal_cards"
      :key="`modal-${card.key}`"
      :is-open="active_id === card.key"
      :title="card.name"
      :subtitle="card.version ? `// ${card.version}` : ''"
      :close-label="t('kyo-web.landing.modal.close')"
      size="lg"
      @close="close_modal"
      @keydown="onModalKeydown($event, card.media_urls.length)"
    >
      <div class="project-modal">
        <div
          v-if="card.media_urls.length"
          class="project-modal__carousel"
          :style="{ '--state-color': `var(--clr-${card.status_color}-100)` }"
        >
          <div class="project-modal__carousel-frame">
            <template v-for="(media, i) in card.media_urls" :key="`${card.key}-${i}`">
              <YoutubeFacade
                v-if="media.kind === 'youtube'"
                :ref="(el) => bind_facade_ref(el, card.key, i)"
                class="project-modal__carousel-image"
                :class="{ 'is-active': carousel_idx === i }"
                :video-id="media.id"
                :title="media.title"
                :poster="media"
                :channel="media.channel"
                :show-channel="media.showChannel"
              />
              <button
                v-else
                type="button"
                class="project-modal__carousel-image project-modal__carousel-image--btn"
                :class="{ 'is-active': carousel_idx === i }"
                :tabindex="carousel_idx === i ? 0 : -1"
                :aria-label="`${card.name} — ${t('kyo-web.landing.projects.preview-alt')} ${i + 1}`"
                @click="open_image_viewer(media, `${card.name} — ${t('kyo-web.landing.projects.preview-alt')} ${i + 1}`)"
              >
                <picture class="project-modal__carousel-picture">
                  <source v-if="media.avif" :srcset="media.avif" type="image/avif" />
                  <source v-if="media.webp" :srcset="media.webp" type="image/webp" />
                  <img
                    :src="media.fallback"
                    :alt="`${card.name} — ${t('kyo-web.landing.projects.preview-alt')} ${i + 1}`"
                    loading="lazy"
                    decoding="async"
                  />
                </picture>
              </button>
            </template>
            <span class="project-modal__carousel-counter">
              {{ String(carousel_idx + 1).padStart(2, '0') }}
              /
              {{ String(card.media_urls.length).padStart(2, '0') }}
            </span>
          </div>
          <div v-if="card.media_urls.length > 1" class="project-modal__carousel-controls">
            <button
              type="button"
              class="project-modal__carousel-nav"
              :aria-label="t('kyo-web.landing.projects.previous-image')"
              @click="carousel_prev(card.media_urls.length)"
            >
              <span class="icon-glyph icon-glyph--lg" :data-text="GLYPH_PREV" aria-hidden="true" />
            </button>
            <div
              class="project-modal__carousel-dots"
              role="group"
              :aria-label="t('kyo-web.landing.projects.previews-label')"
            >
              <button
                v-for="(url, i) in card.media_urls"
                :key="`dot-${i}`"
                type="button"
                class="project-modal__carousel-dot"
                :class="{ 'is-active': carousel_idx === i }"
                :aria-current="carousel_idx === i ? 'true' : undefined"
                :aria-label="`${t('kyo-web.landing.projects.previews-label')} ${i + 1}`"
                @click="carousel_goto(i)"
              />
            </div>
            <button
              type="button"
              class="project-modal__carousel-nav"
              :aria-label="t('kyo-web.landing.projects.next-image')"
              @click="carousel_next(card.media_urls.length)"
            >
              <span class="icon-glyph icon-glyph--lg" :data-text="GLYPH_NEXT" aria-hidden="true" />
            </button>
          </div>
        </div>

        <h2 class="project-modal__section-title">
          {{ t('kyo-web.landing.projects.description-label') }}
        </h2>
        <p
          class="project-modal__description kyo-prose"
          v-html="t(`kyo-web.content-data.projects.${card.key}.description`)"
        />

        <h2 v-if="card.stack.length" class="project-modal__section-title">
          {{ t('kyo-web.landing.projects.stack-label') }}
        </h2>
        <ul v-if="card.stack.length" class="project-modal__stack" role="list">
          <li
            v-for="tech in card.stack"
            :key="tech.id"
            class="project-modal__stack-item"
          >
            <BrandIcon
              v-if="tech.brand"
              class="project-modal__stack-icon brand-icon--lg"
              :name="tech.brand"
            />
            <span v-else class="project-modal__stack-abbr">
              {{ tech.id.slice(0, 2).toUpperCase() }}
            </span>
            <span class="project-modal__stack-name">{{ tech.name }}</span>
          </li>
        </ul>

        <a
          v-if="card.has_link"
          :href="card.url"
          target="_blank"
          rel="noopener noreferrer"
          class="project-modal__repo-cta"
        >
          <span class="icon-glyph icon-glyph--lg" :data-text="GLYPH_REPO" aria-hidden="true" />
          <span>{{ t('kyo-web.landing.projects.view-repo') }}</span>
          <span class="icon-glyph project-modal__repo-cta-external" :data-text="GLYPH_LINK" aria-hidden="true" />
        </a>
      </div>
    </UiModal>

    <UiImageViewer
      :is-open="image_viewer !== null"
      :close-label="t('kyo-web.landing.modal.close')"
      :picture="image_viewer"
      :alt="image_viewer_alt"
      @close="close_image_viewer"
    />
  </section>
</template>

<style lang="scss" scoped>
.state-square {
  display: inline-block;
  width: 8px;
  height: 8px;
  background: var(--state-color, var(--clr-primary-100));
  flex-shrink: 0;
  box-shadow: 0 0 6px color-mix(in srgb, var(--state-color, var(--clr-primary-100)) 60%, transparent);
}

.now-projects-section {
  &__watermark {
    top: 2rem;
    right: -1.5rem;

    @include min-media-query(md) {
      top: 3rem;
      right: 2rem;
    }
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
    grid-template-rows: auto auto auto auto auto auto;
    gap: 1rem;
    padding: 1.5rem;
    text-decoration: none;
    cursor: pointer;
    color: inherit;
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
    --element-flare-opacity: 0.03;
    transition: transform 0.25s ease, border-color 0.25s ease;

    &.is-static {
      cursor: default;

      &:hover, &:focus-visible { transform: none; }
    }

    &:hover, &:focus-visible {
      transform: translateY(-4px);
      --element-flare-opacity: 0.09;
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
    font-size: var(--fs-200);
    padding: 0.15rem 0.45rem;
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

  /* Absolute overlay so the entire card is one accessible button; siblings
     like `.is-corner` use a higher z-index to keep their own click capture. */
  &__card-hit-area {
    position: absolute;
    inset: 0;
    z-index: 1;
    background: transparent;
    border: 0;
    padding: 0;
    margin: 0;
    cursor: pointer;
    font: inherit;
    color: inherit;

    &:focus-visible {
      outline: 2px solid var(--clr-primary-100);
      outline-offset: 2px;
    }
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

    &.is-corner {
      text-decoration: none;
      cursor: pointer;
      position: relative;
      z-index: 2;

      &:hover, &:focus-visible {
        color: var(--clr-primary-100);
      }
    }
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
    position: relative;
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
    --element-flare-spread: 1px;
    --element-flare-color: var(--clr-border-50);
    --element-flare-opacity: 0.03;

    &.is-static {
      cursor: default;

      &:hover, &:focus-visible {
        transform: none;
        border-color: var(--clr-border-100);
      }
    }

    &:hover, &:focus-visible {
      border-color: var(--clr-primary-100);
      transform: translateY(-2px);
      --element-flare-color: var(--clr-primary-100);
      --element-flare-opacity: 0.09;
    }
  }

  &__featured-version {
    font-family: "SpaceMono", monospace;
    font-size: var(--fs-200);
    color: var(--state-color, var(--clr-primary-100));
  }

  /* Stretched-link pattern: empty anchor overlays the whole featured card so
     it stays the click target / focus target / hover affordance, while the
     visible text lives in sibling block elements. An empty link has no
     innerText, so WCAG 2.5.3 passes trivially (aria-label is the accname). */
  &__featured-hit {
    position: absolute;
    inset: 0;
    z-index: 1;
    text-decoration: none;

    &:focus-visible {
      outline: 2px solid var(--clr-primary-100);
      outline-offset: 2px;
    }
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

.project-modal {
  font-family: "Geomanist", sans-serif;
  color: var(--clr-neutral-200);
  display: grid;
  gap: 1.5rem;

  &__carousel {
    display: grid;
    gap: 0.75rem;
  }

  &__carousel-frame {
    position: relative;
    aspect-ratio: 16 / 9;
    border: 1px solid var(--clr-primary-100);
    background: var(--clr-neutral-500);
    overflow: hidden;
    isolation: isolate;
    display: block;
    width: 100%;
    --element-flare-color: var(--clr-primary-100);
  }

  &__carousel-image {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    display: block;
    opacity: 0;
    transition: opacity 0.35s ease;
    pointer-events: none;

    &.is-active {
      opacity: 1;
      pointer-events: auto;
    }

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }

    &--btn {
      padding: 0;
      margin: 0;
      border: 0;
      background: transparent;
      color: inherit;
      font: inherit;
      cursor: zoom-in;

      &:focus-visible {
        outline: 2px solid var(--clr-primary-100);
        outline-offset: -2px;
      }
    }
  }

  &__carousel-picture {
    display: block;
    width: 100%;
    height: 100%;
  }

  &__carousel-counter {
    position: absolute;
    bottom: 0.75rem;
    right: 0.75rem;
    z-index: 3;
    font-family: "SpaceMono", monospace;
    font-size: var(--fs-100);
    letter-spacing: 0.16em;
    color: var(--clr-primary-100);
    padding: 0.25rem 0.6rem;
    background: color-mix(in srgb, var(--clr-neutral-500) 75%, transparent);
    border: 1px solid var(--clr-primary-100);
  }

  &__carousel-controls {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
  }

  &__carousel-nav {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 2.5rem;
    height: 2.5rem;
    background: var(--clr-neutral-500);
    border: 1px solid var(--clr-primary-100);
    color: var(--clr-primary-100);
    cursor: pointer;
    transition: transform 0.2s ease, background 0.2s ease;

    &:hover, &:focus-visible {
      background: color-mix(in srgb, var(--clr-primary-100) 12%, var(--clr-neutral-500));
      transform: translateY(-2px);
    }
  }

  &__carousel-dots {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    flex: 1;
    justify-content: center;
  }

  &__carousel-dot {
    width: 0.6rem;
    height: 0.6rem;
    padding: 0;
    border: 1px solid var(--clr-primary-100);
    background: transparent;
    cursor: pointer;
    transition: background 0.2s ease, transform 0.2s ease;

    &.is-active {
      background: var(--clr-primary-100);
      transform: scale(1.15);
    }

    &:hover, &:focus-visible {
      background: color-mix(in srgb, var(--clr-primary-100) 40%, transparent);
    }
  }

  &__section-title {
    font-family: "SpaceMono", monospace;
    font-size: var(--fs-200);
    color: var(--clr-primary-100);
    letter-spacing: 0.16em;
    text-transform: uppercase;
    margin: 0;
    padding: 0.5rem 0.75rem;
    border-left: 2px solid var(--clr-primary-100);
    background: color-mix(in srgb, var(--clr-primary-100) 4%, transparent);
  }

  &__description {
    font-size: var(--fs-400);
    margin: 0;
  }

  &__stack {
    list-style: none;
    margin: 0;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
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

  &__repo-cta {
    display: inline-flex;
    align-items: center;
    gap: 0.85rem;
    align-self: start;
    margin-top: 0.5rem;
    padding: 0.75rem 1.1rem;
    border: 1px solid var(--clr-primary-100);
    background: color-mix(in srgb, var(--clr-primary-100) 6%, transparent);
    color: var(--clr-primary-100);
    text-decoration: none;
    font-family: "SpaceMono", monospace;
    font-size: var(--fs-200);
    letter-spacing: 0.12em;
    text-transform: uppercase;
    transition: background 0.2s ease, transform 0.2s ease;

    &:hover, &:focus-visible {
      background: color-mix(in srgb, var(--clr-primary-100) 14%, transparent);
      transform: translateY(-2px);
    }
  }

  &__repo-cta-external {
    --icon-glyph-size: 0.85em;
  }
}

</style>
