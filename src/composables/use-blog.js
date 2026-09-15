/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 */

/*
 * use-blog.js — read the synced blog corpus.
 *
 * Two different loads, deliberately kept apart:
 *
 *   INDEX data (titles, dates, card images) comes from the manifest, which is
 *   metadata only and small enough to import eagerly.
 *
 *   POST BODIES come from one JSON file per post, resolved through
 *   import.meta.glob so each article is its OWN chunk. Importing them eagerly
 *   would put every article in the main bundle, and that budget is 180 KB
 *   gzipped for the whole site.
 *
 * The bodies are pre-rendered, pre-sanitized HTML from org2html (jsdom +
 * DOMPurify, sanitize-by-default), which is why the post view can v-html them
 * the same way privacy.vue v-htmls its i18n copy into .doc-rich.
 */

import {
  BLOG_MANIFEST,
  blogPageAt,
  blogPostAt,
  blogSiteUrl,
  isBlogPostPath,
} from '@seo/blog-routes';

/* The RICH half of the corpus — titles, descriptions, card images, per-page
   item lists. Imported lazily and only by the archive view, so it lands in
   that view's chunk instead of the main bundle, which is budgeted at 180 KB
   gzipped for the whole site. */
const loadIndex = () => import('@data/blog/index.json').then((m) => m.default || m);

/* Lazy: one chunk per post. The keys are paths under src/data/blog/posts/. */
const BODIES = import.meta.glob('@data/blog/posts/*/*.json');

/*
 * The body file is DERIVED from the route, not stored on it.
 *
 * The routing manifest is imported eagerly by routes.js, so every field on a
 * post row costs main-bundle bytes for every visitor on every page. A body
 * path is ~40 bytes each — nothing at two posts, several kilobytes at two
 * hundred — and it is fully recoverable from the URL, so it is not stored.
 *
 * /es/blog/engineering/2026-05-01-x  ->  es/engineering__2026-05-01-x.json
 */
const bodyLoaderFor = (post) => {
  if (!post) {
    return null;
  }
  const base = BLOG_MANIFEST.base || '/blog';
  const prefix = post.locale === (BLOG_MANIFEST.defaultLocale || 'en')
    ? base
    : `/${post.locale}${base}`;
  const tail = post.url
    .slice(prefix.length)
    .replace(/^\//, '')
    .replace(/\//g, '__');
  const want = `/posts/${post.locale}/${tail}.json`;
  const key = Object.keys(BODIES).find((k) => k.endsWith(want));
  return key ? BODIES[key] : null;
};

/*
 * RELATIONS ARE DATA; ROUTES ARE THE HOST'S JOB [P-00].
 *
 * Every url the engine writes into relations.json is relative to the CORPUS
 * root (`/engineering/2026-05-01-x`), not to where this site mounts the blog.
 * Bound straight to an `href` they resolve to a path the router does not know,
 * and the 404 surface lands the reader on the landing page — which is what
 * previous/next, related reading and every series item were doing, in both
 * locales (Spanish lost `/es` as well as `/blog`).
 *
 * They are rewritten ONCE, here, so every component that renders navigation
 * stays dumb and no future component has to remember the rule.
 *
 * AND A LINK THAT GOES NOWHERE IS DROPPED, NOT RENDERED. The engine relates a
 * post to the whole corpus, both languages at once, and the prefix above is
 * the CURRENT post's locale — so a relation that crossed languages became
 * `/blog/<spanish-slug>` or `/es/blog/<english-slug>`, a route that does not
 * exist: 8 dead links under the articles, 6 related and a prev and a next.
 * kyo-blog now scopes relations to the post's locale at the source; this is
 * the host refusing to print a dead link whatever the data says. A url must
 * be a post route, and never the post itself — except the series entry the
 * engine marks `current`, which renders as text and is where the reader is.
 * Filtered, never renumbered: `position` and `total` stay the engine's.
 */
const siteRelations = (relations, locale) => {
  if (!relations) {
    return relations;
  }
  /* `relations.url` is the engine's own route for this document. */
  const self = blogSiteUrl(relations.url, locale);
  const link = (item) =>
    (item && item.url ? { ...item, url: blogSiteUrl(item.url, locale) } : item);
  const live = (item) => Boolean(item && item.url)
    && item.url !== self
    && isBlogPostPath(item.url);
  const linkOne = (item) => {
    const out = link(item);
    return live(out) ? out : null;
  };
  const linkAll = (items) => items
    .map(link)
    .filter((item) => live(item) || Boolean(item && item.current));
  return {
    ...relations,
    prev: linkOne(relations.prev),
    next: linkOne(relations.next),
    related: Array.isArray(relations.related)
      ? linkAll(relations.related)
      : relations.related,
    series: relations.series
      ? {
        ...relations.series,
        items: Array.isArray(relations.series.items)
          ? linkAll(relations.series.items)
          : relations.series.items,
      }
      : relations.series,
  };
};

/**
 * The full post at a path: metadata from the manifest, body + head + relations
 * from its own chunk. Returns null for a path that is not a post, so the view
 * can render a not-found state rather than throwing during prerender.
 */
export const loadBlogPost = async (path) => {
  const post = blogPostAt(path);
  const loader = bodyLoaderFor(post);
  if (!loader) {
    return null;
  }
  const mod = await loader();
  const body = mod.default || mod;
  /*
   * `description` is LIFTED OUT OF THE `seo` SIDECAR, and that is a real fix.
   *
   * The routing manifest carries url/locale/key and nothing else — the rich
   * index holds the descriptions and the archive view is the only thing that
   * loads it. So `post.description` was ALWAYS undefined here, and blog-post's
   * `useSeoHead({ description: post.description })` fell through to the
   * catalogue default: every article in both locales published the ARCHIVE's
   * meta description as its own, which is a duplicate-snippet defect across
   * the whole blog.
   *
   * The engine already emits the per-post one at `seo.description`, in the
   * body chunk this function has just loaded — so the fix costs no bytes and
   * no extra request.
   */
  /* `author` comes out of the same sidecar for the same reason: every article
     declares `#+AUTHOR:` and the engine carries it to `seo.author` for the
     BlogPosting graph, but nothing lifted it to where the view could show it. */
  return {
    ...post,
    ...body,
    description: body.description || body.seo?.description || '',
    author: body.author || body.seo?.author || '',
    relations: siteRelations(body.relations, post.locale),
  };
};

/*
 * THE TABLE OF CONTENTS, IN THE ARTICLE'S OWN LANGUAGE — and counted.
 *
 * org2html writes "Table of Contents" as both the heading and the nav's
 * aria-label whatever the document's `#+LANGUAGE:` says (src/plugins/toc.ts
 * hard-codes it), so every Spanish article opened its contents in English.
 * UPSTREAM CANDIDATE: the engine should localise it itself; this is the host
 * doing it until then, left out of the engine while its v1.2.0 is in flight.
 *
 * It rewrites only the opening of the TOC — the nav tag and its title — and
 * stamps `data-count` with the number of TOP-LEVEL entries, which the designs
 * show in the TOC's header. Done on the HTML string, so the server render and
 * the hydrated page are byte-identical; if the engine ever changes that markup
 * the pattern simply does not match and the English title stands.
 */
const TOC_HEAD = /^<nav class="org-toc" aria-label="[^"]*">\s*<h2 class="org-toc-title">[^<]*<\/h2>/;
const escapeHtml = (s) => String(s)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

export const dressBlogToc = (html, label) => {
  const start = html ? html.indexOf('<nav class="org-toc"') : -1;
  const end = start < 0 ? -1 : html.indexOf('</nav>', start);
  if (end < 0) {
    return html;
  }
  const nav = html.slice(start, end);
  let depth = 0;
  let count = 0;
  for (const [, close, tag] of nav.matchAll(/<(\/?)(ul|li)\b/g)) {
    if (tag === 'ul') {
      depth += close ? -1 : 1;
    } else if (!close && depth === 1) {
      count += 1;
    }
  }
  const safe = escapeHtml(label);
  const head = `<nav class="org-toc" aria-label="${safe}" data-count="${String(count).padStart(2, '0')}">`
    + `<h2 class="org-toc-title">${safe}</h2>`;
  return html.slice(0, start) + nav.replace(TOC_HEAD, head) + html.slice(end);
};

/* Resolve URLs against the rich index, order preserved. */
const rowsByUrl = (index, urls = []) => urls
  .map((u) => (index.posts || []).find((p) => p.url === u))
  .filter(Boolean);

/**
 * Everything an archive page renders: the featured post, the rest of that
 * page's posts, its prev/next page links — and `all`, every post of the
 * locale, which is what the archive's search filters.
 */
export const loadBlogIndex = async (path) => {
  const page = blogPageAt(path);
  if (!page) {
    return null;
  }

  const index = await loadIndex();
  /* The routing manifest carries page numbers and neighbours; the item LISTS
     live in the rich index, so they are read here rather than eagerly. */
  const bucket = (index.pages?.[page.locale] || [])
    .find((b) => b.number === page.number);
  const posts = rowsByUrl(index, bucket ? bucket.items : []);

  /* The featured slot is the newest post, and only on page 1 — on later pages
     every post is an ordinary row, or the archive would repeat itself. */
  const featured = page.number === 1 ? posts[0] || null : null;
  const rest = featured ? posts.slice(1) : posts;

  /* A SEARCH SPANS THE LOCALE, NOT THE PAGE it was opened on, and it needs no
     request of its own: the rich index is already loaded, its `timeline` is
     the engine's newest-first order, and its rows carry the title, excerpt
     and tags blog-search.vue matches. The same row objects `posts` holds. */
  const all = rowsByUrl(index, index.timeline?.[page.locale] || []);

  return { ...page, featured, rest, posts, all };
};

export const blogLocales = () => BLOG_MANIFEST.locales || [];

export default { loadBlogPost, loadBlogIndex, blogLocales, dressBlogToc };
