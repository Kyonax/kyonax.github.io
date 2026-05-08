#!/usr/bin/env node
/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Mozilla Public License 2.0 — see LICENSE.
 *
 * check-license-headers.mjs — assert every committed .js / .mjs / .vue
 * file under src/ and scripts/ carries the CCS license preamble.
 *
 * Run: node scripts/check-license-headers.mjs
 */

import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { REPO_ROOT, head, ok, fail, walk, read, rel, exitWith, hasCcsHeader } from './_lib.mjs';

const ROOTS = ['src', 'scripts'].map((r) => join(REPO_ROOT, r)).filter(existsSync);
if (ROOTS.length === 0) {
  ok('no src/ or scripts/ yet. Skipping.');
  process.exit(0);
}

const files = ROOTS.flatMap((r) => walk(r, { ext: ['.js', '.mjs', '.vue'] }));

const failures = [];

head(`check-license-headers — ${files.length} files`);

for (const f of files) {
  const src = read(f);
  if (!hasCcsHeader(src)) {
    failures.push(`${rel(f)}: missing CCS license header`);
  }
}

if (failures.length) {
  console.log('');
  for (const f of failures) fail(f);
}
exitWith({ failures, name: 'check-license-headers' });
