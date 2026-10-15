/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 */

/*
 * pagination.spec.js — page 2 and later of the archive: where the pager
 * lands, what a later page is called and loads, and what the language toggle
 * and the search do there.
 *
 * IT NEEDS A PAGED BUILD. The production archive is one page per locale, and
 * none of this exists on one page. The manifest the build synced says how many
 * pages each locale has; with one, every test here skips with the reason
 * "build with --page-size 3" (kyo-preview.sh --page-size 3 makes one). With
 * KYO_REQUIRE_PAGED=1 a skip would be a silent pass, so it FAILS instead.
 *
 * WRITTEN RED. Against a paged build of the archive before this step, every
 * contract fails and says what is missing: bare pager links, a list that
 * starts a hero below the fold, page 1's title and description repeated, a
 * Blog on page 2 carrying the index's url, the galaxy, marquee and band
 * fetched on every page, an x-default that points out of the pair, the toggle
 * dropping page 2 for the index, a search that leaves the list and the pager
 * as they were.
 *
 * NO page.route: it turns the HTTP cache off for the whole context. Umami is
 * silenced by its own opt-out flag instead.
 *
 * THE CONTRACTS:
 *   1. Every pager link ends in #all-posts; the current page is marked
 *      aria-current="page" and is not a link.
 *   2. Older lands with the list right under the nav, at 390 and 1440px, in
 *      both engines.
 *   3. Page 2 keeps the one <h1>, says "Page 2 of N" under it, and renders no
 *      chip, galaxy, marquee or band.
 *   4. Page 2 has its own title, description and CollectionPage, about the
 *      Blog that lists page 2's rows; the author is the landing's Person.
 *   5. Page 2 never requests the marquee, band or galaxy chunks.
 *   6. Every archive page's hreflang set is reciprocal, and page N names only
 *      a page N that exists.
 *   7. The language toggle keeps page 2, and a ?search= term.
 *   8. A search on page 2 spans every page and hides the pager; clearing it
 *      brings page 2 back.
 */

import { existsSync, readFileSync } from 'node:fs';
import { env } from 'node:process';

import { expect, test } from '@playwright/test';

import { settle } from './viewports.js';

/* The routing manifest and the rich index the build synced. Read from disk,
   never imported: both are generated and gitignored, and a failed import would
   take the whole spec down at load. */
const ROOT = new URL('../../', import.meta.url);
const readJson = (path) => {
  const url = new URL(path, ROOT);
  try {
    return existsSync(url) ? JSON.parse(readFileSync(url, 'utf8')) : null;
  } catch {
    return null;
  }
};
const MANIFEST = readJson('src/data/blog/manifest.json') || {};
const INDEX = readJson('src/data/blog/index.json') || {};

const LOCALES = (MANIFEST.locales || []).length ? MANIFEST.locales : ['en', 'es'];
const DEFAULT = MANIFEST.defaultLocale || 'en';
const OTHER = LOCALES.find((l) => l !== DEFAULT) || 'es';
const ORIGIN = MANIFEST.origin || 'https://kyonax.com';

const PAGES = new Map(Object.entries(MANIFEST.pages || {}));
const pagesOf = (locale) => PAGES.get(locale) || [];

const PAGED = LOCALES.every((l) => pagesOf(l).length > 1);
const REQUIRE_PAGED = env.KYO_REQUIRE_PAGED === '1';

const LIST = '#all-posts';
const PHONE = 390;
const DESKTOP = 1440;
/* How far below the nav's bottom edge the list's section may start and still
   read as "right under it": the site's scroll padding, plus a little air. */
const SNUG = 24;

const strip = (p) => p.replace(/\/$/, '');
const numbers = (s) => (String(s).match(/\d+/g) || []).map(Number);

test.beforeEach(async ({ page }) => {
  if (!PAGED) {
    const counts = LOCALES.map((l) => `${pagesOf(l).length} ${l}`).join(', ');
    expect(REQUIRE_PAGED, `KYO_REQUIRE_PAGED=1, but the synced manifest has ${counts} archive page(s) — build with --page-size 3`)
      .toBe(false);
    test.skip(true, 'build with --page-size 3');
  }
  await page.addInitScript(() => {
    try {
      localStorage.setItem('umami.disabled', '1');
    } catch { /* no storage on this document */ }
  });
});

/* The rows the list shows, as paths — visible ones only, so a row hidden by
   the search's hold is not counted as shown. */
const rowPaths = (page) => page.locator(`section${LIST} ul.blog-all__list > li.blog-all__row`)
  .evaluateAll((rows) => rows
    .filter((li) => li.getClientRects().length > 0 && getComputedStyle(li).visibility !== 'hidden')
    .map((li) => {
      const a = li.querySelector('a[href]');
      return a ? new URL(a.href).pathname : null;
    }));

/* Every JSON-LD node the page ships, flattened out of its @graph. */
const graphNodes = (page) => page.locator('script[type="application/ld+json"]')
  .evaluateAll((scripts) => scripts.flatMap((s) => {
    const doc = JSON.parse(s.textContent);
    return doc['@graph'] || [doc];
  }));

/* ------------------------------------------------------------ the pager -- */

test.describe('with no script run', () => {
  /* The links are what a crawler and a reader without JavaScript follow, so
     they are read off the prerendered page itself. */
  test.use({ javaScriptEnabled: false });

  for (const locale of LOCALES) {
    test(`${locale}: every pager link lands on the list, and the current page is not a link`, async ({ page }) => {
      const all = pagesOf(locale);
      for (const current of all) {
        await page.goto(current.url);
        const nav = page.locator('nav.blog-pagination');
        await expect(nav, `${current.url} renders no nav.blog-pagination`).toHaveCount(1);

        const hrefs = await nav.locator('a').evaluateAll((as) => as.map((a) => a.getAttribute('href')));
        const bare = hrefs.filter((h) => !String(h).endsWith(LIST));
        expect(bare, `${current.url}: pager links that do not land on ${LIST}`).toEqual([]);

        const prev = nav.locator('a.blog-pagination__step[rel="prev"]');
        const next = nav.locator('a.blog-pagination__step[rel="next"]');
        if (current.prev) {
          await expect(prev, `${current.url}: Newer is not ${current.prev}${LIST}`).toHaveAttribute('href', `${current.prev}${LIST}`);
        } else {
          await expect(prev, `${current.url} is page 1, yet Newer is a link`).toHaveCount(0);
        }
        if (current.next) {
          await expect(next, `${current.url}: Older is not ${current.next}${LIST}`).toHaveAttribute('href', `${current.next}${LIST}`);
        } else {
          await expect(next, `${current.url} is the last page, yet Older is a link`).toHaveCount(0);
        }

        const numbered = await nav.locator('a.blog-pagination__num')
          .evaluateAll((as) => as.map((a) => a.getAttribute('href')));
        expect(numbered, `${current.url}: the numbered links are not every other page, on the list`)
          .toEqual(all.filter((p) => p.number !== current.number).map((p) => `${p.url}${LIST}`));

        const here = nav.locator('[aria-current="page"]');
        await expect(here, `${current.url}: the pager marks ${await here.count()} elements aria-current="page", not 1`)
          .toHaveCount(1);
        await expect(here, `${current.url}: the current page is not numbered ${current.number}`)
          .toHaveText(String(current.number));
        const linked = await here.evaluate((el) => el.localName === 'a' || el.hasAttribute('href') || Boolean(el.closest('a')));
        expect(linked, `${current.url}: the current page is a link to itself`).toBe(false);
      }
    });
  }
});

/*
 * ON THE LIST, UNDER THE NAV. The pager's links end in #all-posts, and this is
 * the promise that makes: after Older the section starts at the nav's bottom
 * edge — not under it, not a screen below it — and its first row is in view.
 * The sticky nav is 59.4px tall under 768px and 52.6px above it; the site's
 * scroll padding has to clear both. Polled, because Chromium scrolls to a
 * fragment smoothly and a late stylesheet can still move the page.
 */
const landing = () => {
  const nav = document.querySelector('header.hud-nav');
  const section = document.querySelector('section#all-posts');
  const row = section && section.querySelector('ul.blog-all__list > li.blog-all__row');
  const missing = [!nav && 'header.hud-nav', !section && 'section#all-posts', !row && 'li.blog-all__row']
    .filter(Boolean);
  if (missing.length > 0) {
    return { missing };
  }
  const max = document.documentElement.scrollHeight - innerHeight;
  return {
    missing,
    navBottom: nav.getBoundingClientRect().bottom,
    sectionTop: section.getBoundingClientRect().top,
    rowTop: row.getBoundingClientRect().top,
    rowBottom: row.getBoundingClientRect().bottom,
    viewport: innerHeight,
    atEnd: scrollY >= max - 1,
  };
};

for (const width of [PHONE, DESKTOP]) {
  test(`at ${width}px Older lands with the list under the nav @firefox`, async ({ page }) => {
    const [first, second] = pagesOf(DEFAULT);
    await page.setViewportSize({ width, height: 900 });
    await page.goto(first.url);
    await settle(page);

    await page.locator('nav.blog-pagination a.blog-pagination__step[rel="next"]').click();
    await page.waitForURL((u) => strip(u.pathname) === second.url);
    expect(new URL(page.url()).hash, `Older on ${first.url} did not land on ${LIST}`).toBe(LIST);
    await page.waitForLoadState('load');

    await expect(async () => {
      const m = await page.evaluate(landing);
      expect(m.missing, `${second.url} renders no ${m.missing.join(' and no ')}`).toEqual([]);
      const at = `at ${width}px: the list's section starts at ${m.sectionTop.toFixed(1)}px`;
      expect(m.sectionTop, `${at}, under the nav's bottom edge at ${m.navBottom.toFixed(1)}px`)
        .toBeGreaterThanOrEqual(m.navBottom - 0.5);
      expect(m.atEnd || m.sectionTop <= m.navBottom + SNUG, `${at}, more than ${SNUG}px below the nav at ${m.navBottom.toFixed(1)}px`)
        .toBe(true);
      expect(m.rowTop >= m.navBottom && m.rowBottom <= m.viewport, `at ${width}px the first row (${m.rowTop.toFixed(1)}–${m.rowBottom.toFixed(1)}px) is not in view under the nav`)
        .toBe(true);
    }).toPass({ timeout: 5000 });
  });
}

/* ------------------------------------------------------------- page 2 -- */

for (const locale of LOCALES) {
  test(`${locale}: page 2 keeps the one h1, says which page it is under it, and drops the chip, galaxy, marquee and band`, async ({ page }) => {
    const all = pagesOf(locale);
    const [first, second] = all;
    await page.goto(first.url);
    await settle(page);
    const title = (await page.locator('.blog-hero h1').textContent()).trim();

    await page.goto(second.url);
    await settle(page);
    await expect(page.locator('h1'), `${second.url} does not have exactly one <h1>`).toHaveCount(1);
    await expect(page.locator('.blog-hero h1'), `${second.url}: the <h1> is not page 1's "${title}"`).toHaveText(title);

    const label = page.locator('.blog-hero p.blog-hero__page');
    await expect(label, `${second.url} renders no .blog-hero p.blog-hero__page`).toHaveCount(1);
    const said = (await label.textContent()).trim();
    expect(numbers(said), `${second.url}: "${said}" does not say page 2 of ${all.length}`).toEqual([2, all.length]);
    const placed = await label.evaluate((el) => {
      const h1 = document.querySelector('.blog-hero h1');
      return {
        inside: Boolean(el.closest('h1')),
        after: Boolean(h1) && (h1.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0,
      };
    });
    expect(placed.inside, `${second.url}: the page line sits inside the <h1>`).toBe(false);
    expect(placed.after, `${second.url}: the page line does not follow the <h1>`).toBe(true);

    for (const gone of ['.blog-hero__chip', 'pre.ascii-galaxy', '.blog-marquee', 'section.blog-pipeline-band']) {
      await expect(page.locator(gone), `${second.url} still renders ${gone} — page 1's furniture`).toHaveCount(0);
    }
  });

  test(`${locale}: page 2 has its own title, description and CollectionPage`, async ({ page }) => {
    const all = pagesOf(locale);
    const [first, second] = all;
    const head = () => page.evaluate(() => ({
      title: document.title,
      description: document.querySelector('meta[name="description"]')?.getAttribute('content') || '',
      canonical: document.querySelector('link[rel="canonical"]')?.getAttribute('href') || '',
      robots: document.querySelector('meta[name="robots"]')?.getAttribute('content') || '',
      h1: (document.querySelector('.blog-hero h1')?.textContent || '').trim(),
    }));

    await page.goto(first.url);
    await settle(page);
    const one = await head();
    await page.goto(second.url);
    await settle(page);
    const two = await head();

    expect(two.title, `${second.url} repeats page 1's <title>`).not.toBe(one.title);
    expect(numbers(two.title), `${second.url}: the <title> "${two.title}" does not name page 2 of ${all.length}`)
      .toEqual(expect.arrayContaining([2, all.length]));
    expect(two.description, `${second.url} repeats page 1's description`).not.toBe(one.description);
    expect(numbers(two.description), `${second.url}: the description does not name page 2 of ${all.length}`)
      .toEqual(expect.arrayContaining([2, all.length]));
    const chars = [...two.description].length;
    expect(chars >= 60 && chars <= 165, `${second.url}: the description is ${chars} characters, outside 60–165`).toBe(true);
    expect(two.canonical, `${second.url} is not its own canonical`).toBe(`${ORIGIN}${second.url}`);
    expect(two.robots, `${second.url} is not index,follow`).toMatch(/^index,follow\b/);

    const nodes = await graphNodes(page);
    const declared = new Set(nodes.filter((n) => n['@id'] && n['@type']).map((n) => n['@id']));
    const collection = nodes.find((n) => n['@type'] === 'CollectionPage');
    expect(collection, `${second.url} ships no CollectionPage`).toBeTruthy();
    expect(collection.url, `${second.url}: the CollectionPage is not on the page's own url`).toBe(`${ORIGIN}${second.url}`);
    expect(collection['@id']).toBe(`${ORIGIN}${second.url}#webpage`);
    expect(collection.name, `${second.url}: the CollectionPage is not named as the <title> is`).toBe(two.title);
    expect(collection.description, `${second.url}: the CollectionPage's description is not the page's`).toBe(two.description);
    expect(collection.inLanguage).toBe(locale);
    expect(declared.has(collection.isPartOf?.['@id']), `${second.url}: the CollectionPage is not isPartOf a WebSite declared in the page`)
      .toBe(true);

    const blog = nodes.find((n) => n['@type'] === 'Blog');
    expect(blog, `${second.url} ships no Blog`).toBeTruthy();
    expect(collection.mainEntity?.['@id'], `${second.url}: the CollectionPage's mainEntity is not the Blog`).toBe(blog['@id']);
    expect(blog['@id']).toBe(`${ORIGIN}${first.url}#blog`);
    expect(blog.url, `${second.url}: the Blog is not on the archive's url`).toBe(`${ORIGIN}${first.url}`);
    expect(blog.name, `${second.url}: the Blog is not named as the <h1> is`).toBe(two.h1);
    const listed = (blog.blogPost || []).map((p) => p.url);
    const shown = (await rowPaths(page)).map((p) => `${ORIGIN}${p}`);
    expect(listed, `${second.url}: the Blog lists ${listed.length} post(s), not the ${shown.length} rows the page shows`).toEqual(shown);
    const published = (blog.blogPost || []).map((p) => p.datePublished).filter(Boolean).sort();
    expect(String(blog.dateModified) >= String(published.at(-1)), `${second.url}: the Blog's dateModified ${blog.dateModified} is older than a post it lists`)
      .toBe(true);
  });

  /* The same @id is a promise that it is the same man: the blog's author has
     to carry the identity the landing publishes for him. */
  test(`${locale}: the archive's author is the landing's Person`, async ({ page }) => {
    const second = pagesOf(locale)[1];
    const person = async () => (await graphNodes(page)).find((n) => n['@type'] === 'Person');

    await page.goto(locale === DEFAULT ? '/' : `/${locale}`);
    await settle(page);
    const landing = await person();
    expect(landing, 'the landing ships no Person').toBeTruthy();

    await page.goto(second.url);
    await settle(page);
    const author = await person();
    expect(author, `${second.url} ships no Person`).toBeTruthy();
    expect(author['@id'], `${second.url}: the author is not the landing's @id`).toBe(landing['@id']);
    expect(author.jobTitle, `${second.url}: the author has no jobTitle`).toBe(landing.jobTitle);
    expect(author.address, `${second.url}: the author has no address`).toEqual(landing.address);
    expect(author.sameAs, `${second.url}: the author's sameAs are not the landing's`).toEqual(landing.sameAs);
  });
}

/* Page 1's hero is its own; a later page must not pay for it. The chunk names
   are proven live by page 1 AFTER page 2, in the same fresh page, so page 2
   saw an empty cache and a renamed chunk fails the control, not silently. */
const HERO_CHUNK = /\/assets\/(ascii-galaxy|blog-marquee|blog-pipeline-band)-[\w-]+\.(?:js|css)$/;

test('page 2 never requests the marquee, band or galaxy chunks', async ({ page }) => {
  const [first, second] = pagesOf(DEFAULT);
  const seen = [];
  page.on('request', (r) => seen.push(new URL(r.url()).pathname));

  await page.goto(second.url);
  await settle(page);
  await page.mouse.wheel(0, 20000);
  await page.waitForTimeout(600);
  const fetched = seen.filter((p) => HERO_CHUNK.test(p));
  expect(fetched, `${second.url} requested page 1's hero chunks`).toEqual([]);

  seen.length = 0;
  await page.goto(first.url);
  await settle(page);
  const families = [...new Set(seen.map((p) => (p.match(HERO_CHUNK) || [])[1]).filter(Boolean))].sort();
  expect(families, `${first.url} requested ${families.join(', ') || 'none'} of the three — the chunk names watched here are stale`)
    .toEqual(['ascii-galaxy', 'blog-marquee', 'blog-pipeline-band']);
});

/* --------------------------------------------------------- the hreflang -- */

/*
 * RECIPROCAL, OR NOT AT ALL. A page N whose twin is missing used to name the
 * other locale's index, and page N's x-default named /blog — neither of which
 * names page N back, so the pairs were one-way and a search engine drops them.
 * Read from the served HTML: hreflang is a head fact, no script involved.
 */
test('every archive page names only twins that exist, and each names it back', async ({ request }) => {
  const hreflangs = async (path) => {
    const res = await request.get(path);
    expect(res.ok(), `${path} answered ${res.status()}`).toBe(true);
    const html = await res.text();
    const head = html.slice(0, html.indexOf('</head>'));
    return Object.fromEntries([...head.matchAll(/<link\b[^>]*\brel="alternate"[^>]*>/g)]
      .map(([tag]) => [(tag.match(/\bhreflang="([^"]+)"/) || [])[1], (tag.match(/\bhref="([^"]+)"/) || [])[1]])
      .filter(([lang]) => lang));
  };

  for (const locale of LOCALES) {
    for (const current of pagesOf(locale)) {
      const set = await hreflangs(current.url);
      const twins = LOCALES.filter((l) => pagesOf(l)[current.number - 1]);
      if (current.number > 1 && twins.length < 2) {
        expect(set, `${current.url} has no twin page ${current.number}, yet carries hreflang`).toEqual({});
        continue;
      }
      expect(Object.keys(set).sort(), `${current.url}: hreflang is not one row per locale with a page ${current.number}, plus x-default`)
        .toEqual([...twins, 'x-default'].sort());
      for (const [lang, href] of Object.entries(set)) {
        const path = new URL(href).pathname;
        expect(await hreflangs(path), `${current.url} names ${path} as ${lang}, and ${path} does not name the same set back`)
          .toEqual(set);
      }
    }
  }
});

/* --------------------------------------------- the toggle and the search -- */

const chooseLanguage = async (page, code) => {
  await page.locator('.language-toggle__button:visible').first().click();
  await page.locator(`#language-option-${code}:visible`).first().click();
};

test('the language toggle keeps page 2, and the search term', async ({ page }) => {
  const second = pagesOf(DEFAULT)[1];
  const twin = pagesOf(OTHER)[1];
  const term = 'org';
  await page.setViewportSize({ width: 1280, height: 900 });

  await page.goto(second.url);
  await settle(page);
  await chooseLanguage(page, OTHER);
  await expect(page, `the toggle on ${second.url} did not land on ${twin.url}`)
    .toHaveURL((u) => strip(u.pathname) === twin.url);

  await page.goto(`${twin.url}?search=${term}${LIST}`);
  await settle(page);
  await chooseLanguage(page, DEFAULT);
  await expect(page, `the toggle on ${twin.url}?search=${term}${LIST} did not keep page 2, the term and the hash`)
    .toHaveURL((u) => strip(u.pathname) === second.url && u.searchParams.get('search') === term && u.hash === LIST);
});

/*
 * What the search is asked to find: a post of page 1, by the longest word of
 * its title, so a hit can only come from another page than the one searched.
 * From the rich index the build synced, the same rows the search reads.
 */
const pageOnePick = (locale) => {
  const buckets = new Map(Object.entries(INDEX.pages || {}));
  const [first] = buckets.get(locale) || [];
  const url = first && first.items[0];
  const post = (INDEX.posts || []).find((p) => p.url === url);
  const words = String(post && post.title).match(/\p{L}{4,}/gu) || [];
  const term = words.sort((a, b) => b.length - a.length)[0];
  return { url, term };
};

test('a search on page 2 spans every page and hides the pager', async ({ page }) => {
  const second = pagesOf(DEFAULT)[1];
  const { url, term } = pageOnePick(DEFAULT);
  expect(term, `the synced index has no page-1 post in ${DEFAULT} with a word to search for`).toBeTruthy();

  await page.goto(second.url);
  await settle(page);
  await expect(page.locator('nav.blog-pagination'), `${second.url} shows no pager before searching`).toBeVisible();
  await page.locator('#blog-search-input').fill(term);

  await expect.poll(() => rowPaths(page), { message: `searching "${term}" on ${second.url} did not list ${url}, a page-1 post` })
    .toContain(url);
  await expect(page.locator('nav.blog-pagination'), `the pager stays up while "${term}" is searched`).toBeHidden();
  await expect(page, `searching moved off ${second.url} or did not write ?search=${term}`)
    .toHaveURL((u) => strip(u.pathname) === second.url && u.searchParams.get('search') === term);
});

test('clearing the search brings page 2 back', async ({ page }) => {
  const second = pagesOf(DEFAULT)[1];
  const { url, term } = pageOnePick(DEFAULT);
  expect(term, `the synced index has no page-1 post in ${DEFAULT} with a word to search for`).toBeTruthy();

  await page.goto(second.url);
  await settle(page);
  const before = await rowPaths(page);
  expect(before.length, `${second.url} lists no rows`).toBeGreaterThan(0);

  await page.locator('#blog-search-input').fill(term);
  await expect.poll(() => rowPaths(page), { message: `searching "${term}" did not list ${url}` }).toContain(url);
  await page.locator('button.blog-search__clear').click();

  await expect.poll(() => rowPaths(page), { message: `clearing the search did not bring back ${second.url}'s rows` })
    .toEqual(before);
  await expect(page.locator('nav.blog-pagination'), 'the pager did not come back after clearing').toBeVisible();
  await expect(page, `clearing left ${second.url}, or left the term in the URL`)
    .toHaveURL((u) => strip(u.pathname) === second.url && !u.searchParams.has('search') && !u.searchParams.has('q'));
});
