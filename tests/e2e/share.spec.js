/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 */

/*
 * share.spec.js — the blog's share button and the sheet it opens, measured.
 *
 * The article used to end its meta row with a text button that said SHARE and
 * did one of two invisible things. The owner asked for a control that reads as
 * "share" from its icon, in the nav where the résumé keeps its download, and a
 * designed popup that names where it sends the page. Every contract below is
 * one of those asks, pinned:
 *   · the button is in the nav on every blog page and on no other page, it is
 *     prerendered, and it is a real target (24px, 44px on a phone);
 *   · the sheet is a non-modal dialog that opens on the button, closes on
 *     Escape, on a press outside and on a route change, and hands focus back;
 *   · every destination is an exact URL built from the page's canonical link
 *     and its headline — never the host that happens to be serving it;
 *   · Mastodon asks for the reader's server and remembers it;
 *   · the copy row writes the canonical URL and says so;
 *   · the sheet fits the screen at every width and never scrolls the page
 *     sideways;
 *   · and its code is a chunk of its own that no prerendered page asks for.
 */

import { expect, test } from '@playwright/test';

import { ROUTES, settle } from './viewports.js';

const route = (name) => ROUTES.find((r) => r.name === name).path;
const ARTICLE_EN = route('article EN');
const ARTICLE_ES = route('article ES');
const ARCHIVE_EN = route('archive EN');
const ARCHIVE_ES = route('archive ES');

const BUTTON = '.hud-nav button[aria-controls="share-sheet"]';
const SHEET = '#share-sheet[role="dialog"]';
const MASTODON_ROW = `${SHEET} button[aria-controls="share-sheet-mastodon"]`;

/* Pinned rather than read from the catalogue: a test that took its strings
   from the code it checks would pass whatever the strings were. */
const ARIA = { en: 'Share this page', es: 'Compartir esta página' };
const ORDER = ['X', 'Bluesky', 'Mastodon', 'LinkedIn', 'Hacker News', 'Reddit'];
const SITE = 'https://kyonax.com';
const strip = (p) => p.replace(/\/$/, '');

/* The site appends the Umami tracker after mount. Every test here answers it
   with an empty script and aborts every other Umami request, the net
   analytics.spec.js casts, so no run reaches the network or the dashboard —
   and an empty tracker binds no click handler that could swallow a click. */
const UMAMI_HOST = /(^|\.)umami\.(is|dev)$/;

test.beforeEach(async ({ page }) => {
  await page.route((url) => UMAMI_HOST.test(url.hostname), (r) => (
    new URL(r.request().url()).pathname === '/script.js'
      ? r.fulfill({ status: 200, contentType: 'application/javascript', body: '' })
      : r.abort()
  ));
});

/* What the sheet must share, read the way the sheet reads it. */
const readShared = (page) => page.evaluate(() => ({
  canonical: document.querySelector('link[rel="canonical"]').href,
  title: document.querySelector('h1').textContent.replace(/\s+/g, ' ').trim(),
}));

const openSheet = async (page) => {
  await page.locator(BUTTON).click();
  await expect(page.locator(SHEET), 'the share button opened no [role=dialog]#share-sheet').toBeVisible();
};

/* ── The button ─────────────────────────────────────────────────────────── */

const BLOG_PAGES = [
  { path: ARTICLE_EN, lang: 'EN', aria: ARIA.en },
  { path: ARTICLE_ES, lang: 'ES', aria: ARIA.es },
  { path: ARCHIVE_EN, lang: 'EN', aria: ARIA.en },
];

for (const { path, lang, aria } of BLOG_PAGES) {
  for (const width of [390, 1280]) {
    test(`at ${width}px ${path} carries the share button in the nav`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(path);
      await settle(page);

      const button = page.locator(BUTTON);
      await expect(button, `${path} has no share button in .hud-nav`).toHaveCount(1);
      await expect(button, `${path}: the share button is not visible at ${width}px`).toBeVisible();
      await expect(button, `${path}: the share button does not say it opens a dialog`).toHaveAttribute('aria-haspopup', 'dialog');
      await expect(button, `${path}: the share button starts expanded`).toHaveAttribute('aria-expanded', 'false');
      await expect(button, `${path}: the share button's name is not the ${lang} string`).toHaveAttribute('aria-label', aria);

      const box = await button.boundingBox();
      /* WCAG 2.5.8 (AA) sets 24 CSS px as the floor for a pointer target; the
         nav's own controls are 44px tall while it is in its phone mode. */
      expect(Math.min(box.width, box.height), `the share button is ${Math.round(box.width)}×${Math.round(box.height)}px`)
        .toBeGreaterThanOrEqual(24);
      if (width < 700) {
        expect(Math.round(box.height), `below the 700px fold the share button is ${Math.round(box.height)}px tall, not the nav's 44`)
          .toBe(44);
      }
    });
  }
}

test('the Spanish archive names its share button in Spanish', async ({ page }) => {
  await page.goto(ARCHIVE_ES);
  await settle(page);
  await expect(page.locator(BUTTON), `${ARCHIVE_ES}: the share button's name is not the ES string`)
    .toHaveAttribute('aria-label', ARIA.es);
});

for (const path of ['/', '/resume', '/privacy']) {
  test(`${path} has no share button — only the blog shares`, async ({ page }) => {
    await page.goto(path);
    await settle(page);
    await expect(page.locator(BUTTON), `${path} renders the blog's share button`).toHaveCount(0);
  });
}

test('the article meta row no longer carries its own share button', async ({ page }) => {
  for (const path of [ARTICLE_EN, ARTICLE_ES]) {
    await page.goto(path);
    await settle(page);
    await expect(page.locator('.blog-post__meta button.blog-share'), `${path} still renders the old meta-row share button`)
      .toHaveCount(0);
  }
});

/* ── The chunk ──────────────────────────────────────────────────────────── */

for (const path of [ARTICLE_EN, ARCHIVE_EN]) {
  test(`${path} prerenders the button but not the sheet or its chunk`, async ({ page }) => {
    const html = await (await page.request.get(path)).text();
    /* The button's box is in the HTML, so the nav never shifts on hydration. */
    expect(html, `${path} does not prerender the share button`).toMatch(/<button[^>]*aria-controls="share-sheet"/);
    expect(html, `${path} prerenders the sheet itself`).not.toMatch(/id="share-sheet"/);
    expect(html, `${path} links the share-sheet chunk (a <script> or a modulepreload)`)
      .not.toMatch(/share-sheet-[\w-]+\.(?:js|css)/);
  });
}

test('the sheet is fetched on intent, never on load', async ({ page }) => {
  const fetched = [];
  page.on('request', (req) => {
    if (/\/assets\/share-sheet-[\w-]+\.js/.test(req.url())) {
      fetched.push(req.url());
    }
  });
  await page.goto(ARTICLE_EN);
  await settle(page);
  expect(fetched, 'the share-sheet chunk was fetched before anyone reached for the button').toEqual([]);

  /* A pointer arriving on the button warms it, before any click. */
  await page.locator(BUTTON).hover();
  await expect.poll(() => fetched.length, { message: 'hovering the share button did not warm the share-sheet chunk' })
    .toBeGreaterThan(0);
});

/* ── Opening and closing ────────────────────────────────────────────────── */

test('clicking the button opens a non-modal dialog and focuses its first target', async ({ page }) => {
  await page.goto(ARTICLE_EN);
  await settle(page);
  await openSheet(page);

  const sheet = page.locator(SHEET);
  await expect(page.locator(BUTTON), 'aria-expanded did not follow the open sheet').toHaveAttribute('aria-expanded', 'true');
  await expect(sheet, 'the dialog has no accessible name').toHaveAttribute('aria-label', 'Share');
  await expect(sheet, 'the sheet is marked modal — it is not').not.toHaveAttribute('aria-modal', 'true');
  await expect(sheet.locator('a[data-umami-event-to="x"]'), 'opening the sheet did not focus its first target').toBeFocused();

  /* Pressed again, the button is its own toggle rather than a close and an
     instant reopen. */
  await page.locator(BUTTON).click();
  await expect(sheet, 'a second press on the button did not close the sheet').toHaveCount(0);
  await expect(page.locator(BUTTON)).toHaveAttribute('aria-expanded', 'false');
});

test('Escape closes the sheet and hands focus back to the button', async ({ page }) => {
  await page.goto(ARTICLE_EN);
  await settle(page);
  await openSheet(page);
  await expect(page.locator(`${SHEET} a[data-umami-event-to="x"]`)).toBeFocused();

  await page.keyboard.press('Escape');
  await expect(page.locator(SHEET), 'Escape did not close the sheet').toHaveCount(0);
  await expect(page.locator(BUTTON), 'Escape left aria-expanded on "true"').toHaveAttribute('aria-expanded', 'false');
  await expect(page.locator(BUTTON), 'Escape dropped focus instead of returning it to the share button').toBeFocused();
});

test('a press outside the sheet closes it, and so does its own close button', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(ARTICLE_EN);
  await settle(page);

  await openSheet(page);
  /* The page's far left edge at the bottom: outside the sheet, the button and
     every link at this width. */
  await page.mouse.click(8, 880);
  await expect(page.locator(SHEET), 'a press outside the sheet did not close it').toHaveCount(0);
  await expect(page.locator(BUTTON)).toHaveAttribute('aria-expanded', 'false');

  await openSheet(page);
  const close = page.locator(`${SHEET} .share-sheet__close`);
  await expect(close, 'the close button has no name').toHaveAttribute('aria-label', 'Close');
  await close.click();
  await expect(page.locator(SHEET), 'the × did not close the sheet').toHaveCount(0);
  await expect(page.locator(BUTTON), 'the × did not hand focus back to the share button').toBeFocused();
});

test('a route change closes the sheet — the language toggle, by keyboard, so no press lands outside', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(ARTICLE_EN);
  await settle(page);
  await openSheet(page);

  await page.locator('.language-toggle__button').focus();
  await expect(page.locator(SHEET), 'moving focus to the language toggle closed the sheet on its own').toBeVisible();
  await page.keyboard.press('Enter');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');

  await expect(page).toHaveURL((u) => strip(u.pathname) === strip(ARTICLE_ES));
  await expect(page.locator(SHEET), 'the sheet survived the move to the Spanish twin, still showing the English title').toHaveCount(0);
  await expect(page.locator(BUTTON), 'the route change left aria-expanded on "true"').toHaveAttribute('aria-expanded', 'false');
  await expect(page.locator(BUTTON), 'the button kept its English name on the Spanish page').toHaveAttribute('aria-label', ARIA.es);
});

test('at 390px opening the sheet folds the drawer away — one panel drops from the bar at a time', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto(ARTICLE_EN);
  await settle(page);

  await page.locator('.hud-nav__menu-toggle').click();
  await expect(page.locator('.hud-nav--open'), 'the drawer did not open').toHaveCount(1);
  await openSheet(page);
  await expect(page.locator('.hud-nav--open'), 'the drawer stayed open under the sheet').toHaveCount(0);
  await expect(page.locator('main'), 'closing the drawer for the sheet left the page inert').not.toHaveAttribute('inert', '');

  await page.locator('.hud-nav__menu-toggle').click();
  await expect(page.locator(SHEET), 'opening the drawer left the sheet open over it').toHaveCount(0);
});

/* ── Where it sends the page ────────────────────────────────────────────── */

for (const path of [ARTICLE_EN, ARTICLE_ES, ARCHIVE_EN]) {
  test(`${path}: every destination is an exact URL built from the canonical link and the headline`, async ({ page }) => {
    await page.goto(path);
    await settle(page);
    const { canonical, title } = await readShared(page);
    /* The canonical is the address the site stands behind; the test server's
       127.0.0.1 must never be what a reader passes on. */
    expect(canonical, `${path}: the canonical link is not the production URL`).toBe(`${SITE}${strip(path)}`);

    await openSheet(page);
    const sheet = page.locator(SHEET);

    const labels = (await sheet.locator('.share-sheet__list').first().locator('.share-sheet__row').allTextContents())
      .map((s) => s.trim());
    expect(labels, `${path}: the destinations are not X, Bluesky, Mastodon, LinkedIn, Hacker News, Reddit in that order`)
      .toEqual(ORDER);
    await expect(sheet.locator('.share-sheet__title'), `${path}: the sheet does not show the headline it shares`).toHaveText(title);

    const e = encodeURIComponent;
    const EXPECTED = {
      x: `https://x.com/intent/post?text=${e(title)}&url=${e(canonical)}&via=kyonax_on_tech`,
      bluesky: `https://bsky.app/intent/compose?text=${e(`${title} ${canonical}`)}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${e(canonical)}`,
      hackernews: `https://news.ycombinator.com/submitlink?u=${e(canonical)}&t=${e(title)}`,
      reddit: `https://www.reddit.com/submit?url=${e(canonical)}&title=${e(title)}`,
    };
    for (const [to, href] of Object.entries(EXPECTED)) {
      const link = sheet.locator(`a[data-umami-event-to="${to}"]`);
      await expect(link, `${path}: there is no ${to} link`).toHaveCount(1);
      await expect(link, `${path}: the ${to} link points somewhere else`).toHaveAttribute('href', href);
      /* Umami swallows a same-tab link that carries data-umami-event and
         re-navigates it itself; a _blank link it leaves alone. */
      await expect(link, `${path}: the ${to} link does not open a new tab`).toHaveAttribute('target', '_blank');
      await expect(link, `${path}: the ${to} link hands the new tab a window.opener`).toHaveAttribute('rel', /\bnoopener\b/);
      await expect(link, `${path}: the ${to} click is not counted as "share"`).toHaveAttribute('data-umami-event', 'share');
    }
  });
}

test('Mastodon asks for the reader\'s server, posts there, and remembers it', async ({ page }) => {
  await page.goto(ARTICLE_EN);
  await settle(page);
  const { canonical, title } = await readShared(page);
  /* Record what would open instead of opening it. */
  await page.evaluate(() => {
    window.shareOpens = [];
    window.open = (...args) => {
      window.shareOpens.push(args);
      return null;
    };
  });

  await openSheet(page);
  const row = page.locator(MASTODON_ROW);
  await expect(row, 'the Mastodon row starts expanded').toHaveAttribute('aria-expanded', 'false');
  await row.click();
  await expect(row, 'the Mastodon row did not say it opened').toHaveAttribute('aria-expanded', 'true');

  const input = page.locator('#share-sheet-server');
  await expect(input, 'the Mastodon server field did not appear').toBeVisible();
  await expect(input, 'the server field did not take focus').toBeFocused();
  await expect(page.locator('label[for="share-sheet-server"]'), 'the server field has no visible label').toHaveText(/mastodon/i);
  await expect(input).toHaveAttribute('placeholder', 'mastodon.social');
  await expect(input).toHaveAttribute('inputmode', 'url');
  const submit = page.locator(`${SHEET} button[type="submit"]`);
  await expect(submit, 'the Mastodon post is not counted as "share"').toHaveAttribute('data-umami-event', 'share');
  await expect(submit, 'the Mastodon post is not counted as "mastodon"').toHaveAttribute('data-umami-event-to', 'mastodon');

  /* Something that is not a server goes nowhere, and says so to a screen
     reader. */
  await input.fill('not a server');
  await input.press('Enter');
  await expect(input, 'a bad server was not marked aria-invalid').toHaveAttribute('aria-invalid', 'true');
  expect(await page.evaluate(() => window.shareOpens), 'a bad server still opened a window').toEqual([]);

  await input.fill('fosstodon.org');
  await input.press('Enter');
  const text = encodeURIComponent(`${title} ${canonical}`);
  expect(await page.evaluate(() => window.shareOpens), 'Enter did not open fosstodon.org\'s share page in a new tab')
    .toEqual([[`https://fosstodon.org/share?text=${text}`, '_blank', 'noopener']]);
  expect(await page.evaluate(() => localStorage.getItem('kyo:mastodon-server')), 'the server was not remembered')
    .toBe('fosstodon.org');

  /* A pasted profile URL names the same server as the bare host does. */
  await input.fill('https://hachyderm.io/@kyonax');
  await submit.click();
  expect((await page.evaluate(() => window.shareOpens)).at(-1)[0], 'a profile URL was not reduced to its server')
    .toBe(`https://hachyderm.io/share?text=${text}`);

  /* And the next open starts from the remembered server. */
  await page.keyboard.press('Escape');
  await openSheet(page);
  await page.locator(MASTODON_ROW).click();
  await expect(page.locator('#share-sheet-server'), 'reopening did not prefill the remembered server').toHaveValue('hachyderm.io');
});

test('copy link writes the canonical URL, says so, then says it again', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto(ARTICLE_EN);
  await settle(page);
  const { canonical } = await readShared(page);
  await openSheet(page);

  const copy = page.locator(`${SHEET} button[data-umami-event-to="copy"]`);
  await expect(copy, 'there is no copy row').toHaveCount(1);
  await expect(copy, 'the copy click is not counted as "share"').toHaveAttribute('data-umami-event', 'share');
  await expect(copy.locator('[aria-live="polite"]'), 'the copy label is not a polite live region').toHaveCount(1);
  /* Anchored, so a missing catalogue entry — vue-i18n then prints the key,
     `kyo-web.blog.share-copied` — cannot pass for the word. */
  await expect(copy).toHaveText(/^\s*copy link\s*$/i);

  await copy.click();
  await expect(copy, 'the label did not swap to the copied text').toHaveText(/^\s*copied\s*$/i);
  expect(await page.evaluate(() => navigator.clipboard.readText()), 'the copy row did not write the article\'s canonical URL')
    .toBe(canonical);
  await expect(copy, 'the label did not come back within 2s').toHaveText(/^\s*copy link\s*$/i, { timeout: 2000 });
});

test('"More options" is offered only where the system share sheet exists', async ({ page }) => {
  /* Chromium ships navigator.share on some platforms and not on others, so
     the absent case is forced rather than assumed. */
  await page.addInitScript(() => {
    delete Navigator.prototype.share;
  });
  await page.goto(ARTICLE_EN);
  await settle(page);
  await openSheet(page);
  await expect(page.locator(`${SHEET} button[data-umami-event-to="native"]`), 'the sheet offers a system share that does not exist')
    .toHaveCount(0);
});

test('"More options" hands the system share sheet the title and the canonical URL, and a cancel is no error', async ({ page }) => {
  const errors = [];
  page.on('pageerror', (err) => errors.push(err.message));
  /* A reader who closes the system sheet rejects with AbortError. */
  await page.addInitScript(() => {
    window.shareCalls = [];
    Object.defineProperty(Navigator.prototype, 'share', {
      configurable: true,
      value(data) {
        window.shareCalls.push(data);
        return Promise.reject(new DOMException('The user cancelled the share.', 'AbortError'));
      },
    });
  });
  await page.goto(ARTICLE_EN);
  await settle(page);
  const { canonical, title } = await readShared(page);
  await openSheet(page);

  const more = page.locator(`${SHEET} button[data-umami-event-to="native"]`);
  await expect(more, 'the sheet does not offer the system share where it exists').toHaveCount(1);
  await expect(more).toHaveText(/^\s*more options\s*$/i);
  await more.click();
  expect(await page.evaluate(() => window.shareCalls), 'navigator.share was not handed the headline and the canonical URL')
    .toEqual([{ title, url: canonical }]);
  await expect(page.locator(SHEET), 'a cancelled system share closed the sheet').toBeVisible();
  expect(errors, `a cancelled system share surfaced as an error: ${errors.join(' | ')}`).toEqual([]);
});

/* ── It fits ────────────────────────────────────────────────────────────── */

/*
 * The Spanish article, with the Mastodon field open: the longest labels and
 * the widest state the sheet has. From the 700px fold up it hangs off the
 * button's right edge; below it, it is a panel under the bar inside the bar's
 * own 1rem (12px) gutter.
 */
for (const width of [320, 390, 700, 768, 1024, 1600]) {
  test(`at ${width}px the open sheet sits inside the viewport and nothing scrolls sideways`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(ARTICLE_ES);
    await settle(page);
    await openSheet(page);
    await page.locator(MASTODON_ROW).click();
    await expect(page.locator('#share-sheet-server')).toBeVisible();

    const m = await page.evaluate(([sheetSel, buttonSel]) => {
      const d = document.documentElement;
      const sheet = document.querySelector(sheetSel);
      const s = sheet.getBoundingClientRect();
      const b = document.querySelector(buttonSel).getBoundingClientRect();
      return {
        left: s.left,
        right: s.right,
        top: s.top,
        bottom: s.bottom,
        buttonRight: b.right,
        vw: d.clientWidth,
        vh: window.innerHeight,
        scrollWidth: d.scrollWidth,
        inner: sheet.scrollWidth - sheet.clientWidth,
      };
    }, [SHEET, BUTTON]);

    expect(m.left, `the sheet's left edge is ${Math.round(m.left)}px, off the screen`).toBeGreaterThanOrEqual(0);
    expect(m.right, `the sheet's right edge is at ${Math.round(m.right)}px in a ${m.vw}px viewport`).toBeLessThanOrEqual(m.vw);
    expect(m.top, `the sheet's top is ${Math.round(m.top)}px, above the screen`).toBeGreaterThanOrEqual(0);
    expect(m.bottom, `the sheet's bottom is at ${Math.round(m.bottom)}px in a ${m.vh}px viewport`).toBeLessThanOrEqual(m.vh);
    expect(m.scrollWidth, `the open sheet made the page ${m.scrollWidth - m.vw}px wider than the viewport`).toBeLessThanOrEqual(m.vw + 1);
    expect(m.inner, `the sheet scrolls sideways inside itself by ${m.inner}px`).toBeLessThanOrEqual(1);

    if (width >= 700) {
      expect(Math.abs(m.right - m.buttonRight), `the sheet's right edge is ${Math.round(m.right - m.buttonRight)}px off the button's`)
        .toBeLessThanOrEqual(1);
    } else {
      expect(Math.abs(m.left - 12), `the panel's left gutter is ${Math.round(m.left)}px, not 12`).toBeLessThanOrEqual(1);
      expect(Math.abs(m.vw - m.right - 12), `the panel's right gutter is ${Math.round(m.vw - m.right)}px, not 12`).toBeLessThanOrEqual(1);
    }
  });
}
