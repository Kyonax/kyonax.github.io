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
import { absoluteUrl,HREFLANG_ALTERNATES } from '@seo/routes';
import { useHead } from '@unhead/vue';
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

const OG_LOCALE = { en: 'en_US', es: 'es_CO' };

export const useSeoHead = () => {
  const { t, locale } = useI18n();

  const title       = computed(() => t('kyo-web.landing.meta.title'));
  const description = computed(() => t('kyo-web.landing.meta.description'));
  const ogTitle     = computed(() => t('kyo-web.landing.meta.og-title'));
  const ogImageAlt  = computed(() => t('kyo-web.landing.meta.og-image-alt'));
  const canonical   = computed(() => LOCALE_URL[locale.value] || LOCALE_URL.en);
  const ogImageAbs  = computed(() => absoluteUrl(SEO.ogImage));

  useHead({
    title,
    htmlAttrs: {
      lang: locale,
    },
    link: [
      { rel: 'canonical', href: canonical },
      ...HREFLANG_ALTERNATES.map((alt) => ({
        rel: 'alternate', hreflang: alt.hreflang, href: alt.href,
      })),
    ],
    meta: [
      { name: 'description',          content: description },
      { name: 'keywords',             content: SEO.keywords.join(', ') },
      { name: 'author',               content: AUTHOR_INFO.name },
      { name: 'robots',               content: 'index,follow,max-image-preview:large,max-snippet:-1' },
      { name: 'theme-color',          content: THEME_SETTINGS.themeColor },
      { name: 'msapplication-TileColor', content: THEME_SETTINGS.msApplicationTileColor },

      { property: 'og:type',          content: 'profile' },
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
      { property: 'profile:first_name',  content: 'Cristian' },
      { property: 'profile:last_name',   content: 'Moreno' },
      { property: 'profile:username',    content: 'kyonax' },

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
