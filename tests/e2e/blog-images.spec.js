/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 */

/*
 * blog-images.spec.js — the archive's lead and card pictures: which file a
 * reader's browser is offered, which one it takes, and what that costs.
 *
 * ONE RASTER FOR EVERY COLUMN WAS THE DEFECT. Each post's cover shipped as its
 * 1280px original whatever box it sat in, so a 390px phone paid 1.5 MB of PNG
 * for a lead drawn 340px wide, and Lighthouse mobile listed 1,748 KiB of image
 * savings on /blog. scripts/convert-images.mjs now cuts every blog source at
 * 480, 720 and 960px as well, in AVIF and WebP, and blog-picture.vue offers
 * the steps with a `sizes` that states each place's real column.
 *
 * TWO KINDS OF READ, as in archive.spec.js: the markup is a fact about the
 * prerendered FILE, read from dist/ and handed to the browser's own parser;
 * which candidate wins and what it weighs are facts about a RUNNING page.
 *
 * NO page.route: it turns the HTTP cache off for the whole context. Umami is
 * silenced by its own opt-out flag instead.
 *
 * WRITTEN RED. Against the archive before this change every picture is a bare
 * <img> of the original raster: no <picture>, no AVIF or WebP source, no
 * srcset and no sizes, so the markup and the `sizes` tests fail on what is
 * missing; at 390px the lead and the first card each fetch a 1280px PNG,
 * almost four times their box; and page 1 costs 1,740,265 bytes of images
 * against the budget below.
 */

import { existsSync, readFileSync } from 'node:fs';

import { expect, test } from '@playwright/test';

import { settle } from './viewports.js';

const ARCHIVES = [
  { locale: 'en', path: '/blog' },
  { locale: 'es', path: '/es/blog' },
];
const [EN] = ARCHIVES;

/* Every picture the archive shows: the lead's media-only frame, and the frame
   of each card in the row under it. Page 1 only — no later page has either. */
const PICTURES = 'article.blog-lead .blog-card__frame img, ul.blog-recent .blog-card__frame img';

/* The first width convert-images.mjs cuts. A source no wider than it has no
   smaller step to offer, so its srcset may hold the original alone. */
const SMALLEST_STEP = 480;

/*
 * THE BUDGET, derived from the measurement of 2026-09-15. At 390px and 1x
 * the production page 1 (the lead and three cards) fetches the four 480px
 * AVIFs: 27,864 bytes for the one photographic cover and 5,536 to 6,484 for
 * each diagram, 45,957 in all. The paged review build shows two cards, 39,473.
 * 96 KiB is twice that with room to spare: a second photographic cover still
 * fits, while a single full-size file does not — the lead's 1280px AVIF alone
 * is 176,966 bytes and its PNG 1,575,747. The page cost 1,740,265 before.
 */
const BUDGET = 96 * 1024;

const ROOT = new URL('../../', import.meta.url);
const read = (url) => (existsSync(url) ? readFileSync(url, 'utf8') : null);

/* What the prerender shipped for an archive, parsed without running a script:
   the page a crawler, or a reader with JavaScript off, receives. */
const prerendered = (path) => {
  const html = read(new URL(`dist${path}/index.html`, ROOT));
  expect(html, `dist${path}/index.html does not exist — build the site first`).not.toBeNull();
  return html;
};

/* The rich index the build synced, read from disk and never imported (it is
   generated and gitignored): whether page 1 of a locale has any post with a
   card image, so "no picture" is only ever a pass when there is none to show. */
const INDEX = (() => {
  const url = new URL('src/data/blog/index.json', ROOT);
  try {
    return existsSync(url) ? JSON.parse(readFileSync(url, 'utf8')) : {};
  } catch {
    return {};
  }
})();
const pictured = (locale) => {
  const first = (new Map(Object.entries(INDEX.pages || {})).get(locale) || [])
    .find((p) => p.number === 1);
  const posts = new Map((INDEX.posts || []).map((p) => [p.url, p]));
  return (first ? first.items : []).some((url) => posts.get(url) && posts.get(url).cardImage);
};

/* `url 480w, url 720w` as [{ url, w }]. */
const candidates = (srcset) => String(srcset || '').split(',')
  .map((c) => c.trim().split(/\s+/))
  .filter((parts) => parts[0])
  .map(([url, descriptor = '']) => ({ url, w: Number((descriptor.match(/^(\d+)w$/) || [])[1]) || null }));

/* Storage can throw on about:blank, hence the guard (analytics.spec.js). */
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    try {
      localStorage.setItem('umami.disabled', '1');
    } catch { /* no storage on this document */ }
  });
});

/*
 * Bring every archive picture into view, one at a time, and wait until each
 * has finished: the cards are lazy, and a card that never came near the
 * viewport would otherwise be counted as costing nothing.
 */
const loadAll = async (page) => {
  const imgs = page.locator(PICTURES);
  const count = await imgs.count();
  for (let i = 0; i < count; i += 1) {
    await imgs.nth(i).scrollIntoViewIfNeeded();
    await expect.poll(() => imgs.nth(i).evaluate((img) => img.complete && img.naturalWidth > 0), {
      message: `archive picture ${i + 1} never finished loading`,
    }).toBe(true);
  }
  return count;
};

/* ── What the prerender ships ────────────────────────────────────────────── */

for (const { locale, path } of ARCHIVES) {
  test(`${path}: every lead and card picture ships AVIF and WebP srcsets, a sizes and a sized <img>`, async ({ page }) => {
    const found = await page.evaluate(([src, selector]) => {
      const doc = new DOMParser().parseFromString(src, 'text/html');
      return [...doc.querySelectorAll(selector)].map((img) => {
        const pic = img.parentElement && img.parentElement.tagName === 'PICTURE' ? img.parentElement : null;
        const source = (type) => {
          const s = pic ? pic.querySelector(`source[type="${type}"]`) : null;
          return s ? { srcset: s.getAttribute('srcset') || '', sizes: s.getAttribute('sizes') || '' } : null;
        };
        return {
          place: img.closest('.blog-lead') ? 'lead' : 'card',
          picture: Boolean(pic),
          avif: source('image/avif'),
          webp: source('image/webp'),
          src: img.getAttribute('src') || '',
          width: Number(img.getAttribute('width')) || 0,
          height: Number(img.getAttribute('height')) || 0,
          loading: img.getAttribute('loading'),
          priority: img.getAttribute('fetchpriority'),
        };
      });
    }, [prerendered(path), PICTURES]);

    if (pictured(locale)) {
      expect(found.length, `${path} prerenders no lead or card picture, though page 1 has posts with a card image`).toBeGreaterThan(0);
    }

    for (const [i, m] of found.entries()) {
      const at = `${path}, ${m.place} picture ${i + 1}`;
      expect(m.picture, `${at} is a bare <img>, not inside a <picture>`).toBe(true);
      expect(m.width > 0 && m.height > 0, `${at}: the <img> carries no width and height, so its box is unknown until it loads`).toBe(true);
      expect(m.src, `${at}: the <img> has no fallback src`).not.toBe('');

      for (const [format, source] of [['avif', m.avif], ['webp', m.webp]]) {
        expect(source, `${at} offers no image/${format} <source>`).not.toBeNull();
        const set = candidates(source.srcset);
        const widths = set.map((c) => c.w);
        expect(set.length, `${at}: the ${format} srcset is empty`).toBeGreaterThan(0);
        expect(widths.every(Boolean), `${at}: a ${format} candidate has no width descriptor: ${source.srcset}`).toBe(true);
        if (m.width > SMALLEST_STEP) {
          expect(set.length, `${at}: the ${format} srcset offers ${set.length} width(s), not a choice: ${source.srcset}`).toBeGreaterThanOrEqual(2);
        }
        expect(set.every((c) => c.url.endsWith(`.${format}`)), `${at}: the ${format} srcset names a file of another format: ${source.srcset}`).toBe(true);
        expect(widths, `${at}: the ${format} widths are not in ascending order`).toEqual([...widths].sort((a, b) => a - b));
        expect(Math.max(...widths), `${at}: the ${format} srcset's widest file is not the source's own width`).toBe(m.width);
        expect(source.sizes, `${at}: the ${format} <source> has no sizes, so the browser assumes the whole screen`).not.toBe('');
      }
      expect(m.avif.sizes, `${at}: the AVIF and WebP sources disagree about the column`).toBe(m.webp.sizes);

      /* Every cover waits for the viewport, the lead included: it sits under
         the hero on a phone and in both Lighthouse setups, where the largest
         paint is the title (blog-picture.vue). */
      expect(m.loading, `${at} is not lazy`).toBe('lazy');
      expect(m.priority, `${at} asks for high priority`).not.toBe('high');
    }
  });
}

/* ── What the browser does with it ───────────────────────────────────────── */

/*
 * `sizes` IS A PROMISE ABOUT THE LAYOUT, made before the stylesheet arrives.
 * Resolved in the page at each width and set against the box the picture was
 * actually drawn in: never smaller (the browser would take a file too narrow
 * and blur it), and never more than a scrollbar's width larger (it would take
 * a file too wide). blog-card.vue writes the columns out; this is where a
 * change to blog.vue's grid that forgets them shows up.
 */
test('each picture\'s sizes resolves to the box it is drawn in, from phone to desktop @firefox', async ({ page }) => {
  for (const width of [390, 768, 1024, 1280, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(EN.path);
    await settle(page);
    const rows = await page.locator(PICTURES).evaluateAll((imgs) => imgs.map((img) => {
      const source = img.parentElement.tagName === 'PICTURE' ? img.parentElement.querySelector('source[sizes]') : null;
      const sizes = source ? source.getAttribute('sizes') : img.getAttribute('sizes');
      /* The first entry whose media condition holds, or the bare default,
         measured by laying out a probe of that width. Commas split entries
         only outside parentheses; a condition is one parenthesised feature,
         which is all blog-card.vue writes. */
      const text = sizes || '';
      const entries = [];
      let depth = 0;
      let start = 0;
      let at = 0;
      for (const ch of text) {
        if (ch === '(') {
          depth += 1;
        } else if (ch === ')') {
          depth -= 1;
        } else if (ch === ',' && depth === 0) {
          entries.push(text.slice(start, at).trim());
          start = at + 1;
        }
        at += 1;
      }
      entries.push(text.slice(start).trim());
      let slot = null;
      for (const entry of entries.filter(Boolean)) {
        const m = entry.match(/^(\([^()]*\))\s+(.+)$/);
        if (!m || matchMedia(m[1]).matches) {
          const probe = document.createElement('div');
          probe.style.cssText = `position:absolute;visibility:hidden;height:0;width:${m ? m[2] : entry}`;
          document.body.append(probe);
          slot = probe.getBoundingClientRect().width;
          probe.remove();
          break;
        }
      }
      return {
        place: img.closest('.blog-lead') ? 'lead' : 'card',
        sizes,
        slot,
        box: img.getBoundingClientRect().width,
      };
    }));

    if (pictured('en')) {
      expect(rows.length, `at ${width}px the archive shows no lead or card picture`).toBeGreaterThan(0);
    }
    for (const r of rows) {
      const at = `at ${width}px the ${r.place}`;
      expect(r.sizes, `${at} carries no sizes`).toBeTruthy();
      expect(r.slot, `${at}: sizes "${r.sizes}" resolves to nothing`).not.toBeNull();
      expect(r.slot, `${at} is drawn ${r.box.toFixed(1)}px wide, but sizes promises only ${r.slot.toFixed(1)}px`)
        .toBeGreaterThanOrEqual(r.box - 1);
      expect(r.slot, `${at} is drawn ${r.box.toFixed(1)}px wide, but sizes promises ${r.slot.toFixed(1)}px`)
        .toBeLessThanOrEqual(r.box + 20);
    }
  }
});

for (const { locale, path } of ARCHIVES) {
  test(`${path} at 390px: the lead and the first card take an AVIF no wider than twice their box`, async ({ page }) => {
    test.skip(!pictured(locale), `page 1 of the ${locale} archive has no card image`);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(path);
    await settle(page);
    await loadAll(page);

    const lead = page.locator('article.blog-lead .blog-card__frame img');
    const card = page.locator('ul.blog-recent .blog-card__frame img').first();
    for (const [name, img] of [['lead', lead], ['first card', card]]) {
      await expect(img, `${path} shows no ${name} picture`).toHaveCount(1);
      const m = await img.evaluate((el) => ({
        file: el.currentSrc,
        natural: el.naturalWidth,
        intrinsic: Number(el.getAttribute('width')) || 0,
        box: el.getBoundingClientRect().width,
        dpr: window.devicePixelRatio,
      }));
      const file = new URL(m.file).pathname;
      expect(file, `the ${name} took ${file}, not the AVIF source`).toMatch(/\.avif$/);
      expect(m.natural, `the ${name} is ${m.box.toFixed(0)}px wide at ${m.dpr}x and fetched ${file}, ${m.natural}px wide`)
        .toBeLessThanOrEqual(2 * m.box * m.dpr);
      /* And not a blurred one: at least the box, unless the source itself is
         narrower than that. */
      expect(m.natural, `the ${name} fetched ${file}, ${m.natural}px wide, narrower than its ${m.box.toFixed(0)}px box`)
        .toBeGreaterThanOrEqual(Math.min(Math.floor(m.box * m.dpr), m.intrinsic));
    }
  });
}

test(`${EN.path} at 390px: page 1's pictures together stay under ${BUDGET} bytes`, async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(EN.path);
  await settle(page);
  const count = await loadAll(page);
  if (pictured('en')) {
    expect(count, 'the archive shows no lead or card picture to weigh').toBeGreaterThan(0);
  }

  /* Every image an <img> fetched, the unchosen formats included: a page that
     took an AVIF AND its PNG pays for both, and this is where it shows. */
  const fetched = await page.evaluate(() => performance.getEntriesByType('resource')
    .filter((e) => e.initiatorType === 'img')
    .map((e) => ({ file: new URL(e.name).pathname, bytes: e.encodedBodySize })));
  const total = fetched.reduce((sum, f) => sum + f.bytes, 0);
  const list = fetched.map((f) => `${f.file} ${f.bytes}`).join(', ');
  expect(total, `page 1 fetched ${total} bytes of images at 390px: ${list}`).toBeLessThanOrEqual(BUDGET);
});

/*
 * A DESCRIPTOR IS A CLAIM ABOUT A FILE. `720w` tells the browser the file is
 * 720px wide and nothing checks it: a step cut at the wrong width, or a
 * sibling that is not the source's full size, would be chosen for the wrong
 * screens and the page would still look fine. Every candidate is loaded and
 * measured.
 */
test('every srcset width is the width of the file it names', async ({ page }) => {
  await page.goto(EN.path);
  await settle(page);
  const claims = await page.locator('article.blog-lead picture source, ul.blog-recent picture source')
    .evaluateAll((sources) => sources.map((s) => s.getAttribute('srcset')));
  const seen = new Map();
  for (const c of claims.flatMap(candidates)) {
    seen.set(c.url, c.w);
  }
  if (pictured('en')) {
    expect(seen.size, 'the archive offers no srcset candidate to check').toBeGreaterThan(0);
  }

  const measured = await page.evaluate((urls) => Promise.all(urls.map((url) => new Promise((done) => {
    const img = new Image();
    img.addEventListener('load', () => done({ url, w: img.naturalWidth }));
    img.addEventListener('error', () => done({ url, w: null }));
    img.src = url;
  }))), [...seen.keys()]);
  for (const { url, w } of measured) {
    expect(w, `${url} is described as ${seen.get(url)}w but ${w === null ? 'does not load' : `is ${w}px wide`}`)
      .toBe(seen.get(url));
  }
});
