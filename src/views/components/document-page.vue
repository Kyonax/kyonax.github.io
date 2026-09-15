<script setup>
/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 */

/*
 * The shared shell for every secondary DOCUMENT page (/resume, /privacy).
 *
 * WHY IT EXISTS: the resume page had invented a complete page vocabulary —
 * sheet, breadcrumb, section rules, prose rhythm, sign-off, delegated
 * tooltips — inside its own scoped block, so the privacy pages could only
 * copy it by hand. Two hand-copies of a design system drift; that is the
 * defect class the SEO audit spent a sitting cleaning up. One shell, two
 * consumers, and the second page costs almost nothing.
 *
 * IT ALSO PAYS FOR ITSELF IN BYTES. resume.vue was a STATIC import in App.vue,
 * so its 463 B (gzip) of scoped CSS shipped inside the main bundle and loaded
 * on the landing page, which never renders a word of it — against ~40 B of
 * remaining budget. Both document views are async now, so this whole shell
 * lives in a chunk that only a document page pays for.
 *
 * WHAT BELONGS HERE: anything any document page needs — the shell, the
 * breadcrumb, generic block/prose/list typography. What does NOT belong here
 * is page-specific furniture: the CV's contact row, entry heads and tech lines
 * stay in resume.vue, where they are the only consumer.
 *
 * COLOUR LAW (inherited from the resume page): grayscale only. A document
 * reads as a document, so it opts out of the yellow accent, HUD decorations
 * and flare. Typography still comes from the site tokens.
 */

import UiBreadcrumbs from '@ui/breadcrumbs.vue';
import CursorTooltip from '@ui/cursor-tooltip.vue';
import { onBeforeUnmount, onMounted, ref } from 'vue';

defineProps({
  /* Anchor id for the <main> landmark. */
  id: { type: String, required: true },
  /* Ordered root -> current; see ui/breadcrumbs.vue for the contract.
     OPTIONAL: the blog archive is the top of its own section, so a trail
     there would say only "you are here", and it renders none. */
  crumbs: { type: Array, default: () => [] },
  /* Localised aria-label for the breadcrumb <nav>. */
  crumbsLabel: { type: String, default: '' },
  /*
   * `sheet` — the 58rem printed-CV sheet. The resume's line length is SIGNED
   *   AS IS (89 chars at 696px, owner ruling 2026-08-19): the measure token
   *   governs landing surfaces, not the CV. Do not "fix" it.
   * `prose` — the container comes down to meet the measure instead of capping
   *   text inside a shell sized for something else. `max-width` and
   *   `font-size` are declared on the SAME element so `ch` resolves against
   *   the size the text actually renders at, and the cap therefore steps with
   *   the type scale for free.
   * `index` — a BOARD, not a document. The blog archive is a list of entries,
   *   and inside the 58rem sheet it read as a page of writing instead. This is
   *   the same 1280px band `.kyo-section` gives every landing section and
   *   `hud-nav__bar` gives the nav, so the archive lines up with the chrome
   *   above it rather than floating narrower than the site it belongs to.
   */
  width: {
    type: String,
    default: 'prose',
    validator: (v) => ['sheet', 'prose', 'article', 'index'].includes(v),
  },
  /* Header + sign-off alignment. The CV centres its masthead like the printed
     document; a policy page is not a CV and reads flush left throughout. */
  align: {
    type: String,
    default: 'left',
    validator: (v) => ['center', 'left'].includes(v),
  },
  signoff: { type: String, default: '' },
});

/*
 * One delegated cursor tooltip for the whole sheet rather than a
 * useCursorTooltip()+Teleport pair per link — the resume alone has 11 of them
 * (5 contacts, 6 companies), and a pair each would be 11 listeners and 11
 * teleported nodes for identical behaviour. Any element carrying `data-tip`
 * opts in. Styling is the shared global `.kyo-cursor-tooltip`, so it looks
 * exactly like the landing's tooltips.
 */
const tip_text = ref('');
const tip_x = ref(0);
const tip_y = ref(0);
const sheet_ref = ref(null);

const _tipTarget = (e) => e.target?.closest?.('[data-tip]');

const onTipOver = (e) => {
  const el = _tipTarget(e);
  if (!el) {
    return;
  }
  tip_text.value = el.getAttribute('data-tip') || '';
  tip_x.value = e.clientX;
  tip_y.value = e.clientY;
};

const onTipMove = (e) => {
  if (!tip_text.value) {
    return;
  }
  if (!_tipTarget(e)) {
    tip_text.value = '';
    return;
  }
  tip_x.value = e.clientX;
  tip_y.value = e.clientY;
};

const onTipOut = (e) => {
  /* Only clear when the pointer actually leaves the tipped element, not when it
     crosses between that element's own children. */
  const from = _tipTarget(e);
  if (from && !from.contains(e.relatedTarget)) {
    tip_text.value = '';
  }
};

onMounted(() => {
  const el = sheet_ref.value;
  if (!el) {
    return;
  }
  el.addEventListener('mouseover', onTipOver);
  el.addEventListener('mousemove', onTipMove);
  el.addEventListener('mouseout', onTipOut);
});

onBeforeUnmount(() => {
  const el = sheet_ref.value;
  if (!el) {
    return;
  }
  el.removeEventListener('mouseover', onTipOver);
  el.removeEventListener('mousemove', onTipMove);
  el.removeEventListener('mouseout', onTipOut);
});
</script>

<template>
  <main :id="id" class="doc" :class="`doc--${width}`">
    <article ref="sheet_ref" class="doc__sheet" :class="`doc__sheet--${width}`">
      <UiBreadcrumbs
        v-if="crumbs.length"
        :items="crumbs"
        :label="crumbsLabel"
        class="doc__crumbs"
      />

      <header class="doc__head" :class="`doc__head--${align}`">
        <slot name="header" />
      </header>

      <div class="doc__body">
        <slot />
      </div>

      <p v-if="signoff" class="doc__signoff" :class="`doc__signoff--${align}`">
        {{ signoff }}
      </p>
    </article>

    <CursorTooltip :visible="tip_text !== ''" :x="tip_x" :y="tip_y">
      {{ tip_text }}
    </CursorTooltip>
  </main>
</template>

<style lang="scss" scoped>
.doc {
  /*
   * THE PAGE GUTTER, AND IT STEPS.
   *
   * This used to be one flat 1.25rem (15px on a 12px root) at every width from
   * a 320px phone to a 1440px laptop, which is generous on the phone and
   * cramped on the laptop. It steps now: 15px below `sm`, 24px from `sm`, 30px
   * from `md`. Nothing else on the article surface contributes a gutter —
   * `.doc__sheet--article` sets a measure, not padding — so whatever this
   * declares is the entire distance between the words and the edge of the
   * screen, and an e2e test asserts it (tests/e2e/layout.spec.js).
   */
  padding: 3.5rem 1.25rem 4rem;

  @include min-media-query(sm) { padding-inline: 2rem; }

  @include min-media-query(md) { padding-inline: 2.5rem; }

  &__sheet {
    margin: 0 auto;

    /* The printed-CV sheet. Signed as is — see the `width` prop note. */
    &--sheet { max-width: 58rem; }

    /*
     * A measure is a property of the CONTAINER, not a decoration applied
     * inside it (docs/styling.md §7.4 rules 3-4). Capping prose inside a
     * wider shell relocates the problem into a void down one side; here the
     * shell itself is the measure.
     *
     * `font-size` and `max-width` are declared TOGETHER on purpose: `ch`
     * resolves against this element's own computed size, so the pair is what
     * makes the cap correct — and because --fs-300 steps with the type scale
     * (1.15rem -> 1.125rem -> 1.25rem), the shell steps with it automatically
     * instead of satisfying one tier and stranding the others.
     */
    &--prose {
      font-size: var(--fs-300);
      max-width: var(--kyo-measure);
    }

    /*
     * THE ARTICLE MEASURE — `prose`, but coupled to the face it is actually
     * measuring.
     *
     * `--prose` above declares `font-size` and `max-width` together so that
     * `ch` resolves against this element's own type, which is exactly right.
     * It just resolves against the WRONG type here: this shell inherits
     * SpaceMono from `body`, while an article's prose renders in Geomanist
     * inside `.org-root`. SpaceMono's "0" is 9.18px at 15px against
     * Geomanist's 8.30px, so a cap written as 68 characters was delivering
     * 85 — the line was a fifth longer than the number said, which is why the
     * column read as cramped despite being "correct".
     *
     * So the shell declares the reading face as well, and the cap becomes
     * honest at every tier: 69ch is 688px at the large tier's 18px and 573px
     * at the 15px tiers, ~79 prose characters either way. That also removes an
     * inversion the fixed token had, where the tablet tier (562px) came out
     * NARROWER than mobile (574px).
     *
     * Declaring the face is free: `.doc__title`, `.doc__meta` and the crumbs
     * all set their own font-family, so nothing inherits this but the `ch`
     * calculation it exists for.
     */
    &--article {
      font-family: "Geomanist", sans-serif;
      font-size: var(--fs-400);
      max-width: 69ch;
    }

    /* The board. `position: relative` is what anchors the HUD deco the archive
       places in its corners — the same requirement every landing section has. */
    &--index {
      position: relative;
      max-width: 1280px;
      /* Clips the HUD chrome to the board, the same way `.kyo-section` clips
         every landing section's watermark. Without it an oversized watermark
         widens the page and the whole document scrolls sideways. */
      overflow: hidden;
    }
  }

  /* The board carries the landing's own gutter at md+, so its edges sit on the
     same vertical lines as the nav bar and every landing section. The document
     widths keep the tighter reading gutter they were tuned with. */
  /*
   * THE BOARD KEEPS A WIDER GUTTER THAN THE READING SURFACES.
   *
   * Its rows carry their own padding on top of this, which is what actually
   * insets the row text — they used to cancel it with an equal and opposite
   * negative margin, so the text landed exactly on the sheet edge and this
   * padding was the ONLY thing between the words and the screen. That margin
   * is gone (see blog.vue), so this is a page gutter again rather than the
   * last line of defence, and it can stay a step ahead of the base.
   */
  &--index {
    padding-inline: 2rem;

    @include min-media-query(md) { padding-inline: 3rem; }
  }

  /*
   * THE ARTICLE'S PAGE BOX IS A CONTAINER, AND NOTHING IN IT MAY PUSH THE PAGE.
   *
   * `container-type` makes this box the one the breakouts in `.blog-rich` below
   * measure with `cqw`: its content box is the width between the page gutters —
   * the column itself on a phone, and the room a breakout may take wherever the
   * page is wider than the column. The page box and not the sheet, on purpose:
   * measured against the sheet, `.org-wide` could never leave the column at any
   * width, and breaking out of it is what the class is for.
   *
   * `overflow-x: clip` is the backstop: anything that still reaches past the
   * screen edge is cut there rather than scrolling the page sideways. `clip`,
   * not `hidden`, so no scroll container is made; and on this box rather than
   * the sheet, so a focus ring or the contents' hover lift at the column's edge
   * still paints into the gutter instead of being sliced off with it.
   */
  &--article {
    container-type: inline-size;
    overflow-x: clip;
  }

  /*
   * THE BLOG READS IN THREE TIERS, NOT TWO.
   *
   * The site's scale has a medium tier, but it starts at `md` — so from 768 to
   * 1023px, every tablet and every narrow laptop window, the archive and the
   * articles read at a phone's sizes, and then jumped straight to the desktop
   * ones. The owner saw "just two versions". These two widths are the blog's
   * (`index` is the archive, `article` a post; nothing else uses either), and
   * they take the medium tier's display steps from `sm` instead: a phone keeps
   * its sizes, a desktop keeps its sizes, and the middle gets its own.
   *
   * Only the display steps move (see the mixin) — body text and captions stay
   * on the tier the rest of the page is on. The article's engine headings read
   * the same values through `--host-fs-*` in blog-post.vue, and type.spec.js
   * asserts a tablet lands strictly between the other two.
   */
  &--index,
  &--article {
    @include between-media-query(sm, md) { @include fs-display-tier(medium); }
  }

  /* Chrome above the document, always flush left against the sheet edge even
     when the head below is centred, so it reads as furniture rather than as
     part of the document. */
  &__crumbs {
    display: block;
    margin-bottom: 2.25rem;
  }

  &__head {
    margin-bottom: 2.5rem;

    &--center { text-align: center; }
    &--left   { text-align: left; }
  }

  /* ── shared document typography ───────────────────────────────
     Reaches slot content, which carries the CONSUMER's scope id, not this
     component's — `:deep()` is what crosses that boundary. Consumers opt in
     by class, so a page can always render something outside the vocabulary. */
  &__body {
    :deep(.doc-block) {
      margin-bottom: 3rem;

      &:last-child { margin-bottom: 0; }
    }

    /* Phones step the section rule down one token. At 375px the body is
       13.8px, so fs-600 reads as top-heavy against it. Full size from `sm`. */
    :deep(.doc-block__title) {
      font-family: "Geomanist", sans-serif;
      font-size: var(--fs-500);
      letter-spacing: 0.02em;
      color: var(--clr-neutral-100);
      border-bottom: 1px solid var(--clr-border-100);
      padding-bottom: 0.5rem;
      margin: 0 0 1.75rem;

      @include min-media-query(sm) { font-size: var(--fs-600); }
    }

    /* Monospace sub-label inside a block (the CV's "Activities" / "Key
       impact" rows). Not a section rule — no border, no step. */
    :deep(.doc-sub) {
      font-family: "SpaceMono", monospace;
      font-size: var(--fs-300);
      letter-spacing: 0.06em;
      color: var(--clr-neutral-100);
      margin: 0 0 0.6rem;
    }

    :deep(.doc-prose) { margin: 0 0 1.4rem; }

    :deep(.doc-list) {
      margin: 0 0 1.4rem;
      padding-left: 1.15rem;

      li {
        line-height: 1.6;
        margin-bottom: 0.55rem;
      }
    }

    /* Rich text whose tags arrive from an i18n string rather than the
       template, so they cannot carry classes. Styling the bare elements is
       what keeps the COPY free of CSS hooks — a policy paragraph should not
       have to know the name of a stylesheet class to be laid out. Same rhythm
       as .doc-prose / .doc-list above, by element instead of by class. */
    :deep(.doc-rich) {
      p {
        margin: 0 0 1.4rem;
      }

      ul {
        margin: 0 0 1.4rem;
        padding-left: 1.15rem;
      }

      li {
        line-height: 1.6;
        margin-bottom: 0.55rem;
      }

      /* No trailing gap at the end of a block — the block owns that spacing. */
      > :last-child { margin-bottom: 0; }
    }
  }

  /* Replaces the site footer on document pages — these routes render no
     landing chrome below the sheet. */
  &__signoff {
    font-family: "SpaceMono", monospace;
    font-size: var(--fs-200);
    color: var(--clr-neutral-50);
    border-top: 1px solid var(--clr-border-100);
    padding-top: 1.75rem;
    margin: 3rem 0 0;

    &--center { text-align: center; }
    &--left   { text-align: left; }
  }
}

/*
 * .blog-rich — the article surface, and it is DELIBERATELY ALMOST EMPTY NOW.
 *
 * IT USED TO BE A HAND-ROLLED COPY OF A STYLESHEET THAT ALREADY EXISTS. This
 * block re-declared headings, lists, quotes, code wells, figures, tables,
 * footnotes and drawers for the markup org2html emits — a second, drifting
 * answer to a question the engine had already answered. The result looked
 * nothing like the engine's own output, which is the defect the owner named.
 *
 * THE ENGINE SHIPS ITS DEFAULT STYLE BOOK (`kwo`) as `styles.css` beside every
 * build. sync-blog.mjs minifies it to `public/blog/style-book.css` (95 KB ->
 * 16 KB gzipped) and blog-post.vue links it on article routes only. 837 of its
 * rules are scoped under `.org-root`, which the post body carries, so it
 * cannot leak into the rest of the site — and the book reads every value
 * through `var(--host-*, <default>)`, so the site's palette and faces are
 * mapped onto those tokens in blog-post.vue rather than fought with overrides.
 *
 * WHAT IS LEFT HERE is the one thing the book cannot know: that this SITE
 * already rendered the masthead.
 */
:deep(.blog-rich) {
  /*
   * THE ENGINE'S OWN ARTICLE HEADER IS SUPPRESSED, and this is the right layer
   * to do it in.
   *
   * org2html emits `<header class="org-article-header">` carrying the title,
   * the date and the taxonomy, because a standalone HTML document it converts
   * has nothing else to carry them. Rendered inside this shell it is a SECOND
   * masthead: the article showed its title twice and its date twice, once
   * formatted and once ISO.
   *
   * Site chrome is WEBSITE scope [D-22]. The view's header slot already
   * renders the title as the page's only <h1>, the date, and the reading time
   * the engine does not publish here; the category is in the breadcrumb.
   */
  .org-article-header { display: none; }

  /* Wide content scrolls inside its own box; the page never scrolls sideways.
     Declared here rather than left to the book because it is a property of
     THIS shell's width, not of the article. */
  .org-table-scroll { overflow-x: auto; }

  /*
   * A BREAKOUT MEASURES THE PAGE BOX, NOT THE SCREEN — (b). UPSTREAM CANDIDATE:
   * the engine's own pair (styles.css, BREAKOUTS · LAST WORD) with `vw` turned
   * into `cqw` against `.doc--article` above.
   *
   * In `vw` a breakout nested in a section reached the glass on a phone:
   * `.org-wide` sat 0px from both screen edges from 320 to 430px, with no
   * gutter at all, and `100vw` counts a classic scrollbar, so a full-bleed was
   * a scrollbar wider than the page. Against the page box `.org-wide` stays in
   * the column on a phone with the page gutter intact, keeps its breakout on a
   * wide screen, and a full-bleed stops at the gutter instead of the glass.
   * The doubled class is the engine's own device: (0,4,0) here outranks every
   * construct rule in the book, whichever sheet loads last.
   */
  .org-full-bleed.org-full-bleed {
    width: 100cqw;
    margin-inline: calc(50% - 50cqw);
  }

  .org-wide.org-wide {
    width: min(100cqw - 2 * var(--o2h-gutter), var(--o2h-measure-wide));
    margin-inline:
      calc(50% - min(50cqw - var(--o2h-gutter), var(--o2h-measure-wide) / 2));
  }
}
</style>
