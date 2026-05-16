#!/usr/bin/env node
/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 *
 * nerd-glyphs.mjs — manage the SymbolsNerdFontMono subset sheet and
 * regenerate the WOFF2 in one command. The sheet
 * (scripts/_nerd-font-glyphs.txt) is the single source of truth for both
 * convert-fonts.sh (input to pyftsubset) and check-nerd-glyphs.mjs
 * (precheck gate against actual source usage).
 *
 * Usage:
 *   node scripts/nerd-glyphs.mjs list
 *   node scripts/nerd-glyphs.mjs add F0AC F1234 U+F2AB
 *   node scripts/nerd-glyphs.mjs remove F0AC
 *   node scripts/nerd-glyphs.mjs subset           # regenerate WOFF2 only
 *   node scripts/nerd-glyphs.mjs sync             # add/remove + subset + gate
 *   node scripts/nerd-glyphs.mjs check            # run gate against src/
 *
 * Codepoints accept any of: F005 | f005 | 0xF005 | U+F005 | 
 * The sheet is rewritten sorted ascending; each line is the hex with
 * no prefix. Comments and blank lines are preserved when present.
 *
 * The subset uses pyftsubset (install via: pipx install 'fonttools[woff]').
 */

import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { c, fail, head, ok, REPO_ROOT, warn } from './_lib.mjs';

const SHEET = join(REPO_ROOT, 'scripts/_nerd-font-glyphs.txt');
const CONVERT_SCRIPT = join(REPO_ROOT, 'scripts/convert-fonts.sh');
const CHECK_SCRIPT = join(REPO_ROOT, 'scripts/check-nerd-glyphs.mjs');
const WOFF2_OUT = join(
  REPO_ROOT,
  'src/fonts/SymbolsNerdFonts/SymbolsNerdFontMono-Regular.woff2',
);

const PUA = (cp) =>
  (cp >= 0xE000 && cp <= 0xF8FF) || (cp >= 0xF0000 && cp <= 0xFFFFD);

const HEX = /^(?:0x|U\+|\\u)?([0-9A-Fa-f]{4,6})$/;

const toHex = (cp) => cp.toString(16).toUpperCase().padStart(4, '0');

function parseCodepoint(raw) {
  const m = raw.trim().match(HEX);
  if (!m) {
    return { error: `not a valid hex codepoint: "${raw}"` };
  }
  const cp = Number.parseInt(m[1], 16);
  if (!PUA(cp)) {
    return { error: `codepoint U+${toHex(cp)} is outside the PUA range (U+E000–U+F8FF / U+F0000–U+FFFFD)` };
  }
  return { cp };
}

function readSheet() {
  if (!existsSync(SHEET)) {
    return { header: '', codepoints: new Set() };
  }
  const text = readFileSync(SHEET, 'utf8');
  const lines = text.split('\n');
  const header = [];
  const codepoints = new Set();
  let in_header = true;
  for (const line of lines) {
    const trimmed = line.trim();
    if (in_header && (trimmed === '' || trimmed.startsWith('#'))) {
      header.push(line);
      continue;
    }
    if (trimmed === '' || trimmed.startsWith('#')) {
      continue;
    }
    in_header = false;
    const r = parseCodepoint(trimmed);
    if (r.error) {
      fail(`sheet contains ${r.error}`);
      process.exit(1);
    }
    codepoints.add(r.cp);
  }
  return { header: header.join('\n').replace(/\n+$/, ''), codepoints };
}

function writeSheet({ header, codepoints }) {
  const sorted = [...codepoints].sort((a, b) => a - b);
  const body = sorted.map((cp) => toHex(cp)).join('\n');
  const out = header
    ? `${header}\n\n${body}\n`
    : `${body}\n`;
  writeFileSync(SHEET, out);
}

function printList(codepoints) {
  const sorted = [...codepoints].sort((a, b) => a - b);
  if (sorted.length === 0) {
    warn('sheet is empty');
    return;
  }
  for (const cp of sorted) {
    const glyph = String.fromCodePoint(cp);
    console.log(`  U+${toHex(cp)}   ${glyph}`);
  }
  ok(`${sorted.length} codepoint(s) in ${c('cyan', 'scripts/_nerd-font-glyphs.txt')}`);
}

function runSubset() {
  if (!existsSync(CONVERT_SCRIPT)) {
    fail(`missing ${c('cyan', 'scripts/convert-fonts.sh')}`);
    return 1;
  }
  const before = existsSync(WOFF2_OUT) ? statSync(WOFF2_OUT).size : null;
  head('subset — running pyftsubset via convert-fonts.sh');
  const r = spawnSync(
    CONVERT_SCRIPT,
    ['--subset', '--symbols-glyphs=scripts/_nerd-font-glyphs.txt', '--only=Symbols'],
    { stdio: 'inherit', cwd: REPO_ROOT },
  );
  if (r.status !== 0) {
    fail('pyftsubset exited non-zero');
    return r.status ?? 1;
  }
  const after = existsSync(WOFF2_OUT) ? statSync(WOFF2_OUT).size : null;
  if (before !== null && after !== null && before !== after) {
    ok(`WOFF2 size: ${before} B → ${after} B`);
  } else if (after !== null) {
    ok(`WOFF2 size: ${after} B`);
  }
  return 0;
}

function runCheck() {
  if (!existsSync(CHECK_SCRIPT)) {
    fail(`missing ${c('cyan', 'scripts/check-nerd-glyphs.mjs')}`);
    return 1;
  }
  const r = spawnSync('node', [CHECK_SCRIPT], { stdio: 'inherit' });
  return r.status ?? 1;
}

function cmdList() {
  const sheet = readSheet();
  head('nerd-glyphs — sheet contents');
  printList(sheet.codepoints);
}

function cmdAdd(args) {
  if (args.length === 0) {
    fail('add: expected one or more codepoints');
    process.exit(1);
  }
  const sheet = readSheet();
  const added = [];
  const skipped = [];
  for (const raw of args) {
    const r = parseCodepoint(raw);
    if (r.error) {
      fail(r.error);
      process.exit(1);
    }
    if (sheet.codepoints.has(r.cp)) {
      skipped.push(r.cp);
    } else {
      sheet.codepoints.add(r.cp);
      added.push(r.cp);
    }
  }
  writeSheet(sheet);
  head('nerd-glyphs — add');
  for (const cp of added) {
    ok(`added U+${toHex(cp)}  ${String.fromCodePoint(cp)}`);
  }
  for (const cp of skipped) {
    warn(`already present: U+${toHex(cp)}`);
  }
  console.log('');
  console.log(`  run ${c('cyan', 'node scripts/nerd-glyphs.mjs subset')} to regenerate the WOFF2`);
}

function cmdRemove(args) {
  if (args.length === 0) {
    fail('remove: expected one or more codepoints');
    process.exit(1);
  }
  const sheet = readSheet();
  const removed = [];
  const missing = [];
  for (const raw of args) {
    const r = parseCodepoint(raw);
    if (r.error) {
      fail(r.error);
      process.exit(1);
    }
    if (sheet.codepoints.delete(r.cp)) {
      removed.push(r.cp);
    } else {
      missing.push(r.cp);
    }
  }
  writeSheet(sheet);
  head('nerd-glyphs — remove');
  for (const cp of removed) {
    ok(`removed U+${toHex(cp)}`);
  }
  for (const cp of missing) {
    warn(`not in sheet: U+${toHex(cp)}`);
  }
  console.log('');
  console.log(`  run ${c('cyan', 'node scripts/nerd-glyphs.mjs subset')} to regenerate the WOFF2`);
}

function cmdSync(args) {
  // optional: add codepoints first, then subset + check
  if (args.length > 0) {
    cmdAdd(args);
  }
  const sub = runSubset();
  if (sub !== 0) {
    process.exit(sub);
  }
  const chk = runCheck();
  if (chk !== 0) {
    process.exit(chk);
  }
  ok('sync — done');
}

function help() {
  console.log(`
${c('bold', 'nerd-glyphs — SymbolsNerdFontMono subset manager')}

  ${c('cyan', 'list')}                    show every codepoint in the sheet
  ${c('cyan', 'add')}  <CP> [<CP> ...]    add codepoints to the sheet
  ${c('cyan', 'remove')} <CP> [<CP> ...]  remove codepoints from the sheet
  ${c('cyan', 'subset')}                  regenerate the WOFF2 from the sheet
  ${c('cyan', 'check')}                   run the precheck gate (sheet ↔ src/)
  ${c('cyan', 'sync')} [<CP> ...]         add (optional) + subset + check

Codepoint forms: F005, f005, 0xF005, U+F005, \\uF005

Sheet:   scripts/_nerd-font-glyphs.txt
Subset:  src/fonts/SymbolsNerdFonts/SymbolsNerdFontMono-Regular.woff2
Source:  src/fonts/SymbolsNerdFonts/SymbolsNerdFontMono-Regular.ttf

Reference: https://www.nerdfonts.com/cheat-sheet
`);
}

const [, , cmd, ...rest] = process.argv;
switch (cmd) {
  case 'list':
    cmdList();
    break;
  case 'add':
    cmdAdd(rest);
    break;
  case 'remove':
    cmdRemove(rest);
    break;
  case 'subset':
    process.exit(runSubset());
    break;
  case 'check':
    process.exit(runCheck());
    break;
  case 'sync':
    cmdSync(rest);
    break;
  case undefined:
  case '-h':
  case '--help':
  case 'help':
    help();
    break;
  default:
    fail(`unknown command: ${cmd}`);
    help();
    process.exit(1);
}
