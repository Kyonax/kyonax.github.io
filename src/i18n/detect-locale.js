/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 */

import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES } from '@data/data';

export const STORAGE_KEY = 'kyo:lang';

const URL_PARAM = 'language';

const _is_supported = (code) =>
  Boolean(code) && SUPPORTED_LANGUAGES.includes(code);

const _from_url = () => {
  if (typeof window === 'undefined') {
    return null;
  }
  const params = new URLSearchParams(window.location.search);
  const value = params.get(URL_PARAM);
  return _is_supported(value) ? value : null;
};

const _from_storage = () => {
  if (typeof window === 'undefined' || !window.localStorage) {
    return null;
  }
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return _is_supported(value) ? value : null;
  } catch {
    /* localStorage may throw in privacy mode — silent fallback */
    return null;
  }
};

const _from_navigator = () => {
  if (typeof navigator === 'undefined') {
    return null;
  }
  const raw = (navigator.language || '').slice(0, 2).toLowerCase();
  return _is_supported(raw) ? raw : null;
};

/**
 * Detect the initial locale once, at bootstrap. Idempotent.
 * @returns {string} A code from SUPPORTED_LANGUAGES.
 */
export const detectInitialLocale = () =>
  _from_url() || _from_storage() || _from_navigator() || DEFAULT_LANGUAGE;

export default detectInitialLocale;
