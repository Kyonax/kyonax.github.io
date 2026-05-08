/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 */

import { onBeforeUnmount, onMounted, unref } from 'vue';

/**
 * @param {import('vue').Ref<HTMLElement|null>} target_ref
 * @param {(event: MouseEvent) => void} handler
 */
export const useClickOutside = (target_ref, handler) => {
  const on_document_click = (event) => {
    const el = unref(target_ref);
    if (!el || el.contains(event.target)) {
      return;
    }
    handler(event);
  };

  onMounted(() => {
    document.addEventListener('click', on_document_click, true);
  });

  onBeforeUnmount(() => {
    document.removeEventListener('click', on_document_click, true);
  });
};

export default useClickOutside;
