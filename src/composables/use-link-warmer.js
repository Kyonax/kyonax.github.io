/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 */

/*
 * use-link-warmer.js — ONE warmer for every link on the site.
 *
 * WHY ONE, AND WHY OUT OF THE COMPONENTS. Every link here is a plain <a href>,
 * so moving between the landing, the resume, the archive and an article is a
 * full document load, never a router transition. Two components warmed their
 * own link (the hero's CV button and the breadcrumbs, through
 * use-warm-route.js) and every other surface — the lead, the cards, the rows,
 * the series, related reading, the pager, the chips, the byline, the nav, the
 * footer — warmed nothing. Three delegated listeners on the document replace
 * all of it: a link rendered anywhere, now or after hydration, is covered
 * without its component knowing. Capture phase, so a component that stops
 * propagation cannot hide its links from it.
 *
 * INTENT. A mouse `pointerover` waits INTENT_MS, so a cursor that only crosses
 * a link on its way elsewhere costs nothing; touch and pen warm at once — a
 * finger on a link is most of a tap already. `focusin` warms at once (the
 * keyboard, and the focus a mouse press gives a link). `touchstart` is passive
 * and also fires when a scroll starts over a link: the owner accepted that,
 * and the cap below bounds it.
 *
 * NEVER WARMED: this same URL — which is also every hash-only link, since `#x`
 * resolves to this page — a new tab, a download, anything under
 * `[data-no-warm]`, another origin, and any path the router does not know,
 * which is how the feed, the CV PDFs and a dead link fall out without a list.
 * Nothing at all under Save-Data or a 2g connection. At most MAX_TARGETS
 * documents per page load, each URL once: a failed speculative fetch stays
 * failed rather than retrying on the next hover (the retry loop is the bug
 * use-warm-route.js once shipped).
 *
 * PHASE 1 — THE DOCUMENT. `fetch(url, { priority: 'low' })` leaves the HTML in
 * the HTTP cache, where the navigation that follows finds it. MEASURED: zero
 * server hits and transferSize 0 in Chromium 153 and Firefox 155 against the
 * production headers of public/.htaccess. A fetch and not <link rel=prefetch
 * as=document>, because Safari ignores link prefetch altogether.
 *
 * PHASE 2 — WHAT THAT DOCUMENT WILL ASK FOR. The fetched HTML is parsed
 * (DOMParser runs no script and loads nothing) for its same-origin CSS and JS,
 * and each file this page has not loaded yet gets a <link rel=prefetch>: the
 * article view's chunk and style, the Style Book, o2h.js, the post's body
 * chunk. MEASURED: every one a cache hit on the navigation in both engines,
 * the two unhashed 300 s files included.
 *
 * MAIN BUNDLE, SO IT IMPORTS NOTHING. The route set comes from the router
 * main.js hands in, never from the blog manifest or the index.
 */

/* How long a resting cursor must stay on a link before it counts as intent. */
const INTENT_MS = 65;
/* Documents warmed per page load, at most. */
const MAX_TARGETS = 10;
/* What a document references that is worth fetching ahead of it. */
const ASSETS = 'link[rel~="stylesheet"][href],link[rel~="modulepreload"][href],script[src]';

const _warmed = new Set();
const _prefetched = new Set();
let _routes = null;
let _pending = null;

const _strip = (p) => (p.length > 1 && p.endsWith('/') ? p.slice(0, -1) : p);

/* Save-Data, or a 2g / slow-2g link. `navigator.connection` is Chromium's
   alone; Firefox and Safari have none, so there nothing is withheld. */
const _constrained = () => {
  const c = navigator.connection;
  return Boolean(c && (c.saveData || /2g/.test(c.effectiveType)));
};

/*
 * The URL to warm for a link, or null. Read through the anchor's own URL
 * parts, which never throw on a malformed href the way `new URL()` does. The
 * hash is dropped because it never reaches the server: a chip's
 * `/blog?q=ci#all-posts` is the document at `/blog?q=ci`.
 */
const _target = (a) => {
  if (!(a instanceof HTMLAnchorElement)
    || (a.target && a.target !== '_self')
    || a.hasAttribute('download')
    || a.closest('[data-no-warm]')
    || a.origin !== location.origin
    || !_routes.has(_strip(a.pathname))) {
    return null;
  }
  const url = a.origin + a.pathname + a.search;
  return url === location.origin + location.pathname + location.search
    ? null
    : url;
};

/* Only what this page has not fetched already, by URL: its resource entries
   plus the tags in its own head, which cover a file still in flight. */
const _prefetchAssets = (html, base) => {
  const have = new Set(performance.getEntriesByType('resource')
    .map((e) => e.name));
  for (const el of document.querySelectorAll(ASSETS)) {
    have.add(el.href || el.src);
  }
  const doc = new DOMParser().parseFromString(html, 'text/html');
  for (const el of doc.querySelectorAll(ASSETS)) {
    const url = new URL(el.getAttribute('href') || el.getAttribute('src'), base);
    if (url.origin !== location.origin
      || have.has(url.href) || _prefetched.has(url.href)) {
      continue;
    }
    _prefetched.add(url.href);
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.href = url.href;
    /* Dropped once the fetch is TERMINAL, never before: removing an in-flight
       <link> aborts the request it exists to make. */
    const drop = () => link.remove();
    link.addEventListener('load', drop, { once: true });
    link.addEventListener('error', drop, { once: true });
    document.head.append(link);
  }
};

const _warm = (a) => {
  if (_constrained() || _warmed.size >= MAX_TARGETS) {
    return;
  }
  const url = _target(a);
  if (!url || _warmed.has(url)) {
    return;
  }
  _warmed.add(url);
  fetch(url, { priority: 'low' })
    .then((res) => (res.ok && /html/.test(res.headers.get('content-type'))
      ? res.text().then((html) => _prefetchAssets(html, res.url))
      : null))
    .catch(() => {});
};

const _anchor = (e) => (e.target instanceof Element
  ? e.target.closest('a[href]')
  : null);

const _now = (e) => {
  const a = _anchor(e);
  if (a) {
    _warm(a);
  }
};

/* One pending link at a time. Moving onto a child of the SAME link keeps its
   timer; any other pointerover — another link, or no link — cancels it. */
const _over = (e) => {
  if (e.pointerType !== 'mouse') {
    _now(e);
    return;
  }
  const a = _anchor(e);
  if (_pending && _pending.a === a) {
    return;
  }
  clearTimeout(_pending?.timer);
  _pending = a
    ? {
      a,
      timer: setTimeout(() => {
        _pending = null;
        _warm(a);
      }, INTENT_MS),
    }
    : null;
};

/*
 * Client only: main.js calls it when `isClient`, since the prerender has no
 * document, no pointer and nothing to warm. Idempotent, so a second call (dev
 * HMR re-running the entry) never doubles the listeners.
 *
 * Every blog post and archive page is a STATIC route (router.js), so an exact
 * path set is complete; a parametric route could never match by equality and
 * is left out rather than half-matched.
 */
export const installLinkWarmer = (router) => {
  if (_routes || typeof document === 'undefined') {
    return;
  }
  _routes = new Set(router.getRoutes()
    .map((r) => r.path)
    .filter((p) => !p.includes(':'))
    .map(_strip));
  const opts = { capture: true, passive: true };
  document.addEventListener('pointerover', _over, opts);
  document.addEventListener('focusin', _now, opts);
  document.addEventListener('touchstart', _now, opts);
};

export default installLinkWarmer;
