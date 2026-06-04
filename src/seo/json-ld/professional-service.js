/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 *
 * ProfessionalService node lists every Colombian city the engineer serves
 * remotely, plus LATAM and the US. Structured data is the safest surface
 * for an exhaustive city list — Google reads it for AEO and rich-result
 * intent, and there is no reader-side UX cost.
 */

import { SITE_ORIGIN } from '@data/data';

import { PERSON_ID } from './identifiers';

const SERVICE_ID = `${SITE_ORIGIN}/#service`;

const COLOMBIA_CITIES = [
  'Bogotá', 'Medellín', 'Cali', 'Cartagena', 'Barranquilla', 'Bucaramanga',
  'Villavicencio', 'Manizales', 'Pereira', 'Cúcuta', 'Ibagué', 'Santa Marta',
  'Armenia', 'Pasto', 'Neiva', 'Montería', 'Valledupar', 'Popayán',
];

const _city = (name) => ({
  '@type': 'City',
  name,
  containedInPlace: { '@type': 'Country', name: 'Colombia' },
});

const _region = (name) => ({ '@type': 'AdministrativeArea', name });

const SERVICE_TYPES_EN = [
  'Web Development', 'Frontend Development', 'Full-Stack Development',
  'E-commerce Development', 'SaaS Development', 'Performance Optimization',
  'Accessibility Engineering', 'SEO Engineering', 'AI-Assisted Development',
];

const SERVICE_TYPES_ES = [
  'Desarrollo Web', 'Desarrollo Frontend', 'Desarrollo Full-Stack',
  'Desarrollo E-commerce', 'Desarrollo SaaS', 'Optimización de Rendimiento',
  'Ingeniería de Accesibilidad', 'Ingeniería SEO', 'Desarrollo Asistido por IA',
];

const SERVICE_NAME = {
  en: 'Senior Full-Stack and Frontend Web Development',
  es: 'Desarrollo Web Full-Stack y Frontend Senior',
};

const SERVICE_DESCRIPTION = {
  en: 'Remote Senior Full-Stack and Frontend Web Development for e-commerce, SaaS, and consumer-facing web applications. Based in Colombia, serving teams across Latin America and the United States.',
  es: 'Desarrollo Web Senior Full-Stack y Frontend 100% remoto para e-commerce, SaaS y aplicaciones web de cara al consumidor. Desde Colombia, atendiendo equipos en Latinoamérica y Estados Unidos.',
};

export const buildProfessionalServiceJsonLd = (locale) => ({
  '@type': 'ProfessionalService',
  '@id': SERVICE_ID,
  name: SERVICE_NAME[locale] || SERVICE_NAME.en,
  description: SERVICE_DESCRIPTION[locale] || SERVICE_DESCRIPTION.en,
  provider: { '@id': PERSON_ID },
  serviceType: locale === 'es' ? SERVICE_TYPES_ES : SERVICE_TYPES_EN,
  areaServed: [
    ...COLOMBIA_CITIES.map(_city),
    _region('Latin America'),
    _region('LATAM'),
    { '@type': 'Country', name: 'Colombia' },
    { '@type': 'Country', name: 'United States' },
  ],
  availableLanguage: [
    { '@type': 'Language', name: 'English', alternateName: 'en' },
    { '@type': 'Language', name: 'Spanish', alternateName: 'es' },
  ],
});

export default buildProfessionalServiceJsonLd;
