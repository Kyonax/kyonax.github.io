<script setup>
/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 */

import CookieConsent from '@components/cookie-consent.vue';
import useSeoHead from '@composables/use-seo-head';
import useStructuredData from '@composables/use-structured-data';
import ExperienceSection from '@sections/experience.vue';
import HeroSection from '@sections/hero.vue';
import SiteFooter from '@sections/site-footer.vue';
import IconSprite from '@ui/icon-sprite.vue';
import HudNav from '@widgets/hud-nav.vue';
import { defineAsyncComponent, watch } from 'vue';
import { useI18n } from 'vue-i18n';

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

const { locale } = useI18n();
useSeoHead();
useStructuredData();

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

  <main id="main" class="landing">
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
  </main>

  <SiteFooter />

  <CookieConsent />
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
