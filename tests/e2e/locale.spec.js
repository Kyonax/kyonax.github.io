/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 */

/*
 * locale.spec.js — the language toggle has to change the LANGUAGE, not just
 * the address bar, and on the blog it has to change all of it at once.
 *
 * THE DEFECT THIS PINS. On an article, choosing ES pushed the Spanish twin's
 * URL, flipped <html lang> and re-formatted the date — and left the English
 * headline and body on screen. The route changed; the article did not. App.vue
 * rendered the article view without a key, so Vue patched the SAME instance,
 * and that instance had awaited its post once, in setup. The archive never
 * showed it because it derives everything from the route, and every link on
 * the blog is a full page load, so the toggle was the only client-side move
 * between two articles. Nothing short of a browser clicking the real control
 * could have seen it.
 *
 * THE KEY FIXED THE ARTICLE AND LEFT A FRAME IN TWO LANGUAGES. A keyed
 * <Suspense> with no fallback HOLDS the old view until the new one has loaded,
 * while the nav labels, the date and <html lang> have already switched; an
 * article with no twin, which lands on the archive, showed an empty <main>
 * instead. So on a blog path the toggle is now a FULL PAGE LOAD that carries
 * the query and the hash (use-language.js), and every other page keeps its
 * client-side push. Both halves are pinned here: the blog toggle starts a new
 * document and no sampled frame disagrees with itself about its language, and
 * the landing, the resume and the privacy page keep the document they had.
 *
 * WHY A MARKER ON `window`. A full load builds a new window object and a
 * client-side move keeps the old one, so a value written into the page before
 * the toggle is gone after a full load and still there after a push. That one
 * bit is the difference every test below reads.
 */

import { expect, test } from '@playwright/test';

import { ROUTES, settle } from './viewports.js';

const EN = ROUTES.find((r) => r.name === 'article EN').path;
const ES = ROUTES.find((r) => r.name === 'article ES').path;

const strip = (p) => p.replace(/\/$/, '');

/* The site appends the Umami tracker after mount. It is answered with an
   empty script and every other Umami request is aborted, the net
   analytics.spec.js casts, so no run reaches the network or the dashboard. */
const UMAMI_HOST = /(^|\.)umami\.(is|dev)$/;

test.beforeEach(async ({ page }) => {
  await page.route((url) => UMAMI_HOST.test(url.hostname), (route) => (
    new URL(route.request().url()).pathname === '/script.js'
      ? route.fulfill({ status: 200, contentType: 'application/javascript', body: '' })
      : route.abort()
  ));
});

const chooseLanguage = async (page, code) => {
  await page.locator('.language-toggle__button:visible').first().click();
  await page.locator(`#language-option-${code}:visible`).first().click();
};

const markDocument = (page, value) => page.evaluate((v) => {
  window.__kyoLocaleSpec = v;
}, value);

const markOf = (page) => page.evaluate(() => window.__kyoLocaleSpec);

for (const width of [390, 1280]) {
  test(`at ${width}px the toggle swaps an article for its translation`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });

    /* What each language's article actually says, read from the pages
       themselves rather than hard-coded, so a retitled post cannot break this. */
    await page.goto(ES);
    await settle(page);
    const esTitle = (await page.locator('h1').first().textContent()).trim();
    /* The nav's share button is named only by its aria-label — it is an icon —
       so that name has to follow the toggle as well. */
    const share = page.locator('.hud-nav button[aria-controls="share-sheet"]');
    await expect(share, 'the ES article renders no share button in the nav to compare').toHaveCount(1);
    const esShare = await share.getAttribute('aria-label');
    await page.goto(EN);
    await settle(page);
    const enTitle = (await page.locator('h1').first().textContent()).trim();
    const enFirst = (await page.locator('.org-root .org-paragraph').first().textContent()).trim();
    expect(esTitle, 'the two articles share a headline — nothing to tell apart').not.toBe(enTitle);

    await markDocument(page, 'en');
    await chooseLanguage(page, 'es');
    await page.waitForURL((u) => strip(u.pathname) === strip(ES));
    await expect(page.locator('html')).toHaveAttribute('lang', 'es');
    await expect(page.locator('h1').first(), 'the headline stayed in English').toHaveText(esTitle);
    await expect(page.locator('.org-root .org-paragraph').first(), 'the body stayed in English')
      .not.toHaveText(enFirst);
    await expect(share, 'the share button stayed in English').toHaveAttribute('aria-label', esShare);
    expect(await markOf(page), 'the toggle swapped the article inside the English document: a client-side move, not a page load')
      .toBeUndefined();

    /* Back leaves the Spanish DOCUMENT. A real browser may restore the English
       one from the back/forward cache (its marker then reads "en") or load it
       again (no marker); Playwright turns that cache off in both engines, so
       here it is a load. What it can never be again is a move inside the
       Spanish page, which is what Back was while the toggle pushed. */
    await markDocument(page, 'es');
    await page.goBack();
    await expect(page).toHaveURL((u) => strip(u.pathname) === strip(EN));
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.locator('h1').first(), 'Back restored the URL but not the article').toHaveText(enTitle);
    await expect(page.locator('.org-root .org-paragraph').first(), 'Back restored the headline but not the body')
      .toHaveText(enFirst);
    expect(await markOf(page), 'Back stayed inside the Spanish document').not.toBe('es');
  });
}

/*
 * NO FRAME MIXES LANGUAGES. The failure is a stretch of frames, not an end
 * state: by the time any assertion above runs, the held article has been
 * swapped and every check passes. So a sampler goes into EVERY document the
 * test opens, before the page's own scripts, and reads three things: <html
 * lang>, the headline and one nav label. It reads them on every animation
 * frame, at every navigation event and after every DOM mutation; the last is
 * what makes a fast machine honest, because a swap quicker than one frame
 * slips between two frame readings, and a state the DOM passes through is a
 * state a frame can paint. Each distinct reading is appended to
 * sessionStorage, which belongs to the tab rather than to the document, so it
 * outlives the full loads it records.
 *
 * A reading taken while a document is still being PARSED is not judged: the
 * parser can stop halfway through a headline's text, and a half-parsed page is
 * prerendered HTML in one language anyway. Every reading after that must name
 * one language three times.
 */
const FRAMES_KEY = 'kyo-locale-spec:frames';
const SURFACE = {
  h1: 'h1',
  label: '.hud-nav button[aria-controls="share-sheet"]',
};

const recordFrames = ({ key, sel }) => {
  const doc = Math.random().toString(36).slice(2, 10);
  let last = '';
  const sample = () => {
    const root = document.documentElement;
    const h1 = document.querySelector(sel.h1);
    const label = document.querySelector(sel.label);
    const row = [
      doc,
      document.readyState,
      root ? (root.getAttribute('lang') || '').slice(0, 2) : null,
      h1 ? h1.textContent.replace(/\s+/g, ' ').trim() : null,
      label ? label.getAttribute('aria-label') : null,
    ];
    const json = JSON.stringify(row);
    if (json === last) {
      return;
    }
    last = json;
    try {
      const rows = JSON.parse(sessionStorage.getItem(key) || '[]');
      rows.push(row);
      sessionStorage.setItem(key, JSON.stringify(rows));
    } catch { /* no storage on this document */ }
  };
  const tick = () => {
    sample();
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
  for (const type of ['DOMContentLoaded', 'load', 'pageshow', 'popstate', 'hashchange', 'pagehide']) {
    window.addEventListener(type, sample, true);
  }
  new MutationObserver(sample).observe(document, {
    subtree: true, childList: true, characterData: true, attributes: true,
  });
};

const readSurface = (page) => page.evaluate((sel) => {
  const h1 = document.querySelector(sel.h1);
  const label = document.querySelector(sel.label);
  return {
    h1: h1 ? h1.textContent.replace(/\s+/g, ' ').trim() : null,
    label: label ? label.getAttribute('aria-label') : null,
  };
}, SURFACE);

test('no frame shows the article in one language and its labels in the other', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });

  await page.goto(ES);
  await settle(page);
  const es = await readSurface(page);
  await page.addInitScript(recordFrames, { key: FRAMES_KEY, sel: SURFACE });
  await page.goto(EN);
  await settle(page);
  const en = await readSurface(page);
  expect(es.h1, 'the two articles share a headline — nothing to tell apart').not.toBe(en.h1);
  expect(es.label, 'the share label reads the same in both languages — nothing to tell apart').not.toBe(en.label);

  await chooseLanguage(page, 'es');
  await page.waitForURL((u) => strip(u.pathname) === strip(ES));
  await expect(page.locator('h1').first()).toHaveText(es.h1);
  await settle(page);
  await page.goBack();
  await expect(page.locator('h1').first()).toHaveText(en.h1);
  await settle(page);

  const rows = await page.evaluate((key) => JSON.parse(sessionStorage.getItem(key) || '[]'), FRAMES_KEY);
  const said = (text, pair) => {
    if (text === pair.en) {
      return 'en';
    }
    return text === pair.es ? 'es' : `? ${JSON.stringify(text)}`;
  };
  const judged = rows
    .filter(([, state]) => state !== 'loading')
    .map(([doc, , lang, h1, label]) => ({
      doc,
      lang,
      h1: said(h1, { en: en.h1, es: es.h1 }),
      label: said(label, { en: en.label, es: es.label }),
    }));
  const whole = (code) => judged.some((f) => f.lang === code && f.h1 === code && f.label === code);
  expect(whole('en'), `the sampler never saw the English article whole: ${JSON.stringify(rows)}`).toBe(true);
  expect(whole('es'), `the sampler never saw the Spanish article whole: ${JSON.stringify(rows)}`).toBe(true);
  const mixed = judged.filter((f) => f.h1 !== f.lang || f.label !== f.lang);
  expect(mixed, `frames that disagree about their language: ${JSON.stringify(mixed)}`).toEqual([]);
});

/*
 * WARMED BEFORE THE CLICK. On an article the pointer reaching the toggle
 * fetches the Spanish twin's document, so the full load that follows can read
 * it from the HTTP cache; opening the menu asks for the same URL and must not
 * fetch it twice. The landing's toggle never loads a document, so it warms
 * nothing. Counted from the page's `fetch` requests, the only kind the warm
 * makes.
 */
test('reaching for the toggle warms the other language\'s article once, and nothing on the landing', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  const fetched = [];
  page.on('request', (req) => {
    if (req.resourceType() === 'fetch') {
      fetched.push(strip(new URL(req.url()).pathname));
    }
  });
  const trigger = page.locator('.language-toggle__button:visible').first();
  const warmed = (path) => fetched.filter((p) => p === strip(path)).length;

  await page.goto(EN);
  await settle(page);
  await trigger.hover();
  await expect.poll(() => warmed(ES), { message: 'hovering the toggle on an article did not warm its translation' })
    .toBe(1);
  await trigger.click();
  await expect(page.locator('#language-option-es:visible')).toHaveCount(1);
  await page.waitForTimeout(300);
  expect(warmed(ES), 'opening the menu fetched the translation a second time').toBe(1);

  await page.goto('/');
  await settle(page);
  await trigger.hover();
  await trigger.click();
  await expect(page.locator('#language-option-es:visible')).toHaveCount(1);
  await page.waitForTimeout(300);
  expect(warmed('/es'), 'the landing warmed a document its client-side toggle never loads').toBe(0);
});

/*
 * THE ARCHIVE HAD THE ARTICLE'S BUG, AND THE FIRST VERSION OF THIS TEST COULD
 * NOT SEE IT. It checked the <h1> — an i18n string, which swaps on its own —
 * so it passed while the lead, its cover, the cards and every row stayed
 * English: the view awaited its posts once, in setup, and Vue reused it. It now
 * compares EVERYTHING the archive renders against the Spanish page loaded
 * directly, which is the only honest definition of "translated".
 */
const archiveState = (page) => page.evaluate(() => {
  const text = (sel) => [...document.querySelectorAll(sel)].map((el) => el.textContent.trim());
  /* The hero's chip and the marquee's screen-reader sentence are the corpus's
     numbers in the page's language, so they must follow the toggle like the
     rest. A missing one THROWS: two archives that both lack the chip would
     compare equal and prove nothing. */
  const said = (sel) => {
    const el = document.querySelector(sel);
    if (!el) {
      throw new Error(`the archive renders no ${sel}`);
    }
    return el.textContent.replace(/\s+/g, ' ').trim();
  };
  const img = document.querySelector('.blog-lead img, .blog-lead__media img');
  return {
    h1: text('h1'),
    lead: text('.blog-lead__title, .blog-lead__excerpt'),
    cards: text('.blog-card__title'),
    rows: text('.blog-all__title'),
    image: img ? (img.getAttribute('alt') || '') : null,
    chip: said('.blog-hero__chip'),
    marqueeSr: said('.blog-marquee__sr'),
  };
});

test('the toggle swaps the archive for its translation', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/es/blog');
  await settle(page);
  const es = await archiveState(page);
  await page.goto('/blog');
  await settle(page);
  const en = await archiveState(page);
  expect(es.rows, 'the two archives list the same titles — nothing to tell apart').not.toEqual(en.rows);

  await chooseLanguage(page, 'es');
  await expect(page).toHaveURL((u) => strip(u.pathname) === '/es/blog');
  await expect(page.locator('h1').first()).toHaveText(es.h1[0]);
  await settle(page);
  expect(await archiveState(page), 'the archive kept English content after switching to ES').toEqual(es);
});

/*
 * THE SEARCH TERM AND THE HASH CROSS OVER. The owner decided that a reader
 * who searched the English archive lands on the Spanish one searching for the
 * same thing, at the same place. The term is read back DECODED: the archive
 * may rewrite its own query on mount (a space as `+` or as `%20`), and either
 * spelling is the same term.
 */
const TERM = 'org mode';

test('the toggle on the archive keeps the ?search= term and the hash @firefox', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(`/blog?search=${encodeURIComponent(TERM)}#all-posts`);
  await settle(page);

  await markDocument(page, 'en');
  await chooseLanguage(page, 'es');
  await page.waitForURL((u) => strip(u.pathname) === '/es/blog');
  const url = new URL(page.url());
  expect(url.searchParams.get('search'), `the toggle dropped the search term: ${page.url()}`).toBe(TERM);
  expect(url.hash, `the toggle dropped the hash: ${page.url()}`).toBe('#all-posts');
  await expect(page.locator('html')).toHaveAttribute('lang', 'es');
  expect(await markOf(page), 'the archive toggle stayed inside the English document').toBeUndefined();
  await expect(page.locator('#blog-search-input'), 'the Spanish archive opened with an empty search field')
    .toHaveValue(TERM);
});

/*
 * EVERYWHERE ELSE THE TOGGLE STAYS A CLIENT-SIDE MOVE, AND THE READER STAYS
 * PUT. These views re-render from the catalogue in one pass, so they never had
 * a mixed frame, and the reason the landing keeps its push is its scroll
 * position. That position was being lost anyway: the toggle handed focus back
 * to its trigger in the sticky nav, and Chromium scrolled the page ~450px up
 * to "reveal" a button already on screen. The marker half passes on the build
 * before this change; the scroll half fails there in Chromium.
 *
 * The clicks are DISPATCHED here, not made with click(): before a real click
 * Playwright scrolls its target into view, and inside the sticky nav that alone
 * moves the page, so the number would measure Playwright instead of the
 * toggle. The tolerance is scroll anchoring's: the Spanish text above the fold
 * is a line longer or shorter, and the browser moves with it (0px in Chromium,
 * 24px on Firefox's resume, measured on the dev server).
 */
const IN_PLACE = [
  { name: 'landing', from: '/', to: '/es' },
  { name: 'resume', from: '/resume', to: '/es/hoja-de-vida' },
  { name: 'privacy page', from: '/privacy', to: '/es/privacy' },
];

for (const { name, from, to } of IN_PLACE) {
  test(`the ${name}'s toggle switches language in place, where the reader was`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto(from);
    await settle(page);
    /* `instant`: the site's html carries scroll-behavior: smooth. */
    await page.evaluate(() => window.scrollTo({ top: 600, behavior: 'instant' }));
    const before = await page.evaluate(() => window.scrollY);

    await markDocument(page, 'en');
    await page.locator('.language-toggle__button:visible').first().dispatchEvent('click');
    await page.locator('#language-option-es:visible').first().dispatchEvent('click');
    await expect(page).toHaveURL((u) => strip(u.pathname) === to);
    await expect(page.locator('html')).toHaveAttribute('lang', 'es');
    /* Long enough for a smooth scroll to finish, so a jump is seen whole. */
    await settle(page);
    expect(await markOf(page), `the ${name}'s toggle reloaded the page`).toBe('en');
    const moved = Math.abs((await page.evaluate(() => window.scrollY)) - before);
    expect(moved, `the ${name}'s toggle moved the reader ${moved}px from where they were`).toBeLessThan(100);
  });
}
