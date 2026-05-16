/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 *
 * Site-level @ids (WEBSITE_ID, PERSON_ID) are locale-agnostic — one site,
 * one person. Page-level @ids are locale-aware: distinct localized pages
 * (ProfilePage at "/" vs "/es", FAQPage at "/#faq" vs "/es#faq") cannot
 * share an @id without colliding entities in Google's graph.
 */

import { LOCALE_URL,SITE_ORIGIN } from '@data/data';

export const WEBSITE_ID = `${SITE_ORIGIN}/#website`;
export const PERSON_ID  = `${SITE_ORIGIN}/#person`;

const _base = (locale) => (LOCALE_URL[locale] || LOCALE_URL.en).replace(/\/$/, '');

export const profilePageId  = (locale)     => `${_base(locale)}/#profile-page`;
export const faqPageId      = (locale)     => `${_base(locale)}/#faq`;
export const faqQuestionId  = (locale, id) => `${_base(locale)}/#faq-${id}`;

export const today = () => new Date().toISOString().slice(0, 10);
