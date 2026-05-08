#!/usr/bin/env node
/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Mozilla Public License 2.0 — see LICENSE.
 *
 * check-color-usage.mjs — per-SFC 60/30/10 color-tier audit.
 *
 * Tiers (SASS_THEMING_MIGRATION.md §3.4):
 *   neutral  ~60%  --clr-neutral-*
 *   primary  ~30%  --clr-primary-*
 *   accent   ~10%  --clr-{success|warning|error|secondary}-*
 *   border   excl  --clr-border-*  (constant overlay, not in split)
 *
 * Counts var(--clr-...) references inside <style> blocks of every .vue file.
 * Flags SFCs where:
 *   - primary > MAX_PRIMARY_PCT
 *   - accent  > MAX_ACCENT_PCT
 * Reports neutral/primary/accent share per file.
 *
 * Run: node scripts/check-color-usage.mjs [--strict]
 */

import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { REPO_ROOT, head, ok, warn, fail, walk, read, rel, exitWith, c } from './_lib.mjs';

const STRICT = process.argv.includes('--strict');
const MAX_PRIMARY_PCT = 0.50;
const MAX_ACCENT_PCT = 0.20;

const SRC = join(REPO_ROOT, 'src');
if (!existsSync(SRC)) {
  ok('no src/ yet — pre-migration. Skipping.');
  process.exit(0);
}

const TIER_PATTERNS = {
  neutral: /var\(\s*--clr-neutral-\d+/g,
  primary: /var\(\s*--clr-primary-\d+/g,
  border:  /var\(\s*--clr-border-\d+/g,
  accent:  /var\(\s*--clr-(success|warning|error|secondary)-\d+/g,
};

const HARDCODED = /(?<!\/\/[^\n]*)(#[0-9a-fA-F]{3}\b|#[0-9a-fA-F]{6}\b|hsla?\(|rgba?\()/g;

const files = walk(SRC, { ext: '.vue' });
const failures = [];
const summary = [];

head(`check-color-usage — ${files.length} SFCs`);

for (const f of files) {
  const src = read(f);
  const styleBlocks = [...src.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(m => m[1]).join('\n');
  if (!styleBlocks.trim()) continue;

  const counts = { neutral: 0, primary: 0, border: 0, accent: 0 };
  for (const [tier, pat] of Object.entries(TIER_PATTERNS)) {
    pat.lastIndex = 0;
    counts[tier] = (styleBlocks.match(pat) || []).length;
  }
  const total = counts.neutral + counts.primary + counts.accent;
  const primaryPct = total ? counts.primary / total : 0;
  const accentPct  = total ? counts.accent  / total : 0;
  const neutralPct = total ? counts.neutral / total : 0;

  // Hardcoded literals
  const literals = [...styleBlocks.matchAll(HARDCODED)].length;
  if (literals > 0) {
    failures.push(`${rel(f)}: ${c('yellow', `${literals} hardcoded color literal(s)`)} — use var(--clr-*) tokens`);
  }

  summary.push({
    file: rel(f), counts, total, primaryPct, accentPct, neutralPct, literals,
  });

  if (total === 0) continue; // no tokens used yet

  if (primaryPct > MAX_PRIMARY_PCT) {
    failures.push(
      `${rel(f)}: primary share ${(primaryPct*100).toFixed(0)}% > ${MAX_PRIMARY_PCT*100}% ` +
      `(neutral=${counts.neutral} primary=${counts.primary} accent=${counts.accent})`,
    );
  }
  if (accentPct > MAX_ACCENT_PCT) {
    failures.push(
      `${rel(f)}: accent share ${(accentPct*100).toFixed(0)}% > ${MAX_ACCENT_PCT*100}% ` +
      `(neutral=${counts.neutral} primary=${counts.primary} accent=${counts.accent})`,
    );
  }
}

console.log('');
console.log(c('bold', '  Per-SFC distribution (excluding borders):'));
console.log(c('dim', '  file                                          neutral primary accent  literals'));
for (const s of summary) {
  if (s.total === 0 && s.literals === 0) continue;
  const n = `${(s.neutralPct*100).toFixed(0)}%`.padStart(7);
  const p = `${(s.primaryPct*100).toFixed(0)}%`.padStart(7);
  const a = `${(s.accentPct *100).toFixed(0)}%`.padStart(6);
  const lit = String(s.literals).padStart(8);
  console.log(`  ${s.file.padEnd(45)} ${n} ${p} ${a} ${lit}`);
}
console.log('');

if (!STRICT && failures.length === 0) ok('all SFCs within distribution thresholds');
if (STRICT) {
  exitWith({ failures, name: 'check-color-usage --strict' });
} else {
  // non-strict: warn only on distribution; literals always fail
  const literalFailures = failures.filter(f => /hardcoded color literal/.test(f));
  for (const f of failures) (literalFailures.includes(f) ? fail : warn)(f);
  exitWith({ failures: literalFailures, name: 'check-color-usage' });
}
