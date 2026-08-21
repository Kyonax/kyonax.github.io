/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 */

import App from './App.vue';

export const ROUTES = [
  { path: '/',   name: 'home-en', component: App, meta: { locale: 'en' } },
  { path: '/es', name: 'home-es', component: App, meta: { locale: 'es' } },
  /* Prerendered resume pages. The CV PDFs are indexable but rank poorly and
     cannot carry hreflang, so the same content is published as crawlable HTML
     with the PDF offered as a download. Localised ES slug. */
  { path: '/resume',          name: 'resume-en', component: App, meta: { locale: 'en' } },
  { path: '/es/hoja-de-vida', name: 'resume-es', component: App, meta: { locale: 'es' } },
  /* Prerendered privacy policy. Was two standalone files in public/ with their
     own palette and no navigation; as routes they render through the same
     document shell as the resume. The ES slug stays "privacy" — the URLs were
     already published and indexed under it. */
  { path: '/privacy',    name: 'privacy-en', component: App, meta: { locale: 'en' } },
  { path: '/es/privacy', name: 'privacy-es', component: App, meta: { locale: 'es' } },
];

export default ROUTES;
