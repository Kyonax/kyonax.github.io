/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 *
 * Generates the per-locale social cards for the resume pages:
 *   public/og-resume-en.jpg   public/og-resume-es.jpg
 *
 * WHY a dedicated card: the landing banner is a portrait composite that says
 * nothing about a CV, so sharing /resume previewed as if it were the homepage.
 *
 * DESIGN: the card showcases the RESUME PAGE, so it follows that page's rules,
 * not the landing's. The resume deliberately opts out of the site's yellow
 * accent and HUD decoration and reads as a printed document: grayscale only,
 * left-aligned, hairline rules. The card does the same — no brand colour, no
 * gradient, no grid, no corner brackets, nothing centred. It ends on an
 * explicit call to action, because a social card's job is the click.
 *
 * Copy is READ FROM THE i18n SOURCE (via vite-node, the same bridge
 * check-json-ld.mjs uses) rather than retyped here, so the card cannot drift
 * from the page it advertises.
 *
 * MANUAL step, deliberately NOT wired into prebuild: it needs a Chromium binary,
 * which CI images do not reliably ship. Re-run it whenever the name, role line
 * or resume titles change:
 *
 *   npm run generate:og            # or: CHROME_PATH=/usr/bin/chromium npm run generate:og
 */

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { fail, head, ok, REPO_ROOT } from './_lib.mjs';

const OUT = {
  en: resolve(REPO_ROOT, 'public/og-resume-en.jpg'),
  es: resolve(REPO_ROOT, 'public/og-resume-es.jpg'),
};

const WIDTH = 1200;
const HEIGHT = 630;

/* Site tokens, verbatim from scss/abstracts/_variables.scss. Chromium renders
   oklch() natively, so the palette needs no hex conversion. */
/* Resume-page tokens only. There is deliberately NO brand colour here: the
   resume is grayscale by design, and the card advertises the resume. */
const CLR = {
  bg: 'oklch(14.5% 0 0)',       /* --clr-neutral-500, page background */
  fg: 'oklch(98.5% 0 0)',       /* --clr-neutral-100, headings          */
  muted: 'oklch(76% 0 0)',      /* --clr-neutral-50,  body text         */
  border: 'oklch(100% 0 0 / 0.2)', /* --clr-border-100                  */
};

const FONTS = {
  geomanistBold: 'src/fonts/Geomanist/Original/GeomanistBold.woff2',
  geomanist: 'src/fonts/Geomanist/Original/GeomanistRegural.woff2',
  monoBold: 'src/fonts/SpaceMono/Original/SpaceMonoNerdFont-Bold.woff2',
  mono: 'src/fonts/SpaceMono/Original/SpaceMonoNerdFont-Regular.woff2',
};

head('generate-og-resume — resume social cards');

const _dataUri = (rel) => {
  const p = resolve(REPO_ROOT, rel);
  if (!existsSync(p)) {
    fail(`missing font: ${rel}`);
    process.exit(1);
  }
  return `data:font/woff2;base64,${readFileSync(p).toString('base64')}`;
};

/* ── copy, straight from the i18n source ────────────────────────────────── */
const VITE_NODE = resolve(REPO_ROOT, 'node_modules/.bin/vite-node');
if (!existsSync(VITE_NODE)) {
  fail('vite-node not installed (ships with vitest). Run `npm i`.');
  process.exit(1);
}

const TMP_DIR = resolve(REPO_ROOT, '.cache/og-resume');
mkdirSync(TMP_DIR, { recursive: true });
const entry = resolve(TMP_DIR, 'copy.mjs');
writeFileSync(entry, `
import { TRANSLATIONS } from '@data/snippets';
const pick = (l) => {
  const r = TRANSLATIONS[l]['kyo-web'];
  const h = r.landing.hero;
  return {
    name: r['persistent-data'].name,
    role: r.resume['role-line'],
    eyebrow: r.resume.eyebrow,
    tag: h.tag,
    available: h.available,
    city: h['location-city'],
    country: h['location-country'],
    stats: h.stats,
  };
};
process.stdout.write(JSON.stringify({ en: pick('en'), es: pick('es') }));
`);
const r = spawnSync(VITE_NODE, [entry], { encoding: 'utf8', cwd: REPO_ROOT });
try {
  rmSync(entry);
} catch { /* noop */ }
if (r.status !== 0) {
  fail(`could not read i18n copy: ${r.stderr.trim()}`);
  process.exit(1);
}
const COPY = JSON.parse(r.stdout);

/* The role line stores the CV pipe as an entity (vue-i18n treats a literal "|"
   as a plural separator — see §1.1), so decode it for rendering. */
const _decode = (s) => s.replace(/&#124;/g, '|').replace(/&amp;/g, '&');

const CTA = {
  en: { label: 'READ THE FULL CV', url: 'kyonax.com/resume' },
  es: { label: 'VER LA HOJA DE VIDA', url: 'kyonax.com/es/hoja-de-vida' },
};

const _page = (locale) => {
  const c = COPY[locale];
  const cta = CTA[locale] || CTA.en;
  return `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:"Geomanist";src:url("${_dataUri(FONTS.geomanist)}") format("woff2");font-weight:400}
@font-face{font-family:"Geomanist";src:url("${_dataUri(FONTS.geomanistBold)}") format("woff2");font-weight:700}
@font-face{font-family:"SpaceMono";src:url("${_dataUri(FONTS.mono)}") format("woff2");font-weight:400}
@font-face{font-family:"SpaceMono";src:url("${_dataUri(FONTS.monoBold)}") format("woff2");font-weight:700}
*{margin:0;padding:0;box-sizing:border-box}
body{width:${WIDTH}px;height:${HEIGHT}px;background:${CLR.bg};overflow:hidden;position:relative;
  font-family:"SpaceMono",monospace}
/* Left-aligned document block, like the resume sheet itself. */
.wrap{height:100%;display:flex;flex-direction:column;align-items:flex-start;
  justify-content:center;text-align:left;padding:0 80px}
.eyebrow{font-size:20px;font-weight:700;letter-spacing:0.34em;color:${CLR.muted};margin-bottom:26px}
.name{font-family:"Geomanist",sans-serif;font-weight:700;font-size:92px;line-height:0.98;
  letter-spacing:-0.02em;color:${CLR.fg};white-space:nowrap;margin-bottom:22px}
.role{font-size:21px;color:${CLR.muted};white-space:nowrap;margin-bottom:30px}
/* The resume's section hairline. */
.rule{width:100%;height:1px;background:${CLR.border};margin-bottom:36px}
.ctarow{display:flex;align-items:center;gap:26px}
.cta{display:inline-flex;align-items:center;gap:14px;border:2px solid ${CLR.fg};
  padding:17px 30px;font-size:21px;font-weight:700;letter-spacing:0.16em;color:${CLR.fg}}
.arrow{font-family:"Geomanist",sans-serif;font-weight:700;font-size:23px;line-height:1}
.url{font-size:19px;letter-spacing:0.08em;color:${CLR.muted}}
</style></head><body>
<div class="wrap">
  <div class="eyebrow">${c.eyebrow}</div>
  <div class="name">${c.name}</div>
  <div class="role">${_decode(c.role)}</div>
  <div class="rule"></div>
  <div class="ctarow">
    <div class="cta">${cta.label}<span class="arrow">&#8594;</span></div>
    <div class="url">${cta.url}</div>
  </div>
</div>
</body></html>`;
};

/* ── render ─────────────────────────────────────────────────────────────── */
const CHROME = process.env.CHROME_PATH
  || ['/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome']
    .find((p) => existsSync(p));

if (!CHROME) {
  fail('no Chromium found — set CHROME_PATH=/path/to/chromium');
  process.exit(1);
}

const puppeteer = await import('puppeteer-core');
const browser = await puppeteer.default.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-sandbox', '--disable-gpu', '--font-render-hinting=none'],
});

for (const locale of ['en', 'es']) {
  const page = await browser.newPage();
  await page.setViewport({ width: WIDTH, height: HEIGHT, deviceScaleFactor: 1 });
  await page.setContent(_page(locale), { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  const overflow = await page.evaluate(() => {
    const out = [];
    for (const sel of ['.name', '.role', '.eyebrow', '.ctarow']) {
      const el = document.querySelector(sel);
      if (el && el.getBoundingClientRect().right > window.innerWidth - 8) {
        out.push(`${sel} right=${Math.round(el.getBoundingClientRect().right)}`);
      }
      if (el && el.scrollWidth > el.clientWidth + 1) {
        out.push(`${sel} clipped`);
      }
    }
    return out;
  });
  if (overflow.length) {
    fail(`${locale}: card content overflows — ${overflow.join(', ')}`);
    process.exitCode = 1;
  }
  await page.screenshot({ path: OUT[locale], type: 'jpeg', quality: 92 });
  await page.close();
  ok(`wrote ${OUT[locale].replace(`${REPO_ROOT}/`, '')}`);
}

await browser.close();
