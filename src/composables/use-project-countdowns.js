/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 */

import { onBeforeUnmount, onMounted, reactive } from 'vue';

import { PROJECTS } from '@data/projects';
import NowProjectWorker from '@workers/now-project.worker.js?worker';

/**
 * Reactive countdown map for the given project keys.
 * Backed by a Web Worker that ticks at 1Hz and pauses on `visibilitychange`.
 * @returns {Record<string, {label: string, countdown: string|null, utc_ts: number}>}
 */
export const useProjectCountdowns = (keys) => {
  const countdowns = reactive({});

  let worker = null;
  let visibility_handler = null;

  onMounted(() => {
    worker = new NowProjectWorker();
    worker.addEventListener('message', (event) => {
      Object.assign(countdowns, event.data);
    });
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
      worker.terminate();
      worker = null;
    }
  });

  return countdowns;
};

export default useProjectCountdowns;
