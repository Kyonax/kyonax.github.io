/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 */

/*
 * section-rail.spec.js — the chip in the corner has to NAME where the reader
 * is, and TAKE them where they asked.
 *
 * THE OWNER'S REVIEW, 2026-09-15: the chips "are not accurate working in some
 * pages, and they are not taking us properly where we want". The audit behind
 * this file measured the landing in both languages and four articles, in
 * Chromium and Firefox, at 390, 768 and 1280px. What it found, and what each
 * test below pins:
 *
 *   · THE WRONG NAME AFTER A GOOD LANDING. Every jump landed within half a
 *     pixel of the nav in both engines, and then the chip named another
 *     section: the spy's rule was "the last heading past the middle of the
 *     screen", and with a subsection shorter than half a screen two or three
 *     more headings are already past it. On the reference post 22 to 24 of
 *     its 37 presses read back a section further down the page — so to the
 *     reader the press had gone to the wrong place.
 *   · NOTHING ABOVE THE FIRST HEADING. Above an article's first heading no
 *     heading has crossed anything, and the old rule kept whatever it said
 *     last: after a trip to the bottom, the top of the page and Back to top
 *     both still read "13/13" on an article of thirteen sections.
 *   · A LIST THAT WAS NOT THE ARTICLE'S. It named every heading of every depth
 *     (37 on the reference post, whose own contents list 28), with the TODO
 *     keyword, priority and tags glued to the words: "DONEPick the slug and the
 *     date".
 *   · THE KEYBOARD. Escape from inside the list dropped focus on <body>, and
 *     the arrow keys did nothing.
 *
 * WHAT "LANDS" MEANS: the target's top on its landing line — the root's
 * scroll-padding-top plus its own scroll-margin-top, which is the sum the
 * browser uses for a fragment — to the pixel, unless the page has run out of
 * scroll in that direction. Measured once the page has been still for 300ms,
 * because the rail re-aims a jump that the page moved under.
 *
 * NO `page.route` HERE: it disables the HTTP cache. Umami is switched off the
 * way the site itself honours, through localStorage.
 */

import { expect, test } from '@playwright/test';

import { settle } from './viewports.js';

const SHAPES = [
  { name: 'landing', path: '/', top: 'hero' },
  { name: 'article with subsections', path: '/blog/engineering/2026-05-15-from-org-to-ast' },
  { name: 'reference article', path: '/blog/engineering/2026-08-13-everything-org2html-renders' },
  { name: 'Spanish article', path: '/es/blog/engineering/2026-08-14-publicar-un-sitio-estatico-que-siga-rapido' },
];

const SUBSECTIONS = SHAPES[1];
const REFERENCE = SHAPES[2];

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    try {
      localStorage.setItem('umami.disabled', '1');
    } catch { /* no storage on this document */ }
  });
});

// ------------------------------------------------------------- helpers ----

const CHIP = '.section-rail__chip';
const LINKS = '.section-rail__list a';

const visit = async (page, path, width = 1280) => {
  await page.setViewportSize({ width, height: 900 });
  await page.goto(path);
  await settle(page);
  await expect(page.locator('.section-rail')).toBeVisible();
};

const openList = async (page) => {
  const chip = page.locator(CHIP);
  if (await chip.getAttribute('aria-expanded') !== 'true') {
    await chip.click();
  }
  await expect(page.locator('.section-rail__list')).toBeVisible();
};

const closeList = async (page) => {
  const chip = page.locator(CHIP);
  if (await chip.getAttribute('aria-expanded') === 'true') {
    await chip.click();
  }
};

/* The entries, read with the list open: id, label and position. */
const entries = async (page) => {
  await openList(page);
  const list = await page.locator(LINKS).evaluateAll((links) => links.map((a) => ({
    id: decodeURIComponent(a.hash.slice(1)),
    label: a.textContent.trim(),
  })));
  await closeList(page);
  return list;
};

/* The chip's words as a screen reader gets them — the stable twin of the
   decoding span, so no test waits for an animation. */
const named = async (page) => ({
  label: (await page.locator(`${CHIP} .sr-only`).textContent()).trim(),
  count: (await page.locator('.section-rail__count').textContent()).replace(/\s+/g, ''),
});

/* Still for 300ms: the smooth scroll is over, and so is any re-aim after it. */
const untilStill = async (page) => {
  let last = null;
  let same = 0;
  for (let i = 0; i < 160 && same < 6; i += 1) {
    const y = await page.evaluate(() => window.scrollY);
    same = y === last ? same + 1 : 0;
    last = y;
    await page.waitForTimeout(50);
  }
};

const scrollTo = async (page, y) => {
  await page.evaluate((top) => window.scrollTo({ top, behavior: 'instant' }), y);
  await page.waitForTimeout(350);
};

/* Where the target sits against its landing line, and whether the page could
   have put it any closer. */
const landing = (page, id) => page.evaluate((target) => {
  const px = (v) => Number.parseFloat(v) || 0;
  const el = document.querySelector(`#${CSS.escape(target)}`);
  const line = px(getComputedStyle(document.documentElement).scrollPaddingTop)
    + px(getComputedStyle(el).scrollMarginTop);
  const max = document.documentElement.scrollHeight - window.innerHeight;
  const off = el.getBoundingClientRect().top - line;
  return {
    off: Math.round(off * 10) / 10,
    lands: Math.abs(off) <= 1
      || (window.scrollY >= max - 1 && off > 0)
      || (window.scrollY <= 1 && off < 0),
    focused: document.activeElement === el,
    y: Math.round(window.scrollY),
    landingY: Math.max(0, Math.min(max, el.getBoundingClientRect().top + window.scrollY - line)),
  };
}, id);

// --------------------------------------------------------------- tests ----

for (const shape of SHAPES) {
  test(`${shape.name}: the list is the page's own, in page order, and every entry has a target @firefox`, async ({ page }) => {
    await visit(page, shape.path);
    const list = await entries(page);
    expect(list.length, 'the rail lists fewer than two sections').toBeGreaterThan(1);

    const facts = await page.evaluate((ids) => {
      const missing = [];
      const backwards = [];
      const words = [];
      let prev = null;
      for (const id of ids) {
        const el = document.querySelector(`#${CSS.escape(id)}`);
        if (!el || el.getClientRects().length === 0) {
          missing.push(id);
          words.push(null);
          continue;
        }
        if (prev && (prev.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_PRECEDING)) {
          backwards.push(id);
        }
        prev = el;
        words.push((el.querySelector('.org-heading-text') || el).textContent.trim());
      }
      const toc = document.querySelector('.blog-rich .org-toc');
      return {
        missing,
        backwards,
        words,
        toc: toc ? [...toc.querySelectorAll('a[href^="#"]')].map((a) => decodeURIComponent(a.hash.slice(1))) : null,
      };
    }, list.map((e) => e.id));

    expect(facts.missing, 'entries whose target is missing or renders no box').toEqual([]);
    expect(facts.backwards, 'entries listed before a section that comes earlier on the page').toEqual([]);
    const [, total] = (await named(page)).count.split('/');
    expect(total, 'the count is not out of the entries listed').toBe(String(list.length));

    if (!shape.top) {
      /* THE ARTICLE'S CONTENTS ARE THE LIST: the same ids, in the same order,
         at the depth the author chose — not every heading down to h6. */
      if (facts.toc) {
        expect(list.map((e) => e.id), 'the rail and the article\'s own contents disagree').toEqual(facts.toc);
      }
      /* The heading's words alone, not its TODO keyword, priority and tags. */
      expect(list.map((e) => e.label), 'a label is not its heading\'s text').toEqual(facts.words);
    }
  });

  test(`${shape.name}: every entry lands under the nav, and the chip then names it @firefox`, async ({ page }) => {
    test.setTimeout(180_000);
    await visit(page, shape.path);
    const list = await entries(page);
    const wrong = [];

    for (const [i, entry] of list.entries()) {
      await openList(page);
      await page.locator(LINKS).nth(i).click();
      await untilStill(page);
      const at = await landing(page, entry.id);
      const chip = await named(page);
      if (!at.lands) {
        wrong.push(`${entry.id}: its top is ${at.off}px off its landing line`);
      }
      if (chip.label !== entry.label || chip.count !== `${i + 1}/${list.length}`) {
        wrong.push(`${entry.id}: the chip reads "${chip.count} · ${chip.label}"`);
      }
      if (!at.focused) {
        wrong.push(`${entry.id}: focus did not move to the section`);
      }
    }
    expect(wrong, 'presses that did not land, or read back another section').toEqual([]);
  });

  test(`${shape.name}: the chip names the section in view — at every heading, at the top and at the bottom @firefox`, async ({ page }) => {
    test.setTimeout(120_000);
    await visit(page, shape.path);
    const list = await entries(page);
    const first = shape.top ? list.find((e) => e.id === shape.top) : list[0];
    const wrong = [];

    for (const entry of list) {
      const { landingY } = await landing(page, entry.id);
      await scrollTo(page, landingY);
      const at = await landing(page, entry.id);
      /* A heading the page cannot scroll up to its line (the end of the page
         belongs to the last section) proves nothing here. */
      if (at.lands && Math.abs(at.off) <= 1) {
        const chip = await named(page);
        if (chip.label !== entry.label) {
          wrong.push(`at ${entry.id} the chip reads "${chip.label}"`);
        }
      }
    }

    await scrollTo(page, 1e7);
    const bottom = await named(page);
    if (bottom.label !== list.at(-1).label) {
      wrong.push(`at the very bottom the chip reads "${bottom.label}", not the last section`);
    }

    /* The round trip: the top of the page after the bottom of it. */
    await scrollTo(page, 0);
    const top = await named(page);
    if (top.label !== first.label) {
      wrong.push(`back at the top the chip reads "${top.label}"`);
    }
    expect(wrong).toEqual([]);
  });
}

test('the article on a phone: every entry lands and is named @firefox', async ({ page }) => {
  test.setTimeout(120_000);
  await visit(page, SUBSECTIONS.path, 390);
  const list = await entries(page);
  const wrong = [];
  for (const [i, entry] of list.entries()) {
    await openList(page);
    await page.locator(LINKS).nth(i).click();
    await untilStill(page);
    const at = await landing(page, entry.id);
    const chip = await named(page);
    if (!at.lands || chip.label !== entry.label) {
      wrong.push(`${entry.id}: ${at.off}px off, the chip reads "${chip.label}"`);
    }
  }
  expect(wrong).toEqual([]);
});

/* A scroll that ends inside the spy's 100ms window used to be dropped with
   nothing scheduled after it. A fresh scroll event makes the spy read again;
   an up-to-date chip does not change when it does. */
test('the chip is current once a wheel flick stops @firefox', async ({ page }) => {
  await visit(page, SUBSECTIONS.path);
  await page.mouse.move(640, 400);
  const stale = [];
  for (let flick = 0; flick < 8; flick += 1) {
    for (let step = 0; step < 3 + (flick % 3); step += 1) {
      await page.mouse.wheel(0, 240);
      await page.waitForTimeout(16);
    }
    await untilStill(page);
    const settled = await named(page);
    await page.evaluate(() => window.dispatchEvent(new Event('scroll')));
    await page.waitForTimeout(300);
    const reread = await named(page);
    if (settled.label !== reread.label) {
      stale.push(`at y=${await page.evaluate(() => Math.round(window.scrollY))} the chip read "${settled.label}" until the next scroll made it "${reread.label}"`);
    }
  }
  expect(stale).toEqual([]);
});

/* The second press starts while the first smooth scroll is still running —
   a second programmatic scroll Chromium can drop. It has to land, and be the
   one the chip names. */
test('a rapid second press lands the second entry @firefox', async ({ page }) => {
  await visit(page, SUBSECTIONS.path);
  const list = await entries(page);
  const pairs = [[list.length - 1, 1], [1, list.length - 1], [6, 7]];
  const wrong = [];
  for (const [a, b] of pairs) {
    const [from, to] = [list.at(a), list.at(b)];
    await scrollTo(page, 0);
    await openList(page);
    await page.locator(LINKS).nth(a).click();
    await openList(page);
    await page.locator(LINKS).nth(b).click();
    await untilStill(page);
    const at = await landing(page, to.id);
    const chip = await named(page);
    if (!at.lands || chip.label !== to.label) {
      wrong.push(`${from.id} then ${to.id}: ${at.off}px off, the chip reads "${chip.label}"`);
    }
  }
  expect(wrong).toEqual([]);
});

/* On the reference post the old spy named nothing above the first heading, so
   the chip arrived at the top still naming whichever section it had last read
   on the way up: "A fourth-level heading", "Paragraph furniture", "An archived
   subtree", depending on the engine and the width. */
test('Back to top goes to the top and names the first section @firefox', async ({ page }) => {
  await visit(page, REFERENCE.path);
  const list = await entries(page);
  await scrollTo(page, 1e7);
  await page.locator('.section-rail__top').click();
  await untilStill(page);
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
  expect((await named(page)).label).toBe(list[0].label);
});

/* The list scrolls inside its own box; it has to open on the reader's entry,
   not on its first rows. */
test('a long list opens with the marked entry in sight @firefox', async ({ page }) => {
  await visit(page, REFERENCE.path);
  await scrollTo(page, 1e7);
  await openList(page);
  const view = await page.evaluate(() => {
    const panel = document.querySelector('.section-rail__list');
    const here = panel.querySelector('[aria-current]');
    if (!here) {
      return 'no entry is marked';
    }
    const p = panel.getBoundingClientRect();
    const h = here.getBoundingClientRect();
    return h.top >= p.top - 1 && h.bottom <= p.bottom + 1 ? 'in sight' : `hidden ${Math.round(h.top - p.bottom)}px below the list's fold`;
  });
  expect(view).toBe('in sight');
});

test('keyboard: open, walk with the arrows, Escape gives focus back to the chip, Enter jumps @firefox', async ({ page }) => {
  await visit(page, SUBSECTIONS.path);
  const list = await entries(page);
  const focus = () => page.evaluate(() => {
    const a = document.activeElement;
    if (!a || a === document.body) {
      return 'body';
    }
    if (a.matches('.section-rail__chip')) {
      return 'chip';
    }
    return a.closest('.section-rail__list') ? decodeURIComponent(a.hash.slice(1)) : a.id || a.tagName;
  });

  await page.locator(CHIP).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator(CHIP)).toHaveAttribute('aria-expanded', 'true');

  /* Up from the chip is the entry right above it — the last; Down steps and
     wraps; Home and End go to the ends. */
  await page.keyboard.press('ArrowUp');
  expect(await focus(), 'ArrowUp from the chip').toBe(list.at(-1).id);
  await page.keyboard.press('ArrowDown');
  expect(await focus(), 'ArrowDown from the last entry wraps to the first').toBe(list[0].id);
  await page.keyboard.press('ArrowDown');
  expect(await focus(), 'ArrowDown steps').toBe(list[1].id);
  await page.keyboard.press('End');
  expect(await focus(), 'End').toBe(list.at(-1).id);
  await page.keyboard.press('Home');
  expect(await focus(), 'Home').toBe(list[0].id);

  await page.keyboard.press('Escape');
  await expect(page.locator(CHIP)).toHaveAttribute('aria-expanded', 'false');
  expect(await focus(), 'Escape from the list left focus nowhere').toBe('chip');

  await page.keyboard.press('Enter');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await untilStill(page);
  const at = await landing(page, list[1].id);
  expect(at.lands, `Enter on an entry left it ${at.off}px off its line`).toBe(true);
  expect(await focus(), 'Enter moved focus to the section').toBe(list[1].id);
});
