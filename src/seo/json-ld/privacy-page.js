/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 *
 * Graph for the privacy policy pages (/privacy, /es/privacy).
 *
 * These pages used to be standalone files in public/ carrying this graph as a
 * hand-written literal. It moves here unchanged in SHAPE, and every string it
 * quotes now comes from the same message catalogue the page renders from, so
 * the markup cannot drift from the copy the way a hand-maintained literal can.
 *
 * WebSite and Person are DECLARED here, not merely referenced: @id resolution
 * is per-document, so a bare `isPartOf: { '@id': WEBSITE_ID }` on a page that
 * never declares WebSite points at nothing. That was a MEDIUM finding on the
 * resume pages; it is not repeated here.
 *
 * Person is deliberately the MINIMAL node, not buildPersonJsonLd(): the full
 * one carries makesOffer -> #service, hasCreatedWork -> #project-* and
 * review -> #review-*, none of which exist on this page. It shares the
 * landing's @id, so Google merges the two into one entity rather than reading
 * a duplicate profile — a consistent subset, which is the same reasoning that
 * cleared the "duplicate #website" false positive.
 *
 * NO dateModified: neither policy states a revision date, and a build stamp
 * would assert a freshness signal that is not true. If a visible "Last
 * updated" line is ever added to the copy, mirror it here — in that order.
 *
 * NO primaryImageOfPage: it would point at og-banner.jpg, which still advertises
 * the retired role.
 */

import { PRIVACY_URL } from '@seo/routes';

import buildBreadcrumbJsonLd from './breadcrumb';
import { i18nString } from './i18n';
import { PERSON_ID, WEBSITE_ID } from './identifiers';
import buildWebSiteJsonLd from './website';

const _url    = (locale) => PRIVACY_URL[locale] || PRIVACY_URL.en;
const pageId  = (locale) => `${_url(locale)}#webpage`;
const crumbId = (locale) => `${_url(locale)}#breadcrumb`;

export const buildPrivacyJsonLd = ({ locale = 'en' } = {}) => ({
  '@context': 'https://schema.org',
  '@graph': [
    buildWebSiteJsonLd(),
    {
      '@type': 'Person',
      '@id': PERSON_ID,
      name: 'Cristian D. Moreno',
      alternateName: 'Kyonax',
      url: 'https://kyonax.com/',
    },
    {
      '@type': 'WebPage',
      '@id': pageId(locale),
      url: _url(locale),
      name: i18nString(locale, 'privacy.meta.title'),
      description: i18nString(locale, 'privacy.meta.description'),
      inLanguage: locale,
      isPartOf: { '@id': WEBSITE_ID },
      about: { '@id': PERSON_ID },
      publisher: { '@id': PERSON_ID },
      breadcrumb: { '@id': crumbId(locale) },
    },
    buildBreadcrumbJsonLd({
      id: crumbId(locale),
      locale,
      currentKey: 'privacy.breadcrumb',
    }),
  ],
});

export default buildPrivacyJsonLd;
