#!/usr/bin/env node
/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 */

/*
 * sync-blog.mjs — pull the built blog corpus into this site.
 *
 * Blog CONTENT lives in the kyo-blog repository, not here. That repo builds the
 * .org sources with the published @kyonax/org2html and emits a manifest, one JSON
 * body per post, per-locale search indexes and the post media. This copies those
 * into the places the site's build reads them from.
 *
 * IT MUST NEVER BLOCK A BUILD. If the blog output is not present — a fresh clone,
 * a contributor with no interest in the blog, the existing deploy path before the
 * dispatch wiring lands — this writes an EMPTY manifest and everything downstream
 * becomes a no-op: no routes, no sitemap entries, no audit targets. The site builds
 * exactly as it did before the blog existed. It says which of the two it did.
 *
 *   BLOG_DIST=/path/to/kyo-blog/dist node scripts/sync-blog.mjs
 *
 * Default source is ../kyo-blog/dist, which is the layout on this machine and the
 * layout the deploy workflow creates when it checks the content repo out.
 */

import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { transformSync } from 'esbuild';
import { transform } from 'lightningcss';

import { head, line, ok, REPO_ROOT, warn } from './_lib.mjs';

const SRC = resolve(process.env.BLOG_DIST || join(REPO_ROOT, '..', 'kyo-blog', 'dist'));

/* Generated, gitignored. Owned by kyo-blog; a copy here is a build artefact, not
   source, so it is never committed and never reviewed in this repo's PRs. */
const DEST_DATA = join(REPO_ROOT, 'src/data/blog');
const DEST_MANIFEST = join(DEST_DATA, 'manifest.json');
const DEST_POSTS = join(DEST_DATA, 'posts');

/* Served, not bundled: the search index is fetched on demand so it never counts
   against the main-bundle budget. */
const DEST_SEARCH = join(REPO_ROOT, 'public/blog-search');

/*
 * THE ENGINE'S DEFAULT STYLE BOOK, served rather than bundled.
 *
 * org2html writes `styles.css` beside every build — the `kwo` book that dresses
 * the `.org-*` hooks its renderer emits. The site used to hand-roll a partial
 * copy of it in document-page.vue, which drifted and looked nothing like the
 * engine's own output. Now the book itself is the article stylesheet.
 *
 * MINIFIED ON THE WAY IN: the shipped file is 199 KB of heavily commented
 * source (50 KB gzipped, and those comments are the book's design record, so
 * they belong in the package, not on the wire). lightningcss takes it to
 * ~95 KB / ~16 KB gzipped. It is `public/`, so it never counts against the
 * main-bundle budget and only an article route ever requests it.
 */
const DEST_BOOK_DIR = join(REPO_ROOT, 'public/blog');
const DEST_BOOK = join(DEST_BOOK_DIR, 'style-book.css');

/*
 * THE ENGINE'S INTERACTIVE RUNTIME, served on the same terms as the book.
 *
 * `o2h.js` is org2html's dependency-free progressive-enhancement layer, and it is
 * what turns the YouTube and X embeds from a poster plus a link into a real
 * click-to-play swap. The site deliberately did not load it, so every embed in an
 * article degraded to a plain link — correct, but not a player.
 *
 * NOTHING THIRD-PARTY LOADS UNTIL THE READER CLICKS. The runtime only swaps the
 * facade for the provider's frame on demand, so `nothing the reader pays for`
 * survives: an article whose embed is never clicked costs the reader nothing
 * beyond this one file.
 *
 * MINIFIED ON THE WAY IN, for the reason the book is: the shipped file is 51 KB of
 * hand-authored, heavily commented ES2019 (15.4 KB gzipped) and those comments are
 * the runtime's design record, so they belong in the package rather than on the
 * wire. esbuild takes it to ~21 KB / ~7.5 KB gzipped. It is `public/`, so it never
 * counts against the main-bundle budget and only an article route requests it.
 */
const DEST_RUNTIME = join(DEST_BOOK_DIR, 'o2h.js');

/* Minification drops the source header, and this is GPL-3.0-only code we redistribute
   to every reader — the notice travels with the file. */
const O2H_BANNER =
  '/*! o2h.js - (c) 2026 Cristian D. Moreno (@Kyonax) - GPL-3.0-only - @kyonax/org2html'
  + ' - https://github.com/Kyonax/org2html */';

/* Blog images join the site's own image pipeline, so convert-images.mjs emits their
   AVIF/WebP siblings and records intrinsic dimensions — which is what keeps the
   card grid inside the CLS <= 0.1 Lighthouse assertion. */
const DEST_MEDIA = join(REPO_ROOT, 'src/assets/blog');

/*
 * THE SAME IMAGES AGAIN, SERVED AT THE PATH THE DOCUMENTS ACTUALLY WROTE.
 *
 * The pipeline copy above is for the CARD: use-blog-images.js resolves a post's
 * `cardImage` by basename against a glob of `src/assets/blog`, so the archive gets
 * an AVIF/WebP with known dimensions. A picture INSIDE an article body is a
 * different problem — org2html does not copy content images and `--asset-base`
 * does not rewrite their URLs, so the body HTML carries the literal deployed path
 * the author typed: `/blog/media/<file>`. Nothing was serving that, so the first
 * article to embed a figure would have shipped a 404.
 *
 * So the media is ALSO copied verbatim into `public/blog/`, where that exact URL
 * resolves. The trade is stated rather than hidden: these body images skip the
 * AVIF/WebP conversion, because optimising them would mean rewriting URLs inside
 * rendered HTML, and a wrong rewrite is worse than an unoptimised PNG.
 */
const DEST_BODY_MEDIA = join(DEST_BOOK_DIR, 'media');

const EMPTY = {
  generatedFrom: null,
  base: '/blog',
  origin: 'https://kyonax.com',
  defaultLocale: 'en',
  pageSize: 10,
  locales: [],
  counts: { posts: 0, families: 0, series: 0, pages: 0 },
  posts: [],
  families: {},
  featured: {},
  timeline: {},
  pages: {},
  categories: {},
  tags: {},
  series: {},
};

head('sync-blog');

mkdirSync(DEST_DATA, { recursive: true });

const manifestSrc = join(SRC, 'blog-manifest.json');

if (!existsSync(manifestSrc)) {
  writeFileSync(DEST_MANIFEST, `${JSON.stringify(EMPTY, null, 2)}\n`);
  writeFileSync(
    join(DEST_DATA, 'index.json'),
    `${JSON.stringify({ posts: [], featured: {}, timeline: {}, pages: {}, categories: {}, tags: {}, series: {} }, null, 2)}\n`,
  );
  rmSync(DEST_POSTS, { recursive: true, force: true });
  warn(`no blog build at ${SRC}`);
  line('wrote an EMPTY manifest — the blog contributes no routes to this build');
  line('set BLOG_DIST, or build kyo-blog first, to include it');
  process.exit(0);
}

/* Replace rather than merge: a post deleted in kyo-blog must disappear here, and a
   stale body file left behind would be a route the manifest no longer lists. */
rmSync(DEST_POSTS, { recursive: true, force: true });
rmSync(DEST_SEARCH, { recursive: true, force: true });

cpSync(manifestSrc, DEST_MANIFEST);

/* The rich half: titles, descriptions, card images, per-page item lists. Only
   the archive view imports it, so it lands in that view's chunk rather than in
   the main bundle. */
const indexSrc = join(SRC, 'blog-index.json');
if (existsSync(indexSrc)) {
  cpSync(indexSrc, join(DEST_DATA, 'index.json'));
}

if (existsSync(join(SRC, 'posts'))) {
  cpSync(join(SRC, 'posts'), DEST_POSTS, { recursive: true });
}

const m = JSON.parse(readFileSync(DEST_MANIFEST, 'utf8'));

mkdirSync(DEST_SEARCH, { recursive: true });
for (const locale of m.locales) {
  const f = join(SRC, `blog-search-${locale}.json`);
  if (existsSync(f)) {
    cpSync(f, join(DEST_SEARCH, `blog-search-${locale}.json`));
  }
}

/*
 * A MISSING BOOK IS A WARNING, NOT A FAILURE — the same contract the rest of
 * this script keeps. It only reaches the wire on an article route, and with no
 * corpus there are no article routes.
 */
/*
 * THE BOOK'S @font-face RULES ARE DROPPED ON THE WAY IN. The book declares its two
 * families — Geomanist and SpaceMono, the same names this site serves — at
 * `/blog/fonts/`, where org2html writes its own copies. This site owns its faces
 * (its SpaceMono is re-cut against its own corpus) and hands them to the book
 * through `--host-font-*`, so those copies are never synced and the rules pointed
 * at nothing: every article asked for four fonts and received the SPA's HTML page
 * for each, ~207 KB apiece, in both engines (found 2026-09-12). Syncing the files
 * instead would download a second set of the same families on every article.
 */
const bookSrc = join(SRC, 'blog', 'styles.css');
if (existsSync(bookSrc)) {
  const raw = readFileSync(bookSrc);
  let dropped = 0;
  const { code } = transform({
    filename: 'style-book.css',
    code: raw,
    minify: true,
    visitor: {
      Rule: {
        'font-face'() {
          dropped += 1;
          return [];
        },
      },
    },
  });
  mkdirSync(DEST_BOOK_DIR, { recursive: true });
  writeFileSync(DEST_BOOK, code);
  line(`style book ${(raw.length / 1024).toFixed(0)} KB -> ${(code.length / 1024).toFixed(0)} KB minified, ${dropped} @font-face rule(s) dropped — the site serves its own faces`);
} else {
  warn('no styles.css in the blog build — articles will render unstyled');
}

/* A MISSING RUNTIME IS A WARNING, NOT A FAILURE — the same contract the book keeps.
   With no corpus there are no article routes, so there is nothing to enhance. */
const runtimeSrc = join(SRC, 'blog', 'o2h.js');
if (existsSync(runtimeSrc)) {
  const raw = readFileSync(runtimeSrc, 'utf8');
  const { code } = transformSync(raw, { loader: 'js', minify: true, target: 'es2019' });
  mkdirSync(DEST_BOOK_DIR, { recursive: true });
  writeFileSync(DEST_RUNTIME, `${O2H_BANNER}\n${code}`);
  line(`runtime ${(raw.length / 1024).toFixed(0)} KB -> ${(code.length / 1024).toFixed(0)} KB minified`);
} else {
  warn('no o2h.js in the blog build — article embeds will not click to play');
}

if (existsSync(join(SRC, 'blog', 'media'))) {
  mkdirSync(DEST_MEDIA, { recursive: true });
  cpSync(join(SRC, 'blog', 'media'), DEST_MEDIA, { recursive: true });
  /* …and again, unconverted, at the URL the article bodies reference. */
  mkdirSync(DEST_BODY_MEDIA, { recursive: true });
  cpSync(join(SRC, 'blog', 'media'), DEST_BODY_MEDIA, { recursive: true });
}

ok(`synced ${m.counts.posts} post(s) from ${SRC}`);
line(`locales [${m.locales.join(', ')}] · ${m.counts.families} translation group(s) · ${m.counts.pages} archive page(s)`);
