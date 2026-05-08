/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 */

import { computed, onMounted, onBeforeUnmount } from 'vue';

import { useI18n } from 'vue-i18n';

import { SUPPORTED_LANGUAGES } from '@data/data';

import { STORAGE_KEY } from '@i18n/detect-locale';

const URL_PARAM = 'language';

const _persist = (code) => {
  try {
    window.localStorage.setItem(STORAGE_KEY, code);
  } catch {
    /* private mode — silent */
  }
};

const _update_url = (code) => {
  const url = new URL(window.location.href);
  url.searchParams.set(URL_PARAM, code);
  window.history.replaceState(null, '', url.toString());
};

const _update_html_lang = (code) => {
  document.documentElement.lang = code;
};

const _read_url_locale = () => {
  const params = new URLSearchParams(window.location.search);
  const value = params.get(URL_PARAM);
  return SUPPORTED_LANGUAGES.includes(value) ? value : null;
};

/**
 * @returns {{
 *   locale:              import('vue').ComputedRef<string>,
 *   supported_languages: ReadonlyArray<string>,
 *   setLanguage:         (code: string) => void,
 * }}
 */
export const useLanguage = () => {
  const { locale } = useI18n();

  const setLanguage = (code) => {
    if (!SUPPORTED_LANGUAGES.includes(code)) {
      return;
    }
    locale.value = code;
    _persist(code);
    _update_url(code);
    _update_html_lang(code);
  };

  let popstate_handler = null;

  onMounted(() => {
    popstate_handler = () => {
      const next = _read_url_locale();
      if (next && next !== locale.value) {
        locale.value = next;
        _update_html_lang(next);
      }
    };
    window.addEventListener('popstate', popstate_handler);
  });

  onBeforeUnmount(() => {
    if (popstate_handler) {
      window.removeEventListener('popstate', popstate_handler);
      popstate_handler = null;
    }
  });

  return {
    locale: computed(() => locale.value),
    supported_languages: SUPPORTED_LANGUAGES,
    setLanguage,
  };
};

export default useLanguage;
