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
  c, exitWith, fail,   flattenI18nKeys, head, loadTranslations,
  ok,   REPO_ROOT, walk,
} from './_lib.mjs';

async function loadRawHtmlKeys() {
  const abs = join(REPO_ROOT, 'src/i18n/raw-html-keys.js');
  if (!existsSync(abs)) {
    return null;
  }
  const mod = await import(pathToFileURL(abs).href);
  const set = mod.RAW_HTML_KEYS || mod.default;
  return set instanceof Set ? set : new Set(set || []);
}

const failures = [];

head('check-i18n — locale parity + raw-html allowlist');

const loaded = await loadTranslations();
if (!loaded) {
  fail('no translation source found in src/data/snippets.js or src/i18n/messages.js');
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

/*
 * ARRAY PARITY. flattenI18nKeys() walks objects but STOPS at arrays, so every
 * string held in one — the privacy policy's sections, the CV's contact row,
 * education rows and per-entry orgs — is invisible to the parity check above.
 * A locale missing a whole policy section, or an org row missing its href,
 * would pass every gate and ship. Arrays are positional, so parity here means
 * the same LENGTH and the same per-index KEY SHAPE in every locale.
 */
function collectArrays(obj, prefix = '', out = new Map()) {
  for (const [k, v] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (Array.isArray(v)) {
      out.set(path, v.map((row) => (row && typeof row === 'object'
        ? Object.keys(row).sort().join('|')
        : typeof row)));
    } else if (v && typeof v === 'object') {
      collectArrays(v, path, out);
    }
  }
  return out;
}

const arrays = Object.fromEntries(locales.map((l) => [l, collectArrays(loaded.data[l])]));
const base_locale = locales[0];
let array_count = 0;
for (const [path, shape] of arrays[base_locale]) {
  array_count += 1;
  for (const l of locales.slice(1)) {
    const other = arrays[l].get(path);
    if (!other) {
      failures.push(`array missing in ${c('yellow', l)}: ${path}`);
    } else if (other.length !== shape.length) {
      failures.push(
        `array length differs at ${path}: `
        + `${base_locale}=${shape.length} vs ${l}=${other.length}`,
      );
    } else {
      shape.forEach((row, i) => {
        if (other[i] !== row) {
          failures.push(
            `array shape differs at ${path}[${i}]: `
            + `${base_locale}={${row}} vs ${l}={${other[i]}}`,
          );
        }
      });
    }
  }
}
ok(`i18n arrays checked for length + shape parity: ${array_count}`);

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
  const vhtml_re = /v-html\s*=\s*"\s*t\s*\(\s*['"`]([^'"`${}]+)['"`]\s*\)\s*"/g;
  const sfc_files = walk(join(REPO_ROOT, 'src'), { ext: ['.vue'] });
  let vhtml_hits = 0;
  for (const file of sfc_files) {
    const text = readFileSync(file, 'utf8');
    for (const m of text.matchAll(vhtml_re)) {
      vhtml_hits += 1;
      if (!rawHtml.has(m[1])) {
        failures.push(`v-html uses unlisted key in ${file.replace(`${REPO_ROOT  }/`, '')}: ${m[1]}`);
      }
    }
  }
  ok(`v-html literal keys scanned: ${vhtml_hits}`);

  /* DYNAMIC v-html keys. These used to be skipped outright, which is exactly how
     `...experience.${entry.id}.bullets` shipped: `bullets` exists in no locale, so
     t() returned the key PATH and rendered it as visible text into the crawlable
     HTML of both landing pages. A dynamic key cannot be resolved exactly without
     evaluating the component, but its STATIC SUFFIX can: walk every branch under
     the static prefix and require at least one to carry that leaf. */
  const dyn_re = /v-html\s*=\s*"\s*t\s*\(\s*`([^`]*\$\{[^`]*)`\s*\)\s*"/g;
  let dyn_hits = 0;
  for (const file of sfc_files) {
    const text = readFileSync(file, 'utf8');
    for (const m of text.matchAll(dyn_re)) {
      const raw = m[1];
      const prefix = raw.slice(0, raw.indexOf('${')).replace(/\.$/, '');
      const suffix = raw.slice(raw.lastIndexOf('}') + 1).replace(/^\./, '');
      if (!prefix || !suffix) {
        continue;
      }
      dyn_hits += 1;
      const candidates = [...all].filter((k) => k.startsWith(`${prefix}.`) && k.endsWith(`.${suffix}`));
      if (candidates.length === 0) {
        failures.push(
          `v-html dynamic key resolves to NOTHING in ${file.replace(`${REPO_ROOT  }/`, '')}: `
          + `${prefix}.*.${suffix} matches no key in any locale`,
        );
      }
    }
  }
  ok(`v-html dynamic keys resolved: ${dyn_hits}`);
}

if (failures.length) {
  console.log('');
  for (const f of failures) {
    fail(f);
  }
}
exitWith({ failures, name: 'check-i18n' });
