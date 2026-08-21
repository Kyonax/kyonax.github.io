/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 */

export const RAW_HTML_KEYS = new Set([
  'kyo-web.content-data.about-me.description',

  /* Privacy policy (/privacy, /es/privacy). The per-section bodies live in
     `privacy.sections[]`; arrays are not flattened into keys, so they are
     covered by the array-parity check instead of by this allowlist. */
  'kyo-web.privacy.lead',

  /* Resume page (/resume, /es/hoja-de-vida) */
  'kyo-web.resume.summary',
  'kyo-web.resume.role-line',
  'kyo-web.resume.tech.agile-engine',
  'kyo-web.resume.tech.zeronet',
  'kyo-web.resume.tech.softtek',
  'kyo-web.resume.tech.cabeza-rota',

  'kyo-web.content-data.experience.agile-engine.description',
  'kyo-web.content-data.experience.agile-engine.specs',
  'kyo-web.content-data.experience.agile-engine.tools',
  'kyo-web.content-data.experience.agile-engine.activities',
  'kyo-web.content-data.experience.agile-engine.impact',
  'kyo-web.content-data.experience.cabeza-rota.description',
  'kyo-web.content-data.experience.cabeza-rota.specs',
  'kyo-web.content-data.experience.cabeza-rota.tools',
  'kyo-web.content-data.experience.cabeza-rota.activities',
  'kyo-web.content-data.experience.cabeza-rota.impact',
  'kyo-web.content-data.experience.softtek.description',
  'kyo-web.content-data.experience.softtek.specs',
  'kyo-web.content-data.experience.softtek.tools',
  'kyo-web.content-data.experience.softtek.activities',
  'kyo-web.content-data.experience.softtek.impact',
  'kyo-web.content-data.experience.zeronet.description',
  'kyo-web.content-data.experience.zeronet.specs',
  'kyo-web.content-data.experience.zeronet.tools',
  'kyo-web.content-data.experience.zeronet.activities',
  'kyo-web.content-data.experience.zeronet.impact',

  'kyo-web.content-data.projects.kyo-blog.description',
  'kyo-web.content-data.projects.webcam2ascii.description',
  'kyo-web.content-data.projects.reckit.description',
  'kyo-web.content-data.projects.org2html.description',
  'kyo-web.content-data.projects.kyo-website.description',
  'kyo-web.content-data.projects.zeronet-labs-website.description',
  'kyo-web.content-data.projects.cyber-code-syndicate.description',

  'kyo-web.landing.nav.logo',
  'kyo-web.landing.hero.summary',
  'kyo-web.landing.footer.signoff',

  'kyo-web.landing.faq.items.what-i-do.answer',
  'kyo-web.landing.faq.items.hire-me.answer',
  'kyo-web.landing.faq.items.technologies.answer',
  'kyo-web.landing.faq.items.projects-companies.answer',
  'kyo-web.landing.faq.items.hiring-criteria.answer',
  'kyo-web.landing.faq.items.contact.answer',
  'kyo-web.landing.faq.items.latam.answer',
  'kyo-web.landing.faq.items.frontend-vs-fullstack.answer',
  'kyo-web.landing.faq.items.performance-seo.answer',
]);

export default RAW_HTML_KEYS;
