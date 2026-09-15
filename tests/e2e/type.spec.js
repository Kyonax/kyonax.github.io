/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 */

/*
 * type.spec.js — the title hierarchy contract, measured on every device.
 *
 * THE DESKTOP SCALE WAS RIGHT AND THE PHONE SCALE WAS NOT, AND NOTHING COULD
 * SEE IT. Measured before this file existed, at 320–1023px: the article's own
 * <h1> was 24px while the engine's section headings under it stayed at their
 * fixed desktop 54px and 36px — every section outranked the page it sat in.
 * On the archive the page title, the lead title and the "All posts" band were
 * all 28.5px, though the stylesheet's own comment said the title outranks the
 * band. vitest runs under happy-dom, which computes no font sizes, and every
 * `check:*` gate reads source; a type scale only exists in a browser.
 *
 * FOUR CONTRACTS:
 *   1. The page title is the largest heading on the page, at every width.
 *   2. On the archive it strictly outranks the band title below it.
 *   3. Article body text never drops under the site's 15px reading floor.
 *   4. A date is content: the related-reading dates stay legible and start on
 *      the same edge as the text around them.
 */

import { expect, test } from '@playwright/test';

import { ROUTES, settle, WIDTHS } from './viewports.js';

const ARCHIVES = ROUTES.filter((r) => r.name.startsWith('archive'));
const ARTICLES = ROUTES.filter((r) => r.name.startsWith('article'));

/*
 * The RENDERED size of a heading: the largest font-size among the element and
 * its descendants that carry text. A heading's own font-size is not enough — the
 * engine sets its size on the element but the site's hero puts it on a span,
 * and either can be the one a reader sees.
 */
const headingSizes = (page, scope) => page.evaluate((scope) => {
  const root = document.querySelector(scope) || document.body;
  const visible = (el) => {
    if (el.closest('.sr-only, [aria-hidden="true"], .section-rail')) {
      return false;
    }
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  };
  const rendered = (el) => {
    let max = 0;
    for (const n of [el, ...el.querySelectorAll('*')]) {
      if ([...n.childNodes].some((c) => c.nodeType === 3 && c.textContent.trim())) {
        max = Math.max(max, Number.parseFloat(getComputedStyle(n).fontSize));
      }
    }
    return max;
  };
  return [...root.querySelectorAll('h1, h2, h3, h4, h5, h6')]
    .filter(visible)
    .map((el) => ({
      tag: el.tagName.toLowerCase(),
      cls: String(el.className || '').split(' ')[0],
      text: (el.textContent || '').trim().slice(0, 40),
      size: rendered(el),
    }));
}, scope);

/*
 * THREE TIERS, NOT TWO. The site's own scale has a medium tier, but it only
 * began at `md` (1024px), so every tablet — and a laptop window under 1024px —
 * read the blog at a phone's sizes: the owner saw "just two versions". The blog
 * now takes the medium tier from `sm` (768px). A title has to be larger on a
 * tablet than on a phone AND smaller than on a desktop, or there is no middle.
 */
const PHONE = 390;
const TABLETS = [768, 1024];
const DESKTOP = 1440;

const isSection = (h) => h.cls === 'org-heading'
  || (h.cls === 'ui-section-header__title' && h.tag === 'h2');

for (const route of [ARCHIVES[0], ARTICLES[0]]) {
  test(`${route.name}: a tablet reads between a phone and a desktop`, async ({ page }) => {
    const read = async (width) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(route.path);
      await settle(page);
      const heads = await headingSizes(page, 'main');
      return {
        width,
        title: heads.find((h) => h.tag === 'h1').size,
        section: heads.find(isSection).size,
      };
    };

    const phone = await read(PHONE);
    const desktop = await read(DESKTOP);
    for (const width of TABLETS) {
      const tablet = await read(width);
      for (const [label, at, low, high] of [
        ['title', tablet.title, phone.title, desktop.title],
        ['section', tablet.section, phone.section, desktop.section],
      ]) {
        expect(at, `${label} at ${width}px (${at}px) is no larger than a phone's ${low}px`).toBeGreaterThan(low);
        expect(at, `${label} at ${width}px (${at}px) is no smaller than a desktop's ${high}px`).toBeLessThan(high);
      }
    }
  });
}

for (const width of WIDTHS) {
  test.describe(`at ${width}px`, () => {
    test('the archive title outranks every heading under it', async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });

      for (const route of ARCHIVES) {
        await page.goto(route.path);
        await settle(page);

        const heads = await headingSizes(page, 'main');
        const h1 = heads.find((h) => h.tag === 'h1');
        expect(h1, `${route.path} has no visible <h1>`).toBeTruthy();

        for (const h of heads.filter((x) => x !== h1)) {
          expect(h.size, `${route.path}: <${h.tag}> "${h.text}" is ${h.size}px, above the ${h1.size}px title`)
            .toBeLessThanOrEqual(h1.size);
        }

        const band = heads.find((h) => h.tag === 'h2' && h.cls === 'ui-section-header__title');
        expect(band, `${route.path} lost its "All posts" band title`).toBeTruthy();
        expect(band.size, `${route.path}: the ${h1.size}px title does not outrank the ${band.size}px band "${band.text}"`)
          .toBeLessThan(h1.size);
      }
    });

    test('the article title outranks its own sections', async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });

      for (const route of ARTICLES) {
        await page.goto(route.path);
        await settle(page);

        const heads = await headingSizes(page, 'main');
        const h1 = heads.find((h) => h.tag === 'h1');
        expect(h1, `${route.path} has no visible <h1>`).toBeTruthy();

        for (const h of heads.filter((x) => x !== h1)) {
          expect(h.size, `${route.path}: <${h.tag}> "${h.text}" is ${h.size}px, above the ${h1.size}px title`)
            .toBeLessThanOrEqual(h1.size);
        }

        const body = await page.$eval('.org-root .org-paragraph', (p) => Number.parseFloat(getComputedStyle(p).fontSize));
        expect(body, `${route.path}: body text is ${body}px, under the 15px reading floor`)
          .toBeGreaterThanOrEqual(15);
      }
    });

    test('related-reading dates are legible and aligned', async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(ARTICLES[0].path);
      await settle(page);

      const m = await page.evaluate(() => {
        const textLeft = (el) => {
          const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
          let t = walker.nextNode();
          while (t && !t.textContent.trim()) {
            t = walker.nextNode();
          }
          const range = document.createRange();
          range.selectNodeContents(t);
          return range.getBoundingClientRect().left;
        };
        const heading = document.querySelector('.blog-post-nav__heading');
        const date = document.querySelector('.blog-post-nav__date');
        return date && heading
          ? {
            size: Number.parseFloat(getComputedStyle(date).fontSize),
            dateLeft: textLeft(date),
            headingLeft: textLeft(heading),
          }
          : null;
      });
      expect(m, 'the article rendered no related-reading date to measure').toBeTruthy();
      expect(m.size, `a related date is ${m.size}px — too small to read as content`)
        .toBeGreaterThanOrEqual(12);
      expect(
        Math.abs(m.dateLeft - m.headingLeft),
        `related dates start ${Math.round(m.dateLeft - m.headingLeft)}px off the "Related reading" edge`,
      ).toBeLessThanOrEqual(1);
    });
  });
}
