<script setup>
/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 */

/*
 * Dedicated, prerendered privacy policy (/privacy, /es/privacy).
 *
 * WHY IT IS A ROUTE NOW: these were two standalone files in public/ carrying
 * their own hardcoded palette (#0a0a0a / #ffd400), system-ui type and no
 * navigation — a second, unmanaged design system that shared nothing with the
 * site and could only drift from it. As routes they render through the same
 * shell as the resume, so the nav, the language toggle, the tokens and the
 * typography are the SAME code rather than a hand-copied lookalike.
 *
 * LAYOUT: flush left throughout, title included — this is a policy document,
 * not a CV, so it takes none of the resume's centred-masthead treatment. The
 * sheet is the readable measure itself (`width="prose"`), which is the whole
 * point of --kyo-measure: the container comes down to meet the line length
 * instead of stranding a void beside every paragraph.
 *
 * COPY: lives in `kyo-web.privacy.*` (@data/snippets-privacy), rewritten on
 * 2026-09-11 for cookieless Umami analytics; the visible "Last updated" line
 * and the JSON-LD dateModified move together. `@` is written `&#64;` because a
 * literal `@` in an i18n message source is a vue-i18n linked-message token.
 */

import useSeoHead from '@composables/use-seo-head';
import { TRANSLATIONS_PRIVACY } from '@data/snippets-privacy';
import { useMessageSlice } from '@i18n/use-message-slice';
import { PRIVACY_HREFLANG_ALTERNATES, PRIVACY_URL, ROUTE_BY_LOCALE } from '@seo/routes';
import DocumentPage from '@views/components/document-page.vue';
import { computed, defineAsyncComponent } from 'vue';
import { useI18n } from 'vue-i18n';

/* The analytics opt-out is its own chunk, not part of this one. It renders
   nothing until mounted (it reads localStorage), so a lazy load costs the
   reader nothing, and it keeps this chunk inside its 3.5 KB budget, which the
   policy copy alone now nearly fills. */
const AnalyticsOptOut = defineAsyncComponent(() => {
  return import('@components/analytics-opt-out.vue');
});

/* The privacy page's body copy is not in the main bundle — it rides in this
   view's own chunk and is merged in before anything reads a key from it. */
useMessageSlice(TRANSLATIONS_PRIVACY);

const { t, tm, rt, locale } = useI18n();

/* og:type is `website` here, not the landing's `profile`: this page is a
   document about the site, not a profile of the person. */
useSeoHead({
  keyPrefix: 'kyo-web.privacy.meta',
  urls: PRIVACY_URL,
  alternates: PRIVACY_HREFLANG_ALTERNATES,
  ogType: 'website',
});

/* Mirrors the BreadcrumbList this page emits, node for node — both read the
   same i18n keys, so the visible trail and the markup cannot drift apart. */
const crumbs = computed(() => [
  { label: t('kyo-web.breadcrumb.home'), href: ROUTE_BY_LOCALE[locale.value] || ROUTE_BY_LOCALE.en },
  { label: t('kyo-web.privacy.breadcrumb') },
]);

const sections = computed(() => tm('kyo-web.privacy.sections')
  .map((s) => ({ title: rt(s.title), body: rt(s.body) })));

/* The analytics opt-out renders inside the third section, "Storage in your
   browser", whose copy points at it ("the toggle below"). Sections are
   positional and check:i18n holds both locales to the same order and length,
   so an index is stable — move it only if the sections are reordered. */
const OPT_OUT_SECTION = 2;
</script>

<template>
  <DocumentPage
    id="privacy"
    class="privacy"
    width="prose"
    align="left"
    :crumbs="crumbs"
    :crumbs-label="t('kyo-web.breadcrumb.aria')"
    :signoff="t('kyo-web.privacy.signoff')"
  >
    <template #header>
      <h1 class="privacy__title">
        {{ t('kyo-web.privacy.title') }}
      </h1>
    </template>

    <p class="doc-prose kyo-prose privacy__lead" v-html="t('kyo-web.privacy.lead')" />

    <section
      v-for="(section, i) in sections"
      :key="section.title"
      class="doc-block"
    >
      <h2 class="doc-block__title">
        {{ section.title }}
      </h2>
      <div class="doc-rich kyo-prose" v-html="section.body" />
      <AnalyticsOptOut v-if="i === OPT_OUT_SECTION" />
    </section>
  </DocumentPage>
</template>

<style lang="scss" scoped>
/* Everything structural comes from document-page.vue. What is left is the
   masthead, which a policy page keeps deliberately quiet. */
.privacy {
  /* One step above the section rules (--fs-600) so the hierarchy holds, and
     one step below the CV masthead (--fs-800), which is a nameplate rather
     than a document title. In the measure-wide sheet the ES title wraps to two
     lines at the top tier, which reads correctly flush left. */
  &__title {
    font-family: "Geomanist", sans-serif;
    font-size: var(--fs-700);
    line-height: 1.1;
    letter-spacing: -0.01em;
    color: var(--clr-neutral-100);
    margin: 0;
  }

  /* The lead sits outside any block, so it owns the gap down to the first
     section rule rather than inheriting .doc-block's rhythm. */
  &__lead { margin-bottom: 3rem; }
}
</style>
