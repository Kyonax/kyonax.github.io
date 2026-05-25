/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 *
 * useCursorTooltip — tracks mouse position and visibility state for a
 * cursor-following tooltip. Attach to any native element or component.
 *
 * Accepts two forms:
 *   - Template ref:     useCursorTooltip(ref(el))
 *   - Getter function:  useCursorTooltip(() => el.querySelector('a'))
 *
 * The getter form is needed for elements inside v-html content, which are
 * not reachable via template refs. nextTick is awaited so v-html has
 * rendered before the DOM query runs.
 *
 * Usage:
 *   const { visible, x, y } = useCursorTooltip(el_ref);
 *   const { visible, x, y } = useCursorTooltip(() => parent.value?.querySelector('a'));
 */

import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue';

export default function useCursorTooltip(target) {
  const visible = ref(false);
  const x = ref(0);
  const y = ref(0);

  function on_enter(e) {
    x.value = e.clientX;
    y.value = e.clientY;
    visible.value = true;
  }

  function on_move(e) {
    x.value = e.clientX;
    y.value = e.clientY;
  }

  function on_leave() {
    visible.value = false;
  }

  let _el = null;

  onMounted(async () => {
    await nextTick();
    _el = typeof target === 'function'
      ? target()
      : (target.value?.$el ?? target.value);
    if (!_el) return;
    _el.addEventListener('mouseenter', on_enter);
    _el.addEventListener('mousemove', on_move);
    _el.addEventListener('mouseleave', on_leave);
  });

  onBeforeUnmount(() => {
    if (!_el) return;
    _el.removeEventListener('mouseenter', on_enter);
    _el.removeEventListener('mousemove', on_move);
    _el.removeEventListener('mouseleave', on_leave);
  });

  return { visible, x, y };
}
