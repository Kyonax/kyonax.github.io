<script setup>
/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 */

import { ref, onMounted, onBeforeUnmount } from 'vue';
import { useI18n } from 'vue-i18n';

import LanguageToggle from '@widgets/language-toggle.vue';
import UiButton from '@ui/button.vue';

const { t } = useI18n();

const NAV_LINKS = [
  { id: 'hero',       key: 'kyo-web.landing.nav.hero' },
  { id: 'skills',     key: 'kyo-web.landing.nav.skills' },
  { id: 'experience', key: 'kyo-web.landing.nav.experience' },
  { id: 'projects',   key: 'kyo-web.landing.nav.projects' },
];

const GLYPH_MENU  = '';
const GLYPH_CLOSE = '';

const scrolled = ref(false);
const mobile_open = ref(false);
const active_section = ref('hero');
const scroll_progress = ref(0);

let observer = null;

const onScroll = () => {
  scrolled.value = window.scrollY > 24;
  const doc = document.documentElement;
  const max = doc.scrollHeight - doc.clientHeight;
  scroll_progress.value = max > 0 ? Math.min(1, window.scrollY / max) : 0;

  
  if (window.scrollY < 80) {
    active_section.value = 'hero';
  }
};

const closeMobile = () => { mobile_open.value = false; };
const onAnchorClick = () => { closeMobile(); };

onMounted(() => {
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) active_section.value = e.target.id;
      });
    },
    { rootMargin: '-45% 0px -45% 0px', threshold: 0 },
  );
  NAV_LINKS.forEach((l) => {
    const el = document.getElementById(l.id);
    if (el) observer.observe(el);
  });
});

onBeforeUnmount(() => {
  window.removeEventListener('scroll', onScroll);
  if (observer) observer.disconnect();
});
</script>

<template>
  <header
    class="hud-nav"
    :class="{ 'hud-nav--scrolled': scrolled, 'hud-nav--open': mobile_open }"
    role="banner">
    <div class="hud-nav__progress" :style="{ '--progress': scroll_progress }" aria-hidden="true" />

    <div class="hud-nav__bar">
      <a
        href="#hero"
        class="hud-nav__brand"
        :aria-label="t('kyo-web.landing.nav.hero')"
        @click="onAnchorClick">
        <span class="hud-nav__brand-name" v-html="t('kyo-web.landing.nav.logo')" />
      </a>

      <nav class="hud-nav__links" :class="{ 'is-open': mobile_open }" :aria-label="t('kyo-web.landing.nav.menu')">
        <a
          v-for="link in NAV_LINKS"
          :key="link.id"
          :href="`#${link.id}`"
          class="hud-nav__link"
          :class="{ 'is-active': active_section === link.id }"
          @click="onAnchorClick">
          {{ t(link.key) }}
        </a>
      </nav>

      <div class="hud-nav__actions">
        <LanguageToggle class="hud-nav__lang" />
        <UiButton
          variant="ghost"
          size="md"
          class="hud-nav__menu-toggle"
          :aria-expanded="mobile_open"
          :aria-label="mobile_open ? t('kyo-web.landing.nav.close') : t('kyo-web.landing.nav.menu')"
          @click="mobile_open = !mobile_open">
          <span class="icon-glyph icon-glyph--lg" aria-hidden="true">{{ mobile_open ? GLYPH_CLOSE : GLYPH_MENU }}</span>
        </UiButton>
      </div>
    </div>
  </header>
</template>

<style lang="scss" scoped>
.hud-nav {
  position: sticky;
  top: 0;
  z-index: 50;
  width: 100%;
  background: transparent;
  border-bottom: 1px solid transparent;
  transition: background-color 0.25s ease, border-color 0.25s ease, backdrop-filter 0.25s ease;
  font-family: "SpaceMono", monospace;

  &--scrolled {
    background: color-mix(in srgb, var(--clr-neutral-500) 80%, transparent);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border-bottom-color: var(--clr-border-100);
  }

  &__progress {
    position: absolute;
    inset: auto 0 0 0;
    height: 2px;
    background: linear-gradient(
      to right,
      var(--clr-primary-100) calc(var(--progress, 0) * 100%),
      transparent calc(var(--progress, 0) * 100%)
    );
    pointer-events: none;
  }

  &__bar {
    display: grid;
    grid-template-columns: auto 1fr auto;
    align-items: center;
    
    gap: 0;
    padding: 0.6rem 1rem;
    max-width: 1440px;
    margin: 0 auto;

    @include min-media-query(lg) {
      padding: 0.75rem 2rem;
      gap: 1.5rem;
    }
  }

  &__brand {
    display: inline-flex;
    align-items: center;
    margin-left: 0.5rem;
    color: var(--clr-primary-100);
    text-decoration: none;
    font-family: "Geomanist", sans-serif;
    font-weight: 900;
    font-size: var(--fs-400);
    line-height: 1;
    transition: text-shadow 0.2s ease, transform 0.2s ease;

    @include min-media-query(md) { font-size: var(--fs-400); }

    &:hover,
    &:focus-visible {
      text-shadow: 0 0 10px color-mix(in srgb, var(--clr-primary-100) 55%, transparent);
      outline: none;
    }
  }

  &__brand-name {
    line-height: 1;
    display: inline-block;
  }

  &__links {
    display: none;
    gap: 1.25rem;
    justify-content: center;

    @include min-media-query(md) {
      display: inline-flex;
    }
  }

  &__link {
    position: relative;
    color: var(--clr-neutral-200);
    text-decoration: none;
    font-size: var(--fs-300);
    letter-spacing: 0.08em;
    padding: 0.4rem 0.2rem;
    transition: color 0.2s ease;

    
    &::after {
      content: "";
      position: absolute;
      left: 0;
      right: 0;
      bottom: 0;
      height: 1px;
      background: var(--clr-primary-100);
      transform: scaleX(0);
      transform-origin: left center;
      transition: transform 0.35s cubic-bezier(0.4, 0, 0.2, 1);
    }

    &:hover::after,
    &:focus-visible::after {
      transform: scaleX(0.55);
    }

    &:hover,
    &:focus-visible {
      color: var(--clr-primary-100);
      outline: none;
    }

    &.is-active {
      color: var(--clr-primary-100);

      &::after { transform: scaleX(1); }
    }
  }

  &__actions {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    justify-self: end;

    @include min-media-query(md) {
      gap: 0.75rem;
    }
  }

  
  &__menu-toggle {
    @include min-media-query(md) {
      display: none;
    }

    @include max-media-query(md) {
      width: 44px;
      height: 44px;
      padding: 0;
      border: 1px solid var(--clr-border-100);
      transition: border-color 0.2s ease, color 0.2s ease;

      &:hover,
      &:focus-visible {
        border-color: var(--clr-primary-100);
      }
    }
  }

  
  &--open .hud-nav__links {
    @include max-media-query(md) {
      display: flex;
      flex-direction: column;
      gap: 0;
      position: absolute;
      inset: 100% 0 auto 0;
      background: color-mix(in srgb, var(--clr-neutral-500) 92%, transparent);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      border-bottom: 1px solid var(--clr-border-100);
      padding: 0.25rem 0;

      .hud-nav__link {
        padding: 0.95rem 0.85rem 0.95rem 1.25rem;
        border-bottom: 1px solid var(--clr-border-100);
        text-align: left;
        font-size: var(--fs-300);

        &:last-child { border-bottom: 0; }
        &.is-active {
          background: color-mix(in srgb, var(--clr-primary-100) 10%, transparent);
        }
        
        &::after { display: none; }
      }
    }
  }
}
</style>
