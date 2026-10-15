<script setup>
/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 */

/*
 * Breadcrumb trail for the secondary document pages (resume, privacy).
 *
 * WHY IT EXISTS: both resume pages already emitted a BreadcrumbList in their
 * JSON-LD, commented "mirrors the visible breadcrumb the page renders" — while
 * the page rendered a single "Back to site" link and no trail at all. Markup
 * that claims UI the page does not show is the same class of defect as the
 * fabricated ratings. This renders the trail the structured data describes.
 *
 * CONTRACT: `items` is ordered root -> current. Every item except the LAST
 * carries an href; the last is the current page and renders as plain text with
 * aria-current, per the same pattern the BreadcrumbList follows (its final
 * ListItem carries no `item`).
 *
 * The links carry no warm-on-hover handler: the site-wide link warmer
 * (main.js, use-link-warmer.js) warms every route link, these included.
 */

defineProps({
  items: {
    type: Array,
    required: true,
    /* Ordered root -> current; only the last item may omit href. */
    validator: (v) => Array.isArray(v)
      && v.length > 1
      && v.every((i) => typeof i.label === 'string' && i.label !== '')
      && v.slice(0, -1).every((i) => typeof i.href === 'string' && i.href !== ''),
  },
  label: { type: String, required: true },
});
</script>

<template>
  <nav class="ui-crumbs" :aria-label="label">
    <ol class="ui-crumbs__list">
      <li v-for="(item, i) in items" :key="item.label" class="ui-crumbs__item">
        <span v-if="i" class="ui-crumbs__sep" aria-hidden="true">/</span>
        <a
          v-if="item.href"
          :href="item.href"
          class="ui-crumbs__link"
        >{{ item.label }}</a>
        <span v-else class="ui-crumbs__current" aria-current="page">{{ item.label }}</span>
      </li>
    </ol>
  </nav>
</template>

<style lang="scss" scoped>
/* Chrome, not document: monospace and neutral like the nav links, so the trail
   reads as site furniture above the page's own typography. Sentence case, so
   no tracking — the 0.06em that suits the uppercase nav labels reads as
   spaced-out here. */
/*
 * ONE LINE, ALWAYS — the last step gives way, not the trail.
 *
 * It wrapped. Each separator lives inside the item it precedes, so when a long
 * article title no longer fit, the whole item dropped to a second row and that
 * row OPENED with a bare "/" — on a phone the trail read "Blog" and then, under
 * it, "/ Matemáticas en Tiempo de Compilación", which looks like a rendering
 * fault. Now nothing wraps: the ancestors keep their width, and only the
 * current page shrinks, ending in an ellipsis. Nothing is lost — that same
 * title is the page's <h1> immediately below, and the text is still whole in
 * the accessibility tree; only its painting is clipped.
 */
.ui-crumbs {
  &__list {
    display: flex;
    flex-wrap: nowrap;
    align-items: baseline;
    min-width: 0;
    list-style: none;
    margin: 0;
    padding: 0;
    font-family: "SpaceMono", monospace;
    font-size: var(--fs-200);
    letter-spacing: normal;
    line-height: 1.7;
  }

  &__item {
    display: inline-flex;
    flex: 0 0 auto;
    align-items: baseline;
    white-space: nowrap;

    &:last-child {
      flex: 0 1 auto;
      min-width: 0;
    }
  }

  &__sep {
    margin: 0 0.55rem;
    color: var(--clr-neutral-50);
  }

  &__link {
    color: var(--clr-neutral-50);
    text-decoration: none;
    transition: color 0.2s ease;

    &:hover,
    &:focus-visible { color: var(--clr-primary-100); }
  }

  /* The current page is the only step that is not a link, so it carries the
     brighter neutral to mark where the trail ends. */
  &__current {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    color: var(--clr-neutral-100);
  }
}
</style>
