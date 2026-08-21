/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 */

import { onBeforeUnmount, onMounted, ref, unref, watch } from 'vue';

/* Cadence read off conductorai.com's inline hero-rotator source and verified
   against 30 fps frame captures: 35-65 ms per typed char, 18-35 ms per deleted
   char, 1100 ms hold on the full phrase, 180 ms empty gap. The random spread
   is what makes it read as human typing instead of a metronome. */
const TYPE_MIN_MS = 35;
const TYPE_MAX_MS = 65;
const DELETE_MIN_MS = 18;
const DELETE_MAX_MS = 35;
const HOLD_FULL_MS = 1100;
const HOLD_EMPTY_MS = 180;

/**
 * Looping type-and-delete engine over a phrase list.
 *
 * SSR-safe by construction: `text` initializes to the full first phrase, so
 * prerendered HTML and the first client render agree, and the engine only
 * starts inside onMounted, beginning with a hold-then-delete over the phrase
 * that is already on screen. Under prefers-reduced-motion it never starts and
 * the first phrase stays rendered as static text.
 * @param {() => string[]} get_phrases - Lazy getter so locale swaps re-resolve.
 * @param {object} [options] - Timing overrides plus an optional `enabled` ref
 *   that gates the engine (an off-viewport or display:none host stays idle).
 * @returns {object} Reactive `text` plus the engine's `active` flag.
 */
export const useTypewriter = (get_phrases, options = {}) => {
  const cfg = {
    type_min_ms: TYPE_MIN_MS,
    type_max_ms: TYPE_MAX_MS,
    delete_min_ms: DELETE_MIN_MS,
    delete_max_ms: DELETE_MAX_MS,
    hold_full_ms: HOLD_FULL_MS,
    hold_empty_ms: HOLD_EMPTY_MS,
    enabled: null,
    ...options,
  };

  const first = get_phrases()[0] || '';
  const text = ref(first);
  const active = ref(false);

  let _timer = null;
  let _word = 0;
  let _char = first.length;
  let _deleting = true;
  let _paused_hidden = false;
  let _motion_ok = false;

  const _rand = (min, max) => min + Math.random() * (max - min);

  const _allowed = () => (cfg.enabled ? Boolean(unref(cfg.enabled)) : true);

  const _stop = () => {
    if (_timer) {
      clearTimeout(_timer);
      _timer = null;
    }
  };

  const _tick = () => {
    const phrases = get_phrases();
    const current = phrases[_word % phrases.length];

    if (_deleting) {
      _char -= 1;
      text.value = current.slice(0, Math.max(0, _char));
      if (_char > 0) {
        _timer = setTimeout(_tick, _rand(cfg.delete_min_ms, cfg.delete_max_ms));
      } else {
        _deleting = false;
        _word = (_word + 1) % phrases.length;
        _timer = setTimeout(_tick, cfg.hold_empty_ms);
      }
      return;
    }

    _char += 1;
    text.value = current.slice(0, _char);
    if (_char < current.length) {
      _timer = setTimeout(_tick, _rand(cfg.type_min_ms, cfg.type_max_ms));
    } else {
      _deleting = true;
      _timer = setTimeout(_tick, cfg.hold_full_ms);
    }
  };

  const _start = () => {
    if (!_motion_ok || _timer || !_allowed() || document.hidden) {
      return;
    }
    active.value = true;
    _timer = setTimeout(_tick, cfg.hold_empty_ms);
  };

  const _visibility = () => {
    /* The original site stops its status loop on hidden but never restarts
       it, which is why the recorded clip shows the console frozen mid-word.
       Pause on hidden, resume from the same state on visible. */
    if (document.hidden) {
      _paused_hidden = true;
      _stop();
    } else if (_paused_hidden) {
      _paused_hidden = false;
      if (_allowed()) {
        _timer = setTimeout(_tick, cfg.hold_empty_ms);
      }
    }
  };

  onMounted(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }
    _motion_ok = true;
    document.addEventListener('visibilitychange', _visibility);
    if (cfg.enabled) {
      watch(() => Boolean(unref(cfg.enabled)), (on) => {
        if (on) {
          _start();
        } else {
          _stop();
        }
      }, { immediate: true });
    } else {
      /* The SSR state is a fully typed first phrase, so the cycle starts at
         the hold-then-delete step rather than typing over rendered text. */
      _deleting = true;
      _timer = setTimeout(_tick, cfg.hold_full_ms);
      active.value = true;
    }
  });

  onBeforeUnmount(() => {
    _stop();
    document.removeEventListener('visibilitychange', _visibility);
  });

  return { text, active };
};

export default useTypewriter;
