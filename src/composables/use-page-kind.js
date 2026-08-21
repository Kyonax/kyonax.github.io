/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 *
 * Reactive wrapper over `routeKind()` — "what kind of page am I on?".
 *
 * The answer drives three separate decisions that must never disagree: which
 * view App renders, which JSON-LD graph it emits, and which chrome the nav
 * shows. Each of those used to test `route.path` against its own copy of the
 * resume regex, so adding the privacy routes would have meant a third copy and
 * three chances to forget one.
 */

import { routeKind } from '@seo/routes';
import { computed } from 'vue';
import { useRoute } from 'vue-router';

export const usePageKind = () => {
  const route = useRoute();
  const kind = computed(() => routeKind(route.path));

  return {
    kind,
    isLanding:  computed(() => kind.value === 'landing'),
    isResume:   computed(() => kind.value === 'resume'),
    isPrivacy:  computed(() => kind.value === 'privacy'),
    /* Anything that is not the landing renders through document-page.vue. */
    isDocument: computed(() => kind.value !== 'landing'),
  };
};

export default usePageKind;
