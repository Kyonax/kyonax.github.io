/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 */

/*
 * use-section-nav.js — everything the section navigator DOES, so the widget
 * only has to decide what it LOOKS like.
 *
 * It was written to hold six competing designs to one behaviour while they were
 * being compared, so that the comparison measured the designs rather than their
 * bugs. One design was kept — the chip — and everything the others needed is
 * deleted with them: the pointer-proximity reveal that opened a rail when the
 * cursor neared the right edge, its coarse-pointer fallback, and the focus
 * in/out pair that stood in for hover on a keyboard. A button needs none of it.
 *
 * The scroll-spy is delegated to `use-active-section`, which `hud-nav` also
 * reads, so the nav bar and the chip can never disagree about where the reader
 * is. That sharing is the reason this stays a composable rather than folding
 * into the widget.
 *
 * THE PRESS WINS UNTIL THE READER MOVES. After a jump the chip names the entry
 * that was pressed, whatever the spy says, until the page is scrolled away from
 * where the jump came to rest. The spy agrees on nearly every landing; the
 * exception is a section near the end of the page, which cannot be scrolled up
 * to the line, so the end-of-page rule would hand the chip to the LAST section
 * the moment the reader arrived at the one they asked for. It also holds the
 * label still for the flight instead of boiling through every section passed.
 *
 * A JUMP IS CHECKED WHERE IT ENDS. `html { scroll-behavior: smooth }` animates
 * it; a second programmatic scroll started while one is running can be dropped
 * (Chromium did it to fragment navigations, 2026-09-15); and the blog's
 * deferred stylesheets can move a target for 100–300ms after load. So the
 * landing is measured when it is needed, never cached, the scroll is started
 * with an explicit behaviour, and when it stops — `scrollend` where the engine
 * has it, 150ms without a scroll event either way — the landing is measured
 * again and re-aimed, three aims at the most. A wheel, a touch or a scrolling
 * key hands the page back to the reader at once.
 */

import useActiveSection from '@composables/use-active-section';
import { computed, onBeforeUnmount, onMounted, ref, unref } from 'vue';

/* What hands a page in flight back to the reader: a wheel, a touch, or a key
   that scrolls. Tab or Escape during a flight is not the reader taking over. */
const TAKEOVER = ['wheel', 'touchstart'];
const SCROLL_KEYS = ['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' '];

/* How far the page may move after a landing before the press stops holding the
   chip: more than a rounding error or a late image, less than a nudge. */
const HOLD_SLACK = 8;
const QUIET_MS = 150;
const AIMS = 3;

const px = (value) => Number.parseFloat(value) || 0;

export default function useSectionNav(sections, options = {}) {
  const { topId = null } = options;

  /* Accept a getter, a ref or a plain array. `unref` alone returns a getter
     unchanged, which then has no `.map` — the shape has to be resolved here or
     every caller has to remember which one this expects. */
  const list = () => (typeof sections === 'function' ? sections() : unref(sections)) || [];

  const ids = computed(() => list().map((s) => s.id));
  const { active: spied } = useActiveSection(ids, { topId });

  const held = ref(null);
  const active = computed(() => held.value || spied.value);

  const open = ref(false);

  const reduced = () => typeof window !== 'undefined'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Where a jump to `el` comes to rest — the sum the browser uses for a
     fragment: the root's scroll-padding-top plus the target's own
     scroll-margin-top — clamped to what the page can scroll. No `el` is the
     top of the page. */
  const landingY = (el) => {
    const root = document.documentElement;
    const y = el
      ? el.getBoundingClientRect().top + window.scrollY
        - px(getComputedStyle(root).scrollPaddingTop)
        - px(getComputedStyle(el).scrollMarginTop)
      : 0;
    return Math.min(Math.max(0, y), root.scrollHeight - window.innerHeight);
  };

  /* The jump in flight — ONE at a time, so a second press re-aims the flight
     rather than queueing behind the first or being dropped by it — and `rest`,
     where the last one stopped, which the hold is measured against. */
  let flying = false;
  let target = null;
  let aims = 0;
  let quiet = 0;
  let rest = 0;

  const aim = () => {
    const y = landingY(target);
    if (Math.abs(window.scrollY - y) <= 1) {
      return true;
    }
    window.scrollTo({ top: y, behavior: reduced() ? 'instant' : 'smooth' });
    return false;
  };

  const land = () => {
    window.clearTimeout(quiet);
    flying = false;
    rest = window.scrollY;
  };

  /* A scroll moved the page: during a flight, wait for it to go quiet; after
     one, let the spy speak again once the reader has moved away. */
  const onScroll = () => {
    if (flying) {
      window.clearTimeout(quiet);
      quiet = window.setTimeout(check, QUIET_MS);
    } else if (held.value && Math.abs(window.scrollY - rest) > HOLD_SLACK) {
      held.value = null;
    }
  };

  /* The page stopped: arrived, or re-aim at where the target is NOW. */
  function check() {
    if (!flying) {
      return;
    }
    aims -= 1;
    if (aim() || aims <= 0) {
      land();
    } else {
      onScroll();
    }
  }

  const takeover = () => {
    if (flying) {
      land();
      held.value = null;
    }
  };

  /* Escape closes the list wherever focus happens to be — including when it is
     still on the page behind it, which is where a mouse user leaves it. A key
     the rail's own list already handled is not a scroll. */
  const onKeydown = (event) => {
    if (event.key === 'Escape') {
      open.value = false;
    } else if (!event.defaultPrevented && SCROLL_KEYS.includes(event.key)) {
      takeover();
    }
  };

  const fly = (el, id) => {
    held.value = id;
    target = el;
    aims = AIMS;
    flying = true;
    onScroll();
    aim();
  };

  /*
   * Follow the anchor ourselves so the scroll can honour reduced motion, land
   * where it was aimed and move focus with it — a link that scrolls the page
   * but leaves the keyboard behind has only done half its job. Falling through
   * to the browser when the target is missing, or renders no box, keeps the
   * plain `href` honest. The id is escaped because an engine slug can begin
   * with a digit, which is no valid `#` selector.
   *
   * THE ORDER IS LOAD-BEARING. Focus moves before the list closes, so the
   * widget does not hand it back to the chip; the flight is named before the
   * list closes, so the widget's close — which decodes at once — runs after
   * the label's own change, which would otherwise boil it first.
   */
  const go = (event, id) => {
    const el = document.querySelector(`#${CSS.escape(id)}`);
    if (!el || el.getClientRects().length === 0) {
      return;
    }
    event.preventDefault();
    el.setAttribute('tabindex', '-1');
    el.focus({ preventScroll: true });
    fly(el, id);
    open.value = false;
  };

  /*
   * The document top is NOT a section, so it cannot be reached through `go`.
   * `topId` names a real element on the landing (the hero) but nothing on an
   * article, where the first heading is already some way down the page —
   * which is exactly why the runtime's own back-to-top button existed.
   * Scroll to zero either way and let focus stay on the control, which is
   * fixed and so does not move out from under the reader. The chip names the
   * first entry for the flight, the way a press names its own.
   */
  const toTop = () => {
    fly(null, topId || ids.value[0] || null);
    open.value = false;
  };

  const position = computed(() => {
    const items = list();
    const i = items.findIndex((s) => s.id === active.value);
    return { index: i < 0 ? 0 : i, total: items.length };
  });

  onMounted(() => {
    document.addEventListener('keydown', onKeydown);
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('scrollend', check);
    for (const type of TAKEOVER) {
      window.addEventListener(type, takeover, { capture: true, passive: true });
    }
  });

  onBeforeUnmount(() => {
    land();
    document.removeEventListener('keydown', onKeydown);
    window.removeEventListener('scroll', onScroll);
    window.removeEventListener('scrollend', check);
    for (const type of TAKEOVER) {
      window.removeEventListener(type, takeover, true);
    }
  });

  return { active, open, go, toTop, position, reduced };
}
