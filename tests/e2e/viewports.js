/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 */

/*
 * viewports.js — the widths every browser contract is measured at. Shared, so
 * the layout and type specs can never disagree about which devices exist.
 *
 * THREE KINDS OF WIDTH, ALL NEEDED:
 *   · real devices — 320 (the narrowest phone still worth supporting), 360
 *     (the common Android), 375 (iPhone SE / mini), 390 (current iPhone), 412
 *     (Pixel), 430 (the large iPhones);
 *   · this site's own breakpoints — 700 `nav`, 768 `sm`, 810 `tab`, 1024
 *     `md`, 1200 `lg`, 1600 `xl` from _variables.scss. They resolve against
 *     the UA's 16px root, NOT the page's 12px one, and a boundary is exactly
 *     where a type step, a column change or the nav fold lands, so each is
 *     measured ON the boundary;
 *   · plus 1280 and 1440, the common laptops.
 */
export const WIDTHS = [
  320, 360, 375, 390, 412, 430,
  700, 768, 810, 1024, 1200, 1280, 1440, 1600,
];

export const ROUTES = [
  { name: 'landing', path: '/' },
  { name: 'archive EN', path: '/blog/' },
  { name: 'archive ES', path: '/es/blog/' },
  { name: 'article EN', path: '/blog/engineering/2026-08-14-shipping-a-static-site-that-stays-fast' },
  { name: 'article ES', path: '/es/blog/engineering/2026-08-14-publicar-un-sitio-estatico-que-siga-rapido' },
];

export const settle = async (page) => {
  await page.waitForLoadState('networkidle');
  /* The rail and the scroll-spy mount after hydration; without this the rail
     assertions race a component that has not rendered yet. */
  await page.waitForTimeout(350);
};
