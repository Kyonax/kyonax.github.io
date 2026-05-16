/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 */

import { SITE_ORIGIN } from '@data/data';

import { PERSON_ID,WEBSITE_ID } from './identifiers';

export const buildWebSiteJsonLd = () => ({
  '@type': 'WebSite',
  '@id': WEBSITE_ID,
  url: `${SITE_ORIGIN}/`,
  name: 'Cristian D. Moreno',
  alternateName: 'Kyonax',
  publisher: { '@id': PERSON_ID },
  inLanguage: ['en', 'es'],
});

export default buildWebSiteJsonLd;
