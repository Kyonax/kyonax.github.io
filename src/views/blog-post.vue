<script setup>
/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 */

/*
 * A single blog article (/blog/<section>/<date>-<slug>, /es/blog/...).
 *
 * THE BODY IS NOT WRITTEN HERE. It is pre-rendered, pre-sanitized HTML built
 * by the published @kyonax/org2html from an .org file in the kyo-blog repo,
 * loaded as its own chunk and v-html'd — the same shape privacy.vue uses for
 * its catalogue copy. org2html sanitizes by default (jsdom + DOMPurify), and
 * the corpus gate in that repo proves twelve injection vectors are stripped
 * while the engine's own task checkboxes survive.
 *
 * WHY NOT THE GENERATED .vue. org2html can emit a Vue SFC per document, but
 * that SFC wraps its content in its own <main> and <article> — a duplicate
 * landmark inside DocumentPage's <main> — never emits a `components:` key,
 * and declares component props inside setup() without returning them. The
 * rendered fragment plus the JSON sidecars is the better-behaved half of the
 * engine's "ONE HEAD, TWO OUTPUTS" law.
 *
 * The engine's own client runtime (o2h.js) is deliberately NOT loaded: it
 * would bind its own lightbox to every figure image, set inline cursor
 * styles, and append two fixed elements to <body> that survive route changes.
 * The site's UiImageViewer handles zoom instead, via v-blog-lightbox.
 *
 * TITLE AND DESCRIPTION are passed to useSeoHead as literals rather than i18n
 * keys: they are CONTENT, authored per article, and putting them in the
 * catalogue would demand one entry per post in every locale.
 *
 * NO `signoff`. DocumentPage's sign-off exists because /resume and /privacy
 * render no chrome below the sheet — a blog route does: App.vue renders
 * <BlogFooter> under every one of them. Passing both painted two footers.
 * BlogFooter is the one that stays; it is the owner's ask and it carries the
 * way back, which a sign-off line does not.
 */

import { dressBlogToc, loadBlogPost } from '@composables/use-blog';
import { useBlogLightbox, vBlogLightbox } from '@composables/use-blog-lightbox';
import useSeoHead from '@composables/use-seo-head';
import { SUPPORT } from '@data/data';
import { BLOG_INDEX_URLS, blogAlternatesFor, blogUrlsFor } from '@seo/blog-routes';
import { buildBlogJsonLd } from '@seo/json-ld';
import { ROUTE_BY_LOCALE } from '@seo/routes';
import ModalLoading from '@ui/modal-loading.vue';
import { useHead } from '@unhead/vue';
import DocumentPage from '@views/components/document-page.vue';
import {
  computed, defineAsyncComponent, hydrateOnIdle, nextTick,
  onBeforeUnmount, onMounted, ref,
} from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';

/* Async, with the shared skeleton — the viewer is a chunk of its own and must
   never be pulled into the article's. */
const UiImageViewer = defineAsyncComponent({
  loader: () => import('@ui/image-viewer.vue'),
  loadingComponent: ModalLoading,
  delay: 0,
});

/*
 * THE SERIES PANEL AND THE READING LINKS ARE CHUNKS OF THEIR OWN. The article
 * chunk had 35 bytes of budget left, and vite 8 overran it by 25. Both panels
 * sit at the article's foot, so they are split out and hydrated when the
 * browser is idle. The server still renders them: Vue awaits an async
 * component's loader during SSR, so the markup is in the prerendered HTML and
 * the chunk is modulepreloaded. defer-async-css.mjs keeps their CSS
 * render-blocking on an article, or the foot would shift when it lands.
 */
const BlogSeries = defineAsyncComponent({
  loader: () => import('@views/components/blog/blog-series.vue'),
  hydrate: hydrateOnIdle(),
});
const BlogPostNav = defineAsyncComponent({
  loader: () => import('@views/components/blog/blog-post-nav.vue'),
  hydrate: hydrateOnIdle(),
});

const { t, locale } = useI18n();
const route = useRoute();

const {
  picture: viewer_picture,
  alt: viewer_alt,
  open: open_viewer,
  close: close_viewer,
} = useBlogLightbox();

/* Top-level await. <Suspense> in App.vue is what makes vite-ssg wait for this
   during prerender, so the article ships inside the HTML for crawlers rather
   than appearing only after hydration. */
const post = await loadBlogPost(route.path);

/*
 * THE RAIL'S SECTIONS COME OUT OF THE ARTICLE ITSELF.
 *
 * The body arrives as HTML from the engine, with its own table of contents,
 * and the rail lists exactly what that contents lists: the same ids, in the
 * same order, at the depth the author chose (toc:N), each with its `level` so
 * the rail can nest it the same way. An article with no contents falls back to
 * its top-level headings. So the rail reads the rendered document rather than
 * being handed a second list that could disagree with the headings on screen.
 *
 * IT USED TO TAKE EVERY `.org-section > .org-heading[id]`, on the belief that
 * only top-level headings carry an id. Every heading of every depth does, so
 * the reference post handed the rail 37 entries down to h6 — an archived stub
 * among them — against the 28 its contents lists. The label is the heading's
 * TEXT (`.org-heading-text`): the whole heading's textContent glued the TODO
 * keyword, priority and tags to it, "DONEPick the slug and the date".
 *
 * Collected once, after the DOM exists. App.vue keys this view by path, so a
 * client-side move to another article (the language toggle is one) mounts a
 * fresh instance rather than patching this one — `post` above is awaited once
 * and could never follow a route change.
 */
/*
 * ASYNC ON PURPOSE. The rail is shared with the landing page, so welding it into
 * the article chunk would ship it twice and put 1.5 KB of navigation ahead of
 * the words on a route whose whole job is the words. As its own chunk it is
 * fetched after the article renders, and both pages get the same copy.
 */
const SectionRail = defineAsyncComponent(() => import('@widgets/section-rail.vue'));

/*
 * THE SUPPORT BLOCK IS A CHUNK OF ITS OWN, for the rail's reason: the article
 * chunk is budgeted, and it is not the words. It sits below the body, and the
 * prerender awaits it, so vite-ssg modulepreloads it and a set support url
 * ships in the HTML.
 *
 * SHARING LIVES IN THE NAV NOW, as the resume's download does: an icon in the
 * bar on every blog page (hud-nav.vue), not a word at the end of the meta row.
 */
const BlogSupport = defineAsyncComponent(() => import('@views/components/blog/blog-support.vue'));

const prose_ref = ref(null);
const sections = ref([]);

/*
 * CODE THAT WRAPS AND EQUATIONS THAT FIT — see article-enhance.js. Fetched once
 * the article is on screen, never ahead of the words, and never by a reader of
 * a route with no article to enhance.
 */
let stop_enhance = null;
onMounted(() => {
  import('@composables/article-enhance').then(({ enhanceArticle }) => {
    if (prose_ref.value && !stop_enhance) {
      stop_enhance = enhanceArticle(prose_ref.value, {
        wrapLabel: t('kyo-web.blog.code-wrap'),
        wrapAria: t('kyo-web.blog.code-wrap-aria'),
      });
    }
  });
});
onBeforeUnmount(() => {
  if (stop_enhance) {
    stop_enhance();
  }
});

const collectSections = async () => {
  await nextTick();
  const root = prose_ref.value;
  if (!root) {
    sections.value = [];
    return;
  }
  const toc = root.querySelector('.org-toc');
  const by_id = new Map(
    [...root.querySelectorAll('.org-heading[id]')].map((h) => [h.id, h]),
  );
  const headings = toc
    ? [...toc.querySelectorAll('a[href^="#"]')]
      .map((a) => by_id.get(a.getAttribute('href').slice(1)))
    : [...root.querySelectorAll('.org-section > .org-heading.outline-1[id]')];
  sections.value = headings
    .filter(Boolean)
    .map((h) => ({
      id: h.id,
      label: (h.querySelector('.org-heading-text') || h).textContent.trim(),
      level: Number((/\boutline-(\d)\b/.exec(h.className) || [])[1]) || 1,
    }))
    .filter((s) => s.label);
};

onMounted(collectSections);

const blog_href = computed(() => BLOG_INDEX_URLS[locale.value] || BLOG_INDEX_URLS.en);
const home_href = computed(() => ROUTE_BY_LOCALE[locale.value] || ROUTE_BY_LOCALE.en);

/*
 * THE TAGS ARE A SEARCH, NOT A PAGE PER TAG. Each chip opens this locale's
 * archive with `?search=<tag>`, and blog-search.vue reads it on mount and
 * filters All Posts by it — so a tag goes somewhere without the site growing a
 * route per tag (the old `?q=` is still read, and rewritten, for the links
 * already out there). The engine files a post's #+FILETAGS under its seo
 * sidecar; a top-level `tags` wins if the engine ever lifts them. The
 * #all-posts hash lands the reader on the search and the list it filters, not
 * on the archive's hero, and the path is the archive's canonical form (no
 * trailing slash), which production serves without the .htaccess 301 the
 * slashed form costs.
 */
const tags = (post && (post.tags || post.seo?.tags)) || [];
const tagHref = (tag) => `${blog_href.value}?search=${encodeURIComponent(tag)}#all-posts`;

/* The engine's HTML with its table of contents in the article's language and
   counted — see dressBlogToc in use-blog.js. */
const body_html = computed(() => (post ? dressBlogToc(post.html, t('kyo-web.blog.toc')) : ''));

/* The trail starts at BLOG, not at Home. An article's parent is the archive;
   Home is the site, not a step on the way here, and the row was long enough
   that the crumb that matters — which section you are reading — was third. */
const crumbs = computed(() => [
  { label: t('kyo-web.blog.breadcrumb'), href: blog_href.value },
  { label: post ? post.title : t('kyo-web.blog.not-found') },
]);

/* An article's <title> is its headline plus a short brand suffix. Bare, it read
   "Why Org Mode" — twelve characters with nothing saying whose blog it is, on
   the only pages of this site a search result is likely to land on. The
   headline stays FRONT-LOADED, so a long one truncates in the suffix rather
   than in the words that matter. */
const seo_title = computed(() => (post ? `${post.title} - Kyonax Blog` : undefined));

useSeoHead({
  keyPrefix: 'kyo-web.blog.meta',
  title: seo_title.value,
  description: post ? post.description : undefined,
  /* An article still shares the landing banner, so it takes the landing's
     words for that picture: the blog's og-image-alt describes the archive's
     card, which an article does not show. */
  ogImageAlt: t('kyo-web.landing.meta.og-image-alt'),
  urls: post ? blogUrlsFor(route.path) : BLOG_INDEX_URLS,
  alternates: post ? blogAlternatesFor(route.path) : [],
  ogType: 'article',
});

/* App.vue emits no graph for blog routes: a BlogPosting needs this article's
   own title, date and image, which only this view has loaded. Same head key,
   so there is exactly one JSON-LD block either way. */
/*
 * THE ENGINE'S OWN STYLE BOOK dresses the article body.
 *
 * `public/blog/style-book.css` is org2html's default `kwo` book, minified into
 * place by sync-blog.mjs. 837 of its rules are scoped under `.org-root`, which
 * the post body carries, so it styles the article and nothing else.
 *
 * THE BOOK IS PARAMETERISED, NOT OVERRIDDEN. Every value in it reads
 * `var(--host-X, <kwo default>)`, so the site hands it the site's own palette,
 * faces and scale through `--host-*` on the article shell and the book adapts.
 * That is the documented way to reskin it — fighting it with `!important`
 * would be the wrong layer, and its own header names this site's document
 * pages as the look it was built to match.
 *
 * AND ITS RUNTIME DRESSES THE BEHAVIOUR. `public/blog/o2h.js` is the same
 * book's interactive layer, minified in by sync-blog.mjs and loaded ONLY
 * here. It is what makes the YouTube and X embeds click to play: the engine
 * emits them as FACADES — a poster and a play target, with nothing from the
 * provider in the page — and this runtime swaps in the real frame on the
 * reader's click. Without it the facade degrades to a plain link, which is
 * correct but is not a player. `defer` because it enhances hooks the
 * prerendered HTML already carries, so it must never block the parse, and
 * nothing third-party is fetched until the reader asks for it.
 */
useHead({
  link: [{
    key: 'kyo-blog-style-book',
    rel: 'stylesheet',
    /* The content-hashed copy sync-blog.mjs writes (a year in .htaccess), named
       by vite.config.js's define, or the plain name when there is none. */
    href: import.meta.env.KYO_BLOG_STYLE_BOOK,
  }],
  script: [
    {
      key: 'kyo-site-jsonld',
      type: 'application/ld+json',
      innerHTML: computed(() => JSON.stringify(
        buildBlogJsonLd({ locale: locale.value, post }),
      )),
    },
    /*
     * WHAT THE RUNTIME MAY DO HERE, DECIDED BEFORE IT LOADS.
     *
     * An inline script is not deferred, so this always executes before the
     * deferred runtime below — which is the only ordering that works. Trying to
     * stand o2h's lightbox down after the fact is a race the site loses: its
     * initialisers set their own guard flags, and their listeners are anonymous,
     * so once it has bound an image nothing can unbind it. Two overlays opened
     * on one click.
     *
     * `lightbox: false` — this site has its own image viewer, the same
     *   `@ui/image-viewer` the landing page uses, wired through v-blog-lightbox.
     *   One viewer, one behaviour, everywhere.
     * `readProgress: false` — the owner does not want a reading-progress bar.
     * `backToTop: false` — the runtime's floating button sits in the SAME
     *   bottom-right corner the section rail's chip now occupies, and the
     *   chip both says where you are and jumps anywhere in the document.
     *   Two fixed controls stacked in one corner, the smaller one able to
     *   do strictly less, is worse than either alone. Owner's call.
     *
     * Everything else stays on, and the embed click-to-play this runtime was
     * loaded for is untouched.
     */
    {
      key: 'kyo-blog-o2h-config',
      innerHTML: 'window.O2H_CONFIG={lightbox:false,readProgress:false,backToTop:false};',
    },
    {
      key: 'kyo-blog-o2h',
      src: import.meta.env.KYO_BLOG_O2H,
      defer: true,
    },
  ],
});

const formatted_date = computed(() => {
  if (!post || !post.date) {
    return '';
  }
  /* Build from the ISO components so the rendered day is the AUTHORED day in
     every timezone — parsing "2026-05-01" as a Date yields UTC midnight, which
     is the previous day west of Greenwich. */
  const [y, m, d] = post.date.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(locale.value === 'es' ? 'es-CO' : 'en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
});
</script>

<template>
  <DocumentPage
    id="main"
    width="article"
    align="left"
    class="h-entry"
    :crumbs="crumbs"
    :crumbs-label="t('kyo-web.breadcrumb.aria')"
  >
    <template #header>
      <!--
        AN h-entry, FOR THE INDIEWEB READERS — zero bytes of script. The
        classes ride on elements that already exist: p-name on the headline,
        p-author h-card on the byline, dt-published on the <time>, p-category
        on each tag, e-content on the body. The root class lands on
        DocumentPage's <main>, the nearest element this view renders that
        wraps all five; the <article> inside it belongs to the shared shell.
      -->
      <h1 class="doc__title p-name">
        {{ post ? post.title : t('kyo-web.blog.not-found') }}
      </h1>
      <p v-if="post" class="blog-post__meta">
        <!-- WHO WROTE IT, FIRST. Every article declares `#+AUTHOR:`, and the
             line under the headline said when and how long but never who. The
             name links home with rel="author": the landing is the author's own
             page, and a reader arriving from search has no other way to it
             from here but the nav. -->
        <span v-if="post.author" class="blog-post__author">
          {{ t('kyo-web.blog.by') }}
          <a
            :href="home_href"
            rel="author"
            class="blog-post__author-name p-author h-card"
          >{{ post.author }}</a>
        </span>
        <span
          v-if="post.author"
          class="blog-post__dot"
          aria-hidden="true"
          data-text="·"
        />
        <time
          class="dt-published"
          :datetime="post.date"
        >{{ formatted_date }}</time>
        <span
          v-if="post.readingTime"
          class="blog-post__dot"
          aria-hidden="true"
          data-text="·"
        />
        <span v-if="post.readingTime">
          {{ post.readingTime }} {{ t('kyo-web.blog.reading-time') }}
        </span>
      </p>
      <ul
        v-if="tags.length"
        class="blog-post__tags"
        role="list"
        :aria-label="t('kyo-web.blog.tags')"
      >
        <li v-for="tag in tags" :key="tag">
          <a
            class="blog-post__tag p-category"
            :href="tagHref(tag)"
          ><span class="blog-post__tag-word">{{ tag }}</span></a>
        </li>
      </ul>
    </template>

    <template v-if="post">
      <!-- Pre-sanitized by org2html at build time; see the header note. -->
      <!--
        ONE STYLESHEET GOVERNS THIS BODY, AND IT IS THE ENGINE'S.

        This carried `doc-rich blog-rich kyo-prose` and every one of those
        FOUGHT the Style Book. `.doc-rich` styles bare p/ul/li because privacy
        copy arrives from an i18n string with no classes to hook; `.kyo-prose`
        sets the face, line-height, tracking and colour for landing prose. Both
        are scoped, and a scoped class carries its `[data-v-*]` attribute, so
        `.doc-rich[data-v-x] p` (0,2,1) outranks the book's
        `.org-root .org-paragraph` (0,2,0) — the book's 24px paragraph rhythm
        was being overwritten with the site's 1.4rem, which is 16.8px at this
        12px root, while its 48px grid row-gap survived untouched. Tight text
        inside huge gaps: the article looked nothing like the book because it
        was only wearing a quarter of it.

        `blog-rich` stays for one rule — hiding the engine's duplicate header.
      -->
      <div
        ref="prose_ref"
        v-blog-lightbox="open_viewer"
        class="blog-rich e-content"
        :data-chart-zoom-label="t('kyo-web.blog.chart-zoom')"
        v-html="body_html"
      />

      <!-- An OVERLAY, not a column: it is fixed, so the article's measure is
           the same whether the rail is on the page or not. Rendered only when
           the document actually has sections to point at. -->
      <SectionRail
        v-if="sections.length > 1"
        :sections="sections"
        :label="t('kyo-web.landing.nav.on-this-page')"
      />

      <!--
        THE CLOSING ORDER IS THE OWNER'S, AND IT READS OUTWARD.

        Series first, because a reader who just finished part 3 wants part 4
        before anything else; then the support ask; then related reading; then
        the previous/next pager as the last, narrowest step. The series block
        used to sit ABOVE the article, which put a table of contents for six
        posts between the headline and the first sentence.

        The support block is gated HERE as well as inside itself, so while
        SUPPORT.url is empty its chunk is never requested.

        Comments come after the pager when they arrive. They are PARKED on
        evidence today (see kyo-blog's README), so nothing is rendered for
        them rather than an empty shell being left behind.
      -->
      <BlogSeries v-if="post.relations && post.relations.series" :series="post.relations.series" />

      <BlogSupport v-if="SUPPORT.url" />

      <BlogPostNav v-if="post.relations" :relations="post.relations" />
    </template>

    <p v-else class="doc-rich">
      <a :href="blog_href">{{ t('kyo-web.blog.back-to-index') }}</a>
    </p>

    <UiImageViewer
      v-if="viewer_picture !== null"
      :is-open="true"
      :picture="viewer_picture"
      :alt="viewer_alt"
      :close-label="t('kyo-web.landing.modal.close')"
      @close="close_viewer"
    />
  </DocumentPage>
</template>

<!--
  UNSCOPED, AND IT HAS TO BE.

  The Style Book resolves its whole palette on `:root` — 122 of its
  `var(--host-X, <default>)` reads live in that one rule — and a custom property
  is computed on the element that declares it, so handing it `--host-fg` further
  down the tree would be read too late and every token would silently keep its
  built-in default.

  This block still ships inside the blog-post CHUNK, so only an article route
  downloads it. The `--host-*` namespace is the book's alone; nothing else on
  the site reads these names, so declaring them at the root collides with
  nothing.

  Only the values the site actually owns are handed over. Everything the book
  decides for itself — spacing, rhythm, construct shapes, the state ramp — is
  left alone on purpose: overriding it here would be rebuilding the stylesheet
  this change exists to stop rebuilding.
-->
<style lang="scss">
:root {
  --host-fg: var(--clr-neutral-50);
  --host-bg: var(--clr-neutral-500);
  --host-dim: var(--clr-neutral-300);
  --host-accent: var(--clr-primary-100);
  /*
   * `--host-card` and `--host-code-bg` are NOT mapped, and that is the point.
   *
   * Pointing them at the site's `--clr-neutral-400` was a mistake: that token
   * is documented as a dark surface but sits at 37% lightness, while the
   * book's own card is 17.5% and its code well darker still. Every panel the
   * book draws — the series box, the TOC, code blocks — came out as a pale
   * grey slab against a near-black page.
   *
   * SURFACE DEPTH IS THE BOOK'S DECISION. Only values the SITE genuinely owns
   * are handed over: the ink, the ground, the accent and the two faces. The
   * book's own ladder is left alone.
   */
  --host-font-display: "Geomanist", sans-serif;
  --host-font-editorial: "Geomanist", sans-serif;
  --host-font-mono: "SpaceMono", monospace;
  /*
   * THE SHELL OWNS THE PAGE BOX, THE BOOK OWNS THE TYPE.
   *
   * `.org-root` is a three-track grid — gutter, content capped at the measure,
   * gutter — because a standalone document it converts IS the page and has to
   * keep itself off the screen edge. Embedded here it is not the page:
   * document-page.vue already applied both the gutter and the measure, so the
   * book's own pair applied them a SECOND time and every paragraph sat 40px
   * inside the masthead above it.
   *
   * Zeroed through the book's own host tokens rather than by overriding
   * `.org-root` — that is the seam it exposes for exactly this, and an
   * override would go stale the moment the grid changes.
   */
  --host-gutter: 0px;
  --host-measure: 100%;

  /*
   * THE READING SIZE, HANDED TO THE BOOK RATHER THAN FOUGHT.
   *
   * The shell's own `font-size` sets the `ch` the measure is counted in, but it
   * does NOT reach the prose: `.org-root` declares `font-size: var(--o2h-fs-body)`
   * for everything inside it. Widening the column without this made the line
   * LONGER in characters, not roomier — 688px of 15px type is 94 characters,
   * worse than the 85 it started at.
   *
   * `--host-fs-body` is the seam the book publishes for exactly this, so the size
   * is parameterised in rather than overridden. It is bound to the same token the
   * shell uses (`--fs-400`), which is what keeps the two in step: both are 18px
   * at the large tier and 15px below it, so the measure stays ~79 characters at
   * every breakpoint instead of being right at one and wrong at the others.
   */
  --host-fs-body: var(--fs-400);

  /*
   * THE HEADING SCALE, HANDED OVER THE SAME WAY — AND THIS IS WHAT FIXES PHONES.
   *
   * Left unset, the book falls back to fixed pixels: 54px, 36px and 24px for its
   * three heading levels at EVERY width. Measured on a phone, each section
   * heading was then more than twice the size of the article's own 24px title,
   * and at 1024px a 54px section still sat under a 36px title.
   *
   * The book's fallbacks are exactly the site's LARGE tier — `--fs-700`,
   * `--fs-600`, `--fs-500`, `--fs-800` are 54/36/24/72px at `lg` — so binding
   * them to the tokens changes nothing on a desktop, which the owner signed off,
   * and lets the site's own tiers scale them below it (28.5/24/19.5px on a
   * phone). Same law as `--host-fs-body`: parameterised in, never overridden.
   */
  --host-fs-display: var(--fs-800);
  --host-fs-h1: var(--fs-700);
  --host-fs-h2: var(--fs-600);
  --host-fs-h3: var(--fs-500);

  /*
   * THE MIDDLE TIER, FOR THE BOOK AS WELL. document-page.vue gives the blog the
   * medium tier's display steps from `sm`, but it does so on the article shell,
   * and the book resolves these on :root — above that shell — so they would
   * never see it. The same band is restated here, from the same scale, so the
   * engine's headings step up on a tablet in lockstep with the site's own.
   */
  @include between-media-query(sm, md) {
    --host-fs-display: #{fs-step(medium, 800)};
    --host-fs-h1: #{fs-step(medium, 700)};
    --host-fs-h2: #{fs-step(medium, 600)};
    --host-fs-h3: #{fs-step(medium, 500)};
  }

  /*
   * CODE, AT A SIZE A PHONE CAN HOLD A LINE OF. The book sets code at a flat
   * 14px, and inside its 24px padding and 24px line-number gutter a 360px
   * phone showed 27 characters of a line before the block had to scroll. 13px
   * is the floor the audit holds code to (constructs.spec.js (d)); the clamp
   * is back at the book's own 14px from 600px, so a tablet and a desktop read
   * exactly as before. The padding and the gutter, which eat the same line,
   * are cut below `sm` with the code-block rules further down. On :root for
   * the band's reason above.
   */
  --host-fs-code: clamp(13px, 11px + 0.5vw, 14px);
}

/*
 * THE BOOK'S OWN LAW, ENFORCED — a defect in kwo, patched at the narrowest
 * point until it is fixed upstream.
 *
 * kwo states the rule in its own comment: "Every top-level block sits in the
 * centered content track; its outer block margins are dropped so row-gap owns
 * the vertical rhythm between sections", and writes
 * `.org-root > * { margin-block: 0 }` to do it. But
 * `.org-root .org-paragraph { margin: 0 0 24px }` is (0,2,0) against that
 * rule's (0,1,0), so it wins on every TOP-LEVEL paragraph and the 24px
 * compounds with the 48px row-gap — 72px between paragraphs. The sheet even
 * guards the same compounding one line later for a section's last child, so
 * the intent is not in question.
 *
 * It only shows on a document with no headings, where every paragraph is a
 * direct child of .org-root — which is exactly what the template post is.
 * Inside a section the 24px is correct and is left alone.
 *
 * `> p.org-paragraph` is (0,2,1), so it wins regardless of which stylesheet
 * the bundler emits first. THE DURABLE FIX IS ONE LINE IN kwo.css; this goes
 * when that lands.
 */
.org-root > p.org-paragraph { margin-block: 0; }

/*
 * THE MASTHEAD MUST BE ALLOWED TO BREAK A WORD.
 *
 * One word set at display size on a narrow screen has nowhere legal to break,
 * so it runs off the page and takes the document's scroll width with it —
 * measured 41px of sideways scroll on a Spanish article at both 320px and
 * 342px, the signature of one fixed-size string. `.doc__title` is the SITE's
 * own h1, so this rule is the site's for good. Its twin for the engine's
 * headings is retired: kwo carries `overflow-wrap: anywhere` on `.org-heading`
 * itself now.
 */
.doc__title { overflow-wrap: anywhere; }

/*
 * NOR MAY AN INLINE TOKEN — (a) and (f). UPSTREAM CANDIDATE.
 *
 * A long identifier in `code` or `=verbatim=`, or a bare URL as a link, is one
 * unbreakable word: the paragraph wrapped around it while the token ran on,
 * 280px past its paragraph at 320px, and a footnote's GitHub URL took the page
 * 743px sideways. They break where they must now, only when a line cannot hold
 * them. Math is not in this list: nothing in it overflows, and an inline math
 * box that scrolled would lose its baseline.
 */
.org-root .org-code,
.org-root .org-verbatim,
.org-root .org-link { overflow-wrap: anywhere; }

/*
 * THE READING-PROGRESS BAR IS NOT A FEATURE THIS SITE WANTS.
 *
 * o2h.js creates `div.org-read-progress` and appends it to <body> on every
 * boot, outside `.org-root` entirely — so this rule cannot be scoped and
 * cannot live in the book's own cascade.
 *
 * It also arrives BROKEN: the base sheet paints the track transparent and
 * only the `<i>` fill accent, but kwo re-declares the track itself as accent
 * at the same specificity and later in the cascade, so the reader gets a
 * permanent full-width yellow band instead of a progress indicator. That is
 * a real upstream defect and is fixed in kwo separately — but the owner does
 * not want the bar at all, so the site refuses it here rather than styling
 * something it will never show. Hidden, not deleted: the element is o2h's to
 * own, and removing it from the DOM would fight a runtime that re-creates it.
 */
.org-read-progress { display: none !important; }

/*
 * THE ZOOM CURSOR IS THE SITE'S JOB NOW.
 *
 * It used to arrive as an inline `style="cursor: zoom-in"` written by o2h's
 * lightbox. Standing that lightbox down took the cursor with it, and an image
 * that opens a viewer with no cursor change gives the reader nothing to go on.
 * `use-blog-lightbox` already marks every image it upgrades, so the mark is
 * what carries the affordance — which also means an image the viewer does NOT
 * claim (a facade's poster, which plays the embed) correctly keeps its own
 * cursor.
 */
.org-root img[data-blog-lightbox="on"] { cursor: zoom-in; }

/*
 * A CHART USES ITS WHOLE COLUMN — and opens in the viewer.
 *
 * `figure` carries the browser's own `margin: 1em 40px`, and the book resets
 * only the block half, so every chart sat 40px in from BOTH edges of the column:
 * 210px inside a 290px column on a phone, labels painted at about 4px. The
 * inline half is reset here. UPSTREAM CANDIDATE: this is a defect in kwo.css,
 * left there on purpose while the engine's v1.2.0 release is in flight; the
 * line goes when kwo resets `margin-inline` on `.org-chart` itself.
 *
 * Even full width, a portrait phone cannot make 720 SVG units legible, so the
 * lightbox directive gives each chart a button that opens it in the site's own
 * zooming viewer (see use-blog-lightbox.js). The button is square, one hairline,
 * no radius, and sits in the figure's top corner where the plot is empty.
 */
.org-root figure.org-chart {
  position: relative;
  margin-inline: 0;
}

.org-root .org-chart-svg { cursor: zoom-in; }

.org-root .blog-chart-zoom {
  position: absolute;
  top: 0;
  right: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.75rem;
  height: 2.75rem;
  padding: 0;
  border: var(--o2h-border);
  background: var(--o2h-bg);
  color: var(--o2h-slate);
  cursor: zoom-in;
  transition: color 0.15s ease, border-color 0.15s ease;

  &:hover,
  &:focus-visible {
    border-color: var(--o2h-accent);
    color: var(--o2h-accent);
  }
}

/*
 * A VERTICAL SWIPE OVER A DIAGRAM SCROLLS THE PAGE — (g). UPSTREAM CANDIDATE.
 *
 * kwo sets `touch-action: none` on the frame o2h.js upgrades, so the runtime
 * can pan the drawing with pointer events — which also meant a thumb that
 * landed on a diagram mid-scroll dragged the drawing and stopped the article
 * dead. `pan-y pinch-zoom` hands the vertical swipe and the pinch back to the
 * page; a sideways drag still reaches the runtime's handlers and pans the
 * drawing. On touch the reader gives up dragging it up or down and the
 * runtime's own two-finger zoom; its zoom buttons and keys do both still.
 * (0,4,0), so it outranks kwo's (0,3,0) whichever sheet loads last.
 */
.org-root .org-diagram .org-diagram-scroll.is-interactive {
  touch-action: pan-y pinch-zoom;
}

/*
 * A CODE BLOCK ON A PHONE — (c) and (d). UPSTREAM CANDIDATE.
 *
 * With the 13px floor on :root, the line still lost 48px to the book's padding
 * and 24px more to the gap after the line numbers; 14px and 12px below `sm`
 * give a 360px phone 34 characters. `sm` itself keeps the book's values, so the
 * band is written as the complement of `min-media-query(sm)` rather than with
 * `max-media-query`, which would include 768px. `pre.` makes the gutter rule
 * (0,3,2), past the base sheet's (0,3,1).
 *
 * The COPY button was 21.5px tall; 24px is WCAG 2.5.8's floor, reached with a
 * min-height so its padding and label stay the book's. And the <pre> is
 * focusable (tabindex="0", so a keyboard can scroll it) while `.org-src-block`
 * clips to its box, which cut the site's outward focus ring off entirely — so
 * on the <pre> it is drawn inside, as `#persistent-data` already does for the
 * same reason.
 */
@media only screen and (max-width: 47.9375em) {
  .org-root .org-src { padding-inline: 14px; }
  .org-root pre.org-src--numbered .line::before { margin-right: 12px; }
}

.org-root .org-src-copy { min-height: 24px; }

.org-root .org-src-block > .org-src:focus-visible { outline-offset: -2px; }

/*
 * CODE ON A PHONE WRAPS, AND A TOGGLE SAYS SO — UPSTREAM CANDIDATE.
 *
 * At 360px a block shows 34 characters of a line, and the kitchen-sink's
 * longest runs 220: six of its eight blocks scrolled sideways, with no bar on a
 * phone to say there was more, and the owner found no way to read them. Below
 * `sm` long lines now wrap by DEFAULT — CSS, not script, so the block arrives
 * at its final height and nothing moves when the page hydrates. A WRAP button
 * beside COPY (article-enhance.js; only on a block whose longest line does not
 * fit) flips it either way on any screen, and the choice is the reader's for
 * the whole article and the next one: `.is-code-wrap` / `.is-code-nowrap` on
 * the body.
 *
 * A wrapped numbered line HANGS: the continuation starts under the code, not
 * under the number, which is what keeps a wrapped block readable as code. That
 * needs each .line to be a block, and in `pre-wrap` the newline between two
 * block lines would print as an empty line — so the <code> becomes a flex
 * column, which drops whitespace-only text between its children. The numbers'
 * own box keeps a zero indent, or it would inherit the hanging one.
 */
@mixin blog-code-wrap {
  white-space: pre-wrap;
  overflow-wrap: anywhere;

  &.org-src--numbered code {
    display: flex;
    flex-direction: column;
  }

  &.org-src--numbered .line {
    padding-left: calc(2.5ch + var(--blog-code-gap));
    text-indent: calc(-2.5ch - var(--blog-code-gap));
  }

  &.org-src--numbered .line::before { text-indent: 0; }
}

.org-root pre.org-src { --blog-code-gap: var(--o2h-space-3); }

@media only screen and (max-width: 47.9375em) {
  .org-root pre.org-src { --blog-code-gap: 12px; }

  .blog-rich:not(.is-code-nowrap) .org-root pre.org-src {
    @include blog-code-wrap;
  }
}

.blog-rich.is-code-wrap .org-root pre.org-src { @include blog-code-wrap; }

/* The COPY button's look, restated: sharing its class would hand this button to
   o2h.js's copy handler. It takes over COPY's `margin-left: auto` while it is
   shown, so the two sit together at the header's right edge. Pressed is ink,
   not accent — on a phone every block starts pressed, and a yellow chip on
   each one would be accent at rest.

   HERE, NOT IN article-enhance.js's CHUNK. Moved there it saved this chunk
   0.10 kB and cost that one 0.31 kB plus a request — every article reader pays
   both — because these rules compress against the book's tokens right here. */
.org-root .blog-code-wrap {
  min-height: 24px;
  margin-left: auto;
  padding: 2px var(--o2h-space-1);
  border: 1px solid var(--o2h-line-soft);
  border-radius: 0;
  background: none;
  color: var(--o2h-mute);
  font: inherit;
  font-size: var(--o2h-chip-size);
  letter-spacing: var(--o2h-chip-track);
  text-transform: uppercase;
  cursor: pointer;
  transition: color 0.15s ease, border-color 0.15s ease;

  &[aria-pressed="true"] {
    border-color: var(--o2h-ink);
    color: var(--o2h-ink);
  }

  &:hover,
  &:focus-visible {
    border-color: var(--o2h-accent);
    color: var(--o2h-accent);
  }
}

.org-root .blog-code-wrap:not([hidden]) + .org-src-copy { margin-left: 0; }

/*
 * AN EQUATION FITS ITS COLUMN — UPSTREAM CANDIDATE.
 *
 * The book sets display math at 1.25em inside a frame that scrolls sideways,
 * so nothing ever leaves the page — but on a phone that scroll has no bar, and
 * the aligned derivation in the kitchen-sink looked cut off: 412px of it in a
 * 330px column in Firefox, 345px in Chromium. Below `sm` it starts a step
 * smaller, which fits most equations before any script runs, and
 * article-enhance.js sets whatever still overflows to exactly its column, down
 * to 65% of the book's size. Past that the frame's own scroll takes over.
 */
@media only screen and (max-width: 47.9375em) {
  .blog-rich .org-root .org-math-display math { font-size: 1.1em; }
}

/*
 * THE TABLE OF CONTENTS — THE LEDGER, PICKED FROM THREE.
 *
 * The owner turned down the hairline-rows version, compared three on a real
 * article the way the section rail was chosen, and kept the ledger. It is two
 * layers: a reset that takes the book's box, stripe and indents off, so the
 * design starts from nothing rather than fighting the book, then the ledger.
 *
 * THE ORDER IS LOAD-BEARING. Four ledger rules — the nav, the label, the list
 * and the link — carry exactly the reset's specificity and win only because
 * they come later in this block, so the reset stays above them. Both layers
 * still outrank every `.org-toc` rule in the book — its strongest, the link's
 * hover, focus and current state, are (0,3,0) — so which sheet loads last
 * never decides it.
 *
 * The site's law holds: square, hairlines, no radius, mono for furniture and
 * the editorial face for the words, and accent on state — plus the one mark
 * the landing's section headers also carry.
 */
.org-root nav.org-toc {
  --blog-toc-lift: color-mix(in srgb, var(--clr-neutral-100) 3%, transparent);

  margin: 0;
  padding: 0;
  border: 0;
  background: none;

  ul {
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .org-toc-title {
    margin: 0;
    color: var(--o2h-mute);
    font-family: var(--o2h-font-mono);
    font-size: var(--o2h-label-size);
    font-weight: 400;
    letter-spacing: 0.14em;
    text-transform: uppercase;
  }

  .org-toc-link {
    display: block;
    margin: 0;
    padding: 0;
    border: 0;
    color: var(--o2h-ink);
    font-family: var(--o2h-font-editorial);
    font-size: var(--o2h-fs-body);
    font-weight: 400;
    line-height: 1.35;
    text-decoration: none;
    /* An entry is its heading's words, and a heading may hold one word longer
       than a phone: the heading breaks it (kwo), so the entry must too, or it
       runs off the screen — 173px at 320px on the kitchen-sink article. */
    overflow-wrap: anywhere;
    transition: background-color 0.15s ease, box-shadow 0.15s ease, color 0.15s ease;
  }

  ul ul .org-toc-link {
    color: var(--o2h-slate);
    font-size: var(--fs-300);
  }
}

/*
 * THE LEDGER. The contents as a numbered index, in the voice of the landing's
 * section headers: a `// CONTENTS` label in the index accent, the count of
 * sections set against it on the right, and every entry hung off a mono number
 * column so the titles form one clean edge. Subsections take their parent's
 * number (03.1, 03.2) at a step down in size and tone. Open — no box — with a
 * hairline above and below, like a ruled page.
 */
.org-root nav.org-toc {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: baseline;
  column-gap: 1rem;
  padding: 1.25rem 0 1.5rem;
  border-block: var(--o2h-border);
  counter-reset: toc;

  .org-toc-title {
    color: var(--o2h-accent);

    &::before { content: "// " / ""; }
  }

  &::after {
    grid-row: 1;
    grid-column: 2;
    color: var(--o2h-mute);
    font-family: var(--o2h-font-mono);
    font-size: var(--o2h-label-size);
    letter-spacing: 0.14em;
    content: attr(data-count);
  }

  > ul {
    grid-column: 1 / -1;
    margin-top: 1rem;
  }

  > ul > li {
    counter-increment: toc;
    counter-reset: toc-sub;
  }

  .org-toc-link {
    display: grid;
    grid-template-columns: 2.5rem minmax(0, 1fr);
    align-items: baseline;
    padding: 0.45rem 0;

    &::before {
      color: var(--o2h-mute);
      font-family: var(--o2h-font-mono);
      font-size: var(--o2h-label-size);
      letter-spacing: 0.08em;
      transition: color 0.15s ease;
      content: counter(toc, decimal-leading-zero);
    }

    &:hover,
    &:focus-visible {
      background-color: var(--blog-toc-lift);
      box-shadow:
        -0.75rem 0 0 var(--blog-toc-lift),
        0.75rem 0 0 var(--blog-toc-lift);
      color: var(--o2h-accent);

      &::before { color: var(--o2h-accent); }
    }
  }

  ul ul {
    margin: -0.1rem 0 0.35rem 2.5rem;

    > li { counter-increment: toc-sub; }
  }

  ul ul .org-toc-link {
    grid-template-columns: 3.25rem minmax(0, 1fr);
    padding: 0.25rem 0;

    &::before { content: counter(toc, decimal-leading-zero) "." counter(toc-sub); }
  }
}

/*
 * A FOOTNOTE IS ONE TARGET: THE WHOLE NOTE GOES BACK. UPSTREAM CANDIDATE.
 *
 * The back-link was the bare `↩`, 8×20px, then a 27px hairline square the owner
 * turned down: a box beside every note said "button" louder than the note said
 * anything. The arrow is a MARK now — muted, unboxed, in the note's own left
 * column — and the target is the whole note: the link's ::after is stretched
 * over the <li> (the nearest positioned box, since the link itself stays in the
 * flow), so a tap on the words goes back as well as a tap on the arrow.
 *
 * The arrow hangs in the note's padding with a negative margin, the way hanging
 * punctuation does: the padding is the note's inset and the words keep that
 * edge. The link's own box stays a 24px square, so it is a WCAG 2.5.8 target
 * even before the stretch (constructs.spec.js (c) measures it).
 *
 * A LINK INSIDE THE NOTE STILL WORKS: it is lifted above the stretched target,
 * so the parser's GitHub URL in note 1 opens GitHub, not the reference. What
 * the stretch costs is selecting a note's text with a mouse drag — a fair trade
 * for a list whose one job is the way back.
 *
 * The pointer gets the site's answer for every list of links, the 3% lift,
 * with the fill hanging past the column the way the ledger's does. `(0,3,0)`,
 * so the book's `.org-root .org-footnote-back` margin loses whichever sheet
 * loads last.
 *
 * THE NUMBER IS PART OF THE WAY BACK. The owner hovered a note and the fill
 * began at the arrow while "1." sat outside it: the number is the list's
 * native ::marker, painted in the <ol>'s 40px gutter, outside the <li> the
 * stretched target covered. Measured in Chromium and Firefox at 390 and 1280:
 * every point across the gutter hit the <ol>. So the gutter becomes a named
 * width, the target reaches back across it, and the marker takes the accent
 * while its note is hovered or focused. The native marker stays (Safari drops
 * list semantics under list-style: none), and the 24px link box does not move.
 */
.org-root .org-footnotes > ol {
  --blog-note-gutter: 40px;

  padding-inline-start: var(--blog-note-gutter);
}

.org-root .org-footnote:has(> .org-footnote-back:is(:hover, :focus-visible))::marker {
  color: var(--o2h-accent);
}

.org-root .org-footnote {
  --blog-note-lift: color-mix(in srgb, var(--clr-neutral-100) 3%, transparent);

  position: relative;
  padding-left: 2rem;
}

.org-root .org-footnote > .org-footnote-back {
  display: inline-block;
  width: 2rem;
  min-height: 2rem;
  margin: 0 0 0 -2rem;
  color: var(--o2h-mute);
  font-variant-emoji: text;
  text-decoration: none;
  vertical-align: top;
  transition: color 0.15s ease;

  &::after {
    position: absolute;
    inset: 0 0 0 calc(var(--blog-note-gutter, 0px) * -1);
    transition: background-color 0.15s ease, box-shadow 0.15s ease;
    content: "";
  }

  &:hover,
  &:focus-visible {
    outline: none;
    color: var(--o2h-accent);
  }

  &:hover::after,
  &:focus-visible::after {
    background-color: var(--blog-note-lift);
    box-shadow:
      -0.75rem 0 0 var(--blog-note-lift),
      0.75rem 0 0 var(--blog-note-lift);
  }

  &:focus-visible::after { outline: 2px solid var(--o2h-accent); }
}

.org-root .org-footnote a:not(.org-footnote-back) {
  position: relative;
  z-index: 1;
}

/*
 * A CAROUSEL DOT IS A 24PX TARGET WITH THE SAME 7PX DOT IN IT — (c).
 * UPSTREAM CANDIDATE.
 *
 * o2h.js builds one <button> per slide and kwo paints the button itself as a
 * 0.6rem square: 7.2px here, a third of WCAG 2.5.8's floor. The button is 24px
 * now, and the square the reader sees is drawn inside it: a transparent
 * 0.7rem border rings a 0.6rem padding box, the fill is clipped to that box,
 * and the hairline is a 1px inset shadow on its edge. Same size, same
 * hairline, and kwo's own state fills still mark the current and the hovered
 * slide — this rule is (0,4,0), so their `background` shorthand cannot widen
 * the clip back to the whole button. The targets carry the spacing, so the
 * rail's gap and top margin go: the dots sit 24px apart instead of 15px, and
 * the row's centre stays where it was under the strip.
 */
.org-root .org-carousel .org-carousel-rail {
  gap: 0;
  margin-top: 0;
}

.org-root .org-carousel .org-carousel-rail .org-carousel-dot {
  width: 24px;
  height: 24px;
  border: 0.7rem solid transparent;
  background-clip: padding-box;
  box-shadow: inset 0 0 0 1px var(--o2h-accent);
}
</style>

<style lang="scss" scoped>
/* The masthead carried no styling of its own — it was a bare <h1> inheriting
   the mono body face, and it read as a caption rather than a title. It is the
   display face at the archive's own scale now, one step down from the archive
   masthead because an article sits under it.

   ONE TOKEN AT EVERY WIDTH. It used to drop a further step below `md`, to
   `--fs-600` (24px), while the article's section headings are `--fs-700` — so
   on a phone every section outranked the page. The token's own tiers already
   shrink it (54 → 36 → 28.5px); a second, hand-made step on top broke the
   hierarchy the tiers were built to keep. */
.doc__title {
  margin: 0 0 0.75rem;
  font-family: 'Geomanist', sans-serif;
  font-size: var(--fs-700);
  line-height: 1.1;
  letter-spacing: -0.03rem;
  color: var(--clr-neutral-100);
}

.blog-post__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: baseline;
  margin: 0;
  color: var(--clr-neutral-200);
  font-family: 'SpaceMono', monospace;
  font-size: var(--fs-200);
  letter-spacing: -0.02rem;
}

.blog-post__dot::before {
  content: attr(data-text);
  color: var(--clr-neutral-300);
}

/* "By" is furniture and stays muted; the name is content and takes the ink.
   Accent only on the link's hover, as everywhere. */
.blog-post__author-name {
  color: var(--clr-neutral-100);
  text-decoration: none;
  transition: color 0.2s ease;

  &:hover,
  &:focus-visible { color: var(--clr-primary-100); }
}

/*
 * THE TAGS, AS SQUARE CHIPS. The meta row's mono at its size, one hairline,
 * no radius — and NO ACCENT AT REST: the yellow is state, so only hover and
 * focus take it, and the border follows the ink through currentColor. The row
 * wraps and never scrolls, and the first chip starts on the headline's edge.
 *
 * A CHIP IS ONE LINE. It used to carry `overflow-wrap: anywhere` so a long tag
 * could never push a phone sideways — but that lets the word break after ANY
 * letter, and Firefox took the offer inside an inline-flex box that had room
 * to spare: `ci` stacked as c/i and `build` as buil/d, every chip two lines
 * tall, at every width. The word now never wraps; a tag longer than the row
 * ellipsizes inside its chip instead, which is the only way one could still
 * outrun a 320px screen.
 *
 * The `#` is drawn, not written: its alt text is empty, so a screen reader
 * hears the tag and the chip's text is the bare word the search matches. It
 * is set a step dimmer than the word — the mark says "tag", the word is the
 * content — and joins the word's colour on hover. 27px tall, 33px under a
 * coarse pointer.
 */
.blog-post__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin: 0.75rem 0 0;
  padding: 0;
  font-family: 'SpaceMono', monospace;
  font-size: var(--fs-200);
  list-style: none;

  li {
    display: flex;
    min-width: 0;
    max-width: 100%;
  }
}

.blog-post__tag {
  display: inline-flex;
  align-items: center;
  min-width: 0;
  max-width: 100%;
  min-height: 2.25rem;
  padding: 0 0.75rem;
  border: 1px solid var(--clr-border-100);
  color: var(--clr-neutral-200);
  line-height: 1;
  white-space: nowrap;
  text-decoration: none;
  transition: color 0.15s ease, border-color 0.15s ease;

  &::before {
    color: var(--clr-neutral-300);
    transition: color 0.15s ease;
    content: "#" / "";
  }

  &:hover,
  &:focus-visible {
    border-color: currentColor;
    color: var(--clr-primary-100);

    &::before { color: currentColor; }
  }

  @media (pointer: coarse) { min-height: 2.75rem; }
}

.blog-post__tag-word {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
