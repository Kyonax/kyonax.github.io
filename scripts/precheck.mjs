#!/usr/bin/env node
/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 *
 * precheck.mjs — composite gate. Runs every always-on check in sequence.
 *
 * Exit 0 → all checks passed.
 * Exit 1 → at least one failed.
 *
 * Run: node scripts/precheck.mjs
 *      node scripts/precheck.mjs --skip=color,licenses
 */

import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { c, head, ok, REPO_ROOT } from './_lib.mjs';

const skipFlag = process.argv.find((a) => a.startsWith('--skip='));
const skip = new Set(skipFlag ? skipFlag.split('=')[1].split(',') : []);

const CHECKS = [
  { id: 'i18n',          script: 'scripts/check-i18n.mjs',           label: 'locale parity' },
  { id: 'i18n-keys',     script: 'scripts/check-i18n-keys.mjs',       label: 'template t() keys' },
  { id: 'trans',         script: 'scripts/check-trans-attrs.mjs',     label: 'no [trans=] / banned refs' },
  { id: 'color',         script: 'scripts/check-color-usage.mjs',     label: 'color tokens / 60-30-10' },
  { id: 'aliases',       script: 'scripts/check-aliases.mjs',         label: 'vite ↔ eslint aliases' },
  { id: 'licenses',      script: 'scripts/check-license-headers.mjs', label: 'CCS license headers' },
  { id: 'json-ld',       script: 'scripts/check-json-ld.mjs',         label: 'JSON-LD @graph integrity' },
  { id: 'projects-media',script: 'scripts/check-projects-media.mjs',  label: 'PROJECTS[*].images integrity' },
  { id: 'nerd-glyphs',   script: 'scripts/check-nerd-glyphs.mjs',     label: 'Nerd Font subset list ↔ source' },
];

const results = [];
head('precheck — running all gates');
for (const ch of CHECKS) {
  if (skip.has(ch.id)) {
    ok(`SKIP  ${ch.id} (${ch.label})`);
    continue;
  }
  const abs = join(REPO_ROOT, ch.script);
  if (!existsSync(abs)) {
    ok(`SKIP  ${ch.id} — script not present yet`);
    continue;
  }
  console.log(`\n──── ${c('cyan', ch.id)} :: ${ch.label}`);
  const r = spawnSync('node', [abs], { stdio: 'inherit' });
  results.push({ id: ch.id, code: r.status });
}

console.log('');
head('precheck — summary');
let allPass = true;
for (const r of results) {
  const tag = r.code === 0 ? c('green', 'PASS') : c('red', 'FAIL');
  console.log(`  ${tag}  ${r.id}`);
  if (r.code !== 0) {
    allPass = false;
  }
}
process.exit(allPass ? 0 : 1);
