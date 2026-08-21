/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 */

import {
  buildFaqJsonLd,
  buildPrivacyJsonLd,
  buildResumeJsonLd,
  buildSiteJsonLd,
} from '@seo/json-ld';
import { useHead } from '@unhead/vue';
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

/*
 * `page` selects which graph the route emits:
 *   'landing' (default) — WebSite + ProfilePage + Person + Service + projects
 *                         + reviews, plus the FAQPage block.
 *   'resume'            — the resume ProfilePage + BreadcrumbList + the CV
 *                         DigitalDocument + Person.
 *   'privacy'           — WebPage + BreadcrumbList + WebSite + a minimal
 *                         Person, all declared in-document.
 *
 * A secondary route must NOT emit the landing graph: it declares a ProfilePage
 * whose url is "/", an FAQPage and project/review nodes that page never
 * renders. Claiming content a page does not show is what "structured data
 * mismatch" penalties target.
 */
const GRAPH_BY_PAGE = {
  landing: buildSiteJsonLd,
  resume:  buildResumeJsonLd,
  privacy: buildPrivacyJsonLd,
};

export const useStructuredData = ({ page = 'landing' } = {}) => {
  const { locale } = useI18n();

  const build = GRAPH_BY_PAGE[page] || GRAPH_BY_PAGE.landing;

  const siteLdJson = computed(() => JSON.stringify(build({ locale: locale.value })));

  const faqLdJson = computed(() =>
    JSON.stringify(buildFaqJsonLd(locale.value)),
  );

  const script = [
    {
      key: 'kyo-site-jsonld',
      type: 'application/ld+json',
      innerHTML: siteLdJson,
    },
  ];

  /* The FAQ block belongs to the landing page only — it is the page that
     renders those questions. */
  if (page === 'landing') {
    script.push({
      key: 'kyo-faq-jsonld',
      type: 'application/ld+json',
      innerHTML: faqLdJson,
    });
  }

  useHead({ script });
};

export default useStructuredData;
