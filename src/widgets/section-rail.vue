<script setup>
/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 */

/*
 * section-rail.vue — THE CHIP THAT ALWAYS SAYS WHERE YOU ARE.
 *
 * A single line in the corner: `3/6 · PROJECTS`. Press it and the list unfolds
 * from the same box.
 *
 * FULL TITLES WITHOUT OPENING ANYTHING — the reason this design won. One label
 * has the whole width of the chip and never competes for the ~226px gutter that
 * defeats an edge rail on a laptop. It was chosen over a ticks-and-panel rail
 * that had to overlap the article to show a title; that design, the mobile
 * sheet it needed and the switcher that compared them are all deleted.
 *
 * IT IS ONE ELEMENT, NOT TWO. The border lives on the wrapper and the chip is a
 * row inside it, so opening the list grows the same box downward instead of
 * producing a second floating card under the first. A hairline separates the
 * two rows; nothing else does.
 *
 * SQUARE. No rounded corners anywhere — house rule.
 *
 * THE SAME THING ON A PHONE AND ON A DESKTOP. There is no breakpoint in this
 * file: the chip is pointer-independent, so it never needed a touch
 * counterpart.
 *
 * IT OWNS THE BOTTOM-RIGHT CORNER. o2h.js's own back-to-top FAB is fixed in
 * that same spot, so `blog-post.vue` switches it off through `O2H_CONFIG`
 * rather than stacking a second, less capable control on top of this one.
 *
 * THE FILENAME IS LOAD-BEARING. `.size-limit.json` matches
 * `dist/assets/section-rail-*`, and size-limit treats a glob that matches
 * NOTHING as a failure, not as a pass — renaming this file would fail CI with a
 * message that never mentions a budget.
 *
 * CLIENT-ONLY, and that is the whole hydration story. Which section is active
 * depends on scroll position, which does not exist during prerender, so
 * rendering nothing on the server and mounting afterwards is what keeps the
 * label from becoming a mismatch. An explicit empty placeholder, because
 * `UiClientOnly`'s default is a bare `<div>` that would sit in the flow — and
 * this thing's first law is that it never affects layout.
 */

import useScrambleText from '@composables/use-scramble-text';
import useSectionNav from '@composables/use-section-nav';
import UiClientOnly from '@ui/client-only.vue';
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

/* Font Awesome arrow-up, from the Symbols Nerd Font subset. The codepoint is
   declared in `scripts/_nerd-font-glyphs.txt`, which is what
   `check:nerd-glyphs` gates against — one that is not in the sheet renders
   tofu. */
const GLYPH_TOP = '\uF062';

const props = defineProps({
  sections: { type: Array, required: true },
  label: { type: String, default: 'On this page' },
  topId: { type: String, default: null },
});

const { active, open, go, toTop, position, reduced } =
  useSectionNav(() => props.sections, { topId: props.topId });

const current = computed(() => props.sections.find(
  (s) => s.id === active.value,
) || props.sections[0] || null);

const current_label = computed(
  () => (current.value ? current.value.label : props.label),
);

/*
 * THE LABEL BOILS WHILE YOU MOVE AND RESOLVES WHERE YOU LAND.
 *
 * `useScrambleText` is the site's own effect — the hero's — so this borrows it
 * rather than inventing a second one.
 *
 * THE SHAPE OF IT: a section change puts the label into NOISE and holds it
 * there for as long as the reader keeps moving. Only once the active section
 * has stood still for `SETTLE_MS` does it decode, at its normal reading pace,
 * into the name of the section actually arrived at.
 *
 * WHY HOLDING IS BETTER THAN THE OBVIOUS TWO ALTERNATIVES. Decoding on every
 * change queues six animations behind a fast scroll, and the label spells out
 * section two long after the reader has stopped at six. Rushing the reveal to
 * keep up just makes it illegible. Staying in noise says "still moving" — which
 * is true — and spends the animation once, on the answer that matters.
 *
 * The boil is `freeze` on a ~30Hz interval, which is the rate the composable
 * refreshes its own noise at, so a held label and a decoding one are visibly
 * the same effect. `stop()` before each decode abandons any job in flight and
 * leaves its FINAL text rather than a frozen frame, so two can never
 * interleave.
 *
 * The visible span is `aria-hidden` and a stable label sits beside it for
 * screen readers, which must never be handed a string of noise.
 */
const SETTLE_MS = 160;
const BOIL_MS = 33;

const { play, freeze, stop } = useScrambleText({ revealRate: 26 });

const label_el = ref(null);
let settle_timer = 0;
let boil_timer = 0;

const stopBoil = () => {
  window.clearInterval(boil_timer);
  boil_timer = 0;
};

/* Under reduced motion there is nothing to hold: `freeze` writes the real text,
   so boiling would be an interval that repaints the same string forever. */
const startBoil = () => {
  if (boil_timer || reduced()) {
    return;
  }
  boil_timer = window.setInterval(() => {
    if (label_el.value) {
      freeze(label_el.value, current_label.value);
    }
  }, BOIL_MS);
};

/* Clears the pending settle too: a press changes the label AND closes the list
   in the same tick, and without this the decode started by the close was
   restarted from noise 160ms later by the label's own timer. */
const settle = (text) => {
  window.clearTimeout(settle_timer);
  stopBoil();
  stop();
  if (label_el.value) {
    play(label_el.value, text);
  }
};

watch(current_label, (text) => {
  stop();
  startBoil();
  window.clearTimeout(settle_timer);
  settle_timer = window.setTimeout(() => settle(text), SETTLE_MS);
});

/*
 * THE KEYBOARD WALKS THE LIST the way a menu button's does. From the chip, Down
 * opens it on the first entry and Up on the last — the one sitting right above
 * the chip, since the list unfolds upward. Inside it Up and Down step and wrap,
 * Home and End go to its ends, and Tab walks it as before.
 *
 * CLOSING HANDS FOCUS BACK TO THE CHIP when it was inside the list. The list is
 * removed from the DOM, and focus on a removed node falls to <body>, which put
 * an Escape from the list back at the top of the page's tab order. A `pre`
 * watcher runs before that removal, while the focused link still exists. A
 * press moves focus to its heading before it closes the list, so it is left
 * alone.
 */
const STEP = new Map([['ArrowDown', 1], ['ArrowUp', -1]]);

const chip_el = ref(null);
const list_el = ref(null);
let pending_step = 0;

const links = () => (list_el.value ? [...list_el.value.querySelectorAll('a')] : []);

const onKeys = (event) => {
  const all = links();
  const step = STEP.get(event.key) || 0;
  if (event.target === chip_el.value) {
    if (!step) {
      return;
    }
    event.preventDefault();
    if (open.value && all.length > 0) {
      all.at(step > 0 ? 0 : -1).focus();
    } else {
      pending_step = step;
      open.value = true;
    }
    return;
  }
  const at = all.indexOf(event.target);
  if (at < 0) {
    return;
  }
  let to = -1;
  if (step) {
    to = (at + step + all.length) % all.length;
  } else if (event.key === 'Home') {
    to = 0;
  } else if (event.key === 'End') {
    to = all.length - 1;
  }
  if (to >= 0) {
    event.preventDefault();
    all.at(to).focus();
  }
};

/* A press is settled intent, not a scroll in flight, so it decodes at once and
   never boils. */
watch(open, (is_open) => {
  const panel = list_el.value;
  if (!is_open && panel && panel.contains(document.activeElement)) {
    chip_el.value.focus();
  }
  settle(current_label.value);
});

/* A LONG LIST OPENS WHERE THE READER IS. It scrolls inside a 26rem box, and it
   used to open at its top, so on a long article the marked entry was out of
   sight below the fold of the list itself. */
watch(open, (is_open) => {
  const panel = list_el.value;
  if (!is_open || !panel) {
    return;
  }
  const here = panel.querySelector('[aria-current]');
  if (here) {
    panel.scrollTop += here.getBoundingClientRect().top
      - panel.getBoundingClientRect().top
      - (panel.clientHeight - here.offsetHeight) / 2;
  }
  if (pending_step) {
    links().at(pending_step > 0 ? 0 : -1).focus();
    pending_step = 0;
  }
}, { flush: 'post' });

onBeforeUnmount(() => {
  window.clearTimeout(settle_timer);
  stopBoil();
});
</script>

<template>
  <UiClientOnly>
    <template #placeholder>
      <!-- Nothing. An overlay that renders a box on the server is not one. -->
    </template>

    <nav
      class="section-rail"
      :class="{ 'is-open': open }"
      :aria-label="label"
      @keydown="onKeys"
    >
      <!-- TWO CELLS, ONE ROW, sharing the wrapper's border — the hero's chip
           strip idiom: flush against each other, divided by a single hairline,
           and hover paints the CELL rather than moving a border colour. -->
      <div class="section-rail__bar">
        <button
          ref="chip_el"
          type="button"
          class="section-rail__cell section-rail__chip"
          :aria-expanded="open"
          aria-controls="section-rail-panel"
          @click="open = !open"
        >
          <span class="section-rail__count">
            {{ position.index + 1 }}/{{ position.total }}
          </span>

          <!-- The decoding span is decoration; the sentence a screen reader
               gets is the stable one beside it. -->
          <span
            ref="label_el"
            class="section-rail__now"
            aria-hidden="true"
          >{{ current_label }}</span>
          <span class="sr-only">{{ current_label }}</span>
        </button>

        <button
          type="button"
          class="section-rail__cell section-rail__top"
          :aria-label="t('kyo-web.landing.nav.to-top')"
          @click="toTop"
        >
          <span
            class="icon-glyph"
            :data-text="GLYPH_TOP"
            aria-hidden="true"
          />
        </button>
      </div>

      <!-- A sub-entry (an article's subsection, `level` 2 and deeper) steps in
           once, the way the article's own contents list nests it. -->
      <ul
        v-if="open"
        id="section-rail-panel"
        ref="list_el"
        class="section-rail__list"
        role="list"
      >
        <li
          v-for="s in sections"
          :key="s.id"
          :class="{ 'is-sub': s.level > 1 }"
        >
          <a
            :class="{ 'is-active': active === s.id }"
            :href="`#${s.id}`"
            :aria-current="active === s.id ? 'location' : undefined"
            @click="go($event, s.id)"
          >{{ s.label }}</a>
        </li>
      </ul>
    </nav>
  </UiClientOnly>
</template>

<style lang="scss" scoped>
/* Bottom-right at every width — there is no desktop/mobile split to make. */
.section-rail {
  position: fixed;
  right: 1rem;
  bottom: 1rem;
  z-index: 40;
  display: flex;
  width: max-content;
  max-width: min(28rem, calc(100vw - 2rem));
  flex-direction: column;

  /* THE BOX IS THE WRAPPER. Chip and list share this one border, which is what
     makes the open state read as a single object. */
  border: 1px solid var(--clr-border-100);
  background: color-mix(in srgb, var(--clr-neutral-500) 94%, transparent);
  backdrop-filter: blur(8px);

  &.is-open { border-color: var(--clr-neutral-300); }
}

/* The row the box always shows. `min-width: 0` so the label's ellipsis has
   something to resolve against instead of forcing the box wider. */
.section-rail__bar {
  display: flex;
  order: 2;                       /* the list unfolds ABOVE the row */
  align-items: stretch;
  min-width: 0;
}

/*
 * A CELL, in the hero's chip-strip sense: no border of its own except the
 * hairline that divides it from the cell before it, stretched to the row's
 * full height so the two sit flush, and hover paints the CELL rather than
 * moving a border colour. Focus is INSET so it never paints outside the box
 * and shifts nothing.
 */
.section-rail__cell {
  display: flex;
  align-items: center;
  padding: 0.55rem 0.9rem;
  border: 0;
  background: none;
  color: var(--clr-neutral-100);
  font-family: 'SpaceMono', monospace;
  font-size: var(--fs-100);
  text-align: left;
  cursor: pointer;
  transition:
    background-color 0.2s var(--ease-standard),
    color 0.2s var(--ease-standard);

  & + & { border-left: 1px solid var(--clr-border-100); }

  &:hover,
  &:focus-visible {
    background: color-mix(in srgb, var(--clr-neutral-50) 10%, transparent);
    outline: none;
  }

  &:focus-visible {
    outline: 2px solid var(--clr-primary-100);
    outline-offset: -2px;
  }
}

.section-rail__chip {
  gap: 0.6rem;
  min-width: 0;                   /* lets __now actually truncate */
  flex: 1 1 auto;
  align-items: baseline;

  &:hover .section-rail__now,
  &:focus-visible .section-rail__now { color: var(--clr-neutral-50); }
}

/* Square, and no narrower than a comfortable target. The glyph carries the
   meaning; the accessible name is the aria-label, so nothing here is read. */
.section-rail__top {
  flex: 0 0 auto;
  justify-content: center;
  padding-inline: 0.75rem;
  color: var(--clr-neutral-200);

  &:hover,
  &:focus-visible { color: var(--clr-neutral-50); }
}

.section-rail__count { flex: 0 0 auto; color: var(--clr-primary-100); }

/* One line, and it may use the whole chip. The decode never changes its
   length, so the chip cannot reflow mid-animation. */
.section-rail__now {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.section-rail__list {
  order: 1;
  max-height: min(60vh, 26rem);
  margin: 0;
  padding: 0.35rem 0;
  overflow-y: auto;
  border-bottom: 1px solid var(--clr-border-100);
  list-style: none;

  /* A LIFT, NOT A SLAB — the same row-hover the archive and the related list
     use, so every list of links on this site answers a pointer the same way.
     It swapped a colour and nothing else before, with no transition at all,
     which on a dark panel was almost invisible. */
  a {
    display: block;
    padding: 0.5rem 0.9rem;
    color: var(--clr-neutral-200);
    font-family: 'Geomanist', sans-serif;
    font-size: var(--fs-200);
    line-height: 1.4;
    text-decoration: none;
    transition:
      background-color 0.15s var(--ease-standard),
      color 0.15s var(--ease-standard);

    &:hover,
    &:focus-visible {
      background-color: color-mix(in srgb, var(--clr-neutral-100) 6%, transparent);
      color: var(--clr-neutral-50);
      outline: none;
    }

    /* Inset, so the ring never paints outside the panel's own border. */
    &:focus-visible {
      outline: 2px solid var(--clr-primary-100);
      outline-offset: -2px;
    }

    &.is-active { color: var(--clr-primary-100); }
  }

  /* One step in, the width of the row's own inset, so a subsection reads as
     belonging to the entry above it. */
  .is-sub a { padding-left: 1.8rem; }
}
</style>
