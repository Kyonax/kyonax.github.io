#!/usr/bin/env node
/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 *
 * Post-build pass: convert vite-ssg's render-blocking <link rel="stylesheet">
 * tags for async-component CSS (now-projects, faq, ...) into non-blocking
 * media-swap loading. Entry CSS (app-*.css) stays render-blocking.
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

let totalRewrites = 0;
for (const file of walkHtml(DIST_DIR)) {
  const html = readFileSync(file, 'utf8');
  let rewrites = 0;
  const next = html.replace(STYLESHEET_RE, (_m, before, name, after) => {
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
