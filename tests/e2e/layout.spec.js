/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 */

/*
 * layout.spec.js — the horizontal-space contract, measured.
 *
 * THIS FILE EXISTS BECAUSE THE SAME DEFECT CAME BACK TWICE. Both times the
 * fix was a padding value someone eyeballed, and both times something else
 * cancelled it: a negative margin equal and opposite to the padding, clipped
 * by an `overflow: hidden` on the sheet, so the net inset was zero while the
 * stylesheet read as though it were 15px. A rule can look right and measure
 * wrong. These assertions measure.
 *
 * FOUR CONTRACTS:
 *   1. No page scrolls sideways. Ever, at any width.
 *   2. Text keeps a real distance from the viewport edge — not a padding that
 *      something else takes back.
 *   3. The section rail sits inside the viewport and does not cover a link.
 *   4. The blog hero's moving parts — the marquee and the galaxy — are clipped
 *      by their own boxes, and the chip keeps its inset inside the panel.
 */

import { expect, test } from '@playwright/test';

import { ROUTES, settle, WIDTHS } from './viewports.js';

/*
 * The gutter the site promises. `.doc` steps 1.25rem → 2rem → 2.5rem across
 * the breakpoints on a 12px root, so the floor is 15px; assert a little under
 * it so a sub-pixel rounding difference is not a failure, but a cancelled
 * padding (which lands at 0) always is.
 */
const MIN_INSET = 12;

/** Elements whose TEXT must never sit on the page edge, per route kind. */
const TEXT_SELECTORS = {
  '/blog/': ['.blog-all__title', '.blog-all__excerpt', '.blog-search__field'],
  '/es/blog/': ['.blog-all__title', '.blog-all__excerpt', '.blog-search__field'],
  article: ['.blog-post-nav__list a', '.doc__title', '.org-root .org-paragraph', '.blog-post__tags a'],
};

/*
 * The hero's two moving parts, each paired with the box that has to clip it.
 * The marquee's track is two copies of its text wide and slides left for
 * ever; the galaxy is 96 characters at a fixed size, wider than a small
 * phone's column. Both may outgrow the page only because their OWN box clips
 * them. The board's `overflow: hidden` further out keeps `scrollWidth` honest
 * on its own — so the sideways-scroll test above passes either way — while an
 * unclipped marquee paints straight through the gutter to the sheet's edge.
 */
const CLIPPED = [
  ['.blog-marquee__track', '.blog-marquee'],
  ['pre.ascii-galaxy', '.blog-hero__panel'],
];

/* The chip sits in the panel's corner, and its text keeps the design's 12px of
   air from the panel's edge. */
const CHIP_INSET = 12;

/* The site appends the Umami tracker after mount. The hero checks answer it
   with an empty script and abort every other Umami request, as
   analytics.spec.js does, so they never reach the network or the dashboard. */
const UMAMI_HOST = /(^|\.)umami\.(is|dev)$/;
const answerUmami = (page) => page.route((url) => UMAMI_HOST.test(url.hostname), (route) => (
  new URL(route.request().url()).pathname === '/script.js'
    ? route.fulfill({ status: 200, contentType: 'application/javascript', body: '' })
    : route.abort()
));

for (const width of WIDTHS) {
  test.describe(`at ${width}px`, () => {
    for (const route of ROUTES) {
      test(`${route.name} does not scroll sideways`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(route.path);
        await settle(page);

        const { scrollWidth, clientWidth, widest } = await page.evaluate(() => {
          const d = document.documentElement;
          /* Name the widest offender so a failure says WHAT overflowed, not
             just that something did. An element inside a scroller is fine —
             that is what the scroller is for — so skip those. */
          const scrolled = (el) => {
            for (let p = el.parentElement; p; p = p.parentElement) {
              const ox = getComputedStyle(p).overflowX;
              if (ox === 'auto' || ox === 'scroll') {
                return true;
              }
            }
            return false;
          };
          let worst = null;
          for (const el of document.querySelectorAll('body *')) {
            const r = el.getBoundingClientRect();
            if (r.right > d.clientWidth + 1 && !scrolled(el)) {
              if (!worst || r.right > worst.right) {
                worst = {
                  right: Math.round(r.right),
                  tag: el.tagName.toLowerCase(),
                  cls: String(el.className || '').slice(0, 60),
                };
              }
            }
          }
          return { scrollWidth: d.scrollWidth, clientWidth: d.clientWidth, widest: worst };
        });

        expect(
          scrollWidth,
          `${route.path} overflows by ${scrollWidth - clientWidth}px`
            + `${widest ? ` — widest: <${widest.tag} class="${widest.cls}"> reaching ${widest.right}px` : ''}`,
        ).toBeLessThanOrEqual(clientWidth + 1);
      });
    }

    test('blog text keeps a real gutter', async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });

      for (const path of ['/blog/', '/es/blog/']) {
        await page.goto(path);
        await settle(page);

        for (const selector of TEXT_SELECTORS[path]) {
          const boxes = await page.$$eval(selector, (els) => els.map((el) => {
            const r = el.getBoundingClientRect();
            return { left: r.left, right: r.right };
          }));
          expect(boxes.length, `${path} ${selector} rendered nothing to measure`)
            .toBeGreaterThan(0);

          for (const box of boxes) {
            expect(box.left, `${path} ${selector} left edge sits ${Math.round(box.left)}px from the viewport`)
              .toBeGreaterThanOrEqual(MIN_INSET);
            expect(width - box.right, `${path} ${selector} right edge sits ${Math.round(width - box.right)}px from the viewport`)
              .toBeGreaterThanOrEqual(MIN_INSET);
          }
        }
      }
    });

    test('article text keeps a real gutter', async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(ROUTES[3].path);
      await settle(page);

      for (const selector of TEXT_SELECTORS.article) {
        const boxes = await page.$$eval(selector, (els) => els.slice(0, 6).map((el) => {
          const r = el.getBoundingClientRect();
          return { left: r.left, right: r.right };
        }));
        expect(boxes.length, `${selector} rendered nothing to measure`).toBeGreaterThan(0);

        for (const box of boxes) {
          expect(box.left, `${selector} left edge sits ${Math.round(box.left)}px from the viewport`)
            .toBeGreaterThanOrEqual(MIN_INSET);
          expect(width - box.right, `${selector} right edge sits ${Math.round(width - box.right)}px from the viewport`)
            .toBeGreaterThanOrEqual(MIN_INSET);
        }
      }
    });

    test('the section rail stays inside the viewport and covers no link', async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(ROUTES[3].path);
      await settle(page);

      const rail = page.locator('.section-rail');
      await expect(rail).toBeVisible();

      const box = await rail.boundingBox();
      expect(box.x, 'the rail hangs off the left edge').toBeGreaterThanOrEqual(0);
      expect(box.x + box.width, 'the rail hangs off the right edge')
        .toBeLessThanOrEqual(width + 1);

      /* At the very bottom of the page the rail shares the corner with the
         footer. A fixed control that covers a link is a control that costs a
         click. */
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(250);

      const covered = await page.evaluate(() => {
        const r = document.querySelector('.section-rail').getBoundingClientRect();
        return [...document.querySelectorAll('.site-footer a, .blog-footer a')]
          .filter((a) => {
            const b = a.getBoundingClientRect();
            return b.width > 0 && !(b.right < r.left || b.left > r.right
              || b.bottom < r.top || b.top > r.bottom);
          })
          .map((a) => (a.textContent || '').trim().slice(0, 30));
      });
      expect(covered, `the rail covers footer link(s): ${covered.join(', ')}`).toEqual([]);
    });

    test('the marquee and the galaxy stay inside the boxes that clip them', async ({ page }) => {
      await answerUmami(page);
      await page.setViewportSize({ width, height: 900 });

      for (const path of ['/blog/', '/es/blog/']) {
        await page.goto(path);
        await settle(page);

        const parts = await page.evaluate((pairs) => {
          const clips = (el) => {
            const cs = getComputedStyle(el);
            return ['hidden', 'clip'].includes(cs.overflowX) || /paint|strict|content/.test(cs.contain);
          };
          return pairs.map(([selector, within]) => {
            const el = document.querySelector(selector);
            const box = el && el.closest(within);
            if (!box) {
              return { selector, within, missing: true };
            }
            /* A box that lets its content spill paints as far as the content
               reaches; every clipping box from it up to its container cuts
               that back. The sheet beyond the container does not count. */
            const r = el.getBoundingClientRect();
            let right = clips(el) ? r.right : Math.max(r.right, r.left + el.scrollWidth);
            for (let p = el.parentElement; p && p !== box.parentElement; p = p.parentElement) {
              if (clips(p)) {
                right = Math.min(right, p.getBoundingClientRect().right);
              }
            }
            return {
              selector,
              within,
              missing: false,
              right: Math.round(right),
              edge: Math.round(box.getBoundingClientRect().right),
              viewport: document.documentElement.clientWidth,
            };
          });
        }, CLIPPED);

        for (const part of parts) {
          expect(part.missing, `${path} renders no ${part.selector} inside ${part.within}`).toBe(false);
          expect(part.edge, `${path} ${part.within} reaches ${part.edge}px, past the ${part.viewport}px viewport`)
            .toBeLessThanOrEqual(part.viewport + 1);
          expect(
            part.right,
            `${path} ${part.selector} paints to ${part.right}px, past its ${part.within} edge at ${part.edge}px — nothing inside it clips`,
          ).toBeLessThanOrEqual(part.edge + 1);
        }
      }
    });

    test('the hero chip keeps its inset inside the galaxy panel', async ({ page }) => {
      await answerUmami(page);
      await page.setViewportSize({ width, height: 900 });

      for (const path of ['/blog/', '/es/blog/']) {
        await page.goto(path);
        await settle(page);

        const m = await page.evaluate(() => {
          const chip = document.querySelector('.blog-hero__chip');
          const panel = chip && chip.closest('.blog-hero__panel');
          if (!panel) {
            return null;
          }
          /* The chip's content box AND its text, whichever starts further
             left: a padding that a negative margin inside takes back moves the
             text, not the box. */
          const cs = getComputedStyle(chip);
          const c = chip.getBoundingClientRect();
          const range = document.createRange();
          range.selectNodeContents(chip);
          const text = range.getBoundingClientRect();
          const p = panel.getBoundingClientRect();
          const content = c.left + Number.parseFloat(cs.borderLeftWidth) + Number.parseFloat(cs.paddingLeft);
          return { inset: Math.min(content, text.left) - p.left, spill: text.right - p.right };
        });

        expect(m, `${path} renders no .blog-hero__chip inside .blog-hero__panel`).not.toBeNull();
        expect(m.inset, `${path} the chip starts ${m.inset.toFixed(1)}px inside the panel, under its ${CHIP_INSET}px inset`)
          .toBeGreaterThanOrEqual(CHIP_INSET - 0.5);
        expect(m.spill, `${path} the chip runs ${Math.round(m.spill)}px past the panel's right edge, where the panel clips it`)
          .toBeLessThanOrEqual(0.5);
      }
    });
  });
}
