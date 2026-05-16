/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 */

import { DEFAULT_LANGUAGE } from '@data/data';
import { createI18n } from 'vue-i18n';

import messages from './messages';

export const createI18nInstance = (initialLocale = DEFAULT_LANGUAGE) =>
  createI18n({
    legacy: false,
    locale: initialLocale,
    fallbackLocale: 'en',
    messages,
    warnHtmlMessage: false,
    missingWarn:  import.meta.env.DEV,
    fallbackWarn: import.meta.env.DEV,
  });
