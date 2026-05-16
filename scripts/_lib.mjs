/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 *
 * Tiny shared helpers for migration scripts.
 * Pure Node built-ins, no deps. ESM only.
 */

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, extname, join, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const REPO_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));

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

/** Test if file content carries the CCS license header in the first 8 lines. */
export function hasCcsHeader(content) {
  const head = content.split('\n').slice(0, 8).join('\n');
  return /Copyright/i.test(head) && /(Mozilla Public License|MPL|Apache|@Kyonax)/i.test(head);
}

/** Walk a nested locale tree; returns every leaf as a dot-path string. */
export function flattenI18nKeys(obj, prefix = '') {
  const out = [];
  for (const [k, v] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) out.push(...flattenI18nKeys(v, path));
    else if (typeof v === 'string') out.push(path);
  }
  return out;
}

/**
 * Load the TRANSLATIONS map from the first existing candidate.
 * Defaults prefer the alias-free source so Node can resolve without Vite.
 * @returns {Promise<{data: object, file: string} | null>}
 */
export async function loadTranslations(candidates = ['src/data/snippets.js', 'src/i18n/messages.js']) {
  for (const rel_path of candidates) {
    const abs = join(REPO_ROOT, rel_path);
    if (!existsSync(abs)) continue;
    try {
      const mod = await import(pathToFileURL(abs).href);
      let data = mod.TRANSLATIONS || mod.default || mod.messages;
      if (data && typeof data === 'object' && data.TRANSLATIONS) data = data.TRANSLATIONS;
      if (data && typeof data === 'object') return { data, file: rel_path };
    } catch (e) {
      if (!e.message.includes('Cannot find package')) throw e;
    }
  }
  return null;
}

/** ISO `YYYY-MM-DD` for the current UTC moment. */
export const today = () => new Date().toISOString().slice(0, 10);

/** True when `dst_path` is missing, older than `src_path`, or `force` is set. */
export function isOutdated(src_path, dst_path, { force = false } = {}) {
  if (force) return true;
  if (!existsSync(dst_path)) return true;
  const src_mtime = statSync(src_path).mtimeMs;
  const dst_mtime = statSync(dst_path).mtimeMs;
  return src_mtime > dst_mtime;
}
