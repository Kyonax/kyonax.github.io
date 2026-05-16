/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 */

import { useI18n } from 'vue-i18n';
import { useRouter, useRoute } from 'vue-router';

import { SUPPORTED_LANGUAGES } from '@data/data';
import { ROUTE_BY_LOCALE } from '@seo/routes';
import { STORAGE_KEY } from '@i18n/detect-locale';

const _persist = (code) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, code);
  } catch {
    /* private mode */
  }
};

export const useLanguage = () => {
  const { locale } = useI18n();
  const router = useRouter();
  const route = useRoute();

  const setLanguage = (code) => {
    if (!SUPPORTED_LANGUAGES.includes(code)) return;
    const target = ROUTE_BY_LOCALE[code];
    _persist(code);
    if (route.path !== target) {
      router.push({ path: target, hash: route.hash });
    }
  };

  return {
    locale,
    supportedLanguages: SUPPORTED_LANGUAGES,
    setLanguage,
  };
};

export default useLanguage;
