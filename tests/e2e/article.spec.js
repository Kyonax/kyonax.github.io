/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 */

/*
 * article.spec.js — the furniture around an article's words, measured.
 *
 * Every contract here is one the owner reported broken by looking at a phone:
 *   · the breadcrumb wrapped and started its second line with a bare "/";
 *   · the table of contents was one weight, one size, one indent;
 *   · a bar chart rendered its labels at about 4px — the figure kept the
 *     browser's 40px side margins, so it drew at 210px inside a 290px column;
 *   · the footnote back-links were a single glyph wide — then a boxed square
 *     the owner turned down: the whole note is the way back now;
 *   · the tag chips broke their words letter by letter in Firefox;
 *   · a display equation ran past its column in Firefox, cut at the edge;
 *   · the cover image was the one picture the viewer would not open;
 *   · and the footer lost the line saying who built the blog.
 *
 * TWO OF THESE ONLY EVER BROKE IN FIREFOX, the owner's browser, so their tests
 * carry `@firefox` and playwright.config.js runs exactly those in Firefox as
 * well as in Chromium.
 */

import { expect, test } from '@playwright/test';

import { settle } from './viewports.js';

const MATH_EN = '/blog/engineering/2026-07-17-mathematics-at-build-time';
const MATH_ES = '/es/blog/engineering/2026-07-17-matematicas-en-tiempo-de-compilacion';
const AST_EN = '/blog/engineering/2026-05-15-from-org-to-ast';
const AST_ES = '/es/blog/engineering/2026-05-15-de-org-al-ast';
const SINK_EN = '/blog/engineering/2026-08-13-everything-org2html-renders';
const SHIP_EN = '/blog/engineering/2026-08-14-shipping-a-static-site-that-stays-fast';

/* The site appends the Umami tracker after mount. Every test here answers it
   with an empty script and aborts every other Umami request, the net
   analytics.spec.js casts, so no run reaches the network or the dashboard —
   and an empty tracker binds no click handler that could swallow a click. */
const UMAMI_HOST = /(^|\.)umami\.(is|dev)$/;

test.beforeEach(async ({ page }) => {
  await page.route((url) => UMAMI_HOST.test(url.hostname), (route) => (
    new URL(route.request().url()).pathname === '/script.js'
      ? route.fulfill({ status: 200, contentType: 'application/javascript', body: '' })
      : route.abort()
  ));
});

/*
 * THE TRAIL SAYS "Blog". The owner's review, 2026-09-15: the archive's full
 * name ("Kyonax Build in Public") is too long for the trail above a title. The
 * visible crumb and the BreadcrumbList a search engine reads name it the same.
 */
for (const path of [MATH_EN, MATH_ES]) {
  test(`${path}: the breadcrumb names the archive "Blog"`, async ({ page }) => {
    await page.goto(path);
    await settle(page);
    const archive = path.startsWith('/es/') ? '/es/blog' : '/blog';
    await expect(page.locator('.ui-crumbs__link').first()).toHaveText('Blog');
    const crumbs = await page.$$eval('script[type="application/ld+json"]', (nodes) => nodes
      .flatMap((node) => JSON.parse(node.textContent)['@graph'] || [])
      .filter((item) => item['@type'] === 'BreadcrumbList')
      .flatMap((list) => list.itemListElement));
    expect(crumbs[0], `${path}: the BreadcrumbList does not open on the archive`)
      .toMatchObject({ position: 1, name: 'Blog', item: `https://kyonax.com${archive}` });
  });
}

for (const width of [320, 390]) {
  test(`at ${width}px the breadcrumb stays on one line`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(MATH_ES);
    await settle(page);

    const m = await page.$eval('.ui-crumbs__list', (list) => {
      const line = Number.parseFloat(getComputedStyle(list).lineHeight);
      const tops = new Set([...list.children].map((li) => Math.round(li.getBoundingClientRect().top)));
      return { rows: tops.size, height: list.getBoundingClientRect().height, line };
    });
    expect(m.rows, `the trail broke onto ${m.rows} rows`).toBe(1);
    expect(m.height, `the trail is ${m.height}px tall for a ${m.line}px line`).toBeLessThan(m.line * 1.5);
  });

  test(`at ${width}px a chart fills its column and opens in the viewer`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(MATH_EN);
    await settle(page);

    const m = await page.evaluate(() => {
      const fig = document.querySelector('.org-chart').getBoundingClientRect();
      const p = document.querySelector('.org-root .org-paragraph').getBoundingClientRect();
      return { fig: fig.width, column: p.width };
    });
    expect(m.fig, `the chart is ${Math.round(m.fig)}px in a ${Math.round(m.column)}px column`)
      .toBeGreaterThanOrEqual(m.column - 1);

    await page.locator('.org-chart').first().scrollIntoViewIfNeeded();
    await page.locator('.org-chart .blog-chart-zoom').first().click();
    const img = page.locator('.image-viewer__img');
    await expect(img, 'the chart did not open in the image viewer').toBeVisible();
    expect(await img.getAttribute('src')).toMatch(/^data:image\/svg\+xml/);
  });
}

/*
 * A DOUBLE TAP HAS TO ZOOM ON A PHONE — and it zoomed, then un-zoomed at once.
 * A touch double tap fires touchstart/touchend twice AND a synthesized dblclick
 * after them; the viewer zoomed on the second touchend and the dblclick handler
 * — written for a mouse — saw a zoomed image and reset it. Playwright's touch
 * taps reproduce the browser's synthesized dblclick, so this catches it.
 */
test('a double tap zooms a chart in the viewer on a touch screen', async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const page = await context.newPage();
  await page.goto(MATH_EN);
  await settle(page);

  await page.locator('.org-chart-svg').first().scrollIntoViewIfNeeded();
  await page.locator('.org-chart-svg').first().tap();
  const img = page.locator('.image-viewer__img');
  await expect(img).toBeVisible();
  await page.waitForTimeout(400);

  const box = await img.boundingBox();
  const x = box.x + box.width * 0.3;
  const y = box.y + box.height * 0.5;
  await page.touchscreen.tap(x, y);
  await page.waitForTimeout(60);
  await page.touchscreen.tap(x, y);
  await expect(page.locator('.image-viewer'), 'the double tap did not leave the chart zoomed').toHaveClass(/is-zoomed/);
  await context.close();
});

test('footnote back-links are a real target, not one glyph', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto(MATH_EN);
  await settle(page);

  const boxes = await page.$$eval('.org-footnote-back', (els) => els.map((a) => {
    const r = a.getBoundingClientRect();
    return { w: r.width, h: r.height };
  }));
  expect(boxes.length, 'the article rendered no footnote back-links').toBeGreaterThan(0);
  for (const b of boxes) {
    /* WCAG 2.5.8 (AA) sets 24 CSS px as the floor for a pointer target. */
    expect(Math.min(b.w, b.h), `a back-link is ${Math.round(b.w)}×${Math.round(b.h)}px`).toBeGreaterThanOrEqual(24);
  }
});

/*
 * THE WHOLE NOTE IS THE WAY BACK, AND THE ARROW IS ONLY A MARK. The owner
 * turned down the boxed square: "remove the square, make the whole line
 * including the text clickable". So a click on a note's WORDS returns to its
 * reference, the arrow draws no box — and a link inside a note must still be
 * that link, not a second way back.
 */
test('a click on a footnote\'s words goes back to its reference, and the arrow draws no box', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto(SINK_EN);
  await settle(page);

  const borders = await page.$$eval('.org-footnote-back', (els) => els.map((a) => getComputedStyle(a).borderTopWidth));
  expect(borders.length, 'the kitchen-sink rendered no footnote back-links').toBeGreaterThan(0);
  for (const border of borders) {
    expect(border, `a back-link still draws a ${border} box`).toBe('0px');
  }

  /* Note 3 holds no link, so its middle is words and nothing else. */
  const note = page.locator('li.org-footnote').nth(2);
  const id = await note.getAttribute('id');
  const back = await note.locator('.org-footnote-back').getAttribute('href');
  await note.scrollIntoViewIfNeeded();
  const box = await note.boundingBox();
  await page.mouse.click(box.x + box.width * 0.6, box.y + box.height / 2);
  await expect.poll(() => page.evaluate(() => location.hash), { message: `a click on the words of #${id} did not go back to ${back}` })
    .toBe(back);

  /* Note 1 carries the parser's GitHub URL: under the pointer it must be the
     link itself, above the note's stretched way back. */
  const hit = await page.locator('li.org-footnote').first().evaluate((li) => {
    const link = li.querySelector('a.org-link');
    const r = link.getClientRects()[0];
    const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
    return top && top.closest('a') ? top.closest('a').className : String(top && top.tagName);
  });
  expect(hit, 'the link inside a footnote is covered by the note\'s way back').toContain('org-link');
});

/*
 * THE NUMBER IS PART OF THE WAY BACK. The owner hovered a note and the fill
 * began at the arrow while "1." sat outside it, in the list's 40px gutter —
 * outside the fill and outside the click target. The stretched target now
 * starts at the list's edge, so the number is inside both, and the marker
 * takes the accent while its note is hovered or focused. Measured in both
 * engines first: before the fix every point across the gutter hit the <ol>.
 */
for (const width of [390, 1280]) {
  test(`at ${width}px a footnote's number is inside its way back @firefox`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(SINK_EN);
    await settle(page);

    const note = page.locator('li.org-footnote').first();
    await note.scrollIntoViewIfNeeded();

    /* Five points across the gutter, at the first line's middle. */
    const sweep = await note.evaluate((li) => {
      const ol = li.parentElement.getBoundingClientRect();
      const box = li.getBoundingClientRect();
      const y = box.top + 12;
      return [0.1, 0.3, 0.5, 0.7, 0.9].map((f) => {
        const x = ol.left + (box.left - ol.left) * f;
        const top = document.elementFromPoint(x, y);
        const a = top && top.closest('a');
        return { x: Math.round(x), hit: a ? `${a.className}|${a.getAttribute('href')}` : String(top && top.tagName) };
      });
    });
    const back = await note.locator('.org-footnote-back').getAttribute('href');
    for (const { x, hit } of sweep) {
      expect(hit, `x=${x}px in the number's gutter is not the note's way back`).toBe(`org-footnote-back|${back}`);
    }

    /* The hovered fill starts at the list's edge, not at the arrow. */
    const gutter = await note.evaluate((li) => li.getBoundingClientRect().left - li.parentElement.getBoundingClientRect().left);
    const box = await note.boundingBox();
    const colour = () => note.evaluate((li) => getComputedStyle(li, '::marker').color);
    const before = await colour();
    await page.mouse.move(box.x + box.width / 2, box.y + 12);
    const left = await note.locator('.org-footnote-back').evaluate((a) => Number.parseFloat(getComputedStyle(a, '::after').left));
    expect(Math.round(left), 'the hovered fill still starts at the arrow').toBe(-Math.round(gutter));
    await expect.poll(colour, { message: 'the number does not answer the hover' }).not.toBe(before);

    /* And a click on the number itself goes back. */
    const ol = await note.evaluate((li) => li.parentElement.getBoundingClientRect().left);
    await page.mouse.click(ol + gutter / 2, box.y + 12);
    await expect.poll(() => page.evaluate(() => location.hash), { message: 'a click on the number did not go back' }).toBe(back);
  });
}

/*
 * THE BOOK'S FACES ARE THE SITE'S. org2html's style book declares @font-face
 * for Geomanist and SpaceMono at /blog/fonts/, and sync-blog.mjs copies the
 * book but not those files — so every article asked for four fonts and got the
 * SPA's 207 KB HTML page for each, in both engines, while the site's own faces
 * (same family names) did the actual rendering. Found 2026-09-12.
 */
test('an article asks for no font the site does not serve', async ({ page }) => {
  const asked = [];
  page.on('request', (r) => {
    if (r.resourceType() === 'font' || /\/blog\/fonts\//.test(r.url())) {
      asked.push(new URL(r.url()).pathname);
    }
  });
  await page.goto(SINK_EN);
  await settle(page);
  await page.evaluate(() => document.fonts.ready.then(() => true));
  const stray = asked.filter((path) => path.startsWith('/blog/fonts/'));
  expect(stray, `the article requested fonts from /blog/fonts/, which the site never ships: ${stray.join(', ')}`).toEqual([]);
});

test('the cover image opens in the viewer like every other picture', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto(SINK_EN);
  await settle(page);

  const hero = page.locator('.org-root img.org-hero-image');
  await expect(hero, 'the kitchen-sink has no hero image to open').toHaveCount(1);
  await expect(hero, 'the viewer did not claim the cover image').toHaveAttribute('data-blog-lightbox', 'on');
  await hero.click();
  const img = page.locator('.image-viewer__img');
  await expect(img, 'a click on the cover did not open the image viewer').toBeVisible();
  expect(await img.getAttribute('src'), 'the viewer opened something other than the cover')
    .toMatch(/everything-org2html-renders\.png$/);
});

/*
 * THE WRAP TOGGLE FLIPS EVERY BLOCK, AND THE CHOICE SURVIVES A RELOAD. On a
 * phone code arrives wrapped; one press unwraps the whole article (each block
 * scrolls again and every toggle says so), and the next page load keeps it.
 */
test('at 390px one WRAP press unwraps every code block, and the choice survives a reload', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto(SINK_EN);
  await settle(page);

  const toggles = page.locator('.org-src-block .blog-code-wrap:not([hidden])');
  await expect.poll(() => toggles.count(), { message: 'no code block offers a WRAP toggle at 390px' }).toBeGreaterThan(0);
  const scrolling = () => page.$$eval('.org-root pre.org-src', (els) => els.filter((p) => p.scrollWidth > p.clientWidth + 1).length);
  expect(await scrolling(), 'a phone\'s code does not arrive wrapped').toBe(0);
  await expect(toggles.first(), 'the toggle does not say the block is wrapped').toHaveAttribute('aria-pressed', 'true');

  await toggles.first().click();
  for (const toggle of await toggles.all()) {
    await expect(toggle, 'one press did not unwrap every block').toHaveAttribute('aria-pressed', 'false');
  }
  expect(await scrolling(), 'unwrapped, no long block scrolls sideways').toBeGreaterThan(0);

  await page.reload();
  await settle(page);
  await expect.poll(() => toggles.count()).toBeGreaterThan(0);
  await expect(toggles.first(), 'the reader\'s choice did not survive a reload').toHaveAttribute('aria-pressed', 'false');
});

/* The chip used `overflow-wrap: anywhere`, and Firefox broke its words inside
   an inline-flex box that had room: `ci` as c/i, `build` as buil/d. */
for (const width of [390, 1280]) {
  test(`at ${width}px every tag chip holds its word on one line @firefox`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(SHIP_EN);
    await settle(page);

    /* The WORD's line boxes, not the chip's: a range over an element that
       wraps the word would also report that element's own box. */
    const chips = await page.$$eval('.blog-post__tag', (els) => els.map((el) => {
      const range = document.createRange();
      range.selectNodeContents(el.querySelector('.blog-post__tag-word') || el);
      const lines = new Set([...range.getClientRects()].map((r) => Math.round(r.top))).size;
      return { tag: el.textContent.trim(), lines, h: Math.round(el.getBoundingClientRect().height) };
    }));
    expect(chips.length, `${SHIP_EN} renders no tag chips`).toBeGreaterThan(0);
    for (const c of chips) {
      expect(c.lines, `the "${c.tag}" chip breaks its word over ${c.lines} lines and stands ${c.h}px tall`).toBe(1);
    }
  });
}

/* The aligned derivation set 412px of MathML in a 330px column in Firefox and
   345px in Chromium; the frame scrolls, but a phone shows no bar, so it read as
   cut off. article-enhance.js fits it after mount, hence the poll. */
for (const width of [320, 360]) {
  test(`at ${width}px every display equation fits its column @firefox`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(SINK_EN);
    await settle(page);
    await page.evaluate(() => document.fonts.ready.then(() => true));

    await expect.poll(() => page.$$eval('.org-math-display', (els) => els
      .filter((f) => f.scrollWidth > f.clientWidth + 1)
      .map((f) => `"${f.textContent.trim().slice(0, 30)}…" is ${f.scrollWidth}px in a ${f.clientWidth}px column`)), {
      message: `at ${width}px a display equation still scrolls sideways`,
      timeout: 5000,
    }).toEqual([]);
  });
}

test('the table of contents starts on its label and ranks its levels', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(AST_EN);
  await settle(page);

  const m = await page.evaluate(() => {
    const toc = document.querySelector('.org-toc');
    const left = (el) => el.getBoundingClientRect().left;
    const top = toc.querySelector(':scope > ul > li > .org-toc-link');
    const nested = toc.querySelector('ul ul .org-toc-link');
    const size = (el) => Number.parseFloat(getComputedStyle(el).fontSize);
    return {
      offset: left(top) - left(toc.querySelector('.org-toc-title')),
      top: size(top),
      nested: nested ? size(nested) : null,
    };
  });
  expect(Math.abs(m.offset), `top-level entries start ${Math.round(m.offset)}px off the label`).toBeLessThanOrEqual(1);
  expect(m.nested, 'the article has no nested entries to rank').not.toBeNull();
  expect(m.nested, 'nested entries are set as large as the sections they sit under').toBeLessThan(m.top);
});

test('an article names its author', async ({ page }) => {
  for (const path of [MATH_EN, MATH_ES]) {
    await page.goto(path);
    await settle(page);
    await expect(page.locator('.blog-post__meta'), `${path} does not say who wrote it`).toContainText('Cristian D. Moreno');
  }
});

/* The meta row always had the markup for it, but the post body JSON never
   carried readingTime (only the archive's index rows did), so it rendered
   nothing on every article. */
test('an article states its reading time', async ({ page }) => {
  for (const [path, unit] of [[MATH_EN, 'min read'], [MATH_ES, 'min de lectura']]) {
    await page.goto(path);
    await settle(page);
    await expect(page.locator('.blog-post__meta'), `${path} does not say how long it takes to read`)
      .toContainText(new RegExp(`\\d+ ${unit}`));
  }
});

test('the table of contents speaks the article\'s language', async ({ page }) => {
  await page.goto(MATH_ES);
  await settle(page);
  await expect(page.locator('.org-toc-title')).toHaveText(/contenido/i);
  await expect(page.locator('nav.org-toc')).toHaveAttribute('aria-label', /contenido/i);
});

/*
 * THE ROW READS TITLE FIRST. The title was neutral-50 (76% lightness) at 15px
 * while the excerpt under it was neutral-200 — 78%, brighter — in the wider
 * monospace, so the eye landed on the description. The title must be both the
 * larger and the lighter of the two.
 */
test('an archive row reads title first, then description', async ({ page }) => {
  await page.goto('/blog/');
  await settle(page);
  const m = await page.evaluate(() => {
    const lightness = (c) => {
      const ok = c.match(/oklch\(\s*([\d.]+)(%?)/);
      if (ok) {
        return Number.parseFloat(ok[1]) / (ok[2] ? 100 : 1);
      }
      const [r, g, b] = c.match(/[\d.]+/g).map(Number);
      return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    };
    const read = (sel) => {
      const cs = getComputedStyle(document.querySelector(sel));
      return { size: Number.parseFloat(cs.fontSize), light: lightness(cs.color) };
    };
    return { title: read('.blog-all__title'), excerpt: read('.blog-all__excerpt') };
  });
  expect(m.title.size, 'the row title is not larger than its excerpt').toBeGreaterThan(m.excerpt.size);
  expect(m.title.light, 'the row title is not lighter than its excerpt').toBeGreaterThan(m.excerpt.light);
});

test('the footer names who built the blog and links to them', async ({ page }) => {
  await page.goto('/blog/');
  await settle(page);
  await expect(page.locator('.blog-footer__note a[href="https://x.com/kyonax_on_tech"]')).toHaveCount(1);
});

/*
 * WHAT AN ARTICLE GAINED AROUND ITS WORDS: the post's tags under the meta row,
 * a support block after the body, and an h-entry for the parsers that read
 * microformats. Measured on one article and its Spanish twin, because every
 * label here is i18n and every link is locale-aware. Sharing moved to the nav
 * and is measured in share.spec.js.
 */
const TWINS = [
  { path: AST_EN, archive: '/blog/' },
  { path: AST_ES, archive: '/es/blog/' },
];

for (const { path, archive } of TWINS) {
  test(`${path} lists its tags, each one a search of the ${archive} archive`, async ({ page }) => {
    await page.goto(path);
    await settle(page);

    const chips = page.locator('ul.blog-post__tags > li > a.blog-post__tag.p-category');
    const rows = await chips.evaluateAll((els) => els.map((a) => ({
      href: a.getAttribute('href'),
      tag: a.textContent.trim(),
    })));
    expect(rows.length, `${path} renders no ul.blog-post__tags > li > a.blog-post__tag.p-category`).toBeGreaterThan(0);
    await expect(page.locator('ul.blog-post__tags a'), `${path}: a tag link is missing .blog-post__tag or .p-category`)
      .toHaveCount(rows.length);
    /* The archive's canonical path has no trailing slash (production answers
       the slashed form with a 301), so the chip links the bare form. */
    const canonical = archive.replace(/\/$/, '');
    for (const { href, tag } of rows) {
      expect(href, `the "${tag}" chip does not search the ${archive} archive`)
        .toBe(`${canonical}?search=${encodeURIComponent(tag)}#all-posts`);
    }

    /* And the archive honours it: the field arrives filled, and All Posts
       ITSELF is filtered — the article the chip came from is one of its rows
       (it carries the tag), and the list holds exactly as many rows as the
       status line counts. */
    await chips.first().click();
    await page.waitForURL((u) => u.pathname.replace(/\/$/, '') === canonical
      && u.searchParams.get('search') === rows[0].tag);
    await settle(page);
    await expect(page.locator('#blog-search-input'), `${archive} did not prefill the search from ?search=`)
      .toHaveValue(rows[0].tag);
    const list = page.locator('section#all-posts ul.blog-all__list > li.blog-all__row');
    await expect(list.filter({ has: page.locator(`a[href="${path}"]`) }), `${archive} did not filter All Posts to "${rows[0].tag}" — the article that carries it is not a row`)
      .toHaveCount(1);
    const status = page.locator('p.blog-search__status[role="status"]');
    await expect(status, `${archive}'s status line does not count the matches for "${rows[0].tag}"`).toHaveText(/^[1-9]\d* /);
    const counted = Number.parseInt(await status.textContent(), 10);
    await expect(list, `${archive} lists a different number of rows than its status line counts`).toHaveCount(counted);
  });
}

test('the support block renders nothing while SUPPORT.url is empty — this flips when the owner sets the url', async ({ page }) => {
  for (const { path } of TWINS) {
    await page.goto(path);
    await settle(page);
    await expect(page.locator('section.blog-support'), `${path} renders a support block with no vendor url to send the reader to`)
      .toHaveCount(0);
  }
});

test('at 390px the support call to action is a new-tab link of at least 24×24', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  await page.goto(AST_EN);
  await settle(page);
  test.skip(
    await page.locator('section.blog-support').count() === 0,
    'SUPPORT.url is empty — nothing to measure until the owner names the vendor',
  );

  for (const { path } of TWINS) {
    await page.goto(path);
    await settle(page);
    const block = page.locator('section.blog-support');
    await expect(block.locator('h2.blog-support__title'), `${path}: the support block has no title`).toHaveCount(1);
    await expect(block.locator('p.blog-support__text'), `${path}: the support block has no sentence`).toHaveCount(1);
    const cta = block.locator('a.blog-support__cta');
    await expect(cta, `${path}: the support block has no call to action`).toHaveCount(1);
    /* Umami swallows a same-tab link that carries data-umami-event. */
    await expect(cta, `${path}: the support link does not open a new tab`).toHaveAttribute('target', '_blank');
    await expect(cta, `${path}: the support click is not counted as "support"`).toHaveAttribute('data-umami-event', 'support');
    const box = await cta.boundingBox();
    expect(Math.min(box.width, box.height), `${path}: the support link is ${Math.round(box.width)}×${Math.round(box.height)}px`)
      .toBeGreaterThanOrEqual(24);
  }
});

test('an article is an h-entry: one name, one body, one published date, one author card', async ({ page }) => {
  /* Microformats are read by parsers that never run a script, so they have
     to be in the prerender, not added after hydration. */
  const html = await (await page.request.get(AST_EN)).text();
  expect(html, 'the prerendered article carries no h-entry').toMatch(/class="[^"]*\bh-entry\b/);

  await page.goto(AST_EN);
  await settle(page);
  const entry = page.locator('.h-entry');
  await expect(entry, 'the article has no single .h-entry root').toHaveCount(1);
  for (const selector of ['.p-name', '.e-content', '.dt-published[datetime]', '.p-author.h-card']) {
    await expect(entry.locator(selector), `the h-entry does not hold exactly one ${selector}`).toHaveCount(1);
  }
  await expect(entry.locator('.p-author.h-card'), 'the author card lost rel="author"').toHaveAttribute('rel', 'author');
  await expect(entry.locator('.dt-published'), 'dt-published does not carry an ISO date')
    .toHaveAttribute('datetime', /^\d{4}-\d{2}-\d{2}/);
});
