<script setup>
/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 */

/*
 * The blog landing's marquee: the corpus's own numbers on a slow ticker —
 * last build, articles per language, KB / lines / headings of Org, words and
 * reading time, the engine.
 *
 * IT NEVER SHOWS A NUMBER IT WAS NOT GIVEN. Every figure comes from the
 * manifest's corpus block; with no corpus the component renders nothing at
 * all. The design's "GATES 175/175 GREEN" segment is gone for the same
 * reason — the gate count is not known when the site builds — and the engine
 * segment appears only when the manifest names an engine.
 *
 * ONE TRACK, TWO IDENTICAL COPIES, translateX(-50%): the loop is seamless only
 * if the copies are exactly the same width, so the gap after each copy's last
 * separator is padding, not a trailing space (a space at the end of a line is
 * collapsed away, which would leave the second copy one space short and make
 * the loop jump).
 *
 * THE TRACK IS aria-hidden. A screen reader gets one sentence with the same
 * facts instead of a ticker read twice; the messages are in sentence case and
 * CSS does the uppercasing, so that sentence reads as a sentence.
 *
 * THE BRIGHT VALUES ARE MARKUP, NOT HTML IN A MESSAGE. Each segment is one
 * message with named params; the value the design sets bright is swapped for
 * a sentinel, the translated string is cut there, and the value goes back in
 * as a <b>. No v-html, no raw-html key, and a translation may put the value
 * wherever its grammar wants it.
 */
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

const props = defineProps({
  /* The manifest's corpus block: { files, bytes, lines, headings, words,
     minutes, byLocale: { en, es }, engine: { name, version } | null,
     builtAt }. null renders nothing. */
  corpus: { type: Object, default: null },
});

const { t, locale } = useI18n();

const BYTES_PER_KB = 1024;
const ISO_DAY_LENGTH = 10;
const COPIES = [0, 1];
/* A character no message will ever contain: where the bright value goes. */
const MARK = '\u0001';
const LEAD = '// ';
const SEPARATOR = ' ////// ';
const TAIL = ' //////';
const ENGINE = 'org2html';

/* The design's order, and the one value in each segment it sets bright. Every
   key is spelled out in a literal t() call so check-i18n-keys can see it. */
const SEGMENTS = [
  { id: 'build', bold: 'date', say: (p) => t('kyo-web.blog.marquee.build', p) },
  { id: 'articles', bold: 'files', say: (p) => t('kyo-web.blog.marquee.articles', p) },
  { id: 'source', bold: 'size', say: (p) => t('kyo-web.blog.marquee.source', p) },
  { id: 'reading', bold: 'words', say: (p) => t('kyo-web.blog.marquee.reading', p) },
  { id: 'engine', bold: 'engine', say: (p) => t('kyo-web.blog.marquee.engine', p) },
];

const isCorpus = (c) => Boolean(
  c
  && c.byLocale
  && typeof c.builtAt === 'string'
  && /^\d{4}-\d{2}-\d{2}/.test(c.builtAt)
  && [
    c.files, c.bytes, c.lines, c.headings, c.words, c.minutes,
    c.byLocale.en, c.byLocale.es,
  ].every(Number.isFinite),
);

/*
 * Every figure formatted in the reader's locale. Intl and toLocaleDateString
 * read the same CLDR data in Node and in the browser, so the prerendered text
 * and the hydrated text are the same string (blog.vue formats its dates the
 * same way). The build date stays ISO on the ticker, as designed; the sentence
 * spells it out. Words are the real sum of the posts' word counts — the
 * design's 9,100 is not rounded, it is that sum.
 */
const stats = computed(() => {
  const c = props.corpus;
  if (!isCorpus(c)) {
    return null;
  }
  const tag = locale.value === 'es' ? 'es-CO' : 'en-US';
  const num = new Intl.NumberFormat(tag);
  const day = c.builtAt.slice(0, ISO_DAY_LENGTH);
  const [y, m, d] = day.split('-').map(Number);
  const version = c.engine && c.engine.version ? String(c.engine.version) : '';
  return {
    date: day,
    long_date: new Date(y, m - 1, d).toLocaleDateString(tag, {
      year: 'numeric', month: 'long', day: 'numeric',
    }),
    files: num.format(c.files),
    en: num.format(c.byLocale.en),
    es: num.format(c.byLocale.es),
    size: `${num.format(Math.round(c.bytes / BYTES_PER_KB))} KB`,
    lines: num.format(c.lines),
    headings: num.format(c.headings),
    words: num.format(c.words),
    minutes: num.format(c.minutes),
    version,
    engine: version ? `${ENGINE} ${version}` : '',
  };
});

const segments = computed(() => {
  const s = stats.value;
  if (!s) {
    return [];
  }
  const values = new Map(Object.entries(s));
  const shown = SEGMENTS.filter((seg) => seg.id !== 'engine' || s.version);
  return shown.map((seg, i) => {
    const text = seg.say({ ...s, [seg.bold]: MARK });
    const [before, after = ''] = text.split(MARK);
    return {
      key: seg.id,
      before: (i === 0 ? LEAD : SEPARATOR) + before,
      bold: text.includes(MARK) ? values.get(seg.bold) : '',
      after: i === shown.length - 1 ? after + TAIL : after,
    };
  });
});

const sr_text = computed(() => {
  const s = stats.value;
  if (!s) {
    return '';
  }
  const params = { ...s, date: s.long_date };
  return s.version
    ? t('kyo-web.blog.marquee.sr', params)
    : t('kyo-web.blog.marquee.sr-no-engine', params);
});
</script>

<template>
  <div v-if="stats" class="blog-marquee">
    <div class="blog-marquee__track" aria-hidden="true">
      <!-- Each segment is one line of markup on purpose: the text, the <b>
           and the text after it must touch, or the template's whitespace
           would add a space the design does not have. -->
      <span v-for="copy in COPIES" :key="copy" class="blog-marquee__copy">
        <template v-for="seg in segments" :key="seg.key">
          {{ seg.before }}<b v-if="seg.bold">{{ seg.bold }}</b>{{ seg.after }}
        </template>
      </span>
    </div>
    <p class="blog-marquee__sr sr-only">
      {{ sr_text }}
    </p>
  </div>
</template>

<style lang="scss" scoped>
/*
 * THE DESIGN'S TICKER, TRANSCRIBED: hairlines above and below, 11px of air,
 * the smallest mono step tracked 0.16em in uppercase, muted, with the key
 * values bright. `line-height: normal` is the design's, so the strip is the
 * height it was drawn at. No horizontal padding: the text starts on the edge
 * of the hero above it.
 *
 * `overflow: hidden` is what keeps a track twice the width of the copy from
 * widening the page at any width; `position: relative` keeps the sr-only
 * sentence inside the same clip.
 */
.blog-marquee {
  position: relative;
  overflow: hidden;
  padding: 11px 0;
  border-top: 1px solid var(--clr-border-100);
  border-bottom: 1px solid var(--clr-border-100);
  color: var(--clr-neutral-300);
  font-family: "SpaceMono", monospace;
  font-size: var(--fs-100);
  line-height: normal;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  white-space: nowrap;

  /* Bright, not heavy: the design's <b> keeps the regular weight. */
  b {
    color: var(--clr-neutral-100);
    font-weight: 400;
  }
}

.blog-marquee__track {
  display: flex;
  width: max-content;
  animation: blog-marquee 46s linear infinite;
}

/* One space, drawn as padding: a glyph advance (1ch — every glyph is 1ch in a
   monospace face) plus the tracking that follows it. */
.blog-marquee__copy {
  flex: none;
  padding-inline-end: calc(1ch + 0.16em);
}

@keyframes blog-marquee {
  to { transform: translateX(-50%); }
}

/* LESS MOTION: nothing moves, the first copy stays and ellipsizes at the
   edge, the second is not drawn. */
@media (prefers-reduced-motion: reduce) {
  .blog-marquee__track {
    width: auto;
    animation: none;
  }

  .blog-marquee__copy {
    flex: 0 1 auto;
    min-width: 0;
    overflow: hidden;
    padding-inline-end: 0;
    text-overflow: ellipsis;
  }

  .blog-marquee__copy + .blog-marquee__copy { display: none; }
}
</style>
