#!/usr/bin/env node
/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 */

/*
 * check-blog-prerender.mjs — every blog route the manifest names must exist in
 * dist/ as real HTML, with the article text in it.
 *
 * WHY THIS EXISTS. Blog routes have to be registered in two independent places:
 * src/router.js (so vue-router knows them) and ssgOptions.includedRoutes in
 * vite.config.js (so vite-ssg prerenders them). Missing the second does NOT
 * error — the page still builds, and ships as an empty shell to crawlers. That
 * failure happened during this integration: the manifest was split in two, the
 * prerender list kept reading the old key, and every ARTICLE silently stopped
 * being prerendered while the archive pages kept working.
 *
 * A build that looks green while shipping empty pages to Google is the exact
 * class of silent-wrong-answer this whole pipeline is built to refuse.
 *
 * Two more of that class are checked here, once the blog contributes routes:
 * every same-origin link on every prerendered page lands on a file the build
 * wrote, and every article preloads its own body chunk.
 */

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, join, resolve, sep } from 'node:path';

import { exitWith, fail, head, line, ok, REPO_ROOT } from './_lib.mjs';

const DIST = resolve(REPO_ROOT, 'dist');
const MANIFEST = resolve(REPO_ROOT, 'src/data/blog/manifest.json');

head('check-blog-prerender');

if (!existsSync(MANIFEST) || !existsSync(DIST)) {
  line('no blog manifest or no dist/ — nothing to check');
  process.exit(0);
}

const m = JSON.parse(readFileSync(MANIFEST, 'utf8'));
const routes = [
  ...Object.values(m.pages || {}).flat().map((p) => p.url),
  ...(m.routes || []).map((p) => p.url),
];

if (routes.length === 0) {
  line('empty manifest — the blog contributes no routes');
  process.exit(0);
}

const failures = [];

for (const url of routes) {
  const file = resolve(DIST, `${url.replace(/^\//, '')}/index.html`);
  if (!existsSync(file)) {
    failures.push(`${url}: NOT prerendered (missing ${file.replace(`${REPO_ROOT}/`, '')})`);
    continue;
  }

  const html = readFileSync(file, 'utf8');

  /* An empty shell still has <html> and the app scripts. What proves the page
     was actually rendered is the app's own root content. */
  if (!html.includes('id="main"')) {
    failures.push(`${url}: prerendered but carries no <main> — an empty shell`);
  }

  /* Exactly one landmark. The engine's Vue SFC would have nested a second
     <main> inside DocumentPage's; the fragment path must not regress to that. */
  const mains = (html.match(/<main/g) || []).length;
  if (mains !== 1) {
    failures.push(`${url}: ${mains} <main> landmarks, expected exactly 1`);
  }
}

/* The articles must carry their body, not just their chrome. */
for (const row of m.routes || []) {
  const file = resolve(DIST, `${row.url.replace(/^\//, '')}/index.html`);
  if (!existsSync(file)) {
    continue;
  }
  if (!readFileSync(file, 'utf8').includes('org-root')) {
    failures.push(`${row.url}: no .org-root in the HTML — the article body did not render`);
  }
}

if (failures.length === 0) {
  ok(`${routes.length} blog route(s) prerendered with exactly one <main>`);
}

// ------------------------------------------------------------ the markup ----

/*
 * Every tag with its attributes, read the way a browser tokenises them: a
 * quoted value may hold `>` or ` href=` without ending the tag or faking an
 * attribute, and `data-href` is not `href`. Scripts, styles and comments go
 * first — JSON-LD and speculation rules carry URLs that are not links.
 *
 * safe-regex flags both patterns for their nested quantifiers, but neither can
 * backtrack: every repeat opens on whitespace, which no attribute name and no
 * unquoted value can contain, and a quoted value ends only at its own quote —
 * so a tag splits into attributes exactly one way, and a failing branch dies
 * on its next character. The input is this build's own HTML.
 */
// eslint-disable-next-line security/detect-unsafe-regex
const TAG = /<([a-z][\w-]*)((?:\s+[^\s"'<>/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'=<>`]+))?)*)\s*\/?>/gi;
// eslint-disable-next-line security/detect-unsafe-regex
const ATTR = /([^\s"'<>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;

const tagsOf = (html) => [...html
  .replace(/<script\b[\s\S]*?<\/script>/gi, '')
  .replace(/<style\b[\s\S]*?<\/style>/gi, '')
  .replace(/<!--[\s\S]*?-->/g, '')
  .matchAll(TAG)]
  .map(([, name, attrs]) => ({
    name: name.toLowerCase(),
    attrs: new Map([...attrs.matchAll(ATTR)].map(([, key, a, b, c]) =>
      [key.toLowerCase(), (a ?? b ?? c ?? '').replace(/&amp;/g, '&')])),
  }));

const ORIGIN = (m.origin || 'https://kyonax.com').replace(/\/$/, '');

/* An href's path on this origin, or null for another origin or no URL. */
const sameOriginPath = (href, from) => {
  try {
    const url = new URL(href, `${ORIGIN}${from}`);
    return url.origin === ORIGIN ? url.pathname : null;
  } catch {
    return null;
  }
};

// --------------------------------------------------------------- the links ----

/*
 * EVERY SAME-ORIGIN LINK LANDS ON A FILE THE BUILD WROTE.
 *
 * A route that exists only in the data is still a dead link on the page. The
 * engine relates a post to the whole corpus, both languages at once, and the
 * site prefixed each relation with the current post's locale — so 8 links
 * under four articles pointed at `/blog/<spanish-slug>` or
 * `/es/blog/<english-slug>`, routes nothing prerendered, and every gate was
 * green. So every href on every prerendered page, <a> and <link> alike and the
 * whole site rather than only the blog, must resolve the way the server
 * resolves it: dist/<path>/index.html, or dist/<path> as a file. A trailing
 * slash is accepted (DirectorySlash Off serves both); the query and the
 * fragment are never part of the file. Skipped: mailto:, tel:, a bare
 * #fragment, and every other origin or scheme.
 */
/* Every prerendered page and the path it is served at. Not _lib's walk(),
   which skips directories named `build` or `dist` — ordinary route names. */
const pages = readdirSync(DIST, { recursive: true })
  .filter((rel) => basename(rel) === 'index.html')
  .map((rel) => ({ file: join(DIST, rel), page: `/${rel.split(sep).slice(0, -1).join('/')}` }));

const landsOnAFile = (path) => {
  const file = join(DIST, path);
  return existsSync(join(file, 'index.html'))
    || (existsSync(file) && statSync(file).isFile());
};

const dead = new Set();
let links = 0;
for (const { file, page } of pages) {
  for (const tag of tagsOf(readFileSync(file, 'utf8'))) {
    const raw = tag.attrs.get('href');
    if (raw === undefined || raw === '' || raw.startsWith('#') || /^(?:mailto|tel):/i.test(raw)) {
      continue;
    }
    const pathname = sameOriginPath(raw, page);
    if (pathname === null) {
      continue;
    }
    links += 1;
    let path;
    try {
      path = decodeURIComponent(pathname);
    } catch {
      path = pathname;
    }
    if (path !== '/' && path.endsWith('/')) {
      path = path.slice(0, -1);
    }
    if (!landsOnAFile(path)) {
      dead.add(`${page}: <${tag.name} href="${raw}"> lands on no page and no file in dist/`);
    }
  }
}

if (dead.size === 0) {
  ok(`${links} same-origin link(s) on ${pages.length} prerendered page(s) all land on a file`);
}
failures.push(...dead);

// ------------------------------------------------------- the body chunks ----

/*
 * ONE BODY-CHUNK MODULEPRELOAD PER ARTICLE, AND IT IS ITS OWN.
 *
 * An article's body is a chunk of its own (use-blog.js, import.meta.glob),
 * requested only once the app has hydrated and asked for it — so nothing in
 * the prerendered HTML named it and it started a round trip late on every
 * direct load. The build's onPageRendered hook (scripts/ssg-preload.mjs)
 * writes a <link rel=modulepreload> for it into the article's head. None
 * means the hook is not wired; two, or another article's, means it matched
 * the wrong chunk. The chunk is named after the body file the route loads,
 * then the build's eight-character hash — the rule tests/e2e/prefetch.spec.js
 * applies, so the two cannot disagree, and the hash length is what keeps
 * `…-why-org-mode-` from matching `…-why-org-mode-beats-markdown-`.
 */
const BASE = m.base || '/blog';
const DEFAULT_LOCALE = m.defaultLocale || 'en';
const stemOf = (row) => {
  const prefix = row.locale === DEFAULT_LOCALE ? BASE : `/${row.locale}${BASE}`;
  const body = row.url.slice(prefix.length).replace(/^\//, '').replace(/\//g, '__');
  return `/assets/${body}-`;
};
const isChunkOf = (href, stem) => href.startsWith(stem) && /^[\w-]{8}\.js$/.test(href.slice(stem.length));

const articles = (m.routes || [])
  .map((row) => ({ ...row, file: resolve(DIST, `${row.url.replace(/^\//, '')}/index.html`), stem: stemOf(row) }))
  .filter((row) => existsSync(row.file));
const stems = articles.map((row) => row.stem);

const preloadsOf = (html) => tagsOf(html)
  .filter((tag) => tag.name === 'link'
    && (tag.attrs.get('rel') || '').toLowerCase().split(/\s+/).includes('modulepreload')
    && tag.attrs.get('href'))
  .map((tag) => sameOriginPath(tag.attrs.get('href'), '/'))
  .filter(Boolean);

const chunkFailures = [];
let unwired = 0;
for (const row of articles) {
  const preloads = preloadsOf(readFileSync(row.file, 'utf8'));
  const own = preloads.filter((href) => isChunkOf(href, row.stem));
  const foreign = preloads.filter((href) => !isChunkOf(href, row.stem) && stems.some((s) => isChunkOf(href, s)));
  if (own.length === 0 && foreign.length === 0) {
    unwired += 1;
  }
  if (own.length !== 1 || foreign.length > 0) {
    const also = foreign.length ? `; also preloads another article's: ${foreign.join(', ')}` : '';
    chunkFailures.push(`${row.url}: ${own.length} modulepreload(s) of its body chunk ${row.stem}XXXXXXXX.js, expected 1${also}`);
  }
}

if (articles.length > 0 && unwired === articles.length) {
  /* One cause, so one line: nothing preloads any body chunk at all. */
  failures.push(`none of the ${articles.length} article(s) preloads its body chunk`
    + ` (e.g. ${articles[0].stem}XXXXXXXX.js): the ssgOptions.onPageRendered hook`
    + ' (scripts/ssg-preload.mjs) is not wired into vite.config.js');
} else if (chunkFailures.length > 0) {
  failures.push(...chunkFailures);
} else if (articles.length > 0) {
  ok(`${articles.length} article(s) each preload their own body chunk, once`);
}

if (failures.length > 0) {
  /* Name every one: "2 issues" is not actionable at 03:00. */
  for (const f of failures) {
    fail(f);
  }
}

exitWith({ failures, name: 'check-blog-prerender' });
