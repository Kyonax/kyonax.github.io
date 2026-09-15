/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 */

/*
 * archive-pages.js — how page 2 and later of the blog archive behave.
 *
 * Page 1 is the blog's front door: the hero, the corpus marquee, the pipeline
 * drawings, the lead. Page N is a LIST, and the owner decided (Step 1,
 * 2026-09-14) what that means for it — each decision is one switch below, all
 * on. They are here, apart from the code that reads them, so reversing one is
 * a one-word change that names the decision it reverses.
 *
 * PLAIN CONSTANTS, READ AT BUILD TIME. Nothing here reads the manifest: whether
 * a page exists is blog-routes.js's question, answered from `pages[locale]`.
 * The routing manifest carries no page size, so no switch may depend on one.
 */

/* Step 1 · pager landing: every pager link lands on the list, not the top. */
export const LIST_HASH = '#all-posts';

/* Step 1 · page-N header: a compact hero; no chip, galaxy, marquee, band. */
export const COMPACT_HEADER = true;

/* Step 1 · page-N title: "… · Page N of M" rather than page 1's title. */
export const UNIQUE_TITLE = true;

/* Step 1 · page-N description: page 1's, then "Page N of M." */
export const UNIQUE_DESCRIPTION = true;

/* Step 1 · archive JSON-LD: a CollectionPage per page about the one Blog. */
export const COLLECTION_PAGE = true;

/* Step 1 · language toggle: page N lands on the other locale's page N. */
export const TOGGLE_KEEPS_PAGE = true;
