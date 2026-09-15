/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 */

/*
 * locale.spec.js — the language toggle has to change the LANGUAGE, not just
 * the address bar.
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

    await chooseLanguage(page, 'es');
    await expect(page).toHaveURL((u) => strip(u.pathname) === strip(ES));
    await expect(page.locator('html')).toHaveAttribute('lang', 'es');
    await expect(page.locator('h1').first(), 'the headline stayed in English').toHaveText(esTitle);
    await expect(page.locator('.org-root .org-paragraph').first(), 'the body stayed in English')
      .not.toHaveText(enFirst);
    await expect(share, 'the share button stayed in English').toHaveAttribute('aria-label', esShare);

    /* Back is a client-side move too, and must bring the English article back. */
    await page.goBack();
    await expect(page).toHaveURL((u) => strip(u.pathname) === strip(EN));
    await expect(page.locator('h1').first(), 'Back restored the URL but not the article').toHaveText(enTitle);
  });
}

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
  await page.goto('/es/blog/');
  await settle(page);
  const es = await archiveState(page);
  await page.goto('/blog/');
  await settle(page);
  const en = await archiveState(page);
  expect(es.rows, 'the two archives list the same titles — nothing to tell apart').not.toEqual(en.rows);

  await chooseLanguage(page, 'es');
  await expect(page).toHaveURL((u) => strip(u.pathname) === '/es/blog');
  await expect(page.locator('h1').first()).toHaveText(es.h1[0]);
  expect(await archiveState(page), 'the archive kept English content after switching to ES').toEqual(es);
});
