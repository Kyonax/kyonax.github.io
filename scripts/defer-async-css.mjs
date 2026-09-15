#!/usr/bin/env node
/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 *
 * Post-build pass: convert vite-ssg's render-blocking <link rel="stylesheet">
 * tags for async-component CSS (now-projects, faq, ...) into non-blocking
 * media-swap loading. Entry CSS (app-*.css) stays render-blocking, and so do
 * the two chunks an article cannot paint without (ARTICLE_CRITICAL below).
 */

import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const DIST_DIR = 'dist';

const walkHtml = (dir) => {
  const out = [];
  for (const entry of readdirSync(dir)) {
    if (entry === 'error-pages') {
      continue;
    }
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      out.push(...walkHtml(full));
    } else if (entry.endsWith('.html')) {
      out.push(full);
    }
  }
  return out;
};

const STYLESHEET_RE = /<link rel="stylesheet"([^>]*?)href="\/assets\/(?!app-)([^"]+\.css)"([^>]*)>/g;

/*
 * ON AN ARTICLE, TWO ASYNC CHUNKS STAY RENDER-BLOCKING: they are render-critical.
 *
 * `blog-post-*` carries the `:root --host-*` band that parameterises the blog's
 * style book (/blog/style-book.css, itself render-blocking), and
 * `document-page-*` carries the `.doc` shell — the page gutter, the sheet's
 * measure, and the rule that hides the engine's own duplicate masthead.
 * Deferred, the book painted first on its own defaults, WITH that masthead,
 * and the article jumped into place when the swap landed: CLS 0.45 on the
 * kitchen-sink article at 390px under a 4x CPU throttle, 0.32 on the desktop
 * Lighthouse preset. Blocking, both are 0.005 or less.
 *
 * ONLY ON AN ARTICLE — a page that links `blog-post-*`. The blog archive also
 * renders the shell, but its own view chunk stays deferred, and a shell that
 * paints correctly ahead of the view it frames made the archive shift MORE:
 * Lighthouse CLS 0.025 -> 0.89 there. The archive keeps the old loading.
 *
 * The article's foot is two chunks of its own (the series panel and the
 * reading links, split out of blog-post- for its budget): blog-post- already
 * matches blog-post-nav-, and blog-series- is named here, or the series
 * panel's CSS would land after paint and shift the foot.
 */
const ARTICLE_CRITICAL = /^(?:blog-post|blog-series|document-page)-/;

let totalRewrites = 0;
for (const file of walkHtml(DIST_DIR)) {
  const html = readFileSync(file, 'utf8');
  const is_article = html.includes('href="/assets/blog-post-');
  let rewrites = 0;
  const next = html.replace(STYLESHEET_RE, (match, before, name, after) => {
    if (is_article && ARTICLE_CRITICAL.test(name)) {
      return match;
    }
    rewrites += 1;
    const href = `/assets/${name}`;
    const deferred = `<link rel="stylesheet"${before}href="${href}"${after} media="print" onload="this.media='all';this.onload=null">`;
    const noJs     = `<noscript><link rel="stylesheet"${before}href="${href}"${after}></noscript>`;
    return deferred + noJs;
  });
  if (rewrites > 0) {
    writeFileSync(file, next);
    totalRewrites += rewrites;
    process.stdout.write(`defer-async-css: ${file} (${rewrites} rewrite${rewrites === 1 ? '' : 's'})\n`);
  }
}

if (totalRewrites === 0) {
  process.stdout.write('defer-async-css: no async-component stylesheets found\n');
}
