/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 */

import { AUTHOR_INFO, LOCALE_URL, SEO, SITE_ORIGIN,TECHNOLOGIES } from '@data/data';
import { TRANSLATIONS } from '@data/snippets';

import { PERSON_ID } from './identifiers';
import { PROJECT_IDS } from './projects';
import { stripHtml } from './sanitize';
import { REVIEW_IDS } from './testimonials';

const SERVICE_ID = `${SITE_ORIGIN}/#service`;

const WORK_LOCATIONS = [
  { '@type': 'Place', name: 'Villavicencio, Colombia', address: { '@type': 'PostalAddress', addressLocality: 'Villavicencio', addressRegion: 'Meta', addressCountry: 'CO' } },
  { '@type': 'Place', name: 'Colombia', address: { '@type': 'PostalAddress', addressCountry: 'CO' } },
  { '@type': 'Place', name: 'Latin America' },
];

const EMPLOYERS = {
  current: [
    { name: 'AgileEngine',  url: 'https://agileengine.com/' },
    { name: 'Zerønet Labs', url: 'https://github.com/zeronet-labs' },
  ],
  past: [
    { name: 'Softtek',     url: 'https://softtek.com' },
    { name: 'Cabeza Rota', url: 'https://cabezarota.co' },
  ],
};

/* EDUCATION rows of the verified CVs, verbatim. */
const EDUCATION = [
  {
    '@type': 'CollegeOrUniversity',
    name: 'Universidad de Los Llanos',
    address: { '@type': 'PostalAddress', addressLocality: 'Villavicencio', addressRegion: 'Meta', addressCountry: 'CO' },
  },
  {
    '@type': 'CollegeOrUniversity',
    name: 'Universidad de Caldas',
    address: { '@type': 'PostalAddress', addressLocality: 'Villavicencio', addressRegion: 'Meta', addressCountry: 'CO' },
  },
];

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
  telephone: AUTHOR_INFO.phone,
  nationality: { '@type': 'Country', name: 'Colombia' },
  address: {
    '@type': 'PostalAddress',
    addressLocality: 'Villavicencio',
    addressRegion: 'Meta',
    addressCountry: 'CO',
  },
  homeLocation: WORK_LOCATIONS[0],
  workLocation: WORK_LOCATIONS,
  makesOffer: { '@id': SERVICE_ID },
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
  /* One EmployeeRole per \cventry row of the verified CVs (EN 3afb94d4 / ES e7d13e27).
     Dates, role names and employers are taken from those entries verbatim. */
  worksFor: [
    {
      '@type': 'EmployeeRole',
      roleName: 'Senior Software Engineer (Frontend)',
      startDate: '2025-10',
      endDate: '2026-05',
      worksFor: _org(EMPLOYERS.current[0]),
    },
    {
      '@type': 'EmployeeRole',
      roleName: 'Independent Full-Stack Engineer',
      startDate: '2018-01',
      worksFor: _org(EMPLOYERS.current[1]),
    },
    {
      '@type': 'EmployeeRole',
      roleName: 'Senior Full-Stack Engineer',
      startDate: '2023-11',
      endDate: '2025-07',
      worksFor: _org(EMPLOYERS.past[0]),
    },
    {
      '@type': 'EmployeeRole',
      roleName: 'Senior Frontend & Growth Engineer',
      startDate: '2020-10',
      endDate: '2023-11',
      worksFor: _org(EMPLOYERS.past[1]),
    },
  ],
  /* alumniOf is EDUCATIONAL institutions (schema.org). It previously held former
     employers, which told entity resolvers that Softtek and Cabeza Rota were schools.
     Now carries the two EDUCATION rows of the CVs. */
  alumniOf: EDUCATION,
  memberOf: _org(COMMUNITY),
  hasCreatedWork: PROJECT_IDS,
  /* Prose-only recommendations: no aggregateRating, ever — a personal site has
     no rating concept, so any score here would be fabricated markup. */
  review: REVIEW_IDS,
});

export default buildPersonJsonLd;
