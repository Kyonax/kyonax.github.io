<script setup>
/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 */

import useAnalytics from '@composables/use-analytics';
import usePageKind from '@composables/use-page-kind';
import useSeoHead from '@composables/use-seo-head';
import useStructuredData from '@composables/use-structured-data';
import ExperienceSection from '@sections/experience.vue';
import HeroSection from '@sections/hero.vue';
import SiteFooter from '@sections/site-footer.vue';
import IconSprite from '@ui/icon-sprite.vue';
import HudNav from '@widgets/hud-nav.vue';
import { computed, defineAsyncComponent, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';

/* The document views (resume, privacy) are async for the same reason the
   below-fold sections are, plus one of their own: ResumeView used to be a
   STATIC import, so its scoped CSS — 463 B gzip — sat inside the main bundle
   and downloaded on the landing page, which renders none of it, against ~40 B
   of remaining budget. Split out, the shared document shell is paid for only
   by the pages that are made of it. */
const ResumeView = defineAsyncComponent(() => {
  return import('@views/resume.vue');
});
const PrivacyView = defineAsyncComponent(() => {
  return import('@views/privacy.vue');
});

/*
 * The section rail — the landing's in-page navigation, now that the nav bar has
 * handed those six destinations over on desktop. Async and shared with the
 * article route, so both pages fetch the same chunk and neither carries it in
 * the bundle.
 */
const SectionRail = defineAsyncComponent(() => import('@widgets/section-rail.vue'));

/*
 * The same ids the nav anchors used, with the same labels — the rail replaced
 * those links, so it has to be able to reach everything they reached. `hero` is
 * the top of the page, which is why it is also the section marked before any
 * scrolling has happened.
 */
const LANDING_SECTIONS = [
  'hero', 'experience', 'projects', 'skills', 'faq', 'contact',
];

/* The blog splits in two: an archive page and an article. Both are async and
   both are wrapped in <Suspense> below, which is what makes vite-ssg await
   them during prerender — without it the article ships as an empty shell. */
const BlogView = defineAsyncComponent(() => {
  return import('@views/blog.vue');
});
const BlogPostView = defineAsyncComponent(() => {
  return import('@views/blog-post.vue');
});
const BlogFooter = defineAsyncComponent(() => {
  return import('@views/components/blog/blog-footer.vue');
});

const TestimonialsSection = defineAsyncComponent(() => {
  return import('@sections/testimonials-proof.vue');
});

/* Below-fold sections code-split into their own chunks. <Suspense> wraps
   each one so vite-ssg awaits the loader during prerender (full SEO
   content stays in the HTML) and Vue 3's hydration engine also waits
   for the chunk before swapping — handles the SSR-vs-CSR shape match
   automatically. Fallback is an empty <section> with the same anchor
   ID + min-height so layout doesn't shift while the chunk arrives. */
const NowProjectsSection = defineAsyncComponent(() => {
  return import('@sections/now-projects-section.vue');
});
const SkillsSection = defineAsyncComponent(() => {
  return import('@sections/skills.vue');
});
const FaqSection = defineAsyncComponent(() => {
  return import('@sections/faq.vue');
});
const ContactSection = defineAsyncComponent(() => {
  return import('@sections/contact-section.vue');
});

const { locale, t } = useI18n();
const route = useRoute();

const landing_sections = computed(() => LANDING_SECTIONS.map((id) => ({
  id,
  label: t(`kyo-web.landing.nav.${id}`),
})));

/* App is the shell for every prerendered route. The landing sections render on
   / and /es; the secondary routes render their own document view instead. Each
   document view owns its own <head> (it calls useSeoHead with its own keys), so
   the landing meta must NOT be applied on those routes. */
const { kind, isLanding, isResume, isPrivacy, isBlog, isBlogPost } = usePageKind();
if (isLanding.value) {
  useSeoHead();
}
useStructuredData({ page: kind.value });

/* Umami Cloud, once per page load and on every route, from here because App
   mounts once. It registers an onMounted and nothing else: the tracker follows
   the router's pushState on its own, so there is no router hook. */
useAnalytics();

/* WCAG 3.1.1 — keep <html lang> in sync with the active i18n locale across
   every locale-change path: user toggle, direct /es/ URL hit, browser back/
   forward, and SSR hydration. vite-ssg emits the correct lang per prerendered
   route, but CSR navigation between EN↔ES would leave the live DOM attribute
   stale; this watch fixes that without coupling to the toggle component. */
watch(locale, (next) => {
  if (typeof document !== 'undefined' && next) {
    document.documentElement.lang = next;
  }
}, { immediate: true });
</script>

<template>
  <IconSprite />

  <HudNav />

  <!-- Fixed overlay, so it changes no page's layout. On the landing it is the
       primary in-page navigation above `nav` (700px); below that the nav
       drawer is. -->
  <SectionRail
    v-if="isLanding"
    :sections="landing_sections"
    :label="t('kyo-web.landing.nav.on-this-page')"
    top-id="hero"
  />

  <main v-if="isLanding" id="main" class="landing">
    <HeroSection />
    <Suspense>
      <TestimonialsSection />
      <template #fallback>
        <div id="testimonials" class="landing__lazy-fallback" aria-hidden="true" />
      </template>
    </Suspense>
    <ExperienceSection />
    <Suspense>
      <NowProjectsSection />
      <template #fallback>
        <div id="projects" class="landing__lazy-fallback" aria-hidden="true" />
      </template>
    </Suspense>
    <Suspense>
      <SkillsSection />
      <template #fallback>
        <div id="skills" class="landing__lazy-fallback" aria-hidden="true" />
      </template>
    </Suspense>
    <Suspense>
      <FaqSection />
      <template #fallback>
        <div id="faq" class="landing__lazy-fallback" aria-hidden="true" />
      </template>
    </Suspense>
    <Suspense>
      <ContactSection />
      <template #fallback>
        <div id="contact" class="landing__lazy-fallback" aria-hidden="true" />
      </template>
    </Suspense>
  </main>

  <!-- Suspense is what makes vite-ssg await the chunk during prerender, so the
       full document still ships in the HTML for crawlers. -->
  <Suspense v-else-if="isResume">
    <ResumeView />
  </Suspense>

  <Suspense v-else-if="isPrivacy">
    <PrivacyView />
  </Suspense>

  <!-- A post renders the article; anything else under /blog is an archive
       page, including a path the manifest does not name, which then renders
       the archive's own empty state rather than landing chrome.
       KEYED BY PATH because the article awaits its post ONCE, in setup. The
       language toggle used to be a client-side push from one article to its
       twin, and without a key Vue patched the same instance: the URL, <html
       lang> and the date went Spanish while the title and body stayed English.
       On blog paths the toggle is a full page load now (use-language.js), so
       no client-side move reaches this view; the key stays so that one, if it
       ever returns, gets a new instance instead of stale text. -->
  <Suspense v-else-if="isBlogPost">
    <BlogPostView :key="route.path" />
  </Suspense>

  <!-- KEYED FOR THE SAME REASON AS THE ARTICLE ABOVE, and it took a second
       report to find: the archive awaits its page ONCE, in setup, so the
       toggle's client-side move from /blog to /es/blog swapped the i18n strings
       and left the lead, its cover, the cards and every row in English. -->
  <Suspense v-else-if="isBlog">
    <BlogView :key="route.path" />
  </Suspense>

  <SiteFooter v-if="isLanding" />

  <!-- The landing footer is deliberately not reused under an article: it
       carries the brand signature, socials and a runtime manifest. -->
  <Suspense v-else-if="isBlog">
    <BlogFooter />
  </Suspense>
</template>

<style lang="scss" scoped>
.landing {
  display: block;
  width: 100%;
  scroll-behavior: smooth;

  &__lazy-fallback {
    /* Reserves below-fold height so the Suspense fallback doesn't cause
       a layout shift while the chunk arrives. Roughly matches the
       NowProjects + FAQ sections at typical viewport sizes. */
    min-height: 60vh;
    display: block;
  }
}
</style>
