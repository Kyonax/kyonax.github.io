/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 */

import {
  AUTHOR_INFO,
  LOCALE_URL,
  SEO,
  THEME_SETTINGS,
} from '@data/data';
import { BLOG_INDEX_URLS, isBlogPath } from '@seo/blog-routes';
import { absoluteUrl,HREFLANG_ALTERNATES } from '@seo/routes';
import { useHead } from '@unhead/vue';
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';

const OG_LOCALE = { en: 'en_US', es: 'es_CO' };

/*
 * THE HIRING KEYWORDS STAY OFF THE BLOG. SEO.keywords is the landing's list
 * (the name, the roles, the stack, the employers): it describes the person,
 * and on an archive or an article it would claim the page is about hiring when
 * it is about what the article says. The owner's decision of 2026-09-14 (Step
 * 1b, topic 6): the blog does not compete with the landing for those queries.
 * The route decides, as it does for the feed link below.
 */
const keywordsMeta = (path) => (isBlogPath(path)
  ? []
  : [{ name: 'keywords', content: SEO.keywords.join(', ') }]);

/*
 * RSS AUTODISCOVERY, on blog routes and nowhere else. Each locale's feed sits
 * beside the archive it syndicates (scripts/generate-feeds.mjs writes
 * <archive>/feed.xml), so its URL is the archive's plus a file name and cannot
 * drift from it. The route decides, not an option: blog.vue and blog-post.vue
 * need no change, and no other page can advertise a feed by accident. `key`
 * collapses the two entries that coexist while <Suspense> swaps one article
 * for the next.
 */
const feedLink = (path, locale, t) => {
  const archive = computed(() =>
    BLOG_INDEX_URLS[locale.value] || BLOG_INDEX_URLS.en);
  if (!isBlogPath(path) || !archive.value) {
    return [];
  }
  return [{
    key: 'kyo-blog-feed',
    rel: 'alternate',
    type: 'application/rss+xml',
    title: computed(() => t('kyo-web.blog.rss-title')),
    href: computed(() => `${archive.value}/feed.xml`),
  }];
};

/*
 * `opts` lets a secondary prerendered page (e.g. the resume pages) reuse the
 * whole meta block without duplicating it:
 *   keyPrefix — i18n namespace holding title / description / og-title / og-image-alt
 *   urls      — { en, es } canonical map for that page
 *   alternates— hreflang rows for that page
 *   ogImage   — { en, es } (or a single path) social card for that page; the
 *               landing banner is the fallback. A page whose card advertises
 *               different content than the page holds is a share-preview lie.
 *   ogType    — og:type for that page. Defaults to `profile`, which is right
 *               for the landing and the CV (both are about the person) and
 *               WRONG for a policy page, which is a document about the site.
 *               The profile:* properties follow it, since they only mean
 *               anything on a profile object.
 *   title / description / ogTitle
 *             — literal overrides that WIN over the i18n lookup. Every page
 *               written by hand keeps its copy in the catalogue and passes
 *               none of these; a blog post cannot, because its title is
 *               CONTENT authored in an .org file, not a translatable UI
 *               string. Passing a literal keeps such a page out of
 *               check-i18n's parity rules instead of forcing one catalogue
 *               entry per article in both locales.
 * Omitting `opts` yields the landing-page behaviour unchanged.
 */
export const useSeoHead = (opts = {}) => {
  const { t, locale } = useI18n();
  const route = useRoute();

  const prefix     = opts.keyPrefix || 'kyo-web.landing.meta';
  const urls       = opts.urls || LOCALE_URL;
  const alternates = opts.alternates || HREFLANG_ALTERNATES;
  const og_type    = opts.ogType || 'profile';
  const is_profile = og_type === 'profile';

  const title       = computed(() => opts.title || t(`${prefix}.title`));
  const description = computed(() => opts.description || t(`${prefix}.description`));
  const ogTitle     = computed(() => opts.ogTitle || opts.title || t(`${prefix}.og-title`));
  const ogImageAlt  = computed(() => opts.ogImageAlt || t(`${prefix}.og-image-alt`));
  const canonical   = computed(() => urls[locale.value] || urls.en);
  const ogImageAbs  = computed(() => {
    const img = opts.ogImage;
    if (!img) {
      return absoluteUrl(SEO.ogImage);
    }
    return absoluteUrl(typeof img === 'string' ? img : (img[locale.value] || img.en));
  });

  useHead({
    title,
    htmlAttrs: {
      lang: locale,
    },
    link: [
      { rel: 'canonical', href: canonical },
      ...alternates.map((alt) => ({
        rel: 'alternate', hreflang: alt.hreflang, href: alt.href,
      })),
      ...feedLink(route.path, locale, t),
    ],
    meta: [
      { name: 'description',          content: description },
      ...keywordsMeta(route.path),
      { name: 'author',               content: AUTHOR_INFO.name },
      { name: 'robots',               content: 'index,follow,max-image-preview:large,max-snippet:-1' },
      { name: 'theme-color',                       content: THEME_SETTINGS.themeColor },
      { name: 'msapplication-TileColor',           content: THEME_SETTINGS.msApplicationTileColor },
      { name: 'color-scheme',                      content: 'dark' },
      { name: 'mobile-web-app-capable',            content: 'yes' },
      { name: 'apple-mobile-web-app-capable',      content: 'yes' },
      { name: 'apple-mobile-web-app-title',        content: 'Kyonax' },
      { name: 'apple-mobile-web-app-status-bar-style', content: 'black' },

      { property: 'og:type',          content: og_type },
      { property: 'og:site_name',     content: 'Kyonax' },
      { property: 'og:title',         content: ogTitle },
      { property: 'og:description',   content: description },
      { property: 'og:url',           content: canonical },
      { property: 'og:image',         content: ogImageAbs },
      { property: 'og:image:type',    content: SEO.ogImageType },
      { property: 'og:image:width',   content: String(SEO.ogImageWidth) },
      { property: 'og:image:height',  content: String(SEO.ogImageHeight) },
      { property: 'og:image:alt',     content: ogImageAlt },
      { property: 'og:locale',        content: computed(() => OG_LOCALE[locale.value] || OG_LOCALE.en) },
      { property: 'og:locale:alternate', content: computed(() => OG_LOCALE[locale.value === 'en' ? 'es' : 'en']) },
      ...(is_profile ? [
        { property: 'profile:first_name',  content: 'Cristian' },
        { property: 'profile:last_name',   content: 'Moreno' },
        { property: 'profile:username',    content: 'kyonax' },
      ] : []),

      { name: 'twitter:card',         content: 'summary_large_image' },
      { name: 'twitter:site',         content: AUTHOR_INFO.twitter },
      { name: 'twitter:creator',      content: AUTHOR_INFO.twitter },
      { name: 'twitter:title',        content: ogTitle },
      { name: 'twitter:description',  content: description },
      { name: 'twitter:image',        content: ogImageAbs },
      { name: 'twitter:image:alt',    content: ogImageAlt },
    ],
  });
};

export default useSeoHead;
