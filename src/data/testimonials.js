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
 * `source` labels the platform the recommendation came from and `rating` is the
 * star value the reviewer gave (1-5) or null when the platform has no rating
 * concept. LinkedIn recommendations are prose-only, so rating is null and no
 * stars render; future Google / other reviews can set a rating and the stars
 * appear automatically (see <UiRatingStars> + the variant components).
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
    rating:   null,
  },
  {
    id:       'mo-osburn',
    avatar:   null,
    initials: 'MO',
    linkedin: 'https://www.linkedin.com/in/mo-osburn-safe%C2%AE-asm-ssm-csm-capm-81bb3089',
    flag:     '🇺🇸',
    date:     '2025-07',
    source:   'linkedin',
    rating:   null,
  },
  {
    id:       'diego-yair',
    avatar:   'diego-yair',
    initials: 'DY',
    linkedin: 'https://www.linkedin.com/in/diego-yair-hernandez-mejia-092154226/',
    flag:     '🇲🇽',
    date:     '2025-06',
    source:   'linkedin',
    rating:   null,
  },
];
