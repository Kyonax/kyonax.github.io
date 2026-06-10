/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 *
 * Shared testimonials source — resolves the i18n author / role / quote for each
 * entry once so every layout variant renders identical, consistent data.
 */

import { LINKEDIN_RECS_URL, TESTIMONIAL_SOURCES, TESTIMONIALS } from '@data/testimonials';
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

const _source_of = (item) =>
  TESTIMONIAL_SOURCES[item.source] || TESTIMONIAL_SOURCES.linkedin;

export default function useTestimonials() {
  const { t } = useI18n();

  const items = computed(() => TESTIMONIALS.map((item) => ({
    ...item,
    source_meta: _source_of(item),
    author: t(`kyo-web.landing.testimonials.items.${item.id}.author`),
    role:   t(`kyo-web.landing.testimonials.items.${item.id}.role`),
    quote:  t(`kyo-web.landing.testimonials.items.${item.id}.quote`),
  })));

  /* Distinct sources present (first-seen order) — the section renders one
     "<source> recommendations" link per entry, so adding a Google testimonial
     surfaces a Google link automatically. */
  const sources = computed(() => {
    const seen = new Map();
    for (const item of TESTIMONIALS) {
      const meta = _source_of(item);
      if (seen.has(meta.name)) {
        seen.get(meta.name).count += 1;
      } else {
        seen.set(meta.name, { ...meta, count: 1 });
      }
    }
    return [...seen.values()];
  });

  return { items, sources, count: TESTIMONIALS.length, recsUrl: LINKEDIN_RECS_URL };
}
