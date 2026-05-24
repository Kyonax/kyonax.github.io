/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 */

import { PROJECTS } from '@data/projects';
import NowProjectWorker from '@workers/now-project.worker.js?worker';
import { onBeforeUnmount, onMounted, ref } from 'vue';

/**
 * Reactive countdown map for the given project keys.
 * Backed by a Web Worker that ticks at 1Hz and pauses on `visibilitychange`.
 *
 * Returns a Ref so each 1Hz tick is one atomic reactivity notification instead
 * of one-per-mutated-key from in-place Object.assign on a reactive proxy. Stale
 * keys also vanish automatically when the worker payload shape narrows. Consumers
 * use `countdowns.value[key]` in JS and `countdowns.<key>` in templates (auto-unwrap).
 * @returns {import('vue').Ref<Record<string, {label: string, countdown: string|null, utc_ts: number}>>}
 */
export const useProjectCountdowns = (keys) => {
  const countdowns = ref({});

  let worker = null;
  let visibility_handler = null;
  let message_handler = null;

  onMounted(() => {
    worker = new NowProjectWorker();
    message_handler = (event) => {
      countdowns.value = event.data;
    };
    worker.addEventListener('message', message_handler);
    worker.postMessage({ projects: PROJECTS, keys });

    visibility_handler = () => {
      if (!worker) {
        return;
      }
      worker.postMessage({ cmd: document.hidden ? 'pause' : 'resume' });
    };
    document.addEventListener('visibilitychange', visibility_handler);
  });

  onBeforeUnmount(() => {
    if (visibility_handler) {
      document.removeEventListener('visibilitychange', visibility_handler);
      visibility_handler = null;
    }
    if (worker) {
      if (message_handler) {
        worker.removeEventListener('message', message_handler);
        message_handler = null;
      }
      worker.terminate();
      worker = null;
    }
  });

  return countdowns;
};

export default useProjectCountdowns;
