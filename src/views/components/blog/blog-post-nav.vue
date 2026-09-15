<script setup>
/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 */

/*
 * Previous / next / related links under an article.
 *
 * All three come straight from relations.json. INSIDE a series prev and next
 * walk the SERIES rather than the timeline — org2html decides that, so this
 * component never has to know which case it is in.
 *
 * `related` is scored by the engine (shared tag x3, keyword x2, category x1)
 * and excludes series members, since the series block already lists them.
 */

import { useI18n } from 'vue-i18n';

defineProps({
  relations: { type: Object, required: true },
});

const { t } = useI18n();
</script>

<template>
  <div class="blog-post-nav">
    <section v-if="relations.related && relations.related.length" class="blog-post-nav__related">
      <h2 class="blog-post-nav__heading">
        {{ t('kyo-web.blog.related') }}
      </h2>
      <ul class="blog-post-nav__list">
        <li v-for="item in relations.related" :key="item.url">
          <a :href="item.url">
            <!-- The RAW ISO date, not a localised one: these stack into a
                 column, and a column only reads as one if every entry is the
                 same width. `2026-07-17` is also what the engine already
                 ships, so nothing has to be formatted or looked up. -->
            <time v-if="item.date" class="blog-post-nav__date" :datetime="item.date">
              {{ item.date }}
            </time>
            <span v-if="item.date" class="blog-post-nav__sep" aria-hidden="true">:</span>
            <span class="blog-post-nav__item-title">{{ item.title }}</span>
          </a>
        </li>
      </ul>
    </section>

    <nav
      v-if="relations.prev || relations.next"
      class="blog-post-nav__pager"
      :aria-label="t('kyo-web.blog.all-posts')"
    >
      <a v-if="relations.prev" class="blog-post-nav__link" :href="relations.prev.url">
        <span class="blog-post-nav__dir">{{ t('kyo-web.blog.prev-post') }}</span>
        <span class="blog-post-nav__title">{{ relations.prev.title }}</span>
      </a>
      <a
        v-if="relations.next"
        class="blog-post-nav__link blog-post-nav__link--next"
        :href="relations.next.url"
      >
        <span class="blog-post-nav__dir">{{ t('kyo-web.blog.next-post') }}</span>
        <span class="blog-post-nav__title">{{ relations.next.title }}</span>
      </a>
    </nav>
  </div>
</template>

<style lang="scss" scoped>
/*
 * Same law as blog-series: HOST chrome dressed in the ENGINE's tokens, because
 * it renders inside the article against blocks the Style Book drew.
 *
 * It was two 6px-rounded boxes. The book is hairlines-only and no-radius, so a
 * rounded card at the foot of an article announced itself as belonging to a
 * different design. Every `--o2h-*` below falls back to the site's matching
 * token, so a missing book degrades to site styling rather than to nothing.
 */
.blog-post-nav {
  margin-top: var(--o2h-space-5, 3rem);
  padding-top: var(--o2h-space-3, 1.5rem);
  border-top: var(--o2h-border, 1px solid var(--clr-border-100));
}

/* THE THREE CLOSING BLOCKS NEED AIR BETWEEN THEM, NOT JUST AROUND THEM.
   Measured before this: 0px between the related list and the pager, so the two
   ran together as one undifferentiated slab. The pager is the last, narrowest
   step out of the article and reads as its own thing. */
.blog-post-nav__pager {
  margin-top: var(--o2h-space-5, 3rem);
  display: grid;
  gap: 1px;

  @include min-media-query(sm) {
    grid-template-columns: 1fr 1fr;
  }
}

/*
 * A hairline pair, not two cards. The 1px grid gap plus a full outline on each
 * cell gives the shared rule between them the same weight as every other rule
 * on the page — which is what the book's hairline ladder asks for.
 */
.blog-post-nav__link {
  display: grid;
  gap: 0.35rem;
  padding: var(--o2h-space-3, 1rem);
  outline: var(--o2h-border, 1px solid var(--clr-border-100));
  outline-offset: 0;
  border-radius: var(--o2h-radius, 0);
  text-decoration: none;
  color: var(--o2h-fg, var(--clr-neutral-50));
  transition: background-color 0.15s ease, color 0.15s ease;

  &:hover,
  &:focus-visible {
    background: var(--o2h-card, var(--clr-neutral-400));
    color: var(--o2h-accent, var(--clr-primary-100));
  }

  &--next { text-align: right; }
}

.blog-post-nav__dir {
  color: var(--o2h-mute, var(--clr-neutral-200));
  font-family: var(--o2h-font-mono, "SpaceMono", monospace);
  font-size: var(--o2h-label-size, var(--fs-100));
  text-transform: var(--o2h-label-transform, uppercase);
  letter-spacing: var(--o2h-label-track, 0.12em);
}

.blog-post-nav__title {
  font-family: var(--o2h-font-editorial, "Geomanist", sans-serif);
  font-size: var(--o2h-fs-body, var(--fs-300));
  color: inherit;
}

.blog-post-nav__heading {
  /* No top margin: `.blog-post-nav` already opens with a rule and 24px of
     padding, and adding 32px on top of that pushed the label into the middle
     of a band instead of labelling what follows it. */
  margin: 0 0 var(--o2h-space-2, 0.75rem);
  color: var(--o2h-mute, var(--clr-neutral-200));
  font-family: var(--o2h-font-mono, "SpaceMono", monospace);
  font-size: var(--o2h-label-size, var(--fs-100));
  font-weight: 400;
  text-transform: var(--o2h-label-transform, uppercase);
  letter-spacing: var(--o2h-label-track, 0.12em);
}

/*
 * RELATED READING IS A LIST OF LINKS, AND IT HAS TO LOOK LIKE ONE.
 *
 * It used to be ink-coloured text with no decoration, no marker and no row —
 * indistinguishable from a paragraph, so nothing said these were things you
 * could click. They are rows now, in the archive's own idiom: a hairline
 * between entries and a hover LIFT rather than a slab.
 *
 * THE DATE IS THE MARKER, NOT A CHEVRON. A leading `›` on every row was
 * decoration that said the same thing three times over and read as clutter at
 * the owner's call. The date earns its place instead — it tells you whether a
 * related piece is newer or older than the one you just read, which is the
 * question a reader actually has. It is a fixed-width monospace cell so the
 * dates line up as a column.
 *
 * THE TEXT SITS ON THE COLUMN EDGE; ONLY THE HOVER FILL HANGS PAST IT.
 *
 * The rows used to be inset by a 1.25rem padding, which is what gave the hover
 * lift room to breathe — and it put every date 15px in from the "Related
 * reading" label and the article text above it, at every width. The owner read
 * that as the dates not lining up with the rest of the text, which is what it
 * was. So the row has no inline padding at all now, and the lift is painted
 * past the box by two offset `box-shadow`s the same colour as the fill.
 *
 * NOT A NEGATIVE MARGIN, and that is the point. A shadow is INK overflow: it
 * takes no layout space and never counts toward scroll width, so it cannot
 * cancel the page gutter or make a phone scroll sideways the way the old
 * `margin: 0 -1.25rem` did (text at 0px from the viewport below 1440). Outer
 * shadows are clipped to outside the border box, so the two strips meet the
 * fill edge to edge with no double-tinted seam.
 */
.blog-post-nav__list {
  --blog-post-nav-lift: color-mix(in srgb, var(--clr-neutral-100) 3%, transparent);

  margin: 0;
  padding: 0;
  list-style: none;

  li + li { border-top: 1px solid var(--clr-border-100); }

  a {
    display: flex;
    gap: 0.6rem;
    align-items: baseline;
    padding: 0.9rem 0;
    color: var(--o2h-ink, var(--clr-neutral-100));
    text-decoration: none;
    transition: background-color 0.15s ease, box-shadow 0.15s ease, color 0.15s ease;

    &:hover,
    &:focus-visible {
      background-color: var(--blog-post-nav-lift);
      box-shadow:
        -1.25rem 0 0 var(--blog-post-nav-lift),
        1.25rem 0 0 var(--blog-post-nav-lift);
      color: var(--o2h-accent, var(--clr-primary-100));

      .blog-post-nav__date { color: var(--o2h-accent, var(--clr-primary-100)); }
    }
  }
}

/* `flex: 0 0 auto` and a tabular face, so ten rows of dates form a true
   column instead of a ragged edge that shifts with the digits.

   A DATE IS CONTENT, the archive's rule: it sat at `--fs-100`, the smallest step
   in the scale (10.5px against an 18px title), and read as a footnote to the
   link rather than part of it. One token under the title now — the same gap the
   archive keeps between its row titles and their dates — and on the title's
   baseline, so the two read as one line. */
.blog-post-nav__date {
  flex: 0 0 auto;
  color: var(--o2h-mute, var(--clr-neutral-200));
  font-family: "SpaceMono", monospace;
  font-size: var(--fs-300);
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.02em;
  transition: color 0.15s ease;
}

/* Decoration between two pieces of real content, so it is hidden from the
   screen reader and muted for everyone else. */
.blog-post-nav__sep {
  flex: 0 0 auto;
  color: var(--o2h-mute, var(--clr-neutral-300));
}

.blog-post-nav__item-title { min-width: 0; }
</style>
