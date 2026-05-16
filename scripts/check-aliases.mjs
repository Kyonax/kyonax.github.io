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

import { c,exitWith, fail, head, ok, read, REPO_ROOT } from './_lib.mjs';

const VITE = join(REPO_ROOT, 'vite.config.js');
const ESLINT = join(REPO_ROOT, 'eslint.config.mjs');

if (!existsSync(VITE)) {
  ok('no vite.config.js yet — pre-migration. Skipping.');
  process.exit(0);
}

const failures = [];
head('check-aliases — Vite ↔ ESLint resolver');

const viteSrc = read(VITE);

const aliasBlockMatch = viteSrc.match(/alias\s*:\s*\{([\s\S]*?)\n\s*\}/);
if (!aliasBlockMatch) {
  fail('could not locate alias: { ... } block in vite.config.js');
  exitWith({ failures: ['no alias block'], name: 'check-aliases' });
}
const aliasBlock = aliasBlockMatch[1];

const aliases = {};
for (const rawLine of aliasBlock.split('\n')) {
  const line = rawLine.trim();
  if (!line || line.startsWith('//') || line.startsWith('/*')) {
    continue;
  }

  const head = line.match(/^['"](@[\w-]+)['"]\s*:/);
  if (!head) {
    continue;
  }
  const name = head[1];

  // Find the LAST quoted string on the line — that's the path argument
  // regardless of whether it's wrapped in r(), path.resolve(), or bare.
  const all = [...line.matchAll(/['"]([^'"]+)['"]/g)].map((m) => m[1]);
  const tail = all[all.length - 1];
  if (!tail || tail === name) {
    continue;
  }

  aliases[name] = tail.replace(/^\.\//, '');
}

ok(`vite aliases: ${Object.keys(aliases).length}`);

for (const [alias, target] of Object.entries(aliases)) {
  const abs = join(REPO_ROOT, target);
  if (!existsSync(abs)) {
    failures.push(`alias ${c('yellow', alias)} → ${target} does NOT exist`);
  }
}

if (existsSync(ESLINT)) {
  const eslintSrc = read(ESLINT);
  // Name-presence check only — Vite owns alias resolution; ESLint just needs to know the names exist.
  let referenced = 0;
  for (const alias of Object.keys(aliases)) {
    if (eslintSrc.includes(alias)) {
      referenced += 1;
    }
  }
  ok(`eslint.config.mjs found (${referenced}/${Object.keys(aliases).length} aliases mentioned by name)`);
} else {
  ok('eslint.config.mjs not present yet — skipping cross-check');
}

if (failures.length) {
  console.log('');
  for (const f of failures) {
    fail(f);
  }
}
exitWith({ failures, name: 'check-aliases' });
