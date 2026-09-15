/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 */

/* The five static error pages: bytes, the per-character split, the proximity field, the fallbacks, the layout. */

import { expect, test } from '@playwright/test';

/* Columns and ink characters of each art, counted from the source. */
const PAGES = [
  { code: 400, cols: 28, cells: 114 },
  { code: 401, cols: 27, cells: 103 },
  { code: 403, cols: 28, cells: 120 },
  { code: 404, cols: 29, cells: 116 },
  { code: 500, cols: 27, cells: 118 },
];

const FIELD_CODES = [404, 401];
const ROWS = 7;
const BUDGET = 7168;
const TOLERANCE = 0.002;
const SLACK = 0.5;
const DESKTOP = { width: 1600, height: 900 };
const RESIZED = { width: 1100, height: 700 };
const PHONE = { width: 390, height: 844 };

const CELL = '.figlet i';
const ROW_CELL = '.figlet>s:nth-child(4) i';
const UNTOUCHED = { scripts: 1, only_text: true, cells: 0 };

const COPYRIGHT = 'Copyright (c) 2026 Cristian D. Moreno — @Kyonax';
const LICENCE = 'Distributed under the terms of GPL-2.0-only';
const ROBOTS = '<meta name="robots" content="noindex,nofollow">';
const LEAD = /^<!doctype html>\s*<!--([^]*?)-->\s*<html[\s>]/i;
const SCRIPT_TAG = /<script\b[^>]*>/gi;
const OFF_SITE = /\b(?:src|href)\s*=\s*["']?(?:https:|http:|\/\/)/gi;

const pathOf = (code) => `/error-pages/${code}.html`;

/* Record the point every pointermove carried, as the page received it. */
const recordPointer = (page) => page.addInitScript(() => {
  addEventListener('pointermove', (event) => {
    window.__pt = { x: event.clientX, y: event.clientY };
  }, { capture: true, passive: true });
});

/* Two animation frames, so the frame the pointer handler asked for has run. */
const nextFrames = (page) => page.evaluate(() => new Promise((done) => {
  requestAnimationFrame(() => requestAnimationFrame(done));
}));

/* Page errors and console errors from here on. */
const watchErrors = (page) => {
  const errors = [];
  page.on('pageerror', (err) => errors.push(err.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });
  return errors;
};

/* Move the pointer to the centre of the k-th match (k < 0 counts from the end). */
const hoverCell = async (page, selector, k) => {
  const centre = await page.evaluate(([sel, n]) => {
    const box = [...document.querySelectorAll(sel)].at(n).getBoundingClientRect();
    return { x: box.left + box.width / 2, y: box.top + box.height / 2 };
  }, [selector, k]);
  await page.mouse.move(centre.x, centre.y);
  await nextFrames(page);
};

/* Each cell's inline --p beside max(0, 1 - d / R) at the point the page received. */
const readField = (page, k) => page.evaluate((n) => {
  if (!window.__pt) {
    return { hovered: 'no pointermove reached the page', cells: [] };
  }
  const figlet = document.querySelector('.figlet');
  const radius = 2.5 * Number.parseFloat(getComputedStyle(figlet).fontSize);
  const { x, y } = window.__pt;
  const cells = [...figlet.querySelectorAll('i')].map((cell, index) => {
    const box = cell.getBoundingClientRect();
    const gap = Math.hypot(Math.max(0, box.left - x, x - box.right), Math.max(0, box.top - y, y - box.bottom));
    return { index, want: Math.max(0, 1 - gap / radius), got: cell.style.getPropertyValue('--p') };
  });
  return { hovered: cells.at(n).got, cells };
}, k);

/* Cells whose inline --p misses the formula by more than the tolerance, NaN included. */
const strays = (cells) => cells
  .filter(({ want, got }) => !(Math.abs(Number(got || 0) - want) <= TOLERANCE))
  .map(({ index, want, got }) => `#${index} has ${got || 'none'}, wants ${want.toFixed(3)}`);

/* Every inline --p the art still carries. */
const litValues = (page) => page.locator(CELL).evaluateAll((cells) => cells
  .map((cell) => cell.style.getPropertyValue('--p'))
  .filter(Boolean));

/* The eased (computed) --p of the k-th match. */
const easedValue = (page, selector, k) => page.evaluate(([sel, n]) => {
  const cell = [...document.querySelectorAll(sel)].at(n);
  return getComputedStyle(cell).getPropertyValue('--p').trim();
}, [selector, k]);

/* The viewport corner farthest from the art, its gap to the art's box and R. */
const farCorner = (page) => page.evaluate(() => {
  const figlet = document.querySelector('.figlet');
  const box = figlet.getBoundingClientRect();
  const gapTo = ([x, y]) => Math.hypot(Math.max(0, box.left - x, x - box.right), Math.max(0, box.top - y, y - box.bottom));
  const corners = [[1, 1], [innerWidth - 2, 1], [1, innerHeight - 2], [innerWidth - 2, innerHeight - 2]];
  const [x, y] = corners.reduce((best, corner) => (gapTo(corner) > gapTo(best) ? corner : best));
  return { x, y, gap: gapTo([x, y]), radius: 2.5 * Number.parseFloat(getComputedStyle(figlet).fontSize) };
});

/* How the art stands: the page's scripts, whether the art is one text node, its cells. */
const readArt = (page) => page.evaluate(() => {
  const figlet = document.querySelector('.figlet');
  return {
    scripts: document.scripts.length,
    only_text: figlet.childNodes.length === 1 && figlet.firstChild.nodeType === Node.TEXT_NODE,
    cells: figlet.querySelectorAll('i').length,
  };
});

/* The largest edge drift between two boxes, in px. */
const boxDrift = (a, b) => Math.max(
  Math.abs(a.x - b.x),
  Math.abs(a.y - b.y),
  Math.abs(a.width - b.width),
  Math.abs(a.height - b.height),
);

/* The art's and the heading's boxes on every page at both viewports, in one fresh context. */
const measureBoxes = async (browser, options) => {
  const context = await browser.newContext(options);
  const page = await context.newPage();
  const boxes = [];
  for (const viewport of [DESKTOP, PHONE]) {
    await page.setViewportSize(viewport);
    for (const { code, cells } of PAGES) {
      await page.goto(pathOf(code));
      boxes.push({
        where: `${code}.html at ${viewport.width}x${viewport.height}`,
        expected: cells,
        cells: await page.locator(CELL).count(),
        art: await page.locator('.figlet').boundingBox(),
        heading: await page.locator('h1').boundingBox(),
      });
    }
  }
  await context.close();
  return boxes;
};

for (const { code, cols, cells } of PAGES) {
  test.describe(`${code}.html`, () => {
    test('ships within 7 KB with the licence, noindex and one inline script', async ({ request }) => {
      const response = await request.get(pathOf(code));
      expect(response.status(), `${code}.html did not answer 200`).toBe(200);
      const size = (await response.body()).length;
      expect(size, `${code}.html is ${size} B, over the ${BUDGET} B budget`).toBeLessThanOrEqual(BUDGET);

      const html = await response.text();
      const lead = LEAD.exec(html);
      expect(lead, `${code}.html has no licence comment between the doctype and <html>`).not.toBeNull();
      expect(lead[1], `${code}.html: the licence comment lost its copyright line`).toContain(COPYRIGHT);
      expect(lead[1], `${code}.html: the licence comment lost its GPL line`).toContain(LICENCE);
      expect(html, `${code}.html lost its robots noindex`).toContain(ROBOTS);

      const scripts = html.match(SCRIPT_TAG) ?? [];
      expect(scripts.length, `${code}.html carries ${scripts.length} scripts, not 1`).toBe(1);
      expect(scripts.filter((tag) => /\ssrc\s*=/i.test(tag)), `${code}.html loads a script file`).toEqual([]);
      expect(html.match(OFF_SITE) ?? [], `${code}.html points off-site`).toEqual([]);
    });

    test('splits its art into rows and cells, text intact, without an error', async ({ page }) => {
      const errors = watchErrors(page);
      await page.goto(pathOf(code));
      const art = await page.evaluate(async () => {
        const figlet = document.querySelector('.figlet');
        const served = await (await fetch(location.href)).text();
        const source = new DOMParser().parseFromString(served, 'text/html').querySelector('.figlet');
        const style = getComputedStyle(figlet);
        return {
          rows: document.querySelectorAll('.figlet>s').length,
          cells: figlet.querySelectorAll('i').length,
          glyphs: [...figlet.querySelectorAll(':scope>s>i>b')].filter((b) => /^\S$/u.test(b.textContent)).length,
          lines: figlet.textContent.split('\n').map((line) => line.length),
          same_text: figlet.textContent === source.textContent,
          cursor: style.cursor,
          select: style.userSelect,
        };
      });

      expect(errors, `${code}.html raised errors`).toEqual([]);
      expect(art.rows, `${code}.html has ${art.rows} .figlet>s rows`).toBe(ROWS);
      expect(art.cells, `${code}.html has ${art.cells} cells, not one per ink character`).toBe(cells);
      expect(art.glyphs, `${code}.html: not every cell is s > i > b around one ink character`).toBe(cells);
      expect(art.lines, `${code}.html: the art is no longer ${ROWS} lines of ${cols} columns`)
        .toEqual(Array.from({ length: ROWS }, () => cols));
      expect(art.same_text, `${code}.html: the split changed the art's text`).toBe(true);
      expect(art.cursor, `${code}.html: the art shows a ${art.cursor} cursor`).toBe('default');
      expect(art.select, `${code}.html: the art can be selected`).toBe('none');
    });
  });
}

for (const code of FIELD_CODES) {
  const { cells } = PAGES.find((entry) => entry.code === code);
  const middle = Math.floor(cells / 2);
  const quarter = Math.floor(cells / 4);

  test.describe(`${code}.html field`, () => {
    test.use({ viewport: DESKTOP });

    test('follows the pointer by distance, ends at R and survives a resize @firefox', async ({ page }) => {
      await recordPointer(page);
      await page.goto(pathOf(code));
      expect(await page.locator(CELL).count(), `${code}.html did not split its art`).toBe(cells);

      await hoverCell(page, CELL, middle);
      const near = await readField(page, middle);
      expect(near.hovered, 'the hovered cell is not at --p 1').toBe('1');
      expect(strays(near.cells), 'cells stray from max(0, 1 - d / R)').toEqual([]);
      const dark = near.cells.filter(({ want }) => want === 0);
      expect(dark.length, 'every cell lies within R, so the edge of the field is untested').toBeGreaterThan(0);
      expect(dark.filter(({ got }) => got !== '' && got !== '0'), 'a cell beyond R carries a --p').toEqual([]);
      await expect.poll(() => easedValue(page, CELL, middle), {
        message: 'the hovered cell never eased to --p 1',
        timeout: 2_000,
      }).toBe('1');

      const corner = await farCorner(page);
      expect(corner.gap, `every viewport corner lies within R (${corner.radius} px) of the art`)
        .toBeGreaterThan(corner.radius);
      await page.mouse.move(corner.x, corner.y);
      await nextFrames(page);
      expect(await litValues(page), 'cells kept a --p with the pointer beyond R').toEqual([]);

      await page.setViewportSize(RESIZED);
      await nextFrames(page);
      await hoverCell(page, CELL, quarter);
      const resized = await readField(page, quarter);
      expect(resized.hovered, 'after a resize the hovered cell is not at --p 1').toBe('1');
      expect(strays(resized.cells), 'after a resize the field is drawn from stale boxes').toEqual([]);
    });

    test('clears when the pointer leaves the window @firefox', async ({ page }) => {
      await page.goto(pathOf(code));
      expect(await page.locator(CELL).count(), `${code}.html did not split its art`).toBe(cells);
      await hoverCell(page, CELL, middle);
      expect((await litValues(page)).length, 'hovering lit no cell, so clearing proves nothing').toBeGreaterThan(0);

      await page.evaluate(() => document.body.dispatchEvent(new PointerEvent('pointerout', {
        bubbles: true,
        relatedTarget: null,
      })));
      await nextFrames(page);
      expect(await litValues(page), 'the pointer left the window and cells kept a --p').toEqual([]);
    });

    test('presses the hovered glyph: moved and recoloured @firefox', async ({ page }) => {
      await page.goto(pathOf(code));
      expect(await page.locator(ROW_CELL).count(), `${code}.html did not split row 4 into cells`).toBeGreaterThan(1);
      await hoverCell(page, ROW_CELL, 0);
      await expect.poll(() => easedValue(page, ROW_CELL, 0), {
        message: 'the hovered cell never eased to --p 1',
        timeout: 2_000,
      }).toBe('1');

      const [near, far] = await page.locator(ROW_CELL).evaluateAll((row) => [row.at(0), row.at(-1)].map((cell) => {
        const style = getComputedStyle(cell.firstElementChild);
        return { inline: cell.style.getPropertyValue('--p'), translate: style.translate, color: style.color };
      }));
      expect(far.inline, 'the far end of the row is lit, so it cannot stand for a glyph at rest').toBe('');
      const shift = near.translate.split(' ').map((part) => Number.parseFloat(part));
      expect(shift.length === 2 && shift.every((part) => part > 0), `the hovered glyph did not move down and right (translate ${near.translate})`)
        .toBe(true);
      expect(far.translate, 'a glyph at rest moved').toMatch(/^(?:none|0px(?: 0px)?)$/);
      expect(near.color, 'the hovered glyph kept the colour of a glyph at rest').not.toBe(far.color);
    });
  });
}

test.describe('with reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('every art stays one text node @firefox', async ({ page }) => {
    for (const { code } of PAGES) {
      await page.goto(pathOf(code));
      expect(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches), 'the context does not prefer reduced motion')
        .toBe(true);
      expect(await readArt(page), `${code}.html under reduced motion: want its one script and the art one text node`)
        .toEqual(UNTOUCHED);
    }

    const control = PAGES.at(-1);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto(pathOf(control.code));
    expect((await readArt(page)).cells, `${control.code}.html stays whole without reduced motion too, so the guard proves nothing`)
      .toBe(control.cells);
  });
});

test.describe('with a coarse pointer', () => {
  test.use({ isMobile: true, hasTouch: true });
  test.skip(({ browserName }) => browserName !== 'chromium', 'isMobile emulation is Chromium-only');

  test('every art stays one text node', async ({ page }) => {
    for (const { code } of PAGES) {
      await page.goto(pathOf(code));
      expect(await page.evaluate(() => matchMedia('(pointer: coarse)').matches), 'the context has no coarse pointer')
        .toBe(true);
      expect(await readArt(page), `${code}.html with a coarse pointer: want its one script and the art one text node`)
        .toEqual(UNTOUCHED);
    }
  });
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('every art stays one text node @firefox', async ({ page }) => {
    for (const { code } of PAGES) {
      await page.goto(pathOf(code));
      expect(await readArt(page), `${code}.html without JavaScript: want its one script and the art one text node`)
        .toEqual(UNTOUCHED);
    }
  });
});

/* One context at a time: script off first, then on, every page at both viewports. */
test('the split moves neither the art nor the heading @firefox', async ({ browser }) => {
  const plain = await measureBoxes(browser, { javaScriptEnabled: false });
  const split = await measureBoxes(browser, {});

  const unsplit = split.filter(({ cells, expected }) => cells !== expected).map(({ where }) => where);
  expect(unsplit, 'the art was not split, so equal boxes prove nothing').toEqual([]);
  const drift = plain.map((before, k) => {
    const after = split.at(k);
    return {
      where: before.where,
      art: Number(boxDrift(before.art, after.art).toFixed(3)),
      heading: Number(boxDrift(before.heading, after.heading).toFixed(3)),
    };
  });
  const moved = drift.filter(({ art, heading }) => art > SLACK || heading > SLACK);
  expect(moved, `the split moved a box by more than ${SLACK} px`).toEqual([]);
});
