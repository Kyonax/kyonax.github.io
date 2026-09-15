/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 */

/*
 * landing-hero.spec.js — the top of the blog archive, measured: the galaxy,
 * the marquee, the three drawings, and the numbers they claim.
 *
 * TWO KINDS OF TRUTH, SO TWO KINDS OF READ. That the galaxy's first frame and
 * the drawings are in the prerendered HTML is a fact about a FILE: a visitor
 * with JavaScript off, and every crawler, gets dist/blog/index.html and
 * nothing more. So that file is read from disk, the way
 * check-blog-prerender.mjs reads it, and handed to the browser's own HTML
 * parser rather than a regex. Everything else is a fact about a RUNNING page:
 * that the <pre> draws a new frame after hydration, that it holds still when
 * the visitor asks for less motion, where the panel lands on a phone. vitest's
 * happy-dom performs no layout and fires no animation frame, so none of that
 * exists outside a browser.
 *
 * HERMETIC. The site appends the Umami tracker after mount. It is answered
 * with an empty script and every other Umami request is aborted, exactly as
 * analytics.spec.js does, so no run needs the network or lands a pageview on
 * the owner's dashboard.
 *
 * WRITTEN RED. Against the archive before the hero, every contract below fails
 * and names what is missing: no <pre class="ascii-galaxy"> in dist/, no
 * drawings, no chip, no marquee, and a manifest with no corpus block.
 *
 * SIX CONTRACTS:
 *   1. With no script run, both archives ship the galaxy's frame 0 — one
 *      aria-hidden <pre> of 42 rows by 96 characters — and the three
 *      aria-hidden drawings.
 *   2. Once hydrated, the galaxy draws a new frame within a second, the
 *      marquee moves and the drawings play.
 *   3. Under reduced motion the galaxy stays on the prerendered frame 0, the
 *      drawings are paused, and the marquee stops on a single copy.
 *   4. At 390px the panel comes first, above the title, and no rule
 *      separates them.
 *   5. The made-with line links the org2html repository, in a new tab, and
 *      the click is counted.
 *   6. The chip's numbers are the manifest's corpus, and the marquee's
 *      screen-reader sentence states the same file count.
 */

import { existsSync, readFileSync } from 'node:fs';

import { expect, test } from '@playwright/test';

import { ROUTES, settle } from './viewports.js';

const ARCHIVES = ROUTES.filter((r) => r.name.startsWith('archive'));
const ARCHIVE_EN = ARCHIVES[0].path;

const PHONE = 390;
const DESKTOP = 1280;

/* The galaxy's grid: 42 rows of 96 characters, joined by "\n". */
const ROWS = 42;
const COLS = 96;

const REPO = 'https://github.com/Kyonax/org2html';

/* The repository root, from this file's own location — the anchor
   scripts/_lib.mjs gives check-blog-prerender.mjs — so no run depends on the
   directory Playwright was started from. */
const ROOT = new URL('../../', import.meta.url);
const MANIFEST = new URL('src/data/blog/manifest.json', ROOT);
const distFile = (path) => new URL(`dist${path}index.html`, ROOT);
const read = (url) => (existsSync(url) ? readFileSync(url, 'utf8') : null);

/* Umami Cloud serves the tracker from umami.is and may collect on umami.dev,
   so both are answered — the same net analytics.spec.js casts. */
const UMAMI_HOST = /(^|\.)umami\.(is|dev)$/;

test.beforeEach(async ({ page }) => {
  await page.route((url) => UMAMI_HOST.test(url.hostname), (route) => (
    new URL(route.request().url()).pathname === '/script.js'
      ? route.fulfill({ status: 200, contentType: 'application/javascript', body: '' })
      : route.abort()
  ));
});

/*
 * What the prerender shipped, parsed by the browser's own HTML parser so that
 * entities and the <pre> leading-newline rule resolve exactly as a real load
 * resolves them. DOMParser never runs a script: this is the page a visitor
 * with JavaScript off receives.
 */
const prerendered = async (page, path) => {
  const html = read(distFile(path));
  expect(html, `dist${path}index.html does not exist — build the site first`).not.toBeNull();
  return page.evaluate((src) => {
    const doc = new DOMParser().parseFromString(src, 'text/html');
    const pres = [...doc.querySelectorAll('pre.ascii-galaxy')];
    return {
      pres: pres.length,
      hidden: pres.length > 0 ? pres[0].getAttribute('aria-hidden') : null,
      frame: pres.length > 0 ? pres[0].textContent : null,
      drawings: [...doc.querySelectorAll('svg.blog-pipeline-band__art')].map((svg) => ({
        hidden: svg.getAttribute('aria-hidden'),
        inCell: Boolean(svg.closest('section.blog-pipeline-band .blog-pipeline-band__cell')),
      })),
    };
  }, html);
};

/* How many of a frame's rows differ between two reads. A failure can print a
   number; a diff of two 4,000-character strings would bury it. */
const rowsChanged = (a, b) => {
  const x = a.split('\n');
  const y = b.split('\n');
  return x.filter((row, i) => row !== y.at(i)).length + Math.max(0, y.length - x.length);
};

/*
 * Every number in a sentence, its grouping separators dropped: "1,684" and
 * "1.684" both read 1684, while "1.2.0" stays 1, 2 and 0 because no group of
 * three digits follows its dots. The page formats in its own locale; this
 * reads either.
 */
const numbers = (s) => (s.replace(/(\d)[,.\u00a0\u202f](?=\d{3}\b)/g, '$1').match(/\d+/g) || [])
  .map(Number);

const ascending = (list) => [...list].sort((a, b) => a - b);

/*
 * The corpus block the build synced into the manifest. Read from disk, never
 * imported: the file is generated and gitignored, and an import that failed
 * would take the whole spec down at load instead of the one test that reads it.
 */
const readCorpus = () => {
  const raw = read(MANIFEST);
  expect(raw, 'src/data/blog/manifest.json does not exist — build the site first').not.toBeNull();
  const { corpus } = JSON.parse(raw);
  expect(corpus, 'the manifest has no corpus block').toBeTruthy();
  expect(Number.isInteger(corpus.files) && corpus.files > 0, `manifest.corpus.files is ${corpus.files}, not a count of files`)
    .toBe(true);
  expect(Number.isInteger(corpus.bytes) && corpus.bytes > 0, `manifest.corpus.bytes is ${corpus.bytes}, not a size`)
    .toBe(true);
  return corpus;
};

/*
 * Everything that could read as a rule between the galaxy panel and the title
 * on a phone: a drawn top or bottom border edge, an <hr> or separator, or a
 * bar two pixels thin or less, lying in the strip from the panel's last pixel
 * row to the title's first and as wide as a real divider. Runs in the page.
 */
const phoneHero = () => {
  const panel = document.querySelector('.blog-hero__panel');
  const title = document.querySelector('h1.blog-hero__title');
  const missing = [!panel && '.blog-hero__panel', !title && 'h1.blog-hero__title'].filter(Boolean);
  if (missing.length > 0) {
    return { missing };
  }

  const p = panel.getBoundingClientRect();
  const t = title.getBoundingClientRect();
  const from = p.bottom - 1.5;
  const to = t.top + 1.5;
  const alpha = (c) => {
    const slash = c.match(/\/\s*([\d.]+)(%?)\s*\)$/);
    if (slash) {
      return Number.parseFloat(slash[1]) / (slash[2] ? 100 : 1);
    }
    const parts = c.startsWith('rgba(') ? c.match(/[\d.]+/g) : null;
    return parts && parts.length === 4 ? Number(parts[3]) : 1;
  };
  const drawn = (cs, side) => Number.parseFloat(cs.getPropertyValue(`border-${side}-width`)) > 0
    && !['none', 'hidden'].includes(cs.getPropertyValue(`border-${side}-style`))
    && alpha(cs.getPropertyValue(`border-${side}-color`)) > 0;

  const rules = [];
  for (const el of document.querySelectorAll('body *')) {
    const r = el.getBoundingClientRect();
    const topIn = r.top >= from && r.top <= to;
    const bottomIn = r.bottom >= from && r.bottom <= to;
    if ((!topIn && !bottomIn) || Math.min(r.right, p.right) - Math.max(r.left, p.left) < 24) {
      continue;
    }
    const cs = getComputedStyle(el);
    if (cs.visibility !== 'visible') {
      continue;
    }
    const name = `<${el.localName} class="${(el.getAttribute('class') || '').slice(0, 60)}">`;
    if (topIn && drawn(cs, 'top')) {
      rules.push(`${name} border-top`);
    }
    if (bottomIn && drawn(cs, 'bottom')) {
      rules.push(`${name} border-bottom`);
    }
    if (el.localName === 'hr' || el.getAttribute('role') === 'separator') {
      rules.push(`${name} separator`);
    } else if (r.height > 0 && r.height <= 2
      && (alpha(cs.backgroundColor) > 0 || cs.backgroundImage !== 'none')) {
      rules.push(`${name} ${r.height}px bar`);
    }
  }
  return { missing, panelBottom: p.bottom, titleTop: t.top, rules };
};

for (const route of ARCHIVES) {
  test.describe(route.name, () => {
    test('ships the galaxy frame 0 and the three drawings with no script run', async ({ page }) => {
      const file = `dist${route.path}index.html`;
      const shipped = await prerendered(page, route.path);

      expect(shipped.pres, `${file} carries ${shipped.pres} <pre class="ascii-galaxy">, not 1 — frame 0 is not prerendered`)
        .toBe(1);
      expect(shipped.hidden, `${file}: the galaxy <pre> is not aria-hidden="true"`).toBe('true');
      const widths = shipped.frame.split('\n').map((row) => [...row].length);
      expect(widths.length, `${file}: the galaxy's frame 0 has ${widths.length} rows, not ${ROWS}`).toBe(ROWS);
      const off = widths.filter((n) => n !== COLS);
      expect(off, `${file}: ${off.length} of the galaxy's rows are not ${COLS} characters wide`).toEqual([]);

      expect(
        shipped.drawings.length,
        `${file} carries ${shipped.drawings.length} svg.blog-pipeline-band__art, not 3 — the drawings are not prerendered`,
      ).toBe(3);
      for (const [i, svg] of shipped.drawings.entries()) {
        expect(svg.hidden, `${file}: drawing ${i + 1} is not aria-hidden="true"`).toBe('true');
        expect(svg.inCell, `${file}: drawing ${i + 1} sits outside a .blog-pipeline-band__cell of section.blog-pipeline-band`)
          .toBe(true);
      }
    });

    test(`at ${PHONE}px the galaxy panel sits above the title, with no rule between them`, async ({ page }) => {
      await page.setViewportSize({ width: PHONE, height: 900 });
      await page.goto(route.path);
      await settle(page);

      const m = await page.evaluate(phoneHero);
      expect(m.missing, `${route.path} at ${PHONE}px renders no ${m.missing.join(' and no ')}`).toEqual([]);
      expect(
        m.panelBottom,
        `${route.path} at ${PHONE}px: the galaxy panel ends at ${Math.round(m.panelBottom)}px, below the title's top at ${Math.round(m.titleTop)}px — the panel does not come first`,
      ).toBeLessThanOrEqual(m.titleTop + 1);
      expect(m.rules, `${route.path} at ${PHONE}px: a rule separates the galaxy panel from the title — ${m.rules.join(', ')}`)
        .toEqual([]);
    });

    test('the made-with line links the org2html repository', async ({ page }) => {
      await page.goto(route.path);
      await settle(page);

      const link = page.locator('p.blog-pipeline-band__made-with a.blog-pipeline-band__repo');
      await expect(link, `${route.path} has no made-with link (p.blog-pipeline-band__made-with a.blog-pipeline-band__repo)`)
        .toHaveCount(1);
      await expect(link, `${route.path}: the made-with link is not visible`).toBeVisible();
      await expect(link, `${route.path}: the made-with link does not point at ${REPO}`).toHaveAttribute('href', REPO);
      await expect(link, `${route.path}: the made-with link does not open in a new tab`).toHaveAttribute('target', '_blank');
      await expect(link, `${route.path}: the made-with click is not counted as org2html-github`)
        .toHaveAttribute('data-umami-event', 'org2html-github');
    });

    test('the chip and the marquee state the corpus the manifest describes', async ({ page }) => {
      const corpus = readCorpus();
      const kb = Math.round(corpus.bytes / 1024);

      await page.goto(route.path);
      await settle(page);

      const chip = page.locator('.blog-hero__chip');
      await expect(chip, `${route.path} renders no .blog-hero__chip`).toHaveCount(1);
      const said = (await chip.textContent()).replace(/\s+/g, ' ').trim();
      expect(
        ascending(numbers(said)),
        `${route.path}: the chip reads "${said}" — the manifest's corpus is ${corpus.files} files, ${kb} KB`,
      ).toEqual(ascending([corpus.files, kb]));

      const sr = page.locator('p.blog-marquee__sr');
      await expect(sr, `${route.path} renders no p.blog-marquee__sr — the marquee says nothing to a screen reader`)
        .toHaveCount(1);
      const sentence = (await sr.textContent()).replace(/\s+/g, ' ').trim();
      expect(numbers(sentence), `${route.path}: the marquee's sentence "${sentence}" never states the ${corpus.files} files`)
        .toContain(corpus.files);
      expect(
        await sr.evaluate((el) => Boolean(el.closest('[aria-hidden="true"]'))),
        `${route.path}: the marquee's sentence sits inside aria-hidden, so no screen reader reaches it`,
      ).toBe(false);
    });
  });
}

/*
 * THE CONTROLS FOR THE REDUCED-MOTION TESTS BELOW. Without them those pass on
 * a build where nothing ever moved: a galaxy stuck on frame 0, a marquee with
 * no animation and drawings with no SMIL all "respect reduced motion".
 */
test('once hydrated the galaxy draws new frames, the marquee moves and the drawings play', async ({ page }) => {
  await page.setViewportSize({ width: DESKTOP, height: 900 });
  await page.goto(ARCHIVE_EN);
  await settle(page);

  const pre = page.locator('pre.ascii-galaxy');
  await expect(pre, `${ARCHIVE_EN} renders no pre.ascii-galaxy — there is no galaxy to animate`).toHaveCount(1);
  const first = await pre.textContent();
  await expect.poll(async () => rowsChanged(first, await pre.textContent()), {
    message: `${ARCHIVE_EN}: the galaxy drew no new frame within 1 s of hydration — the animation does not run`,
    timeout: 1000,
    intervals: [50],
  }).toBeGreaterThan(0);

  const marquee = page.locator('.blog-marquee');
  await expect(marquee, `${ARCHIVE_EN} renders no .blog-marquee`).toHaveCount(1);
  const running = await marquee.evaluate((el) => el.getAnimations({ subtree: true })
    .filter((a) => a.playState === 'running').length);
  expect(running, `${ARCHIVE_EN}: nothing in the marquee is moving`).toBeGreaterThan(0);

  const drawings = await page.locator('svg.blog-pipeline-band__art').evaluateAll((svgs) => svgs.map((svg) => ({
    smil: [...svg.querySelectorAll('*')]
      .filter((n) => ['animate', 'animateTransform', 'animateMotion', 'set'].includes(n.localName)).length,
    paused: svg.animationsPaused(),
  })));
  expect(drawings.length, `${ARCHIVE_EN} renders ${drawings.length} svg.blog-pipeline-band__art, not 3`).toBe(3);
  for (const [i, d] of drawings.entries()) {
    expect(d.smil, `${ARCHIVE_EN}: drawing ${i + 1} carries no SMIL animation`).toBeGreaterThan(0);
    expect(d.paused, `${ARCHIVE_EN}: drawing ${i + 1} is paused with no reduced motion asked for`).toBe(false);
  }
});

test('with reduced motion the galaxy holds its prerendered frame 0 and the drawings are paused', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: DESKTOP, height: 900 });
  await page.goto(ARCHIVE_EN);
  await settle(page);

  const pre = page.locator('pre.ascii-galaxy');
  await expect(pre, `${ARCHIVE_EN} renders no pre.ascii-galaxy — there is no galaxy to hold still`).toHaveCount(1);
  const before = await pre.textContent();
  await page.waitForTimeout(1200);
  const after = await pre.textContent();
  const moved = rowsChanged(before, after);
  expect(moved, `with reduced motion the galaxy still redrew ${moved} of its ${ROWS} rows in 1.2 s`).toBe(0);

  const shipped = await prerendered(page, ARCHIVE_EN);
  expect(shipped.frame, `dist${ARCHIVE_EN}index.html carries no galaxy frame to compare with`).not.toBeNull();
  const drift = rowsChanged(shipped.frame, after);
  expect(drift, `with reduced motion the galaxy is not on the prerendered frame 0 — ${drift} of its ${ROWS} rows differ`)
    .toBe(0);

  const paused = await page.locator('svg.blog-pipeline-band__art')
    .evaluateAll((svgs) => svgs.map((svg) => svg.animationsPaused()));
  expect(paused, `with reduced motion the drawings are not all paused: ${JSON.stringify(paused)}`)
    .toEqual([true, true, true]);
});

test('with reduced motion the marquee stops and shows a single copy', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: DESKTOP, height: 900 });
  await page.goto(ARCHIVE_EN);
  await settle(page);

  const copies = page.locator('.blog-marquee__track[aria-hidden="true"] span.blog-marquee__copy');
  await expect(
    copies.first(),
    `${ARCHIVE_EN} renders no .blog-marquee__track[aria-hidden="true"] with a span.blog-marquee__copy`,
  ).toBeVisible();

  const running = await copies.first().evaluate((el) => (el.closest('.blog-marquee') || el.parentElement)
    .getAnimations({ subtree: true })
    .filter((a) => a.playState === 'running')
    .map((a) => a.animationName || a.transitionProperty || 'a scripted animation'));
  expect(running, `with reduced motion the marquee still runs: ${running.join(', ')}`).toEqual([]);
  await expect(copies.nth(1), 'with reduced motion the marquee still shows its second copy').toBeHidden();
});

/*
 * THE MARQUEE IS COMPILED, NOT COMPUTED (the owner's review, 2026-09-15:
 * "dynamic but at compilation level, not in realtime doing calculations and
 * fetchings"). Its figures are formatted while the page is prerendered, and
 * blog.vue never hydrates it, so the browser must run none of its code: every
 * Intl number format and locale date made on the page is recorded with the
 * script that made it, and none may come from the marquee's chunk. The ticker
 * the reader sees is the ticker the build wrote.
 */
test('the marquee is built at compile time: the browser runs none of its code', async ({ page }) => {
  await page.addInitScript(() => {
    window.__formatted_by = [];
    const where = () => (new Error().stack || '');
    const NativeNumberFormat = Intl.NumberFormat;
    Intl.NumberFormat = function NumberFormat(...args) {
      window.__formatted_by.push(where());
      return new NativeNumberFormat(...args);
    };
    const nativeLocaleDate = Date.prototype.toLocaleDateString;
    Date.prototype.toLocaleDateString = function toLocaleDateString(...args) {
      window.__formatted_by.push(where());
      return nativeLocaleDate.apply(this, args);
    };
  });
  await page.setViewportSize({ width: DESKTOP, height: 900 });
  await page.goto(ARCHIVE_EN);
  await settle(page);
  /* Past the point an idle hydration would have run. */
  await page.waitForTimeout(2500);

  const by_marquee = await page.evaluate(() => window.__formatted_by.filter((s) => s.includes('blog-marquee')).length);
  expect(by_marquee, `the marquee's own code formatted ${by_marquee} value(s) in the browser`).toBe(0);

  const html = read(distFile(ARCHIVE_EN));
  expect(html, `dist${ARCHIVE_EN}index.html is missing — build the site first`).not.toBeNull();
  const shipped = (html.match(/<div class="blog-marquee"[^>]*>[\s\S]*?<\/p><\/div>/) || [''])[0]
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  const live = (await page.locator('.blog-marquee').textContent()).replace(/\s+/g, ' ').trim();
  expect(shipped.length, 'the prerendered archive carries no marquee text to compare with').toBeGreaterThan(0);
  expect(live, 'the marquee on screen is not the marquee the build wrote').toBe(shipped);
});

/*
 * THE NAME IS THE WAY HOME. In the archive's subtitle the author's name links
 * to the landing of the same language, and the subtitle is still the meta
 * description word for word.
 */
for (const route of ARCHIVES) {
  test(`${route.name}: the author's name in the subtitle takes the reader home`, async ({ page }) => {
    await page.goto(route.path);
    await settle(page);
    const subtitle = page.locator('.blog-hero__subtitle');
    const link = subtitle.locator('a.blog-hero__home');
    await expect(link, `${route.path}: the subtitle's name is not a link`).toHaveCount(1);
    await expect(link).toHaveText('Cristian D. Moreno');
    const home = route.path.startsWith('/es/') ? '/es' : '/';
    expect(await link.getAttribute('href'), `${route.path}: the name does not lead to ${home}`).toBe(home);
    const description = await page.locator('meta[name="description"]').getAttribute('content');
    expect((await subtitle.textContent()).replace(/\s+/g, ' ').trim(), `${route.path}: the subtitle is no longer the meta description`)
      .toBe(description);
  });
}
