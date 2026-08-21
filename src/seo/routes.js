/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 */

import { LOCALE_URL, SITE_ORIGIN, X_DEFAULT_URL } from '@data/data';

export const ROUTE_BY_LOCALE = Object.freeze({
  en: '/',
  es: '/es',
});

export const HREFLANG_ALTERNATES = Object.freeze([
  { hreflang: 'en',         href: LOCALE_URL.en },
  { hreflang: 'es',         href: LOCALE_URL.es },
  { hreflang: 'x-default',  href: X_DEFAULT_URL },
]);

/* Dedicated resume pages. Localised slugs so the ES URL itself carries the
   Spanish query token ("hoja de vida" is what Colombian searchers type). */
export const RESUME_ROUTE_BY_LOCALE = Object.freeze({
  en: '/resume',
  es: '/es/hoja-de-vida',
});

export const RESUME_URL = Object.freeze({
  en: `${SITE_ORIGIN}/resume`,
  es: `${SITE_ORIGIN}/es/hoja-de-vida`,
});

export const RESUME_HREFLANG_ALTERNATES = Object.freeze([
  { hreflang: 'en',        href: RESUME_URL.en },
  { hreflang: 'es',        href: RESUME_URL.es },
  { hreflang: 'x-default', href: RESUME_URL.en },
]);

/* Privacy policy pages. The slug is NOT localised: /es/privacy keeps the
   English word because "privacy" is the token Spanish speakers type for a
   policy page, and the URLs were already published and indexed under it. */
export const PRIVACY_ROUTE_BY_LOCALE = Object.freeze({
  en: '/privacy',
  es: '/es/privacy',
});

export const PRIVACY_URL = Object.freeze({
  en: `${SITE_ORIGIN}/privacy`,
  es: `${SITE_ORIGIN}/es/privacy`,
});

export const PRIVACY_HREFLANG_ALTERNATES = Object.freeze([
  { hreflang: 'en',        href: PRIVACY_URL.en },
  { hreflang: 'es',        href: PRIVACY_URL.es },
  { hreflang: 'x-default', href: PRIVACY_URL.en },
]);

/*
 * Every locale-paired route family on the site, widest match last. The language
 * toggle walks these to answer "same page, other locale" — without the table it
 * has to special-case each secondary page, which is how the resume pages got a
 * hardcoded branch and the privacy pages would have silently bounced visitors
 * back to the landing. Adding a new localised page means adding its map HERE
 * and nowhere else.
 */
const ROUTE_FAMILIES = Object.freeze([
  RESUME_ROUTE_BY_LOCALE,
  PRIVACY_ROUTE_BY_LOCALE,
  ROUTE_BY_LOCALE,
]);

/* Trailing slash is optional in the served URLs (Apache DirectorySlash Off),
   so both forms must match or the toggle drops to the landing fallback. */
const _matches = (path, route) => path === route || path === `${route}/`;

/*
 * Which KIND of page a path is. One answer, read by the nav (which chrome to
 * show), by App (which view and which JSON-LD graph) and by anything else that
 * needs to distinguish the landing from a document page — previously three
 * separate copies of the same regex, which is how the privacy pages would have
 * silently inherited landing behaviour.
 */
export const routeKind = (path) => {
  if (Object.values(RESUME_ROUTE_BY_LOCALE).some((r) => _matches(path, r))) {
    return 'resume';
  }
  if (Object.values(PRIVACY_ROUTE_BY_LOCALE).some((r) => _matches(path, r))) {
    return 'privacy';
  }
  return 'landing';
};

/*
 * The other-locale twin of `path`, or that locale's landing page when `path`
 * belongs to no known family.
 */
export const localeSwapTarget = (path, locale) => {
  const family = ROUTE_FAMILIES.find((f) => Object.values(f).some((r) => _matches(path, r)));
  return (family || ROUTE_BY_LOCALE)[locale] || ROUTE_BY_LOCALE.en;
};

export const absoluteUrl = (path = '/') => {
  if (!path) {
    return `${SITE_ORIGIN  }/`;
  }
  if (path.startsWith('http')) {
    return path;
  }
  return SITE_ORIGIN + (path.startsWith('/') ? path : `/${  path}`);
};

export default ROUTE_BY_LOCALE;
