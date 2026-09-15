<script setup>
/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 */

/*
 * The blog's footer: a brand block and three link columns.
 *
 * IT WAS TWO LINKS — "Blog" and "Home" — which the owner cut as pointless: the
 * nav already carries both, and a footer that repeats the nav is not a footer.
 * This is the column shape the reference uses, sized to what this site
 * actually has to link to rather than to a five-column product menu.
 *
 * IT REUSES THE NAV'S OWN LABELS. Every SITE entry reads the same
 * `kyo-web.landing.nav.*` key the header reads, so the two can never drift and
 * the columns cost the eager i18n catalogue three new words instead of ten.
 * The section anchors are absolute (`/#projects`), not bare fragments — from
 * an article, `#projects` would scroll the article, not open the landing.
 *
 * SiteFooter is landing-only (v-if="isLanding" in App.vue) and carries the
 * full brand signature and a runtime manifest — more than an article needs
 * under it, and its own chunk. This is the deliberate lighter replacement.
 *
 * role="contentinfo" is kept because it is the page's footer landmark; the
 * class is `site-footer` as well as `blog-footer` so hud-nav's INERT_TARGETS
 * still finds it when the mobile drawer opens on a blog route.
 *
 * IT IS THE ONLY FOOTER on a blog route. The archive and the article both used
 * to ALSO pass `signoff` to DocumentPage, so both painted.
 */

import logoKyonaxSvg from '@assets/app/LOGO_KYONAX.svg?raw';
import { BLOG_INDEX_URLS } from '@seo/blog-routes';
import {
  PRIVACY_ROUTE_BY_LOCALE,
  RESUME_ROUTE_BY_LOCALE,
  ROUTE_BY_LOCALE,
} from '@seo/routes';
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

const { t, locale } = useI18n();

const landing_href = computed(() => ROUTE_BY_LOCALE[locale.value] || ROUTE_BY_LOCALE.en);
const blog_href = computed(() => BLOG_INDEX_URLS[locale.value] || BLOG_INDEX_URLS.en);

/*
 * THE INDEPENDENT PAGES — not the landing's sections.
 *
 * This column used to list `#experience`, `#projects`, `#skills`… which are
 * anchors INTO one page, not places on the site. A footer's job is the map:
 * the handful of things that exist on their own and that a reader might want
 * from anywhere. Every href comes from the route map that already owns it, so
 * the footer cannot drift from the router — `/es/hoja-de-vida` in particular is
 * a localised slug nobody should be retyping.
 *
 * The first four labels already exist in the catalogue as breadcrumbs, so
 * naming them costs no new eager bytes; RSS is the one new word.
 *
 * THE FEED SITS BESIDE THE ARCHIVE it syndicates: scripts/generate-feeds.mjs
 * writes <archive>/feed.xml per locale, so its map is the archive's plus a
 * file name. It is a same-tab internal link like the rest of this column, so
 * it carries no analytics event.
 */
const FEED_URLS = Object.fromEntries(
  Object.entries(BLOG_INDEX_URLS).map(([l, url]) => [l, `${url}/feed.xml`]),
);

const PAGES = [
  { id: 'home',    map: ROUTE_BY_LOCALE,           key: 'kyo-web.breadcrumb.home' },
  { id: 'blog',    map: null,                      key: 'kyo-web.blog.breadcrumb' },
  { id: 'resume',  map: RESUME_ROUTE_BY_LOCALE,    key: 'kyo-web.resume.breadcrumb' },
  { id: 'privacy', map: PRIVACY_ROUTE_BY_LOCALE,   key: 'kyo-web.privacy.breadcrumb' },
  { id: 'rss',     map: FEED_URLS,                 key: 'kyo-web.blog.rss' },
];

const page_links = computed(() => PAGES.map((p) => ({
  id: p.id,
  label: t(p.key),
  /* The blog index is derived from the synced manifest rather than declared, and
     that manifest is empty on a checkout with no blog build — hence the split. */
  href: p.map ? (p.map[locale.value] || p.map.en) : blog_href.value,
})));
const year = new Date().getFullYear();

const SOCIALS = [
  { id: 'github',   url: 'https://github.com/kyonax',      label: 'GitHub' },
  { id: 'linkedin', url: 'https://linkedin.com/in/kyonax', label: 'LinkedIn' },
];
</script>

<template>
  <footer class="site-footer blog-footer" role="contentinfo">
    <!--
      HOW THIS SITE IS BUILT, BEFORE EVERYTHING ELSE AND ACROSS THE WHOLE BAND.

      A footer's first job on a site like this is to say what the thing IS. It
      used to be a reading-measure paragraph with a link through to a separate
      /colophon page; the page is gone, so this is now the only place that
      answers the question and it takes the full width to do it.

      THE TOOLS AND NOTHING ELSE — the owner's rule. It was a paragraph that
      went on to MathML, SVG, the licence and the absence of trackers; all true,
      none of it what the line is for. It names the three tools and stops.

      `v-html` because the sentence carries its own inline links; the key is on
      the raw-html allowlist and the copy is ours, not user input.
    -->
    <p class="blog-footer__note" v-html="t('kyo-web.landing.footer.built-note')" />

    <div class="blog-footer__main">
      <!-- THE REAL WORDMARK, not the letters typed out. The site ships
           LOGO_KYONAX.svg and the landing signature already inlines it; a
           hand-set "KYONAX" in Geomanist with letter-spacing was an
           approximation of a logo that exists. Inlined raw so it inherits
           `currentColor` and needs no second request. -->
      <div class="blog-footer__brand">
        <a
          :href="landing_href"
          class="blog-footer__logo"
          :aria-label="t('kyo-web.landing.nav.aria.brand')"
          v-html="logoKyonaxSvg"
        />
        <p class="blog-footer__sign">
          © {{ year }} Cristian D. Moreno
        </p>
      </div>

      <!-- THE TWO NAVS ARE DIRECT CHILDREN OF THE ROW, not a nested grid.
           They used to sit inside a `__cols` wrapper that was handed a 2.4fr
           track sized for a link area that had more columns in it; two short
           lists then bunched against the rule with ~500px of nothing after
           them. Flattened, the three blocks are tracks of one grid and share
           the band. -->
      <nav
        class="blog-footer__col blog-footer__col--first"
        :aria-label="t('kyo-web.landing.footer.col-site')"
      >
        <h2 class="blog-footer__col-title">
          {{ t('kyo-web.landing.footer.col-site') }}
        </h2>
        <ul role="list">
          <li v-for="link in page_links" :key="link.id">
            <a :href="link.href">{{ link.label }}</a>
          </li>
        </ul>
      </nav>

      <!-- PROFILES, not SOCIAL and no longer ELSEWHERE: these are this
           person's accounts on other platforms, which is true of a code host
           and a professional network alike. `me` says exactly that to a
           machine: the rel=me identity link, which a profile that links back
           here can use to verify the site (IndieAuth, Mastodon). -->
      <nav class="blog-footer__col" :aria-label="t('kyo-web.landing.footer.col-profiles')">
        <h2 class="blog-footer__col-title">
          {{ t('kyo-web.landing.footer.col-profiles') }}
        </h2>
        <ul role="list">
          <li v-for="s in SOCIALS" :key="s.id">
            <a
              :href="s.url"
              target="_blank"
              rel="me noopener noreferrer"
              data-umami-event="outbound"
              :data-umami-event-url="s.url"
            >{{ s.label }}</a>
          </li>
        </ul>
      </nav>
    </div>
  </footer>
</template>

<style lang="scss" scoped>
/*
 * ONE BLOCK, BORDERED ON EVERY SIDE — the owner's call.
 *
 * It was a band: a rule across the top, a second rule under the built-with
 * line, and a vertical rule beside the links that stopped short of both. The
 * top rule spanned the footer's padding box and the inner rule only its content
 * box, so the two horizontals were different widths, and the vertical floated
 * in the middle touching neither.
 *
 * Now the footer is a GUTTER, not a box: it only keeps the block off the screen
 * edge. The block is its two children — the built-with line bordered on all
 * four sides, the columns under it bordered on the other three — so every
 * horizontal is the block's own width, the left and right edges are closed,
 * and the line between the two parts is ONE hairline, the note's, rather than
 * two touching. Cells carry their own padding and the grid has none, which is
 * what lets the column divider run the full height of its row and meet the
 * rules above and below it.
 */
.blog-footer {
  /* The gutter is added to `max-width` rather than subtracted from it —
     `hud-nav__bar`'s own `calc(1280px + 4rem)` idiom. Capping at a bare 1280px
     puts the padding INSIDE the band, which inset the footer further than the
     archive above it at every width past the cap. */
  max-width: calc(1280px + 3rem);
  margin: 4rem auto 0;
  padding: 0 1.5rem 3rem;
  color: var(--clr-neutral-200);
  font-family: "SpaceMono", monospace;
  font-size: var(--fs-200);

  @include min-media-query(md) {
    max-width: calc(1280px + 4rem);
    padding-left: 2rem;
    padding-right: 2rem;
  }

  /*
   * ROOM FOR THE CHIP AT THE BOTTOM OF THE PAGE.
   *
   * The section rail is `position: fixed` in the bottom-right corner, and the
   * footer is the one place a reader scrolls all the way to — so on a narrow
   * screen, where the footer's own columns reach that corner, the chip sat on
   * top of a link. Measured at 320px: it covered "LinkedIn". This is the
   * clearance, and an e2e test asserts no footer link is ever under it.
   */
  @include max-media-query(sm) { padding-bottom: 6rem; }
}

/*
 * FULL WIDTH, ON PURPOSE, AND THAT IS A DEPARTURE.
 *
 * This carried `max-width: var(--kyo-measure)` (68ch) because a 1280px line of
 * body text is unreadable — which is true of an ARTICLE. It is not true here:
 * this is footer chrome, one line since it shrank to the tools, and capping it left the
 * band's right half empty above a row of columns that already had a dead zone
 * of its own. It runs the full band now, and stays readable because it is
 * short rather than because it is narrow.
 */
.blog-footer__note {
  margin: 0;
  padding: 1.5rem;
  border: 1px solid var(--clr-border-100);
  color: var(--clr-neutral-200);
  font-family: "Geomanist", sans-serif;
  font-size: var(--fs-200);
  line-height: 1.7;

  /* The same inline padding as the cells below, so this line starts on the
     wordmark's edge. */
  @include min-media-query(md) { padding: 1.5rem 2rem; }

  :deep(a) {
    color: var(--clr-neutral-50);
    text-decoration: underline;
    text-underline-offset: 0.2em;
    transition: color 0.15s ease;

    &:hover,
    &:focus-visible { color: var(--clr-primary-100); }
  }
}

/*
 * THREE TRACKS ACROSS THE BAND: brand, pages, profiles.
 *
 * It was `minmax(0, 1fr) minmax(0, 2.4fr)` — brand against a nested grid of
 * link columns. The 2.4 was tuned when the link side held more columns than it
 * does now; with two short lists left, the columns bunched just past the
 * vertical rule and roughly 500px of nothing followed them to the right edge.
 * Giving each block its own track spreads them over the whole width and the
 * dead zone has nowhere to be. The brand keeps a wider share because a
 * wordmark plus a copyright line is wider than four link words.
 *
 * Two columns from `sm` (the two navs side by side under the brand), three
 * from `md`. The 480px hand-rolled breakpoint that used to sit inside
 * `__cols` is gone — it was the only raw media query in this file, and the
 * repo's own `sm` does the same job at a width the rest of the site agrees on.
 *
 * NO GAP, AND NO TOP BORDER. The spacing lives in each cell's padding so the
 * divider can reach both edges of the row; a grid gap would leave it floating.
 * The top edge is the note's bottom border — declaring another here would
 * stack two hairlines into one 2px line.
 */
.blog-footer__main {
  display: grid;
  border: 1px solid var(--clr-border-100);
  border-top: 0;

  @include min-media-query(sm) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  @include min-media-query(md) {
    grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr) minmax(0, 1fr);
  }
}

.blog-footer__brand,
.blog-footer__col {
  padding: 1.5rem;

  @include min-media-query(md) { padding: 2rem; }
}

/*
 * THE MARK IS SEPARATED FROM THE LINKS AT EVERY WIDTH — by a vertical rule
 * where they sit side by side, and a horizontal one where they stack.
 *
 * At `sm` the brand also spans both tracks, which is what the comment above
 * always promised and the grid never did: auto-placement put the brand beside
 * SITE and dropped PROFILES alone onto a second row under the wordmark.
 */
.blog-footer__brand {
  display: grid;
  gap: 1rem;
  align-content: start;
  justify-items: start;
  border-bottom: 1px solid var(--clr-border-100);

  @include min-media-query(sm) { grid-column: 1 / -1; }

  @include min-media-query(md) {
    grid-column: auto;
    border-bottom: 0;
  }
}

/* The mark is capped rather than set at 100%: the SVG is a 3840-wide
   landscape wordmark, so an unconstrained width makes it the loudest thing on
   the page. It also stays a comfortable tap target on a phone. */
.blog-footer__logo {
  display: block;
  width: 100%;
  max-width: 11rem;
  color: var(--clr-neutral-100);
  transition: color 0.2s ease;

  &:hover,
  &:focus-visible { color: var(--clr-primary-100); }

  :deep(svg) {
    display: block;
    width: 100%;
    height: auto;
  }
}

.blog-footer__sign {
  margin: 0;
  line-height: 1.7;
  font-size: var(--fs-100);
}

/*
 * THE RULE BETWEEN THE MARK AND THE LINKS.
 *
 * A vertical hairline separating the brand from the link columns, the way a
 * printed colophon separates the device from the setting notes. Drawn as a
 * border on the FIRST link column rather than as its own element, so it costs
 * no markup, and only at `md`, where the brand and the links actually sit side
 * by side. At `sm` the two navs pair up UNDER the brand, so a vertical rule
 * there would be a line pointing at nothing — the brand's bottom rule does the
 * separating instead.
 *
 * FULL HEIGHT. A grid item stretches to its row by default, and the row has no
 * padding of its own, so the border runs from the note's rule to the block's
 * bottom edge and meets both — it used to stop 30px short of the rule above.
 */
.blog-footer__col--first {
  @include min-media-query(md) {
    border-left: 1px solid var(--clr-border-100);
  }
}


.blog-footer__col {
  ul {
    display: grid;
    gap: 0.55rem;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  a {
    color: var(--clr-neutral-200);
    text-decoration: none;
    transition: color 0.2s ease;

    &:hover,
    &:focus-visible { color: var(--clr-primary-100); }
  }
}

.blog-footer__col-title {
  margin: 0 0 1rem;
  color: var(--clr-neutral-100);
  font-family: "SpaceMono", monospace;
  font-size: var(--fs-100);
  font-weight: 400;
  letter-spacing: 0.16em;
  text-transform: uppercase;

}
</style>
