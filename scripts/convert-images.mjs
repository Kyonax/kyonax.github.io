#!/usr/bin/env node
/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 */

import { existsSync, statSync, writeFileSync } from 'node:fs';
import { cpus } from 'node:os';
import { basename, extname, join, sep } from 'node:path';

import sharp from 'sharp';

import { c, fail, head, isOutdated,ok, rel, REPO_ROOT, walk, warn } from './_lib.mjs';

/* Blog media, synced from kyo-blog by scripts/sync-blog.mjs. org2html does
   not copy content images, so this pipeline is what gives the archive cards
   their AVIF/WebP siblings and their intrinsic dimensions — and dimensions
   are what hold the CLS <= 0.1 Lighthouse assertion. */
const BLOG_DIR = join(REPO_ROOT, 'src/assets/blog');

const SRC_DIRS = [
  join(REPO_ROOT, 'src/assets/app'),
  join(REPO_ROOT, 'src/assets/projects'),
  join(REPO_ROOT, 'src/assets/testimonials'),
  BLOG_DIR,
];
const SOURCE_EXTS = ['.jpg', '.jpeg', '.png'];
const WEBP_QUALITY = 90;
const AVIF_QUALITY = 75;

/*
 * BLOG MEDIA GOES OUT AT SEVERAL WIDTHS, NOT ONE.
 *
 * A post's cover is one 1280px raster, and the archive shows it in a box
 * 340px wide on a 390px phone: the lead alone sent that phone 1.5 MB of PNG,
 * and Lighthouse mobile listed 1,748 KiB of image savings on /blog
 * (2026-09-14). So every blog source is ALSO cut at these widths, in AVIF and
 * WebP, named `<stem>-<width>.<ext>` — the landing's own naming
 * (kyonax_portrait-300.avif) — and blog-picture.vue offers the steps and the
 * full-size siblings as one srcset.
 *
 * THE STEPS COME FROM THE BOXES, measured on the built archive: the lead and a
 * card are 340px at 390, the lead 718px at 768 and 622–663px from 1280, a
 * card 346px at 768 and 383–409px from 1280. 480 serves a phone and every
 * card at 1x, 720 a phone at 2x and the lead at 1x on a tablet or a laptop,
 * 960 a card at 2x; above that the full-size sibling is the step. Only widths
 * SMALLER than the source are cut — never an upscale.
 *
 * NO RASTER STEPS. The original PNG/JPEG stays the <img> fallback at full
 * size: every browser in the support floor takes AVIF or WebP first, so a
 * resized PNG would be encoded on every build and fetched by nobody.
 */
const BLOG_WIDTHS = [480, 720, 960];

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

/* `target_suffix` replaces the source's extension: `.webp` for the full-size
   sibling, `-480.webp` for a blog width step. */
const _convert = async (source_path, target_suffix, encoder) => {
  const target_path = source_path.replace(/\.[^.]+$/, target_suffix);
  if (!_is_outdated(target_path, source_path)) {
    if (!QUIET) {
      console.log(`  ${c('dim', '·')} ${rel(source_path)} → ${target_suffix} (up to date)`);
    }
    return { skipped: true };
  }
  const before = statSync(source_path).size;
  await encoder(sharp(source_path)).toFile(target_path);
  const after = statSync(target_path).size;
  const pct = Math.round((1 - after / before) * 100);
  if (!QUIET) {
    console.log(
      `  ${c('green', '✓')} ${rel(source_path)} → ${target_suffix}  ` +
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

/*
 * The widths each blog source is cut at: the steps under its own width. A step
 * is skipped when kyo-blog itself ships a source by that name — `cover-480.png`
 * beside `cover.png` already owns `cover-480.avif`, and a step written over it
 * would swap that picture's siblings for the cover's.
 */
const source_set = new Set(sources);
const blog_steps = new Map();
for (const src of sources.filter((p) => p.startsWith(`${BLOG_DIR}${sep}`))) {
  const { width } = await sharp(src).metadata();
  const stem = src.slice(0, -extname(src).length);
  blog_steps.set(src, BLOG_WIDTHS.filter((w) => {
    if (!width || w >= width) {
      return false;
    }
    const authored = SOURCE_EXTS.some((ext) => source_set.has(`${stem}-${w}${ext}`));
    if (authored) {
      warn(`${rel(src)}: no ${w}w step, ${basename(stem)}-${w} is a source of its own`);
    }
    return !authored;
  }));
}

const jobs = sources.flatMap((src) => [
  { kind: 'webp', task: () => _convert(src, '.webp', (img) =>
    img.webp({ quality: WEBP_QUALITY, effort: 4 })) },
  { kind: 'avif', task: () => _convert(src, '.avif', (img) =>
    img.avif({ quality: AVIF_QUALITY, effort: 4 })) },
  /* The same encoders as the full-size siblings, so a step differs from its
     sibling in width only. */
  ...(blog_steps.get(src) || []).flatMap((w) => [
    { kind: 'step', task: () => _convert(src, `-${w}.webp`, (img) =>
      img.resize({ width: w }).webp({ quality: WEBP_QUALITY, effort: 4 })) },
    { kind: 'step', task: () => _convert(src, `-${w}.avif`, (img) =>
      img.resize({ width: w }).avif({ quality: AVIF_QUALITY, effort: 4 })) },
  ]),
]);

const results = await _run_pool(jobs.map((j) => j.task), CONCURRENCY);

let total_webp = 0;
let total_avif = 0;
let total_steps = 0;
let webp_processed = 0;
let avif_processed = 0;
let steps_processed = 0;
for (let i = 0; i < results.length; i += 1) {
  const r = results[i];
  if (!r || r.skipped || r.error) {
    continue;
  }
  const { kind } = jobs[i];
  if (kind === 'webp') {
    total_webp += r.target_size; webp_processed += 1;
  } else if (kind === 'avif') {
    total_avif += r.target_size; avif_processed += 1;
  } else {
    total_steps += r.target_size; steps_processed += 1;
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
ok(
  `blog steps (${BLOG_WIDTHS.join('/')}w): ${steps_processed} encoded${
    total_steps ? `  (total ${_bytes(total_steps)})` : ''}`,
);
ok(`source raster total: ${_bytes(total_before)}`);

/*
 * Emit intrinsic dims so the manifest can set <img> height - kills CLS.
 *
 * A blog entry also lists the `widths` its steps were cut at, and
 * use-blog-images.js builds its srcset from that list rather than from
 * whatever files it finds: sync-blog.mjs never clears src/assets/blog/, so a
 * step from an older ladder would otherwise ride into the srcset unrefreshed.
 */
const DIMENSIONS_OUT = join(REPO_ROOT, 'src/data/image-dimensions.generated.json');
const _VARIANT_RE = /^(.+?)-(\d+)\.(?:jpe?g|png)$/;
const _PLAIN_RE   = /^(.+?)\.(?:jpe?g|png)$/;

const _base_of = (file) => {
  const m = file.match(_VARIANT_RE) || file.match(_PLAIN_RE);
  return m ? m[1] : null;
};

const dimensions = new Map();
for (const src of sources) {
  /* A blog file is keyed by its WHOLE stem: it is a post's picture, never a
     hand-cut width variant, so `step-2.png` is `step-2` and not a 2px `step`
     — the stem use-blog-images.js looks up. */
  const base = blog_steps.has(src)
    ? basename(src, extname(src))
    : _base_of(basename(src));
  if (!base) {
    continue;
  }
  const meta = await sharp(src).metadata();
  if (!meta.width || !meta.height) {
    continue;
  }
  const prev = dimensions.get(base);
  if (!prev || meta.width > prev.w) {
    const steps = blog_steps.get(src) || [];
    dimensions.set(base, steps.length > 0
      ? { w: meta.width, h: meta.height, widths: steps }
      : { w: meta.width, h: meta.height });
  }
}

const sorted_dimensions = Object.fromEntries(
  [...dimensions.keys()].sort().map((k) => [k, dimensions.get(k)]),
);
writeFileSync(DIMENSIONS_OUT, `${JSON.stringify(sorted_dimensions, null, 2)}\n`, 'utf8');
ok(`dimensions: ${Object.keys(sorted_dimensions).length} base(s) → ${rel(DIMENSIONS_OUT)}`);

const errored = results.some((r) => r && r.error);
process.exit(errored ? 1 : 0);
