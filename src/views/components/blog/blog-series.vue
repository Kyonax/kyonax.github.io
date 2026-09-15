<script setup>
/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 */

/*
 * The series a post belongs to, listed in reading order.
 *
 * The ORDER is the engine's, not ours: org2html sorts by #+SERIES_INDEX and
 * falls back to date ascending, because a series reads forward while the rest
 * of a blog reads newest-first. It also switches the post's prev/next to walk
 * the series instead of the timeline, so this block and the footer navigation
 * always agree.
 */

import { useI18n } from 'vue-i18n';

defineProps({
  /* relations.json's `series`: { name, position, total, items[] } */
  series: { type: Object, required: true },
});

const { t } = useI18n();
</script>

<template>
  <nav class="blog-series" :aria-label="series.name">
    <p class="blog-series__head">
      <span class="blog-series__label">{{ t('kyo-web.blog.series-label') }}</span>
      <span class="blog-series__name">{{ series.name }}</span>
      <span class="blog-series__count">
        {{ t('kyo-web.blog.series-position') }} {{ series.position }}/{{ series.total }}
      </span>
    </p>
    <ol class="blog-series__list">
      <li
        v-for="item in series.items"
        :key="item.url"
        class="blog-series__item"
        :class="{ 'is-current': item.current }"
      >
        <span class="blog-series__n">{{ item.position }}</span>
        <a v-if="!item.current" :href="item.url">{{ item.title }}</a>
        <span v-else aria-current="true">{{ item.title }}</span>
      </li>
    </ol>
  </nav>
</template>

<style lang="scss" scoped>
/*
 * DRESSED IN THE ENGINE'S OWN TOKENS, not the site's.
 *
 * The series panel is HOST chrome — relations ship as DATA [P-00], so the
 * engine writes relations.json and this component renders the navigation. But
 * it sits inside the article, directly against blocks the Style Book drew, so
 * it has to be one of them. It was a 6px-rounded grey box with unstyled links
 * that fell through to the browser's default violet: the loudest thing on the
 * page, and in a vocabulary the book does not use anywhere.
 *
 * It now mirrors the book's `.org-toc` exactly — the construct it is closest
 * to — reading `--o2h-*` directly. Those resolve on `:root` from the sheet
 * blog-post.vue links, so the panel tracks any book or token change for free
 * instead of drifting the way the hand-rolled copy did.
 *
 * NO RADIUS. The book sets `--o2h-radius: 0` because its foundation is
 * hairlines-only, no-radius, no-gradient. Every fallback below is the site's
 * matching token, so a missing book degrades to site styling rather than to
 * nothing.
 */
.blog-series {
  /* The closing blocks all sit on the article's own 48px rhythm. At 24px this
     read as part of the last paragraph rather than as the next thing. */
  margin-block: var(--o2h-space-5, 3rem) var(--o2h-space-3, 1.5rem);
  padding: var(--o2h-space-3, 1.25rem) var(--o2h-space-4, 1.5rem);
  border: var(--o2h-border, 1px solid var(--clr-border-100));
  border-radius: var(--o2h-radius, 0);
  background: var(--o2h-card, var(--clr-neutral-400));
}

.blog-series__head {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: baseline;
  margin: 0 0 var(--o2h-space-2, 0.75rem);
  font-family: var(--o2h-font-mono, "SpaceMono", monospace);
  font-size: var(--o2h-label-size, var(--fs-100));
  letter-spacing: var(--o2h-label-track, 0.12em);
}

.blog-series__label {
  color: var(--o2h-mute, var(--clr-neutral-200));
  text-transform: var(--o2h-label-transform, uppercase);
}

.blog-series__name { color: var(--o2h-accent, var(--clr-primary-100)); }

.blog-series__count {
  margin-left: auto;
  color: var(--o2h-mute, var(--clr-neutral-200));
}

.blog-series__list {
  display: grid;
  gap: var(--o2h-space-1, 0.5rem);
  margin: 0;
  padding: 0;
  list-style: none;
}

.blog-series__item {
  display: flex;
  gap: 0.6rem;
  align-items: baseline;
  font-size: var(--o2h-fs-caption, var(--fs-200));
  color: var(--o2h-fg, var(--clr-neutral-50));

  /* The entry you are reading is the one mark that holds the accent standing
     still — it encodes state, it is not decoration. */
  &.is-current { color: var(--o2h-accent, var(--clr-primary-100)); }
}

/* The book's own link treatment: ink, no underline, accent on hover. Unstyled,
   these inherited the user-agent's violet visited colour. */
.blog-series__item a {
  color: var(--o2h-ink, var(--clr-neutral-100));
  text-decoration: none;
  transition: color 0.15s ease;

  &:hover,
  &:focus-visible { color: var(--o2h-accent, var(--clr-primary-100)); }
}

.blog-series__n {
  flex: 0 0 auto;
  color: var(--o2h-mute, var(--clr-neutral-300));
  font-family: var(--o2h-font-mono, "SpaceMono", monospace);
}
</style>
