<script setup>
/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 */

import CookieConsent from '@components/cookie-consent.vue';
import useSeoHead       from '@composables/use-seo-head';
import useStructuredData from '@composables/use-structured-data';
import ExperienceSection from '@sections/experience.vue';
import HeroSection from '@sections/hero.vue';
import SiteFooter from '@sections/site-footer.vue';
import SkillsSection from '@sections/skills.vue';
import IconSprite from '@ui/icon-sprite.vue';
import HudNav from '@widgets/hud-nav.vue';
import { defineAsyncComponent, watch } from 'vue';
import { useI18n } from 'vue-i18n';

/* Below-fold sections code-split into their own chunks. <Suspense> wraps
   each one so vite-ssg awaits the loader during prerender (full SEO
   content stays in the HTML) and Vue 3's hydration engine also waits
   for the chunk before swapping — handles the SSR-vs-CSR shape match
   automatically. Fallback is an empty <section> with the same anchor
   ID + min-height so layout doesn't shift while the chunk arrives. */
const NowProjectsSection = defineAsyncComponent(() => import('@sections/now-projects-section.vue'));
const FaqSection = defineAsyncComponent(() => import('@sections/faq.vue'));

const { t, locale } = useI18n();
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

  <a class="skip-link" href="#hero">{{ t('kyo-web.landing.nav.skip-to-content') }}</a>

  <HudNav />

  <main id="main" class="landing">
    <HeroSection />
    <ExperienceSection />
    <Suspense>
      <NowProjectsSection />
      <template #fallback>
        <div id="projects" class="landing__lazy-fallback" aria-hidden="true" />
      </template>
    </Suspense>
    <SkillsSection />
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

.skip-link {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 1000;
  transform: translateY(-150%);
  padding: 0.75rem 1.25rem;
  background: var(--clr-primary-100);
  color: var(--clr-neutral-500);
  font-family: "SpaceMono", monospace;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-decoration: none;
  transition: transform 0.2s ease;

  &:focus,
  &:focus-visible {
    transform: translateY(0);
    outline: 2px solid var(--clr-neutral-50);
    outline-offset: 2px;
  }
}
</style>
