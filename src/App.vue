<script setup>
/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 *
 * Root component — single-page landing layout (post 2-col redesign).
 *
 * Composition:
 *   ┌─────────────────────────────────────────────────────────┐
 *   │  HudNav  (sticky, scroll-progress, anchored sections)    │
 *   ├─────────────────────────────────────────────────────────┤
 *   │  HeroSection            (#hero, 100svh)                  │
 *   │  SkillsSection          (#skills)                        │
 *   │  ExperienceSection      (#experience)                    │
 *   │  NowProjectsSection     (#projects)                      │
 *   │  SiteFooter             (#contact)                       │
 *   └─────────────────────────────────────────────────────────┘
 *
 * Vimeo widget is hidden via FEATURES.vimeo.enabled (defaults to false in
 * src/config/features.js — flip to true when a new video is ready).
 */

import CookieConsent from '@components/cookie-consent.vue';
import useSeoHead       from '@composables/use-seo-head';
import useStructuredData from '@composables/use-structured-data';
import ExperienceSection from '@sections/experience.vue';
import FaqSection from '@sections/faq.vue';
import HeroSection from '@sections/hero.vue';
import NowProjectsSection from '@sections/now-projects-section.vue';
import SiteFooter from '@sections/site-footer.vue';
import SkillsSection from '@sections/skills.vue';
import IconSprite from '@ui/icon-sprite.vue';
import HudNav from '@widgets/hud-nav.vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
useSeoHead();
useStructuredData();
</script>

<template>
  <IconSprite />

  <a class="skip-link" href="#hero">{{ t('kyo-web.landing.nav.skip-to-content') }}</a>

  <HudNav />

  <main id="main" class="landing">
    <HeroSection />
    <SkillsSection />
    <ExperienceSection />
    <NowProjectsSection />
    <FaqSection />
  </main>

  <SiteFooter />

  <CookieConsent />
</template>

<style lang="scss" scoped>
.landing {
  display: block;
  width: 100%;
  scroll-behavior: smooth;
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
