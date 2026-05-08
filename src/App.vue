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

import HudNav from '@widgets/hud-nav.vue';
import HeroSection from '@sections/hero.vue';
import SkillsSection from '@sections/skills.vue';
import ExperienceSection from '@sections/experience.vue';
import NowProjectsSection from '@sections/now-projects-section.vue';
import SiteFooter from '@sections/site-footer.vue';

import useSeoHead from '@composables/use-seo-head';

useSeoHead();
</script>

<template>
  <HudNav />

  <main class="landing">
    <HeroSection />
    <SkillsSection />
    <ExperienceSection />
    <NowProjectsSection />
  </main>

  <SiteFooter />
</template>

<style lang="scss" scoped>
.landing {
  display: block;
  width: 100%;
  scroll-behavior: smooth;
}
</style>
