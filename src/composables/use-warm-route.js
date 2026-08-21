/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 *
 * Hover/focus prediction-prefetch for whole ROUTES, mirroring the shape of
 * use-warm-modal.js (module-scoped dedup, warm-once, silent failure).
 *
 * WHY a document prefetch rather than a chunk import: the landing and the
 * resume pages are separate prerendered documents linked by plain <a href>,
 * so moving between them is a full navigation, not a router transition. The
 * JS/CSS bundle is shared and already cached by then — the byte the visitor
 * actually waits on is the HTML document, which is exactly what this warms.
 *
 * Deduped module-scope, so a caller may fire it on every pointerenter without
 * guarding: only the first call per URL ever touches the network.
 */

const _warmed = new Set();

export const warmRoute = (href) => {
  if (typeof document === 'undefined' || !href) {
    return;
  }
  if (_warmed.has(href)) {
    return;
  }
  _warmed.add(href);

  const link = document.createElement('link');
  link.rel = 'prefetch';
  /* `as` keeps Chrome from parking the response in a cache partition the
     subsequent navigation cannot read. Browsers without prefetch support
     (Safari) simply ignore the tag — no polyfill, no error.

     NOTE: reading `link.as` back returns '' because the IDL getter only
     reflects its own enumerated set, which excludes 'document'. The content
     attribute IS written (verified: <link rel="prefetch" as="document" ...>)
     and that is what the fetch destination is read from. Do not "fix" the
     empty getter by dropping this line. */
  link.as = 'document';
  link.href = href;

  /* Drop the tag once the fetch reaches a TERMINAL state — never before, since
     removing an in-flight <link> aborts the request it was meant to warm. Once
     the response has landed it lives in the HTTP cache, so the element has done
     its job and removing it keeps <head> from growing one dead tag per hover.

     DO NOT re-arm `_warmed` here. The previous version deleted the href on
     error "so a failed warm can be retried", which turned one failure into an
     unbounded loop: Firefox aborts a document prefetch whose response is not
     cacheable (vite preview serves HTML as `Cache-Control: no-cache`), the
     error handler cleared the dedup entry, and the next pointerenter fired a
     fresh request — every hover re-requesting the document as
     NS_BINDING_ABORTED and leaking another <link>. One attempt per URL per page
     load is the correct budget for a speculative prefetch: it is an
     optimisation, and a failed optimisation must stay silent, not retry. */
  const drop = () => link.remove();
  link.addEventListener('load',  drop, { once: true });
  link.addEventListener('error', drop, { once: true });

  document.head.append(link);
};

export default warmRoute;
