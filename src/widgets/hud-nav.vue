<script setup>
/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 */

import useCursorTooltip from '@composables/use-cursor-tooltip';
import usePageKind from '@composables/use-page-kind';
import { CV_URL } from '@data/data';
import AppIcon from '@ui/app-icon.vue';
import UiButton from '@ui/button.vue';
import CursorTooltip from '@ui/cursor-tooltip.vue';
import UiLink from '@ui/link.vue';
import LanguageToggle from '@widgets/language-toggle.vue';
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

const { t, locale } = useI18n();

/*
 * The nav has three modes, one per page kind:
 *   landing  — section links, skip link and the mobile drawer.
 *   resume   — stripped: the section links anchor into the landing and would
 *              dead-link here, so only the brand (back to landing), the CV
 *              download, the language toggle and the socials show.
 *   privacy  — the same stripped nav WITHOUT the CV download. A policy page is
 *              not a place to offer a résumé, and the button is icon-only, so
 *              its meaning depends entirely on being on the CV page.
 * The brand is the way back for both document kinds.
 */
const { isLanding, isResume, isDocument } = usePageKind();
const landing_href = computed(() => (locale.value === 'es' ? '/es' : '/'));
/* On a document page the brand is the way back; on the landing it is the
   scroll-to-top anchor. */
const brand_href = computed(() => (isDocument.value ? landing_href.value : '#hero'));
const cv_href = computed(() => (locale.value === 'es' ? CV_URL.es : CV_URL.en));
const cv_filename = computed(() =>
  `Cristian-Moreno-Senior-Software-Engineer-${locale.value === 'es' ? 'ES' : 'EN'}.pdf`);

const NAV_LINKS = [
  { id: 'hero',       key: 'kyo-web.landing.nav.hero' },
  { id: 'experience', key: 'kyo-web.landing.nav.experience' },
  { id: 'projects',   key: 'kyo-web.landing.nav.projects' },
  { id: 'skills',     key: 'kyo-web.landing.nav.skills' },
  { id: 'faq',        key: 'kyo-web.landing.nav.faq' },
  { id: 'contact',    key: 'kyo-web.landing.nav.contact' },
];

/* Sections that exist in the DOM but have no nav link — mapped to the
 * nearest nav parent so the active-state algorithm doesn't skip them. */
const SECTION_NAV_MAP = { testimonials: 'hero' };
const _TRACKED_IDS    = [...NAV_LINKS.map(l => l.id), ...Object.keys(SECTION_NAV_MAP)];

const GITHUB_URL   = 'https://github.com/Kyonax';
const LINKEDIN_URL = 'https://www.linkedin.com/in/kyonax/';

const GLYPH_MENU     = '\uF0C9';
const GLYPH_CLOSE    = '\uF00D';
const GLYPH_GITHUB   = '\uF09B';
const GLYPH_LINKEDIN = '\uF0E1';

/* The CV button is icon-only, so nothing on screen says what it does — the
   tooltip is the label. Same cursor-following tooltip the hero links use. */
const cv_ref = ref(null);
const {
  visible: cv_tooltip_visible,
  x: cv_tip_x,
  y: cv_tip_y,
} = useCursorTooltip(cv_ref);

const scrolled = ref(false);
const mobile_open = ref(false);
const active_section = ref('hero');
const header_ref = ref(null);

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

  /*
   * "Last section whose top has crossed above 50% of the viewport."
   * Sorting candidates by their current top position (page order) and
   * iterating in that order means the LAST one that passes the threshold
   * is the section actually filling the screen — producing natural,
   * non-premature active-state transitions.
   *
   * Contrast with the previous min-distance approach: that activated the
   * next section when it was merely "closer to 40% vh" than the current
   * one, which fired far too early (next section still well below center).
   */
  const threshold = window.innerHeight * 0.5;

  const candidates = _TRACKED_IDS
    .map((id) => {
      const el = document.querySelector(`#${id}`);
      return el ? { id, top: el.getBoundingClientRect().top } : null;
    })
    .filter(Boolean)
    .sort((a, b) => a.top - b.top); // ensure page-order regardless of _TRACKED_IDS order

  let winner = null;
  for (const { id, top } of candidates) {
    if (top <= threshold) {
      winner = id;
    }
  }

  if (winner) {
    active_section.value = SECTION_NAV_MAP[winner] ?? winner;
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

/* Phones have no Escape key, so a tap anywhere outside the open drawer is the
   primary dismiss affordance. Registered only while the drawer is open (see
   the watch below). Capture phase so it still fires if a child stops
   propagation; inert main/footer fall through to <body>, which is outside the
   header and therefore closes as expected. */
const onPointerDownOutside = (event) => {
  if (header_ref.value && !header_ref.value.contains(event.target)) {
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

  if (open) {
    document.addEventListener('pointerdown', onPointerDownOutside, true);
  } else {
    document.removeEventListener('pointerdown', onPointerDownOutside, true);
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
  document.removeEventListener('pointerdown', onPointerDownOutside, true);
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
    ref="header_ref"
    class="hud-nav"
    :class="{ 'hud-nav--scrolled': scrolled, 'hud-nav--open': mobile_open }"
    role="banner"
  >
    <a v-if="isLanding" class="hud-nav__skip-link" href="#hero">{{ t('kyo-web.landing.nav.skip-to-content') }}</a>

    <div class="hud-nav__bar">
      <a
        :href="brand_href"
        class="hud-nav__brand"
        :aria-label="t('kyo-web.landing.nav.aria.brand')"
        @click="onAnchorClick"
      >
        <span class="hud-nav__brand-name" aria-hidden="true" v-html="t('kyo-web.landing.nav.logo')" />
      </a>

      <nav
        v-if="isLanding"
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
        <UiLink
          v-if="isResume"
          ref="cv_ref"
          :href="cv_href"
          :download="cv_filename"
          variant="primary"
          size="sm"
          class="hud-nav__cv"
          :aria-label="t('kyo-web.resume.download-aria')"
        >
          <AppIcon name="printer" class="hud-nav__cv-icon" />
        </UiLink>
        <CursorTooltip
          v-if="isResume"
          :visible="cv_tooltip_visible"
          :x="cv_tip_x"
          :y="cv_tip_y"
        >
          {{ t('kyo-web.resume.tooltip.download') }}
        </CursorTooltip>
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
          v-if="isLanding"
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

  /* Skip link lives inside the banner landmark so all content stays in a
     landmark (WCAG 1.3.1). Visible only on focus; pinned to the viewport. */
  &__skip-link {
    position: fixed;
    top: 0;
    left: 0;
    z-index: 1000;
    transform: translateY(-150%);
    padding: 0.75rem 1.25rem;
    background: var(--clr-primary-100);
    color: var(--clr-neutral-500);
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

  &::before {
    content: "";
    position: absolute;
    inset: 0;
    z-index: -1;
    --kyo-backdrop-r: 12px;
    backdrop-filter: var(--kyo-backdrop);
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

  /* CV download, shown only on the resume pages. It is the SAME component and
     variant/size as the language-toggle trigger (UiLink/UiButton primary-sm),
     so the two boxes share border, background and hover exactly — the earlier
     hand-rolled box drifted from the toggle on every one of those. Deltas are
     only what an icon-only button needs: square padding, the neutral icon
     colour the toggle also layers over `primary`, and the 44px tap target the
     toggle uses below md. It never hides — this is the page's only download. */
  &__cv {
    color: var(--clr-neutral-50);
    padding-left: 0.55rem;
    padding-right: 0.55rem;

    @include max-media-query(md) {
      height: 44px;
      min-height: 44px;
    }
  }

  /* Inline SVG, NOT a Nerd Font glyph: an icon font only paints once that exact
     subset reaches the browser, and a cached older copy silently renders tofu.
     The sprite ships in the document, so it cannot miss. Sized to the toggle's
     text box (fs-200, line-height 1) so both buttons stay the same height.
     The fill/stroke flip overrides AppIcon's stroked default — this glyph is
     the solid Font Awesome shape, matching the GitHub/LinkedIn icons. */
  &__cv &__cv-icon {
    font-size: var(--fs-200);
    fill: currentColor;
    stroke: none;
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
      --kyo-backdrop-r: 12px;
      backdrop-filter: var(--kyo-backdrop);
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
