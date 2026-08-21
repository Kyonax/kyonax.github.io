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
  /* Ordered root -> current; see ui/breadcrumbs.vue for the contract. */
  crumbs: { type: Array, required: true },
  /* Localised aria-label for the breadcrumb <nav>. */
  crumbsLabel: { type: String, required: true },
  /*
   * `sheet` — the 58rem printed-CV sheet. The resume's line length is SIGNED
   *   AS IS (89 chars at 696px, owner ruling 2026-08-19): the measure token
   *   governs landing surfaces, not the CV. Do not "fix" it.
   * `prose` — the container comes down to meet the measure instead of capping
   *   text inside a shell sized for something else. `max-width` and
   *   `font-size` are declared on the SAME element so `ch` resolves against
   *   the size the text actually renders at, and the cap therefore steps with
   *   the type scale for free.
   */
  width: {
    type: String,
    default: 'prose',
    validator: (v) => ['sheet', 'prose'].includes(v),
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
  <main :id="id" class="doc">
    <article ref="sheet_ref" class="doc__sheet" :class="`doc__sheet--${width}`">
      <UiBreadcrumbs :items="crumbs" :label="crumbsLabel" class="doc__crumbs" />

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
  padding: 3.5rem 1.25rem 4rem;

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
</style>
