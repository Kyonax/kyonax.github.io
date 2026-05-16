/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 */

import { AUTHOR_INFO, LOCALE_URL, SEO, SITE_ORIGIN,TECHNOLOGIES } from '@data/data';
import { TRANSLATIONS } from '@data/snippets';

import { PERSON_ID } from './identifiers';
import { stripHtml } from './sanitize';

const EMPLOYERS = {
  current: [
    { name: 'AgileEngine',  url: 'https://agileengine.com/' },
    { name: 'Zerønet Labs', url: 'https://github.com/zeronet-labs' },
  ],
  past: [
    { name: 'Softtek',     url: 'https://www.softtek.com/' },
    { name: 'Cabeza Rota', url: 'https://cabezarota.com/' },
  ],
};

const COMMUNITY = { name: 'Cyber Code Syndicate', url: 'https://github.com/ccs-devhub' };

const _org = (o) => ({ '@type': 'Organization', name: o.name, url: o.url });

const _canonical = (name) => name.replace(/\s*\([^)]*\)\s*/g, ' ').trim().replace(/\s+/g, ' ');

const _knows_about = (locale) => {
  const seen = new Set();
  const out = [];
  for (const tech of TECHNOLOGIES) {
    const name = _canonical(tech.name?.[locale] || tech.name?.en || tech.id);
    if (!seen.has(name)) {
      seen.add(name);
      out.push(name);
    }
  }
  return out;
};

const _i18n = (locale, path) => {
  const parts = path.split('.');
  let v = TRANSLATIONS?.[locale]?.['kyo-web'];
  for (const p of parts) {
    v = v?.[p];
  }
  return typeof v === 'string' ? v : '';
};

export const buildPersonJsonLd = (locale) => ({
  '@type': 'Person',
  '@id': PERSON_ID,
  name: 'Cristian D. Moreno',
  alternateName: ['Kyonax', '京'],
  givenName: 'Cristian',
  familyName: 'Moreno',
  jobTitle: _i18n(locale, 'landing.meta.role') || 'Software Engineer',
  description: stripHtml(_i18n(locale, 'landing.meta.description')),
  image: `${SITE_ORIGIN}${SEO.ogImage}`,
  url: LOCALE_URL[locale] || LOCALE_URL.en,
  email: `mailto:${AUTHOR_INFO.email}`,
  nationality: { '@type': 'Country', name: 'Colombia' },
  address: {
    '@type': 'PostalAddress',
    addressLocality: 'Villavicencio',
    addressRegion: 'Meta',
    addressCountry: 'CO',
  },
  knowsLanguage: ['en', 'es'],
  knowsAbout: _knows_about(locale),
  sameAs: [
    AUTHOR_INFO.github,
    AUTHOR_INFO.orcid,
    AUTHOR_INFO.linkedin,
    'https://x.com/kyonax_on_tech',
    'https://github.com/ccs-devhub',
    'https://instagram.com/kyonax_on_tech',
    'https://tiktok.com/@kyonax_on_tech',
  ],
  identifier: [
    {
      '@type': 'PropertyValue',
      propertyID: 'ORCID',
      value: '0009-0006-4459-5538',
      url: AUTHOR_INFO.orcid,
    },
  ],
  worksFor: EMPLOYERS.current.map(_org),
  alumniOf: EMPLOYERS.past.map(_org),
  memberOf: _org(COMMUNITY),
});

export default buildPersonJsonLd;
