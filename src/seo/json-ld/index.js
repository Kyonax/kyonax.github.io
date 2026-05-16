/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 *
 * One @graph, one <script> tag — three nodes (WebSite, ProfilePage, Person).
 * Relationships (worksFor, alumniOf, memberOf, etc.) live inline on Person
 * rather than as separately-@id'd @graph nodes; flatter is easier to crawl
 * and ~30% smaller in the emitted payload.
 */

import buildWebSiteJsonLd     from './website';
import buildProfilePageJsonLd from './profile-page';
import buildPersonJsonLd      from './person';
import buildVideoObjectsJsonLd from './videos';

export { buildFaqJsonLd } from './faq-page';
export { buildVideoObjectsJsonLd } from './videos';

export const buildSiteJsonLd = ({ locale = 'en' } = {}) => ({
  '@context': 'https://schema.org',
  '@graph': [
    buildWebSiteJsonLd(),
    buildProfilePageJsonLd(locale),
    buildPersonJsonLd(locale),
    ...buildVideoObjectsJsonLd({ locale }),
  ],
});

export default buildSiteJsonLd;
