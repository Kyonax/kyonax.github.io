<script setup>
/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 */

/*
 * The blog archive's hero: the page title and its subtitle on the left, a
 * panel on the right carrying the ASCII galaxy and a chip that states what the
 * build parsed. It replaces the archive's old masthead, and the validated
 * design (docs/plans/blog-landing-design/) is its spec.
 *
 * NO EYEBROW, NO BUTTONS, NO ACCENT. The hero is monochrome end to end — the
 * yellow is the site's STATE colour, and nothing here is a state. It reads the
 * masthead's own two keys, so the <h1> is the same sentence it always was.
 *
 * ONE HAIRLINE SPLITS THE COLUMNS, and only where there are columns. On a
 * phone the panel moves above the title and nothing separates them: a rule
 * between a picture and the words under it would read as the end of a section.
 *
 * THE CHIP STATES MEASURED NUMBERS OR NOTHING. They come from the manifest's
 * corpus block; with no corpus the chip does not render — it never shows a
 * placeholder figure. Numbers go through Intl in the page's locale, which gives
 * the same string in Node and in the browser, so the prerender hydrates as is.
 *
 * THE GALAXY IS ITS OWN CHUNK (defineAsyncComponent). vite-ssg awaits it at
 * build time, so frame 0 is in the HTML; the frame maths and the loop load
 * beside the archive instead of inside it. The slot lets a caller swap the
 * picture; nothing does today.
 *
 * COMPACT ON PAGE 2 AND LATER: the same <h1> and nothing beside it — no
 * subtitle, no chip, no galaxy. A later page is a list, and the reader came
 * for its rows. Because the panel is not RENDERED, the galaxy's chunk is
 * neither preloaded nor fetched there: vite-ssg preloads the modules a render
 * actually touched. `pageLabel` ("Page 2 of 3") sits under the title as its
 * own line, never inside it, so every page has one <h1> and it is the same.
 */

import { ROUTE_BY_LOCALE } from '@seo/routes';
import { computed, defineAsyncComponent } from 'vue';
import { useI18n } from 'vue-i18n';

const AsciiGalaxy = defineAsyncComponent(() => {
  return import('@views/components/blog/ascii-galaxy.vue');
});

const props = defineProps({
  /* The manifest's corpus block: { files, bytes, lines, headings, words,
     minutes, byLocale, engine, builtAt }. The hero reads files and bytes. */
  corpus: { type: Object, default: null },
  /* Page 2 and later: the title alone, in one column. */
  compact: { type: Boolean, default: false },
  /* Where the reader is in the archive, already translated; '' on page 1. */
  pageLabel: { type: String, default: '' },
});

const { t, locale } = useI18n();

const BYTES_PER_KB = 1024;
/* The chip is two tones: what was parsed, bright; how much, muted. The copy
   keeps both halves in one sentence per locale, so the split is found here. */
const CHIP_SEPARATOR = ' · ';

const chip = computed(() => {
  const corpus = props.corpus;
  if (!corpus || !Number.isFinite(corpus.files)
    || !Number.isFinite(corpus.bytes)) {
    return null;
  }
  const number = new Intl.NumberFormat(locale.value === 'es' ? 'es-CO' : 'en-US');
  const text = t('kyo-web.blog.hero.chip', {
    files: number.format(corpus.files),
    kb: number.format(Math.round(corpus.bytes / BYTES_PER_KB)),
  });
  const cut = text.indexOf(CHIP_SEPARATOR);
  if (cut < 0) {
    return { lead: text, rest: '' };
  }
  /* The muted half keeps its leading space: flex drops it on screen, and
     the chip's text still reads as one sentence to anything that reads it. */
  return { lead: text.slice(0, cut), rest: text.slice(cut) };
});

/*
 * THE NAME IS THE WAY HOME. The owner, reviewing the blog home: the author's
 * name in the subtitle takes the reader to the landing, a backlink from the
 * blog to the site's hiring page. The subtitle stays the meta description
 * word for word (one source of text, both locales); the name is found in it
 * and becomes a link, and if a translation ever drops the name the sentence
 * simply renders without one.
 */
const OWNER_NAME = 'Cristian D. Moreno';
const home_href = computed(() => {
  return ROUTE_BY_LOCALE[locale.value] || ROUTE_BY_LOCALE.en;
});
const subtitle_parts = computed(() => {
  const text = t('kyo-web.blog.meta.description');
  const at = text.indexOf(OWNER_NAME);
  if (at < 0) {
    return [{ key: 'all', text, home: false }];
  }
  return [
    { key: 'before', text: text.slice(0, at), home: false },
    { key: 'name', text: OWNER_NAME, home: true },
    { key: 'after', text: text.slice(at + OWNER_NAME.length), home: false },
  ].filter((part) => part.text);
});
</script>

<template>
  <section class="blog-hero" :class="{ 'blog-hero--compact': compact }">
    <div class="blog-hero__text">
      <h1 class="blog-hero__title">
        {{ t('kyo-web.blog.title') }}
      </h1>
      <p v-if="pageLabel" class="blog-hero__page" v-text="pageLabel" />
      <p v-if="!compact" class="blog-hero__subtitle">
        <template v-for="part in subtitle_parts" :key="part.key">
          <a
            v-if="part.home"
            class="blog-hero__home"
            :href="home_href"
            v-text="part.text"
          />
          <span v-else v-text="part.text" />
        </template>
      </p>
    </div>

    <div v-if="!compact" class="blog-hero__panel">
      <p v-if="chip" class="blog-hero__chip">
        <span class="blog-hero__chip-mark" aria-hidden="true" />
        <span>{{ chip.lead }}</span>
        <span v-if="chip.rest" class="blog-hero__chip-rest">
          {{ chip.rest }}
        </span>
      </p>

      <div class="blog-hero__visual">
        <slot name="visual">
          <AsciiGalaxy />
        </slot>
      </div>

      <p class="blog-hero__galaxy-alt sr-only">
        {{ t('kyo-web.blog.hero.galaxy-alt') }}
      </p>
    </div>
  </section>
</template>

<style lang="scss" scoped>
/*
 * TWO COLUMNS FROM `sm`, THE DESIGN'S 1 : 1.1 — the panel gets the larger
 * share because the picture is wider than the sentence beside it is long.
 * One column below `sm`, and `minmax(0, …)` in both so a long word or a wide
 * picture can never widen the page.
 *
 * The rule across the top is the hero's own edge, and the chip's top edge as
 * well.
 */
.blog-hero {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  border-top: 1px solid var(--clr-border-100);

  @include min-media-query(sm) {
    grid-template-columns: minmax(0, 1fr) minmax(0, 1.1fr);
  }
}

/*
 * COMPACT: ONE COLUMN AT EVERY WIDTH, AND A HEAD'S HEIGHT, NOT A HERO'S. The
 * top rule stays — it is the line under the nav on every archive page — and
 * the block padding drops to what a list needs above it. Still no inline
 * padding: the title starts on the sheet's edge.
 */
.blog-hero--compact {
  .blog-hero__text { padding: 20px 0 24px; }

  @include min-media-query(sm) {
    grid-template-columns: minmax(0, 1fr);

    .blog-hero__text { padding: 40px 0 32px; }
  }
}

/* Flush left with no inline padding: the title starts on the sheet's edge,
   the same line everything above and below it starts on. */
.blog-hero__text {
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 20px 0 32px;

  @include min-media-query(sm) { padding: 64px 16px 64px 0; }

  @include min-media-query(lg) { padding-right: 36px; }
}

/* --fs-800 at every width, as the masthead had it: it steps by itself (37.5 →
   48 → 72px, the blog taking the middle step from `sm`), and it keeps the
   <h1> strictly above the "All posts" band type.spec.js ranks it against. */
.blog-hero__title {
  margin: 0 0 16px;
  color: var(--clr-neutral-100);
  font-family: "Geomanist", sans-serif;
  font-size: var(--fs-800);
  font-weight: 700;
  line-height: 1;
  letter-spacing: -0.01em;
  text-wrap: balance;
}

/* "Page 2 of 3", in the chip's voice: monospace capitals, muted. It is a
   caption, not a state — the pager's current number is the mark that takes
   the accent — so it stays monochrome. The title's own 16px bottom margin is
   the gap above it. */
.blog-hero__page {
  margin: 0 0 16px;
  color: var(--clr-neutral-300);
  font-family: "SpaceMono", monospace;
  font-size: var(--fs-200);
  letter-spacing: 0.14em;
  text-transform: uppercase;

  &:last-child { margin-bottom: 0; }
}

.blog-hero__subtitle {
  max-width: 50ch;
  margin: 0;
  color: var(--clr-neutral-50);
  font-family: "Geomanist", sans-serif;
  font-size: var(--fs-400);
  line-height: 1.6;
  letter-spacing: 0.012em;
}

/* The same link the blog uses everywhere it names a place: bright and
   underlined at rest, the accent only while pointed at or focused. */
.blog-hero__home {
  color: var(--clr-neutral-100);
  text-decoration: underline;
  text-underline-offset: 3px;
  transition: color 0.15s ease;

  &:hover,
  &:focus-visible { color: var(--clr-primary-100); }
}

/*
 * A COLUMN: THE CHIP, THEN THE PICTURE CENTRED IN WHAT IS LEFT. The design
 * pins the chip in the corner and holds the picture 44px down; here the chip
 * sits in flow and its own height plus a 10px step makes those 44px. The
 * difference only shows when the chip wraps (Spanish on a phone or at 768px,
 * English under ~380px): the picture moves down a line instead of sliding under
 * it. No inline padding — the chip starts on the divider, and the clip edge is
 * the panel's box either way.
 *
 * FIRST ON A PHONE. `order: -1` lifts it above the title in the single
 * column; the reset at `sm` is not optional, or it would auto-place into the
 * left track and swap the columns. Nothing in the hero is focusable, so the
 * visual order cannot contradict a focus order.
 */
.blog-hero__panel {
  position: relative;
  order: -1;
  display: flex;
  flex-direction: column;
  padding-bottom: 16px;
  overflow: hidden;

  @include min-media-query(sm) {
    order: 0;
    padding-bottom: 28px;
    border-left: 1px solid var(--clr-border-100);
  }
}

/*
 * THE PANEL CENTRES THE PICTURE AND CLIPS IT. The galaxy is a fixed-size
 * character grid; where the fixed desktop metrics make it wider than the panel
 * it overflows both sides equally and loses only its outermost, vignetted
 * columns. With no chip (no corpus) it keeps the design's 44px from the top.
 */
.blog-hero__visual {
  display: flex;
  flex: 1 0 auto;
  align-items: center;
  justify-content: center;

  &:first-child { margin-top: 44px; }
}

/*
 * THE CHIP SITS IN THE PANEL'S CORNER, closed by two hairlines of its own —
 * the hero's top rule and the panel's divider are its other two sides.
 *
 * A LONG LOCALE WRAPS BY HALVES. The Spanish sentence is wider than a phone's
 * panel, so the muted half drops to a second line rather than breaking either
 * half mid-phrase.
 */
.blog-hero__chip {
  display: flex;
  flex-wrap: wrap;
  gap: 2px 8px;
  align-self: flex-start;
  align-items: center;
  margin: 0 0 10px;
  padding: 8px 12px;
  border-right: 1px solid var(--clr-border-100);
  border-bottom: 1px solid var(--clr-border-100);
  color: var(--clr-neutral-100);
  font-family: "SpaceMono", monospace;
  font-size: var(--fs-100);
  line-height: 1.5;
  letter-spacing: 0.14em;
  text-transform: uppercase;

  span { white-space: nowrap; }
}

/* The ■ is drawn, not typed: SpaceMono's subset has no U+25A0, and a
   fallback glyph would sit at another size and baseline. */
.blog-hero__chip-mark {
  flex: none;
  width: 7px;
  height: 7px;
  background: var(--clr-neutral-100);
}

.blog-hero__chip-rest { color: var(--clr-neutral-300); }
</style>
