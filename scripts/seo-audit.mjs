#!/usr/bin/env node
/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import { REPO_ROOT, head, ok, fail, exitWith, c } from './_lib.mjs';

const DIST = resolve(REPO_ROOT, 'dist');

if (!existsSync(DIST)) {
  ok('dist/ not present — skipping seo-audit (run after `npm run build`)');
  process.exit(0);
}

const TARGETS = [
  { path: 'index.html',    locale: 'en', canonical: 'https://kyonax.com/' },
  { path: 'es/index.html', locale: 'es', canonical: 'https://kyonax.com/es' },
];

const failures = [];
head('seo-audit — checking built HTML');

const _assert = (cond, msg) => {
  if (!cond) failures.push(msg);
};

for (const t of TARGETS) {
  const abs = resolve(DIST, t.path);
  if (!existsSync(abs)) {
    failures.push(`missing built file: dist/${t.path}`);
    continue;
  }
  const html = readFileSync(abs, 'utf8');
  console.log(`\n──── ${c('cyan', t.path)}`);

  _assert(/<html[^>]*\blang="?([^"\s>]+)"?/.test(html) && html.match(/<html[^>]*\blang="?([^"\s>]+)"?/)[1] === t.locale,
    `${t.path}: <html lang> != ${t.locale}`);
  _assert(/<title>[^<]+<\/title>/.test(html),
    `${t.path}: <title> empty or missing`);
  _assert(/<meta\s+[^>]*name="description"[^>]*content="[^"]{60,}"/.test(html),
    `${t.path}: <meta name=description> missing or shorter than 60 chars`);
  _assert(html.includes(`<link rel="canonical" href="${t.canonical}"`),
    `${t.path}: canonical != ${t.canonical}`);
  _assert(/rel="alternate"[^>]*hreflang="en"[^>]*href="https:\/\/kyonax\.com\/"/.test(html),
    `${t.path}: hreflang=en alternate missing`);
  _assert(/rel="alternate"[^>]*hreflang="es"[^>]*href="https:\/\/kyonax\.com\/es"/.test(html),
    `${t.path}: hreflang=es alternate missing`);
  _assert(/rel="alternate"[^>]*hreflang="x-default"[^>]*href="https:\/\/kyonax\.com\/"/.test(html),
    `${t.path}: hreflang=x-default alternate missing`);
  _assert(/<meta\s+[^>]*property="og:image"[^>]*content="https:\/\/[^"]+"/.test(html),
    `${t.path}: og:image must be absolute HTTPS`);
  _assert(/<meta\s+[^>]*property="og:image:width"[^>]*content="\d+"/.test(html),
    `${t.path}: og:image:width missing`);
  _assert(/<meta\s+[^>]*property="og:image:height"[^>]*content="\d+"/.test(html),
    `${t.path}: og:image:height missing`);

  const ldMatches = html.match(/<script[^>]*type="application\/ld\+json"[^>]*>/g) || [];
  _assert(ldMatches.length === 2,
    `${t.path}: expected 2 JSON-LD <script> blocks (site graph + FAQPage), found ${ldMatches.length}`);

  _assert(html.includes('"@type":"FAQPage"') || html.includes('"@type": "FAQPage"'),
    `${t.path}: FAQPage JSON-LD block missing`);
  _assert(html.includes('"@type":"Question"') || html.includes('"@type": "Question"'),
    `${t.path}: FAQPage.mainEntity Question entries missing`);

  _assert(html.includes('CRISTIAN D. MORENO'),
    `${t.path}: rendered hero text "CRISTIAN D. MORENO" not in HTML (SSG did not run?)`);

  _assert(html.includes('kyo:lang'),
    `${t.path}: pre-hydration redirect ('kyo:lang') not found`);

  const local = failures.filter((m) => m.startsWith(t.path));
  if (local.length === 0) {
    ok(`${t.path}: passed`);
  } else {
    fail(`${t.path}: ${local.length} issue(s)`);
    for (const m of local) console.log(`    ${c('red', '-')} ${m}`);
  }
}

exitWith({ failures, name: 'seo-audit' });
