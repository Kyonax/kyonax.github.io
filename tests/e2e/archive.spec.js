/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 */

/*
 * archive.spec.js — the archive's search, and the URL that carries it.
 *
 * THE SEARCH FILTERS ALL POSTS ITSELF. It used to fetch an index of its own
 * and draw a second list of links under the field, was rendered only after
 * that fetch (so it was in no prerendered page and pushed the list down when
 * it arrived), and read `?q=` once. Now the field is prerendered, the term
 * lives in `?search=` through replaceState, and the rows it keeps are the
 * archive's own rows — so everything here is measured on `section#all-posts`.
 *
 * NO COUNT IS TYPED BY HAND. The expected rows are computed from the rich
 * index the page itself loaded (use-blog.js imports it as its own chunk,
 * archive-index-*.js), with the component's own matching rule restated below,
 * and every term is chosen from the corpus's own tags — so a new post, or a
 * retagged one, cannot break a test that is still telling the truth.
 *
 * TWO KINDS OF READ, as in landing-hero.spec.js: what the prerender shipped is
 * a fact about a FILE, read from dist/ and handed to the browser's own HTML
 * parser; everything else is a fact about a RUNNING page.
 *
 * NO page.route ANYWHERE: a routed page skips the HTTP cache, and the back
 * test below depends on the real one. Umami is silenced through its own
 * opt-out instead — `umami.disabled` in localStorage — so no tracker loads.
 *
 * WRITTEN RED. Against the archive before this change the field is not in the
 * HTML, `?search=` is ignored, the rows never filter (the old search drew its
 * own panel), there is no status line, no section id but #all-posts, and no
 * hold. The toggle test also needs the language toggle to carry the query.
 */

import { existsSync, readFileSync } from 'node:fs';

import { expect, test } from '@playwright/test';

import { settle } from './viewports.js';

const ARCHIVES = [
  { locale: 'en', path: '/blog', clear: 'Clear search' },
  { locale: 'es', path: '/es/blog', clear: 'Borrar búsqueda' },
];
const [EN] = ARCHIVES;

const ROWS = 'section#all-posts ul.blog-all__list > li.blog-all__row';
const FIELD = '#blog-search-input';
const STATUS = 'p.blog-search__status[role="status"]';
const CLEAR = 'button.blog-search__clear';
const PAGER = 'nav.blog-pagination';
const HOLD = 'kyo-search-hold';
const HELD = /\bkyo-search-hold\b/;

/* Each id on the block it names, and the same in both locales: the language
   toggle keeps the hash, so a Spanish id would drop the reader at the top. */
const SECTIONS = new Map([
  ['intro', '.blog-hero'],
  ['corpus', '.blog-marquee'],
  ['pipeline', '.blog-pipeline-band'],
  ['latest', 'article.blog-lead'],
  ['recent', 'ul.blog-recent'],
  ['all-posts', 'section.blog-all'],
]);

/* The status line's copy, as snippets-core.js words it. Compared whole, so a
   missing catalogue entry — vue-i18n then prints the key path — cannot pass
   for the sentence, and "1 results" cannot pass for "1 result". */
const SAID = new Map([
  ['en', {
    one: '1 result for "{term}"',
    other: '{count} results for "{term}"',
    none: 'No articles match "{term}".',
  }],
  ['es', {
    one: '1 resultado para "{term}"',
    other: '{count} resultados para "{term}"',
    none: 'Ningún artículo coincide con "{term}".',
  }],
]);

const said = (locale, count, term) => {
  const copy = SAID.get(locale);
  let line = copy.other;
  if (count === 0) {
    line = copy.none;
  } else if (count === 1) {
    line = copy.one;
  }
  return line.replace('{count}', String(count)).replace('{term}', term);
};

const ROOT = new URL('../../', import.meta.url);
const read = (url) => (existsSync(url) ? readFileSync(url, 'utf8') : null);

/* What the prerender shipped for an archive, parsed without running a script:
   the page a crawler, or a reader with JavaScript off, receives. */
const prerendered = (path) => {
  const html = read(new URL(`dist${path}/index.html`, ROOT));
  expect(html, `dist${path}/index.html does not exist — build the site first`).not.toBeNull();
  return html;
};

/* Storage can throw on about:blank, hence the guard (analytics.spec.js). */
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    try {
      localStorage.setItem('umami.disabled', '1');
    } catch { /* no storage on this document */ }
  });
});

/*
 * THE RICH INDEX, AS THE PAGE LOADED IT. Importing the same chunk URL in the
 * page hands back the very rows the search filtered.
 */
const readIndex = async (page) => {
  const index = await page.evaluate(async () => {
    const entry = performance.getEntriesByType('resource')
      .find((r) => /\/assets\/archive-index-[\w-]+\.js$/.test(new URL(r.name).pathname));
    return entry ? (await import(entry.name)).default : null;
  });
  expect(index, 'the archive loaded no archive-index-*.js chunk to read its posts from').not.toBeNull();
  return index;
};

const fold = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/* Every post of a locale, newest first — what blog-search.vue receives. */
const postsOf = (index, locale) => (new Map(Object.entries(index.timeline || {})).get(locale) || [])
  .map((url) => index.posts.find((p) => p.url === url))
  .filter(Boolean);

/* The component's rule, restated: accent- and case-insensitive, over the
   title, the excerpt and the tags. */
const matching = (index, locale, term) => {
  const needle = fold(term.trim());
  return postsOf(index, locale)
    .filter((p) => [p.title, p.excerpt, ...(p.tags || [])].some((s) => fold(s).includes(needle)))
    .map((p) => p.url);
};

/* A term from the locale's own tags whose match count passes `wanted`. */
const termWhere = (index, locale, wanted) => [...new Set(postsOf(index, locale).flatMap((p) => p.tags || []))]
  .find((tag) => wanted(matching(index, locale, tag).length));

/* The post each All Posts row links, in order. */
const rowUrls = (page) => page.locator(ROWS).evaluateAll((lis) => lis.map((li) => {
  const link = li.querySelector('a[href]');
  return link ? link.getAttribute('href') : null;
}));

const searchOf = (page) => page.evaluate(() => new URL(location.href).searchParams.get('search'));
const queryAndHash = (page) => page.evaluate(() => `${location.search}${location.hash}`);

const searchUrl = (path, term) => `${path}?search=${encodeURIComponent(term)}#all-posts`;

/* ── What the prerender ships ────────────────────────────────────────────── */

test('both archives ship the search in their HTML: a landmark, a named field, a hidden clear button and an empty status line', async ({ page }) => {
  for (const { path, clear } of ARCHIVES) {
    const m = await page.evaluate((src) => {
      const doc = new DOMParser().parseFromString(src, 'text/html');
      const form = doc.querySelector('section#all-posts form[role="search"]');
      const input = doc.querySelector('#blog-search-input');
      const label = doc.querySelector('label.sr-only[for="blog-search-input"]');
      const button = doc.querySelector('button.blog-search__clear');
      const status = doc.querySelector('p.blog-search__status[role="status"]');
      return {
        form: Boolean(form),
        holds: Boolean(form && input && status && button && form.contains(input) && form.contains(status) && form.contains(button)),
        label: label ? label.textContent.trim() : null,
        type: input ? input.getAttribute('type') : null,
        maxlength: input ? input.getAttribute('maxlength') : null,
        clearName: button ? button.getAttribute('aria-label') : null,
        clearHidden: button ? /visibility:\s*hidden/.test(button.getAttribute('style') || '') : null,
        status: status ? status.textContent : null,
      };
    }, prerendered(path));

    expect(m.form, `${path} prerenders no form[role="search"] inside #all-posts`).toBe(true);
    expect(m.holds, `${path}: the field, the clear button and the status line are not all inside the search landmark`).toBe(true);
    expect(m.label || '', `${path}: the field has no sr-only label, or it is a key path`).toMatch(/^(?!kyo-web\.)\S/);
    expect(m.type, `${path}: the field is not type=search`).toBe('search');
    expect(m.maxlength, `${path}: the field does not cap a term at 100 characters`).toBe('100');
    expect(m.clearName, `${path}: the clear button is not named "${clear}"`).toBe(clear);
    expect(m.clearHidden, `${path}: the clear button is not rendered visibility:hidden`).toBe(true);
    expect(m.status, `${path}: the status line is missing, or it says something before any search`).toBe('');
  }
});

test('every section id is the same in both archives, each on the block it names', async ({ page }) => {
  for (const { path } of ARCHIVES) {
    const found = await page.evaluate(([src, sections]) => {
      const doc = new DOMParser().parseFromString(src, 'text/html');
      return sections.map(([id, block]) => {
        const hits = doc.querySelectorAll(`#${id}`);
        return { id, count: hits.length, onBlock: hits.length === 1 && hits[0].matches(block) };
      });
    }, [prerendered(path), [...SECTIONS]]);
    for (const { id, count, onBlock } of found) {
      expect(count, `${path} prerenders #${id} ${count} times, not once`).toBe(1);
      expect(onBlock, `${path}: #${id} is not on ${SECTIONS.get(id)}`).toBe(true);
    }
  }
});

/* ── A search in the URL ─────────────────────────────────────────────────── */

test('?search= fills the field and filters All Posts itself @firefox', async ({ page }) => {
  await page.goto(`${EN.path}#all-posts`);
  await settle(page);
  const index = await readIndex(page);
  const every = postsOf(index, 'en').length;
  const term = termWhere(index, 'en', (n) => n >= 2 && n < every) || termWhere(index, 'en', (n) => n >= 2);
  expect(term, 'no English tag matches two posts — nothing to filter to').toBeTruthy();
  const want = matching(index, 'en', term);

  await page.goto(searchUrl(EN.path, term));
  await settle(page);
  await expect(page.locator(FIELD), `the field did not arrive holding "${term}"`).toHaveValue(term);
  await expect.poll(() => rowUrls(page), { message: `All Posts is not the ${want.length} posts that match "${term}", newest first` })
    .toEqual(want);
  await expect(page.locator(STATUS)).toHaveText(said('en', want.length, term));
  await expect(page.locator(PAGER), 'the pager still shows while a search is on').toBeHidden();
  await expect(page.locator(CLEAR), 'the clear button is hidden while the field holds a term').toBeVisible();
  await expect(page.locator('html'), 'the hold is still on after the page settled').not.toHaveClass(HELD);
});

for (const { locale, path } of ARCHIVES) {
  test(`${path}: one match reads as one result, several as results`, async ({ page }) => {
    await page.goto(`${path}#all-posts`);
    await settle(page);
    const index = await readIndex(page);

    for (const [form, wanted] of [['one', (n) => n === 1], ['several', (n) => n >= 2]]) {
      const term = termWhere(index, locale, wanted);
      expect(term, `no ${locale} tag has ${form} match(es) to count`).toBeTruthy();
      const want = matching(index, locale, term);
      await page.goto(searchUrl(path, term));
      await settle(page);
      await expect(page.locator(STATUS), `${path} counts "${term}" wrongly`).toHaveText(said(locale, want.length, term));
      await expect(page.locator(ROWS), `${path} lists the wrong rows for "${term}"`).toHaveCount(want.length);
    }
  });
}

test('a search that matches nothing says so, and clear brings back the list, the URL and the focus', async ({ page }) => {
  await page.goto(`${EN.path}#all-posts`);
  await settle(page);
  const unfiltered = await rowUrls(page);
  expect(unfiltered.length, 'the archive lists no posts to filter').toBeGreaterThan(0);

  const term = 'zqxwv';
  await page.goto(searchUrl(EN.path, term));
  await settle(page);
  await expect(page.locator(STATUS)).toHaveText(said('en', 0, term));
  await expect(page.locator(ROWS), `"${term}" matched rows it should not have`).toHaveCount(0);

  const clear = page.locator(CLEAR);
  await expect(clear).toBeVisible();
  await clear.click();
  await expect(page.locator(FIELD), 'focus did not come back to the field after clear').toBeFocused();
  await expect(page.locator(FIELD)).toHaveValue('');
  await expect.poll(() => queryAndHash(page), { message: 'clear did not take the search out of the URL, or it lost the hash' })
    .toBe('#all-posts');
  await expect.poll(() => rowUrls(page), { message: 'clear did not bring back the page\'s own rows' }).toEqual(unfiltered);
  await expect(page.locator(STATUS), 'the status line still speaks with no search on').toHaveText('');
  await expect(clear, 'the clear button still shows over an empty field').toBeHidden();
});

/*
 * ONE WORD, ONE ANNOUNCEMENT. The list, the status line and the URL all wait
 * for the same 250 ms pause, so a screen reader hears the count once, when the
 * typing stops — and the term is written with replaceState, so Back leaves the
 * archive instead of stepping back through every letter.
 */
test('typing filters through replaceState — one status update, no new history entry — and Esc clears', async ({ page }) => {
  await page.goto(`${EN.path}#all-posts`);
  await settle(page);
  const index = await readIndex(page);
  const unfiltered = await rowUrls(page);
  const every = postsOf(index, 'en').length;
  const term = termWhere(index, 'en', (n) => n >= 1 && n < every);
  expect(term, 'no English tag narrows the list').toBeTruthy();
  const want = matching(index, 'en', term);

  const entries = await page.evaluate(() => history.length);
  await page.evaluate(() => {
    const status = document.querySelector('p.blog-search__status');
    window.__said = [];
    new MutationObserver(() => window.__said.push(status.textContent.trim()))
      .observe(status, { childList: true, characterData: true, subtree: true });
    window.__writes = { pushed: 0, replaced: 0 };
    const { pushState, replaceState } = history;
    history.pushState = (...args) => {
      window.__writes.pushed += 1;
      return pushState.apply(history, args);
    };
    history.replaceState = (...args) => {
      window.__writes.replaced += 1;
      return replaceState.apply(history, args);
    };
  });

  await page.locator(FIELD).pressSequentially(term, { delay: 40 });
  await expect.poll(() => searchOf(page), { message: `the URL never carried ?search=${term}` }).toBe(term);
  await expect.poll(() => rowUrls(page)).toEqual(want);
  await expect(page.locator(STATUS)).toHaveText(said('en', want.length, term));
  expect(await page.evaluate(() => location.hash), 'writing the term changed the hash').toBe('#all-posts');
  expect(await page.evaluate(() => history.length), 'typing pushed history entries').toBe(entries);

  const { spoken, writes } = await page.evaluate(() => ({ spoken: window.__said.filter(Boolean), writes: window.__writes }));
  expect(spoken, 'the status line spoke while the typing was still going on').toEqual([said('en', want.length, term)]);
  expect(writes.pushed, 'the term went into history with pushState').toBe(0);
  expect(writes.replaced, `${term.length} keys wrote the URL ${writes.replaced} times, not once`).toBe(1);

  await page.locator(FIELD).press('Escape');
  await expect(page.locator(FIELD), 'Esc did not empty the field').toHaveValue('');
  await expect.poll(() => queryAndHash(page), { message: 'Esc did not take the search out of the URL' }).toBe('#all-posts');
  await expect.poll(() => rowUrls(page), { message: 'Esc did not bring back the page\'s own rows' }).toEqual(unfiltered);
  expect(await page.evaluate(() => history.length), 'Esc pushed a history entry').toBe(entries);
});

test('?q= is rewritten to ?search=, and ?search= wins when both are there', async ({ page }) => {
  await page.goto(`${EN.path}#all-posts`);
  await settle(page);
  const index = await readIndex(page);
  const tags = [...new Set(postsOf(index, 'en').flatMap((p) => p.tags || []))];
  const [alias, winner] = tags;
  expect(winner, 'the English corpus has fewer than two tags').toBeTruthy();

  /* The article's tag chips linked ?q=<tag> until now, and those links live
     on in feeds and caches: the alias must still search, and leave. */
  await page.goto(`${EN.path}?q=${encodeURIComponent(alias)}&ref=feed#all-posts`);
  await settle(page);
  await expect(page.locator(FIELD)).toHaveValue(alias);
  await expect.poll(() => page.evaluate(() => {
    const u = new URL(location.href);
    return { search: u.searchParams.get('search'), q: u.searchParams.get('q'), ref: u.searchParams.get('ref'), hash: u.hash };
  }), { message: '?q= was not rewritten to ?search= with the other parameters and the hash kept' })
    .toEqual({ search: alias, q: null, ref: 'feed', hash: '#all-posts' });
  await expect.poll(() => rowUrls(page)).toEqual(matching(index, 'en', alias));

  await page.goto(`${EN.path}?q=${encodeURIComponent(alias)}&search=${encodeURIComponent(winner)}#all-posts`);
  await settle(page);
  await expect(page.locator(FIELD), '?q= beat ?search=').toHaveValue(winner);
  await expect.poll(() => page.evaluate(() => new URL(location.href).searchParams.has('q')), { message: '?q= stayed in the URL beside ?search=' })
    .toBe(false);
});

/*
 * NO FLASH OF THE UNFILTERED LIST, AND NOTHING MOVES. A head script puts
 * `kyo-search-hold` on <html> when the URL carries a search, and the list, the
 * pager and the footer stay invisible until the list is filtered — an
 * invisible box logs no layout shift. So the hold must have been on, it must
 * let go only once the rows are the filtered ones, and the page must shift no
 * more than the same archive does with no search at all.
 */
for (const width of [390, 1280]) {
  test(`at ${width}px landing on ?search=…#all-posts shifts nothing, and the list is held until it is filtered`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.addInitScript(([rows, hold]) => {
      /* ONLY WHAT THE HOLD COVERS IS COUNTED. The archive's own stylesheets are
         deferred by design (defer-async-css.mjs), so a load that paints before
         they arrive reflows the HEADER — the hero, the marquee and the band
         grow into place, and main moves under them. That depends on timing,
         happens with or without a search (measured: 0 on one plain load, 0.89
         on the next), and is not the search's to hold. So a shift counts here
         only when one of its sources sits inside #all-posts or the footer:
         the search, the list, the pager and the footer the hold keeps hidden. */
      window.__cls = 0;
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const held_region = entry.sources.some((s) => s.node && s.node.nodeType === 1
            && s.node.closest('#all-posts, .blog-footer'));
          if (!entry.hadRecentInput && held_region) {
            window.__cls += entry.value;
          }
        }
      }).observe({ type: 'layout-shift', buffered: true });
      /* On the document, not on <html>: the element may not exist yet when
         this runs, and the head script touches it while the head parses. */
      window.__hold = { seen: false, rowsAtRelease: null };
      new MutationObserver((records) => {
        for (const record of records) {
          if (record.target === document.documentElement) {
            if (record.target.classList.contains(hold)) {
              window.__hold.seen = true;
            } else if (window.__hold.seen && window.__hold.rowsAtRelease === null) {
              window.__hold.rowsAtRelease = document.querySelectorAll(rows).length;
            }
          }
        }
      }).observe(document, { subtree: true, attributes: true, attributeFilter: ['class'] });
    }, [ROWS, HOLD]);

    await page.goto(`${EN.path}#all-posts`);
    await settle(page);
    const baseline = await page.evaluate(() => window.__cls);
    const index = await readIndex(page);
    const every = postsOf(index, 'en').length;
    const term = termWhere(index, 'en', (n) => n >= 1 && n < every);
    expect(term, 'no English tag narrows the list').toBeTruthy();
    const want = matching(index, 'en', term);

    await page.goto(searchUrl(EN.path, term));
    await settle(page);
    const m = await page.evaluate(([hold]) => ({
      cls: window.__cls,
      hold: window.__hold,
      held: document.documentElement.classList.contains(hold),
    }), [HOLD]);

    expect(m.hold.seen, 'nothing held the list while the search loaded — the unfiltered archive can flash').toBe(true);
    expect(m.hold.rowsAtRelease, `the hold let go on ${m.hold.rowsAtRelease} rows, not the ${want.length} that match "${term}"`)
      .toBe(want.length);
    expect(m.held, 'the hold is still on after the page settled').toBe(false);
    expect(m.cls, `the search landing shifted ${m.cls.toFixed(4)}`).toBeLessThanOrEqual(0.1);
    expect(m.cls, `the search landing shifted ${m.cls.toFixed(4)}, the plain archive ${baseline.toFixed(4)}`)
      .toBeLessThanOrEqual(baseline + 0.01);
  });
}

test('with JavaScript off a search URL holds nothing back', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(`${EN.path}?search=zqxwv#all-posts`);
  await expect(page.locator('html'), 'the archive is held with no script to let it go').not.toHaveClass(HELD);
  await expect(page.locator(ROWS).first(), 'with JavaScript off the list is hidden').toBeVisible();
  await context.close();
});

/* ── Getting around ──────────────────────────────────────────────────────── */

/* scroll-padding-top on <html> is what keeps a target out from under the
   sticky nav. "Lands" means the target's top is at or below the nav's bottom
   and near it — unless the page has run out of scroll to get it higher.
   EACH LINK IS OPENED AS A LINK IS SHARED: a fresh load of /blog#<id>. Moving
   the hash inside one document 350ms after the last move landed it mid
   smooth-scroll, and Chromium dropped the second scroll — a harness race
   (measured: the scroll events stop, no scroll follows), not a reader's. */
test('a section link lands under the nav, not beneath it @firefox', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  for (const id of SECTIONS.keys()) {
    await page.goto('about:blank');
    await page.goto(`${EN.path}#${id}`);
    await settle(page);
    await expect.poll(() => page.evaluate((target) => {
      const el = document.querySelector(`#${target}`);
      const nav = document.querySelector('.hud-nav');
      if (!el || !nav) {
        return `#${target} or the nav is missing`;
      }
      const top = el.getBoundingClientRect().top;
      const under = nav.getBoundingClientRect().bottom;
      const at_end = Math.ceil(window.scrollY + window.innerHeight) >= document.documentElement.scrollHeight - 1;
      /* #intro is the page's first block: at scrollY 0 no scroll can put it any
         lower, so where it sits there is where the layout puts it. */
      const at_top = window.scrollY === 0;
      if (top < under - 1 && !at_top) {
        return `#${target} starts at ${Math.round(top)}px, under the nav's bottom at ${Math.round(under)}px`;
      }
      if (top > under + 40 && !at_end) {
        return `#${target} starts at ${Math.round(top)}px, far below the nav at ${Math.round(under)}px`;
      }
      return 'landed';
    }, id), { message: `/blog#${id} did not land under the nav` }).toBe('landed');
  }
});

test('Back from a result brings the search back @firefox', async ({ page }) => {
  await page.goto(`${EN.path}#all-posts`);
  await settle(page);
  const index = await readIndex(page);
  const every = postsOf(index, 'en').length;
  const term = termWhere(index, 'en', (n) => n >= 1 && n < every);
  expect(term, 'no English tag narrows the list').toBeTruthy();
  const want = matching(index, 'en', term);

  await page.locator(FIELD).fill(term);
  await expect.poll(() => searchOf(page), { message: `the URL never carried ?search=${term}` }).toBe(term);
  await expect.poll(() => rowUrls(page)).toEqual(want);
  await page.locator(ROWS).first().locator('a[href]').first().click();
  await page.waitForURL((u) => u.pathname === want[0]);
  await settle(page);

  await page.goBack();
  await page.waitForURL((u) => u.pathname === EN.path && u.searchParams.get('search') === term);
  await settle(page);
  await expect(page.locator(FIELD), 'Back restored the URL but not the field').toHaveValue(term);
  await expect.poll(() => rowUrls(page), { message: 'Back restored the URL but not the filtered list' }).toEqual(want);
});

/* The owner's call: the toggle carries ?search= to the other locale's archive,
   which then filters by the same term — or says it matches nothing there. */
test('the language toggle carries the search to the other archive @firefox', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(`${EN.path}#all-posts`);
  await settle(page);
  const index = await readIndex(page);
  /* A term both archives hold, so the Spanish list visibly filters; failing
     that, any English tag, and the Spanish line says it matches nothing. */
  const term = [...new Set(postsOf(index, 'en').flatMap((p) => p.tags || []))]
    .find((tag) => matching(index, 'es', tag).length > 0) || termWhere(index, 'en', (n) => n >= 1);
  expect(term, 'the English corpus has no tag to search').toBeTruthy();
  const want = matching(index, 'es', term);

  await page.goto(searchUrl(EN.path, term));
  await settle(page);
  await page.locator('.language-toggle__button:visible').first().click();
  await page.locator('#language-option-es:visible').first().click();

  await expect(page, 'the toggle dropped the search or the hash on its way to /es/blog')
    .toHaveURL((u) => u.pathname === '/es/blog' && u.searchParams.get('search') === term && u.hash === '#all-posts');
  await expect(page.locator(FIELD), 'the Spanish archive did not take the term').toHaveValue(term);
  await expect(page.locator(STATUS)).toHaveText(said('es', want.length, term));
  await expect.poll(() => rowUrls(page), { message: `the Spanish archive is not filtered by "${term}"` }).toEqual(want);
});

/*
 * THE OWNER'S CALL ON PAGE N: a search there keeps the page's path, lists
 * matches from every page of the locale, hides the pager, and clear returns
 * to that same page. Skipped while the corpus fits on one page.
 */
test('on page 2 a search spans every page of the locale, and clear returns to page 2', async ({ page }) => {
  await page.goto(`${EN.path}#all-posts`);
  await settle(page);
  const index = await readIndex(page);
  const pages = new Map(Object.entries(index.pages || {})).get('en') || [];
  test.skip(pages.length < 2, 'the English archive fits on one page — there is no page 2 to search from');

  const second = pages[1];
  const on_second = new Set(second.items);
  const term = [...new Set(postsOf(index, 'en').flatMap((p) => p.tags || []))]
    .find((tag) => matching(index, 'en', tag).some((url) => !on_second.has(url)));
  expect(term, 'no English tag matches a post off page 2').toBeTruthy();
  const want = matching(index, 'en', term);

  await page.goto(searchUrl(second.url, term));
  await settle(page);
  await expect.poll(() => rowUrls(page), { message: `page 2 did not list every match for "${term}"` }).toEqual(want);
  await expect(page.locator(PAGER), 'the pager still shows while a search is on').toBeHidden();

  await page.locator(CLEAR).click();
  await expect.poll(() => page.evaluate(() => `${location.pathname}${location.search}${location.hash}`))
    .toBe(`${second.url}#all-posts`);
  await expect.poll(() => rowUrls(page), { message: 'clear did not bring back page 2\'s own rows' }).toEqual(second.items);
  await expect(page.locator(PAGER), 'the pager did not come back after clear').toBeVisible();
});
