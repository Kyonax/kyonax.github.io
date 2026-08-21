/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 *
 * Graph for the dedicated resume pages (/resume, /es/hoja-de-vida).
 *
 * WHY a separate graph: the resume routes previously emitted the LANDING graph
 * verbatim — its ProfilePage pointed at "/" while the crawler was on /resume,
 * and it dragged along FAQPage, the project SoftwareApplications and the
 * reviews, none of which appear on this page. Claiming content a page does not
 * render is exactly what "structured data mismatch" penalties target.
 *
 * What this page genuinely is: a ProfilePage whose mainEntity is the Person,
 * with the PDF exposed as an associated DigitalDocument so the HTML page and
 * the downloadable CV are linked to one entity instead of competing.
 */

import { AUTHOR_INFO, CV_URL, SEO } from '@data/data';
import { absoluteUrl, RESUME_URL } from '@seo/routes';

import buildBreadcrumbJsonLd from './breadcrumb';
import { i18nString as _i18n } from './i18n';
import { PERSON_ID, today, WEBSITE_ID } from './identifiers';
import buildPersonJsonLd from './person';
import buildWebSiteJsonLd from './website';

const BUILD_DATE = today();

const _url        = (locale) => RESUME_URL[locale] || RESUME_URL.en;
const resumeId    = (locale) => `${_url(locale)}#webpage`;
const cvId        = (locale) => `${_url(locale)}#cv`;
const crumbId     = (locale) => `${_url(locale)}#breadcrumb`;

const _ogImage = (locale) => absoluteUrl(SEO.resumeOgImage[locale] || SEO.resumeOgImage.en);

/* Mirrors the visible breadcrumb the page renders (Home -> Resume) — and now
   genuinely does: both read `breadcrumb.home` and `resume.breadcrumb`, and the
   page renders the trail this describes. The shared builder is in
   ./breadcrumb.js; the privacy pages use the same one. */
const _breadcrumb = (locale) => buildBreadcrumbJsonLd({
  id: crumbId(locale),
  locale,
  currentKey: 'resume.breadcrumb',
});

/* The PDF, declared so the HTML page and the file resolve to one work rather
   than two competing documents for the same query. */
const _cvDocument = (locale) => ({
  '@type': 'DigitalDocument',
  '@id': cvId(locale),
  name: _i18n(locale, 'resume.meta.og-title'),
  description: _i18n(locale, 'resume.meta.description'),
  url: absoluteUrl(CV_URL[locale] || CV_URL.en),
  encodingFormat: 'application/pdf',
  inLanguage: locale,
  dateModified: BUILD_DATE,
  author: { '@id': PERSON_ID },
  about: { '@id': PERSON_ID },
  isPartOf: { '@id': resumeId(locale) },
  license: 'https://kyonax.com/privacy',
});

/*
 * The Person node carries relations that only resolve inside the LANDING graph:
 * makesOffer -> #service, hasCreatedWork -> #project-*, review -> #review-*.
 * Those nodes are not on this page, so keeping the references here would leave
 * dangling @ids pointing at entities that exist nowhere in the document.
 *
 * aggregateRating goes with them for a second reason: Google requires the
 * reviews backing a rating to be present on the same page. Shipping a 5-star
 * aggregate on a page that renders no reviews is exactly what the structured
 * data policy treats as unsupported markup.
 *
 * Everything that describes the person as a CV subject — worksFor, alumniOf,
 * knowsAbout, sameAs, address, identifiers — stays, and the @id stays identical
 * to the landing's so both pages still resolve to one entity.
 */
const _resumePerson = (locale) => {
  /* Rest-destructure to OMIT the landing-only properties from this page's
     Person node. The named bindings exist purely to be discarded, so the rule
     is disabled across the statement rather than the names being mangled. */
  /* eslint-disable no-unused-vars */
  const {
    makesOffer: _offer,
    hasCreatedWork: _works,
    review: _reviews,
    ...person
  } = buildPersonJsonLd(locale);
  /* eslint-enable no-unused-vars */

  return {
    ...person,
    mainEntityOfPage: { '@id': resumeId(locale) },
    subjectOf: { '@id': cvId(locale) },
    email: `mailto:${AUTHOR_INFO.email}`,
  };
};

export const buildResumeJsonLd = ({ locale = 'en' } = {}) => ({
  '@context': 'https://schema.org',
  '@graph': [
    /* The WebSite node must be PRESENT on this page, not merely referenced:
       @id resolution is per-document, so `isPartOf: { '@id': WEBSITE_ID }`
       below pointed at nothing here. The landing pages only got away with the
       bare reference because their FAQ block re-declares WebSite inline. */
    buildWebSiteJsonLd(),
    {
      '@type': 'ProfilePage',
      '@id': resumeId(locale),
      url: _url(locale),
      name: _i18n(locale, 'resume.meta.title'),
      description: _i18n(locale, 'resume.meta.description'),
      inLanguage: locale,
      isPartOf: { '@id': WEBSITE_ID },
      mainEntity: { '@id': PERSON_ID },
      breadcrumb: { '@id': crumbId(locale) },
      dateModified: BUILD_DATE,
      primaryImageOfPage: {
        '@type': 'ImageObject',
        url: _ogImage(locale),
        width: SEO.ogImageWidth,
        height: SEO.ogImageHeight,
      },
      associatedMedia: { '@id': cvId(locale) },
      significantLink: absoluteUrl(CV_URL[locale] || CV_URL.en),
      author: { '@id': PERSON_ID },
      creator: { '@id': PERSON_ID },
    },
    _breadcrumb(locale),
    _cvDocument(locale),
    /* The canonical Person — same @id as the landing, so both pages resolve to
       one entity in the graph rather than creating a duplicate profile. */
    _resumePerson(locale),
  ],
});

export default buildResumeJsonLd;
