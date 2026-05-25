<script setup>
/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 */

import UiButton from '@ui/button.vue';
import LanguageToggle from '@widgets/language-toggle.vue';
import { onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const NAV_LINKS = [
  { id: 'hero',       key: 'kyo-web.landing.nav.hero' },
  { id: 'experience', key: 'kyo-web.landing.nav.experience' },
  { id: 'projects',   key: 'kyo-web.landing.nav.projects' },
  { id: 'skills',     key: 'kyo-web.landing.nav.skills' },
  { id: 'faq',        key: 'kyo-web.landing.nav.faq' },
  { id: 'contact',    key: 'kyo-web.landing.nav.contact' },
];

const GITHUB_URL   = 'https://github.com/Kyonax';
const LINKEDIN_URL = 'https://www.linkedin.com/in/kyonax/';

const GLYPH_MENU     = '\uF0C9';
const GLYPH_CLOSE    = '\uF00D';
const GLYPH_GITHUB   = '\uF09B';
const GLYPH_LINKEDIN = '\uF0E1';

const scrolled = ref(false);
const mobile_open = ref(false);
const active_section = ref('hero');

let _scroll_frame = 0;
let _last_scroll_run = 0;

const _read_scroll = () => {
  _scroll_frame = 0;
  const now = Date.now();
  if (now - _last_scroll_run < 100) {
    return;
  }
  _last_scroll_run = now;
  scrolled.value = window.scrollY > 24;
  if (window.scrollY < 80) {
    active_section.value = 'hero';
    return;
  }
  const target_y = window.innerHeight * 0.4;
  let winner = null;
  let min_dist = Infinity;
  for (const l of NAV_LINKS) {
    const el = document.querySelector(`#${l.id}`);
    if (!el) {
      continue;
    }
    const dist = Math.abs(el.getBoundingClientRect().top - target_y);
    if (dist < min_dist) {
      min_dist = dist;
      winner = l.id;
    }
  }
  if (winner) {
    active_section.value = winner;
  }
};

const onScroll = () => {
  if (_scroll_frame) {
    return;
  }
  _scroll_frame = requestAnimationFrame(_read_scroll);
};

const closeMobile = () => {
  mobile_open.value = false; 
};
const onAnchorClick = () => {
  closeMobile(); 
};
const onKeydown = (event) => {
  if (event.key === 'Escape' && mobile_open.value) {
    closeMobile();
  }
};

/* Mark the page chrome inert while the drawer is open so focus stays inside the
   menu (Tab can't leak into hero/skills/footer content). Restored on close. */
const INERT_TARGETS = ['main', '.site-footer'];
watch(mobile_open, (open) => {
  if (typeof document === 'undefined') {
    return;
  }
  for (const selector of INERT_TARGETS) {
    for (const el of document.querySelectorAll(selector)) {
      if (open) {
        el.setAttribute('inert', '');
      } else {
        el.removeAttribute('inert');
      }
    }
  }
});

onMounted(() => {
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('keydown', onKeydown);
  onScroll();
});

onBeforeUnmount(() => {
  window.removeEventListener('scroll', onScroll);
  window.removeEventListener('keydown', onKeydown);
  if (_scroll_frame) {
    cancelAnimationFrame(_scroll_frame);
  }
  if (typeof document === 'undefined') {
    return;
  }
  for (const selector of INERT_TARGETS) {
    for (const el of document.querySelectorAll(selector)) {
      el.removeAttribute('inert');
    }
  }
});
</script>

<template>
  <header
    class="hud-nav"
    :class="{ 'hud-nav--scrolled': scrolled, 'hud-nav--open': mobile_open }"
    role="banner"
  >
    <div class="hud-nav__bar">
      <a
        href="#hero"
        class="hud-nav__brand"
        :aria-label="t('kyo-web.landing.nav.aria.brand')"
        @click="onAnchorClick"
      >
        <span class="hud-nav__brand-name" aria-hidden="true" v-html="t('kyo-web.landing.nav.logo')" />
      </a>

      <nav
        id="hud-nav-menu"
        class="hud-nav__links"
        :class="{ 'is-open': mobile_open }"
        :aria-label="t('kyo-web.landing.nav.menu')"
      >
        <a
          v-for="link in NAV_LINKS"
          :key="link.id"
          :href="`#${link.id}`"
          class="hud-nav__link"
          :class="{ 'is-active': active_section === link.id }"
          :aria-label="t(`kyo-web.landing.nav.aria.${link.id}`)"
          :aria-current="active_section === link.id ? 'location' : undefined"
          @click="onAnchorClick"
        >
          {{ t(link.key) }}
        </a>
      </nav>

      <div class="hud-nav__actions">
        <LanguageToggle class="hud-nav__lang" />
        <span class="hud-nav__separator" aria-hidden="true" />
        <div class="hud-nav__social-group">
          <a
            :href="GITHUB_URL"
            class="hud-nav__social-link"
            target="_blank"
            rel="noopener noreferrer"
            :aria-label="t('kyo-web.landing.nav.aria.brand') + ' GitHub'"
          >
            <span class="icon-glyph icon-glyph--lg hud-nav__social-icon" :data-text="GLYPH_GITHUB" aria-hidden="true" />
          </a>
          <a
            :href="LINKEDIN_URL"
            class="hud-nav__social-link"
            target="_blank"
            rel="noopener noreferrer"
            :aria-label="t('kyo-web.landing.nav.aria.brand') + ' LinkedIn'"
          >
            <span class="icon-glyph icon-glyph--lg hud-nav__social-icon" :data-text="GLYPH_LINKEDIN" aria-hidden="true" />
          </a>
        </div>
        <UiButton
          variant="ghost"
          size="md"
          class="hud-nav__menu-toggle"
          aria-controls="hud-nav-menu"
          :aria-expanded="String(mobile_open)"
          :aria-label="mobile_open ? t('kyo-web.landing.nav.close') : t('kyo-web.landing.nav.menu')"
          @click="mobile_open = !mobile_open"
        >
          <span class="icon-glyph icon-glyph--lg" :data-text="mobile_open ? GLYPH_CLOSE : GLYPH_MENU" aria-hidden="true" />
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
  transition: background-color 0.25s ease, border-color 0.25s ease;
  font-family: "SpaceMono", monospace;

  &::before {
    content: "";
    position: absolute;
    inset: 0;
    z-index: -1;
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    opacity: 0;
    transition: opacity 0.25s ease;
    pointer-events: none;
    transform: translateZ(0);
    will-change: opacity;
  }

  &--scrolled {
    background: color-mix(in srgb, var(--clr-neutral-500) 92%, transparent);
    border-bottom-color: var(--clr-border-100);
  }

  &--scrolled::before {
    opacity: 1;
  }

  &__bar {
    display: grid;
    grid-template-columns: auto 1fr auto;
    align-items: center;
    
    gap: 0;
    padding: 0.6rem 1rem;
    max-width: calc(1280px + 4rem);
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
    color: var(--clr-neutral-100);
    text-decoration: none;
    font-family: "Geomanist", sans-serif;
    font-weight: 900;
    font-size: var(--fs-400);
    line-height: 1;
    transition: transform 0.2s ease;

    @include min-media-query(md) { font-size: var(--fs-400); }

    &:hover,
    &:focus-visible {
      color: var(--clr-primary-100);
      text-shadow: 0 0 10px color-mix(in srgb, var(--clr-primary-100) 55%, transparent);
    }
  }

  &__brand-name {
    line-height: 1;
    display: inline-block;
    transform: translateY(0.1em);
  }

  &__links {
    display: none;
    gap: 1.25rem;
    justify-content: flex-start;

    @include min-media-query(md) {
      display: inline-flex;
      padding-left: 2rem;
    }

    @include min-media-query(lg) {
      padding-left: 1.25rem;
    }
  }

  &__link {
    position: relative;
    color: var(--clr-neutral-50);
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
      background: var(--clr-neutral-100);
      transform: scaleX(0);
      transform-origin: left center;
      transition: transform 0.35s var(--ease-standard);
    }

    &:hover::after,
    &:focus-visible::after {
      transform: scaleX(0.55);
    }

    &:hover,
    &:focus-visible {
      color: var(--clr-neutral-100);
    }

    &.is-active {
      color: var(--clr-neutral-100);

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

  &__separator {
    display: none;
    width: 1px;
    height: 1.1rem;
    background: var(--clr-border-100);

    @include min-media-query(md) {
      display: block;
    }
  }

  &__social-group {
    display: none;

    @include min-media-query(md) {
      display: inline-flex;
      gap: 0.15rem;
    }
  }

  &__social-link {
    display: none;
    color: var(--clr-neutral-50);
    text-decoration: none;
    transition: border-color 0.2s ease, color 0.2s ease;

    @include min-media-query(md) {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0.4rem;
      border: 1px solid transparent;
    }

    &:hover,
    &:focus-visible {
      border-color: var(--clr-primary-100);
      color: var(--clr-primary-100);
    }
  }

  &__social-icon {
    font-size: 1.1rem;
    transform: translateY(0);
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
          background: color-mix(in srgb, var(--clr-primary-300) 20%, transparent);
        }
        
        &::after { display: none; }
      }
    }
  }
}
</style>
