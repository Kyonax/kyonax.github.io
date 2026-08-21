<script setup>
/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 *
 * Profile data-ingest feed: the strip under the hero portrait that
 * dramatizes profile facts streaming "into" the frame above it. Header
 * carries the loader line plus the CCS / ORCID badges; the ledger below
 * is a fixed-height clipped queue where a row arrives already encrypted
 * and only then decodes in place. Cadences come from the animation-intake
 * research: queue beats from conductorai.com's file-status-queue, text
 * decode from cloudflare.com's agent console.
 */

import useCursorTooltip from '@composables/use-cursor-tooltip';
import useInViewport from '@composables/use-in-viewport';
import useScrambleText from '@composables/use-scramble-text';
import { TECHNOLOGIES } from '@data/data';
import { PROJECTS } from '@data/projects';
import { TESTIMONIALS } from '@data/testimonials';
import BrandIcon from '@ui/brand-icon.vue';
import CursorTooltip from '@ui/cursor-tooltip.vue';
import UiStateGrid from '@ui/state-grid.vue';
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';

const { t, tm } = useI18n();

/* Queue beats measured on conductorai.com (flip 350 ms, slide 650 ms);
   the cycle is stretched from its 1900 ms so the hero reads calm. */
const VISIBLE_ROWS = 4;
/* Beside the frame the panel is the portrait's full height, so the ledger
   fills it instead of floating four rows over a void. */
const BAND_ROWS = 10;
/* Same em values as $breakpoints tab/md and between-media-query's -0.0625em:
   a media-query em is always 16px, so these track the SCSS band exactly.
   Keep BAND_ROWS in lockstep with the row multiplier in the SCSS below. */
const BAND_MQ = '(min-width: 50.625em) and (max-width: 63.9375em)';
const HOLD_AFTER_FLIP_MS = 350;
const SHIFT_MS = 650;
/* A row lands already encrypted and holds there, FROZEN — one static noise
   frame, no rAF at all — so arrival reads as data waiting, not as churn. */
const FETCH_DWELL_MS = 1000;
/* Decrypting opens with a live boil before the reveal sweep starts, so the
   glyphs are visibly working for a beat and then resolve. The engine's own
   `delay` carries this lead: no second timer, no polling. */
const BOIL_LEAD_MS = 500;
/* Stretched to keep the `loaded` beat legible after the freeze, the boil and
   the longest decode (the 19-char ORCID id at 22 c/s) have all run. */
const CYCLE_MS = 4600;

/* Scramble alphabets: labels boil with letters, values with the mixed
   set — mirrors the status/token split measured on cloudflare.com. */
const LABEL_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const VALUE_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const VALUE_DECODE_DELAY_MS = 200;

/* Ring order is the ingest narrative: the four hidden stat rows first,
   then the hidden tag row's identity, then the recruiter-facing metrics
   that only exist here. Labels/values resolve through i18n per locale. */
const ROW_IDS = [
  'experience',
  'stack',
  'projects',
  'languages',
  'role',
  'focus',
  'remote',
  'member',
  'orcid',
  'handle',
  'github',
  'clients',
  'reviews',
  'uplift',
  'response',
  'base',
  'status',
];

const stack_count = TECHNOLOGIES.length;
const project_count = PROJECTS ? Object.keys(PROJECTS).length : 0;
const review_count = TESTIMONIALS.length;

/* Company count reads the experience timeline's own i18n entries, so a
   new job in content-data lands in the feed without a second edit. */
const company_count = computed(() => {
  const entries = tm('kyo-web.content-data.experience');
  return entries ? Object.keys(entries).length : 0;
});

const row_params = computed(() => new Map([
  ['stack', { n: stack_count }],
  ['projects', { n: project_count }],
  ['reviews', { n: review_count }],
  ['clients', { n: company_count.value }],
]));

const ring = computed(() => ROW_IDS.map((id) => ({
  id,
  label: t(`kyo-web.landing.hero.feed.rows.${id}-label`),
  value: t(
    `kyo-web.landing.hero.feed.rows.${id}-value`,
    row_params.value.get(id) || {},
  ),
})));

/* Resolved once per locale; the template then does a Map lookup instead of
   five t() calls on every beat of the queue. */
const STATES = ['fetching', 'decrypting', 'loaded', 'synced'];
const state_label = computed(() => new Map(
  STATES.map((id) => [id, t(`kyo-web.landing.hero.feed.state.${id}`)]),
));

const sr_summary = computed(() => t('kyo-web.landing.hero.feed.summary', {
  stack: stack_count,
  projects: project_count,
  reviews: review_count,
  clients: company_count.value,
}));

/* ── Visibility gate ─────────────────────────────────────────────────────────
   Two HeroVisual instances mount per breakpoint (hero.vue's v-show pair);
   the display:none twin never intersects, so its engines stay idle. The
   same gate stops everything once the hero scrolls away. The observer
   itself is wired after the queue engine below. */
const feed_ref = ref(null);
const in_view = ref(false);

/* ── Ledger queue (K1 window mechanics + K4 scramble on arrival) ─────────── */
const offset = ref(0);
const flipped = ref(false);
const shifting = ref(false);
/* Ingest phase of the newest visible row: fetching -> decrypting -> loaded.
   Starts settled so the server-rendered window is a finished ledger. */
const phase = ref('loaded');
const list_ref = ref(null);
/* Row count is layout-driven, so every index below reads it reactively. */
const visible_rows = ref(VISIBLE_ROWS);

const {
  play: scramble, freeze: prime, stop: stop_scramble,
} = useScrambleText();

/* Five rows render: four visible plus the incoming one sitting below the
   clipped viewport until the slide reveals it. Keys are ring indices so
   Vue moves row elements instead of recreating the whole window — that
   move is what lets a decode survive the commit beat mid-flight. */
const rows = computed(() => {
  const count = Math.min(visible_rows.value + 1, ROW_IDS.length);
  const out = [];
  for (let i = 0; i < count; i += 1) {
    const idx = (offset.value + i) % ROW_IDS.length;
    out.push({ idx, ...ring.value[idx] });
  }
  return out;
});

/* Per-row ingest state, newest at the bottom: the row below the clip and the
   one that just landed are both `fetching` until the dwell elapses, then that
   row decrypts, sits `loaded`, and commits to `synced` on the next flip. */
const row_state = (i) => {
  if (i === visible_rows.value) {
    return 'fetching';
  }
  if (i === visible_rows.value - 1 && !flipped.value) {
    return phase.value;
  }
  return 'synced';
};

let _timer = null;
let _motion_ok = false;
/* One generation per cycle, bumped at the top of each. A decode promise
   carries the generation it was launched in, so a straggler from a previous
   cycle (or from a stop) can never resolve into the current row's phase. */
let _gen = 0;

const _row_spans = (i) => {
  const list = list_ref.value;
  const row_el = list && list.children.item(i);
  const entry = ring.value[(offset.value + i) % ROW_IDS.length];
  if (!row_el || !entry) {
    return null;
  }
  return {
    entry,
    label: row_el.querySelector('.hero-data-feed__label'),
    value: row_el.querySelector('.hero-data-feed__value'),
  };
};

/* Freeze the row waiting below the clip into noise the moment it renders, so
   it can never flash its real text on the way in — and so it travels into
   view, and sits there through the fetch dwell, perfectly still. */
const _prime_incoming = () => {
  const spans = _row_spans(visible_rows.value);
  if (!spans) {
    return;
  }
  prime(spans.label, spans.entry.label, { alphabet: LABEL_ALPHABET });
  prime(spans.value, spans.entry.value, { alphabet: VALUE_ALPHABET });
};

/* Drop the real text back into a row without animating — used when the queue
   stops, so a paused feed reads as finished rather than as frozen noise. */
const _settle_row = (i) => {
  const spans = _row_spans(i);
  if (!spans) {
    return;
  }
  spans.label.textContent = spans.entry.label;
  spans.value.textContent = spans.entry.value;
};

/* Wake the landed row: it boils live for BOIL_LEAD_MS and then the reveal
   sweep locks it in, left to right. This is the only rAF the feed ever runs,
   and it exists for roughly a third of each cycle. */
const _decode_landed = () => {
  const spans = _row_spans(visible_rows.value - 1);
  if (!spans) {
    return;
  }
  const gen = _gen;
  const label_job = scramble(spans.label, spans.entry.label, {
    alphabet: LABEL_ALPHABET,
    revealRate: 18,
    delay: BOIL_LEAD_MS,
  });
  const value_job = scramble(spans.value, spans.entry.value, {
    alphabet: VALUE_ALPHABET,
    revealRate: 22,
    delay: BOIL_LEAD_MS + VALUE_DECODE_DELAY_MS,
  });
  Promise.all([label_job, value_job]).then(() => {
    if (gen === _gen) {
      phase.value = 'loaded';
    }
  });
};

const _cycle = () => {
  _gen += 1;

  /* Beat 1: the newest visible row commits — its dot flips to linked. */
  flipped.value = true;

  _timer = setTimeout(() => {
    /* Beat 2: the whole list slides up one row height. The arriving row is
       already frozen noise, so it travels without a single frame of work. */
    shifting.value = true;

    _timer = setTimeout(() => {
      /* Beat 3: commit. The window advances and the transform resets in
         the same render, so the snap-back is invisible; the row that just
         landed keeps decoding, and the fresh one below the clip is primed
         with noise straight away. */
      offset.value = (offset.value + 1) % ROW_IDS.length;
      flipped.value = false;
      shifting.value = false;
      phase.value = 'fetching';
      nextTick(_prime_incoming);

      /* Beat 4: the freeze ends. The row starts boiling for real, holds that
         for BOIL_LEAD_MS, then decodes; `loaded` arrives off the promise. */
      _timer = setTimeout(() => {
        phase.value = 'decrypting';
        _decode_landed();
        _timer = setTimeout(
          _cycle,
          CYCLE_MS - HOLD_AFTER_FLIP_MS - SHIFT_MS - FETCH_DWELL_MS,
        );
      }, FETCH_DWELL_MS);
    }, SHIFT_MS);
  }, HOLD_AFTER_FLIP_MS);
};

const _stop_queue = () => {
  if (_timer) {
    clearTimeout(_timer);
    _timer = null;
  }
  /* Retire any decode in flight so an off-screen or backgrounded hero cannot
     keep the shared rAF alive, then write the real text back: a row paused
     mid-freeze has no job for stop() to settle, and must not stay noise. */
  stop_scramble();
  _settle_row(visible_rows.value - 1);
  _settle_row(visible_rows.value);
  _gen += 1;
  /* Land on a clean beat so resume never starts mid-slide. */
  flipped.value = false;
  shifting.value = false;
  phase.value = 'loaded';
};

const _start_queue = () => {
  if (!_motion_ok || _timer || !in_view.value || document.hidden) {
    return;
  }
  _prime_incoming();
  _timer = setTimeout(_cycle, CYCLE_MS);
};

const _visibility = () => {
  if (document.hidden) {
    _stop_queue();
  } else {
    _start_queue();
  }
};

useInViewport(feed_ref, {
  on_change: (visible) => {
    in_view.value = visible;
    if (visible) {
      _start_queue();
    } else {
      _stop_queue();
    }
  },
});

/* Crossing the band rebuilds the window, so retire the in-flight decode
   first: its spans belong to rows that are about to be re-keyed. */
let _band_mq = null;
const _on_band = (event) => {
  const next = event.matches ? BAND_ROWS : VISIBLE_ROWS;
  if (next === visible_rows.value) {
    return;
  }
  _stop_queue();
  visible_rows.value = next;
  nextTick(_start_queue);
};

onMounted(() => {
  /* Row count is layout, not motion: the panel reserves ten row heights, so
     it must fill them even when the queue never runs. */
  _band_mq = window.matchMedia(BAND_MQ);
  visible_rows.value = _band_mq.matches ? BAND_ROWS : VISIBLE_ROWS;
  _band_mq.addEventListener('change', _on_band);

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return;
  }
  _motion_ok = true;
  document.addEventListener('visibilitychange', _visibility);
  _start_queue();
});

onBeforeUnmount(() => {
  _stop_queue();
  _band_mq?.removeEventListener('change', _on_band);
  document.removeEventListener('visibilitychange', _visibility);
});

/* ── Badge tooltips (same cursor-tooltip contract as the hero links) ────── */
const ccs_ref = ref(null);
const {
  visible: ccs_tooltip_visible, x: ccs_x, y: ccs_y,
} = useCursorTooltip(ccs_ref);

const orcid_ref = ref(null);
const {
  visible: orcid_tooltip_visible, x: orcid_x, y: orcid_y,
} = useCursorTooltip(orcid_ref);
</script>

<template>
  <div ref="feed_ref" class="hero-data-feed">
    <div class="hero-data-feed__head">
      <UiStateGrid class="hero-data-feed__pulse" />
      <span class="hero-data-feed__load" aria-hidden="true"><span
        class="hero-data-feed__load-pre"
      >{{ t('kyo-web.landing.hero.feed.loading-prefix') }}</span><span
        class="hero-data-feed__load-sep"
      >::</span><span
        class="hero-data-feed__load-text"
      >{{ t('kyo-web.landing.hero.feed.loading') }}</span><span
        class="hero-data-feed__dots"
      ><span /><span /><span /></span></span>
      <a
        ref="ccs_ref"
        class="hero-data-feed__chip"
        href="https://github.com/ccs-devhub"
        target="_blank"
        rel="noopener noreferrer"
        :aria-label="t('kyo-web.landing.hero.tag-aria')"
      >
        {{ t('kyo-web.landing.hero.feed.ccs-chip') }}
      </a>
      <a
        ref="orcid_ref"
        class="hero-data-feed__chip hero-data-feed__chip--orcid"
        href="https://orcid.org/0009-0006-4459-5538"
        target="_blank"
        rel="noopener noreferrer"
        :aria-label="t('kyo-web.landing.hero.orcid-aria')"
      >
        <BrandIcon
          class="hero-data-feed__chip-icon"
          name="orcid"
          aria-hidden="true"
        />
      </a>
    </div>

    <p class="sr-only">
      {{ sr_summary }}
    </p>

    <!-- data-nosnippet: the decode writes noise glyphs into these spans, so
         the ledger is barred from snippets; the sr-only summary above is the
         clean, snippet-eligible text. Indexing is unaffected. -->
    <div class="hero-data-feed__viewport" data-nosnippet aria-hidden="true">
      <ul
        ref="list_ref"
        class="hero-data-feed__list"
        :class="{ 'hero-data-feed__list--shifting': shifting }"
      >
        <li
          v-for="(row, i) in rows"
          :key="row.idx"
          class="hero-data-feed__row"
          :class="`hero-data-feed__row--${row_state(i)}`"
        >
          <span class="hero-data-feed__dot" />
          <span class="hero-data-feed__status">
            {{ state_label.get(row_state(i)) }}
          </span>
          <span class="hero-data-feed__label">{{ row.label }}</span>
          <span class="hero-data-feed__value">{{ row.value }}</span>
        </li>
      </ul>
    </div>

    <CursorTooltip :visible="ccs_tooltip_visible" :x="ccs_x" :y="ccs_y">
      {{ t('kyo-web.landing.hero.tooltip.ccs') }}
    </CursorTooltip>
    <CursorTooltip :visible="orcid_tooltip_visible" :x="orcid_x" :y="orcid_y">
      {{ t('kyo-web.landing.hero.tooltip.orcid') }}
    </CursorTooltip>
  </div>
</template>

<style lang="scss" scoped>
.hero-data-feed {
  /* Fixed row pitch is the height contract: the viewport is an exact
     multiple of it and no beat of the animation can reflow the block.
     The status column is reserved in ch so a changing verb never jitters. */
  --feed-row-h: 2.25rem;
  --feed-status-w: 11.5ch;

  width: 0;
  min-width: 100%;
  background: var(--clr-neutral-500);
  border: 1px solid var(--clr-border-100);
  border-top: 0;
  font-family: "SpaceMono", monospace;

  /* Beside the frame the shared hairline is the frame's RIGHT edge, not its
     bottom, so the dropped border swaps sides. Stretching to the frame's
     height puts the void under the header and keeps the rows on the floor. */
  @include between-media-query(tab, md) {
    --feed-row-h: 2.375rem;

    width: auto;
    min-width: 0;
    display: flex;
    flex-direction: column;
    border-top: 1px solid var(--clr-border-100);
    border-left: 0;
  }

  &__head {
    display: flex;
    align-items: center;
    gap: 0;
    height: 2.75rem;
    /* No right padding: the last chip has to reach the outer border. */
    padding: 0 0 0 0.75rem;
    border-bottom: 1px solid var(--clr-border-100);
    overflow: hidden;
  }

  &__pulse {
    margin-right: 0.6rem;
  }

  &__load {
    display: inline-flex;
    align-items: baseline;
    flex: 1 1 auto;
    min-width: 0;
    white-space: nowrap;
    font-size: var(--fs-100);
    /* Tighter than the chips: the phrase is the longest run in the header
       and the unit's width is set by the portrait, not by this row. */
    letter-spacing: 0.04em;
    color: var(--clr-neutral-200);
    /* Safety net: if the phrase ever outgrows the row it clips inside its
       own box instead of painting over the chips. */
    overflow: hidden;
  }

  /* The separator owns BOTH of its gaps, so they are equal by construction
     at any font size — a literal space on one side and a margin on the other
     never match. Margins, never whitespace text nodes: SSR minifies those
     away and the client would then render them, splitting hydration. */
  &__load-sep {
    /* One space-width each side: the left gap keeps the rhythm it always had
       and the right one is brought up to match it. */
    margin-inline: 1ch;
  }

  /* Under lg the unit is capped at 320px and the row cannot hold the prefix
     as well; the phrase itself is the part that carries meaning. */
  &__load-pre,
  &__load-sep {
    @include max-media-query(lg) {
      display: none;
    }
  }

  /* Brighter than the phrase and spaced apart: at fs-100 a SpaceMono period
     is tiny, so the wave needs contrast and room to read as motion. */
  &__dots {
    margin-left: 0.15em;
    font-size: 1.1em;
    letter-spacing: 0.12em;
    color: var(--clr-neutral-100);

    span {
      opacity: 0.15;
      animation: hero-data-feed-dot 1.5s var(--ease-standard) infinite;

      &:nth-child(2) { animation-delay: 0.2s; }
      &:nth-child(3) { animation-delay: 0.4s; }

      &::before { content: "."; }
    }
  }

  /* Chips are full-height cells: their single left hairline meets the
     header's top and bottom borders, they sit flush against each other,
     and hover paints the cell instead of moving a border colour. */
  &__chip {
    display: inline-flex;
    align-items: center;
    align-self: stretch;
    gap: 0.3rem;
    flex-shrink: 0;
    padding: 0 0.6rem;
    border: 0;
    border-left: 1px solid var(--clr-border-100);
    font-size: var(--fs-100);
    letter-spacing: 0.04em;
    color: var(--clr-neutral-200);
    text-decoration: none;
    cursor: pointer;
    white-space: nowrap;
    transition:
      background-color 0.2s var(--ease-standard),
      color 0.2s var(--ease-standard);

    &:hover,
    &:focus-visible {
      background: color-mix(in srgb, var(--clr-neutral-50) 10%, transparent);
      color: var(--clr-neutral-100);
      outline: none;
    }

    /* Inset so focus never paints outside the cell and shifts nothing. */
    &:focus-visible {
      outline: 2px solid var(--clr-primary-100);
      outline-offset: -2px;
    }
  }

  &__chip--orcid {
    color: var(--clr-success-100);
    font-weight: 700;

    &:hover,
    &:focus-visible {
      color: var(--clr-success-100);
    }
  }

  &__chip-icon {
    font-size: 1.25em;
    line-height: 1;
    color: inherit;
    transform: translateY(0.06em);
  }

  &__viewport {
    /* Ten rows at the band pitch consume the panel exactly, so the ledger
       runs from directly under the header to the floor. */
    @include between-media-query(tab, md) {
      /* The 10 is BAND_ROWS in the script above — change both together. */
      height: calc(var(--feed-row-h) * 10);
    }

    height: calc(var(--feed-row-h) * 4);
    overflow: hidden;
    /* Exit-edge mask: rows leave through the top, and the fade makes the
       clip read as intentional rather than as cut-off text. */
    -webkit-mask-image: linear-gradient(to bottom, transparent 0, black 18%);
    mask-image: linear-gradient(to bottom, transparent 0, black 18%);
  }

  &__list {
    margin: 0;
    padding: 0;
    list-style: none;
    transform: translateY(0);
  }

  &__list--shifting {
    transition: transform 650ms var(--ease-standard);
    transform: translateY(calc(-1 * var(--feed-row-h)));
    will-change: transform;
  }

  &__row {
    display: grid;
    grid-template-columns: auto var(--feed-status-w) minmax(0, 1fr) auto;
    align-items: center;
    gap: 0.6rem;
    height: var(--feed-row-h);
    padding: 0 0.75rem;
    border-bottom:
      1px solid color-mix(in srgb, var(--clr-border-100) 45%, transparent);
    font-size: var(--fs-100);
    letter-spacing: 0.06em;
    contain: layout paint;

    /* Only the two ENCRYPTED states carry the tint. The moment a row is
       readable it returns to the normal row surface, so the tint means
       "still working" and `loaded` differs from `synced` by colour alone. */
    &--fetching,
    &--decrypting {
      background: color-mix(in srgb, var(--clr-neutral-50) 3%, transparent);
    }

    /* The status column is the first thing to go when the unit narrows —
       the label and the value are the payload. */
    @include max-media-query(lg) {
      grid-template-columns: auto minmax(0, 1fr) auto;
    }

    /* Except beside the frame: there the feed WIDENS to 384px, so the
       reserve fits again and the state verb earns its column back. */
    @include between-media-query(tab, md) {
      grid-template-columns: auto var(--feed-status-w) minmax(0, 1fr) auto;
    }
  }

  &__status {
    color: var(--clr-neutral-300);
    white-space: pre;
    overflow: hidden;
    /* The reserve is counted in ch, so the row's tracking must not apply
       here or the longest verb (descifrando, 11) loses its last glyph. */
    letter-spacing: 0;

    .hero-data-feed__row--loaded & {
      color: var(--clr-primary-100);
    }

    .hero-data-feed__row--synced & {
      color: color-mix(in srgb, var(--clr-success-100) 70%, transparent);
    }

    @include max-media-query(lg) {
      display: none;
    }

    @include between-media-query(tab, md) {
      display: block;
    }
  }

  &__dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--clr-neutral-300);

    .hero-data-feed__row--loaded & {
      background: var(--clr-primary-100);
    }

    .hero-data-feed__row--synced & {
      background: var(--clr-success-100);
    }
  }

  &__label {
    color: var(--clr-neutral-200);
    white-space: pre;
    overflow: hidden;
  }

  &__value {
    color: var(--clr-neutral-100);
    text-align: right;
    white-space: pre;
  }
}

@keyframes hero-data-feed-dot {
  0%,
  60%,
  100% {
    opacity: 0.15;
  }
  30% {
    opacity: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .hero-data-feed__dots span {
    animation: none;
    opacity: 1;
  }

  .hero-data-feed__list--shifting {
    transition: none;
  }
}
</style>
