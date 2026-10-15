<script setup>
/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 */

/*
 * The archive's search. It filters ALL POSTS ITSELF, and the URL carries it.
 *
 * NO FETCH AND NO RESULTS PANEL. It used to fetch its own index from
 * /blog-search/ and draw a second list of links under the field, so a result
 * and an archive entry were two different objects on one page. Now `posts` is
 * every post of the locale, newest first — use-blog.js reads them from the
 * rich index the archive has already loaded, so a search costs no request —
 * and what this emits is the rows All Posts should show: `null` when nothing
 * is searched (blog.vue falls back to the page's own posts), an array
 * otherwise, spanning every archive page of the locale.
 *
 * PRERENDERED, so nothing moves when it hydrates. The server renders with an
 * EMPTY query string, which is why everything that reads the URL waits for
 * onMounted: read in setup, the first client render would differ from the
 * prerendered HTML.
 *
 * THE URL IS THE STATE. ?search=<term> is written back with replaceState —
 * never push: a search refines this page, it is not a new one, so Back leaves
 * the archive instead of replaying every word typed. vue-router's state object
 * goes back untouched, and so do the hash and every other parameter: Umami
 * ignores a query-only change (data-exclude-search) but counts a hash change
 * as a pageview. An article's tag chips used to link ?q=<tag>; that alias is
 * still read, and rewritten to ?search= on arrival.
 *
 * ONE DEBOUNCE FOR THE LIST, THE STATUS LINE AND THE URL (250 ms). A screen
 * reader hears one count when the typing stops, not one per key, and the list
 * never disagrees with the line that counts it. Enter, Esc, the clear button,
 * leaving the field and leaving the page all settle it at once.
 *
 * THE SHAPE is a framed field with a plain ASCII `/` prefix — a Nerd Font
 * glyph would depend on the icon subset reaching the browser, and a cached
 * older copy renders tofu — and a status line that IS the gap between the
 * field and the list, so a count appearing pushes nothing down.
 */

import { onBeforeUnmount, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';

const props = defineProps({
  posts: { type: Array, required: true },
});

const emit = defineEmits(['results']);

const { t } = useI18n();

const MAX_LENGTH = 100;
const DEBOUNCE_MS = 250;
/* Set on <html> by the head script vite.config.js injects when an archive URL
   carries ?search= or ?q=: it keeps the list, the pager and the footer
   invisible until the list below is filtered, so the unfiltered archive never
   flashes (and an invisible box logs no layout shift). */
const HOLD_CLASS = 'kyo-search-hold';

const query = ref('');
const status = ref('');
const input_ref = ref(null);
let timer = 0;

/* Accent- and case-insensitive: NFD splits "á" into "a" plus a combining mark,
   and the class strips the whole combining block (U+0300–U+036F). */
const fold = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/* `search` wins over the legacy `q`; trimmed, and never longer than the field
   would let anyone type. */
const readQuery = () => {
  const params = new URLSearchParams(location.search);
  return (params.get('search') || params.get('q') || '')
    .trim()
    .slice(0, MAX_LENGTH);
};

/* Title, excerpt and tags, one haystack per post. The newline keeps a term
   from matching across two fields, since a search field cannot hold one. */
const matchPosts = (term) => {
  const needle = fold(term);
  return props.posts.filter((post) => fold(
    [post.title, post.excerpt, ...(post.tags || [])].join('\n'),
  ).includes(needle));
};

const writeQuery = (term) => {
  const url = new URL(location.href);
  url.searchParams.delete('q');
  if (term) {
    url.searchParams.set('search', term);
  } else {
    url.searchParams.delete('search');
  }
  if (url.href !== location.href) {
    history.replaceState(history.state, '', url);
  }
};

const statusFor = (rows, term) => {
  if (!rows) {
    return '';
  }
  if (rows.length === 0) {
    return t('kyo-web.blog.search-empty', { term });
  }
  return rows.length === 1
    ? t('kyo-web.blog.search-count-one', { count: 1, term })
    : t('kyo-web.blog.search-count-other', { count: rows.length, term });
};

const flush = () => {
  clearTimeout(timer);
  timer = 0;
  const term = query.value.trim();
  const rows = term ? matchPosts(term) : null;
  emit('results', rows);
  status.value = statusFor(rows, term);
  writeQuery(term);
};

const schedule = () => {
  clearTimeout(timer);
  timer = setTimeout(flush, DEBOUNCE_MS);
};

/* Blur and pagehide: a reader who clicks a result mid-debounce still leaves
   the term in the URL, so Back returns to the same filtered list. */
const flushPending = () => {
  if (timer) {
    flush();
  }
};

/* The clear button is hidden by visibility, so it leaves the tab order the
   moment the field empties — focus goes back to the field, not to <body>. */
const clear = () => {
  query.value = '';
  flush();
  input_ref.value.focus();
};

onMounted(() => {
  query.value = readQuery();
  if (query.value) {
    flush();
  }
  window.addEventListener('pagehide', flushPending);
  /* Released right after the filtered rows are emitted, and that is already
     late enough: blog.vue re-renders the list in a microtask, and every
     microtask runs before the browser paints again. */
  document.documentElement.classList.remove(HOLD_CLASS);
});

/* Only a client-side route change unmounts this without a page load, and then
   a pending write would land this archive's term on the next route's URL. */
onBeforeUnmount(() => {
  clearTimeout(timer);
  window.removeEventListener('pagehide', flushPending);
});
</script>

<template>
  <!-- A FORM, so role=search is a landmark on every engine the floor names
       and Enter settles the term at once. Before hydration the same Enter
       submits ?search=<term>#all-posts natively, and that load filters. -->
  <form class="blog-search" role="search" @submit.prevent="flush">
    <!-- The placeholder is not an accessible name — it disappears the moment
         anyone types — so the name is an sr-only <label>. -->
    <label class="sr-only" for="blog-search-input">
      {{ t('kyo-web.blog.search-label') }}
    </label>

    <div class="blog-search__field">
      <span class="blog-search__prefix" data-text="/" aria-hidden="true" />
      <input
        id="blog-search-input"
        ref="input_ref"
        v-model="query"
        class="blog-search__input"
        type="search"
        name="search"
        :maxlength="MAX_LENGTH"
        autocomplete="off"
        :placeholder="t('kyo-web.blog.search-placeholder')"
        @input="schedule"
        @blur="flushPending"
        @keydown.esc="clear"
      />
      <!-- VISIBILITY, not v-if and not a class: its box is always there, so
           the field never changes width, and it is inline so it is hidden
           before the deferred stylesheet lands. Hidden is also out of the tab
           order and the accessibility tree. -->
      <button
        class="blog-search__clear"
        type="button"
        :style="{ visibility: query ? 'visible' : 'hidden' }"
        :aria-label="t('kyo-web.blog.search-clear')"
        @click="clear"
      >
        <span data-text="×" aria-hidden="true" />
      </button>
    </div>

    <!-- An interpolation and nothing else, so it compiles to exactly the
         text: no whitespace for the HTML minifier to trim out from under the
         hydration. Empty on the server, so the live region is already in the
         page when its first count arrives. -->
    <p class="blog-search__status" role="status">
      {{ status }}
    </p>
  </form>
</template>

<style lang="scss" scoped>
/* The frame, not the input, carries the border and the focus ring — so the
   prefix, the field and the clear button read as one control instead of
   glyphs parked beside a form element. The padding is the gutter the list's
   rows use, so the field's text and theirs share one edge. */
.blog-search__field {
  display: flex;
  gap: 0.65rem;
  align-items: center;
  padding: 0.7rem 1.25rem;
  border: 1px solid var(--clr-border-100);
  transition: border-color 0.2s ease;

  &:hover { border-color: var(--clr-border-400); }

  /* Focus is a STATE, and state is what the accent is for. */
  &:focus-within {
    border-color: var(--clr-primary-100);
    outline: 1px solid var(--clr-primary-100);
    outline-offset: -2px;
  }
}

.blog-search__prefix {
  color: var(--clr-neutral-300);
  font-family: 'SpaceMono', monospace;
  font-size: var(--fs-200);
  line-height: 1;
}

.blog-search__input {
  flex: 1 1 auto;
  min-width: 0;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  font-family: 'SpaceMono', monospace;
  font-size: var(--fs-200);
  letter-spacing: 0.04em;

  /* The frame owns the focus affordance; a second ring inside it reads as two
     controls. Removing it is only safe BECAUSE :focus-within above is there. */
  &:focus,
  &:focus-visible { outline: none; }

  &::placeholder { color: var(--clr-neutral-300); }

  /* The clear button below is the one way to empty the field; WebKit's own
     would be a second, in a colour the palette never chose. */
  &::-webkit-search-cancel-button { display: none; }
}

/*
 * THE CLEAR BUTTON FILLS THE FRAME'S END. Stretched, and pulled out over the
 * frame's block and end padding, so the target is the field's full height
 * and the gutter beside the glyph — about 36px square — without making the
 * field one pixel taller than the input alone would.
 */
.blog-search__clear {
  align-self: stretch;
  margin-block: -0.7rem;
  margin-inline-end: -1.25rem;
  padding: 0 1.25rem;
  border: 0;
  background: none;
  color: var(--clr-neutral-300);
  font: inherit;
  cursor: pointer;

  &:hover,
  &:focus-visible { color: var(--clr-primary-100); }

  /* Inset, or the ring would sit on the frame's own border. */
  &:focus-visible { outline-offset: -2px; }
}

/*
 * THE STATUS LINE IS THE GAP. The 1.5rem between the field and the list is
 * this line's box, exactly, whether it says anything or not, so a count
 * appearing moves nothing below it. One line, clipped with an ellipsis: a
 * hundred-character term would otherwise wrap and push the list down. No
 * inline padding — its text starts on the field's edge. The face is the
 * body's SpaceMono, which the archive's sheet never overrides.
 */
.blog-search__status {
  overflow: hidden;
  height: 1.5rem;
  margin: 0;
  color: var(--clr-neutral-200);
  font-size: var(--fs-100);
  line-height: 1.5rem;
  letter-spacing: 0.12em;
  text-overflow: ellipsis;
  text-transform: uppercase;
  white-space: nowrap;
}
</style>
