#!/usr/bin/env node
/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Mozilla Public License 2.0 — see LICENSE.
 *
 * check-i18n.mjs — locale parity gate.
 *
 * Loads src/i18n/messages.js (or src/data/snippets.js — either ESM)
 * and asserts every key in any locale exists in every locale.
 * Also asserts every RAW_HTML_KEYS allowlist entry exists.
 *
 * Run: node scripts/check-i18n.mjs
 * CI:  add as `prebuild` in package.json
 */

import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { REPO_ROOT, head, ok, fail, exitWith, c } from './_lib.mjs';

/* Prefer the alias-free source. messages.js re-exports via @data/snippets,
   which Node can't resolve without Vite. */
const CANDIDATES = [
  'src/data/snippets.js',
  'src/i18n/messages.js',
  'src/app/constants/Snippets.js',
];

async function loadTranslations() {
  for (const rel of CANDIDATES) {
    const abs = join(REPO_ROOT, rel);
    if (!existsSync(abs)) continue;
    try {
      let data;
      // Legacy file is CommonJS; ESM `import()` would fail. createRequire
      // works for both.
      if (rel.endsWith('Snippets.js') || rel.endsWith('snippets.js')) {
        const { createRequire } = await import('node:module');
        const require = createRequire(import.meta.url);
        try { delete require.cache[require.resolve(abs)]; } catch {}
        const mod = require(abs);
        data = mod.default || mod.TRANSLATIONS || mod.messages || mod;
      } else {
        const mod = await import(pathToFileURL(abs).href);
        data = mod.default || mod.TRANSLATIONS || mod.messages;
      }
      // Unwrap if the loaded object is { TRANSLATIONS: { en: ..., es: ... } }
      if (data && typeof data === 'object' && data.TRANSLATIONS) data = data.TRANSLATIONS;
      if (data && typeof data === 'object') return { data, file: rel };
    } catch (e) {
      fail(`failed to import ${rel}: ${e.message}`);
    }
  }
  return null;
}

async function loadRawHtmlKeys() {
  const abs = join(REPO_ROOT, 'src/i18n/raw-html-keys.js');
  if (!existsSync(abs)) return null;
  const mod = await import(pathToFileURL(abs).href);
  const set = mod.RAW_HTML_KEYS || mod.default;
  return set instanceof Set ? set : new Set(set || []);
}

function flatten(obj, prefix = '') {
  const out = [];
  for (const [k, v] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) out.push(...flatten(v, path));
    else if (typeof v === 'string') out.push(path);
  }
  return out;
}

const failures = [];

head('check-i18n — locale parity + raw-html allowlist');

const loaded = await loadTranslations();
if (!loaded) {
  fail(`no translation source found. Tried: ${CANDIDATES.join(', ')}`);
  exitWith({ failures: ['no translation source'], name: 'check-i18n' });
}
ok(`source: ${loaded.file}`);

const locales = Object.keys(loaded.data);
ok(`locales: ${locales.join(', ')}`);

const keys = Object.fromEntries(locales.map((l) => [l, new Set(flatten(loaded.data[l]))]));
const all = new Set(Object.values(keys).flatMap((s) => [...s]));
ok(`total unique keys across locales: ${all.size}`);

for (const key of all) {
  for (const l of locales) {
    if (!keys[l].has(key)) {
      failures.push(`missing in ${c('yellow', l)}: ${key}`);
    }
  }
}

const rawHtml = await loadRawHtmlKeys();
if (rawHtml) {
  ok(`RAW_HTML_KEYS allowlist size: ${rawHtml.size}`);
  for (const key of rawHtml) {
    if (!all.has(key)) {
      failures.push(`RAW_HTML_KEYS contains a missing key: ${key}`);
    }
  }
}

if (failures.length) {
  console.log('');
  for (const f of failures) fail(f);
}
exitWith({ failures, name: 'check-i18n' });
