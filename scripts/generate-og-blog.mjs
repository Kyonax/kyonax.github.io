/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 *
 * Generates the per-locale social cards for the blog archive:
 *   public/og-blog-en.jpg   public/og-blog-es.jpg
 *
 * WHY a dedicated card: every blog page shared the landing banner, a portrait
 * composite that says nothing about a blog, so a share of /blog previewed as
 * if it were the homepage. The owner's decision of 2026-09-14 (Step 1b, topic
 * 6): a "Kyonax Build in Public" card per locale, made the way the resume's is,
 * with an alt that describes it truly.
 *
 * DESIGN: the card advertises the BLOG, so it is the blog hero at card size
 * (blog-hero.vue, and the validated design in docs/plans/blog-landing-design/),
 * not the resume's printed sheet and not the landing banner: monochrome, the
 * hero's hairline rules, the title in Geomanist, the chip in SpaceMono
 * capitals in the panel's corner, and the ASCII galaxy in that panel. There is
 * NO ACCENT: the yellow is the site's STATE colour, and nothing on a picture is
 * a state.
 *
 * NO NUMBERS, unlike the hero's chip. The hero states the corpus the build
 * measured, every build; a card made by hand would freeze those figures on the
 * day it was made and lie from the next post on. So the chip says what the
 * blog is made with, which does not go stale.
 *
 * Copy is READ FROM THE i18n SOURCE (via vite-node, the same bridge
 * generate-og-resume.mjs and check-json-ld.mjs use): the title is the <h1>'s
 * key and the chip is the blog's own "made with" line. The galaxy is frame 0
 * of the very function that draws the hero (ascii-galaxy-frame.js), so the
 * card and the page show one picture. The line under the title is the one
 * sentence written for the card; it restates the signed description, and the
 * generator refuses to render if the description stops saying what it
 * restates.
 *
 * MANUAL step, deliberately NOT wired into prebuild: it needs a Chromium binary,
 * which CI images do not reliably ship. Re-run it whenever the blog's title,
 * description, "made with" line or galaxy change:
 *
 *   npm run generate:og                  # these cards and the resume's
 *   node scripts/generate-og-blog.mjs    # these alone; CHROME_PATH=/path/to/chromium picks the browser
 */

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { fail, head, ok, REPO_ROOT } from './_lib.mjs';

const WIDTH = 1200;
const HEIGHT = 630;

/* Site tokens, verbatim from scss/abstracts/_variables.scss. Chromium renders
   oklch() natively, so the palette needs no hex conversion. Greys only — the
   blog hero spends no accent, and the card advertises the blog hero. */
const CLR = {
  bg: 'oklch(14.5% 0 0)',              /* --clr-neutral-500, page background */
  fg: 'oklch(98.5% 0 0)',              /* --clr-neutral-100, the title        */
  body: 'oklch(76% 0 0)',              /* --clr-neutral-50,  the subtitle     */
  mid: 'oklch(78% 0.014 286.375)',     /* --clr-neutral-200, galaxy mid tone  */
  muted: 'oklch(70% 0.016 285.938)',   /* --clr-neutral-300, the URL          */
  dim: 'oklch(54% 0 0)',               /* --clr-neutral-350, galaxy dim tone  */
  border: 'oklch(100% 0 0 / 0.2)',     /* --clr-border-100, every hairline    */
};

/* The Original faces, not the site's Latin subsets: the subsets were cut to
   the site's own corpus, and a card must never fall back to a system face on
   a glyph the corpus did not happen to use. */
const FONTS = {
  geomanistBold: 'src/fonts/Geomanist/Original/GeomanistBold.woff2',
  geomanist: 'src/fonts/Geomanist/Original/GeomanistRegural.woff2',
  mono: 'src/fonts/SpaceMono/Original/SpaceMonoNerdFont-Regular.woff2',
};

/*
 * THE CARD'S OWN WORDS, one entry per locale. `line` says who writes and what
 * about, short enough to read at the ~500px a feed shows the card. It is set
 * as two phrases, one per row, so the break falls between who and what; a
 * wrap left to the browser split "AI research" in two. Each phrase in
 * `restates` is copied from kyo-web.blog.meta.description and must still be in
 * it. No colon, dash, semicolon or parenthesis: the owner's rule for copy.
 */
const CARDS = [
  {
    locale: 'en',
    out: resolve(REPO_ROOT, 'public/og-blog-en.jpg'),
    line: ['Cristian D. Moreno writes about', 'AI research, Linux and programming'],
    restates: ['Cristian D. Moreno', 'AI research, Linux and programming'],
    url: 'kyonax.com/blog',
  },
  {
    locale: 'es',
    out: resolve(REPO_ROOT, 'public/og-blog-es.jpg'),
    line: ['Cristian D. Moreno escribe sobre', 'IA, Linux y programación'],
    restates: ['Cristian D. Moreno', 'IA, Linux y programación'],
    url: 'kyonax.com/es/blog',
  },
];

head('generate-og-blog — blog social cards');

const _dataUri = (rel) => {
  const p = resolve(REPO_ROOT, rel);
  if (!existsSync(p)) {
    fail(`missing font: ${rel}`);
    process.exit(1);
  }
  return `data:font/woff2;base64,${readFileSync(p).toString('base64')}`;
};

/* ── copy and galaxy, straight from the source ──────────────────────────── */
const VITE_NODE = resolve(REPO_ROOT, 'node_modules/.bin/vite-node');
if (!existsSync(VITE_NODE)) {
  fail('vite-node not installed (ships with vitest). Run `npm i`.');
  process.exit(1);
}

const TMP_DIR = resolve(REPO_ROOT, '.cache/og-blog');
mkdirSync(TMP_DIR, { recursive: true });
const entry = resolve(TMP_DIR, 'copy.mjs');
writeFileSync(entry, `
import { galaxyFrame, galaxyPhase } from '@composables/ascii-galaxy-frame';
import { TRANSLATIONS } from '@data/snippets';
const pick = (l) => {
  const b = TRANSLATIONS[l]['kyo-web'].blog;
  return { title: b.title, chip: b['made-with'], description: b.meta.description };
};
process.stdout.write(JSON.stringify({
  en: pick('en'),
  es: pick('es'),
  galaxy: galaxyFrame(galaxyPhase(0)),
}));
`);
const r = spawnSync(VITE_NODE, [entry], { encoding: 'utf8', cwd: REPO_ROOT });
try {
  rmSync(entry);
} catch { /* noop */ }
if (r.status !== 0) {
  fail(`could not read i18n copy: ${r.stderr.trim()}`);
  process.exit(1);
}
const SOURCE = JSON.parse(r.stdout);
const COPY = new Map([['en', SOURCE.en], ['es', SOURCE.es]]);

for (const card of CARDS) {
  const drifted = card.restates.filter((p) => !COPY.get(card.locale).description.includes(p));
  if (drifted.length) {
    fail(`${card.locale}: kyo-web.blog.meta.description no longer says "${drifted.join('", "')}" — reword the card's line to match it`);
    process.exit(1);
  }
}

/*
 * THE GALAXY AT CARD SIZE. The grid is 96 × 42 characters and SpaceMono's
 * advance is 0.6125em, so 96 columns are 58.8em: 9.6px sets it 564px wide in
 * a 535px panel. That is the desktop hero's own arrangement: the box overflows
 * both sides equally and the panel clips only the outermost, vignetted
 * columns, so the disc fills the panel and the vignette, not the panel's edge,
 * is where it ends. The line height keeps the hero's ratio (12.5 / 11.5).
 */
const GALAXY_FS = 9.6;
const GALAXY_LH = +(GALAXY_FS * 12.5 / 11.5).toFixed(2);

/* The name in the line is bright, as it is in the hero's subtitle, where it is
   the link home. A phrase without the name renders in one tone. */
const OWNER_NAME = 'Cristian D. Moreno';
const _phrase = (text) => {
  const at = text.indexOf(OWNER_NAME);
  const words = at < 0
    ? text
    : `${text.slice(0, at)}<b>${OWNER_NAME}</b>${text.slice(at + OWNER_NAME.length)}`;
  return `<span>${words}</span>`;
};

const _page = (card) => {
  const c = COPY.get(card.locale);
  return `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face{font-family:"Geomanist";src:url("${_dataUri(FONTS.geomanist)}") format("woff2");font-weight:400}
@font-face{font-family:"Geomanist";src:url("${_dataUri(FONTS.geomanistBold)}") format("woff2");font-weight:700}
@font-face{font-family:"SpaceMono";src:url("${_dataUri(FONTS.mono)}") format("woff2");font-weight:400}
*{margin:0;padding:0;box-sizing:border-box}
body{width:${WIDTH}px;height:${HEIGHT}px;background:${CLR.bg};overflow:hidden;position:relative;
  font-family:"SpaceMono",monospace;-webkit-font-smoothing:antialiased}
/* The hero, framed: its top rule, and a bottom one where the marquee's top
   rule sits under it on the page. Two columns, the text's and the panel's. */
.sheet{position:absolute;inset:56px 64px;display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);
  border-top:1px solid ${CLR.border};border-bottom:1px solid ${CLR.border}}
/* Flush left, like the hero's text: the title starts on the rule's edge. */
.text{display:flex;flex-direction:column;justify-content:center;padding-right:40px}
.title{font-family:"Geomanist",sans-serif;font-weight:700;font-size:92px;line-height:1;
  letter-spacing:-0.01em;color:${CLR.fg};text-wrap:balance;margin-bottom:26px}
/* One phrase per row and never wrapped: a phrase too wide for the column
   fails the run below instead of breaking where the browser likes. */
.line{font-family:"Geomanist",sans-serif;font-size:30px;line-height:1.4;letter-spacing:0.012em;
  color:${CLR.body};margin-bottom:30px}
.line span{display:block;white-space:nowrap}
.line b{font-weight:400;color:${CLR.fg}}
.url{font-size:22px;letter-spacing:0.08em;color:${CLR.muted}}
/* The panel: its own hairline on the left, the chip in its corner, the
   galaxy centred in what is left and clipped by the panel's box. */
.panel{position:relative;display:flex;flex-direction:column;border-left:1px solid ${CLR.border};overflow:hidden}
.chip{align-self:flex-start;display:flex;align-items:center;gap:12px;padding:12px 18px;
  border-right:1px solid ${CLR.border};border-bottom:1px solid ${CLR.border};
  font-size:20px;line-height:1.5;letter-spacing:0.14em;text-transform:uppercase;color:${CLR.fg}}
/* The ■ is drawn, as on the hero: SpaceMono's subset has no U+25A0. */
.chip::before{content:"";flex:none;width:10px;height:10px;background:${CLR.fg}}
.visual{flex:1 0 auto;display:flex;align-items:center;justify-content:center}
.galaxy{position:relative;flex:none;width:96ch;height:${(42 * GALAXY_LH).toFixed(1)}px;overflow:hidden;
  font-size:${GALAXY_FS}px;line-height:${GALAXY_LH}px;letter-spacing:0;white-space:pre;color:${CLR.dim}}
.galaxy i{font-style:normal;color:${CLR.mid}}
.galaxy b{font-weight:400;color:${CLR.fg}}
/* The hero's vignette: clear through the middle, the ground at the corners. */
.galaxy::after{content:"";position:absolute;inset:0;
  background:radial-gradient(ellipse at center,transparent 55%,${CLR.bg} 100%)}
</style></head><body>
<div class="sheet">
  <div class="text">
    <div class="title">${c.title}</div>
    <div class="line">${card.line.map(_phrase).join('')}</div>
    <div class="url">${card.url}</div>
  </div>
  <div class="panel">
    <div class="chip">${c.chip}</div>
    <div class="visual"><pre class="galaxy">${SOURCE.galaxy}</pre></div>
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

for (const card of CARDS) {
  const page = await browser.newPage();
  await page.setViewport({ width: WIDTH, height: HEIGHT, deviceScaleFactor: 1 });
  await page.setContent(_page(card), { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  const problems = await page.evaluate(() => {
    const out = [];
    /* An embedded face that failed to load would render in a system font and
       still "work"; the card would then differ from machine to machine. Every
       declared face is used on the card, so every one must have loaded. */
    for (const face of document.fonts) {
      if (face.status !== 'loaded') {
        out.push(`${face.family} ${face.weight} is ${face.status}`);
      }
    }
    for (const sel of ['.title', '.line', '.url', '.chip']) {
      const el = document.querySelector(sel);
      const box = el.getBoundingClientRect();
      if (box.right > window.innerWidth - 8 || box.bottom > window.innerHeight - 8) {
        out.push(`${sel} runs off the card (right ${Math.round(box.right)}, bottom ${Math.round(box.bottom)})`);
      }
      if (el.scrollWidth > el.clientWidth + 1) {
        out.push(`${sel} clipped`);
      }
    }
    return out;
  });
  if (problems.length) {
    fail(`${card.locale}: ${problems.join(', ')}`);
    process.exitCode = 1;
  }
  await page.screenshot({ path: card.out, type: 'jpeg', quality: 92 });
  await page.close();
  ok(`wrote ${card.out.replace(`${REPO_ROOT}/`, '')}`);
}

await browser.close();
