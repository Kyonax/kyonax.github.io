#!/usr/bin/env node
/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 *
 * check-trans-attrs.mjs — asserts the vue-i18n migration stayed complete.
 * Fails if `[trans=` attributes, `kyo:language-changed` listeners, or any
 * reference to the deleted `class-scheduler` worker/component reappear.
 *
 * Run: node scripts/check-trans-attrs.mjs
 */

import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { c,exitWith, fail, head, ok, read, rel, REPO_ROOT, walk } from './_lib.mjs';

const SRC = join(REPO_ROOT, 'src');
if (!existsSync(SRC)) {
  ok('no src/ yet — pre-migration. Skipping.');
  process.exit(0);
}

const BANNED = [
  { pattern: /\btrans\s*=\s*"[^"]+"/g, label: '[trans=] attribute', remedy: 'replace with {{ t("...") }} or <i18n-t> per TRANSLATION_MIGRATION.md §3.4' },
  { pattern: /kyo:language-changed/g,  label: 'kyo:language-changed event', remedy: 'remove — vue-i18n locale ref is reactive (B6 from TRANSLATION_MIGRATION.md)' },
  { pattern: /class-scheduler/g,        label: 'class-scheduler reference', remedy: 'worker deleted — use CSS animation-delay (PERFORMANCE_MIGRATION.md §2.1)' },
  { pattern: /TranslationWebpackPlugin/g, label: 'TranslationWebpackPlugin reference', remedy: 'plugin deleted — vue-i18n replaces it' },
  { pattern: /import\s+\{\s*TRANSLATIONS\s*\}\s+from\s+['"]@?[^'"]*Snippets['"]/g, label: 'direct TRANSLATIONS import', remedy: 'use useI18n().t() — never bypass vue-i18n' },
];

const files = walk(SRC, { ext: ['.vue', '.js', '.mjs', '.html', '.scss'] });
const failures = [];
let scanned = 0;

head(`check-trans-attrs — ${files.length} files`);

// Heuristic: skip lines that look like comments. Banned patterns referenced
// in commentary ("the legacy class-scheduler wrappers...") are explanatory,
// not actual usages. Catches JSDoc continuation (`*`), line comments (`//`),
// HTML comments (`<!--`), and block-comment openers (`/`+`*`).
const _is_comment_line = (line) => {
  const t = line.trim();
  if (!t) {
    return false;
  }
  return (
    t.startsWith('*') ||
    t.startsWith('//') ||
    t.startsWith('/*') ||
    t.startsWith('<!--')
  );
};

for (const f of files) {
  const src = read(f);
  const lines = src.split('\n');
  scanned += 1;
  for (const { pattern, label, remedy } of BANNED) {
    pattern.lastIndex = 0;
    let m;
    while ((m = pattern.exec(src)) !== null) {
      const lineNum = src.slice(0, m.index).split('\n').length;
      const line = lines[lineNum - 1] || '';
      if (_is_comment_line(line)) {
        continue;
      }
      failures.push(`${rel(f)}:${lineNum}: ${c('yellow', label)} → ${remedy}`);
    }
  }
}

ok(`scanned ${scanned} files`);
if (failures.length) {
  console.log('');
  for (const f of failures) {
    fail(f);
  }
}
exitWith({ failures, name: 'check-trans-attrs' });
