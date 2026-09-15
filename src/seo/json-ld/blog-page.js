/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 */

/*
 * JSON-LD for the blog: a CollectionPage per archive page, about the one Blog
 * of its locale, and a BlogPosting for an article.
 *
 * WHY NOT org2html's structured-data.json. The engine writes one, but it is a
 * deliberately minimal blob — a hardcoded BlogPosting with no url, no image,
 * no publisher, no isPartOf and no breadcrumb, and it ignores #+SCHEMA_TYPE.
 * The graph a page needs here is the SITE's shape, reusing the site's own
 * Person and WebSite identities so an article merges into the one entity
 * rather than inventing a second author.
 *
 * AN ARCHIVE PAGE IS A PAGE; THE BLOG IS WHAT IT SHOWS. Every archive page
 * (/blog, /blog/page/2, …) is a CollectionPage on its own url with its own
 * title, and its mainEntity is the locale's ONE Blog (`<index>#blog`), named
 * as the <h1> names it. The Blog lists the posts THAT page renders, as
 * BlogPosting summaries, so no page claims rows it does not show. It used to
 * type `#webpage` itself as the Blog with the index's url on every page, which
 * gave page 2 the identity of page 1 and said nothing about any post.
 *
 * AN ARTICLE BELONGS TO THAT BLOG as well as to the WebSite, so its graph
 * declares the Blog too — @id resolution is per document.
 *
 * THE AUTHOR IS THE LANDING'S PERSON: the same @id, and its identity fields
 * read from person.js rather than retyped, so the blog cannot describe another
 * man than the profile page does. Only those fields: the landing's makesOffer,
 * hasCreatedWork and review point at nodes this graph never declares, and a
 * reference nothing declares is a dangling @id.
 *
 * WebSite is declared IN-DOCUMENT on purpose. @id resolution is per-document:
 * a bare isPartOf: { '@id': WEBSITE_ID } on a page that never declares WebSite
 * is a dangling reference, and scripts/seo-audit.mjs fails the build on one.
 *
 * The category crumb org2html leaves with url:null is filled here — the engine
 * cannot know whether /blog/<category> is a route on this site, and today it
 * is not, so the trail goes Blog > Article.
 */

import {
  COLLECTION_PAGE,
  COMPACT_HEADER,
  UNIQUE_DESCRIPTION,
  UNIQUE_TITLE,
} from '@seo/archive-pages';
import { BLOG_INDEX_URLS, blogPagesFor } from '@seo/blog-routes';
import { absoluteUrl } from '@seo/routes';

import buildBreadcrumbJsonLd from './breadcrumb';
import { i18nString } from './i18n';
import { PERSON_ID, WEBSITE_ID } from './identifiers';
import buildPersonJsonLd from './person';
import buildWebSiteJsonLd from './website';

const INDEX_URLS = new Map(Object.entries(BLOG_INDEX_URLS));

const indexUrl = (locale) => absoluteUrl(
  INDEX_URLS.get(locale) || INDEX_URLS.get('en') || '/blog',
);
const blogId = (locale) => `${indexUrl(locale)}#blog`;

/*
 * vue-i18n's named interpolation, restated for catalogue strings read outside
 * a component: `{page}` takes its param, `{'@'}` is the literal it escapes,
 * so a message reads here exactly as t() would render it.
 */
const fill = (message, params) => {
  const values = new Map(Object.entries(params));
  return message.replace(
    /\{\s*(?:'([^']*)'|(\w+))\s*\}/g,
    (whole, literal, name) => (literal === undefined
      ? String(values.has(name) ? values.get(name) : whole)
      : literal),
  );
};

/* A reduced Person: the landing graph's makesOffer / hasCreatedWork / review
   nodes describe the profile page, not an article's author. */
const authorNode = (locale) => {
  const person = buildPersonJsonLd(locale);
  return {
    '@type': 'Person',
    '@id': PERSON_ID,
    name: person.name,
    alternateName: person.alternateName,
    url: person.url,
    jobTitle: person.jobTitle,
    address: person.address,
    sameAs: person.sameAs,
  };
};

/* One post as the archive lists it — the row, not the article. No @id: the
   article's own graph owns `<url>#webpage`, and the url alone ties the two. */
const postSummary = (post) => {
  const summary = {
    '@type': 'BlogPosting',
    headline: post.title,
    url: absoluteUrl(post.url),
  };
  if (post.date) {
    summary.datePublished = post.date;
  }
  if (post.cardImage) {
    summary.image = absoluteUrl(post.cardImage);
  }
  return summary;
};

/* ISO dates sort as strings, so the last one is the newest. */
const newestDate = (posts) => posts
  .map((p) => p.date)
  .filter(Boolean)
  .sort()
  .at(-1) || null;

/*
 * The locale's Blog. `blogPost` and `dateModified` exist only where posts are
 * listed — the archive — and only when there are posts: an empty blog (CI
 * builds with none) states no list and no date rather than an empty one.
 */
const blogNode = (locale, { posts = [], newest = null } = {}) => {
  const node = {
    '@type': 'Blog',
    '@id': blogId(locale),
    url: indexUrl(locale),
    name: i18nString(locale, 'blog.title'),
    description: i18nString(locale, 'blog.meta.description'),
    inLanguage: locale,
    author: { '@id': PERSON_ID },
    publisher: { '@id': PERSON_ID },
  };
  if (posts.length) {
    node.blogPost = posts.map(postSummary);
  }
  if (newest) {
    node.dateModified = newest;
  }
  return node;
};

/*
 * WHAT A LATER ARCHIVE PAGE SAYS ABOUT ITSELF: its <title>, its description,
 * the "Page 2 of 3" line under its <h1>, and whether its head is compact — or
 * null on page 1, which says what the catalogue says.
 *
 * ONE ANSWER FOR THE HEAD AND THE GRAPH. The archive view passes these to
 * useSeoHead and BlogHero, and the CollectionPage below quotes the same two
 * strings, so the markup cannot name the page differently from its <title>.
 * It lives here, in the main bundle beside the graph, rather than in the
 * archive's view chunk, which is budgeted to the byte. A `-page` string the
 * catalogue lacks falls back to page 1's, never to an empty one. The Step 1
 * switches (archive-pages.js) decide each part.
 */
export const archivePageHead = (locale, page) => {
  const number = (page && page.number) || 1;
  if (number < 2) {
    return null;
  }
  const description = i18nString(locale, 'blog.meta.description');
  const params = {
    page: number,
    pages: Math.max(blogPagesFor(locale).length, number),
    description,
  };
  const title = UNIQUE_TITLE
    ? fill(i18nString(locale, 'blog.meta.title-page'), params)
    : '';
  const own = UNIQUE_DESCRIPTION
    ? fill(i18nString(locale, 'blog.meta.description-page'), params)
    : '';
  return {
    title: title || i18nString(locale, 'blog.meta.title'),
    description: own || description,
    label: fill(i18nString(locale, 'blog.page-of'), params),
    compact: COMPACT_HEADER,
  };
};

/*
 * The post — or the archive page — is passed IN rather than looked up: their
 * titles, dates and images live in the rich index that only the view loads,
 * so App cannot build this graph and the view owns it, the same division as
 * useSeoHead.
 *
 *   buildBlogJsonLd({ locale, post })  an article
 *   buildBlogJsonLd({ locale, page })  an archive page: loadBlogIndex()'s
 *                                      { number, url, posts, all? }
 *   buildBlogJsonLd({ locale })        the archive's first page, no posts
 */
export const buildBlogJsonLd = ({ locale = 'en', post = null, page = null } = {}) => {
  /* ---------------------------------------------------------- an article -- */
  if (post) {
    const url = absoluteUrl(post.url);
    const crumbId = `${url}#breadcrumb`;
    const postLocale = post.locale || locale;

    const posting = {
      '@type': 'BlogPosting',
      '@id': `${url}#webpage`,
      url,
      mainEntityOfPage: { '@id': `${url}#webpage` },
      headline: post.title,
      description: post.description,
      inLanguage: postLocale,
      isPartOf: [{ '@id': WEBSITE_ID }, { '@id': blogId(postLocale) }],
      author: { '@id': PERSON_ID },
      publisher: { '@id': PERSON_ID },
      breadcrumb: { '@id': crumbId },
    };

    if (post.date) {
      posting.datePublished = post.date;
    }
    if (post.cardImage) {
      posting.image = absoluteUrl(post.cardImage);
    }
    if (post.wordCount) {
      posting.wordCount = post.wordCount;
    }
    if ((post.tags || []).length) {
      posting.keywords = post.tags.join(', ');
    }
    if ((post.categories || []).length) {
      [posting.articleSection] = post.categories;
    }
    /* The X post that announces the article, when the author declared one. */
    if (post.postUrl) {
      posting.discussionUrl = post.postUrl;
    }

    return {
      '@context': 'https://schema.org',
      '@graph': [
        buildWebSiteJsonLd(),
        authorNode(locale),
        blogNode(postLocale),
        posting,
        /* The parent crumb is named as the visible trail names it ("Blog"),
           the owner's review of 2026-09-15; the Blog node keeps the full
           name. */
        buildBreadcrumbJsonLd({
          id: crumbId,
          locale,
          currentName: post.title,
          parent: { key: 'blog.breadcrumb', url: indexUrl(locale) },
        }),
      ],
    };
  }

  /* ------------------------------------------------------- the archive ----
   * NO BreadcrumbList. The archive is the top of its own section and renders no
   * visible trail, and a one-item list naming the page you are already on is
   * the half-answer this repo refuses to publish. */
  const url = page && page.url ? absoluteUrl(page.url) : indexUrl(locale);
  const posts = (page && page.posts) || [];
  /* The Blog's last change is its newest post, whichever page this is: from
     `all` (every post of the locale) when the view has it, else this page's. */
  const newest = newestDate((page && page.all) || posts);
  const head = archivePageHead(locale, page);
  const title = head ? head.title : i18nString(locale, 'blog.meta.title');
  const description = head
    ? head.description
    : i18nString(locale, 'blog.meta.description');

  const blog = blogNode(locale, { posts, newest });
  const graph = [buildWebSiteJsonLd(), authorNode(locale)];
  if (COLLECTION_PAGE) {
    graph.push({
      '@type': 'CollectionPage',
      '@id': `${url}#webpage`,
      url,
      name: title,
      description,
      inLanguage: locale,
      isPartOf: { '@id': WEBSITE_ID },
      mainEntity: { '@id': blog['@id'] },
    });
  }
  graph.push(blog);

  return {
    '@context': 'https://schema.org',
    '@graph': graph,
  };
};

export default buildBlogJsonLd;
