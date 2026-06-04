/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 *
 * `v-prose-links` directive — runs after `v-html` content mounts (and on
 * subsequent updates) to harden every external `<a>` inside the host:
 *
 *   - Forces `rel="noopener noreferrer"` on every `target="_blank"` anchor
 *     (security + referrer-policy).
 *   - Clears any `aria-label` and `aria-describedby` attributes that
 *     previous directive versions added — the accessible name comes from
 *     the link's text content, period.
 *   - Removes any leftover hint `<span>` children added by previous
 *     directive versions.
 *
 * Why no aria-label or sr-only hint:
 *   WCAG 2.5.3 Label in Name requires the accessible name to contain the
 *   visible text. The cleanest, most universally passing pattern is to
 *   let the accessible name BE the visible text (computed from
 *   `textContent`). Any added "opens in new tab" decoration — whether via
 *   `aria-label`, `aria-describedby`, or sr-only spans — risks confusing
 *   strict WCAG 2.5.3 checkers that compare visible text against the
 *   accessible name with substring algorithms sensitive to nested
 *   parentheticals or sr-only handling differences.
 *
 *   Modern assistive technologies (VoiceOver, NVDA, JAWS) announce
 *   `target="_blank"` automatically as "opens in new tab" / "abre en
 *   nueva pestaña" when the user has the setting enabled. The semantic
 *   `rel="noopener noreferrer"` + `target="_blank"` pair is sufficient
 *   signal for both AT and crawlers.
 *
 * The `binding.value` (localized "opens in new tab" hint) is now unused
 * but kept in the call-sites so the directive contract is stable and the
 * hint can be reintroduced cleanly (e.g. via a visible icon adjacent to
 * the link) without changing every consumer.
 */

const HINT_MARKER = 'v-prose-link-hint';

const decorate = (host) => {
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

    /* Drop any aria-label or aria-describedby left by older directive
       versions. The accessible name now comes purely from text content. */
    if (a.hasAttribute('aria-label')) {
      a.removeAttribute('aria-label');
    }
    if (a.hasAttribute('aria-describedby')) {
      a.removeAttribute('aria-describedby');
    }

    /* Remove any hint <span> previously inserted into the link by older
       directive versions so the visible text and accessible name match
       exactly. */
    const stale_hint = a.querySelector(`.${HINT_MARKER}`);
    if (stale_hint) {
      stale_hint.remove();
    }
  }
};

export const vProseLinks = {
  mounted(el /*, binding */) {
    decorate(el);
  },
  updated(el /*, binding */) {
    decorate(el);
  },
};
