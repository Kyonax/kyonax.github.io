<script setup>
/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 */

/*
 * Dedicated, prerendered resume page (/resume, /es/hoja-de-vida).
 *
 * WHY: the CV PDFs are indexable but rank below HTML for the same content and
 * cannot carry hreflang. This page publishes the CV as crawlable HTML and gives
 * the PDF a landing page to be downloaded from.
 *
 * LAYOUT LAW: the section order, headings and content mirror the verified CVs
 * (EN 3afb94d4 / ES e7d13e27) exactly — SUMMARY, EXPERIENCE (description ->
 * activities -> key impact -> additional technologies), EDUCATION.
 *
 * THE SHELL IS SHARED: the sheet, breadcrumb, section rules, prose rhythm,
 * sign-off and the delegated `data-tip` tooltip all live in
 * views/components/document-page.vue, which the privacy pages consume too.
 * What stays here is the furniture only a CV has — the masthead, contact row,
 * entry heads and the additional-technologies line.
 *
 * MEASURE RULING (owner, 2026-08-19): this page is NOT re-measured. It keeps
 * the 58rem printed-CV sheet and its 89-char lines; --kyo-measure governs
 * landing surfaces. Hence `width="sheet"`. Do not "fix" it.
 *
 * SINGLE SOURCE OF TRUTH: every experience string is read from the
 * `content-data.experience.*` keys rebuilt verbatim from the CVs. No CV prose is
 * duplicated in this file.
 */

import useSeoHead from '@composables/use-seo-head';
import { SEO } from '@data/data';
import { RESUME_HREFLANG_ALTERNATES, RESUME_URL, ROUTE_BY_LOCALE } from '@seo/routes';
import DocumentPage from '@views/components/document-page.vue';
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

const { t, tm, rt, locale } = useI18n();

useSeoHead({
  keyPrefix: 'kyo-web.resume.meta',
  urls: RESUME_URL,
  alternates: RESUME_HREFLANG_ALTERNATES,
  ogImage: SEO.resumeOgImage,
});

/* Mirrors the BreadcrumbList this page emits, node for node — both read the
   same i18n keys, so the visible trail and the markup cannot drift apart. */
const crumbs = computed(() => [
  { label: t('kyo-web.breadcrumb.home'), href: ROUTE_BY_LOCALE[locale.value] || ROUTE_BY_LOCALE.en },
  { label: t('kyo-web.resume.breadcrumb') },
]);

/* CV \cventry order. */
const ENTRY_IDS = ['agile-engine', 'zeronet', 'softtek', 'cabeza-rota'];

const entries = computed(() => ENTRY_IDS.map((id) => {
  const meta = tm(`kyo-web.resume.entries.${id}`);
  return {
    id,
    role:        t(`kyo-web.content-data.experience.${id}.role`),
    description: t(`kyo-web.content-data.experience.${id}.description`),
    activities:  t(`kyo-web.content-data.experience.${id}.activities`),
    impact:      t(`kyo-web.content-data.experience.${id}.impact`),
    tech:        t(`kyo-web.resume.tech.${id}`),
    period:      rt(meta.period),
    location:    rt(meta.location),
    orgs:        meta.orgs.map((o) => ({ name: rt(o.name), href: rt(o.href), tip: o.tip ? rt(o.tip) : '' })),
  };
}));

const contact = computed(() => tm('kyo-web.resume.contact')
  .map((c) => ({ text: rt(c.text), href: rt(c.href), tip: c.tip ? rt(c.tip) : '' })));

const education = computed(() => tm('kyo-web.resume.education').map((e) => ({
  period: rt(e.period), school: rt(e.school), place: rt(e.place), detail: rt(e.detail),
})));
</script>

<template>
  <DocumentPage
    id="resume"
    class="resume"
    width="sheet"
    align="center"
    :crumbs="crumbs"
    :crumbs-label="t('kyo-web.breadcrumb.aria')"
    :signoff="t('kyo-web.resume.signoff')"
  >
    <!-- CV header: name, role line, contact row -->
    <template #header>
      <h1 class="resume__name">{{ t('kyo-web.persistent-data.name') }}</h1>
      <p class="resume__role" v-html="t('kyo-web.resume.role-line')" />
      <p class="resume__contact">
        <span v-for="(c, i) in contact" :key="i" class="resume__contact-item">
          <span v-if="i" class="resume__sep" aria-hidden="true">|</span>
          <a
            v-if="c.href"
            :href="c.href"
            class="resume__contact-link"
            :data-tip="c.tip || null"
            v-bind="c.href.startsWith('http') ? { target: '_blank', rel: 'noopener noreferrer' } : {}"
            v-html="c.text"
          />
          <span v-else v-html="c.text" />
        </span>
      </p>
    </template>

    <section class="doc-block" aria-labelledby="rs-summary">
      <h2 id="rs-summary" class="doc-block__title">
        {{ t('kyo-web.resume.summary-title') }}
      </h2>
      <p class="doc-prose kyo-prose" v-html="t('kyo-web.resume.summary')" />
    </section>

    <section class="doc-block" aria-labelledby="rs-experience">
      <h2 id="rs-experience" class="doc-block__title">
        {{ t('kyo-web.resume.experience-title') }}
      </h2>

      <article v-for="entry in entries" :key="entry.id" class="resume__entry">
        <div class="resume__entry-head">
          <h3 class="resume__entry-role">{{ entry.role }}</h3>
          <span class="resume__entry-period">{{ entry.period }}</span>
        </div>
        <p class="resume__entry-org">
          <span v-for="(o, i) in entry.orgs" :key="o.name">
            <span v-if="i" class="resume__sep" aria-hidden="true">-</span>
            <a
              :href="o.href"
              class="resume__org-link"
              :data-tip="o.tip || null"
              target="_blank"
              rel="noopener noreferrer"
            >{{ o.name }}</a>
          </span>
          <span class="resume__sep" aria-hidden="true">|</span>
          <span class="resume__entry-location">{{ entry.location }}</span>
        </p>
        <p class="doc-prose kyo-prose" v-html="entry.description" />

        <h4 class="doc-sub">{{ t('kyo-web.landing.modal.activities') }}</h4>
        <ul class="doc-list kyo-prose" v-html="entry.activities" />

        <h4 class="doc-sub">{{ t('kyo-web.landing.modal.impact') }}</h4>
        <ul class="doc-list kyo-prose" v-html="entry.impact" />

        <p class="resume__tech">
          <span class="resume__tech-label">{{ t('kyo-web.resume.tech-label') }}:</span>
          <span v-html="entry.tech" />
        </p>
      </article>
    </section>

    <section class="doc-block" aria-labelledby="rs-education">
      <h2 id="rs-education" class="doc-block__title">
        {{ t('kyo-web.resume.education-title') }}
      </h2>
      <article v-for="edu in education" :key="edu.school" class="resume__entry">
        <div class="resume__entry-head">
          <h3 class="resume__entry-role">{{ edu.school }}</h3>
          <span class="resume__entry-period">{{ edu.period }}</span>
        </div>
        <p class="resume__entry-org">
          <span class="resume__entry-location">{{ edu.place }}</span>
        </p>
        <p class="doc-prose kyo-prose" v-html="edu.detail" />
      </article>
    </section>
  </DocumentPage>
</template>

<style lang="scss" scoped>
/* Only the furniture a CV has. The sheet, breadcrumb, section rules, prose
   rhythm and sign-off come from document-page.vue; colour comes from the
   site's own rules — `.kyo-prose` already defines body, <strong> and <a>
   treatments. Nothing is invented here. */
.resume {
  &__name {
    font-family: "Geomanist", sans-serif;
    font-size: var(--fs-800);
    line-height: 1.05;
    letter-spacing: -0.01em;
    color: var(--clr-neutral-100);
    margin: 0 0 0.4rem;
  }

  /* One line in BOTH locales, at the largest step that fits. ES is the binding
     case — 63 monospace chars, ~11% longer than EN. Dropping the tracking
     (`normal`, not the body's inherited -0.03rem) buys back ~4% width, which is
     what lets the role sit at --fs-400 instead of --fs-300 on every tier. No
     `nowrap`: below ~630px no legible step fits on one line, so there it wraps
     to two readable lines rather than overflowing the sheet. */
  &__role {
    font-family: "SpaceMono", monospace;
    font-size: var(--fs-400);
    letter-spacing: normal;
    color: var(--clr-primary-100);
    margin: 0 0 1.1rem;
  }

  /* Centred, wrapping contact row. Each item stays unbroken so URLs never split
     mid-token, but the row wraps — without this the nowrap items push the
     document wider than the viewport (§1.35). */
  &__contact {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    justify-content: center;
    font-family: "SpaceMono", monospace;
    font-size: var(--fs-200);
    line-height: 1.9;
    margin: 0;
  }

  &__contact-item {
    display: inline-flex;
    align-items: baseline;
    white-space: nowrap;
    max-width: 100%;
  }

  &__sep {
    margin: 0 0.4rem;
    color: var(--clr-neutral-50);
  }

  /* Contact + company links follow the .kyo-prose link treatment (SpaceMono 700,
     neutral-100, underlined) so every link on the page reads identically. */
  &__contact-link,
  &__org-link {
    font-weight: 700;
    color: var(--clr-neutral-100);
    text-decoration: underline;
    text-decoration-thickness: 1px;
    text-underline-offset: 0.2em;
    transition: color 0.2s ease;

    &:hover,
    &:focus-visible { color: var(--clr-primary-100); }
  }

  /* ── CV entries ───────────────────────────────────────────── */
  &__entry { margin-bottom: 2.5rem; }

  &__entry-role {
    font-family: "Geomanist", sans-serif;
    font-size: var(--fs-400);
    color: var(--clr-neutral-100);
    margin: 0;

    @include min-media-query(sm) { font-size: var(--fs-500); }
  }

  /* CV row: role on the left, period flush right. */
  &__entry-head {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    justify-content: space-between;
    gap: 0.5rem 1rem;
    margin-bottom: 0.2rem;
  }

  &__entry-period {
    font-family: "SpaceMono", monospace;
    font-size: var(--fs-200);
    color: var(--clr-neutral-50);
    white-space: nowrap;
  }

  &__entry-org {
    font-family: "SpaceMono", monospace;
    font-size: var(--fs-200);
    color: var(--clr-neutral-50);
    margin: 0 0 1rem;
    overflow-wrap: anywhere;
  }

  &__entry-location { color: var(--clr-neutral-50); }

  &__tech {
    font-family: "SpaceMono", monospace;
    font-size: var(--fs-200);
    line-height: 1.7;
    color: var(--clr-neutral-50);
    margin: 0;
    overflow-wrap: anywhere;

    :deep(strong) { color: var(--clr-neutral-100); }
  }

  &__tech-label { color: var(--clr-neutral-100); }
}
</style>
