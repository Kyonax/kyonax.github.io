#!/usr/bin/env node
/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 *
 * ascii-to-image.mjs — Convert ASCII-art .txt logos into 16:9 raster
 * images that then flow through the standard Sharp pipeline (the
 * WebP + AVIF variants are produced by convert-images.mjs).
 *
 * Input:  src/assets/ascii/<slug>.txt
 * Output: src/assets/projects/<slug>.jpg  (1920x1080, ASCII block
 *         centered as a single rigid unit so column alignment is
 *         preserved; project-slug label at bottom in SpaceMono).
 *
 * Two-step composition:
 *   1. Build an SVG with just the ASCII block + background, render
 *      it via Sharp (librsvg backend).
 *   2. Render the label text via Sharp's text() input — it loads
 *      SpaceMono directly from the .ttf file (Pango / fontconfig),
 *      bypassing librsvg's limited @font-face data-URI support.
 *   3. Composite the label over the base.
 *
 * Runs in `predev` and `prebuild` BEFORE convert:images so the
 * downstream pipeline picks up the new JPG.
 *
 * Use --force to regenerate regardless of mtimes.
 *
 * Per-file directives: a `.txt` source may carry optional config
 * lines of the form `key: value` (lowercase-kebab key). Detected
 * directives are pulled out before rendering and override the
 * matching script constant for that file only. The ASCII art never
 * picks them up because the visual alphabet (`░▒▓█` + space) cannot
 * match a leading lowercase letter. Conventionally placed at the
 * end of the file, separated by a blank line.
 *
 * Supported directive keys:
 *   left-alignment: -29    → overrides ASCII_CENTER_OFFSET_X for this art
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { basename, join } from 'node:path';

import sharp from 'sharp';

import { exitWith, fail, head, isOutdated,ok, REPO_ROOT } from './_lib.mjs';

const FORCE = process.argv.includes('--force');

const SRC_DIR = join(REPO_ROOT, 'src/assets/ascii');
const OUT_DIR = join(REPO_ROOT, 'src/assets/projects');
const FONT_FILE = join(REPO_ROOT, 'src/fonts/SpaceMono/SpaceMonoNerdFont-Bold.ttf');

const W = 1920;
const H = 1080;
const BG = '#000000';
// hsla(0, 0%, 100%, 0.2) (the --clr-border-100 token) over a #000000
// page renders as a #333333-equivalent. JPG can't carry alpha so we
// bake the visual result.
const FG = '#333333';

// Base font size when the ASCII naturally fits inside the allowed
// content area. Each subsequent ASCII may shrink below this if needed.
const ASCII_BASE_FONT_PX     = 32;
const ASCII_LINE_HEIGHT_RATIO = 36 / 32;

// Max area the ASCII block may occupy within the 1920x1080 canvas.
// Both caps are enforced — whichever the natural art size hits first
// drives the font scaling. Tall/wide arts shrink uniformly; small arts
// keep their natural proportions (never grow above the base font).
// Adjust these ratios to tighten or loosen margins around all arts.
const ASCII_MAX_WIDTH  = Math.round(W * 0.55);
const ASCII_MAX_HEIGHT = Math.round(H * 0.65);

// SpaceMono advance-width is ~0.55em per glyph. Box-drawing chars may
// fall through to a system monospace fallback with slightly different
// metrics — this value is the empirical average that keeps the block
// visually centered.
const MONO_ADVANCE_RATIO = 0.55;

// Residual horizontal nudge to correct optical centering. librsvg's
// fallback monospace renders slightly wider than MONO_ADVANCE_RATIO
// predicts, which pushes the computed block_x a few px too far right.
// Negative value shifts the block left to compensate.
const ASCII_CENTER_OFFSET_X = -19;
const LABEL_FONT_PX     = 20;
const LABEL_BOTTOM_PAD  = 70;

const _xml_escape = (s) => s
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

// Per-file directive parser. Recognized at any line position but
// conventionally at the end. The ASCII alphabet (`░▒▓█` + space)
// cannot match a leading lowercase letter, so the regex is unambiguous.
const DIRECTIVE_RE = /^([a-z][a-z-]*):\s*(.+?)\s*$/;

// Map directive keys → applier functions. Each applier receives the
// raw value (string) and a config object, and mutates the config. To
// add a new directive, add an entry here.
const DIRECTIVE_APPLIERS = {
  'left-alignment': (value, config) => {
    const n = Number(value);
    if (Number.isFinite(n)) {
      config.center_offset_x = n;
    }
  },
};

const _parse_source = (raw) => {
  const directives = {};
  const ascii_lines = [];
  for (const line of raw.split('\n')) {
    if (line.length === 0) {
      continue;
    }
    const m = line.match(DIRECTIVE_RE);
    if (m) {
      directives[m[1]] = m[2];
    } else {
      ascii_lines.push(line);
    }
  }
  return { ascii_lines, directives };
};

const _apply_directives = (directives) => {
  const config = { center_offset_x: ASCII_CENTER_OFFSET_X };
  const unknown = [];
  for (const [key, value] of Object.entries(directives)) {
    const applier = DIRECTIVE_APPLIERS[key];
    if (applier) {
      applier(value, config);
    } else {
      unknown.push(key);
    }
  }
  return { config, unknown };
};

const _build_ascii_svg = (ascii_lines, config) => {
  // Center the whole block by computing a single shared x-offset from
  // the longest line. Every <tspan> resets x to this offset so column
  // alignment is preserved across lines.
  const max_chars  = Math.max(...ascii_lines.map((l) => [...l].length));
  const line_count = ascii_lines.length;

  // Auto-scale font to fit inside the ASCII_MAX_WIDTH x ASCII_MAX_HEIGHT
  // content area. Compute the natural block size at base font, then
  // shrink uniformly if either dimension overflows. Never grow above
  // the base font — small arts keep their natural proportions.
  const natural_width  = max_chars  * ASCII_BASE_FONT_PX * MONO_ADVANCE_RATIO;
  const natural_height = line_count * ASCII_BASE_FONT_PX * ASCII_LINE_HEIGHT_RATIO;
  const width_scale  = ASCII_MAX_WIDTH  / natural_width;
  const height_scale = ASCII_MAX_HEIGHT / natural_height;
  const scale        = Math.min(1, width_scale, height_scale);

  const font_size   = ASCII_BASE_FONT_PX * scale;
  const line_height = font_size * ASCII_LINE_HEIGHT_RATIO;
  const block_width = max_chars * font_size * MONO_ADVANCE_RATIO;
  const block_x     = (W - block_width) / 2 + config.center_offset_x;

  // The ASCII block is vertically centered in the area above the label
  // band (label band is the bottom ~120px).
  const block_height    = line_count * line_height;
  const reserved_bottom = LABEL_FONT_PX + LABEL_BOTTOM_PAD + 60;
  const available_top   = H - reserved_bottom;
  const block_start_y   = Math.max(
    line_height,
    (available_top - block_height) / 2 + line_height,
  );

  const ascii_tspans = ascii_lines.map((line, i) => {
    const dy = i === 0 ? 0 : line_height;
    return `<tspan x="${block_x}" dy="${dy}" xml:space="preserve">${_xml_escape(line)}</tspan>`;
  }).join('\n      ');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="${BG}"/>
  <text x="${block_x}" y="${block_start_y}" font-family="monospace" font-size="${font_size}" fill="${FG}">
    ${ascii_tspans}
  </text>
</svg>`;
};

const _render_label = async (label_text) => {
  // Sharp's text input uses Pango under the hood. Passing `fontfile`
  // tells Pango to load SpaceMono directly from the .ttf — no system
  // font registration needed. font_size is in PangoUnits (1024 per pt);
  // at dpi=72, 1pt ≈ 1px, so the multiplier maps LABEL_FONT_PX to
  // pixels 1:1. letter_spacing also uses PangoUnits.
  const pango_size = LABEL_FONT_PX * 1024;
  const pango = `<span foreground="${FG}" font_family="SpaceMono" font_weight="bold" font_size="${pango_size}" letter_spacing="2000">${_xml_escape(label_text)}</span>`;
  return sharp({
    text: {
      text: pango,
      fontfile: FONT_FILE,
      dpi: 72,
      align: 'center',
      width: W,
      rgba: true,
    },
  })
    .png()
    .toBuffer();
};

if (!existsSync(SRC_DIR)) {
  ok('no src/assets/ascii/ — nothing to convert');
  process.exit(0);
}

const txt_files = readdirSync(SRC_DIR).filter((f) => f.endsWith('.txt'));
if (txt_files.length === 0) {
  ok('no .txt files in src/assets/ascii/');
  process.exit(0);
}

const failures = [];
head(`ascii-to-image — ${txt_files.length} source(s)`);

for (const file of txt_files) {
  const slug = basename(file, '.txt');
  const src_path = join(SRC_DIR, file);
  const out_path = join(OUT_DIR, `${slug}.jpg`);

  if (!isOutdated(src_path, out_path, { force: FORCE })) {
    ok(`SKIP  ${slug}.jpg (up to date)`);
    continue;
  }

  const raw = readFileSync(src_path, 'utf8');
  const { ascii_lines, directives } = _parse_source(raw);

  if (ascii_lines.length === 0) {
    failures.push(`${slug}: empty .txt file`);
    fail(`${slug}: empty .txt file`);
    continue;
  }

  const { config, unknown } = _apply_directives(directives);
  for (const key of unknown) {
    fail(`${slug}: unknown directive '${key}' (ignored)`);
  }

  const project_name = slug.replace(/-/g, ' ').toUpperCase();
  const ascii_svg = _build_ascii_svg(ascii_lines, config);
  const max_chars = Math.max(...ascii_lines.map((l) => [...l].length));
  const natural_h = ascii_lines.length * ASCII_BASE_FONT_PX * ASCII_LINE_HEIGHT_RATIO;
  const natural_w = max_chars * ASCII_BASE_FONT_PX * MONO_ADVANCE_RATIO;
  const w_scale   = ASCII_MAX_WIDTH  / natural_w;
  const h_scale   = ASCII_MAX_HEIGHT / natural_h;
  const fit_scale = Math.min(1, w_scale, h_scale);
  const fit_font  = (ASCII_BASE_FONT_PX * fit_scale).toFixed(1);
  const trigger   = fit_scale === 1
    ? ''
    : ` [scaled by ${w_scale < h_scale ? 'width' : 'height'}]`;
  const dir_str   = Object.keys(directives).length > 0
    ? ` [${Object.entries(directives).map(([k, v]) => `${k}=${v}`).join(' ')}]`
    : '';

  try {
    const label_png = await _render_label(project_name);
    const label_meta = await sharp(label_png).metadata();
    const label_top = H - LABEL_BOTTOM_PAD - label_meta.height;
    const label_left = Math.round((W - label_meta.width) / 2);

    await sharp(Buffer.from(ascii_svg))
      .composite([{ input: label_png, top: label_top, left: label_left }])
      .jpeg({ quality: 90, progressive: true })
      .toFile(out_path);
    ok(`${slug}.jpg  (${W}x${H}, ${ascii_lines.length}r x ${max_chars}c, font ${fit_font}px${trigger}${dir_str})`);
  } catch (err) {
    failures.push(`${slug}: ${err.message}`);
    fail(`${slug}: ${err.message}`);
  }
}

exitWith({ failures, name: 'ascii-to-image' });
