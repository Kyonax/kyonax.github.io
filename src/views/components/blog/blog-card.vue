<script setup>
/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 */

/*
 * A post card for the row that follows the lead article: the frame, the date,
 * the title. Nothing else.
 *
 * IT WAS A BORDERED PANEL for one iteration — header row, ordinal, category
 * line, dashed rule, a CTA — and the owner cut all of it against the reference
 * layout. A card in an index is a link with a picture on it; the panel
 * furniture was the archive competing with its own articles for attention.
 *
 * THE IMAGE IS THE ENGINE'S CHOICE, not ours. org2html ranks the card image
 * once — #+COVER_IMAGE, then a body figure marked `:main`, then #+OG_IMAGE —
 * and publishes the winner as `cardImage`. #+HERO_IMAGE is deliberately NOT in
 * that chain, so a post with only a hero has no card image. The frame renders
 * a plain hairline well in that case rather than a broken picture, which is
 * also what holds the row's rhythm when only some posts have art.
 *
 * `media-only` renders just the frame, for the lead where the copy is laid out
 * separately beside it.
 */
import { blogCardImage } from '@composables/use-blog-images';
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';

const props = defineProps({
  post: { type: Object, required: true },
  mediaOnly: { type: Boolean, default: false },
});

const { t, locale } = useI18n();

const media = computed(() => blogCardImage(props.post));

const date_label = computed(() => {
  if (!props.post.date) {
    return '';
  }
  /* From the ISO components, so the rendered day is the AUTHORED day in every
     timezone rather than UTC midnight shifted west. */
  const [y, m, d] = props.post.date.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(
    locale.value === 'es' ? 'es-CO' : 'en-US',
    { year: 'numeric', month: 'short', day: 'numeric' },
  );
});
</script>

<template>
  <a
    v-if="mediaOnly"
    class="blog-card__frame blog-card__frame--solo"
    :href="post.url"
    tabindex="-1"
    aria-hidden="true"
  >
    <img
      v-if="media"
      :src="media.fallback"
      :width="media.width"
      :height="media.height"
      :alt="post.cardImageAlt || ''"
      loading="lazy"
      decoding="async"
    />
  </a>

  <article v-else class="blog-card">
    <a class="blog-card__link" :href="post.url">
      <span class="blog-card__frame">
        <img
          v-if="media"
          :src="media.fallback"
          :width="media.width"
          :height="media.height"
          :alt="post.cardImageAlt || ''"
          loading="lazy"
          decoding="async"
        />
      </span>

      <span class="blog-card__meta">
        <time class="blog-card__date" :datetime="post.date">{{ date_label }}</time>
        <span v-if="post.readingTime" class="blog-card__reading">
          · {{ post.readingTime }} {{ t('kyo-web.blog.reading-time') }}
        </span>
      </span>
      <h3 class="blog-card__title">{{ post.title }}</h3>
    </a>
  </article>
</template>

<style lang="scss" scoped>
/* Fills its grid cell in both axes. Without the width the flex child shrank to
   its own content and a row rendered cards of different widths with ragged
   gaps between them. */
.blog-card {
  display: flex;
  width: 100%;
  height: 100%;
}

.blog-card__link {
  display: grid;
  gap: 0.6rem;
  align-content: start;
  width: 100%;
  text-decoration: none;
  color: inherit;

  &:hover,
  &:focus-visible {
    .blog-card__title { color: var(--clr-primary-100); }
    .blog-card__frame { border-color: var(--clr-primary-100); }
  }
}

.blog-card__frame {
  display: block;
  overflow: hidden;
  border: 1px solid var(--clr-border-100);
  background-color: var(--clr-neutral-400);
  transition: border-color 0.2s ease;
  /* Space-stripped on purpose: vite-ssg's minifier collapses "16 / 9" inside a
     style attribute while Vue's client stringifyStyle keeps the spaces, which
     is a hydration mismatch. Declared in CSS here, so it is stable either way. */
  aspect-ratio: 16/9;

  img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  /* The lead's standalone frame sits beside the copy rather than above it, so
     it is free to be taller. */
  &--solo { aspect-ratio: 16/10; }
}

/* One step up from `--fs-100`, which was the smallest size in the scale and
   read as a caption rather than as the card's own second line. Still two
   steps under `.blog-card__title`. */
.blog-card__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0 0.5ch;
  font-family: "SpaceMono", monospace;
  font-size: var(--fs-200);
}

.blog-card__date { color: var(--clr-neutral-200); }

/* The reading time rides on the date's line, a step quieter than the date. */
.blog-card__reading { color: var(--clr-neutral-300); }

.blog-card__title {
  margin: 0;
  font-family: "Geomanist", sans-serif;
  font-size: var(--fs-300);
  line-height: 1.3;
  letter-spacing: -0.02rem;
  color: var(--clr-neutral-50);
  transition: color 0.2s ease;
}
</style>
