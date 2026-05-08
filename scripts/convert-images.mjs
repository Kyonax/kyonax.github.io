#!/usr/bin/env node
/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 *
 * convert-images.mjs — sharp-based image transcoder.
 *
 * Walks src/assets/app/*.{jpg,jpeg,png}, generates `.webp` (q=75) and
 * `.avif` (q=50) variants alongside each source. Idempotent — skips
 * outputs that are newer than the source. Wired as `npm run convert:images`
 * + chained into `prebuild` so production builds always have variants.
 *
 * Replaces the legacy webpack image-pipeline:
 *   - image-webpack-loader (mozjpeg + pngquant) — ran per-import
 *   - imagemin-webp                              — ran during minification
 *   - image-minimizer-webpack-plugin             — duplicate processing
 *
 * The result is the same: the dist/ folder ships AVIF + WebP + JPG variants
 * for every raster asset, picked up automatically by useImageManifest.
 *
 * Run:
 *   node scripts/convert-images.mjs            — process all assets
 *   node scripts/convert-images.mjs --force    — re-encode even if up to date
 *   node scripts/convert-images.mjs --quiet    — suppress per-file logs
 */

import { existsSync, statSync } from 'node:fs';
import { join } from 'node:path';

import sharp from 'sharp';

import { REPO_ROOT, head, ok, fail, walk, rel, c } from './_lib.mjs';

const SRC_DIR = join(REPO_ROOT, 'src/assets/app');
const SOURCE_EXTS = ['.jpg', '.jpeg', '.png'];
const WEBP_QUALITY = 90;
const AVIF_QUALITY = 75;

const args = process.argv.slice(2);
const FORCE = args.includes('--force');
const QUIET = args.includes('--quiet');

const _is_outdated = (output_path, source_path) => {
  if (FORCE) return true;
  if (!existsSync(output_path)) return true;
  return statSync(source_path).mtimeMs > statSync(output_path).mtimeMs;
};

const _bytes = (n) => {
  if (n >= 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)}MB`;
  if (n >= 1024) return `${(n / 1024).toFixed(0)}KB`;
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
      `${_bytes(before)} → ${c('cyan', _bytes(after))}  (${c('yellow', '-' + pct + '%')})`,
    );
  }
  return { source_size: before, target_size: after };
};

if (!existsSync(SRC_DIR)) {
  fail(`source dir not found: ${rel(SRC_DIR)}`);
  process.exit(1);
}

head('convert-images — sharp-based transcoder');

const sources = walk(SRC_DIR, { ext: SOURCE_EXTS });
ok(`found ${sources.length} source raster${sources.length === 1 ? '' : 's'}`);

let total_before = 0;
let total_webp = 0;
let total_avif = 0;
let webp_processed = 0;
let avif_processed = 0;

for (const src of sources) {
  total_before += statSync(src).size;

  const webp = await _convert(src, '.webp', (img) =>
    img.webp({ quality: WEBP_QUALITY, effort: 4 }));
  if (!webp.skipped) {
    total_webp += webp.target_size;
    webp_processed += 1;
  }

  const avif = await _convert(src, '.avif', (img) =>
    img.avif({ quality: AVIF_QUALITY, effort: 4 }));
  if (!avif.skipped) {
    total_avif += avif.target_size;
    avif_processed += 1;
  }
}

console.log('');
ok(
  `webp: ${webp_processed} encoded` +
  (total_webp ? `  (total ${_bytes(total_webp)})` : ''),
);
ok(
  `avif: ${avif_processed} encoded` +
  (total_avif ? `  (total ${_bytes(total_avif)})` : ''),
);
ok(`source raster total: ${_bytes(total_before)}`);
process.exit(0);
