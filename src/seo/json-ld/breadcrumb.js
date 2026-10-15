/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 *
 * One BreadcrumbList builder for every secondary document page.
 *
 * WHY IT IS SHARED: the resume graph declared its own trail with the crumb
 * names hardcoded as `locale === 'es' ? 'Inicio' : 'Home'`, under a comment
 * claiming it "mirrors the visible breadcrumb the page renders" — while the
 * page rendered a single "Back to site" link and no trail at all. The privacy
 * pages then hand-wrote a second copy of the same shape. Both now read the
 * SAME i18n keys the visible <nav> reads, so the markup and the UI cannot
 * disagree about what the trail says.
 *
 * The final crumb deliberately carries NO `item`: it is the page the visitor
 * is already on, which is exactly why it renders as plain text rather than a
 * link, and it is the pattern Google's own reference markup follows.
 */

import { absoluteUrl, ROUTE_BY_LOCALE } from '@seo/routes';

import { i18nString } from './i18n';

/*
 * `parent` and `currentName` exist for the BLOG, and both keep this builder
 * honest rather than bending it.
 *
 * An article's trail is "Blog / <the article's title>", not "Home / Blog":
 * its parent is the archive, and the last crumb is the page you are on, which
 * for an article is a CONTENT string with no i18n key to read. Passing the
 * article title as `currentName` is what stops the markup from claiming every
 * article is the page called "Blog" — which is exactly what it published
 * before, on every post, in both locales.
 */
export const buildBreadcrumbJsonLd = ({
  id,
  locale,
  currentKey,
  currentName = '',
  parent = null,
}) => ({
  '@type': 'BreadcrumbList',
  '@id': id,
  itemListElement: [
    {
      '@type': 'ListItem',
      position: 1,
      name: parent ? i18nString(locale, parent.key) : i18nString(locale, 'breadcrumb.home'),
      item: absoluteUrl(parent ? parent.url : (ROUTE_BY_LOCALE[locale] || ROUTE_BY_LOCALE.en)),
    },
    {
      '@type': 'ListItem',
      position: 2,
      name: currentName || i18nString(locale, currentKey),
    },
  ],
});

export default buildBreadcrumbJsonLd;
