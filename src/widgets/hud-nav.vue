<script setup>
/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 */

import useActiveSection from '@composables/use-active-section';
import useCursorTooltip from '@composables/use-cursor-tooltip';
import usePageKind from '@composables/use-page-kind';
import { CV_URL } from '@data/data';
import { BLOG_INDEX_URLS } from '@seo/blog-routes';
import AppIcon from '@ui/app-icon.vue';
import UiButton from '@ui/button.vue';
import CursorTooltip from '@ui/cursor-tooltip.vue';
import UiLink from '@ui/link.vue';
import LanguageToggle from '@widgets/language-toggle.vue';
import {
  computed, defineAsyncComponent, onBeforeUnmount, onMounted, ref, watch,
} from 'vue';
import { useI18n } from 'vue-i18n';

const { t, locale } = useI18n();

/*
 * The nav has four modes, one per page kind:
 *   landing  — section links, skip link and the mobile drawer.
 *   resume   — stripped: the section links anchor into the landing and would
 *              dead-link here, so only the brand (back to landing), the CV
 *              download, the language toggle and the socials show.
 *   privacy  — the same stripped nav WITHOUT the CV download. A policy page is
 *              not a place to offer a résumé, and the button is icon-only, so
 *              its meaning depends entirely on being on the CV page.
 *   blog     — NOT stripped. The archive and the articles are a destination a
 *              reader arrives at from search, not a document someone opened
 *              from the landing, so they need a way out: Home and Blog, both
 *              real routes rather than the landing's in-page anchors. The
 *              landing nav carries a BLOG item for the same reason in reverse.
 *              Where the résumé keeps its download, the blog keeps a share
 *              button.
 * The brand is the way back for every document kind.
 */
const { isLanding, isResume, isBlog, isDocument } = usePageKind();
const landing_href = computed(() => (locale.value === 'es' ? '/es' : '/'));
const blog_href = computed(() => BLOG_INDEX_URLS[locale.value] || BLOG_INDEX_URLS.en);
/* On a document page the brand is the way back; on the landing it is the
   scroll-to-top anchor. */
const brand_href = computed(() => (isDocument.value ? landing_href.value : '#hero'));
/* The CV's own language: EN for anything that is not ES. The href, the file
   name and the download event's `lang` all read it, so they cannot disagree. */
const cv_lang = computed(() => (locale.value === 'es' ? 'es' : 'en'));
const cv_href = computed(() => (cv_lang.value === 'es' ? CV_URL.es : CV_URL.en));
const cv_filename = computed(() =>
  `Cristian-Moreno-Senior-Software-Engineer-${cv_lang.value.toUpperCase()}.pdf`);

/*
 * `id` is an in-page anchor and takes part in the active-section algorithm;
 * `route` is a real URL and does not. BLOG is the only `route` entry — it
 * leaves the landing, so there is no section for it to ever be "at".
 */
const NAV_LINKS = [
  { id: 'hero',       key: 'kyo-web.landing.nav.hero' },
  { id: 'experience', key: 'kyo-web.landing.nav.experience' },
  { id: 'projects',   key: 'kyo-web.landing.nav.projects' },
  { id: 'skills',     key: 'kyo-web.landing.nav.skills' },
  { id: 'faq',        key: 'kyo-web.landing.nav.faq' },
  { id: 'contact',    key: 'kyo-web.landing.nav.contact' },
  /* The breadcrumb label, uppercased here rather than duplicated into the nav
     catalogue — the eager catalogue is main-bundle bytes for every visitor,
     and this row is the same word twice. */
  { id: 'blog',       key: 'kyo-web.blog.breadcrumb', route: true },
];

/*
 * ONE list, resolved per page kind, and ONE loop in the template. The blog
 * branch started as a second <a> beside the landing's and cost 275 B gzipped
 * in the MAIN bundle — which sits ~150 B under an enforced 180 KB ceiling, so
 * a duplicated element is not a style question here.
 *
 * `aria` is undefined on the blog links on purpose: the landing's are anchors
 * whose one-word text needs expanding, these are routes whose text already
 * says where they go, and Vue omits the attribute for undefined.
 *
 * The blog hrefs come from the same helpers the archive and the blog footer
 * use, so the three can never point at different URLs.
 */
const nav_links = computed(() => (isLanding.value
  ? NAV_LINKS
  : [
    { id: 'home', href: landing_href.value, label: t('kyo-web.breadcrumb.home') },
    {
      id: 'blog',
      href: blog_href.value,
      label: t('kyo-web.blog.breadcrumb'),
      /* Standing state, not scroll state. The landing's active link is
         whichever SECTION fills the screen; on the blog you are simply IN the
         blog for the whole visit, on the archive and on every article alike,
         so BLOG is marked from the moment the page loads. Without this the
         menu rendered two links that looked identical and neither of which
         said where you were. */
      current: true,
    },
  ]));

/* Sections that exist in the DOM but have no nav link — mapped to the
 * nearest nav parent so the active-state algorithm doesn't skip them. */
const SECTION_NAV_MAP = { testimonials: 'hero' };
const _TRACKED_IDS    = [
  ...NAV_LINKS.filter(l => !l.route).map(l => l.id),
  ...Object.keys(SECTION_NAV_MAP),
];

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
const header_ref = ref(null);

/*
 * THE SHARE BUTTON — the CV button's twin, on every blog page.
 *
 * It replaced a text button at the end of an article's meta row that said
 * SHARE and did one of two invisible things. Here it is where the résumé keeps
 * its one page action, it reads as "share" from its glyph (Font Awesome
 * Free's share nodes, CC BY 4.0, in the sprite as `share`), and the tooltip is
 * its visible label, as the CV button's is. It shows on the archive as well as
 * on every article: the ask was to share the blog, not one article of it.
 *
 * THE BUTTON IS PRERENDERED; THE SHEET IS NOT. The button's box is in the HTML,
 * so the nav never shifts when the page hydrates. The sheet can only act
 * through script, so it is its own chunk (@widgets/share-sheet.vue), requested
 * on the first open and warmed the moment a pointer or focus arrives on the
 * button, so it is usually on its way before the click lands. `v-if` on the
 * open state, so every open reads the page afresh and every close removes its
 * listeners.
 */
const loadShareSheet = () => import('@widgets/share-sheet.vue');
const ShareSheet = defineAsyncComponent(loadShareSheet);
let _share_warmed = false;
const warmShare = () => {
  if (_share_warmed) {
    return;
  }
  _share_warmed = true;
  loadShareSheet().catch(() => {
    _share_warmed = false;
  });
};

const share_ref = ref(null);
const share_open = ref(false);
const {
  visible: share_tooltip_visible,
  x: share_tip_x,
  y: share_tip_y,
} = useCursorTooltip(share_ref);

/* The drawer and the sheet both drop from the bar, so only one is ever down;
   a press on the menu button is outside the sheet, and closes it that way. */
const toggleShare = () => {
  mobile_open.value = false;
  share_open.value = !share_open.value;
};

/*
 * "Which section am I in?" now has ONE implementation, in
 * @composables/use-active-section — the algorithm that used to live here, moved
 * out unchanged when the section rail needed the same answer. Two copies would
 * have meant the nav highlighting one section while the rail highlighted its
 * neighbour, which is worse than either being slightly wrong alone.
 *
 * Every in-page link shows at every width, so this drives the bar's highlight on
 * desktop and the drawer's on mobile alike.
 */
const { active: active_section } = useActiveSection(_TRACKED_IDS, {
  aliases: SECTION_NAV_MAP,
  topId: 'hero',
});

/* Standing state of the BAR itself, which is not a section question — kept
   here, and deliberately not folded into the composable. */
let _scroll_frame = 0;
const _read_scroll = () => {
  _scroll_frame = 0;
  scrolled.value = window.scrollY > 24;
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
    <a
      v-if="isLanding || isBlog"
      class="hud-nav__skip-link"
      :href="isLanding ? '#hero' : '#main'"
    >{{ t('kyo-web.landing.nav.skip-to-content') }}</a>

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
        v-if="isLanding || isBlog"
        id="hud-nav-menu"
        class="hud-nav__links"
        :class="{ 'is-open': mobile_open }"
        :aria-label="isLanding ? t('kyo-web.landing.nav.menu') : t('kyo-web.blog.nav-aria')"
      >
        <!-- `label` present = a resolved route link (blog chrome, and the
             landing's own BLOG item); `key` present = a landing anchor that
             takes part in the active-section algorithm and carries an
             expanded aria label its one-word text does not give. -->
        <a
          v-for="link in nav_links"
          :key="link.id"
          :href="link.href || (link.route ? blog_href : `#${link.id}`)"
          class="hud-nav__link"
          :class="{
            'is-active': link.current || (!link.route && active_section === link.id),
            'hud-nav__link--section': Boolean(link.key) && !link.route && link.id !== 'hero',
          }"
          :aria-label="link.key && !link.route ? t(`kyo-web.landing.nav.aria.${link.id}`) : undefined"
          :aria-current="link.current ? 'page' : (!link.route && active_section === link.id ? 'location' : undefined)"
          @click="onAnchorClick"
        >
          {{ link.label || t(link.key) }}
        </a>
      </nav>

      <div class="hud-nav__actions">
        <!-- target="_blank" IS FOR THE TRACKER, not for a new tab. Umami
             catches a same-tab <a> that carries data-umami-event, cancels the
             click and re-navigates with location.href, which drops `download`
             and opens the PDF over this page. A _blank link is the one kind
             it leaves alone, so the native download still runs, and with
             `download` set no tab opens. -->
        <UiLink
          v-if="isResume"
          ref="cv_ref"
          :href="cv_href"
          :download="cv_filename"
          target="_blank"
          rel="noopener"
          variant="primary"
          size="sm"
          class="hud-nav__cv"
          :aria-label="t('kyo-web.resume.download-aria')"
          data-umami-event="cv-download"
          :data-umami-event-lang="cv_lang"
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
        <!-- A BUTTON, NOT A LINK: it opens something on this page rather
             than going anywhere. The wrapper is the sheet's anchor from the
             `nav` fold up; see `&__share` below. -->
        <div v-if="isBlog" class="hud-nav__share">
          <UiButton
            ref="share_ref"
            variant="primary"
            size="sm"
            class="hud-nav__share-button"
            aria-haspopup="dialog"
            aria-controls="share-sheet"
            :aria-expanded="String(share_open)"
            :aria-label="t('kyo-web.blog.share-aria')"
            @pointerenter="warmShare"
            @focus="warmShare"
            @click="toggleShare"
          >
            <AppIcon name="share" class="hud-nav__share-icon" />
          </UiButton>
          <ShareSheet v-if="share_open" @close="share_open = false" />
        </div>
        <!-- Silent while the sheet is open: the sheet says "Share" itself. -->
        <CursorTooltip
          v-if="isBlog"
          :visible="share_tooltip_visible && !share_open"
          :x="share_tip_x"
          :y="share_tip_y"
        >
          {{ t('kyo-web.blog.share-aria') }}
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
          v-if="isLanding || isBlog"
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

  /*
   * THE BAR FOLDS INTO THE DRAWER AT `nav` (700px), NOT AT `md`.
   *
   * It used to fold at 1024px, so every tablet and every laptop window under
   * that width got a phone's hamburger over a bar with room to spare — the only
   * links it has to hold above the fold are HOME and BLOG, since the chip owns
   * the landing's sections. The owner moved it. Every rule in this file that
   * switches between the bar and the drawer keys off the same `nav` breakpoint,
   * and nav.spec.js asserts both sides of the line.
   */
  &__links {
    display: none;
    gap: 1.25rem;
    justify-content: flex-start;

    @include min-media-query(nav) {
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
    /* The casing is a property of the NAV, not of the copy. Every landing
       label was already capitalised in the catalogue; the blog links reuse
       the breadcrumb strings, which are title case because a breadcrumb is,
       and a second all-caps copy of "Blog" in the eager catalogue is main
       bundle bytes for every visitor to buy the same word twice. */
    text-transform: uppercase;
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

    @include min-media-query(nav) {
      gap: 0.75rem;
    }
  }

  &__separator {
    display: none;
    width: 1px;
    height: 1.1rem;
    background: var(--clr-border-100);

    @include min-media-query(nav) {
      display: block;
    }
  }

  &__social-group {
    display: none;

    @include min-media-query(nav) {
      display: inline-flex;
      gap: 0.15rem;
    }
  }

  &__social-link {
    display: none;
    color: var(--clr-neutral-50);
    text-decoration: none;
    transition: border-color 0.2s ease, color 0.2s ease;

    @include min-media-query(nav) {
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
     toggle uses below md. It never hides — this is the page's only download.
     The blog's share button is the same box on the same terms, so the two
     page actions are one rule and cannot drift apart either.
     The 24px floor is WCAG 2.5.8's: the medium type tier (1024-1199px) sets
     the icon at 12px, and padding plus border then came to 23.6px. */
  &__cv,
  &__share-button {
    color: var(--clr-neutral-50);
    min-height: 24px;
    padding-left: 0.55rem;
    padding-right: 0.55rem;

    @include max-media-query(nav) {
      height: 44px;
      min-height: 44px;
    }
  }

  /* Open is a state, and state is what the accent is for: the button's rule
     takes it while its sheet is down, so the reader can see which control the
     panel belongs to. The fill stays the page's until a hover inverts it. */
  &__share-button[aria-expanded="true"] {
    border-color: var(--clr-primary-100);
  }

  /*
   * THE SHEET'S ANCHOR, AND ONLY FROM THE FOLD UP — share-sheet.vue holds the
   * other half of this. From `nav` the wrapper is positioned, so the sheet
   * hangs off the button's right edge like the language menu. Below it the
   * wrapper stays static, which makes the sticky header the sheet's containing
   * block, and the sheet drops under the whole bar like the drawer does.
   * inline-flex for the language toggle's reason: no line-box leading under
   * the button.
   */
  &__share {
    display: inline-flex;

    @include min-media-query(nav) { position: relative; }
  }

  /* Inline SVG, NOT a Nerd Font glyph: an icon font only paints once that exact
     subset reaches the browser, and a cached older copy silently renders tofu.
     The sprite ships in the document, so it cannot miss. Sized to the toggle's
     text box (fs-200, line-height 1) so both buttons stay the same height.
     The fill/stroke flip overrides AppIcon's stroked default — this glyph is
     the solid Font Awesome shape, matching the GitHub/LinkedIn icons. */
  &__cv &__cv-icon,
  &__share-button &__share-icon {
    font-size: var(--fs-200);
    fill: currentColor;
    stroke: none;
  }

  
  &__menu-toggle {
    @include min-media-query(nav) {
      display: none;
    }

    @include max-media-query(nav) {
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


  /*
   * THE SECTION ANCHORS MOVE TO THE CHIP ON DESKTOP — but HOME stays.
   *
   * The chip owns navigating BETWEEN sections; the bar keeps the one link that
   * is a destination rather than a position, so there is always a way back to
   * the top that does not require opening anything. `hero` is therefore excluded
   * from the rule while the other five are hidden.
   *
   * HIDDEN, NOT REMOVED, and only above `nav`: below that the drawer is still
   * how you move around, so the markup has to survive. Deleting it would take
   * the sections off mobile entirely.
   */
  .hud-nav__link--section {
    @include min-media-query(nav) { display: none; }
  }

  &--open .hud-nav__links {
    @include max-media-query(nav) {
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
