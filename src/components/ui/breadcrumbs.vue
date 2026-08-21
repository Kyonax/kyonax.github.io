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
 */

import { warmRoute } from '@composables/use-warm-route';

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

/* Same prediction-prefetch the resume's back link used: these are separate
   prerendered documents, so the byte the visitor waits on is the HTML. */
const warm = (href) => warmRoute(href);
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
          @pointerenter="warm(item.href)"
          @focus="warm(item.href)"
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
.ui-crumbs {
  &__list {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
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
    align-items: baseline;
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
  &__current { color: var(--clr-neutral-100); }
}
</style>
