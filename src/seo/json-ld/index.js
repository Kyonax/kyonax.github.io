/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 *
 * One @graph, one <script> tag — three nodes (WebSite, ProfilePage, Person).
 * Relationships (worksFor, alumniOf, memberOf, etc.) live inline on Person
 * rather than as separately-@id'd @graph nodes; flatter is easier to crawl
 * and ~30% smaller in the emitted payload.
 */

import buildPersonJsonLd              from './person';
import buildProfessionalServiceJsonLd from './professional-service';
import buildProfilePageJsonLd         from './profile-page';
import { buildProjectsJsonLd }        from './projects';
import { buildTestimonialsJsonLd }    from './testimonials';
import buildVideoObjectsJsonLd        from './videos';
import buildWebSiteJsonLd             from './website';

export { buildFaqJsonLd } from './faq-page';
export { buildPrivacyJsonLd } from './privacy-page';
export { buildResumeJsonLd } from './resume-page';
export { buildVideoObjectsJsonLd } from './videos';

export const buildSiteJsonLd = ({ locale = 'en' } = {}) => ({
  '@context': 'https://schema.org',
  '@graph': [
    buildWebSiteJsonLd(),
    buildProfilePageJsonLd(locale),
    buildPersonJsonLd(locale),
    buildProfessionalServiceJsonLd(locale),
    ...buildVideoObjectsJsonLd({ locale }),
    ...buildProjectsJsonLd(locale),
    ...buildTestimonialsJsonLd(locale),
  ],
});

export default buildSiteJsonLd;
