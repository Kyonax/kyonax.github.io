/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 */

import diego_avatar from '@assets/testimonials/diego-yair.jpg?url';
import john_avatar  from '@assets/testimonials/john-montes.jpg?url';

export const LINKEDIN_RECS_URL = 'https://www.linkedin.com/in/kyonax/details/recommendations/';

export const TESTIMONIALS = [
  {
    id:       'john-montes',
    avatar:   john_avatar,
    initials: 'JM',
    linkedin: 'https://www.linkedin.com/in/johncmontes/',
    flag:     '🇨🇴',
  },
  {
    id:       'mo-osburn',
    avatar:   null,
    initials: 'MO',
    linkedin: 'https://www.linkedin.com/in/mo-osburn-safe%C2%AE-asm-ssm-csm-capm-81bb3089',
    flag:     '🇺🇸',
  },
  {
    id:       'diego-yair',
    avatar:   diego_avatar,
    initials: 'DY',
    linkedin: 'https://www.linkedin.com/in/diego-yair-hernandez-mejia-092154226/',
    flag:     '🇲🇽',
  },
];
