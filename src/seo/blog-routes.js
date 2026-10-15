/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 */

/*
 * blog-routes.js — every blog route, derived from the synced manifest.
 *
 * routes.js says a localised page means "adding its map HERE and nowhere
 * else". That is right for a page you write by hand and impossible for a
 * blog: the archive grows without anyone editing this repo. So the shapes
 * routes.js declares by hand — a locale map per page, an hreflang row set
 * per page — are DERIVED here from src/data/blog/manifest.json, which
 * kyo-blog owns and scripts/sync-blog.mjs copies in.
 *
 * The manifest is small on purpose: metadata only. Post BODIES live in
 * src/data/blog/posts/ and are loaded per route, so importing this module
 * never pulls an article into the main bundle.
 *
 * An empty manifest (no blog checkout) makes every export here empty, and
 * every consumer degrades to "there is no blog" rather than breaking.
 */

import manifest from '@data/blog/manifest.json';
import { TOGGLE_KEEPS_PAGE } from '@seo/archive-pages';

export const BLOG_MANIFEST = manifest;
export const BLOG_BASE = manifest.base || '/blog';
export const BLOG_DEFAULT_LOCALE = manifest.defaultLocale || 'en';
export const BLOG_LOCALES = manifest.locales || [];

const POSTS = manifest.routes || [];
const PAGES = manifest.pages || {};
const FAMILIES = manifest.families || {};
const ORIGIN = manifest.origin || '';

/* The site serves the default locale at the root and every other locale
   under /<locale> — the shape /resume and /es/hoja-de-vida already use. */
const prefixFor = (locale) =>
  (locale === BLOG_DEFAULT_LOCALE ? '' : `/${locale}`);

const indexUrlFor = (locale) => `${prefixFor(locale)}${BLOG_BASE}`;

/*
 * An ENGINE url -> a SITE route.
 *
 * relations.json is data, not navigation [P-00]: the engine writes every url in
 * it ROOT-RELATIVE to its own corpus (`/engineering/2026-05-01-x`), because it
 * does not know where the host mounts the blog or how the host spells a locale.
 * Rendering one of those straight into an `href` produces a path this router has
 * no route for, and the 404 surface sends the reader to the landing page — which
 * is exactly what previous/next, related reading and every series item did.
 *
 * So the base path and the locale prefix are added HERE, once, in the same shape
 * `indexUrlFor` already uses. Idempotent: a url that already carries the prefix
 * is returned untouched, so running it twice cannot double it.
 */
export const blogSiteUrl = (engineUrl, locale) => {
  if (!engineUrl || typeof engineUrl !== 'string' || !engineUrl.startsWith('/')) {
    return engineUrl;
  }
  const prefix = `${prefixFor(locale)}${BLOG_BASE}`;
  return engineUrl.startsWith(`${prefix}/`) || engineUrl === prefix
    ? engineUrl
    : `${prefix}${engineUrl}`;
};

/* Trailing slash is optional in the served URLs (Apache DirectorySlash
   Off), so every comparison accepts both — the rule routes.js applies to
   its own families. */
const strip = (p) => (p !== '/' && p.endsWith('/') ? p.slice(0, -1) : p);

// -------------------------------------------------------------- lookup ----

const BY_URL = new Map();
for (const post of POSTS) {
  BY_URL.set(post.url, post);
}

/* Every archive page, flattened: /blog, /blog/page/2, /es/blog, … */
const PAGE_URLS = new Map();
for (const [locale, pages] of Object.entries(PAGES)) {
  for (const page of pages) {
    PAGE_URLS.set(page.url, { ...page, locale });
  }
}

/* Each locale's archive pages in order, keyed in a Map so a locale is looked
   up, never used as a property name. */
const PAGES_BY_LOCALE = new Map(Object.entries(PAGES));
const pagesOf = (locale) => PAGES_BY_LOCALE.get(locale) || [];

export const blogPostAt = (path) => BY_URL.get(strip(path)) || null;
export const blogPageAt = (path) => PAGE_URLS.get(strip(path)) || null;

/* Every archive page for a locale, in order. The pagination renders NUMBERED
   links, so it needs the siblings and not just prev/next — and this reads the
   ROUTING manifest, which routes.js already imports eagerly, so it costs the
   bundle nothing over what is loaded on every page anyway. */
export const blogPagesFor = (locale) => pagesOf(locale);

export const BLOG_INDEX_URLS = Object.freeze(
  Object.fromEntries(BLOG_LOCALES.map((l) => [l, indexUrlFor(l)])),
);

// ---------------------------------------------------------- predicates ----

export const isBlogIndexPath = (path) => PAGE_URLS.has(strip(path));
export const isBlogPostPath = (path) => BY_URL.has(strip(path));

/*
 * A PREFIX test, not an exact-match table. routes.js's _matches() compares
 * whole paths against a frozen two-entry map, which cannot express an
 * archive — a post route is only known at build time. Anything under the
 * base is a blog path, including one the manifest does not name, so it
 * renders blog chrome rather than falling through to landing chrome with
 * dead section anchors.
 */
export const isBlogPath = (path) => {
  const p = strip(path);
  if (p === BLOG_BASE || p.startsWith(`${BLOG_BASE}/`)) {
    return true;
  }
  return BLOG_LOCALES.some((l) => {
    if (l === BLOG_DEFAULT_LOCALE) {
      return false;
    }
    const base = `/${l}${BLOG_BASE}`;
    return p === base || p.startsWith(`${base}/`);
  });
};

// ------------------------------------------------------------ families ----

/*
 * "Same page, other locale" — the question the language toggle asks.
 * Without this a visitor switching language on a post is bounced to the
 * landing, the exact bug the comment in routes.js warns about.
 */
export const blogLocaleSwapTarget = (path, targetLocale) => {
  const p = strip(path);

  const post = BY_URL.get(p);
  if (post) {
    const family = FAMILIES[post.key];
    return (family && family[targetLocale]) || indexUrlFor(targetLocale);
  }

  const page = PAGE_URLS.get(p);
  if (page) {
    /* The toggle keeps the reader's PLACE in the archive: page N lands on
       the other locale's page N — the pair the hreflang below advertises —
       and on that locale's index when it has no page N. The same depth, not
       the same posts: the archives are independent, which is why a
       ?search= term travels with the toggle (use-language.js) and searches
       every page there. TOGGLE_KEEPS_PAGE off lands every page on the
       index, as before. */
    const pages = pagesOf(targetLocale);
    const twin = TOGGLE_KEEPS_PAGE ? pages[page.number - 1] : null;
    return (twin || pages[0] || { url: indexUrlFor(targetLocale) }).url;
  }

  return indexUrlFor(targetLocale);
};

/*
 * The hreflang rows for a path, built from the translation groups. A post
 * pairs with its twin; an archive page pairs with the same page number in the
 * other locale.
 *
 * PAGE N PAIRS ONLY WITH A PAGE N THAT EXISTS. A missing twin used to point at
 * the other locale's index, which made a one-way pair whenever the archives
 * had different page counts: the index never names page N back, and hreflang
 * that is not reciprocal is ignored. So page N names every locale that HAS a
 * page N, x-default is the default locale's page N (one of the pair, so the
 * cluster stays closed), and a page N with no twin carries no hreflang at
 * all — its canonical is still its own (blogUrlsFor). Page 1 is unchanged:
 * every locale's index, and x-default the default locale's.
 */
export const blogAlternatesFor = (path) => {
  const p = strip(path);

  const post = BY_URL.get(p);
  if (post) {
    const family = FAMILIES[post.key] || {};
    const rows = Object.entries(family)
      .map(([l, u]) => ({ hreflang: l, href: `${ORIGIN}${u}` }));
    const xd = family[BLOG_DEFAULT_LOCALE] || post.url;
    rows.push({ hreflang: 'x-default', href: `${ORIGIN}${xd}` });
    return rows;
  }

  const page = PAGE_URLS.get(p);
  if (!page) {
    return [];
  }

  const twinIn = (locale) => pagesOf(locale)[page.number - 1];
  const rows = BLOG_LOCALES
    .filter((l) => twinIn(l))
    .map((l) => ({ hreflang: l, href: `${ORIGIN}${twinIn(l).url}` }));
  if (page.number > 1 && rows.length < 2) {
    return [];
  }

  const xd = twinIn(BLOG_DEFAULT_LOCALE);
  if (xd) {
    rows.push({ hreflang: 'x-default', href: `${ORIGIN}${xd.url}` });
  }
  return rows;
};

/* The { en, es } canonical map useSeoHead expects. A page N with no twin has
   no hreflang rows, and it is still its own canonical — so the page's own
   locale is always in the map. */
export const blogUrlsFor = (path) => {
  const urls = Object.fromEntries(
    blogAlternatesFor(path)
      .filter((a) => a.hreflang !== 'x-default')
      .map((a) => [a.hreflang, a.href]),
  );
  const page = PAGE_URLS.get(strip(path));
  if (page && !urls[page.locale]) {
    urls[page.locale] = `${ORIGIN}${page.url}`;
  }
  return urls;
};

// -------------------------------------------------------------- routes ----

/*
 * Every blog path this site serves. vite-ssg prerenders only what
 * router.getRoutes() enumerates and skips anything carrying a :param, so
 * every post and every archive page is registered as a STATIC route.
 */
export const blogRoutePaths = () => [...PAGE_URLS.keys(), ...BY_URL.keys()];

export const localeOfBlogPath = (path) => {
  const p = strip(path);
  const post = BY_URL.get(p);
  if (post) {
    return post.locale;
  }
  const page = PAGE_URLS.get(p);
  return (page && page.locale) || BLOG_DEFAULT_LOCALE;
};
