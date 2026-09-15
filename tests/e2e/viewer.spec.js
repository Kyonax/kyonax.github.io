/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 */

/*
 * viewer.spec.js — the image viewer's zoom toolbar, measured.
 *
 * The owner opened a chart on a phone, saw it small, and found no way to zoom
 * or move it: the pinch, wheel and double-tap zoom were all there, and none of
 * it was visible. The viewer now carries the diagram viewer's toolbar — "−",
 * the zoom as a percentage, "+", FIT — and every test here is one way that
 * toolbar could come back broken:
 *   · missing, or reading a zoom the picture is not at;
 *   · a button that does not move the picture, or a drag that does not;
 *   · keys that go nowhere, because the focus never entered the dialog;
 *   · a target under WCAG 2.5.8's 24px, or under 44px for a thumb;
 *   · a toolbar sitting on the close button or the name chip, or off screen;
 *   · a page that scrolls sideways under the open viewer;
 *   · an Escape that no longer closes it.
 *
 * Measured on the kitchen-sink article, which carries a chart (opened by the
 * site's .blog-chart-zoom button) and figures (opened by a click on the
 * image) — the two ways a reader reaches the viewer from an article.
 */

import { expect, test } from '@playwright/test';

import { settle } from './viewports.js';

const ARTICLE = '/blog/engineering/2026-08-13-everything-org2html-renders';

/* The site appends the Umami tracker after mount. Every test here answers it
   with an empty script and aborts every other Umami request, the net
   analytics.spec.js casts, so no run reaches the network or the dashboard —
   and an empty tracker binds no click handler that could swallow a click. */
const UMAMI_HOST = /(^|\.)umami\.(is|dev)$/;

const answerUmami = (page) => page.route((url) => UMAMI_HOST.test(url.hostname), (route) => (
  new URL(route.request().url()).pathname === '/script.js'
    ? route.fulfill({ status: 200, contentType: 'application/javascript', body: '' })
    : route.abort()
));

test.beforeEach(async ({ page }) => {
  await answerUmami(page);
});

/* A phone is measured the way article.spec.js measures one: touch on, so the
   `(pointer: coarse)` sizes are the ones in play. Its page is a new context's,
   so it gets the same Umami net as the fixture's. */
const phone = async (browser, width) => {
  const context = await browser.newContext({
    viewport: { width, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();
  await answerUmami(page);
  return { context, page };
};

/* The viewer's parts. The buttons are found by their accessible names, so a
   label that fell back to its raw i18n key fails here too. */
const parts = (page) => {
  const tools = page.locator('.image-viewer__tools');
  return {
    viewer: page.locator('.image-viewer'),
    stage: page.locator('.image-viewer__stage'),
    picture: page.locator('.image-viewer__picture'),
    tools,
    readout: tools.locator('.image-viewer__zoom'),
    out: tools.getByRole('button', { name: 'Zoom out', exact: true }),
    in: tools.getByRole('button', { name: 'Zoom in', exact: true }),
    fit: tools.getByRole('button', { name: 'Fit to the screen', exact: true }),
    close: page.locator('.ui-modal__close--floating'),
    chip: page.locator('.image-viewer__name'),
  };
};

const openChart = async (page) => {
  await page.goto(ARTICLE);
  await settle(page);
  const zoom = page.locator('.org-chart .blog-chart-zoom').first();
  await zoom.scrollIntoViewIfNeeded();
  await zoom.click();
  await expect(page.locator('.image-viewer__img'), 'the chart did not open in the image viewer').toBeVisible();
  return parts(page);
};

/* The picture's zoom as the viewer wrote it: translate3d(Xpx, Ypx, 0) scale(S)
   on the element it moves, inline. No transform yet is the identity. */
const transformOf = async (picture) => {
  const text = await picture.evaluate((el) => el.style.transform);
  const m = text.match(/translate3d\((-?[\d.]+)px,\s*(-?[\d.]+)px[^)]*\)\s*scale\((-?[\d.]+)\)/);
  return m ? { x: Number(m[1]), y: Number(m[2]), scale: Number(m[3]) } : { x: 0, y: 0, scale: 1 };
};

const overlaps = (a, b) => a.x < b.x + b.width && b.x < a.x + a.width
  && a.y < b.y + b.height && b.y < a.y + a.height;

const sideways = (page) => page.evaluate(() => ({
  scroll: document.documentElement.scrollWidth,
  client: document.documentElement.clientWidth,
  x: window.scrollX,
}));

test('a chart opens with the toolbar at 100%, "−" and FIT disabled', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  const v = await openChart(page);

  await expect(v.tools, 'the viewer shows no zoom toolbar').toBeVisible();
  await expect(v.readout, 'the readout does not start at 100%').toHaveText('100%');
  await expect(v.readout, 'the readout is not a status the zoom is announced from').toHaveAttribute('role', 'status');
  await expect(v.readout, 'the readout\'s label is not the zoom sentence').toHaveAttribute('aria-label', /100/);
  await expect(v.out, '"−" is enabled at 100%, where there is nothing to zoom out of').toBeDisabled();
  await expect(v.fit, 'FIT is enabled at 100%, where the picture already fits').toBeDisabled();
  await expect(v.in, '"+" is disabled at 100%').toBeEnabled();
});

test('"+" raises the readout and the picture\'s scale, and FIT returns to 100%', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  const v = await openChart(page);

  await v.in.click();
  await expect(v.readout, 'one "+" did not step the readout by the 1.35 step').toHaveText('135%');
  expect((await transformOf(v.picture)).scale, 'the readout moved but the picture did not scale').toBeCloseTo(1.35, 2);
  await v.in.click();
  await expect(v.readout, 'a second "+" did not step the readout again').toHaveText('182%');
  await expect(v.out, '"−" stayed disabled once zoomed in').toBeEnabled();
  await expect(v.fit, 'FIT stayed disabled once zoomed in').toBeEnabled();

  await v.fit.click();
  await expect(v.readout, 'FIT did not return the readout to 100%').toHaveText('100%');
  expect((await transformOf(v.picture)).scale, 'FIT reset the readout but not the picture').toBe(1);
  await expect(v.out, '"−" is enabled again at 100%').toBeDisabled();
});

test('a mouse drag moves the zoomed picture', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  const v = await openChart(page);
  await v.in.click();
  await v.in.click();
  await expect(v.readout).toHaveText('182%');

  const before = await transformOf(v.picture);
  const box = await v.stage.boundingBox();
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x - 120, y - 80, { steps: 6 });
  await page.mouse.up();
  const after = await transformOf(v.picture);

  expect(after.x, `a 120px drag left moved the picture from x=${before.x} to x=${after.x}`).toBeLessThan(before.x - 60);
  expect(after.y, `an 80px drag up moved the picture from y=${before.y} to y=${after.y}`).toBeLessThan(before.y - 40);
  expect(after.scale, 'the drag changed the zoom').toBeCloseTo(before.scale, 3);
});

test('on the focused stage + zooms in, an arrow pans and 0 fits', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  const v = await openChart(page);
  await v.stage.focus();

  await page.keyboard.press('+');
  await expect(v.readout, 'the + key did not zoom in').toHaveText('135%');
  const zoomed = await transformOf(v.picture);
  await page.keyboard.press('ArrowRight');
  expect((await transformOf(v.picture)).x, 'ArrowRight did not pan the zoomed picture').toBeLessThan(zoomed.x);
  await page.keyboard.press('0');
  await expect(v.readout, 'the 0 key did not fit the picture').toHaveText('100%');
});

test('a figure image opens the same toolbar', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto(ARTICLE);
  await settle(page);
  const img = page.locator('.org-figure img').first();
  await img.scrollIntoViewIfNeeded();
  await img.click();

  const v = parts(page);
  await expect(page.locator('.image-viewer__img'), 'the figure did not open in the image viewer').toBeVisible();
  await expect(v.tools, 'a figure opens the viewer without its toolbar').toBeVisible();
  await expect(v.readout).toHaveText('100%');
  await v.in.click();
  await expect(v.readout, '"+" does not zoom a figure').toHaveText('135%');
});

test('the toolbar buttons are at least 24×24, and 44×44 at 390px on a touch screen', async ({ page, browser }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  const desk = await openChart(page);
  for (const button of await desk.tools.getByRole('button').all()) {
    const b = await button.boundingBox();
    /* WCAG 2.5.8 (AA) sets 24 CSS px as the floor for a pointer target. */
    expect(Math.min(b.width, b.height), `"${await button.getAttribute('aria-label')}" is ${Math.round(b.width)}×${Math.round(b.height)}px`)
      .toBeGreaterThanOrEqual(24);
  }

  const { context, page: touch } = await phone(browser, 390);
  const v = await openChart(touch);
  for (const button of await v.tools.getByRole('button').all()) {
    const b = await button.boundingBox();
    expect(Math.min(b.width, b.height), `on a touch screen "${await button.getAttribute('aria-label')}" is ${Math.round(b.width)}×${Math.round(b.height)}px`)
      .toBeGreaterThanOrEqual(44);
  }
  await context.close();
});

for (const width of [320, 390, 768, 1280]) {
  test(`at ${width}px the toolbar clears the close button and the name chip, on screen`, async ({ page, browser }) => {
    /* The phones are touch screens: the 44px toolbar is the widest one. */
    const { context, page: tab } = width <= 390 ? await phone(browser, width) : { context: null, page };
    if (!context) {
      await tab.setViewportSize({ width, height: 900 });
    }
    const v = await openChart(tab);
    const view = tab.viewportSize();

    const tools = await v.tools.boundingBox();
    const close = await v.close.boundingBox();
    const chip = await v.chip.boundingBox();
    const at = (b) => `${Math.round(b.x)},${Math.round(b.y)} ${Math.round(b.width)}×${Math.round(b.height)}`;
    expect(overlaps(tools, close), `the toolbar (${at(tools)}) sits on the close button (${at(close)})`).toBe(false);
    expect(overlaps(tools, chip), `the toolbar (${at(tools)}) sits on the name chip (${at(chip)})`).toBe(false);
    expect(tools.x, `the toolbar starts ${Math.round(tools.x)}px off the left edge`).toBeGreaterThanOrEqual(0);
    expect(tools.y, `the toolbar starts ${Math.round(tools.y)}px above the top edge`).toBeGreaterThanOrEqual(0);
    expect(tools.x + tools.width, `the toolbar ends at ${Math.round(tools.x + tools.width)}px in a ${view.width}px viewport`)
      .toBeLessThanOrEqual(view.width);
    expect(tools.y + tools.height, `the toolbar ends at ${Math.round(tools.y + tools.height)}px in a ${view.height}px viewport`)
      .toBeLessThanOrEqual(view.height);
    if (context) {
      await context.close();
    }
  });
}

test('the page never scrolls sideways while the viewer is open', async ({ page, browser }) => {
  const { context, page: tab } = await phone(browser, 320);
  for (const [name, p] of [['320px touch', tab], ['1280px', page]]) {
    if (p === page) {
      await page.setViewportSize({ width: 1280, height: 900 });
    }
    const v = await openChart(p);
    const check = async (moment) => {
      const m = await sideways(p);
      expect(m.scroll, `${name}, ${moment}: the document is ${m.scroll}px wide in a ${m.client}px viewport`)
        .toBeLessThanOrEqual(m.client);
      expect(m.x, `${name}, ${moment}: the page scrolled ${m.x}px sideways`).toBe(0);
    };
    await check('at 100%');
    /* Seven steps of 1.35 is past the 800% limit: the widest the picture gets. */
    for (let i = 0; i < 7; i += 1) {
      if (await v.in.isEnabled()) {
        await v.in.click();
      }
    }
    await expect(v.readout, `${name}: "+" did not reach the limit`).toHaveText('800%');
    await expect(v.in, `${name}: "+" is still enabled at the limit`).toBeDisabled();
    await check('at 800%');
    await v.stage.focus();
    for (const key of ['ArrowLeft', 'ArrowLeft', 'ArrowUp', 'ArrowRight']) {
      await p.keyboard.press(key);
    }
    await check('after panning');
  }
  await context.close();
});

test('Escape closes the viewer and hands the focus back to the chart\'s button', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  const v = await openChart(page);
  /* Opened by a CLICK: the viewer must take the focus itself, or the key goes
     to the page behind the backdrop and nothing closes. */
  await expect(v.stage, 'the viewer did not take the focus when it opened').toBeFocused();

  await page.keyboard.press('Escape');
  await expect(v.viewer, 'Escape did not close the viewer').toHaveCount(0);
  await expect(page.locator('.org-chart .blog-chart-zoom').first(), 'closing did not return the focus to the button that opened it')
    .toBeFocused();
});
