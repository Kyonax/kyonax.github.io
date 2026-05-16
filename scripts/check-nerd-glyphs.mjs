#!/usr/bin/env node
/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 *
 * check-nerd-glyphs.mjs — Nerd Font subset gate.
 *
 * Compares the PUA codepoints actually used in src/ (Vue / JS / SCSS)
 * against scripts/_nerd-font-glyphs.txt — the source of truth for the
 * SymbolsNerdFontMono.woff2 subset emitted by convert-fonts.sh.
 *
 *   Used but not in list → FAIL  (would render as tofu in production)
 *   In list but not used → WARN  (keeps the subset lean; non-fatal)
 *
 * Run:  node scripts/check-nerd-glyphs.mjs
 */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { c, exitWith, fail, head, ok, read, REPO_ROOT, warn, walk } from './_lib.mjs';

const GLYPH_FILE = join(REPO_ROOT, 'scripts/_nerd-font-glyphs.txt');
const SRC_DIR    = join(REPO_ROOT, 'src');
const EXTS       = ['.vue', '.js', '.mjs', '.scss', '.ts'];

const inPua = (cp) =>
  (cp >= 0xE000 && cp <= 0xF8FF) || (cp >= 0xF0000 && cp <= 0xFFFFD);

const toHex = (cp) => cp.toString(16).toUpperCase().padStart(4, '0');

head('check-nerd-glyphs — validating source ↔ subset list');

if (!existsSync(GLYPH_FILE)) {
  fail(`missing ${c('cyan', 'scripts/_nerd-font-glyphs.txt')}`);
  process.exit(1);
}

const allowed = new Set();
for (const line of readFileSync(GLYPH_FILE, 'utf8').split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) {
    continue;
  }
  const cp = Number.parseInt(trimmed, 16);
  if (!Number.isFinite(cp) || !inPua(cp)) {
    fail(`invalid codepoint in glyph list: ${trimmed}`);
    process.exit(1);
  }
  allowed.add(cp);
}

ok(`loaded ${allowed.size} codepoint(s) from subset list`);

const ESCAPE_RE = /\\u([Ee][0-9A-Fa-f]{3}|[Ff][0-9A-Fa-f]{3})/g;
const used = new Map(); // codepoint → Set<file>

for (const file of walk(SRC_DIR, { ext: EXTS })) {
  const text = read(file);
  // 1) \uXXXX escape form
  for (const m of text.matchAll(ESCAPE_RE)) {
    const cp = Number.parseInt(m[1], 16);
    if (!inPua(cp)) {
      continue;
    }
    if (!used.has(cp)) {
      used.set(cp, new Set());
    }
    used.get(cp).add(file);
  }
  // 2) raw PUA characters
  for (const ch of text) {
    const cp = ch.codePointAt(0);
    if (inPua(cp)) {
      if (!used.has(cp)) {
        used.set(cp, new Set());
      }
      used.get(cp).add(file);
    }
  }
}

ok(`scanned ${used.size} codepoint(s) across src/`);

const failures = [];

// Pass 1: used but not in subset → tofu in production. Hard fail.
for (const [cp, files] of [...used.entries()].sort(([a], [b]) => a - b)) {
  if (!allowed.has(cp)) {
    fail(`U+${toHex(cp)} used in source but NOT in subset list — would render tofu`);
    for (const f of files) {
      console.log(`    ${c('dim', f.replace(`${REPO_ROOT}/`, ''))}`);
    }
    failures.push(`U+${toHex(cp)}`);
  }
}

// Pass 2: in subset but not used → bytes wasted. Warning only.
const unused_in_list = [...allowed].filter((cp) => !used.has(cp));
if (unused_in_list.length > 0) {
  warn(`${unused_in_list.length} codepoint(s) in subset list but unused in src/:`);
  for (const cp of unused_in_list.sort((a, b) => a - b)) {
    console.log(`    U+${toHex(cp)}`);
  }
  console.log(`  ${c('dim', 'remove from scripts/_nerd-font-glyphs.txt and re-run npm run convert:fonts:symbols')}`);
}

exitWith({ failures, name: 'check-nerd-glyphs' });
