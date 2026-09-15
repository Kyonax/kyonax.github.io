<script setup>
/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 */

/*
 * The support block at the end of an article: one heading, one sentence and
 * one link to the owner's tip jar. No emoji and no image — the ask is words.
 *
 * DATA-DRIVEN AND OFF BY DEFAULT. The vendor lives in SUPPORT in
 * src/data/data.js, and until the owner names it `url` is empty and this
 * renders nothing. blog-post.vue checks the same field before mounting, so
 * while it is empty the chunk is not even fetched.
 *
 * A NEW-TAB LINK, for the tracker as much as for the reader: Umami intercepts
 * a same-tab <a> that carries data-umami-event and re-navigates it with
 * location.href. A _blank link is the one kind it leaves alone.
 */

import { SUPPORT } from '@data/data';
import UiLink from '@ui/link.vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
</script>

<template>
  <section v-if="SUPPORT.url" class="blog-support">
    <h2 class="blog-support__title">
      {{ t('kyo-web.blog.support-title') }}
    </h2>
    <p class="blog-support__text">
      {{ t('kyo-web.blog.support-text') }}
    </p>
    <UiLink
      :href="SUPPORT.url"
      variant="cyber"
      size="md"
      target="_blank"
      rel="noopener noreferrer"
      class="blog-support__cta"
      data-umami-event="support"
    >
      {{ t('kyo-web.blog.support-cta') }}
    </UiLink>
  </section>
</template>

<style lang="scss" scoped>
/*
 * HOST CHROME INSIDE THE ARTICLE, so the engine's tokens — blog-post-nav's
 * law: every `--o2h-*` falls back to the site's matching token, so a missing
 * Style Book degrades to site styling rather than to nothing. A hairline
 * above and the article's 48px rhythm, like the closing blocks around it;
 * the heading, the sentence and the button all start on the rule's edge.
 */
.blog-support {
  margin-top: var(--o2h-space-5, 3rem);
  padding-top: var(--o2h-space-3, 1.5rem);
  border-top: var(--o2h-border, 1px solid var(--clr-border-100));
}

.blog-support__title {
  margin: 0;
  color: var(--o2h-ink, var(--clr-neutral-100));
  font-family: var(--o2h-font-editorial, "Geomanist", sans-serif);
  font-size: var(--fs-500);
  font-weight: 400;
  line-height: 1.2;
}

.blog-support__text {
  margin: var(--o2h-space-1, 0.5rem) 0 var(--o2h-space-3, 1.5rem);
  color: var(--o2h-slate, var(--clr-neutral-200));
  font-family: var(--o2h-font-editorial, "Geomanist", sans-serif);
  font-size: var(--o2h-fs-body, var(--fs-400));
  line-height: 1.5;
}

/* 24px is the floor for a pointer target (WCAG 2.5.8); the `md` size clears
   it on its own, and this keeps it cleared if the scale ever moves. */
.blog-support__cta { min-height: 2.25rem; }
</style>
