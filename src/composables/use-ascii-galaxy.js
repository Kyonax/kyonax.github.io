/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 */

/*
 * use-ascii-galaxy.js — the loop that turns the blog hero's galaxy.
 *
 * SSR-SAFE BY CONSTRUCTION. The frame index starts at 0 and nothing moves
 * until onMounted, so the prerendered <pre> and the first client render are
 * both galaxyFrame(0) — the loop only ever advances a frame that is already on
 * screen.
 *
 * FIVE FRAMES A SECOND, 36 TO A TURN: 7.2 s per loop, the design's timing.
 * requestAnimationFrame drives it (so the browser can coalesce it with paint)
 * and is throttled to one rewrite per 200 ms; the remainder carries over, so
 * the cadence holds at any refresh rate instead of snapping to the next
 * vsync every time.
 *
 * IT RUNS ONLY WHEN SOMEONE CAN SEE IT: paused while the tab is hidden, while
 * the <pre> is out of the viewport (the site's one shared observer), and never
 * started under prefers-reduced-motion — that reader keeps frame 0 as a still
 * picture. Every listener, observer and frame request is released on unmount.
 */

import {
  GALAXY_FRAMES,
  galaxyFrame,
  galaxyPhase,
} from '@composables/ascii-galaxy-frame';
import useInViewport from '@composables/use-in-viewport';
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';

const FRAME_MS = 200;
const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';

/**
 * Animate the galaxy inside `target_ref`.
 * @param {import('vue').Ref<HTMLElement|null>} target_ref - The <pre>.
 * @returns {{markup: import('vue').ComputedRef<string>}} The current frame's
 *   markup, for `v-html`.
 */
export const useAsciiGalaxy = (target_ref) => {
  const frame = ref(0);
  const markup = computed(() => galaxyFrame(galaxyPhase(frame.value)));

  let _raf = null;
  let _last = 0;
  let _in_view = false;
  let _motion = null;

  const _tick = (now) => {
    _raf = requestAnimationFrame(_tick);
    const elapsed = now - _last;
    if (elapsed < FRAME_MS) {
      return;
    }
    _last = now - (elapsed % FRAME_MS);
    frame.value = (frame.value + 1) % GALAXY_FRAMES;
  };

  const _stop = () => {
    if (_raf !== null) {
      cancelAnimationFrame(_raf);
      _raf = null;
    }
  };

  const _start = () => {
    if (!_motion || _motion.matches || _raf !== null || !_in_view
      || document.hidden) {
      return;
    }
    _last = performance.now();
    _raf = requestAnimationFrame(_tick);
  };

  const _visibility = () => {
    if (document.hidden) {
      _stop();
    } else {
      _start();
    }
  };

  /* A reader who turns reduced motion on mid-loop gets the still picture back,
     not whichever frame the loop happened to stop on. */
  const _motionChange = () => {
    if (_motion.matches) {
      _stop();
      frame.value = 0;
    } else {
      _start();
    }
  };

  useInViewport(target_ref, {
    on_change: (visible) => {
      _in_view = visible;
      if (visible) {
        _start();
      } else {
        _stop();
      }
    },
  });

  onMounted(() => {
    _motion = window.matchMedia(REDUCED_MOTION);
    _motion.addEventListener('change', _motionChange);
    document.addEventListener('visibilitychange', _visibility);
    _start();
  });

  onBeforeUnmount(() => {
    _stop();
    _motion?.removeEventListener('change', _motionChange);
    document.removeEventListener('visibilitychange', _visibility);
  });

  return { markup };
};

export default useAsciiGalaxy;
