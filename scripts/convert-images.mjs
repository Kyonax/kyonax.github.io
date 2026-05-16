#!/usr/bin/env node
/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 */

import { existsSync, statSync } from 'node:fs';
import { cpus } from 'node:os';
import { join } from 'node:path';

import sharp from 'sharp';

import { c, fail, head, isOutdated,ok, rel, REPO_ROOT, walk } from './_lib.mjs';

const SRC_DIRS = [
  join(REPO_ROOT, 'src/assets/app'),
  join(REPO_ROOT, 'src/assets/projects'),
];
const SOURCE_EXTS = ['.jpg', '.jpeg', '.png'];
const WEBP_QUALITY = 90;
const AVIF_QUALITY = 75;

const args = process.argv.slice(2);
const FORCE = args.includes('--force');
const QUIET = args.includes('--quiet');

const _is_outdated = (output_path, source_path) =>
  isOutdated(source_path, output_path, { force: FORCE });

const _bytes = (n) => {
  if (n >= 1024 * 1024) {
    return `${(n / 1024 / 1024).toFixed(1)}MB`;
  }
  if (n >= 1024) {
    return `${(n / 1024).toFixed(0)}KB`;
  }
  return `${n}B`;
};

const _convert = async (source_path, target_ext, encoder) => {
  const target_path = source_path.replace(/\.[^.]+$/, target_ext);
  if (!_is_outdated(target_path, source_path)) {
    if (!QUIET) {
      console.log(`  ${c('dim', '·')} ${rel(source_path)} → ${target_ext} (up to date)`);
    }
    return { skipped: true };
  }
  const before = statSync(source_path).size;
  await encoder(sharp(source_path)).toFile(target_path);
  const after = statSync(target_path).size;
  const pct = Math.round((1 - after / before) * 100);
  if (!QUIET) {
    console.log(
      `  ${c('green', '✓')} ${rel(source_path)} → ${target_ext}  ` +
      `${_bytes(before)} → ${c('cyan', _bytes(after))}  (${c('yellow', `-${  pct  }%`)})`,
    );
  }
  return { source_size: before, target_size: after };
};

head('convert-images — sharp-based transcoder');

const sources = SRC_DIRS
  .filter((dir) => {
    if (existsSync(dir)) {
      return true;
    }
    if (!QUIET) {
      console.log(`  ${c('dim', '·')} skip ${rel(dir)} (not present)`);
    }
    return false;
  })
  .flatMap((dir) => walk(dir, { ext: SOURCE_EXTS }));

ok(`found ${sources.length} source raster${sources.length === 1 ? '' : 's'} across ${SRC_DIRS.length} dir(s)`);

const CONCURRENCY = Math.max(1, cpus().length);

const _run_pool = async (tasks, limit) => {
  const results = new Array(tasks.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, tasks.length) }, async () => {
    while (true) {
      const i = next++;
      if (i >= tasks.length) {
        return;
      }
      try {
        results[i] = await tasks[i]();
      } catch (err) {
        results[i] = { error: err };
        fail(`task ${i} failed: ${err.message}`);
      }
    }
  });
  await Promise.all(workers);
  return results;
};

let total_before = 0;
for (const src of sources) {
  total_before += statSync(src).size;
}

const jobs = sources.flatMap((src) => [
  { kind: 'webp', task: () => _convert(src, '.webp', (img) =>
    img.webp({ quality: WEBP_QUALITY, effort: 4 })) },
  { kind: 'avif', task: () => _convert(src, '.avif', (img) =>
    img.avif({ quality: AVIF_QUALITY, effort: 4 })) },
]);

const results = await _run_pool(jobs.map((j) => j.task), CONCURRENCY);

let total_webp = 0;
let total_avif = 0;
let webp_processed = 0;
let avif_processed = 0;
for (let i = 0; i < results.length; i += 1) {
  const r = results[i];
  if (!r || r.skipped || r.error) {
    continue;
  }
  if (jobs[i].kind === 'webp') {
    total_webp += r.target_size; webp_processed += 1; 
  } else                         {
    total_avif += r.target_size; avif_processed += 1; 
  }
}

console.log('');
ok(
  `webp: ${webp_processed} encoded${ 
    total_webp ? `  (total ${_bytes(total_webp)})` : ''}`,
);
ok(
  `avif: ${avif_processed} encoded${ 
    total_avif ? `  (total ${_bytes(total_avif)})` : ''}`,
);
ok(`source raster total: ${_bytes(total_before)}`);

const errored = results.some((r) => r && r.error);
process.exit(errored ? 1 : 0);
