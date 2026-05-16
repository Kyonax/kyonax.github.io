/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 */

import '@scss/main.scss';

import { createI18nInstance } from '@i18n';
import { localeFromRoute } from '@i18n/locale-from-route';
import { ViteSSG } from 'vite-ssg';

import App from './App.vue';
import { ROUTES } from './router';

export const createApp = ViteSSG(
  App,
  { routes: ROUTES, base: '/' },
  ({ app, router, isClient, initialState }) => {
    const initialPath = isClient ? window.location.pathname : (initialState?.routePath || '/');
    const i18n = createI18nInstance(localeFromRoute(initialPath));
    app.use(i18n);

    router.beforeEach((to, _from, next) => {
      const next_locale = localeFromRoute(to.path);
      if (i18n.global.locale.value !== next_locale) {
        i18n.global.locale.value = next_locale;
      }
      next();
    });
  },
  { rootContainer: '#root', hydration: import.meta.env.PROD },
);
