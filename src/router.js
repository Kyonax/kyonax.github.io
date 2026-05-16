/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 */

import App from './App.vue';

export const ROUTES = [
  { path: '/',   name: 'home-en', component: App, meta: { locale: 'en' } },
  { path: '/es', name: 'home-es', component: App, meta: { locale: 'es' } },
];

export default ROUTES;
