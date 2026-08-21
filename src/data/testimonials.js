/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 */

export const LINKEDIN_RECS_URL = 'https://www.linkedin.com/in/kyonax/details/recommendations/';

/*
 * Source registry — each testimonial's `source` resolves to one of these. `name`
 * is the platform brand (never translated), `icon` is the BrandIcon id, and `url`
 * is the public page listing all recommendations from that platform. Add a new
 * entry (plus its brand SVG) to support Google or other review sources; the card
 * badge and the section link both read from here, so nothing else needs changing.
 */
export const TESTIMONIAL_SOURCES = {
  linkedin: {
    name: 'LinkedIn',
    icon: 'linkedin',
    url:  LINKEDIN_RECS_URL,
  },
};

/*
 * `source` labels the platform the recommendation came from. Recommendations
 * are prose-only by design: a personal site has no sensible star-rating
 * concept, so no rating field exists and no rating markup is ever emitted.
 */
export const TESTIMONIALS = [
  {
    id:       'john-montes',
    avatar:   'john-montes',
    initials: 'JM',
    linkedin: 'https://www.linkedin.com/in/johncmontes/',
    flag:     '🇨🇴',
    date:     '2025-07',
    source:   'linkedin',
  },
  {
    id:       'mo-osburn',
    avatar:   null,
    initials: 'MO',
    linkedin: 'https://www.linkedin.com/in/mo-osburn-safe%C2%AE-asm-ssm-csm-capm-81bb3089',
    flag:     '🇺🇸',
    date:     '2025-07',
    source:   'linkedin',
  },
  {
    id:       'diego-yair',
    avatar:   'diego-yair',
    initials: 'DY',
    linkedin: 'https://www.linkedin.com/in/diego-yair-hernandez-mejia-092154226/',
    flag:     '🇲🇽',
    date:     '2025-06',
    source:   'linkedin',
  },
];
