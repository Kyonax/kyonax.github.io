/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 */

/*
 * use-active-section.js — "which section am I in?", answered once.
 *
 * This algorithm lived inside hud-nav.vue, which was fine while the nav was the
 * only thing that needed the answer. The section rail needs the same answer, and
 * two implementations of "where am I" drift into disagreeing — the nav
 * highlighting one section while the rail highlights its neighbour is worse than
 * either being slightly wrong on its own.
 *
 * THE RULE, IN ORDER:
 *   1. Above `topOffset`, `topId` (the landing's hero).
 *   2. At the very end of the page, the LAST section. A short closing section
 *      cannot be scrolled up to the line, so without this the end of the page
 *      could belong to the one before it.
 *   3. Otherwise, the first section whose heading is still at or below its
 *      LANDING LINE — where a jump puts it: the root's scroll-padding-top plus
 *      the heading's own scroll-margin-top — wins if that heading sits in the
 *      top `threshold` of the screen. If it sits lower, the section above it is
 *      the one being read. Above the first heading, the first section.
 *
 * WHY RULE 3 REPLACED "the last section whose top crossed the middle" (audited
 * 2026-09-15 in Chromium and Firefox, 390–1280px). That rule holds while every
 * section is taller than half a screen, which every landing section is, and
 * breaks the moment one is not: an article's subsections run 110–350px, so with
 * a heading sitting right under the nav two or three more had already crossed
 * the middle and the chip named a section further down the page — straight
 * after a jump to the one on screen, on 22 to 24 of the reference post's 37.
 * For a tall section both rules switch at the same scroll position, so what the
 * old rule was chosen for — the highlight never running ahead of the reader —
 * is kept. It also named NOTHING above the first heading, so an article read to
 * the bottom and scrolled back up still said it was on its last section.
 *
 * Reads layout only inside a rAF, at most every `interval` ms — and always once
 * more after the last event. The old throttle DROPPED an event that fell inside
 * the window and scheduled nothing after it, so a flick that ended there left
 * the answer wherever the flick had been 100ms earlier.
 *
 * It also re-reads when the page's height changes, which moves every section
 * without firing a scroll: the blog's deferred stylesheets land 100–300ms after
 * load, images decode, a FAQ answer opens.
 */

import { onBeforeUnmount, onMounted, ref, unref, watch } from 'vue';

/* A jump rounds to the pixel, and a heading nudged a few pixels under the nav
   is still the one the reader is at. */
const GRACE = 4;

const px = (value) => Number.parseFloat(value) || 0;

export default function useActiveSection(ids, options = {}) {
  const {
    /* Sections present in the DOM with no entry of their own, mapped to the
       nearest one that does — so scrolling through them does not blank the
       highlight. */
    aliases = {},
    /* Above this scroll position the first section always wins, so the page
       does not open with nothing marked. */
    topId = null,
    topOffset = 80,
    /* Fraction of the viewport height a heading must be inside to win. */
    threshold = 0.5,
    interval = 100,
  } = options;

  const active = ref(topId || (unref(ids)[0] ?? null));

  let frame = 0;
  let timer = 0;
  let last = 0;
  let observer = null;

  const read = () => {
    frame = 0;
    last = Date.now();

    if (topId && window.scrollY < topOffset) {
      active.value = topId;
      return;
    }

    /* The id is ESCAPED: an engine slug can start with a digit, which is no
       valid `#` selector, and one throw stopped every read. A heading that
       renders no box reports a top of 0 — "just crossed" from anywhere on the
       page — so it takes no part. */
    const candidates = [...unref(ids), ...Object.keys(aliases)]
      .map((id) => {
        const el = document.querySelector(`#${CSS.escape(id)}`);
        return el && el.getClientRects().length > 0
          ? { id, el, top: el.getBoundingClientRect().top }
          : null;
      })
      .filter(Boolean)
      .sort((a, b) => a.top - b.top);

    if (candidates.length === 0) {
      return;
    }

    const root = document.documentElement;
    let winner = candidates.at(-1);
    if (window.scrollY < root.scrollHeight - window.innerHeight - 2) {
      const pad = px(getComputedStyle(root).scrollPaddingTop);
      const next = candidates.findIndex(({ el, top }) => {
        return top >= pad + px(getComputedStyle(el).scrollMarginTop) - GRACE;
      });
      if (next >= 0) {
        const below = candidates.at(next);
        winner = below.top <= window.innerHeight * threshold
          ? below
          : candidates.at(Math.max(0, next - 1));
      }
    }
    active.value = aliases[winner.id] ?? winner.id;
  };

  /* Leading edge on the first event, then at most one read per `interval`,
     and a trailing one that always lands after the last. */
  const schedule = () => {
    if (frame || timer) {
      return;
    }
    const wait = interval - (Date.now() - last);
    if (wait > 0) {
      timer = window.setTimeout(() => {
        timer = 0;
        frame = requestAnimationFrame(read);
      }, wait);
      return;
    }
    frame = requestAnimationFrame(read);
  };

  /* The article hands its list over after its own mount; a new list moves
     nothing, so no scroll would ever re-read it. */
  watch(() => unref(ids), schedule);

  onMounted(() => {
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule, { passive: true });
    if (typeof ResizeObserver === 'function') {
      observer = new ResizeObserver(schedule);
      observer.observe(document.body);
    }
    read();
  });

  onBeforeUnmount(() => {
    cancelAnimationFrame(frame);
    window.clearTimeout(timer);
    window.removeEventListener('scroll', schedule);
    window.removeEventListener('resize', schedule);
    if (observer) {
      observer.disconnect();
    }
  });

  return { active };
}
