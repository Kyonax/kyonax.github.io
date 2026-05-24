/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 *
 * Standalone payload (not @graph-folded): Google's FAQ rich-result pipeline
 * reads top-level FAQPage more reliably than embedded. isPartOf inlines the
 * WebSite node rather than referencing WEBSITE_ID, because cross-script @id
 * refs are not guaranteed to resolve when FAQPage lives in its own <script>.
 */

import { LOCALE_URL, SITE_ORIGIN } from '@data/data';
import { TRANSLATIONS } from '@data/snippets';

import { faqPageId, faqQuestionId, today,WEBSITE_ID } from './identifiers';
import { stripHtml } from './sanitize';

const ITEM_IDS = ['what-i-do', 'hire-me', 'technologies', 'projects-companies', 'hiring-criteria', 'contact', 'latam', 'frontend-vs-fullstack', 'performance-seo'];

const BUILD_DATE = today();

const _question = (locale, id) => {
  const node = TRANSLATIONS?.[locale]?.['kyo-web']?.landing?.faq?.items?.[id];
  return {
    '@type': 'Question',
    '@id': faqQuestionId(locale, id),
    name: stripHtml(typeof node?.question === 'string' ? node.question : ''),
    inLanguage: locale,
    acceptedAnswer: {
      '@type': 'Answer',
      text: stripHtml(typeof node?.answer === 'string' ? node.answer : ''),
      inLanguage: locale,
    },
  };
};

export const buildFaqJsonLd = (locale = 'en') => ({
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  '@id': faqPageId(locale),
  url: LOCALE_URL[locale] || LOCALE_URL.en,
  inLanguage: locale,
  isPartOf: {
    '@type': 'WebSite',
    '@id': WEBSITE_ID,
    url: `${SITE_ORIGIN}/`,
    name: 'Cristian D. Moreno',
  },
  dateModified: BUILD_DATE,
  mainEntity: ITEM_IDS.map((id) => _question(locale, id)),
});

export default buildFaqJsonLd;
