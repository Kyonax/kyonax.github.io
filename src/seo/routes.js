/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 */

import { SITE_ORIGIN, LOCALE_URL, X_DEFAULT_URL } from '@data/data';

export const ROUTE_BY_LOCALE = Object.freeze({
  en: '/',
  es: '/es',
});

export const HREFLANG_ALTERNATES = Object.freeze([
  { hreflang: 'en',         href: LOCALE_URL.en },
  { hreflang: 'es',         href: LOCALE_URL.es },
  { hreflang: 'x-default',  href: X_DEFAULT_URL },
]);

export const absoluteUrl = (path = '/') => {
  if (!path) return SITE_ORIGIN + '/';
  if (path.startsWith('http')) return path;
  return SITE_ORIGIN + (path.startsWith('/') ? path : '/' + path);
};

export default ROUTE_BY_LOCALE;
