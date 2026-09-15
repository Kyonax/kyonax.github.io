/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 *
 * Umami Cloud, added to the page once per page load. Called from App's setup,
 * which vite-ssg's client entry mounts once; a full page load runs it again.
 *
 * CLIENT ONLY, AND ONLY IN onMounted. vite-ssg renders every route in Node,
 * where there is no window, document or localStorage. onMounted never runs
 * there, so the tag is added to the live document after hydration and never
 * reaches the prerendered HTML.
 *
 * IT DOES NOTHING ELSE. Umami counts the first page view itself and wraps
 * history.pushState for the router's client-side moves, so there is no router
 * hook and no umami.track() here: either would count every view twice. Events
 * are declared on the elements (data-umami-event="..."), never in code.
 *
 * THE OPT-OUT IS UMAMI'S OWN KEY, `umami.disabled` in localStorage, which the
 * privacy page's toggle sets. The tracker checks it before every send; checking
 * it here as well means an opted-out visitor never downloads the script.
 */

import { ANALYTICS } from '@data/data';
import { onMounted } from 'vue';

const OPT_OUT_KEY = 'umami.disabled';

/* Fails closed. Storage only throws when the visitor has blocked site data, so
   no opt-out could be read, and that visitor has already said no to being
   remembered. */
const _opted_out = () => {
  try {
    return Boolean(window.localStorage.getItem(OPT_OUT_KEY));
  } catch {
    return true;
  }
};

const _inject = () => {
  const { provider, host, websiteId, domains } = ANALYTICS;
  if (provider !== 'umami' || !host || !websiteId) {
    return;
  }
  if (typeof window === 'undefined' || window.__umami_loaded) {
    return;
  }
  if (_opted_out()) {
    return;
  }
  window.__umami_loaded = true;

  /* `defer` mirrors Umami's own snippet; an inserted script is async anyway.
     do-not-track honours the browser's DNT signal, exclude-search keeps query
     strings out of the recorded URLs, and domains stops every host but
     production from sending. */
  const script = document.createElement('script');
  script.defer = true;
  script.src = `${host}/script.js`;
  script.setAttribute('data-website-id', websiteId);
  script.setAttribute('data-do-not-track', 'true');
  script.setAttribute('data-exclude-search', 'true');
  if (domains && domains.length) {
    script.setAttribute('data-domains', domains.join(','));
  }
  document.head.append(script);
};

export const useAnalytics = () => {
  onMounted(_inject);
};

export default useAnalytics;
