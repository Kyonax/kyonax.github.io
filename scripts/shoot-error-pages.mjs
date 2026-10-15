/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';

import { chromium } from '@playwright/test';
import sharp from 'sharp';

import { fail, head, line, ok, rel, REPO_ROOT, warn } from './_lib.mjs';

const USAGE = `Usage: node scripts/shoot-error-pages.mjs [flags]

Shoots the static error pages for X in Chromium over file:// (no server, no build):
3840x2160 page shots and an art close-up whose long edge stays within 4096 px.

  --page <code>|all        400, 401, 403, 404 or 500; all = those five (default 404)
  --char <r:c>|all         also shoot the pointer on ink cell c of row r (both 1-based, e.g. 3:6);
                           all = one shot per row, on the ink cell nearest the art's centre line;
                           omit for the rest state only
  --target page|art|both   full page, art close-up, or both (default page)
  --src <dir>              folder holding <code>.html (default public/error-pages)
  --out <dir>              output folder (default .cache/error-pages-shots/<timestamp>)
  -h, --help               show this text

Files: <code>-<rest|rRcC>[-art].png, plus a q95 .jpg when a PNG is over 5 MB.`;

const CODES = ['400', '401', '403', '404', '500'];
const TARGETS = ['page', 'art', 'both'];
const VIEWPORT = { width: 1280, height: 720 };
const PAGE_DSF = 3;
const X_LONG_EDGE = 4096;
const X_PHOTO_LIMIT = 5_000_000;
const ART_PAD = 64;
const MIN_ADVANCE = 0.605;
const ROWS = 7;
// The page script's reach: R = REACH x the computed font-size of .figlet.
const REACH = 2.5;
const P_TOLERANCE = 0.002;
const LAUNCH_ARGS = ['--force-color-profile=srgb', '--font-render-hinting=none'];
const FONT_DIR = resolve(REPO_ROOT, 'src/fonts/SpaceMono/Original');
// visibility keeps the layout, so the close-up drops the HUD and the caption the pad would slice.
const ART_ONLY = 'body *{visibility:hidden!important}.figlet,.figlet *{visibility:visible!important}';

function usageError(message) {
  fail(message);
  console.error(`\n${USAGE}`);
  process.exit(1);
}

let opts;
try {
  opts = parseArgs({
    options: {
      page: { type: 'string', default: '404' },
      char: { type: 'string' },
      target: { type: 'string', default: 'page' },
      src: { type: 'string' },
      out: { type: 'string' },
      help: { type: 'boolean', short: 'h' },
    },
  }).values;
} catch (error) {
  usageError(error.message);
}

if (opts.help) {
  console.log(USAGE);
  process.exit(0);
}
if (opts.page !== 'all' && !/^\d{3}$/.test(opts.page)) {
  usageError(`--page ${opts.page}: expected a status code (${CODES.join(', ')}) or all`);
}
if (opts.char !== undefined && opts.char !== 'all' && !/^[1-9]\d*:[1-9]\d*$/.test(opts.char)) {
  usageError(`--char ${opts.char}: expected r:c (1-based row and ink cell, e.g. 3:6) or all`);
}
if (!TARGETS.includes(opts.target)) {
  usageError(`--target ${opts.target}: expected page, art or both`);
}

const fontFace = (file, weight) => {
  const data = readFileSync(resolve(FONT_DIR, file)).toString('base64');
  return `@font-face{font-family:'Space Mono';font-style:normal;font-weight:${weight};src:url(data:font/woff2;base64,${data}) format('woff2')}`;
};

// The pages spell the family 'Space Mono'; the Bold face covers .redirect a::before.
const FONT_CSS = [
  fontFace('SpaceMonoNerdFont-Regular.woff2', 400),
  fontFace('SpaceMonoNerdFont-Bold.woff2', 700),
].join('');

const WANT_CHARS = opts.char !== undefined;
const SRC_DIR = opts.src ? resolve(opts.src) : resolve(REPO_ROOT, 'public/error-pages');
const STAMP = new Date().toISOString().slice(0, 19).replaceAll(':', '-');
const OUT_DIR = opts.out ? resolve(opts.out) : resolve(REPO_ROOT, '.cache/error-pages-shots', STAMP);
const SHOOT_PAGE = opts.target !== 'art';
const SHOOT_ART = opts.target !== 'page';
const written = [];

function check(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const fmtBytes = (bytes) => `${bytes.toLocaleString('en-US')} B (${(bytes / 1e6).toFixed(2)} MB)`;
const fmtRect = (r) => `${r.width.toFixed(2)}x${r.height.toFixed(2)} at ${r.x.toFixed(2)},${r.y.toFixed(2)}`;
const cellName = (target) => `r${target.r}c${target.c}`;
const shotName = (code, target, art) => `${code}-${target ? cellName(target) : 'rest'}${art ? '-art' : ''}.png`;

async function nextFrames(page) {
  await page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))));
}

async function probePage(page) {
  return page.evaluate(async () => {
    // fonts.check() is true when nothing matches, so only load() proves the face exists.
    const regular = (await document.fonts.load('16px "Space Mono"')).length;
    const bold = (await document.fonts.load('700 16px "Space Mono"')).length;
    await document.fonts.ready;
    await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)));
    // Chromium's own pointermove at load can cache the cell rects before the font lands; resize drops that cache.
    dispatchEvent(new Event('resize'));
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const coarse = matchMedia('(pointer: coarse)').matches;
    const art = document.querySelector('pre.figlet');
    if (!art) {
      return { regular, bold, reduced, coarse, found: false };
    }
    const box = art.getBoundingClientRect();
    const mid = box.x + box.width / 2;
    const rows = [...art.querySelectorAll(':scope>s')].map((row) => [...row.querySelectorAll('i')]);
    const centres = rows.map((cells) => {
      let best = 0;
      let best_gap = Infinity;
      for (const [k, el] of cells.entries()) {
        const r = el.getBoundingClientRect();
        const gap = Math.abs(r.x + r.width / 2 - mid);
        if (gap < best_gap) {
          best = k + 1;
          best_gap = gap;
        }
      }
      return best;
    });
    return {
      regular,
      bold,
      reduced,
      coarse,
      found: true,
      rect: { x: box.x, y: box.y, width: box.width, height: box.height },
      font_size: Number.parseFloat(getComputedStyle(art).fontSize),
      columns: Math.max(...art.textContent.split('\n').map((row) => row.length)),
      cells: art.querySelectorAll('i').length,
      row_cells: rows.map((cells) => cells.length),
      centres,
    };
  });
}

function verify(probe, file) {
  check(probe.regular > 0 && probe.bold > 0, `Space Mono did not load: fonts.load() gave ${probe.regular} regular, ${probe.bold} bold face(s), want > 0`);
  check(!probe.reduced && !probe.coarse, 'the browser matches prefers-reduced-motion:reduce or pointer:coarse, so the page script would not split the art');
  check(probe.found, `no pre.figlet in ${rel(file)}`);
  const advance = probe.rect.width / probe.font_size / probe.columns;
  check(advance > MIN_ADVANCE, `advance ${advance.toFixed(4)} = ${probe.rect.width.toFixed(2)} px / ${probe.font_size} px / ${probe.columns} cols, want > ${MIN_ADVANCE} (Space Mono .612, fallback .600)`);
  return advance;
}

function pickChars(probe, file) {
  if (!WANT_CHARS) {
    return [];
  }
  check(probe.cells > 0, `--char ${opts.char} needs .figlet i cells and ${rel(file)} has none (no split script)`);
  if (opts.char === 'all') {
    return probe.centres.map((c, k) => ({ r: k + 1, c })).filter((target) => target.c > 0);
  }
  const [r, c] = opts.char.split(':').map(Number);
  check(r <= probe.row_cells.length, `--char ${opts.char}: ${rel(file)} has ${probe.row_cells.length} rows`);
  const count = probe.row_cells.at(r - 1);
  check(c <= count, `--char ${opts.char}: row ${r} of ${rel(file)} has ${count} ink cells`);
  return [{ r, c }];
}

function artClip({ x, y, width, height }) {
  // Per-axis pads clamped to the viewport: the art stays centred and nothing is cropped silently.
  const pad_x = Math.max(0, Math.floor(Math.min(ART_PAD, x, VIEWPORT.width - x - width)));
  const pad_y = Math.max(0, Math.floor(Math.min(ART_PAD, y, VIEWPORT.height - y - height)));
  const left = Math.max(0, Math.floor(x - pad_x));
  const top = Math.max(0, Math.floor(y - pad_y));
  const right = Math.min(VIEWPORT.width, Math.ceil(x + width + pad_x));
  const bottom = Math.min(VIEWPORT.height, Math.ceil(y + height + pad_y));
  return { pad_x, pad_y, clip: { x: left, y: top, width: right - left, height: bottom - top } };
}

async function withPage(browser, url, dsf, hide_css, work) {
  const context = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: dsf });
  try {
    const page = await context.newPage();
    page.on('pageerror', (error) => warn(`page error: ${error.message}`));
    // Keep the coordinates the page itself received; engines may round synthetic ones.
    await page.addInitScript(() => addEventListener('pointermove', (e) => {
      window.__pt = { x: e.clientX, y: e.clientY };
    }, { capture: true, passive: true }));
    await page.goto(url.href, { waitUntil: 'load' });
    await page.addStyleTag({ content: FONT_CSS + hide_css });
    return await work(page, await probePage(page));
  } finally {
    await context.close();
  }
}

function proximity(cell, pt, radius) {
  if (!pt) {
    return 0;
  }
  const dx = Math.max(0, cell.left - pt.x, pt.x - cell.right);
  const dy = Math.max(0, cell.top - pt.y, pt.y - cell.bottom);
  return Math.max(0, 1 - Math.hypot(dx, dy) / radius);
}

async function readCells(page) {
  return page.evaluate(() => {
    const art = document.querySelector('pre.figlet');
    const cells = [];
    for (const [r, row] of [...art.querySelectorAll(':scope>s')].entries()) {
      for (const [c, el] of [...row.querySelectorAll('i')].entries()) {
        const box = el.getBoundingClientRect();
        const p = Number.parseFloat(getComputedStyle(el).getPropertyValue('--p'));
        cells.push({ r: r + 1, c: c + 1, left: box.left, right: box.right, top: box.top, bottom: box.bottom, p });
      }
    }
    const font_size = Number.parseFloat(getComputedStyle(art).fontSize);
    return { cells, pt: window.__pt ?? null, font_size, width: art.getBoundingClientRect().width };
  });
}

function checkCells({ cells, pt, font_size, width }, target) {
  const radius = REACH * font_size;
  const at = pt ? `pointer ${pt.x},${pt.y}, R ${radius} px` : `no pointer event, R ${radius} px`;
  if (target) {
    const hit = cells.find((cell) => cell.r === target.r && cell.c === target.c);
    check(hit?.p === 1, `target ${cellName(target)} reads --p ${hit?.p}, want 1 (${at})`);
  }
  const off = cells.filter((cell) => !(Math.abs(cell.p - proximity(cell, pt, radius)) <= P_TOLERANCE));
  if (off.length > 0) {
    const [first] = off;
    throw new Error(`${off.length} of ${cells.length} cells off the formula, first ${cellName(first)} reads --p ${first.p}, formula ${proximity(first, pt, radius).toFixed(4)} (${at})`);
  }
  const pressed = cells.filter((cell) => cell.p > 0).length;
  if (!target) {
    check(pressed === 0, `rest has ${pressed} pressed cell(s) (${at})`);
  } else if (width > 2 * radius) {
    check(pressed < cells.length, `no cell reads 0 although the art (${width.toFixed(2)} px) is wider than 2R (${2 * radius} px)`);
  }
  return pressed;
}

async function shootState(page, target, clip) {
  if (target) {
    const centre = await page.locator(`.figlet>s:nth-child(${target.r}) i`).nth(target.c - 1).evaluate((el) => {
      const box = el.getBoundingClientRect();
      return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
    });
    await page.mouse.move(centre.x, centre.y);
  } else {
    await page.mouse.move(0, 0);
  }
  await nextFrames(page);
  const png = await page.screenshot({ animations: 'disabled', ...(clip ? { clip } : {}) });
  // Read after the shot: animations:'disabled' has completed the --p transitions by then.
  const pressed = checkCells(await readCells(page), target);
  return { png, note: target ? `  pointer on ${cellName(target)}, ${pressed} cells pressed` : '' };
}

async function save({ png, note }, name, art) {
  const file = resolve(OUT_DIR, name);
  const { width, height } = await sharp(png).metadata();
  if (art) {
    check(Math.max(width, height) <= X_LONG_EDGE, `${name} is ${width}x${height}, over X's ${X_LONG_EDGE} px long edge`);
  } else {
    check(width === VIEWPORT.width * PAGE_DSF && height === VIEWPORT.height * PAGE_DSF, `${name} is ${width}x${height}, want ${VIEWPORT.width * PAGE_DSF}x${VIEWPORT.height * PAGE_DSF}`);
  }
  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(file, png);
  written.push(file);
  ok(`${rel(file)}  ${width}x${height}  ${fmtBytes(png.length)}${note}`);
  if (png.length > X_PHOTO_LIMIT) {
    // Chromium's own JPEG fringes yellow on black, so sharp encodes it at full chroma.
    const jpg = file.replace(/\.png$/, '.jpg');
    const info = await sharp(png).jpeg({ quality: 95, chromaSubsampling: '4:4:4' }).toFile(jpg);
    written.push(jpg);
    ok(`${rel(jpg)}  ${info.width}x${info.height}  ${fmtBytes(info.size)}  (PNG over X's 5 MB)`);
    if (info.size > X_PHOTO_LIMIT) {
      warn(`${rel(jpg)} is still over X's 5 MB`);
    }
  }
}

async function shootCode(browser, code) {
  const file = resolve(SRC_DIR, `${code}.html`);
  if (!existsSync(file)) {
    warn(`${code}: ${rel(file)} not found, skipped`);
    return;
  }
  const url = pathToFileURL(file);

  const plan = await withPage(browser, url, PAGE_DSF, '', async (page, probe) => {
    const advance = verify(probe, file);
    const states = [null, ...pickChars(probe, file)];
    line(`${code}: fonts.load ${probe.regular}+${probe.bold}, advance ${advance.toFixed(4)} (${probe.rect.width.toFixed(2)} / ${probe.font_size} / ${probe.columns} cols), ${probe.cells} cells in ${probe.row_cells.length} rows, R ${REACH * probe.font_size} px`);
    if (probe.cells === 0) {
      warn(`${code}: ${rel(file)} has no .figlet i cells (no split script), rest state only`);
    } else if (probe.row_cells.length !== ROWS) {
      warn(`${code}: ${probe.row_cells.length} .figlet>s rows, the contract says ${ROWS}`);
    }
    if (SHOOT_PAGE) {
      for (const target of states) {
        await save(await shootState(page, target, null), shotName(code, target, false), false);
      }
    }
    return { states, rect: probe.rect };
  });

  if (!SHOOT_ART) {
    return;
  }
  const { pad_x, pad_y, clip } = artClip(plan.rect);
  // Chromium rounds clip x scale (1136 x 3.6 gave 4090), so aim 2 px under X's cap.
  const dsf = Math.floor(((X_LONG_EDGE - 2) / Math.max(clip.width, clip.height)) * 10) / 10;
  line(`${code} art: figlet ${fmtRect(plan.rect)}, pad ${pad_x}x${pad_y} px, clip ${clip.width}x${clip.height} at ${clip.x},${clip.y}, scale ${dsf}`);
  await withPage(browser, url, dsf, ART_ONLY, async (page, probe) => {
    verify(probe, file);
    const { x, y, width, height } = probe.rect;
    const inside = x >= clip.x && y >= clip.y && x + width <= clip.x + clip.width && y + height <= clip.y + clip.height;
    check(inside, `at scale ${dsf} the figlet ${fmtRect(probe.rect)} spills out of the clip ${fmtRect(clip)}`);
    for (const target of plan.states) {
      await save(await shootState(page, target, clip), shotName(code, target, true), true);
    }
  });
}

head('shoot-error-pages — error-page shots for X');
line(`src ${rel(SRC_DIR)} · char ${opts.char ?? 'rest only'} · target ${opts.target}`);
line(`out ${rel(OUT_DIR)}`);

let browser;
try {
  browser = await chromium.launch({ args: LAUNCH_ARGS });
} catch (error) {
  fail(`chromium did not launch (npx playwright install chromium): ${error.message.split('\n')[0]}`);
  process.exit(1);
}

let failures = 0;
try {
  for (const code of opts.page === 'all' ? CODES : [opts.page]) {
    try {
      await shootCode(browser, code);
    } catch (error) {
      failures += 1;
      fail(`${code}: ${error.message.split('\n')[0]}`);
    }
  }
} finally {
  await browser.close();
}

if (written.length === 0) {
  fail('nothing was shot');
  process.exitCode = 1;
} else if (failures > 0) {
  fail(`${failures} page(s) failed; ${written.length} file(s) in ${rel(OUT_DIR)}`);
  process.exitCode = 1;
} else {
  ok(`${written.length} file(s) in ${rel(OUT_DIR)}`);
}
