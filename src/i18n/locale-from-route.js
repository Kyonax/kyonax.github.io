/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 */

import { DEFAULT_LANGUAGE } from '@data/data';

export const localeFromRoute = (pathname) => {
  if (!pathname) {
    return DEFAULT_LANGUAGE;
  }
  if (pathname === '/es' || pathname.startsWith('/es/')) {
    return 'es';
  }
  return DEFAULT_LANGUAGE;
};

export default localeFromRoute;
