/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 */

import { onMounted, ref } from 'vue';

const _SSR_PLACEHOLDER = '#';

export const useObfuscatedEmail = (user, domain) => {
  const href = ref(_SSR_PLACEHOLDER);

  onMounted(() => {
    href.value = `mailto:${user}@${domain}`;
  });

  return href;
};

export default useObfuscatedEmail;
