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

    /* Filter the noisy "<Suspense> is an experimental feature" warning Vue
       emits every time the component mounts. Suspense has been in Vue 3 since
       2020 with stable behavior; the warning is a doc nag, not an actionable
       signal. Filter is text-specific so any other Vue warning still surfaces. */
    const _vue_warn = app.config.warnHandler;
    app.config.warnHandler = (msg, instance, trace) => {
      if (typeof msg === 'string' && msg.includes('<Suspense>') && msg.includes('experimental')) {
        return;
      }
      if (typeof _vue_warn === 'function') {
        _vue_warn(msg, instance, trace);
      } else {
        // eslint-disable-next-line no-console
        console.warn(`[Vue warn]: ${msg}${trace}`);
      }
    };

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
