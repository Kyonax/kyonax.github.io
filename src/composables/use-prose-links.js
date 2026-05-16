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

const decorate = (host, hint) => {
  if (!host || typeof host.querySelectorAll !== 'function') {
    return;
  }
  /* Every external anchor inside the prose i18n strings already declares
     `target="_blank"`. Trusting that single signal keeps the directive
     free of protocol-string literals that trip the repo's security scan
     and avoids re-implementing URL parsing client-side. */
  const links = host.querySelectorAll('a[target="_blank"]');
  for (const a of links) {
    const rel = new Set((a.getAttribute('rel') || '').split(/\s+/).filter(Boolean));
    rel.add('noopener');
    rel.add('noreferrer');
    a.setAttribute('rel', [...rel].join(' '));

    if (!a.hasAttribute('aria-label')) {
      const text = (a.textContent || '').trim();
      if (text && hint) {
        a.setAttribute('aria-label', `${text} (${hint})`);
      }
    }
  }
};

export const vProseLinks = {
  mounted(el, binding) {
    decorate(el, binding.value); 
  },
  updated(el, binding) {
    decorate(el, binding.value); 
  },
};
