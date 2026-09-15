/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 */

/*
 * constructs.spec.js — every construct org2html renders, measured on the
 * kitchen-sink article, in both languages, at every width in viewports.js.
 *
 * WHY ONE ARTICLE. The other specs measure whichever post happened to carry a
 * construct, so a construct no post used yet was never measured at all. The
 * kitchen-sink article exists to exercise EVERY construct the engine emits,
 * which makes it the one page where "does this survive a phone" can be asked
 * of all of them at once.
 *
 * WRITTEN RED, AS AN AUDIT. It is run against the first build that carries the
 * article, before the site's CSS is fixed, and its failure list IS the work
 * list. So no family stops at the first wrong box: each one collects EVERY
 * offender at a width into one message that names the construct, the
 * selector, the width and the measured value, and one failure never hides
 * another.
 *
 * TEN FAMILIES, one test per width each — (i) and (j) added on 2026-09-12,
 * after the owner read the page on a phone:
 *   (a) the document never scrolls sideways — and the widest offender is named;
 *   (b) each construct keeps 12px from both viewport edges — a full-bleed
 *       breakout may touch them, but (a) still holds it to the document;
 *   (c) every control is at least a 24px target (WCAG 2.5.8);
 *   (d) code is set at 13px or more, and a 360px phone shows 34 characters of
 *       a line before the block has to scroll;
 *   (e) the chart's labels render 9px tall, or the chart carries the site's
 *       zoom button that opens it in the image viewer;
 *   (f) inline code, verbatim, links and math never run past the right edge of
 *       the block they sit in;
 *   (g) a vertical swipe over the diagram still scrolls the page;
 *   (h) <html> pins -webkit-text-size-adjust to 100%;
 *   (i) every display equation fits its column — its frame scrolls, but a
 *       phone shows no bar, so an equation wider than the column read as cut;
 *   (j) below `sm` code wraps by default, and every block whose lines do not
 *       fit offers a WRAP toggle of at least 24px that says which state it is.
 *
 * WHERE EVERY CLASS COMES FROM — confirmed in the engine (org-2-html), not
 * guessed. The site ships the same runtime and book minified, as
 * public/blog/o2h.js and public/blog/style-book.css.
 *   .org-root            src/renderer/html-renderer.ts:266
 *   .org-paragraph       html-renderer.ts:809
 *   .org-src             src/plugins/code-highlight.ts:68 (highlighted), :87 (no
 *                        grammar), html-renderer.ts:1028 (highlighting off) — the
 *                        <pre>, inside the .org-src-block frame, code-highlight.ts:175
 *   .org-src-copy        code-highlight.ts:152 — the ENGINE emits it; o2h.js:81
 *                        only wires the click
 *   .org-table-scroll    html-renderer.ts:961
 *   .org-quote           html-renderer.ts:1035
 *   .org-callout         html-renderer.ts:468
 *   .org-footnote        html-renderer.ts:164 · .org-footnote-back :165
 *   .org-math            html-renderer.ts:1106, src/plugins/math.ts:92 — inline;
 *   .org-math-display    the same span plus the modifier, a block (kwo.css:2025)
 *   .org-figure          html-renderer.ts:807
 *   .org-embed           src/plugins/shortcode.ts:116 (YouTube), :230 (X)
 *   .org-embed-facade    shortcode.ts:119, :232 (and the hero, html-renderer.ts:247)
 *   .org-tab             html-renderer.ts:1003 — engine-emitted; o2h.js:642 wires it
 *   .org-code            html-renderer.ts:396 · .org-verbatim :398 · .org-link :1090
 *   .org-chart           html-renderer.ts:966 · .org-chart-label chart.ts:147
 *   .org-carousel        templates/o2h.js:157 — built AT RUNTIME around an authored
 *                        .org-carousel-strip with two or more slides
 *   .org-carousel-btn    o2h.js:281 · .org-carousel-dot o2h.js:303 — runtime
 *   .org-diagram-scroll  the authored frame (kwo.css:746); o2h.js:1043 upgrades it,
 *                        adding .org-diagram-stage (:790), .org-diagram-tools (:802)
 *                        and .is-interactive (:799)
 *   .org-full-bleed      shortcode.ts:85/:200, html-renderer.ts:699, styles.css:1255
 *   .blog-chart-zoom     the SITE's, src/composables/use-blog-lightbox.js:138
 *
 * ONE LANE SELECTOR DOES NOT MEAN WHAT IT SAYS. `.org-diagram-zoom`
 * (o2h.js:849) is the `role="status"` percentage readout between the zoom
 * buttons, not a control; nobody taps it. The diagram's controls are the
 * unclassed <button>s the runtime puts in .org-diagram-tools (o2h.js:805-814:
 * zoom out, zoom in, fit, PNG), so (c) measures `.org-diagram-tools button`.
 *
 * ONE PAGE PER WIDTH PER LOCALE. Every family at a width reads the same loaded
 * page: each width is a describe run in order in one worker (`mode: 'default'`),
 * and its beforeAll opens the article once. 'default' and not 'serial' on
 * purpose — serial skips everything after a failure, which is the opposite of
 * an audit. When a test fails Playwright starts a fresh worker, and beforeAll
 * simply loads the page again for the families still to run.
 *
 * NOT BUILT IS ONE FAILURE, NOT 112. vite preview answers a route dist/ does
 * not have with the landing shell and HTTP 200, so the tell is the missing
 * .org-root. Each locale has one "is built" test that fails on it; every
 * measurement under an unbuilt locale is skipped with the same reason.
 *
 * HERMETIC. The site appends the Umami tracker after mount; it is answered
 * with an empty script, exactly as analytics.spec.js does. Every other
 * request that leaves the preview server is aborted too — on an article that
 * is the YouTube poster, whose box the stage's `aspect-ratio` reserves
 * (styles.css:1038), so no measurement moves and no run needs the network.
 * The embeds are facades and nothing here clicks them.
 */

import { expect, test } from '@playwright/test';

import { settle, WIDTHS } from './viewports.js';

/* The two halves of the kitchen sink. The Spanish one is written a wave after
   the English one; until it is built, its half fails once and skips the rest. */
const ARTICLES = [
  { locale: 'EN', path: '/blog/engineering/2026-08-13-everything-org2html-renders' },
  { locale: 'ES', path: '/es/blog/engineering/2026-08-13-todo-lo-que-org2html-renderiza' },
];

const BUILT_TITLE = 'the kitchen-sink article is built';

const HEIGHT = 900;

/* layout.spec.js's gutter floor: the site's `.doc` gutter bottoms out at 15px,
   asserted a little under it so sub-pixel rounding is not a failure while a
   cancelled padding, which lands at 0, always is. */
const MIN_INSET = 12;

/* WCAG 2.5.8 (AA): 24 CSS px is the floor for a pointer target. */
const MIN_TARGET = 24;

const MIN_CODE_PX = 13;
const MIN_CODE_CHARS = 34;
/* The width the characters-per-line floor is asserted at: the common Android. */
const CODE_CHARS_AT = 360;

const MIN_LABEL_PX = 9;

/* How far past its block an inline element may reach before it counts, and
   the allowance a line of code gets for a glyph that is clipped by a fraction
   of a pixel. Both are rounding, not room. */
const SUBPIXEL = 0.5;

/* The runtime is `defer` and the chart button mounts at hydration, so both are
   normally done long before `settle` returns; this is the ceiling, not a wait. */
const RUNTIME_TIMEOUT = 5_000;
const POLL_MS = 100;

/* Glyphs in the probe that measures one character of the code's own font. */
const PROBE_CHARS = 100;

/* Offenders listed per selector in (f) before the rest are only counted. */
const SHOWN = 5;

/* (b) The constructs that must keep the gutter. */
const INSET = [
  '.org-paragraph',
  '.org-src',
  '.org-table-scroll',
  '.org-quote',
  '.org-callout',
  '.org-footnote',
  '.org-math-display',
  '.org-figure',
  '.org-embed',
  '.org-carousel',
];

/* (c) The controls a finger has to hit. `.org-diagram-tools button` stands in
   for the lane's `.org-diagram-zoom`, which is a readout — see the header. */
const TARGETS = [
  '.org-src-copy',
  '.org-footnote-back',
  '.org-carousel-dot',
  '.org-carousel-btn',
  '.org-tab',
  '.org-embed-facade',
  '.org-diagram-tools button',
];

/* (f) The inline constructs. Only INLINE math: the display form is a block of
   its own, scrolls sideways by design (kwo.css:2035), and is measured in (b). */
const INLINE = [
  '.org-code',
  '.org-verbatim',
  '.org-link',
  '.org-math:not(.org-math-display)',
];

/* Measured selectors that exist only once o2h.js has run, so their absence may
   mean the runtime never finished rather than that the article lacks them. */
const RUNTIME_BUILT = new Set([
  '.org-carousel',
  '.org-carousel-dot',
  '.org-carousel-btn',
  '.org-diagram-tools button',
]);

/* Umami Cloud serves the tracker from umami.is and may collect on umami.dev —
   the same net analytics.spec.js casts. */
const UMAMI_HOST = /(^|\.)umami\.(is|dev)$/;

/* Answer the tracker with an empty script; abort everything else that is not
   the preview server. */
const answerNetwork = (page, baseURL) => {
  const home = new URL(baseURL).host;
  return page.route((url) => url.host !== home, (route) => {
    const url = new URL(route.request().url());
    return UMAMI_HOST.test(url.hostname) && url.pathname === '/script.js'
      ? route.fulfill({ status: 200, contentType: 'application/javascript', body: '' })
      : route.abort();
  });
};

/* Load the article, let it hydrate, and say whether it is built. The fonts are
   awaited as well: (d) measures a glyph, and a fallback face is not the code's. */
const openArticle = async (page, path) => {
  const response = await page.goto(path);
  await settle(page);
  await page.evaluate(() => document.fonts.ready.then(() => true));
  const status = response ? response.status() : 0;
  const roots = await page.locator('.org-root').count();
  return { status, roots, built: status > 0 && status < 400 && roots > 0 };
};

const notBuilt = (path, { status, roots }) => {
  const why = status > 0 && status < 400
    ? ' — vite preview answers a route dist/ lacks with the landing shell, so the missing .org-root is the tell'
    : '';
  return `the kitchen-sink article (${path}) is not built: HTTP ${status}, ${roots} .org-root on the page${why}`;
};

/*
 * What the runtime and the site have NOT built yet. Runs in the page. Empty
 * means every enhancement the article's markup asks for is in place: o2h.js
 * has booted, wrapped each carousel strip, upgraded each diagram and wired each
 * tab group, and the lightbox directive has given each chart its zoom button.
 */
const runtimePending = () => {
  const root = document.querySelector('.org-root');
  const pending = [];
  if (!window.O2H) {
    pending.push('window.O2H (o2h.js never booted)');
  }
  if (!root) {
    return pending;
  }
  for (const strip of root.querySelectorAll('.org-carousel-strip')) {
    if (strip.children.length > 1 && !strip.closest('.org-carousel')) {
      pending.push('the .org-carousel around a .org-carousel-strip');
    }
  }
  for (const frame of root.querySelectorAll('.org-diagram-scroll')) {
    if (frame.querySelector('svg') && !frame.querySelector('.org-diagram-stage')) {
      pending.push('the .org-diagram-stage in a .org-diagram-scroll');
    }
  }
  for (const tabs of root.querySelectorAll('[data-o2h="tabs"]')) {
    if (!tabs.hasAttribute('data-o2h-init-tabs')) {
      pending.push('the wiring of a [data-o2h="tabs"] group');
    }
  }
  for (const chart of root.querySelectorAll('.org-chart')) {
    if (chart.querySelector('svg') && !chart.querySelector('.blog-chart-zoom')) {
      pending.push('the .blog-chart-zoom on a .org-chart');
    }
  }
  /* article-enhance.js marks the body once it has measured with the real
     faces: the WRAP toggles and the fitted equations exist from then on. */
  const body = root.closest('.blog-rich');
  if (body && body.dataset.enhanced !== 'on') {
    pending.push('article-enhance.js (the body carries no data-enhanced="on")');
  }
  return [...new Set(pending)];
};

/* Poll until nothing is pending or the ceiling passes, and return what is
   still missing so a failure can say the script, not the layout, is at fault. */
const waitForRuntime = async (page) => {
  const deadline = Date.now() + RUNTIME_TIMEOUT;
  let pending = await page.evaluate(runtimePending);
  while (pending.length > 0 && Date.now() < deadline) {
    await page.waitForTimeout(POLL_MS);
    pending = await page.evaluate(runtimePending);
  }
  return pending;
};

const stillPending = (pending) => (pending.length > 0
  ? `; still pending after ${RUNTIME_TIMEOUT} ms: ${pending.join(', ')}`
  : '');

/* "The construct is missing, not narrow" — its own failure, never a pass. */
const absent = (selector, pending) => {
  const base = `the article renders no ${selector} — the construct is missing, not narrow`;
  if (!RUNTIME_BUILT.has(selector)) {
    return base;
  }
  return `${base} (o2h.js builds it after load${stillPending(pending)})`;
};

const px = (n) => `${n.toFixed(1)}px`;

const verdict = (article, width, family, offenders) => (
  `${article.locale} at ${width}px, ${family}: ${offenders.join('; ')}`
);

/*
 * (a) THE SIDEWAYS WALKER — copied from layout.spec.js's "does not scroll
 * sideways" test, which does not export it. Same rule: an element inside a
 * scroller is fine, that is what the scroller is for, so only elements past
 * the edge with no scrolling ancestor are named. Two changes: the class is
 * read with getAttribute, so an SVG node names its class instead of an
 * SVGAnimatedString, and the offenders are counted as well as the widest named.
 */
const sidewaysScroll = () => {
  const d = document.documentElement;
  const scrolled = (el) => {
    for (let p = el.parentElement; p; p = p.parentElement) {
      const ox = getComputedStyle(p).overflowX;
      if (ox === 'auto' || ox === 'scroll') {
        return true;
      }
    }
    return false;
  };
  let worst = null;
  let count = 0;
  for (const el of document.querySelectorAll('body *')) {
    const r = el.getBoundingClientRect();
    if (r.right > d.clientWidth + 1 && !scrolled(el)) {
      count += 1;
      if (!worst || r.right > worst.right) {
        worst = {
          right: Math.round(r.right),
          tag: el.tagName.toLowerCase(),
          cls: (el.getAttribute('class') || '').slice(0, 60),
        };
      }
    }
  }
  return { scrollWidth: d.scrollWidth, clientWidth: d.clientWidth, widest: worst, count };
};

/*
 * (b) Each construct's distance from both viewport edges, worst per side.
 * Three kinds of element are set aside rather than measured: a full-bleed
 * breakout (designed to reach the edges); anything inside a scroller within
 * the article (a slide scrolled off to the side is where the scroller put it);
 * and anything with no box (a closed tab panel). `.org-wide` is NOT set aside:
 * it caps at the gutter, and this site zeroes the book's gutter
 * (`--host-gutter: 0px`, blog-post.vue), so it is exactly what can go wrong.
 */
const measureInsets = ({ selectors, floor }) => {
  const root = document.querySelector('.org-root');
  const edge = document.documentElement.clientWidth;
  const scrolled = (el) => {
    for (let p = el.parentElement; p && p !== root; p = p.parentElement) {
      const ox = getComputedStyle(p).overflowX;
      if (ox === 'auto' || ox === 'scroll') {
        return true;
      }
    }
    return false;
  };
  const side = (insets) => ({
    worst: insets.length > 0 ? Math.min(...insets) : null,
    short: insets.filter((v) => v < floor).length,
  });
  return selectors.map((selector) => {
    const all = [...root.querySelectorAll(selector)];
    const candidates = all.filter((el) => !el.closest('.org-full-bleed') && !scrolled(el));
    const boxes = candidates
      .map((el) => el.getBoundingClientRect())
      .filter((r) => r.width > 0 && r.height > 0);
    return {
      selector,
      count: all.length,
      candidates: candidates.length,
      measured: boxes.length,
      left: side(boxes.map((r) => r.left)),
      right: side(boxes.map((r) => edge - r.right)),
    };
  });
};

/* (c) The rendered size of every visible control. */
const measureTargets = (selectors) => {
  const root = document.querySelector('.org-root');
  return selectors.map((selector) => {
    const all = [...root.querySelectorAll(selector)];
    const boxes = all
      .map((el) => el.getBoundingClientRect())
      .filter((r) => r.width > 0 && r.height > 0)
      .map((r) => ({ w: r.width, h: r.height }));
    return { selector, count: all.length, boxes };
  });
};

/*
 * (d) Per code block: the size its code is set at, the width of one glyph of
 * that font, and how much of a line is visible before the block clips it.
 *
 * THE GLYPH IS MEASURED, NOT ASSUMED. A span of PROBE_CHARS zeros is put inside
 * the block's own <code>, so it inherits the face, size, tracking and features
 * the code has, measured, and removed in the same task.
 *
 * THE LINE STARTS WHERE THE CODE STARTS. The numbered gutter is a ::before on
 * each Shiki `.line`, so the first character of the first non-empty line — not
 * the <pre>'s padding edge — is column 0. The line ends at the nearest clip:
 * the <pre>'s padding box, any clipping frame around it (.org-src-block is
 * `overflow: hidden`), or the viewport.
 */
const measureCode = (probeChars) => {
  const root = document.querySelector('.org-root');
  const edge = document.documentElement.clientWidth;
  const columnZero = (pre) => {
    const lines = [...pre.querySelectorAll('.line')];
    const scope = lines.find((line) => line.textContent.length > 0) || pre.querySelector('code') || pre;
    const walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT);
    for (let t = walker.nextNode(); t; t = walker.nextNode()) {
      if (t.textContent.length > 0 && !t.textContent.startsWith('\n')) {
        const range = document.createRange();
        range.setStart(t, 0);
        range.setEnd(t, 1);
        return range.getBoundingClientRect().left;
      }
    }
    return null;
  };
  return [...root.querySelectorAll('.org-src')].map((pre) => {
    const box = pre.getBoundingClientRect();
    if (box.width === 0 || box.height === 0) {
      return { hidden: true };
    }
    const holder = pre.querySelector('code') || pre;
    const probe = document.createElement('span');
    probe.textContent = '0'.repeat(probeChars);
    probe.style.position = 'absolute';
    probe.style.visibility = 'hidden';
    probe.style.whiteSpace = 'pre';
    holder.append(probe);
    const glyph = probe.getBoundingClientRect().width / probeChars;
    probe.remove();

    const padLeft = Number.parseFloat(getComputedStyle(pre).paddingLeft);
    const start = columnZero(pre) ?? box.left + pre.clientLeft + padLeft;
    let right = Math.min(edge, box.left + pre.clientLeft + pre.clientWidth);
    for (let p = pre.parentElement; p && p !== root; p = p.parentElement) {
      if (getComputedStyle(p).overflowX !== 'visible') {
        const r = p.getBoundingClientRect();
        right = Math.min(right, r.left + p.clientLeft + p.clientWidth);
      }
    }
    return {
      hidden: false,
      size: Number.parseFloat(getComputedStyle(holder).fontSize),
      glyph,
      visible: right - start,
    };
  });
};

/* (e) Per chart: the smallest rendered category label, and whether the site's
   zoom button is there to open the chart in the viewer. */
const measureCharts = () => {
  const root = document.querySelector('.org-root');
  return [...root.querySelectorAll('.org-chart')].map((figure) => {
    const box = figure.getBoundingClientRect();
    const heights = [...figure.querySelectorAll('.org-chart-label')]
      .map((t) => t.getBoundingClientRect().height)
      .filter((h) => h > 0);
    const zoom = figure.querySelector('.blog-chart-zoom');
    const z = zoom ? zoom.getBoundingClientRect() : null;
    const caption = figure.querySelector('figcaption');
    return {
      hidden: box.width === 0 && box.height === 0,
      caption: caption ? caption.textContent.replace(/\s+/g, ' ').trim().slice(0, 40) : '',
      smallest: heights.length > 0 ? Math.min(...heights) : null,
      zoom: Boolean(z && z.width > 0 && z.height > 0),
    };
  });
};

/*
 * (f) Inline elements that run past the right edge of the block they sit in —
 * the nearest ancestor that is not itself inline (a paragraph, a list item, a
 * cell, a caption). A long unbreakable `code` span is the usual culprit: the
 * paragraph wraps, the span does not, and it paints over the gutter.
 */
const measureInline = ({ selectors, slack, shown }) => {
  const root = document.querySelector('.org-root');
  const blockOf = (el) => {
    for (let p = el.parentElement; p; p = p.parentElement) {
      const display = getComputedStyle(p).display;
      if (!display.startsWith('inline') && display !== 'contents') {
        return p;
      }
    }
    return root;
  };
  const name = (el) => {
    const cls = (el.getAttribute('class') || '').trim().split(/\s+/)[0];
    return cls ? `<${el.localName} class="${cls}">` : `<${el.localName}>`;
  };
  return selectors.map((selector) => {
    const all = [...root.querySelectorAll(selector)];
    const over = [];
    for (const el of all) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 && r.height === 0) {
        continue;
      }
      const block = blockOf(el);
      const limit = block.getBoundingClientRect().right;
      if (r.right > limit + slack) {
        const text = (el.textContent || '').replace(/\s+/g, ' ').trim();
        over.push({
          text: text.length > 40 ? `${text.slice(0, 40)}…` : text,
          by: r.right - limit,
          block: name(block),
        });
      }
    }
    return { selector, count: all.length, total: over.length, shown: over.slice(0, shown) };
  });
};

/*
 * (g) Every surface a finger can land on inside a diagram frame — the drawing,
 * the stage the runtime wraps it in, and the frame itself — must let a
 * vertical pan through. The frame alone is not enough: touch-action is
 * intersected down the ancestor chain, so a `none` on any of the three turns
 * a swipe that meant "scroll on" into a drag of the drawing.
 */
const measureDiagrams = () => {
  const root = document.querySelector('.org-root');
  const pans = (action) => action === 'auto' || action === 'manipulation' || /\bpan-y\b/.test(action);
  const name = (el) => `<${el.localName} class="${(el.getAttribute('class') || '').trim().slice(0, 60)}">`;
  return [...root.querySelectorAll('.org-diagram-scroll')].map((frame) => {
    const box = frame.getBoundingClientRect();
    const chain = [];
    for (let el = frame.querySelector('svg') || frame; el; el = el.parentElement) {
      chain.push(el);
      if (el === frame) {
        break;
      }
    }
    return {
      hidden: box.width === 0 && box.height === 0,
      upgraded: Boolean(frame.querySelector('.org-diagram-stage')),
      blocked: chain
        .map((el) => ({ el, action: getComputedStyle(el).touchAction }))
        .filter(({ action }) => !pans(action))
        .map(({ el, action }) => `${name(el)} touch-action: ${action}`),
    };
  });
};

/*
 * (h) Chromium computes and reports -webkit-text-size-adjust (as `auto` when
 * nothing sets it) even though only its mobile builds act on it, so a desktop
 * run can still read the declaration. Where Chromium aliases the prefixed and
 * standard names it cannot tell which spelling the sheet used — and iOS Safari
 * reads only the prefixed one, so the fix should write both.
 */
/* (i) Every display equation's frame, and how much of it would need a scroll. */
const measureDisplayMath = () => [...document.querySelectorAll('.org-root .org-math-display')].map((frame) => ({
  text: frame.textContent.trim().slice(0, 30),
  hidden: frame.getBoundingClientRect().width === 0,
  sw: frame.scrollWidth,
  cw: frame.clientWidth,
}));

/* (j) Every code block: whether its <pre> scrolls sideways, and its WRAP toggle
   — absent, hidden, or shown with its size and pressed state. */
const measureCodeWrap = () => [...document.querySelectorAll('.org-root .org-src-block')].map((block) => {
  const pre = block.querySelector('pre.org-src');
  const button = block.querySelector('.blog-code-wrap');
  const shown = button && !button.hidden ? button.getBoundingClientRect() : null;
  return {
    lang: pre ? pre.dataset.lang || 'plain' : 'none',
    hidden: !pre || pre.getBoundingClientRect().width === 0,
    sw: pre ? pre.scrollWidth : 0,
    cw: pre ? pre.clientWidth : 0,
    button: shown ? { w: shown.width, h: shown.height, pressed: button.getAttribute('aria-pressed') } : null,
  };
});

/* Code wraps by default below `sm` — the complement of min-media-query(sm). */
const WRAP_BELOW = 768;

const readTextSizeAdjust = () => {
  const cs = getComputedStyle(document.documentElement);
  return {
    prefixed: cs.getPropertyValue('-webkit-text-size-adjust').trim(),
    standard: cs.getPropertyValue('text-size-adjust').trim(),
  };
};

for (const article of ARTICLES) {
  test.describe(`${article.locale} kitchen sink (${article.path})`, () => {
    test(BUILT_TITLE, async ({ page, baseURL }) => {
      await answerNetwork(page, baseURL);
      const opened = await openArticle(page, article.path);
      expect(opened.built, notBuilt(article.path, opened)).toBe(true);
    });

    for (const width of WIDTHS) {
      test.describe(`at ${width}px`, () => {
        test.describe.configure({ mode: 'default' });

        const state = { context: null, page: null, missing: '', pending: [] };

        test.beforeAll(async ({ browser }, testInfo) => {
          const { baseURL, userAgent, deviceScaleFactor, isMobile, hasTouch } = testInfo.project.use;
          state.context = await browser.newContext({
            baseURL,
            userAgent,
            deviceScaleFactor,
            isMobile,
            hasTouch,
            viewport: { width, height: HEIGHT },
          });
          state.page = await state.context.newPage();
          await answerNetwork(state.page, baseURL);
          const opened = await openArticle(state.page, article.path);
          if (!opened.built) {
            state.missing = `${notBuilt(article.path, opened)} — skipped; "${BUILT_TITLE}" carries the failure`;
            return;
          }
          state.pending = await waitForRuntime(state.page);
        });

        test.afterAll(async () => {
          if (state.context) {
            await state.context.close();
          }
        });

        test('(a) the page does not scroll sideways', async () => {
          test.skip(Boolean(state.missing), state.missing);
          const m = await state.page.evaluate(sidewaysScroll);
          const widest = m.widest
            ? ` — widest: <${m.widest.tag} class="${m.widest.cls}"> reaching ${m.widest.right}px of ${m.clientWidth}px, one of ${m.count} element(s) past the edge outside any scroller`
            : '';
          expect(
            m.scrollWidth,
            `${article.locale} at ${width}px, (a) overflow: the page scrolls ${m.scrollWidth - m.clientWidth}px sideways${widest}`,
          ).toBeLessThanOrEqual(m.clientWidth + 1);
        });

        test(`(b) every construct keeps a ${MIN_INSET}px inset from the viewport edges`, async () => {
          test.skip(Boolean(state.missing), state.missing);
          const results = await state.page.evaluate(measureInsets, { selectors: INSET, floor: MIN_INSET });
          const offenders = [];
          for (const m of results) {
            if (m.count === 0) {
              offenders.push(absent(m.selector, state.pending));
              continue;
            }
            if (m.candidates > 0 && m.measured === 0) {
              offenders.push(`${m.selector}: every one of the ${m.candidates} to measure is hidden (a closed tab panel?) — nothing to measure`);
              continue;
            }
            for (const [name, side] of [['left', m.left], ['right', m.right]]) {
              if (side.short > 0) {
                offenders.push(`${m.selector} ${name} ${px(side.worst)} (${side.short} of ${m.measured} under ${MIN_INSET}px)`);
              }
            }
          }
          expect(offenders, verdict(article, width, '(b) inset', offenders)).toEqual([]);
        });

        test(`(c) every control is at least a ${MIN_TARGET}px tap target`, async () => {
          test.skip(Boolean(state.missing), state.missing);
          const results = await state.page.evaluate(measureTargets, TARGETS);
          const offenders = [];
          for (const m of results) {
            if (m.count === 0) {
              offenders.push(absent(m.selector, state.pending));
              continue;
            }
            if (m.boxes.length === 0) {
              offenders.push(`${m.selector}: ${m.count} in the page, every one hidden — nothing to tap`);
              continue;
            }
            const small = m.boxes.filter((b) => Math.min(b.w, b.h) < MIN_TARGET);
            if (small.length > 0) {
              const worst = small.reduce((a, b) => (Math.min(b.w, b.h) < Math.min(a.w, a.h) ? b : a));
              offenders.push(`${m.selector} ${worst.w.toFixed(1)}×${worst.h.toFixed(1)}px (${small.length} of ${m.boxes.length} under ${MIN_TARGET}px)`);
            }
          }
          expect(offenders, verdict(article, width, '(c) tap targets', offenders)).toEqual([]);
        });

        const codeTitle = width === CODE_CHARS_AT
          ? `(d) code is set at ${MIN_CODE_PX}px or more and shows ${MIN_CODE_CHARS} characters a line`
          : `(d) code is set at ${MIN_CODE_PX}px or more`;
        test(codeTitle, async () => {
          test.skip(Boolean(state.missing), state.missing);
          const blocks = await state.page.evaluate(measureCode, PROBE_CHARS);
          const shown = blocks.filter((b) => !b.hidden);
          const offenders = [];
          if (blocks.length === 0) {
            offenders.push(absent('.org-src', state.pending));
          } else if (shown.length === 0) {
            offenders.push(`.org-src: ${blocks.length} in the page, every one hidden — nothing to measure`);
          }
          const small = shown.filter((b) => b.size < MIN_CODE_PX);
          if (small.length > 0) {
            const least = Math.min(...small.map((b) => b.size));
            offenders.push(`.org-src code is set at ${px(least)} (${small.length} of ${shown.length} blocks under ${MIN_CODE_PX}px)`);
          }
          if (width === CODE_CHARS_AT) {
            const fits = shown.map((b) => ({
              ...b,
              chars: b.glyph > 0 ? Math.floor((b.visible + SUBPIXEL) / b.glyph) : 0,
            }));
            const narrow = fits.filter((b) => b.chars < MIN_CODE_CHARS);
            if (narrow.length > 0) {
              const worst = narrow.reduce((a, b) => (b.chars < a.chars ? b : a));
              offenders.push(`.org-src shows ${worst.chars} characters a line — ${px(worst.visible)} visible at ${worst.glyph.toFixed(2)}px a glyph (${narrow.length} of ${shown.length} blocks under ${MIN_CODE_CHARS})`);
            }
          }
          expect(offenders, verdict(article, width, '(d) code', offenders)).toEqual([]);
        });

        test('(e) the chart\'s labels are legible, or the chart opens in the viewer', async () => {
          test.skip(Boolean(state.missing), state.missing);
          const charts = await state.page.evaluate(measureCharts);
          const offenders = [];
          if (charts.length === 0) {
            offenders.push(absent('.org-chart', state.pending));
          } else if (charts.every((c) => c.hidden)) {
            offenders.push(`.org-chart: ${charts.length} in the page, every one hidden — nothing to measure`);
          }
          for (const [i, c] of charts.entries()) {
            const legible = c.smallest !== null && c.smallest >= MIN_LABEL_PX;
            if (c.hidden || legible || c.zoom) {
              continue;
            }
            const where = c.caption ? `.org-chart #${i + 1} ("${c.caption}")` : `.org-chart #${i + 1}`;
            const labels = c.smallest === null
              ? 'draws no .org-chart-label to measure'
              : `its .org-chart-label text renders ${px(c.smallest)} tall, under ${MIN_LABEL_PX}px`;
            offenders.push(`${where}: ${labels}, and it carries no visible .blog-chart-zoom to open it in the viewer`);
          }
          expect(offenders, verdict(article, width, '(e) chart', offenders)).toEqual([]);
        });

        test('(f) inline code, verbatim, links and math stay inside their block', async () => {
          test.skip(Boolean(state.missing), state.missing);
          const results = await state.page.evaluate(measureInline, { selectors: INLINE, slack: SUBPIXEL, shown: SHOWN });
          const offenders = [];
          for (const m of results) {
            if (m.count === 0) {
              offenders.push(absent(m.selector, state.pending));
              continue;
            }
            for (const o of m.shown) {
              offenders.push(`${m.selector} "${o.text}" runs ${px(o.by)} past its ${o.block}`);
            }
            if (m.total > m.shown.length) {
              offenders.push(`…and ${m.total - m.shown.length} more ${m.selector}`);
            }
          }
          expect(offenders, verdict(article, width, '(f) inline overflow', offenders)).toEqual([]);
        });

        test('(g) a vertical swipe over the diagram still scrolls the page', async () => {
          test.skip(Boolean(state.missing), state.missing);
          const frames = await state.page.evaluate(measureDiagrams);
          const offenders = [];
          if (frames.length === 0) {
            offenders.push(absent('.org-diagram-scroll', state.pending));
          } else if (frames.every((f) => f.hidden)) {
            offenders.push(`.org-diagram-scroll: ${frames.length} in the page, every one hidden — nothing to measure`);
          }
          for (const [i, f] of frames.entries()) {
            if (f.hidden) {
              continue;
            }
            if (!f.upgraded) {
              offenders.push(`diagram #${i + 1}: o2h.js never upgraded its .org-diagram-scroll (no .org-diagram-stage${stillPending(state.pending)}) — the frame measured is not the one a reader gets`);
            }
            if (f.blocked.length > 0) {
              offenders.push(`diagram #${i + 1}: ${f.blocked.join(', ')} — a vertical swipe over it cannot scroll the page`);
            }
          }
          expect(offenders, verdict(article, width, '(g) touch-action', offenders)).toEqual([]);
        });

        test('(h) the page pins -webkit-text-size-adjust to 100%', async () => {
          test.skip(Boolean(state.missing), state.missing);
          const m = await state.page.evaluate(readTextSizeAdjust);
          const value = m.prefixed || m.standard;
          expect(
            value,
            `${article.locale} at ${width}px, (h) text-size-adjust: <html> computes -webkit-text-size-adjust as "${m.prefixed || 'nothing'}" and text-size-adjust as "${m.standard || 'nothing'}", not 100% — a phone turned to landscape may inflate the text`,
          ).toBe('100%');
        });

        test('(i) every display equation fits its column', async () => {
          test.skip(Boolean(state.missing), state.missing);
          const frames = await state.page.evaluate(measureDisplayMath);
          const offenders = [];
          if (frames.length === 0) {
            offenders.push(absent('.org-math-display', state.pending));
          }
          for (const f of frames) {
            if (!f.hidden && f.sw > f.cw + 1) {
              offenders.push(`.org-math-display "${f.text}…" is ${f.sw}px in a ${f.cw}px column, ${f.sw - f.cw}px behind a sideways scroll with no bar on a phone${stillPending(state.pending)}`);
            }
          }
          expect(offenders, verdict(article, width, '(i) display math', offenders)).toEqual([]);
        });

        const phone = width < WRAP_BELOW;
        test(phone
          ? '(j) code wraps by default, and a long block offers a pressed WRAP toggle'
          : '(j) a block that scrolls sideways offers a WRAP toggle', async () => {
          test.skip(Boolean(state.missing), state.missing);
          const blocks = (await state.page.evaluate(measureCodeWrap)).filter((b) => !b.hidden);
          const offenders = [];
          if (blocks.length === 0) {
            offenders.push(absent('.org-src-block', state.pending));
          }
          for (const [i, b] of blocks.entries()) {
            const where = `code block #${i + 1} (${b.lang})`;
            const scrolls = b.sw > b.cw + 1;
            if (phone && scrolls) {
              offenders.push(`${where} scrolls ${b.sw - b.cw}px sideways — below ${WRAP_BELOW}px a phone's code wraps by default`);
            }
            if (!phone && scrolls && !b.button) {
              offenders.push(`${where} scrolls ${b.sw - b.cw}px sideways and offers no WRAP toggle${stillPending(state.pending)}`);
            }
            if (b.button && Math.min(b.button.w, b.button.h) < MIN_TARGET) {
              offenders.push(`${where}: its WRAP toggle is ${b.button.w.toFixed(1)}×${b.button.h.toFixed(1)}px`);
            }
            if (b.button && b.button.pressed !== String(phone)) {
              offenders.push(`${where}: its WRAP toggle reads aria-pressed="${b.button.pressed}" where the block is ${phone ? 'wrapped' : 'scrolling'}`);
            }
          }
          if (phone && blocks.length > 0 && !blocks.some((b) => b.button)) {
            offenders.push(`no code block offers a WRAP toggle, so a reader cannot turn the wrapping off${stillPending(state.pending)}`);
          }
          expect(offenders, verdict(article, width, '(j) code wrap', offenders)).toEqual([]);
        });
      });
    }
  });
}
