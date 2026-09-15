#!/usr/bin/env node
/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 *
 * check-sitemap.mjs — the sitemap generate-sitemap.mjs writes must list the
 * URLs worth crawling, date them honestly and pair them both ways. It must
 * parse as STRICT XML (jsdom's DOMParser, as check-feeds does); name each URL
 * once, absolute https on the site origin, with no query or fragment (a
 * ?search= result is a view of the archive, never a sitemap URL); list no
 * archive page past the first (page N is self-canonical and index,follow on
 * the page itself, and still not listed); date each archive index by the
 * newest post of its locale, not the build day; list every article the
 * manifest routes, dated by its own day; and keep every hreflang cluster
 * closed: each member names itself, one x-default, and the very same set as
 * every URL it names.
 *
 * Run: node scripts/check-sitemap.mjs
 *      node scripts/check-sitemap.mjs --dir=<copy of public/> [--manifest=<json>]
 */

import { join, resolve } from 'node:path';

import { SITE_ORIGIN } from '../src/data/data.js';
import { exitWith, fail, head, line, ok, read, REPO_ROOT } from './_lib.mjs';

const arg = (name) => process.argv
  .find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);

const DIR = resolve(arg('dir') || join(REPO_ROOT, 'public'));
const MANIFEST = resolve(arg('manifest') || join(REPO_ROOT, 'src/data/blog/manifest.json'));

const SITEMAP_NS = 'http://www.sitemaps.org/schemas/sitemap/0.9'; // namespace names, not URLs
const XHTML_NS = 'http://www.w3.org/1999/xhtml';
const ORIGIN_PREFIX = `${SITE_ORIGIN}/`;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/* x-default, or a language subtag and any further subtags (es, en-US). One
   test per subtag keeps each pattern free of nested repetition. */
const isHreflang = (h) => h === 'x-default' || (typeof h === 'string'
  && h.split('-').every((part, i) => (i === 0 ? /^[a-z]{2,3}$/ : /^[A-Za-z0-9]{2,8}$/).test(part)));

/* An archive page past the first: /blog/page/2, /es/blog/page/3. Read off the
   path alone, so it holds on a checkout whose manifest names no blog. */
const PAGER = /\/page\/\d+\/?$/;

/* A post's day, read the way generate-sitemap.mjs reads it: the route's
   YYYY-MM-DD prefix, which is its #+DATE by construction. */
const dateOf = (url) => (/\/(\d{4}-\d{2}-\d{2})-/.exec(url) || [])[1];

const failures = [];
const bad = (msg) => failures.push(`sitemap.xml: ${msg}`);

/* A step's ✓ prints only if that step added no failure since `mark`. */
const passed = (mark, msg) => {
  if (failures.length === mark) {
    ok(msg);
  }
};

head('check-sitemap — crawlable URLs, archive dates, reciprocal hreflang');

let JSDOM = null;
try {
  ({ JSDOM } = await import('jsdom'));
} catch {
  fail('jsdom not installed (a dependency of vite-ssg). Run `npm ci`.');
  process.exit(1);
}
const { window } = new JSDOM('');

const readOr = (file, fallback) => {
  try {
    return read(file);
  } catch {
    return fallback;
  }
};
const readJson = (file) => {
  try {
    return JSON.parse(read(file));
  } catch {
    return null;
  }
};

/* Direct children in one namespace: <loc> and <lastmod> in the sitemap's,
   the hreflang rows in xhtml's. */
const kids = (el, name, ns = SITEMAP_NS) => Array.from(el.children)
  .filter((k) => k.localName === name && k.namespaceURI === ns);

const rowOf = (url, i) => {
  const locs = kids(url, 'loc').map((el) => el.textContent.trim());
  const lastmods = kids(url, 'lastmod').map((el) => el.textContent.trim());
  return {
    at: `<url> ${i + 1}`,
    loc: locs.length === 1 ? locs[0] : null,
    locs: locs.length,
    lastmod: lastmods.length === 1 ? lastmods[0] : null,
    lastmods: lastmods.length,
    links: kids(url, 'link', XHTML_NS)
      .filter((el) => el.getAttribute('rel') === 'alternate')
      .map((el) => ({ hreflang: el.getAttribute('hreflang'), href: el.getAttribute('href') })),
  };
};

/* One cluster, as one comparable string: every member must carry this very
   value, x-default included, or the pairs are not reciprocal. */
const setOf = (row) => row.links.map((a) => `${a.hreflang} ${a.href}`).sort().join('\n');

const checkSitemap = () => {
  const xml = readOr(join(DIR, 'sitemap.xml'), null);
  if (xml === null) {
    bad('missing. Run `npm run generate:sitemap`');
    return;
  }

  const doc = new window.DOMParser().parseFromString(xml, 'application/xml');
  const error = doc.querySelector('parsererror');
  if (error) {
    bad(`not well-formed XML: ${error.textContent.trim().split('\n')[0]}`);
    return;
  }
  const root = doc.documentElement;
  if (root.localName !== 'urlset' || root.namespaceURI !== SITEMAP_NS) {
    bad(`root must be <urlset xmlns="${SITEMAP_NS}">, found <${root.nodeName}>`);
    return;
  }
  const rows = kids(root, 'url').map(rowOf);
  ok(`sitemap.xml: strict XML parse, ${rows.length} <url>`);

  /* 1. Shape: one <loc> per row, no row twice, W3C dates. */
  let mark = failures.length;
  const by_loc = new Map();
  for (const row of rows) {
    if (row.loc === null) {
      bad(`${row.at}: expected exactly one <loc>, found ${row.locs}`);
      continue;
    }
    if (by_loc.has(row.loc)) {
      bad(`${row.loc}: listed twice`);
    }
    by_loc.set(row.loc, row);
    if (row.lastmods > 1 || (row.lastmods === 1 && !ISO_DATE.test(row.lastmod))) {
      bad(`${row.loc}: <lastmod> must be one YYYY-MM-DD date`);
    }
  }
  passed(mark, 'one <loc> per <url>, no URL twice, every <lastmod> YYYY-MM-DD');

  /* 2. Only URLs worth crawling first, every <loc> and every hreflang href. */
  mark = failures.length;
  const every = rows.filter((row) => row.loc).flatMap((row) => [
    { row, what: '<loc>', url: row.loc },
    ...row.links.map((a) => ({ row, what: `hreflang="${a.hreflang}"`, url: a.href })),
  ]);
  for (const { row, what, url } of every) {
    if (typeof url !== 'string' || !url.startsWith(ORIGIN_PREFIX)) {
      bad(`${row.loc}: ${what} "${url}" is not absolute https on ${SITE_ORIGIN}`);
      continue;
    }
    if (url.includes('?') || url.includes('#')) {
      bad(`${row.loc}: ${what} ${url} carries a query or fragment; a ?search= view is never listed`);
    }
    if (PAGER.test(new URL(url).pathname)) {
      bad(`${row.loc}: ${what} ${url} is an archive page past the first; page N is self-canonical but not listed`);
    }
  }
  passed(mark, `no archive page past the first, no query or fragment, all absolute https on ${SITE_ORIGIN}`);

  /* 3. Reciprocal hreflang. A pair a crawler cannot confirm from both ends is
     ignored, so every URL a row names (x-default too) must be listed and must
     name the very same set back, and every row names itself. */
  mark = failures.length;
  const paired = rows.filter((row) => row.loc && row.links.length > 0);
  for (const row of paired) {
    const langs = row.links.map((a) => a.hreflang);
    for (const h of langs.filter((l) => !isHreflang(l))) {
      bad(`${row.loc}: hreflang="${h}" is not a language code or x-default`);
    }
    if (new Set(langs).size !== langs.length) {
      bad(`${row.loc}: an hreflang value is repeated`);
    }
    const defaults = langs.filter((l) => l === 'x-default').length;
    if (defaults !== 1) {
      bad(`${row.loc}: expected one x-default, found ${defaults}`);
    }
    if (!row.links.some((a) => a.hreflang !== 'x-default' && a.href === row.loc)) {
      bad(`${row.loc}: does not name itself among its alternates`);
    }
    const own = setOf(row);
    for (const a of row.links.filter((l) => l.href !== row.loc)) {
      const twin = by_loc.get(a.href);
      if (!twin) {
        bad(`${row.loc}: hreflang="${a.hreflang}" names ${a.href}, which is not in the sitemap`);
      } else if (setOf(twin) !== own) {
        bad(`${row.loc}: hreflang="${a.hreflang}" names ${a.href}, which does not name the same set back`);
      }
    }
  }
  const clusters = new Set(paired.map(setOf)).size;
  passed(mark, `hreflang: ${paired.length} <url> in ${clusters} cluster(s), every pair reciprocal, one x-default inside each`);

  /* 4. The blog, re-derived from the manifest, never read back from the
     generator: a sitemap that went stale against a re-synced corpus has the
     right shape and the wrong days, and only this comparison sees it. */
  const manifest = readJson(MANIFEST) || {};
  const routes = Array.isArray(manifest.routes) ? manifest.routes : [];
  const pages = new Map(Object.entries(manifest.pages || {}));
  if (routes.length === 0 && pages.size === 0) {
    line('the manifest names no blog: no archive or article row to compare');
    return;
  }

  /* The archive index's day is the newest post of ITS locale: the day its
     list last changed. The build day would tell a crawler it changed on
     every deploy, which teaches it to ignore the field. */
  mark = failures.length;
  const newest = new Map();
  for (const route of routes) {
    const day = dateOf(route?.url || '');
    if (day && !(newest.get(route.locale) >= day)) {
      newest.set(route.locale, day);
    }
  }
  let archives = 0;
  for (const [locale, list] of pages) {
    const index = (Array.isArray(list) ? list : []).find((p) => p?.number === 1);
    if (!index) {
      continue;
    }
    archives += 1;
    const loc = `${SITE_ORIGIN}${index.url}`;
    const row = by_loc.get(loc);
    const day = newest.get(locale);
    if (!row) {
      bad(`${loc}: the ${locale} archive index is not listed. Run \`npm run generate:sitemap\``);
    } else if (day && row.lastmod !== day) {
      bad(`${loc}: <lastmod> ${row.lastmod}, but the newest ${locale} post is dated ${day}`);
    }
  }
  const days = [...newest].map(([l, d]) => `${l} ${d}`).join(', ');
  passed(mark, `${archives} archive index(es), each dated by its locale's newest post (${days})`);

  mark = failures.length;
  for (const route of routes) {
    const loc = `${SITE_ORIGIN}${route?.url}`;
    const row = by_loc.get(loc);
    const day = dateOf(route?.url || '');
    if (!row) {
      bad(`${loc}: routed by the manifest but not listed. Run \`npm run generate:sitemap\``);
    } else if (day && row.lastmod !== day) {
      bad(`${loc}: <lastmod> ${row.lastmod}, but the post is dated ${day}`);
    }
  }
  passed(mark, `${routes.length} article(s) listed, each dated by its own day`);
};

checkSitemap();
window.close();

if (failures.length) {
  console.log('');
  for (const f of failures) {
    fail(f);
  }
}
exitWith({ failures, name: 'check-sitemap' });
