/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 */

import { SUPPORTED_LANGUAGES } from '@data/data';
import { STORAGE_KEY } from '@i18n/detect-locale';
import { isBlogPath } from '@seo/blog-routes';
import { localeSwapTarget } from '@seo/routes';
import { useI18n } from 'vue-i18n';
import { useRoute,useRouter } from 'vue-router';

const _persist = (code) => {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, code);
  } catch {
    /* private mode */
  }
};

/* Trailing slash is optional in the served URLs (Apache DirectorySlash Off),
   so "already on that page" has to accept both forms, the rule routes.js and
   blog-routes.js apply to their own comparisons. */
const _strip = (p) => (p !== '/' && p.endsWith('/') ? p.slice(0, -1) : p);

/*
 * WARM ONCE PER URL, AND FAIL SILENTLY. The toggle warms when the pointer
 * reaches it and again when its menu opens, so one gesture asks for the same
 * URL twice: only the first call touches the network, and a failure is never
 * retried, because a speculative fetch that fails must stay quiet rather than
 * loop. The BODY is read, not just the headers: only a complete response is
 * reused by the navigation that follows. Save-Data and 2g opt out;
 * `navigator.connection` is Chromium-only, so it is feature-detected.
 */
const _warmed = new Set();

const _warm = (url) => {
  if (_warmed.has(url)) {
    return;
  }
  const net = navigator.connection;
  if (net && (net.saveData || /2g/.test(net.effectiveType || ''))) {
    return;
  }
  _warmed.add(url);
  fetch(url, { priority: 'low' })
    .then((res) => res.arrayBuffer())
    .catch(() => {});
};

export const useLanguage = () => {
  const { locale } = useI18n();
  const router = useRouter();
  const route = useRoute();

  /* Stay on the page you are on: switching language from any secondary page
     must land on that page's other locale, not bounce back to the landing.
     The route-family table lives in @seo/routes so a new localised page is
     registered once instead of adding a branch here. Null when `code` is the
     language of the page you are already on. */
  const _target = (code) => {
    const target = localeSwapTarget(route.path, code);
    return _strip(target) === _strip(route.path) ? null : target;
  };

  /*
   * ON THE BLOG THE SWITCH IS A DOCUMENT LOAD; EVERYWHERE ELSE IT STAYS A
   * CLIENT-SIDE PUSH. The blog's views sit behind a keyed <Suspense> with no
   * fallback, so a push kept the OLD article on screen while the nav labels,
   * the date and <html lang> had already turned: a frame in two languages. An
   * article with no twin lands on the archive, and that swap showed an empty
   * <main> until the chunk arrived. A document load has neither: the old page
   * stays whole until the new one paints. The landing, the resume and the
   * privacy pages re-render from the catalogue in one pass, and the landing
   * keeps its scroll position, so they keep router.push.
   *
   * THE QUERY AND THE HASH TRAVEL WITH IT, read from `location` and not from
   * the route: the archive search writes `?search=` with replaceState, which
   * the router never sees, and the owner decided the term follows the reader
   * into the other language. Null when the switch is not a document load.
   */
  const _documentHref = (code) => {
    const target = _target(code);
    if (!target || typeof window === 'undefined') {
      return null;
    }
    if (!isBlogPath(route.path) && !isBlogPath(target)) {
      return null;
    }
    return `${target}${window.location.search}${window.location.hash}`;
  };

  const setLanguage = (code) => {
    if (!SUPPORTED_LANGUAGES.includes(code)) {
      return;
    }
    _persist(code);
    const target = _target(code);
    if (!target) {
      return;
    }
    const href = _documentHref(code);
    if (href) {
      /* The Umami `language-toggle` event is already on the wire: the tracker
         hears clicks on the document in the CAPTURE phase, before this
         handler, and posts with fetch keepalive, which outlives the page. */
      window.location.assign(href);
      return;
    }
    router.push({ path: target, hash: route.hash });
  };

  /* Warms the document a switch to `code` would load; a no-op wherever the
     switch stays client-side. The hash is cut: it is never sent, so it is no
     part of what the HTTP cache keeps. */
  const warmLanguage = (code) => {
    if (!SUPPORTED_LANGUAGES.includes(code)) {
      return;
    }
    const href = _documentHref(code);
    if (href) {
      _warm(href.split('#')[0]);
    }
  };

  return {
    locale,
    supportedLanguages: SUPPORTED_LANGUAGES,
    setLanguage,
    warmLanguage,
  };
};

export default useLanguage;
