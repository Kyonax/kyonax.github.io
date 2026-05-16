#!/usr/bin/env node
/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 *
 * Local SEO audit harness — runs the local-projects/seo-analyzer modules
 * over every kyo-web-online canonical route, unwrapping the @graph payload
 * so per-entity validators (BreadcrumbList shape, schema.org type spread)
 * can fire. seo-analyzer assumes one schema per <script> tag; we emit one
 * @graph per page, so this shim splits @graph members into pseudo-blocks
 * before the analyzer's findBlockOfType + validateBreadcrumbList run.
 *
 * Writes reports/seo-audit.md by default — full raw HTML per URL,
 * pretty-printed JSON-LD, and the per-check results table.
 */

import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { extractJsonLdBlocks, listSchemaTypes }
  from '/Volumes/dev-partition/local-projects/seo-analyzer/jsonld-check/extractors.mjs';
import { findBlockOfType, validateBreadcrumbList }
  from '/Volumes/dev-partition/local-projects/seo-analyzer/jsonld-check/validators.mjs';

import { REPO_ROOT, c } from './_lib.mjs';

const ROUTES = [
  { path: '/',           expectedTypes: ['WebSite', 'Person', 'ProfilePage', 'FAQPage'] },
  { path: '/es',         expectedTypes: ['WebSite', 'Person', 'ProfilePage', 'FAQPage'] },
  { path: '/privacy',    expectedTypes: [] },
  { path: '/es/privacy', expectedTypes: [] },
];

const BASE = process.env.SEO_BASE_URL || 'http://localhost:4173';
const args = new Set(process.argv.slice(2));
const SHOW_RAW = args.has('--show-raw');
const REPORT_PATH = (() => {
  const arg = process.argv.find((a) => a.startsWith('--report='));
  if (arg) return resolve(REPO_ROOT, arg.slice('--report='.length));
  return resolve(REPO_ROOT, 'reports/seo-audit.md');
})();

const _fetch = async (url) => {
  const res = await fetch(url, { headers: { 'User-Agent': 'kyo-seo-audit/1.0' } });
  return { status: res.status, html: await res.text() };
};

const _explode_graph = (blocks) => {
  const out = [];
  for (const b of blocks) {
    if (!b.parsed) { out.push(b); continue; }
    if (Array.isArray(b.parsed['@graph'])) {
      for (const node of b.parsed['@graph']) {
        out.push({ ...b, parsed: { '@context': b.parsed['@context'], ...node } });
      }
    } else {
      out.push(b);
    }
  }
  return out;
};

const META_CHECKS = [
  {
    name:    'title',
    regex:   /<title>([^<]+)<\/title>/,
    pass:    (m) => !!m,
    detail:  (m) => m?.[1] || '(missing)',
  },
  {
    name:    'description ≥60 chars',
    regex:   /<meta\s+[^>]*name="description"[^>]*content="([^"]{60,})"/,
    pass:    (m) => !!m,
    detail:  (m) => m ? `${m[1].length} chars` : '(missing)',
  },
  {
    name:    'canonical',
    regex:   /<link\s+rel="canonical"[^>]*href="([^"]+)"/,
    pass:    (m) => !!m,
    detail:  (m) => m?.[1] || '(missing)',
  },
  {
    name:    'og:image absolute HTTPS',
    regex:   /<meta\s+[^>]*property="og:image"[^>]*content="(https:\/\/[^"]+)"/,
    pass:    (m) => !!m,
    detail:  (m) => m?.[1] || '(missing or not absolute)',
  },
  {
    name:    'twitter:card',
    regex:   /<meta\s+[^>]*name="twitter:card"[^>]*content="([^"]+)"/,
    pass:    (m) => m?.[1] === 'summary_large_image',
    detail:  (m) => m?.[1] || '(missing)',
  },
  {
    name:    'robots indexable',
    regex:   /<meta\s+[^>]*name="robots"[^>]*content="([^"]+)"/,
    pass:    (m) => !!m && /index/i.test(m[1]),
    detail:  (m) => m?.[1] || '(missing)',
  },
];

const _check_meta = (html, route) => {
  const tests = META_CHECKS.map((check) => {
    const m = html.match(check.regex);
    return { name: check.name, pass: check.pass(m), detail: check.detail(m) };
  });

  const expected_lang = route.path.startsWith('/es') ? 'es' : 'en';
  const lang = html.match(/<html[^>]*\blang="?([^"\s>]+)"?/);
  tests.push({
    name:   `<html lang="${expected_lang}">`,
    pass:   lang?.[1] === expected_lang,
    detail: lang?.[1] || '(missing)',
  });

  const hreflang_count = (html.match(/rel="alternate"[^>]*hreflang=/g) || []).length;
  tests.push({ name: 'hreflang ≥3 alternates', pass: hreflang_count >= 3, detail: `${hreflang_count} found` });

  if (route.path === '/' || route.path === '/es') {
    const has_prehydration_redirect = html.includes('kyo:lang');
    tests.push({
      name:   'pre-hydration redirect (kyo:lang)',
      pass:   has_prehydration_redirect,
      detail: has_prehydration_redirect ? 'present' : '(missing)',
    });
  }

  return tests;
};

const _bold   = (s) => c('bold',   s);
const _green  = (s) => c('green',  s);
const _red    = (s) => c('red',    s);
const _dim    = (s) => c('dim',    s);
const _yellow = (s) => c('yellow', s);

const reportSections = [];
let total_pass = 0;
let total_fail = 0;
const started = new Date().toISOString();

for (const route of ROUTES) {
  const url = BASE + route.path;
  console.log(`\n${_bold('━━')} ${_bold(url)}`);
  const checks = [];
  let route_pass = 0;
  let route_fail = 0;
  let fetched;
  try {
    fetched = await _fetch(url);
  } catch (err) {
    console.log(`  ${_red('✗')} fetch failed: ${err.message}`);
    reportSections.push({ url, route, error: err.message });
    total_fail += 1;
    continue;
  }
  console.log(`  HTTP ${fetched.status}`);

  const meta_tests = _check_meta(fetched.html, route);
  for (const t of meta_tests) {
    checks.push(t);
    const icon = t.pass ? _green('✓') : _red('✗');
    console.log(`  ${icon} ${t.name} ${_dim('→ ' + t.detail)}`);
    if (t.pass) { total_pass += 1; route_pass += 1; }
    else        { total_fail += 1; route_fail += 1; }
  }

  const raw_blocks = extractJsonLdBlocks(fetched.html);
  console.log(`  ${_dim('ld+json blocks:')} ${raw_blocks.length}`);
  const blocks = _explode_graph(raw_blocks);

  const types = listSchemaTypes(blocks);
  console.log(`  ${_dim('schema types present:')} ${types.join(', ') || '(none)'}`);

  const entity_results = [];

  if (route.expectedTypes.length === 0) {
    if (raw_blocks.length === 0) {
      console.log(`  ${_green('✓')} no JSON-LD expected, none found`);
      total_pass += 1; route_pass += 1;
      checks.push({ name: 'no JSON-LD expected', pass: true, detail: 'none found' });
    } else {
      console.log(`  ${_yellow('!')} no JSON-LD expected on this route, but ${raw_blocks.length} block(s) emitted`);
      checks.push({ name: 'no JSON-LD expected', pass: false, detail: `${raw_blocks.length} block(s) emitted` });
    }
  } else {
    for (const t of route.expectedTypes) {
      const found = findBlockOfType(blocks, t);
      const errors = [];
      if (!found) {
        console.log(`  ${_red('✗')} missing entity: ${t}`);
        total_fail += 1; route_fail += 1;
        entity_results.push({ type: t, present: false, errors: [] });
        continue;
      }
      console.log(`  ${_green('✓')} entity present: ${t}`);
      total_pass += 1; route_pass += 1;
      if (t === 'BreadcrumbList') {
        for (const e of validateBreadcrumbList(found).filter((m) => !/too short/.test(m))) {
          errors.push(e);
          console.log(`    ${_red('✗')} ${t}: ${e}`);
          total_fail += 1; route_fail += 1;
        }
      }
      entity_results.push({ type: t, present: true, errors });
    }

    const parse_issues = raw_blocks.flatMap((b) => b.validityIssues);
    if (parse_issues.length) {
      for (const issue of parse_issues) {
        console.log(`  ${_red('✗')} parse issue: ${issue}`);
        total_fail += 1; route_fail += 1;
      }
      checks.push({ name: 'JSON-LD parses clean', pass: false, detail: parse_issues.join('; ') });
    } else if (raw_blocks.length) {
      console.log(`  ${_green('✓')} JSON-LD parses clean`);
      total_pass += 1; route_pass += 1;
      checks.push({ name: 'JSON-LD parses clean', pass: true, detail: `${raw_blocks.length} block(s)` });
    }
  }

  if (SHOW_RAW) {
    console.log(`\n━━ Raw HTML (${url})\n`);
    console.log(fetched.html);
  }

  reportSections.push({
    url,
    route,
    status: fetched.status,
    html: fetched.html,
    checks,
    schemaTypes: types,
    entityResults: entity_results,
    parsed: raw_blocks.map((b) => b.parsed),
    routePass: route_pass,
    routeFail: route_fail,
  });
}

console.log('');
console.log(_bold('━━ Summary'));
console.log(`  ${_green(total_pass + ' pass')}, ${total_fail === 0 ? '0 fail' : _red(total_fail + ' fail')}`);

const md = [];
md.push('# SEO Audit Report');
md.push('');
md.push(`**Generated:** ${started}`);
md.push(`**Base:** \`${BASE}\``);
md.push(`**Summary:** ${total_pass} pass / ${total_fail} fail`);
md.push('');
md.push('## Table of contents');
md.push('');
for (const s of reportSections) {
  const anchor = s.url.replace(/[^a-z0-9]+/gi, '-').toLowerCase().replace(/^-|-$/g, '');
  md.push(`- [${s.url}](#${anchor})`);
}
md.push('');

for (const s of reportSections) {
  md.push('---');
  md.push('');
  md.push(`## ${s.url}`);
  md.push('');
  if (s.error) {
    md.push(`**Status:** FETCH ERROR`);
    md.push('');
    md.push('```');
    md.push(s.error);
    md.push('```');
    md.push('');
    continue;
  }
  md.push(`- **HTTP:** ${s.status}`);
  md.push(`- **Passed:** ${s.routePass}`);
  md.push(`- **Failed:** ${s.routeFail}`);
  md.push('');

  md.push('### Checks');
  md.push('');
  md.push('| Check | Status | Detail |');
  md.push('|---|---|---|');
  for (const c of s.checks) {
    const status = c.pass ? '✓' : '✗';
    const detail = String(c.detail).replace(/\|/g, '\\|');
    md.push(`| ${c.name} | ${status} | ${detail} |`);
  }
  md.push('');

  if (s.schemaTypes.length) {
    md.push('### Schema types detected in raw HTML');
    md.push('');
    md.push(s.schemaTypes.map((t) => `\`${t}\``).join(', '));
    md.push('');
  }

  if (s.entityResults.length) {
    md.push('### Entity validation');
    md.push('');
    md.push('| Entity | Present | Errors |');
    md.push('|---|---|---|');
    for (const r of s.entityResults) {
      const present = r.present ? '✓' : '✗';
      const errors = r.errors.length ? r.errors.join('; ') : '—';
      md.push(`| ${r.type} | ${present} | ${errors} |`);
    }
    md.push('');
  }

  if (s.parsed.length) {
    md.push('### Parsed JSON-LD');
    md.push('');
    md.push('```json');
    md.push(JSON.stringify(s.parsed.length === 1 ? s.parsed[0] : s.parsed, null, 2));
    md.push('```');
    md.push('');
  }

  md.push('### Raw HTML');
  md.push('');
  md.push('```html');
  md.push(s.html);
  md.push('```');
  md.push('');
}

mkdirSync(resolve(REPORT_PATH, '..'), { recursive: true });
writeFileSync(REPORT_PATH, md.join('\n'), 'utf8');
const rel = REPORT_PATH.replace(REPO_ROOT + '/', '');
console.log(`  ${_dim('report:')} ${rel}`);

process.exit(total_fail === 0 ? 0 : 1);
