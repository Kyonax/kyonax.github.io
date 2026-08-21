#!/usr/bin/env node
/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 */

import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { c, exitWith, fail, head, ok, REPO_ROOT } from './_lib.mjs';

const DIST = resolve(REPO_ROOT, 'dist');

if (!existsSync(DIST)) {
  ok('dist/ not present — skipping seo-audit (run after `npm run build`)');
  process.exit(0);
}

/* Each locale pair advertises its OWN alternate set — asserting the landing
   URLs everywhere is wrong, not a finding. */
const LANDING_ALTS = { en: 'https://kyonax.com/', es: 'https://kyonax.com/es', 'x-default': 'https://kyonax.com/' };
const RESUME_ALTS  = { en: 'https://kyonax.com/resume', es: 'https://kyonax.com/es/hoja-de-vida', 'x-default': 'https://kyonax.com/resume' };
const PRIVACY_ALTS = { en: 'https://kyonax.com/privacy', es: 'https://kyonax.com/es/privacy', 'x-default': 'https://kyonax.com/privacy' };

/* Every indexable page, not just the two landing pages. `kind` selects the
   assertions that only make sense for a given page type — a resume page has no
   FAQPage block and no hero H1, but it still owes a canonical, hreflang, a
   description inside budget and a resolvable JSON-LD graph. Auditing only the
   landing pages is how a dangling @id and an over-length ES description both
   survived to production. */
const TARGETS = [
  { path: 'index.html',                 locale: 'en', kind: 'landing', canonical: 'https://kyonax.com/',
    alts: LANDING_ALTS },
  { path: 'es/index.html',              locale: 'es', kind: 'landing', canonical: 'https://kyonax.com/es',
    alts: LANDING_ALTS },
  { path: 'resume/index.html',          locale: 'en', kind: 'page',    canonical: 'https://kyonax.com/resume',
    alts: RESUME_ALTS },
  { path: 'es/hoja-de-vida/index.html', locale: 'es', kind: 'page',    canonical: 'https://kyonax.com/es/hoja-de-vida',
    alts: RESUME_ALTS },
  { path: 'privacy/index.html',         locale: 'en', kind: 'page',    canonical: 'https://kyonax.com/privacy',
    alts: PRIVACY_ALTS },
  { path: 'es/privacy/index.html',      locale: 'es', kind: 'page',    canonical: 'https://kyonax.com/es/privacy',
    alts: PRIVACY_ALTS },
];

/* SERP truncation budget. Anything longer is silently cut in results. */
const DESC_MAX = 165;

const failures = [];
const warnings = [];
head('seo-audit — checking built HTML');

const _assert = (cond, msg) => {
  if (!cond) {
    failures.push(msg);
  }
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
  const alts = Object.fromEntries([...html.matchAll(
    /rel="alternate"[^>]*hreflang="([^"]+)"[^>]*href="([^"]+)"/g)].map((m) => [m[1], m[2]]));
  for (const [lang, href] of Object.entries(t.alts)) {
    _assert(alts[lang] === href,
      `${t.path}: hreflang=${lang} should be ${href}, found ${alts[lang] || '(missing)'}`);
  }
  _assert(/<meta\s+[^>]*property="og:image"[^>]*content="https:\/\/[^"]+"/.test(html),
    `${t.path}: og:image must be absolute HTTPS`);
  _assert(/<meta\s+[^>]*property="og:image:width"[^>]*content="\d+"/.test(html),
    `${t.path}: og:image:width missing`);
  _assert(/<meta\s+[^>]*property="og:image:height"[^>]*content="\d+"/.test(html),
    `${t.path}: og:image:height missing`);

  if (t.kind === 'landing') {
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
  }

  /* Applies to EVERY page: the graph must parse and every bare @id reference
     must resolve inside the SAME document — @id resolution is per-page. */
  for (const m of html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)) {
    let parsed = null;
    try {
      parsed = JSON.parse(m[1]);
    } catch (e) {
      failures.push(`${t.path}: JSON-LD block does not parse — ${e.message}`);
    }
    if (!parsed) {
      continue;
    }
    const nodes = [];
    const _flat = (n) => {
      if (Array.isArray(n)) {
        n.forEach(_flat);
      } else if (n && typeof n === 'object') {
        nodes.push(n);
        Object.values(n).forEach(_flat);
      }
    };
    _flat(parsed);
    const defined = new Set(nodes.filter((n) => n['@id'] && n['@type']).map((n) => n['@id']));
    for (const n of nodes) {
      if (n['@id'] && !n['@type'] && Object.keys(n).length === 1 && !defined.has(n['@id'])) {
        failures.push(`${t.path}: dangling @id reference, nothing defines ${n['@id']}`);
      }
    }
  }

  /* Length is a SERP-truncation guideline, not a spec violation, so it warns
     rather than failing the build — a copy decision must not turn CI red. */
  const descMatch = html.match(/<meta\s+[^>]*name="description"[^>]*content="([^"]*)"/);
  if (descMatch && descMatch[1].length > DESC_MAX) {
    warnings.push(`${t.path}: description ${descMatch[1].length} chars, over the ${DESC_MAX} SERP budget (will truncate)`);
  }

  const local = failures.filter((m) => m.startsWith(t.path));
  if (local.length === 0) {
    ok(`${t.path}: passed`);
  } else {
    fail(`${t.path}: ${local.length} issue(s)`);
    for (const m of local) {
      console.log(`    ${c('red', '-')} ${m}`);
    }
  }
}

if (warnings.length) {
  console.log('');
  for (const w of warnings) {
    console.log(c('yellow', `  ! ${w}`));
  }
}
exitWith({ failures, name: 'seo-audit' });
