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

export const buildBreadcrumbJsonLd = ({ id, locale, currentKey }) => ({
  '@type': 'BreadcrumbList',
  '@id': id,
  itemListElement: [
    {
      '@type': 'ListItem',
      position: 1,
      name: i18nString(locale, 'breadcrumb.home'),
      item: absoluteUrl(ROUTE_BY_LOCALE[locale] || ROUTE_BY_LOCALE.en),
    },
    {
      '@type': 'ListItem',
      position: 2,
      name: i18nString(locale, currentKey),
    },
  ],
});

export default buildBreadcrumbJsonLd;
