/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 */

import { SITE_ORIGIN, SEO, LOCALE_URL } from '@data/data';
import { profilePageId, PERSON_ID, WEBSITE_ID, today } from './identifiers';

const BUILD_DATE = today();

export const buildProfilePageJsonLd = (locale) => ({
  '@type': 'ProfilePage',
  '@id': profilePageId(locale),
  mainEntity: { '@id': PERSON_ID },
  isPartOf: { '@id': WEBSITE_ID },
  url: LOCALE_URL[locale] || LOCALE_URL.en,
  inLanguage: locale,
  dateModified: BUILD_DATE,
  primaryImageOfPage: {
    '@type': 'ImageObject',
    url: `${SITE_ORIGIN}${SEO.ogImage}`,
    width: SEO.ogImageWidth,
    height: SEO.ogImageHeight,
  },
});

export default buildProfilePageJsonLd;
