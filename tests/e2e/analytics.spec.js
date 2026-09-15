/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 */

/*
 * analytics.spec.js — Google Analytics out, Umami in, the banner gone.
 *
 * WHY A BROWSER. Neither tracker is in the prerendered HTML. gtag.js was
 * appended by the consent banner, and the Umami tracker is appended after mount
 * by src/composables/use-analytics.js. A gate that reads dist/ as strings sees
 * neither; only a page that hydrates can say which third party it called.
 *
 * HERMETIC. No run may reach the real Umami, because every hit would land as a
 * pageview on the owner's dashboard, and no run may reach Google. The tracker
 * is answered with an empty script and everything else on either host is
 * aborted, so the spec passes offline. An aborted request is still a request
 * the page MADE, and that is what gets counted.
 *
 * WRITTEN RED. Against the GA build every contract below fails and says why:
 * the banner sits on every route, a returning visitor's stored "accept" loads
 * gtag.js, there is no tracker to count, and Escape on the banner writes
 * kyo:consent.
 *
 * FIVE CONTRACTS:
 *   1. No route shows a cookie banner. There are no cookies to ask about.
 *   2. No route calls Google, whatever an old visit left in storage.
 *   3. Every route loads the Umami tracker exactly once, with the site's id and
 *      Do Not Track respected, and a client-side move does not add a second.
 *   4. `umami.disabled` in localStorage means no tracker and no call to Umami.
 *   5. Nothing writes the retired `kyo:consent` key, and no cookie is set.
 */

import { expect, test } from '@playwright/test';

import { settle } from './viewports.js';

/*
 * One page of every KIND, in both languages. All of them render through
 * App.vue, which is where the banner lived and where the tracker mounts. The
 * error pages are left out on purpose: they are static files in
 * public/error-pages that load no script at all.
 */
const PAGES = [
  { name: 'landing EN', path: '/' },
  { name: 'landing ES', path: '/es' },
  { name: 'archive EN', path: '/blog/' },
  { name: 'archive ES', path: '/es/blog/' },
  { name: 'article EN', path: '/blog/engineering/2026-05-15-from-org-to-ast' },
  { name: 'article ES', path: '/es/blog/engineering/2026-05-15-de-org-al-ast' },
  { name: 'resume EN', path: '/resume' },
  { name: 'resume ES', path: '/es/hoja-de-vida' },
  { name: 'privacy EN', path: '/privacy' },
  { name: 'privacy ES', path: '/es/privacy' },
];

/*
 * The site's Umami website id, a public identifier like the GA measurement id
 * was. Pinned here rather than read from src/data/data.js: a test that took the
 * id from the code it checks would pass whatever the id was.
 */
const WEBSITE_ID = '986ec25b-3715-4d9e-8e63-f168650bfac7';

const TRACKER = 'script[src*="cloud.umami.is/script.js"]';
const BANNER = '.cookie-consent';

/* Umami Cloud serves the tracker from umami.is and may collect on umami.dev,
   so both are answered here. The Google hosts are the ones gtag.js talks to. */
const UMAMI_HOST = /(^|\.)umami\.(is|dev)$/;
const GOOGLE_HOST = /(^|\.)(googletagmanager\.com|google-analytics\.com|analytics\.google\.com)$/;

const LANDING_EN = PAGES.find((r) => r.name === 'landing EN').path;
const LANDING_ES = PAGES.find((r) => r.name === 'landing ES').path;

const strip = (p) => p.replace(/\/$/, '');

const onHost = (seen, host) => [...seen].filter((u) => host.test(new URL(u).hostname));

/*
 * Route both third parties locally and record every request the page makes.
 * Returns the live set; read it after the page has settled. The handlers
 * record too, so a routed request is counted however Playwright orders its
 * events.
 */
const guard = async (page) => {
  const seen = new Set();
  page.on('request', (req) => seen.add(req.url()));
  await page.route((url) => UMAMI_HOST.test(url.hostname), (route) => {
    seen.add(route.request().url());
    if (new URL(route.request().url()).pathname === '/script.js') {
      return route.fulfill({ status: 200, contentType: 'application/javascript', body: '' });
    }
    return route.abort();
  });
  await page.route((url) => GOOGLE_HOST.test(url.hostname), (route) => {
    seen.add(route.request().url());
    return route.abort();
  });
  return seen;
};

/* Write a localStorage key before the app's first script runs, on every
   navigation from here on. Storage can throw on about:blank, so the write is
   wrapped. */
const seedStorage = (page, key, value) => page.addInitScript(([k, v]) => {
  try {
    localStorage.setItem(k, v);
  } catch { /* no storage on this document */ }
}, [key, value]);

/* Every Umami tracker in the document, not only the ones carrying an id —
   that is what makes "exactly one" mean one. */
const trackers = (page) => page.locator(TRACKER).evaluateAll((els) => els.map((s) => ({
  websiteId: s.getAttribute('data-website-id'),
  doNotTrack: s.getAttribute('data-do-not-track'),
})));

for (const route of PAGES) {
  test.describe(route.name, () => {
    test('shows no cookie banner and calls nothing from Google', async ({ page }) => {
      const seen = await guard(page);
      await page.goto(route.path);
      await settle(page);

      expect(await page.locator(BANNER).count(), `${route.path} still shows the cookie banner`).toBe(0);
      const google = onHost(seen, GOOGLE_HOST);
      expect(google, `${route.path} called Google: ${google.join(', ')}`).toEqual([]);
    });

    /* Everyone who clicked Accept under the old banner still carries
       kyo:consent=granted, and the GA build loads gtag.js for them on mount
       without asking again. That is the load this test catches: a fresh
       visitor never triggered it, because the old banner waited for an answer. */
    test('calls nothing from Google for a visitor who accepted the old banner', async ({ page }) => {
      await seedStorage(page, 'kyo:consent', 'granted');
      const seen = await guard(page);
      await page.goto(route.path);
      await settle(page);

      const google = onHost(seen, GOOGLE_HOST);
      expect(google, `${route.path} called Google: ${google.join(', ')}`).toEqual([]);
      expect(await page.evaluate(() => typeof window.gtag), `${route.path} still defines window.gtag`)
        .toBe('undefined');
    });

    test('loads the Umami tracker exactly once', async ({ page }) => {
      await guard(page);
      await page.goto(route.path);
      await settle(page);

      const found = await trackers(page);
      expect(found.length, `${route.path} has ${found.length} Umami trackers after hydration, not 1`).toBe(1);
      expect(found[0].websiteId, `${route.path}: the tracker carries the wrong website id`).toBe(WEBSITE_ID);
      expect(found[0].doNotTrack, `${route.path}: the tracker does not respect Do Not Track`).toBe('true');
    });

    test('loads no tracker once umami.disabled is set', async ({ page }) => {
      const seen = await guard(page);

      /* The control first. Without it this test passes on a build that never
         loads a tracker at all, which is exactly a build it has to catch. */
      await page.goto(route.path);
      await settle(page);
      const control = (await trackers(page)).length;
      expect(control, `${route.path} has ${control} trackers without the flag, so the opt-out proves nothing`).toBe(1);

      await seedStorage(page, 'umami.disabled', '1');
      seen.clear();
      await page.goto(route.path);
      await settle(page);
      expect((await trackers(page)).length, `${route.path} injected the tracker with umami.disabled set`).toBe(0);
      const umami = onHost(seen, UMAMI_HOST);
      expect(umami, `${route.path} called Umami with umami.disabled set: ${umami.join(', ')}`).toEqual([]);
    });
  });
}

/*
 * ONCE PER PAGE LOAD, NOT PER VIEW. On a blog path the language toggle is a
 * full page load now, so the moves left inside one document are the toggle on
 * the landing, the resume and the privacy page. An injection that ran per view
 * instead of per page load would add a second tracker here.
 */
test('a client-side move does not inject a second tracker', async ({ page }) => {
  await guard(page);
  await page.goto(LANDING_EN);
  await settle(page);
  const before = (await trackers(page)).length;
  expect(before, `the landing has ${before} trackers before any move, not 1`).toBe(1);

  await page.locator('.language-toggle__button:visible').first().click();
  await page.locator('#language-option-es:visible').first().click();
  await expect(page).toHaveURL((u) => strip(u.pathname) === strip(LANDING_ES));
  await settle(page);
  const after = (await trackers(page)).length;
  expect(after, `the switch to ES left ${after} trackers, not 1`).toBe(1);
});

/*
 * THE RETIRED KEY STAYS RETIRED. Loading the page cannot prove it on its own:
 * the old banner wrote kyo:consent only once the visitor answered it. Escape
 * was an answer (the banner's decline key, and what a visitor presses to wave
 * any notice away), so the test presses it. The same visit must leave no
 * cookie behind, because "cookieless" is the reason there is no banner.
 */
test('nothing writes kyo:consent and no cookie is set', async ({ page }) => {
  await guard(page);
  await page.goto('/');
  await settle(page);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(250);

  const stored = await page.evaluate(() => localStorage.getItem('kyo:consent'));
  expect(stored, `kyo:consent was written ("${stored}")`).toBeNull();
  const cookies = (await page.context().cookies()).map((c) => `${c.name} (${c.domain})`);
  expect(cookies, `the landing set cookies: ${cookies.join(', ')}`).toEqual([]);
});
