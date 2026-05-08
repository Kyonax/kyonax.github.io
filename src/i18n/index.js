/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 */

import { createI18n } from 'vue-i18n';

import { DEFAULT_LANGUAGE } from '@data/data';

import messages from './messages';

export const i18n = createI18n({
  legacy: false,
  locale: DEFAULT_LANGUAGE,
  fallbackLocale: 'en',
  messages,
  warnHtmlMessage: false,
  missingWarn:        import.meta.env.DEV,
  fallbackWarn:       import.meta.env.DEV,
  silentTranslationWarn:  !import.meta.env.DEV,
  silentFallbackWarn:     !import.meta.env.DEV,
});

export default i18n;
