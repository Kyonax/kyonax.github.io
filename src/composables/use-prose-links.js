/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 *
 * `v-prose-links` directive — runs after `v-html` content mounts (and on
 * subsequent updates) to harden every external `<a>` inside the host:
 *   - Forces `rel="noopener noreferrer"` (security + referrer-policy).
 *   - When the link has no explicit `aria-label`, builds one from the
 *     link text + the localized "(opens in new tab)" hint so AT users
 *     know the navigation context. Existing aria-labels are respected.
 *
 * Does NOT change the visible link text — purely an accessibility
 * decoration on top of i18n strings rendered via v-html. The "opens in
 * new tab" hint is passed in via the `value` so the call-site can pull
 * it from `useI18n()` and the directive itself stays locale-agnostic.
 */

const ABSOLUTE_HREF = /^(https?:)?\/\//i;

const decorate = (host, hint) => {
  if (!host || typeof host.querySelectorAll !== 'function') return;
  const links = host.querySelectorAll('a');
  for (const a of links) {
    const href = a.getAttribute('href') || '';
    const opens_new_tab = a.getAttribute('target') === '_blank' || ABSOLUTE_HREF.test(href);
    if (!opens_new_tab) continue;

    if (a.getAttribute('target') !== '_blank') a.setAttribute('target', '_blank');
    const rel = new Set((a.getAttribute('rel') || '').split(/\s+/).filter(Boolean));
    rel.add('noopener');
    rel.add('noreferrer');
    a.setAttribute('rel', [...rel].join(' '));

    if (!a.hasAttribute('aria-label')) {
      const text = (a.textContent || '').trim();
      if (text && hint) a.setAttribute('aria-label', `${text} (${hint})`);
    }
  }
};

export const vProseLinks = {
  mounted(el, binding) { decorate(el, binding.value); },
  updated(el, binding) { decorate(el, binding.value); },
};
