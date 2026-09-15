<script setup>
/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 */

/*
 * Client-side archive search.
 *
 * The index is FETCHED, not imported: kyo-blog emits one small JSON per locale
 * carrying titles, excerpts and tags, and it is served from /blog-search/. An
 * import would bundle it into the page chunk and count against the site's
 * 180 KB main-bundle budget for every visitor, including the ones who never
 * type anything.
 *
 * It is also strictly PROGRESSIVE. The full archive is already on the page as
 * prerendered HTML; this only filters what is visible. With JavaScript off the
 * input never appears and the archive is untouched, which is why the control
 * is rendered only after the index has loaded.
 *
 * THE SHAPE is a framed panel, not a rounded form control: a monospace label,
 * a bordered field with a `/` prefix, and results that reuse the archive's own
 * hairline row — so a search result and an archive entry
 * read as the same object rather than two different lists of links. The prefix
 * is plain ASCII on purpose; a Nerd Font glyph here would depend on the icon
 * subset actually reaching the browser, and a cached older copy renders tofu.
 */

import { computed, onMounted,ref } from 'vue';
import { useI18n } from 'vue-i18n';

const props = defineProps({
  locale: { type: [String, Object], required: true },
});

const { t } = useI18n();

const index = ref(null);
const query = ref('');

onMounted(async () => {
  /* An article's tag chips link here as ?q=<tag>. Every blog link is a full
     page load, so reading it once on mount is enough; the field and the
     results appear already filtered when the index lands. */
  query.value = new URLSearchParams(window.location.search).get('q') || '';
  const code = typeof props.locale === 'string' ? props.locale : props.locale.value;
  try {
    const res = await fetch(`/blog-search/blog-search-${code}.json`);
    if (res.ok) {
      index.value = await res.json();
    }
  } catch {
    /* No index, no search box. The archive below is unaffected. */
    index.value = null;
  }
});

const fold = (s) => String(s || '')
  .normalize('NFD')
  .replace(/[̀-ͯ]/g, '')
  .toLowerCase();

const results = computed(() => {
  if (!index.value || !query.value.trim()) {
    return null;
  }
  const q = fold(query.value.trim());
  return index.value.filter((row) => fold(row.title).includes(q)
    || fold(row.excerpt).includes(q)
    || (row.tags || []).some((tag) => fold(tag).includes(q)));
});
</script>

<template>
  <div v-if="index" class="blog-search">
    <!-- The label is the PLACEHOLDER now, not a caption stacked above the
         field. It stays in the DOM as an sr-only <label> because a placeholder
         is not an accessible name — it disappears the moment anyone types. -->
    <label class="sr-only" for="blog-search-input">
      {{ t('kyo-web.blog.search-label') }}
    </label>

    <div class="blog-search__field">
      <span class="blog-search__prefix" data-text="/" aria-hidden="true" />
      <input
        id="blog-search-input"
        v-model="query"
        class="blog-search__input"
        type="search"
        autocomplete="off"
        :placeholder="t('kyo-web.blog.search-placeholder')"
      />
    </div>

    <div v-if="results" class="blog-search__results" role="status">
      <p v-if="results.length === 0" class="blog-search__empty">
        {{ t('kyo-web.blog.search-empty') }}
      </p>
      <template v-else>
        <p class="blog-search__count">
          {{ `${results.length} ${t('kyo-web.blog.search-results')}` }}
        </p>
        <ul class="blog-search__list">
          <li v-for="row in results" :key="row.url" class="blog-search__row">
            <a class="blog-search__link" :href="row.url">
              <span class="blog-search__title">{{ row.title }}</span>
              <span class="blog-search__arrow" data-text="›" aria-hidden="true" />
            </a>
          </li>
        </ul>
      </template>
    </div>
  </div>
</template>

<style lang="scss" scoped>
/* Sits with the "All posts" heading, not a band away from it. */
.blog-search { margin-bottom: 1.5rem; }

/* The frame, not the input, carries the border and the focus ring — so the
   prefix and the field read as one control instead of a glyph parked beside a
   form element. */
.blog-search__field {
  display: flex;
  gap: 0.65rem;
  align-items: center;
  /* The field sits on the SAME measure as the results beneath it — which is
     now true because BOTH keep their padding and neither pulls it back out
     with a negative margin. The bleed the two used to share put their text on
     the sheet edge and was then clipped by the sheet's own `overflow: hidden`,
     so it cost a gutter and bought nothing. */
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

  /* WebKit paints its own clear button in a colour the palette never chose. */
  &::-webkit-search-cancel-button { filter: grayscale(1); }
}

.blog-search__results { margin-top: 1rem; }

.blog-search__count,
.blog-search__empty {
  margin: 0 0 0.5rem;
  color: var(--clr-neutral-200);
  font-family: 'SpaceMono', monospace;
  font-size: var(--fs-100);
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.blog-search__list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.blog-search__row + .blog-search__row { border-top: 1px solid var(--clr-border-100); }

/* The archive row, at search scale — same hairline, same hover, so a result
   and an entry are visibly the same kind of thing.
   THE NUMBERS NOW MATCH THAT CLAIM. At 0.7rem/0.75rem they did not: the fill
   bled 9px past the column while the text sat flush against its own edge, so a
   result read as a grey band with the title jammed into the corner rather than
   as a row. These are blog.vue's own values, scaled only on the block axis
   because a result is one line where an archive entry is three. */
.blog-search__link {
  display: flex;
  gap: 1rem;
  align-items: baseline;
  justify-content: space-between;
  padding: 1rem 1.25rem;
  transition: background-color 0.15s ease, color 0.15s ease;
  text-decoration: none;
  color: inherit;

  /* 3%, the same lift as the archive rows — it was 6%, the slab the owner
     turned down there. */
  &:hover,
  &:focus-visible {
    background-color: color-mix(in srgb, var(--clr-neutral-100) 3%, transparent);
    color: var(--clr-primary-100);

    .blog-search__title { color: var(--clr-primary-100); }
    .blog-search__arrow { transform: translateX(0.2rem); }
  }
}

/* The archive row's title, so a result reads as the same kind of thing. */
.blog-search__title {
  font-family: "Geomanist", sans-serif;
  font-size: var(--fs-400);
  line-height: 1.3;
  color: var(--clr-neutral-100);
  transition: color 0.2s ease;
}

/* Transformed at rest as well — the CTA's fix in blog.vue: Firefox rasterises
   a glyph on a fractional pixel differently once a transform applies, and the
   arrow hopped vertically at both ends of a sideways nudge. */
.blog-search__arrow {
  flex: 0 0 auto;
  display: inline-block;
  font-family: 'SpaceMono', monospace;
  line-height: 1;
  transform: translateX(0);
  will-change: transform;
  transition: transform 0.2s ease;
}
</style>
