#!/usr/bin/env node
/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 *
 * check-i18n.mjs — locale parity gate. Asserts every key in any locale
 * exists in every locale, and every RAW_HTML_KEYS allowlist entry resolves.
 */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import {
  REPO_ROOT, head, ok, fail, exitWith, c, walk,
  flattenI18nKeys, loadTranslations,
} from './_lib.mjs';

async function loadRawHtmlKeys() {
  const abs = join(REPO_ROOT, 'src/i18n/raw-html-keys.js');
  if (!existsSync(abs)) return null;
  const mod = await import(pathToFileURL(abs).href);
  const set = mod.RAW_HTML_KEYS || mod.default;
  return set instanceof Set ? set : new Set(set || []);
}

const failures = [];

head('check-i18n — locale parity + raw-html allowlist');

const loaded = await loadTranslations();
if (!loaded) {
  fail(`no translation source found in src/data/snippets.js or src/i18n/messages.js`);
  exitWith({ failures: ['no translation source'], name: 'check-i18n' });
}
ok(`source: ${loaded.file}`);

const locales = Object.keys(loaded.data);
ok(`locales: ${locales.join(', ')}`);

const keys = Object.fromEntries(locales.map((l) => [l, new Set(flattenI18nKeys(loaded.data[l]))]));
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

  /* Scan templates for `v-html="t('...')"` and `v-html="t(\`...\`)"` —
     every cited literal key must be in the allowlist. Skips computed
     paths like `v-html="t(\`...\${id}.description\`)"`. */
  const vhtml_re = /v-html\s*=\s*"\s*t\s*\(\s*['"`]([^'"`\${}]+)['"`]\s*\)\s*"/g;
  const sfc_files = walk(join(REPO_ROOT, 'src'), { ext: ['.vue'] });
  let vhtml_hits = 0;
  for (const file of sfc_files) {
    const text = readFileSync(file, 'utf8');
    for (const m of text.matchAll(vhtml_re)) {
      vhtml_hits += 1;
      if (!rawHtml.has(m[1])) {
        failures.push(`v-html uses unlisted key in ${file.replace(REPO_ROOT + '/', '')}: ${m[1]}`);
      }
    }
  }
  ok(`v-html literal keys scanned: ${vhtml_hits}`);
}

if (failures.length) {
  console.log('');
  for (const f of failures) fail(f);
}
exitWith({ failures, name: 'check-i18n' });
