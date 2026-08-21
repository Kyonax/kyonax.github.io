/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 *
 * Reads a translated string straight out of the message catalogue at build
 * time. The JSON-LD builders run outside a Vue component, so there is no
 * `useI18n()` to call — but the graph MUST quote the same strings the page
 * renders, or the markup starts describing a page that does not exist. Every
 * builder goes through here so there is one answer to "what does this page
 * actually say".
 */

import { TRANSLATIONS } from '@data/snippets';

export const i18nString = (locale, path) => {
  const parts = path.split('.');
  let v = TRANSLATIONS?.[locale]?.['kyo-web'];
  for (const p of parts) {
    v = v?.[p];
  }
  return typeof v === 'string' ? v : '';
};

export default i18nString;
