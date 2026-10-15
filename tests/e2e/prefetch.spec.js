/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 */

/*
 * prefetch.spec.js — one link warmer for every surface, measured.
 *
 * WHAT IT PINS. src/composables/use-link-warmer.js, installed from main.js,
 * replaced the two per-component hover prefetches (the hero's CV button and
 * the breadcrumbs) with delegated listeners that warm EVERY route link: a
 * mouse resting 65 ms, a focus, a touch. It fetches the next document into the
 * HTTP cache, then prefetches the CSS and JS that document will ask for.
 *
 * NO page.route ANYWHERE. Intercepting any request makes Playwright turn the
 * HTTP cache off for the page, and the HTTP cache is the thing measured here.
 * Umami is silenced the way the site lets a reader silence it, with
 * `umami.disabled` in localStorage before the first script runs, so no run
 * lands a pageview on the owner's dashboard.
 *
 * A FRESH CONTEXT PER CASE. The warmer's once-per-URL memory and its cap of
 * ten live for one page load, so every surface is its own test and one case
 * can never spend another's budget.
 *
 * HOW THE WARMER'S REQUEST IS TOLD APART. It is a `fetch` with NO Sec-Purpose
 * header. Chromium stamps Sec-Purpose on its own speculative loads (the
 * speculation rules' prefetch, every <link rel=prefetch>), so a second request
 * for the same document from the rules is tolerated and never counted as the
 * warmer's.
 *
 * WRITTEN RED. On the build this wave started from, the two old warmers used
 * <link rel=prefetch as=document> and every other surface warmed nothing, so
 * no hover makes a `fetch`: every surface case, the cap, the touch case and
 * the control inside each refusal case fail. No article preloads its body
 * chunk, and no page carries speculation rules. The cache half skips until
 * the preview is started with production cache headers (KYO_PREVIEW_CACHE=prod,
 * a later lane's middleware); vite preview answers everything `no-cache`.
 *
 * CONTRACTS:
 *   1. Hovering any surface (lead, cards, rows, nav, footer, hero CTA,
 *      breadcrumbs, series, related, pager, chips, byline) fetches its link's
 *      document exactly once, however often it is hovered or focused again.
 *   2. Never this page, a hash, a new tab, a download, an opted-out link, a
 *      dead link, the feed, a PDF or another site.
 *   3. Nothing at all under Save-Data or on a 2g connection.
 *   4. At most ten documents per page load.
 *   5. A touch warms too.
 *   6. Every article preloads its own body chunk in its prerendered HTML.
 *   7. The speculation rules are present and parse, and the hovered article's
 *      speculation prefetch serves the click.
 *   8. CACHE HALF: the preview answers with public/.htaccess's cache headers,
 *      and the article a reader reached for loads with transferSize 0 — the
 *      document, its CSS and JS, the Style Book, o2h.js and its body chunk.
 */

import { existsSync, readFileSync } from 'node:fs';
import { env } from 'node:process';

import { expect, test } from '@playwright/test';

import { ROUTES, settle } from './viewports.js';

/* The bare archive URLs. viewports.js spells them with a trailing slash, which
   the preview answers with a 302 — a redirect no cache measurement may count. */
const ARCHIVE_EN = '/blog';
const ARCHIVE_ES = '/es/blog';
const ARTICLE_EN = ROUTES.find((r) => r.name === 'article EN').path;

/* The repository root, from this file's own location, so no run depends on
   the directory Playwright was started from. */
const ROOT = new URL('../../', import.meta.url);
const read = (url) => (existsSync(url) ? readFileSync(url, 'utf8') : null);
const distFile = (path) => new URL(`dist${path === '/' ? '' : path}/index.html`, ROOT);

/* What a document references that the warmer prefetches: its CSS and JS. The
   same selector use-link-warmer.js reads, so the two cannot disagree. */
const ASSETS = 'link[rel~="stylesheet"][href], link[rel~="modulepreload"][href], script[src]';

const silenceUmami = (page) => page.addInitScript(() => {
  try {
    localStorage.setItem('umami.disabled', '1');
  } catch { /* no storage on this document */ }
});

test.beforeEach(async ({ page }) => {
  await silenceUmami(page);
});

// ------------------------------------------------------------- helpers ----

/* Every request the page makes, kept and judged after the fact. */
const record = (page) => {
  const seen = [];
  page.on('request', (req) => seen.push(req));
  return seen;
};

const bare = (href) => href.split('#')[0];

/* A link's document URL: what the warmer fetches, the hash never sent. */
const urlOf = (link) => link.evaluate((a) => a.href.split('#')[0]);

/* The warmer's requests: `fetch`, and no Sec-Purpose header. */
const warmerFetches = async (seen) => {
  const out = [];
  for (const req of seen) {
    if (req.resourceType() !== 'fetch') {
      continue;
    }
    const headers = await req.allHeaders();
    if (!headers['sec-purpose']) {
      out.push(bare(req.url()));
    }
  }
  return out;
};

const warmsOf = async (seen, url) => (await warmerFetches(seen)).filter((u) => u === url).length;

/* Warmer fetches of anything shaped like a page — no file extension. The
   site's own data fetches (the search index) all carry one. */
const pageWarms = async (seen) => (await warmerFetches(seen))
  .filter((u) => !/\.[a-z0-9]+$/i.test(new URL(u).pathname));

/* The same-origin CSS and JS a prerendered page references, as paths, parsed
   by the browser's own HTML parser (DOMParser runs no script). */
const assetsOf = async (page, path) => {
  const html = read(distFile(path));
  expect(html, `dist${path}/index.html does not exist — build the site first`).not.toBeNull();
  return page.evaluate(({ src, sel }) => [...new DOMParser().parseFromString(src, 'text/html')
    .querySelectorAll(sel)]
    .map((el) => el.getAttribute('href') || el.getAttribute('src'))
    .filter((u) => u.startsWith('/') && !u.startsWith('//'))
    .map((u) => u.split(/[?#]/)[0]), { src: html, sel: ASSETS });
};

/*
 * An article's body chunk, named the way use-blog.js names the body file it
 * imports: /es/blog/engineering/2026-05-01-x -> engineering__2026-05-01-x,
 * then the build's eight-character hash. The hash length is exact, which is
 * what keeps `…-why-org-mode` from matching `…-why-org-mode-beats-markdown`.
 */
const bodyStem = (path) => `/assets/${path.replace(/^(?:\/es)?\/blog\//, '').replaceAll('/', '__')}-`;
const isBodyChunk = (href, stem) => href.startsWith(stem) && /^[\w-]{8}\.js$/.test(href.slice(stem.length));

/* Every article the build published, from its own sitemap. */
const articlePaths = () => {
  const xml = read(new URL('dist/sitemap.xml', ROOT));
  expect(xml, 'dist/sitemap.xml does not exist — build the site first').not.toBeNull();
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)]
    .map(([, loc]) => new URL(loc).pathname)
    .filter((p) => /^(?:\/es)?\/blog\/[^/]+\/[^/]+$/.test(p) && !p.includes('/blog/page/'));
};

// ----------------------------------------------------- 1. every surface ----

/*
 * One link per surface. The archive pager only exists once the corpus runs
 * past one archive page, so that case skips, naming why, on a smaller corpus.
 */
const SURFACES = [
  { name: 'lead', path: ARCHIVE_EN, link: '.blog-lead__cta' },
  { name: 'cards', path: ARCHIVE_EN, link: '.blog-card__link' },
  { name: 'rows', path: ARCHIVE_EN, link: '.blog-all__link' },
  { name: 'rows (ES)', path: ARCHIVE_ES, link: '.blog-all__link' },
  { name: 'nav', path: ARCHIVE_EN, link: '.hud-nav__link[href="/"]' },
  { name: 'footer', path: ARCHIVE_EN, link: '.blog-footer a[href="/resume"]' },
  { name: 'archive pager', path: ARCHIVE_EN, link: '.blog-pagination a[href]', optional: true },
  { name: 'hero CTA', path: '/', link: '.hero__ctas a[href="/resume"]' },
  { name: 'breadcrumbs', path: ARTICLE_EN, link: '.ui-crumbs__link' },
  { name: 'series', path: ARTICLE_EN, link: '.blog-series__item a[href]' },
  { name: 'related', path: ARTICLE_EN, link: '.blog-post-nav__related a[href]' },
  { name: 'article pager', path: ARTICLE_EN, link: '.blog-post-nav__link' },
  { name: 'chips', path: ARTICLE_EN, link: '.blog-post__tag' },
  { name: 'byline', path: ARTICLE_EN, link: '.blog-post__author-name' },
];

for (const surface of SURFACES) {
  test(`${surface.name}: hovering warms its link, once @firefox`, async ({ page }) => {
    const seen = record(page);
    await page.goto(surface.path);
    await settle(page);

    const link = page.locator(surface.link).first();
    if (surface.optional) {
      test.skip(await link.count() === 0, `${surface.path} has one archive page, so there is no pager to hover`);
    }
    await expect(link, `${surface.path} renders no ${surface.link} to hover`).toBeVisible();
    const url = await urlOf(link);

    await link.hover();
    await expect.poll(() => warmsOf(seen, url), { message: `hovering ${surface.link} on ${surface.path} never fetched ${url}` })
      .toBe(1);

    /* Every way back to the same link — off it and on again, then a focus —
       and still the one request. */
    await page.mouse.move(0, 0);
    await link.hover();
    await link.focus();
    await page.waitForTimeout(400);
    expect(await warmsOf(seen, url), `${url} was fetched more than once`).toBe(1);
  });
}

// ------------------------------------------------------ 2. the refusals ----

/*
 * One link per rule the warmer refuses. They are added to the page pinned to
 * its top-left corner, above everything, so hovering them scrolls nothing: a
 * scroll under a resting pointer sends pointer events to whatever slides
 * beneath it, and that real link would be warmed for real.
 */
const REFUSED = [
  { why: 'this same page', href: ARTICLE_EN },
  { why: 'this page at a fragment', href: `${ARTICLE_EN}#where-the-series-ends` },
  { why: 'a hash', href: '#where-the-series-ends' },
  { why: 'a new tab', href: '/resume', attrs: { target: '_blank' } },
  { why: 'a download', href: '/privacy', attrs: { download: '' } },
  { why: 'an opted-out link', href: '/es/privacy', attrs: { 'data-no-warm': '' } },
  { why: 'a dead link', href: '/blog/engineering/no-such-post' },
  { why: 'a PDF', href: '/cv/Cristian-Moreno-Senior-Software-Engineer-EN.pdf' },
  { why: 'the feed', href: '/blog/feed.xml' },
  { why: 'another site', href: 'https://example.com/blog' },
];

test('never warms this page, a hash, a new tab, a download, the feed, a dead link or another site @firefox', async ({ page }) => {
  const seen = record(page);
  await page.goto(ARTICLE_EN);
  await settle(page);

  /* The page's own refused links first, by keyboard alone, before any pointer
     is on the page: the skip link and a contents entry (hashes), the footer's
     feed, a profile in a new tab. */
  for (const sel of ['.hud-nav__skip-link', '.org-toc-link', '.blog-footer a[href="/blog/feed.xml"]', '.hud-nav__social-link']) {
    const link = page.locator(sel).first();
    await link.focus();
    await expect(link, `${sel} could not take focus, so focusing it proved nothing`).toBeFocused();
  }

  await page.evaluate((cases) => {
    const box = document.createElement('div');
    box.setAttribute('data-prefetch-fixture', '');
    box.style.cssText = 'position:fixed;top:0;left:0;z-index:2147483647;display:grid;gap:4px;padding:4px;background:Canvas';
    for (const { href, attrs } of cases) {
      const a = document.createElement('a');
      a.setAttribute('href', href);
      a.textContent = href;
      for (const [name, value] of Object.entries(attrs || {})) {
        a.setAttribute(name, value);
      }
      box.append(a);
    }
    document.body.append(box);
  }, REFUSED);

  const fixtures = page.locator('[data-prefetch-fixture] a');
  for (const [i, refused] of REFUSED.entries()) {
    const link = fixtures.nth(i);
    await expect(link, `the fixture for ${refused.why} is not on screen`).toBeVisible();
    await link.hover();
    await link.focus();
  }
  await page.waitForTimeout(500);

  const here = new URL(page.url());
  const refusedUrls = new Set(REFUSED.map((r) => bare(new URL(r.href, here).href)));
  const wrong = (await warmerFetches(seen)).filter((u) => refusedUrls.has(u) || !/\.[a-z0-9]+$/i.test(new URL(u).pathname));
  expect(wrong, `refused links were fetched: ${wrong.join(', ')}`).toEqual([]);

  /* The control, last: a route link on the same page IS warmed. Without it,
     a build that warms nothing at all would pass every refusal above. */
  const crumb = page.locator('.ui-crumbs__link').first();
  const url = await urlOf(crumb);
  await crumb.focus();
  await expect.poll(() => warmsOf(seen, url), { message: 'the control link was never warmed: nothing is warming, so every refusal above proved nothing' })
    .toBe(1);
});

// ------------------------------------------------- 3. a constrained link ----

/*
 * `navigator.connection` is Chromium's alone. It is replaced here before the
 * first script runs, so Firefox — which has none, and where the warmer must
 * feature-detect it — is handed one as well, and both engines are asked the
 * same question.
 */
const CONSTRAINED = [
  { name: 'Save-Data', connection: { saveData: true, effectiveType: '4g' } },
  { name: 'a 2g connection', connection: { saveData: false, effectiveType: '2g' } },
];

for (const { name, connection } of CONSTRAINED) {
  test(`warms nothing under ${name} @firefox`, async ({ page, context }) => {
    /* The control first, on an ordinary connection: the same link warms. */
    const control = record(page);
    await page.goto(ARCHIVE_EN);
    await settle(page);
    const lead = page.locator('.blog-lead__cta');
    const leadUrl = await urlOf(lead);
    await lead.focus();
    await expect.poll(() => warmsOf(control, leadUrl), { message: 'the lead did not warm on an ordinary connection, so the refusal below proves nothing' })
      .toBe(1);

    const slow = await context.newPage();
    await silenceUmami(slow);
    await slow.addInitScript((c) => {
      Object.defineProperty(Navigator.prototype, 'connection', {
        configurable: true,
        get: () => ({ ...c, addEventListener() {}, removeEventListener() {} }),
      });
    }, connection);
    const seen = record(slow);
    await slow.goto(ARCHIVE_EN);
    await settle(slow);
    expect(await slow.evaluate(() => ({
      saveData: navigator.connection.saveData,
      effectiveType: navigator.connection.effectiveType,
    })), 'the page does not see the connection this test set').toEqual(connection);

    for (const sel of ['.blog-lead__cta', '.blog-card__link', '.blog-all__link']) {
      const link = slow.locator(sel).first();
      await link.hover();
      await link.focus();
    }
    await slow.waitForTimeout(500);
    const warmed = await pageWarms(seen);
    expect(warmed, `${name}: the warmer still fetched ${warmed.join(', ')}`).toEqual([]);
  });
}

// ------------------------------------------------------------- 4. the cap ----

test('warms ten documents on one page and no more @firefox', async ({ page }) => {
  const seen = record(page);
  await page.goto(ARTICLE_EN);
  await settle(page);

  /* Focus every visible same-origin page link, in one go and by keyboard
     focus alone, and count the distinct documents that actually took focus. */
  const offered = await page.evaluate(() => {
    const here = location.href.split('#')[0];
    const took = new Set();
    for (const a of document.querySelectorAll('a[href]')) {
      const url = a.href.split('#')[0];
      if (a.origin !== location.origin || a.target || a.hasAttribute('download')
        || /\.[a-z0-9]+$/i.test(a.pathname) || url === here || !a.checkVisibility()) {
        continue;
      }
      a.focus();
      if (document.activeElement === a) {
        took.add(url);
      }
    }
    return took.size;
  });
  expect(offered, `the article offers only ${offered} distinct page links, so a cap of ten is never reached`).toBeGreaterThan(10);

  await expect.poll(async () => new Set(await pageWarms(seen)).size, { message: 'the warmer did not reach ten documents' })
    .toBe(10);
  await page.waitForTimeout(500);
  expect(new Set(await pageWarms(seen)).size, 'the warmer went past ten documents on one page').toBe(10);
});

// ------------------------------------------------------------ 5. a touch ----

test.describe('on a touch screen', () => {
  test.use({ hasTouch: true });

  test('a touch on a link warms it', async ({ page }) => {
    const seen = record(page);
    await page.goto(ARCHIVE_EN);
    await settle(page);
    const card = page.locator('.blog-card__link').first();
    const url = await urlOf(card);

    await card.dispatchEvent('touchstart');
    await expect.poll(() => warmsOf(seen, url), { message: `a touch on the card never fetched ${url}` })
      .toBe(1);
  });
});

// ------------------------------------------------- 6. the body chunk ----

/*
 * THE ONE FILE THE WARMER CANNOT SEE UNLESS THE PAGE NAMES IT. An article's
 * body is its own chunk, imported after hydration, so nothing in its HTML
 * pointed at it and the warmer's second phase — which reads the next page's
 * HTML — never fetched it ahead. A modulepreload in the prerendered head both
 * starts it with the page and hands it to the warmer.
 */
test('every article preloads its own body chunk', async ({ page }) => {
  const articles = articlePaths();
  expect(articles.length, 'dist/sitemap.xml lists no article').toBeGreaterThan(0);

  const missing = [];
  for (const path of articles) {
    const html = read(distFile(path));
    expect(html, `dist${path}/index.html does not exist — build the site first`).not.toBeNull();
    const preloads = await page.evaluate((src) => [...new DOMParser().parseFromString(src, 'text/html')
      .querySelectorAll('link[rel~="modulepreload"][href]')]
      .map((l) => l.getAttribute('href').split(/[?#]/)[0]), html);
    const stem = bodyStem(path);
    if (!preloads.some((href) => isBodyChunk(href, stem))) {
      missing.push(`${path} (wants ${stem}XXXXXXXX.js)`);
    }
  }
  expect(missing, `articles that do not preload their body chunk:\n${missing.join('\n')}`).toEqual([]);
});

// ------------------------------------------------ 7. speculation rules ----

/*
 * CHROMIUM ONLY: it is the engine that implements them. What Playwright cannot
 * show is left to a hand check: DevTools cancels every prerender, so neither
 * `activationStart > 0` nor "analytics fires only after activation" is
 * measurable here. A prefetch survives, and that is what is asserted.
 */
test('the speculation rules parse, and the hovered article is served from its prefetch', async ({ page }) => {
  const errors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });
  page.on('pageerror', (err) => errors.push(err.message));

  for (const path of ['/', ARCHIVE_EN, ARTICLE_EN]) {
    await page.goto(path);
    await settle(page);
    const found = await page.evaluate(() => ({
      supported: HTMLScriptElement.supports('speculationrules'),
      sets: [...document.querySelectorAll('script[type="speculationrules"]')].map((s) => s.textContent),
    }));
    expect(found.supported, 'this Chromium does not support speculation rules').toBe(true);
    expect(found.sets.length, `${path} carries no <script type="speculationrules">`).toBeGreaterThan(0);
    for (const set of found.sets) {
      expect(() => JSON.parse(set), `${path}: a speculation rule set is not valid JSON`).not.toThrow();
    }
  }
  /* Filtered to the rules on purpose: this test pins the rules, and an
     unrelated console error belongs to the test that owns it. */
  const complaints = errors.filter((text) => /speculation/i.test(text));
  expect(complaints, `the console rejected the speculation rules:\n${complaints.join('\n')}`).toEqual([]);

  await page.goto(ARCHIVE_EN);
  await settle(page);
  const lead = page.locator('.blog-lead__cta');
  const target = await lead.evaluate((a) => a.pathname);
  await lead.hover();
  /* A moderate rule fires after a short hover; then the prefetch itself. */
  await page.waitForTimeout(1500);
  await lead.click();
  await page.waitForURL((u) => u.pathname === target);
  const delivery = await page.evaluate(() => performance.getEntriesByType('navigation')[0].deliveryType);
  expect(delivery, `the click on ${target} did not use the speculation prefetch`).toBe('navigational-prefetch');
});

// -------------------------------------------------- 8. the cache half ----

/*
 * Every Cache-Control rule in public/.htaccess, in file order. Apache applies
 * every <FilesMatch> that matches the served file's NAME, the last one
 * winning, and a route is served as its directory's index.html.
 */
const cacheRules = () => {
  const text = read(new URL('public/.htaccess', ROOT));
  expect(text, 'public/.htaccess does not exist').not.toBeNull();
  return [...text.matchAll(/<FilesMatch "([^"]+)">\s*Header set Cache-Control "([^"]+)"\s*<\/FilesMatch>/g)]
    .map(([, pattern, value]) => ({
      // eslint-disable-next-line security/detect-non-literal-regexp -- the pattern is this repository's own .htaccess, not input
      match: new RegExp(pattern),
      value,
    }));
};
const servedName = (path) => {
  const last = path.split('/').pop();
  return last.includes('.') ? last : 'index.html';
};
const cacheFor = (rules, path) => rules
  .reduce((value, rule) => (rule.match.test(servedName(path)) ? rule.value : value), null);

test.describe('from the HTTP cache', () => {
  test.skip(
    env.KYO_PREVIEW_CACHE !== 'prod',
    'vite preview answers every file with Cache-Control: no-cache, so nothing it serves is ever read back from the cache. Run with KYO_PREVIEW_CACHE=prod once the preview mirrors public/.htaccess (its middleware arrives in a later lane).',
  );

  test('the preview answers with the cache headers of public/.htaccess', async ({ page, request }) => {
    const rules = cacheRules();
    expect(rules.length, 'public/.htaccess sets no Cache-Control').toBeGreaterThan(0);

    const hashed = [...new Set([
      ...await assetsOf(page, ARCHIVE_EN),
      ...await assetsOf(page, ARTICLE_EN),
    ])];
    const paths = [
      '/', ARCHIVE_EN, ARCHIVE_ES, ARTICLE_EN,
      '/blog/style-book.css', '/blog/o2h.js',
      '/sitemap.xml', '/blog/feed.xml', '/manifest.webmanifest', '/robots.txt', '/llms.txt',
      '/blog-search/blog-search-en.json',
      '/og-banner.jpg', '/favicon.svg',
      '/cv/Cristian-Moreno-Senior-Software-Engineer-EN.pdf',
      ...hashed,
    ];

    const wrong = [];
    for (const path of paths) {
      const want = cacheFor(rules, path);
      if (want === null) {
        continue;
      }
      const res = await request.get(path, { maxRedirects: 0 });
      const got = res.headers()['cache-control'];
      if (res.status() !== 200 || got !== want) {
        wrong.push(`${path}: ${res.status()} "${got}", production sends "${want}"`);
      }
    }
    expect(wrong, `the preview does not answer like production:\n${wrong.join('\n')}`).toEqual([]);
  });

  test('the article a reader reached for loads from the cache @firefox', async ({ page }) => {
    const seen = record(page);
    const finished = new Set();
    page.on('requestfinished', (req) => finished.add(bare(req.url())));

    await page.goto(ARCHIVE_EN);
    await settle(page);
    const lead = page.locator('.blog-lead__cta');
    const url = await urlOf(lead);
    const { origin, pathname: target } = new URL(url);

    /* What the article needs that the archive never loaded, read from the two
       prerendered files: exactly what the warmer has to fetch ahead. */
    const archive = new Set(await assetsOf(page, ARCHIVE_EN));
    const need = [...new Set(await assetsOf(page, target))].filter((p) => !archive.has(p));
    /* The style book and its runtime are content-hashed now (sync-blog.mjs); the
       article links the hashed copies. */
    expect(need.some((p) => /^\/blog\/style-book-[\w-]{8}\.css$/.test(p)), `the article no longer asks for the Style Book among ${need.join(', ')}`).toBe(true);
    expect(need.some((p) => /^\/blog\/o2h-[\w-]{8}\.js$/.test(p)), `the article no longer asks for o2h.js among ${need.join(', ')}`).toBe(true);
    expect(need.some((p) => /^\/assets\/blog-post-[\w-]{8}\.js$/.test(p)), `no blog-post view chunk among ${need.join(', ')}`).toBe(true);
    expect(need.some((p) => /^\/assets\/blog-post-[\w-]{8}\.css$/.test(p)), `no blog-post stylesheet among ${need.join(', ')}`).toBe(true);

    /* By keyboard: a focus warms at once, and with no pointer on the page no
       speculation rule fires, so the cache read below was filled by the
       warmer alone. A click would blur that: Chromium reports a navigation
       served from a speculation prefetch with the prefetch's own transfer
       (86,422 B for this article with the rules and no warmer, measured). */
    await lead.focus();
    await expect.poll(() => warmsOf(seen, url), { message: `focusing the lead never fetched ${url}` }).toBe(1);

    /* The warmer's is the request WITHOUT Sec-Purpose. A speculation prefetch
       beside it is tolerated; a third request for the document is not. */
    const forDocument = seen.filter((req) => bare(req.url()) === url);
    const purposes = await Promise.all(forDocument.map(async (req) => (await req.allHeaders())['sec-purpose'] || null));
    expect(purposes.filter((p) => p === null).length, `requests for ${url} without Sec-Purpose: ${purposes.join(', ')}`).toBe(1);
    expect(forDocument.length, `${url} was requested ${forDocument.length} times before the click`).toBeLessThanOrEqual(2);

    /* Time for the prefetches to land. Not itself asserted — whether an engine
       reports a <link rel=prefetch> to Playwright varies — because the
       navigation's transferSize below is the verdict. */
    const deadline = Date.now() + 5000;
    while (need.some((p) => !finished.has(`${origin}${p}`)) && Date.now() < deadline) {
      await page.waitForTimeout(100);
    }

    await page.keyboard.press('Enter');
    await page.waitForURL((u) => u.pathname === target);
    await settle(page);

    const got = await page.evaluate(() => ({
      document: performance.getEntriesByType('navigation')[0].transferSize,
      files: performance.getEntriesByType('resource').map((e) => [new URL(e.name).pathname, e.transferSize]),
    }));
    expect(got.document, `${target} came from the server, not from the cache the warmer filled`).toBe(0);

    const stem = bodyStem(target);
    const body = got.files.map(([p]) => p).find((p) => isBodyChunk(p, stem));
    expect(body, `the article never loaded its body chunk ${stem}XXXXXXXX.js`).toBeTruthy();

    const size = new Map(got.files);
    const fromServer = [...need, body]
      .filter((p) => size.get(p) !== 0)
      .map((p) => `${p} (${size.has(p) ? `${size.get(p)} B` : 'never loaded'})`);
    expect(fromServer, `these came from the server on the navigation, not from the cache:\n${fromServer.join('\n')}`).toEqual([]);
  });
});
