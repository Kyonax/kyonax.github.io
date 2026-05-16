#!/usr/bin/env node
/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 *
 * Builds the @graph through vite-node so @-aliases resolve; spec-level
 * conformance is deferred to https://validator.schema.org.
 */

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';

import { REPO_ROOT, head, ok, fail, exitWith, c } from './_lib.mjs';

const SEO_INDEX = resolve(REPO_ROOT, 'src/seo/json-ld/index.js');
if (!existsSync(SEO_INDEX)) {
  ok('src/seo/json-ld/index.js not present yet — skipping check-json-ld');
  process.exit(0);
}

const VITE_NODE = resolve(REPO_ROOT, 'node_modules/.bin/vite-node');
if (!existsSync(VITE_NODE)) {
  fail('vite-node not installed (ships with vitest). Run `npm i`.');
  process.exit(1);
}

const REQUIRED = {
  WebSite:     ['name', 'url'],
  Person:      ['name'],
  ProfilePage: ['mainEntity'],
  FAQPage:     ['mainEntity', 'inLanguage', 'isPartOf'],
  VideoObject: ['name', 'thumbnailUrl', 'uploadDate'],
};

const SUPPORTED_LOCALES = ['en', 'es'];
const failures = [];

head('check-json-ld — validating @graph for each locale');

const TMP_DIR = resolve(REPO_ROOT, '.cache/json-ld-check');
mkdirSync(TMP_DIR, { recursive: true });

const _build = (locale) => {
  const entry = resolve(TMP_DIR, `entry-${locale}.mjs`);
  writeFileSync(entry, `
import { buildSiteJsonLd, buildFaqJsonLd } from '@seo/json-ld';
const out = {
  site: buildSiteJsonLd({ locale: ${JSON.stringify(locale)} }),
  faq:  buildFaqJsonLd(${JSON.stringify(locale)}),
};
process.stdout.write(JSON.stringify(out));
`);
  const r = spawnSync(VITE_NODE, [entry], { encoding: 'utf8', cwd: REPO_ROOT });
  try { rmSync(entry); } catch { /* noop */ }
  if (r.status !== 0) {
    return { error: r.stderr.trim() || 'vite-node failed', stdout: r.stdout };
  }
  try {
    const parsed = JSON.parse(r.stdout);
    return { graph: parsed.site, faq: parsed.faq };
  } catch (e) {
    return { error: `invalid JSON: ${e.message}`, stdout: r.stdout };
  }
};

for (const locale of SUPPORTED_LOCALES) {
  console.log(`\n──── locale :: ${c('cyan', locale)}`);
  const { graph, faq, error, stdout } = _build(locale);
  if (error) {
    failures.push(`builder failed for locale=${locale}: ${error}`);
    fail(`builder failed for ${locale} — see stderr above`);
    if (stdout) console.error('stdout:', stdout.slice(0, 500));
    continue;
  }

  const ids = new Set();
  for (const node of graph['@graph'] || []) {
    if (node['@id']) ids.add(node['@id']);
  }
  const _scan_refs = (node, path = '') => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) {
      node.forEach((v, i) => _scan_refs(v, `${path}[${i}]`));
      return;
    }
    for (const [k, v] of Object.entries(node)) {
      if (k === '@id' && path !== '' && typeof v === 'string') {
        if (!ids.has(v)) {
          failures.push(`locale=${locale}: dangling @id ref → ${v} at ${path}`);
        }
      }
      _scan_refs(v, `${path}.${k}`);
    }
  };
  for (const node of graph['@graph'] || []) {
    if (!node['@type']) continue;
    _scan_refs(node, node['@type']);
  }
  ok(`${locale}: ${ids.size} entities, refs resolved`);

  for (const node of graph['@graph'] || []) {
    const t = node['@type'];
    const required = REQUIRED[t];
    if (!required) continue;
    for (const field of required) {
      if (node[field] == null || node[field] === '') {
        failures.push(`locale=${locale}: ${t} ${node['@id'] || '<no @id>'} missing required field "${field}"`);
      }
    }
  }
  ok(`${locale}: required fields present`);

  const URL_FIELDS = ['url', 'image', 'logo', 'item', 'primaryImageOfPage'];
  const _scan_urls = (node) => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) { node.forEach(_scan_urls); return; }
    for (const [k, v] of Object.entries(node)) {
      if (URL_FIELDS.includes(k) && typeof v === 'string' && v && !v.startsWith('mailto:')) {
        if (!/^https:\/\//.test(v)) {
          failures.push(`locale=${locale}: ${k}="${v}" is not absolute HTTPS`);
        }
      }
      if (k === 'sameAs' && Array.isArray(v)) {
        v.forEach((u, i) => {
          if (typeof u === 'string' && !/^https:\/\//.test(u)) {
            failures.push(`locale=${locale}: sameAs[${i}]="${u}" is not absolute HTTPS`);
          }
        });
      }
      _scan_urls(v);
    }
  };
  graph['@graph']?.forEach(_scan_urls);
  ok(`${locale}: URLs are absolute HTTPS`);

  if (!faq || faq['@type'] !== 'FAQPage') {
    failures.push(`locale=${locale}: FAQPage payload missing or wrong @type`);
    fail(`${locale}: FAQPage builder did not return a FAQPage`);
    continue;
  }
  for (const field of REQUIRED.FAQPage) {
    if (faq[field] == null || (Array.isArray(faq[field]) && faq[field].length === 0)) {
      failures.push(`locale=${locale}: FAQPage missing required field "${field}"`);
    }
  }
  if (typeof faq['@id'] !== 'string' || !/^https:\/\//.test(faq['@id'])) {
    failures.push(`locale=${locale}: FAQPage @id="${faq['@id']}" is not absolute HTTPS`);
  }
  const items = Array.isArray(faq.mainEntity) ? faq.mainEntity : [];
  if (items.length < 1) {
    failures.push(`locale=${locale}: FAQPage.mainEntity is empty`);
  }
  items.forEach((q, i) => {
    if (q['@type'] !== 'Question') {
      failures.push(`locale=${locale}: FAQPage.mainEntity[${i}].@type != "Question"`);
    }
    if (typeof q.name !== 'string' || q.name.trim() === '') {
      failures.push(`locale=${locale}: FAQPage.mainEntity[${i}].name is empty`);
    }
    if (typeof q['@id'] !== 'string' || !/^https:\/\//.test(q['@id'])) {
      failures.push(`locale=${locale}: FAQPage.mainEntity[${i}].@id="${q['@id']}" is not absolute HTTPS`);
    }
    const ans = q.acceptedAnswer;
    if (!ans || ans['@type'] !== 'Answer' || typeof ans.text !== 'string' || ans.text.trim() === '') {
      failures.push(`locale=${locale}: FAQPage.mainEntity[${i}].acceptedAnswer.text is empty or wrong shape`);
    }
  });
  ok(`${locale}: FAQPage ${items.length} questions, fields valid`);
}

exitWith({ failures, name: 'check-json-ld' });
