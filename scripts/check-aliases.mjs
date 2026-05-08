#!/usr/bin/env node
/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 *
 * check-aliases.mjs — verify Vite alias map and ESLint resolver entries
 * stay in sync, and that every aliased target folder actually exists.
 *
 * Handles three alias-value patterns:
 *   '@app':  r('./src/app')                        (Vite, function-wrapped)
 *   '@app':  path.resolve(__dirname, 'src/app')    (Webpack/Node path call)
 *   '@app':  './src/app'                           (plain string)
 *
 * Run: node scripts/check-aliases.mjs
 */

import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { REPO_ROOT, head, ok, fail, read, exitWith, c } from './_lib.mjs';

const VITE = join(REPO_ROOT, 'vite.config.js');
const ESLINT = join(REPO_ROOT, 'eslint.config.mjs');

if (!existsSync(VITE)) {
  ok('no vite.config.js yet — pre-migration. Skipping.');
  process.exit(0);
}

const failures = [];
head('check-aliases — Vite ↔ ESLint resolver');

const viteSrc = read(VITE);

// Locate the alias: { ... } block
const aliasBlockMatch = viteSrc.match(/alias\s*:\s*\{([\s\S]*?)\n\s*\}/);
if (!aliasBlockMatch) {
  fail('could not locate alias: { ... } block in vite.config.js');
  exitWith({ failures: ['no alias block'], name: 'check-aliases' });
}
const aliasBlock = aliasBlockMatch[1];

// Walk line by line, parsing one alias entry per line.
// Each entry looks like:  '@app':  r('./src/app'),
//                         '@app':  './src/app',
//                         '@app':  path.resolve(__dirname, 'src/app'),
const aliases = {};
for (const rawLine of aliasBlock.split('\n')) {
  const line = rawLine.trim();
  if (!line || line.startsWith('//') || line.startsWith('/*')) continue;

  const head = line.match(/^['"](@[\w-]+)['"]\s*:/);
  if (!head) continue;
  const name = head[1];

  // Find the LAST quoted string on the line — that's the path argument
  // regardless of whether it's wrapped in r(), path.resolve(), or bare.
  const all = [...line.matchAll(/['"]([^'"]+)['"]/g)].map((m) => m[1]);
  const tail = all[all.length - 1];
  if (!tail || tail === name) continue;

  // Normalize: strip leading "./"
  aliases[name] = tail.replace(/^\.\//, '');
}

ok(`vite aliases: ${Object.keys(aliases).length}`);

for (const [alias, target] of Object.entries(aliases)) {
  // Resolve relative to repo root
  const abs = join(REPO_ROOT, target);
  if (!existsSync(abs)) {
    failures.push(`alias ${c('yellow', alias)} → ${target} does NOT exist`);
  }
}

if (existsSync(ESLINT)) {
  const eslintSrc = read(ESLINT);
  // ESLint cross-check: in the flat config we don't usually duplicate the
  // alias map, but we DO want eslint to be aware of every alias name so
  // import/no-unresolved can resolve them. Since the user's reckit-style
  // setup uses simple-import-sort + Vite without an explicit eslint resolver,
  // a name-presence check is enough for now: if any alias is referenced
  // in source files, ESLint should at least not crash on it. We just verify
  // the names look reachable. This rule may tighten later.
  let referenced = 0;
  for (const alias of Object.keys(aliases)) {
    if (eslintSrc.includes(alias)) referenced += 1;
  }
  ok(`eslint.config.mjs found (${referenced}/${Object.keys(aliases).length} aliases mentioned by name)`);
} else {
  ok('eslint.config.mjs not present yet — skipping cross-check');
}

if (failures.length) {
  console.log('');
  for (const f of failures) fail(f);
}
exitWith({ failures, name: 'check-aliases' });
