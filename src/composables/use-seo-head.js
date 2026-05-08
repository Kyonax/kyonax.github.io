/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 */

import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useHead } from '@unhead/vue';

import {
  AUTHOR_INFO,
  APP_DESCRIPTION,
  SEO,
  SITE_TITLE,
  SITE_URL,
  THEME_SETTINGS,
} from '@data/data';

/**
 * Bind reactive head tags to the app. Call once from App.vue's setup.
 */
export const useSeoHead = () => {
  const { t, locale } = useI18n();

  /* Description varies by locale. Spanish version lives in APP_DESCRIPTION
     (legacy default); English version in SEO.description... actually both
     legacy fields hold the Spanish copy. Real future-state: a translation
     key. For now, prefer the about-me description from snippets when
     available — gives a real English string for EN visitors. */
  const description = computed(() => {
    if (locale.value === 'es') {
      return APP_DESCRIPTION;
    }
    return t('kyo-web.content-data.about-me.description')
      .replace(/<[^>]+>/g, ''); /* strip the inline HTML tags */
  });

  useHead({
    title: SITE_TITLE,
    meta: [
      { name: 'description',          content: description },
      { name: 'keywords',             content: SEO.keywords.join(', ') },
      { name: 'author',               content: AUTHOR_INFO.name },
      { name: 'theme-color',          content: THEME_SETTINGS.primaryColor },
      { name: 'msapplication-TileColor',
        content: THEME_SETTINGS.msApplicationTileColor },

      /* Open Graph */
      { property: 'og:title',         content: SEO.ogTitle },
      { property: 'og:description',   content: description },
      { property: 'og:image',         content: SEO.websiteBanner },
      { property: 'og:url',           content: SITE_URL },
      { property: 'og:type',          content: 'website' },
      { property: 'og:locale',        content: locale },

      /* Twitter Card */
      { name: 'twitter:card',         content: 'summary_large_image' },
      { name: 'twitter:title',        content: SEO.twitterTitle },
      { name: 'twitter:description',  content: description },
      { name: 'twitter:image',        content: SEO.websiteBanner },
    ],
  });
};

export default useSeoHead;
