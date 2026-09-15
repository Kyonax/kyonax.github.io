/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 */

/*
 * blog-head.spec.js — what a blog page's <head> must NOT carry from the shell.
 *
 * Every prerendered page is cut from the landing's shell, and two of the
 * landing's head tags described the landing alone. The owner's decisions of
 * 2026-09-14 (Step 1b, topics 5 and 6) take them off the blog:
 *   · the LCP preload of the landing's portrait: no blog page shows it, so it
 *     was a high-priority download racing the page's own LCP;
 *   · the hiring `keywords` meta: the blog does not compete with the landing
 *     for the queries about the person.
 * The landing keeps both, so a check that removed them everywhere would fail.
 *
 * READ AS SHIPPED. The document is fetched, not rendered: these are tags the
 * browser's preload scanner and a crawler read before any script runs.
 */

import { expect, test } from '@playwright/test';

import { ROUTES } from './viewports.js';

const PORTRAIT_PRELOAD = /<link rel="preload" as="image"[^>]*kyonax_portrait[^>]*>/;
const KEYWORDS = /<meta name="keywords"/;

const strip = (p) => (p.length > 1 ? p.replace(/\/$/, '') : p);
const BLOG = ROUTES.filter((r) => /^(archive|article) /.test(r.name));
const LANDINGS = [{ name: 'landing EN', path: '/' }, { name: 'landing ES', path: '/es' }];

const shipped = async (request, path) => {
  const res = await request.get(strip(path));
  expect(res.status(), `${path} did not answer 200`).toBe(200);
  return res.text();
};

for (const route of BLOG) {
  test(`${route.name}: no landing portrait preload, no hiring keywords`, async ({ request }) => {
    const html = await shipped(request, route.path);
    /* Booleans, not toMatch: a failure should name the tag, not print the page. */
    expect(PORTRAIT_PRELOAD.test(html), `${route.path} still preloads the landing's portrait`).toBe(false);
    expect(KEYWORDS.test(html), `${route.path} still carries the hiring keywords`).toBe(false);
  });
}

for (const route of LANDINGS) {
  test(`${route.name}: keeps its portrait preload and its keywords`, async ({ request }) => {
    const html = await shipped(request, route.path);
    expect(PORTRAIT_PRELOAD.test(html), `${route.path} lost its LCP preload`).toBe(true);
    expect(KEYWORDS.test(html), `${route.path} lost its keywords`).toBe(true);
  });
}
