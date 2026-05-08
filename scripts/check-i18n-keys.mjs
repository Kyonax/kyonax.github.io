#!/usr/bin/env node
/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Mozilla Public License 2.0 — see LICENSE.
 *
 * check-i18n-keys.mjs — verify every t('...') / $t('...') / <i18n-t keypath="...">
 * call in templates references a key that exists in messages.
 *
 * Run: node scripts/check-i18n-keys.mjs
 */

import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { REPO_ROOT, head, ok, fail, walk, read, rel, exitWith, c } from './_lib.mjs';

const SRC = join(REPO_ROOT, 'src');
if (!existsSync(SRC)) {
  ok('no src/ yet — pre-migration. Skipping.');
  process.exit(0);
}

// Prefer the alias-free source (src/data/snippets.js). src/i18n/messages.js
// re-exports it via @data/snippets, which Node can't resolve without Vite.
const CANDIDATES = ['src/data/snippets.js', 'src/i18n/messages.js'];
let messages = null;
for (const r of CANDIDATES) {
  const abs = join(REPO_ROOT, r);
  if (!existsSync(abs)) continue;
  try {
    const mod = await import(pathToFileURL(abs).href);
    messages = mod.default || mod.TRANSLATIONS || mod.messages;
    if (messages) break;
  } catch (e) {
    if (!e.message.includes('Cannot find package')) throw e;
    /* alias-using file — try next candidate */
  }
}
if (!messages) {
  ok('no messages source — skipping. (Run after Phase 3 setup.)');
  process.exit(0);
}

function flatten(obj, prefix = '') {
  const set = new Set();
  for (const [k, v] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      for (const x of flatten(v, path)) set.add(x);
    } else if (typeof v === 'string') set.add(path);
  }
  return set;
}

// Take the union across all locales — any locale providing the key is fine
// (vue-i18n falls back per fallbackLocale).
const allKeys = new Set();
for (const locale of Object.keys(messages)) {
  for (const k of flatten(messages[locale])) allKeys.add(k);
}

// Word-boundary anchored patterns. `t(` must be at a word start so we don't
// match `getAttribute(`, `setAttribute(`, `createElement(`, `import(`, etc.
const KEY_PATTERNS = [
  /(?<![A-Za-z0-9_$])\$?t\(\s*['"`]([^'"`]+)['"`]/g,        // t('...') / $t('...')
  /<i18n-t[^>]*\skeypath\s*=\s*['"]([^'"]+)['"]/g,           // <i18n-t keypath="...">
  /v-html\s*=\s*['"][^'"]*\bt\(\s*['"`]([^'"`]+)['"`]/g,    // v-html="t('...')"
];

// Skip src/i18n/ — i18n machinery, not consumers. Comment examples there
//   ("v-html=\"t('foo.bar')\"") would otherwise produce false positives.
const IGNORE_PREFIX = ['src/i18n/'];

const files = walk(SRC, { ext: ['.vue', '.js', '.mjs'] })
  .filter((f) => !IGNORE_PREFIX.some((p) => rel(f).startsWith(p)));
const failures = [];
let totalCalls = 0;

head(`check-i18n-keys — ${files.length} files scanned`);

for (const f of files) {
  const src = read(f);
  for (const pat of KEY_PATTERNS) {
    pat.lastIndex = 0;
    let m;
    while ((m = pat.exec(src)) !== null) {
      const key = m[1];
      totalCalls += 1;

      // Dynamic keys (template literals like `kyo-web.x.${code}`) — skip.
      // Consumers using dynamic keys must ensure their key SET is fully
      // covered by another mechanism (e.g. enumerating SUPPORTED_LANGUAGES
      // for trans-lang.* keys). Out of scope for this static check.
      if (key.includes('${')) continue;

      if (!allKeys.has(key)) {
        failures.push(`${rel(f)}: missing key ${c('yellow', key)}`);
      }
    }
  }
}

ok(`scanned ${totalCalls} t() / keypath references`);
if (failures.length) {
  console.log('');
  for (const f of failures) fail(f);
}
exitWith({ failures, name: 'check-i18n-keys' });
