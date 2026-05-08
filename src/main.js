/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 *
 * Application bootstrap.
 *
 * Phase 7 wiring (latest):
 *   - @unhead/vue for declarative <head> management — App.vue's useHead()
 *     fills SEO meta, OG/Twitter tags, theme-color, LCP hints reactively.
 *
 * Earlier phases (still active):
 *   - createI18n() registered before mount
 *   - detectInitialLocale() pre-mount → no flash of default-locale content
 *   - document.documentElement.lang updated reactively on locale change
 *   - SCSS theme + global styles loaded once via @scss/main.scss
 */

import { createApp } from 'vue';
import { createHead } from '@unhead/vue';

import App from './App.vue';
import { i18n } from '@i18n';
import detectInitialLocale from '@i18n/detect-locale';
import '@scss/main.scss';

const initial_locale = detectInitialLocale();

i18n.global.locale.value = initial_locale;
document.documentElement.lang = initial_locale;

const app = createApp(App);
const head = createHead();

app.use(i18n);
app.use(head);
app.mount('#root');
