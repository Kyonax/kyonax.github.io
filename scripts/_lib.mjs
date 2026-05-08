/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Mozilla Public License 2.0 — see LICENSE.
 *
 * Tiny shared helpers for migration scripts.
 * Pure Node built-ins, no deps. ESM only.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

export const REPO_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
export const OLD_REPO_ROOT = join(REPO_ROOT, '..', 'kyo-web-online-old');

const COLORS = {
  reset: '\x1b[0m', red: '\x1b[31m', green: '\x1b[32m',
  yellow: '\x1b[33m', cyan: '\x1b[36m', dim: '\x1b[2m', bold: '\x1b[1m',
};

const tty = () => process.stdout.isTTY && !process.env.NO_COLOR;
export const c = (color, s) => tty() ? `${COLORS[color]}${s}${COLORS.reset}` : s;
export const ok    = (msg) => console.log(`${c('green', '✓')} ${msg}`);
export const warn  = (msg) => console.warn(`${c('yellow', '!')} ${msg}`);
export const fail  = (msg) => console.error(`${c('red', '✘')} ${msg}`);
export const head  = (msg) => console.log(`\n${c('bold', msg)}`);
export const line  = (msg) => console.log(`  ${c('dim', msg)}`);

export function walk(dir, { ext = null, ignore = [] } = {}) {
  const out = [];
  const skip = new Set(['node_modules', '.git', 'dist', 'build', '.cache', ...ignore]);
  const _walk = (d) => {
    let entries;
    try { entries = readdirSync(d); } catch { return; }
    for (const name of entries) {
      if (skip.has(name)) continue;
      const p = join(d, name);
      const st = statSync(p);
      if (st.isDirectory()) _walk(p);
      else if (!ext || (Array.isArray(ext) ? ext.includes(extname(p)) : extname(p) === ext)) {
        out.push(p);
      }
    }
  };
  _walk(dir);
  return out;
}

export const read = (p) => readFileSync(p, 'utf8');
export const rel  = (p) => relative(REPO_ROOT, p);

export function exitWith({ failures, name }) {
  console.log('');
  if (failures.length === 0) {
    ok(`${name} — passed`);
    process.exit(0);
  }
  fail(`${name} — ${failures.length} issue(s)`);
  process.exit(1);
}

/**
 * Match the CCS license-header convention.
 * Either a /* ... *‍/ block in the first 6 lines containing "Copyright"
 * and "Mozilla Public License" or "MPL", or "@Kyonax".
 */
export function hasCcsHeader(content) {
  const head = content.split('\n').slice(0, 8).join('\n');
  return /Copyright/i.test(head) && /(Mozilla Public License|MPL|Apache|@Kyonax)/i.test(head);
}
