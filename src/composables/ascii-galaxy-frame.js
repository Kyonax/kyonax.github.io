/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 */

/*
 * ascii-galaxy-frame.js — one frame of the blog hero's ASCII galaxy, as the
 * markup that goes inside its <pre>.
 *
 * PURE ON PURPOSE: no DOM, no Vue, no imports. vite-ssg prerenders the archive
 * in Node, and the SAME function that animates the panel in the browser draws
 * frame 0 into the static HTML — so the prerendered <pre> and the first client
 * render are one string, and hydration has nothing to disagree about.
 *
 * THE MATHS IS THE VALIDATED DESIGN'S, VERBATIM: galaxyFrames() in
 * docs/plans/blog-landing-design/blog-landing.design.mjs. Every constant, the
 * seeded noise and the ORDER OF EVERY SUM are copied rather than tidied — a
 * float summed in a different order can land a cell on the other side of a
 * ramp step, and the frames are asserted equal to the design's character for
 * character.
 *
 * WHAT IS PRECOMPUTED is everything that does not depend on the phase — each
 * cell's angle, spiral offset, arm falloff, core, halo, noise and cutoff —
 * once, on the first call. A frame is then two exponentials per cell.
 *
 * THE OUTPUT: rows joined by "\n", each row a run-length string where the mid
 * tone is wrapped in <i> and the bright tone in <b>; the dim tone and the
 * blanks are the <pre>'s own colour. Nothing in the ramp is an HTML special
 * character, so the string needs no escaping.
 */

export const GALAXY_COLS = 96;
export const GALAXY_ROWS = 42;
/* 36 frames step the phase through π, and the galaxy has two arms π apart,
   so frame 36 IS frame 0 and the loop has no seam. */
export const GALAXY_FRAMES = 36;

const RAMP = ' .·:-=+*#%@';
const RAMP_TOP = RAMP.length - 1;
const BRIGHT_FROM = 8;
const MID_FROM = 5;

/* A character cell is about twice as tall as it is wide, so x is squashed by
   this much before any distance is measured — or the disc draws as an oval. */
const X_SQUASH = 2.05;
const RADIUS_NUDGE = 0.001;
const CORE_SPREAD = 4.5;
const CORE_GAIN = 1.1;
const ARM_PITCH = 2.31;
const ARM_LOG_SHIFT = 0.5;
const ARM_WIDTH = 0.16;
const ARM_FALLOFF = 17;
const ARM_GAIN = 1.35;
const ARM_OFFSETS = [0, Math.PI];
const HALO_FALLOFF = 9;
const HALO_GAIN = 0.1;
const NOISE_SEED = 5;
const NOISE_CENTRE = 0.5;
const NOISE_GAIN = 0.09;
const CUTOFF_RADIUS = 21;
const CUTOFF_SLOPE = 0.1;
const TAU = 2 * Math.PI;

/* mulberry32 — the design's generator seeds a fresh one per cell and takes its
   first draw, so the grain is fixed per cell and identical in Node and in
   every browser. */
const MULBERRY_STEP = 0x6D2B79F5;
const MULBERRY_SHIFT_A = 15;
const MULBERRY_SHIFT_B = 7;
const MULBERRY_SHIFT_C = 14;
const MULBERRY_MUL = 61;
const UINT32_RANGE = 4294967296;

const _firstDraw = (seed) => {
  const s = ((seed | 0) + MULBERRY_STEP) | 0;
  let t = Math.imul(s ^ (s >>> MULBERRY_SHIFT_A), 1 | s);
  t = (t + Math.imul(t ^ (t >>> MULBERRY_SHIFT_B), MULBERRY_MUL | t)) ^ t;
  return ((t ^ (t >>> MULBERRY_SHIFT_C)) >>> 0) / UINT32_RANGE;
};

/* The design wraps by repeated subtraction, not by modulo — kept, because the
   two can disagree in the last bit. */
const _wrap = (a) => {
  let w = a;
  while (w > Math.PI) {
    w -= TAU;
  }
  while (w < -Math.PI) {
    w += TAU;
  }
  return w;
};

let _grid = null;

const _buildGrid = () => {
  const cx = GALAXY_COLS / 2;
  const cy = GALAXY_ROWS / 2;
  let seed = NOISE_SEED;
  const grid = [];
  for (let y = 0; y < GALAXY_ROWS; y += 1) {
    const row = [];
    for (let x = 0; x < GALAXY_COLS; x += 1) {
      const dx = (x - cx) / X_SQUASH;
      const dy = y - cy;
      const rad = Math.hypot(dx, dy) + RADIUS_NUDGE;
      row.push({
        angle: Math.atan2(dy, dx),
        spiral: ARM_PITCH * Math.log(rad + ARM_LOG_SHIFT),
        fade: Math.exp(-rad / ARM_FALLOFF),
        core: Math.exp(-(rad * rad) / CORE_SPREAD) * CORE_GAIN,
        halo: Math.exp(-rad / HALO_FALLOFF) * HALO_GAIN,
        grain: (_firstDraw(seed) - NOISE_CENTRE) * NOISE_GAIN,
        cut: rad > CUTOFF_RADIUS ? (rad - CUTOFF_RADIUS) * CUTOFF_SLOPE : 0,
      });
      seed += 1;
    }
    grid.push(row);
  }
  return grid;
};

const _level = (cell, phase) => {
  const th = cell.angle - phase;
  let arms = 0;
  for (const off of ARM_OFFSETS) {
    const d = _wrap(th - (cell.spiral + off));
    arms += Math.exp(-(d * d) / ARM_WIDTH) * cell.fade * ARM_GAIN;
  }
  const v = cell.core + arms + cell.halo + cell.grain - cell.cut;
  return Math.max(0, Math.min(RAMP_TOP, Math.floor(v * RAMP_TOP)));
};

/* 0 = dim (the <pre>'s own colour), 1 = mid (<i>), 2 = bright (<b>). A blank
   is dim, so it never opens or breaks a run. */
const _tone = (level) => {
  if (level >= BRIGHT_FROM) {
    return 2;
  }
  return level >= MID_FROM ? 1 : 0;
};

const _run = (tone, text) => {
  if (!text || tone === 0) {
    return text;
  }
  const tag = tone === 1 ? 'i' : 'b';
  return `<${tag}>${text}</${tag}>`;
};

/**
 * The phase of frame `index` — computed from the integer, never accumulated,
 * so frame k is bit-identical to the design's k-th frame however long the
 * loop has run.
 * @param {number} index - Frame number, 0 … GALAXY_FRAMES - 1.
 * @returns {number} Rotation in radians.
 */
export const galaxyPhase = (index) => Math.PI * index / GALAXY_FRAMES;

/**
 * One frame of the galaxy as <pre> markup.
 * @param {number} phase - Rotation in radians; galaxyPhase(k) for frame k.
 * @returns {string} GALAXY_ROWS rows of GALAXY_COLS characters, joined by
 *   "\n", mid-tone runs in <i> and bright runs in <b>.
 */
export const galaxyFrame = (phase) => {
  if (!_grid) {
    _grid = _buildGrid();
  }
  return _grid.map((row) => {
    let out = '';
    let run = '';
    let tone = 0;
    for (const cell of row) {
      const level = _level(cell, phase);
      const next = _tone(level);
      if (next !== tone) {
        out += _run(tone, run);
        run = '';
        tone = next;
      }
      run += RAMP.charAt(level);
    }
    return out + _run(tone, run);
  }).join('\n');
};

export default galaxyFrame;
