/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 */

/*
 * use-message-slice.js — hand a deferred copy slice to vue-i18n.
 *
 * The catalogue is split so the main bundle carries only what every page needs
 * (see @data/snippets-core). A view that owns long-form copy imports its OWN
 * slice and merges it here, which puts those bytes in that view's chunk and
 * nowhere else — the reader pays for the privacy page's text only by opening
 * the privacy page.
 *
 * CALL IT BEFORE ANYTHING READS A KEY FROM THE SLICE. Merging is synchronous
 * and the slice is a static import, so putting the call at the top of
 * `<script setup>` is enough: computed properties are lazy and the template
 * has not rendered yet. It runs on the server during prerender too, for the
 * same reason — the import is static, not dynamic, so there is no await to
 * strand the markup.
 *
 * `mergeLocaleMessage` deep-merges, so a slice adds its subtree without
 * disturbing the core copy that shares a parent key.
 */

import { useI18n } from 'vue-i18n';

export const useMessageSlice = (slice) => {
  const { mergeLocaleMessage } = useI18n({ useScope: 'global' });
  for (const locale of Object.keys(slice)) {
    mergeLocaleMessage(locale, slice[locale]);
  }
};

export default useMessageSlice;
