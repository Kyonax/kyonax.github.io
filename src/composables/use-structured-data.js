/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 */

import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useHead } from '@unhead/vue';

import { buildSiteJsonLd, buildFaqJsonLd } from '@seo/json-ld';

export const useStructuredData = () => {
  const { locale } = useI18n();

  const siteLdJson = computed(() =>
    JSON.stringify(buildSiteJsonLd({ locale: locale.value })),
  );

  const faqLdJson = computed(() =>
    JSON.stringify(buildFaqJsonLd(locale.value)),
  );

  useHead({
    script: [
      {
        key: 'kyo-site-jsonld',
        type: 'application/ld+json',
        innerHTML: siteLdJson,
      },
      {
        key: 'kyo-faq-jsonld',
        type: 'application/ld+json',
        innerHTML: faqLdJson,
      },
    ],
  });
};

export default useStructuredData;
