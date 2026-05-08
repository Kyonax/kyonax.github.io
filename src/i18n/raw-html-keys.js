/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 */

export const RAW_HTML_KEYS = new Set([
  /* Experience cards — every entry has <strong> tags woven through */
  'kyo-web.content-data.about-me.description',
  'kyo-web.content-data.experience.cr-growth.description',
  'kyo-web.content-data.experience.cr-growth.specs',
  'kyo-web.content-data.experience.cr-growth.tools',
  'kyo-web.content-data.experience.cr-senior-fullstack.description',
  'kyo-web.content-data.experience.cr-senior-fullstack.specs',
  'kyo-web.content-data.experience.cr-senior-fullstack.tools',
  'kyo-web.content-data.experience.cr-web-dev.description',
  'kyo-web.content-data.experience.cr-web-dev.specs',
  'kyo-web.content-data.experience.cr-web-dev.tools',
  'kyo-web.content-data.experience.softtek.description',
  'kyo-web.content-data.experience.softtek.specs',
  'kyo-web.content-data.experience.softtek.tools',
  'kyo-web.content-data.experience.zeronet.description',
  'kyo-web.content-data.experience.zeronet.specs',
  'kyo-web.content-data.experience.zeronet.tools',

  /* Landing layout — inline HTML (sup / strong / span) */
  'kyo-web.landing.nav.logo',
  'kyo-web.landing.hero.tag',
  'kyo-web.landing.hero.summary',
  'kyo-web.landing.footer.signoff',
]);

export default RAW_HTML_KEYS;
