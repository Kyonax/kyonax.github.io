<script setup>
/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 */

/*
 * Archive pagination. Every target is a real prerendered route, so these are
 * plain <a> links: a crawler follows them and a reader with no JavaScript
 * still reaches the whole archive.
 *
 * IT IS NUMBERED, not just prev/next. The previous version showed "Newer /
 * Page N / Older", which tells a reader neither how much archive there is nor
 * how to jump — and it rendered nothing at all on a single-page archive, which
 * read as a missing feature rather than an empty one. Numbers make the extent
 * of the archive visible and every page reachable in one hop.
 *
 * A SINGLE-PAGE ARCHIVE STILL RENDERS NOTHING, and that is deliberate: a "1"
 * with nothing either side of it is furniture, not navigation.
 *
 * "Newer" and "Older" rather than "Previous" and "Next" — the archive is
 * ordered newest-first, and directional words are ambiguous in that order.
 *
 * EVERY LINK LANDS ON THE LIST (#all-posts). A reader paging through the
 * archive wants the next rows, not page 1's hero again from the top. The
 * manifest's prev/next and page urls are bare routes — they are also the
 * canonicals — so the fragment is added here, at render, and nowhere else.
 * A crawler drops it; the URL it indexes is unchanged.
 */

import { LIST_HASH } from '@seo/archive-pages';
import { blogPagesFor } from '@seo/blog-routes';
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

const props = defineProps({
  page: { type: Object, required: true },
});

const { t } = useI18n();

const pages = computed(() => blogPagesFor(props.page.locale));

const listHref = (url) => `${url}${LIST_HASH}`;
</script>

<template>
  <nav
    v-if="pages.length > 1"
    class="blog-pagination"
    :aria-label="t('kyo-web.blog.pagination-aria')"
  >
    <a
      v-if="page.prev"
      class="blog-pagination__step"
      :href="listHref(page.prev)"
      rel="prev"
    >
      <span aria-hidden="true" data-text="‹" />
      {{ t('kyo-web.blog.pagination-prev') }}
    </a>
    <span v-else class="blog-pagination__step is-disabled" aria-hidden="true">
      <span data-text="‹" />
      {{ t('kyo-web.blog.pagination-prev') }}
    </span>

    <ol class="blog-pagination__numbers">
      <li v-for="p in pages" :key="p.url">
        <!-- The current page is not a link to itself. -->
        <span
          v-if="p.number === page.number"
          class="blog-pagination__num is-current"
          aria-current="page"
        >{{ p.number }}</span>
        <a
          v-else
          class="blog-pagination__num"
          :href="listHref(p.url)"
          :aria-label="`${t('kyo-web.blog.pagination-page')} ${p.number}`"
        >{{ p.number }}</a>
      </li>
    </ol>

    <a
      v-if="page.next"
      class="blog-pagination__step"
      :href="listHref(page.next)"
      rel="next"
    >
      {{ t('kyo-web.blog.pagination-next') }}
      <span aria-hidden="true" data-text="›" />
    </a>
    <span v-else class="blog-pagination__step is-disabled" aria-hidden="true">
      {{ t('kyo-web.blog.pagination-next') }}
      <span data-text="›" />
    </span>
  </nav>
</template>

<style lang="scss" scoped>
.blog-pagination {
  display: flex;
  gap: 1rem;
  align-items: center;
  justify-content: space-between;
  margin-top: 2.5rem;
  padding-top: 1.25rem;
  border-top: 1px solid var(--clr-border-100);
  font-family: "SpaceMono", monospace;
  font-size: var(--fs-200);
}

/* The disabled ends keep their width so the numbers stay centred on page 1 and
   on the last page instead of sliding across as you page through. */
.blog-pagination__step {
  display: inline-flex;
  gap: 0.4rem;
  align-items: center;
  text-decoration: none;
  color: var(--clr-neutral-50);

  &:hover,
  &:focus-visible { color: var(--clr-primary-100); }

  &.is-disabled {
    color: var(--clr-neutral-300);
    opacity: 0.4;
  }
}

.blog-pagination__numbers {
  display: flex;
  gap: 0.25rem;
  align-items: center;
  margin: 0;
  padding: 0;
  list-style: none;
}

.blog-pagination__num {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 2.2rem;
  height: 2.2rem;
  padding: 0 0.4rem;
  border: 1px solid transparent;
  text-decoration: none;
  color: var(--clr-neutral-200);

  &:hover,
  &:focus-visible {
    border-color: var(--clr-primary-100);
    color: var(--clr-primary-100);
  }

  /* The page you are on is the one mark that takes the accent standing still —
     it is state, not decoration. */
  &.is-current {
    border-color: var(--clr-primary-100);
    background-color: color-mix(in srgb, var(--clr-primary-100) 12%, transparent);
    color: var(--clr-primary-100);
  }
}
</style>
