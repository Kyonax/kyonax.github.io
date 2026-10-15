/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 */

/*
 * nav.spec.js — where the bar folds into the drawer, pinned.
 *
 * It folded at `md`, 1024px, so every tablet and every narrow laptop window got
 * a phone's hamburger over a screen with plenty of room for HOME and BLOG. The
 * owner moved the fold to 700px. A breakpoint is exactly the kind of decision
 * that drifts back when someone "tidies" a media query, so the two sides of it
 * are asserted — the drawer just under the line, the bar on it and above.
 */

import { expect, test } from '@playwright/test';

import { ROUTES, settle } from './viewports.js';

const PAGES = ROUTES.filter((r) => ['landing', 'archive EN', 'article EN'].includes(r.name));

/* The chip and the drawer read the same catalogue labels, so "EXP" showed in
   both. A section's name is spelled out. */
test('section names are spelled out, not abbreviated', async ({ page }) => {
  for (const [path, word] of [['/', 'EXPERIENCE'], ['/es', 'EXPERIENCIA']]) {
    await page.goto(path);
    await settle(page);
    const labels = (await page.locator('.hud-nav__link').allTextContents()).map((s) => s.trim());
    expect(labels, `${path} nav labels`).toContain(word);
    expect(labels, `${path} still abbreviates a section`).not.toContain('EXP');
  }
});

for (const route of PAGES) {
  test(`${route.name}: the drawer below 700px, the bar from 700px`, async ({ page }) => {
    for (const width of [699, 700, 1023]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(route.path);
      await settle(page);

      const bar = page.locator('.hud-nav__links');
      const toggle = page.locator('.hud-nav__menu-toggle');

      if (width < 700) {
        await expect(toggle, `${width}px: the menu button should show`).toBeVisible();
        await expect(bar, `${width}px: the bar links should be folded away`).toBeHidden();
      } else {
        await expect(bar, `${width}px: the bar links should show`).toBeVisible();
        await expect(toggle, `${width}px: the menu button should be gone`).toBeHidden();
        /* HOME is a destination, so it stays in the bar even on the landing,
           where the chip owns the in-page sections. */
        await expect(bar.locator('.hud-nav__link').first()).toBeVisible();
      }
    }
  });
}
