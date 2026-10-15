/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 */

/*
 * article-enhance.js — two affordances an article body needs once it is on a
 * real screen: code that can WRAP, and display equations that FIT.
 *
 * ITS OWN CHUNK, fetched after the article mounts (blog-post.vue imports it
 * dynamically), for chart-picture.js's reason: the article chunk is budgeted,
 * and neither of these is the words. It is named `article-…`, not `blog-…`, so
 * the archive's `blog-*` size glob cannot sweep it into a total no visitor of
 * the archive downloads.
 *
 * BOTH ARE CLIENT-ONLY BY NATURE. Whether a line of code is longer than its box
 * and whether an equation is wider than its column are facts about the reader's
 * screen and the fonts it actually loaded — Firefox sets the same MathML 25%
 * wider than Chromium — so neither can be decided at build time.
 *
 * NOTHING HERE MOVES THE PAGE ON LOAD. A phone's code already arrives wrapped:
 * that default is CSS (blog-post.vue), so the only thing this adds to a code
 * block is a button in a header whose height is fixed. The one thing it resizes
 * is an equation, and only one that would otherwise be cut at the column edge.
 */

/* The reader's choice, remembered across articles. '1' wraps, '0' scrolls, and
   no entry means "the default for this screen" — see `effective` below. */
const WRAP_KEY = 'kyo:code-wrap';

/* The complement of min-media-query(sm) — the same band blog-post.vue wraps
   code in by default. max-media-query(sm) would include 768px itself. */
const PHONE = '(max-width: 47.9375em)';

/* The smallest an equation may be scaled to fit, as a share of the book's size.
   Past this its subscripts stop being readable, and scrolling sideways — which
   the book's frame already allows — is the better failure. */
const FIT_FLOOR = 0.65;
/* How many measured steps a fit may take, and how far under the column each
   step aims — see fitMath. */
const FIT_STEPS = 3;
const FIT_AIM = 0.99;
/* Font sizes are set to a tenth of a pixel. */
const TENTHS = 10;

/* A tab counts as this many columns when a line is measured. The book leaves
   `tab-size` alone; 8 is the browser's own. */
const TAB_COLUMNS = 8;

/* Glyphs in the probe that measures one character of the code's face. */
const PROBE_GLYPHS = 100;

/* A line is longer than its box only past rounding. */
const SUBPIXEL = 0.5;

const px = (value) => Number.parseFloat(value) || 0;
const tenth = (value) => Math.floor(value * TENTHS) / TENTHS;

const readWrap = () => {
  try {
    const value = localStorage.getItem(WRAP_KEY);
    if (value === '1') {
      return true;
    }
    return value === '0' ? false : null;
  } catch {
    return null; /* storage blocked: follow the screen's default */
  }
};

const writeWrap = (on) => {
  try {
    localStorage.setItem(WRAP_KEY, on ? '1' : '0');
  } catch {
    /* blocked storage keeps the choice for this page only */
  }
};

/* One character of the code's own face, at its own size. The probe never wraps
   and never paints; it only reports its width. */
const glyphWidth = (code) => {
  const probe = document.createElement('span');
  probe.textContent = '0'.repeat(PROBE_GLYPHS);
  probe.style.cssText = 'position:absolute;visibility:hidden;white-space:pre';
  code.append(probe);
  const width = probe.getBoundingClientRect().width / PROBE_GLYPHS;
  probe.remove();
  return width;
};

/* The longest line of a block, in columns. The line numbers are ::before
   content, so textContent never sees them. */
const longestLine = (code) => code.textContent
  .split('\n')
  .reduce((most, line) => Math.max(most, line.replace(/\t/g, ' '.repeat(TAB_COLUMNS)).length), 0);

/* The width a line of code actually gets: the <pre>'s box without its padding,
   and without the line-number gutter when the block is numbered. */
const lineRoom = (pre) => {
  const cs = getComputedStyle(pre);
  let room = pre.clientWidth - px(cs.paddingLeft) - px(cs.paddingRight);
  const line = pre.querySelector('.line');
  if (line && pre.classList.contains('org-src--numbered')) {
    const gutter = getComputedStyle(line, '::before');
    room -= px(gutter.width) + px(gutter.marginRight);
  }
  return room;
};

/**
 * Wire an article body. Returns a function that undoes every listener; the
 * buttons and the equation sizes live in the v-html content and go with it.
 */
export const enhanceArticle = (root, { wrapLabel, wrapAria }) => {
  const host = root;
  const phone = window.matchMedia(PHONE);
  let wrap = readWrap();

  const effective = () => (wrap === null ? phone.matches : wrap);

  const blocks = [];
  for (const block of root.querySelectorAll('.org-src-block')) {
    const header = block.querySelector('.org-src-header');
    const pre = block.querySelector('pre.org-src');
    const code = pre && pre.querySelector('code');
    if (!header || !code || header.querySelector('.blog-code-wrap')) {
      continue;
    }
    /* A button, never a link, for the tracker: Umami leaves buttons alone. It
       does NOT share the COPY button's class, which would hand it to o2h.js's
       copy handler; blog-post.vue restates that button's look instead. */
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'blog-code-wrap';
    button.textContent = wrapLabel;
    button.setAttribute('aria-label', wrapAria);
    button.dataset.umamiEvent = 'code-wrap';
    button.hidden = true;
    header.insertBefore(button, header.querySelector('.org-src-copy'));
    blocks.push({ button, pre, code, columns: longestLine(code) });
  }

  /* ONE STATE FOR THE WHOLE ARTICLE. A reader who wraps one block on a phone
     wants the next one wrapped too, so the choice lands on the body, not on
     the block — and every button says the same thing. */
  const paint = () => {
    host.classList.toggle('is-code-wrap', wrap === true);
    host.classList.toggle('is-code-nowrap', wrap === false);
    const pressed = String(effective());
    for (const { button } of blocks) {
      button.setAttribute('aria-pressed', pressed);
    }
  };

  /* A block offers the toggle only when one of its lines is longer than the
     box — measured in columns, so the answer is the same wrapped or not. */
  const measureCode = () => {
    if (blocks.length === 0) {
      return;
    }
    const glyph = glyphWidth(blocks[0].code);
    for (const block of blocks) {
      const long = block.columns * glyph > lineRoom(block.pre) + SUBPIXEL;
      block.button.hidden = !(glyph > 0 && long);
    }
  };

  /* An equation wider than its column is set smaller until it fits, down to
     FIT_FLOOR. The book's own size is restored first, so a wider screen — a
     phone turned sideways — gets it back.

     IN STEPS, NOT ONE. MathML does not scale in proportion to its font size —
     operator spacing and stretchy glyphs snap to whole pixels — so one step by
     the measured ratio left the kitchen-sink's derivation 2px over in Firefox.
     Each step re-measures and aims 1% under; three settle every equation on
     the page. */
  const fitMath = () => {
    for (const frame of root.querySelectorAll('.org-math-display')) {
      const math = frame.querySelector('math');
      if (!math) {
        continue;
      }
      math.style.fontSize = '';
      const book = px(getComputedStyle(math).fontSize);
      const over = () => frame.scrollWidth > frame.clientWidth + 1;
      for (let step = 0; step < FIT_STEPS && over(); step += 1) {
        const size = px(getComputedStyle(math).fontSize);
        const ratio = frame.clientWidth / frame.scrollWidth;
        const next = tenth(size * ratio * FIT_AIM);
        if (next < book * FIT_FLOOR) {
          math.style.fontSize = '';
          break;
        }
        math.style.fontSize = `${next}px`;
      }
    }
  };

  const onToggle = (event) => {
    if (!event.target.closest('.blog-code-wrap')) {
      return;
    }
    wrap = !effective();
    writeWrap(wrap);
    paint();
  };

  /* Only a change of WIDTH re-measures. Fitting an equation changes the body's
     height, and reacting to that would be a loop that measures nothing new. */
  let width = root.clientWidth;
  const resized = new ResizeObserver(() => {
    if (root.clientWidth === width) {
      return;
    }
    width = root.clientWidth;
    measureCode();
    fitMath();
  });

  root.addEventListener('click', onToggle);
  phone.addEventListener('change', paint);
  resized.observe(root);
  paint();
  measureCode();
  fitMath();
  /* A fallback face measures differently from SpaceMono and from the math
     font, so both are measured again once the real faces have arrived. */
  let live = true;
  document.fonts.ready.then(() => {
    if (live) {
      measureCode();
      fitMath();
      /* The mark the construct audit waits for (constructs.spec.js): from here
         on the toggles and the fitted sizes are the ones a reader gets. */
      root.dataset.enhanced = 'on';
    }
  });

  return () => {
    live = false;
    root.removeEventListener('click', onToggle);
    phone.removeEventListener('change', paint);
    resized.disconnect();
  };
};

export default enhanceArticle;
