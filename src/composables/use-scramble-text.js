/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 */

import { onBeforeUnmount } from 'vue';

/* Measured on cloudflare.com's agent console (anime.js scrambleText):
   status spans reveal at 18 chars/s, token spans at 22 chars/s, and the
   noise refreshes at 30Hz — every 2 frames at 60fps, confirmed by
   frame-differencing the capture. Those are the defaults here. */
const DEFAULT_ALPHABET = 'abcdefghijklmnopqrstuvwxyz';
const DEFAULT_REVEAL_RATE = 18;
const SETTLE_RATE = 30;
const DEFAULT_CURSOR = '_';
const MS_PER_SECOND = 1000;

const SETTLE_MS = MS_PER_SECOND / SETTLE_RATE;

/* One module-level rAF drives every live scramble on the page — same
   shared-singleton pattern as use-in-viewport's IntersectionObserver.
   The loop only exists while at least one job is unfinished. */
let _raf = null;
let _jobs = [];

const _random_char = (alphabet) => {
  return alphabet.charAt(Math.floor(Math.random() * alphabet.length));
};

const _render = (job, now) => {
  const { el, text, alphabet, cursor } = job;
  /* Reveal boundary sweeps left to right at revealRate chars/s once
     the per-span delay has elapsed. Before that, boundary stays at 0
     and the whole span boils. */
  const sweep = now - job.start - job.delay;
  const locked = sweep > 0 ? Math.floor(sweep / job.ms_per_char) : 0;

  if (locked >= text.length) {
    el.textContent = text;
    job.done = true;
    return;
  }

  /* Only pay for a string rebuild on 30Hz settle ticks. */
  if (now - job.last_tick < SETTLE_MS) {
    return;
  }
  job.last_tick = now;

  let out = text.slice(0, locked);
  for (let i = locked; i < text.length; i += 1) {
    if (text.charAt(i) === ' ') {
      out += ' ';
    } else if (i === locked && sweep > 0 && cursor) {
      out += cursor;
    } else {
      out += _random_char(alphabet);
    }
  }
  el.textContent = out;
};

const _tick = (now) => {
  for (const job of _jobs) {
    _render(job, now);
    if (job.done) {
      job.resolve();
    }
  }
  _jobs = _jobs.filter((job) => !job.done);
  _raf = _jobs.length > 0 ? requestAnimationFrame(_tick) : null;
};

/**
 * Scramble-decode engine: boils a span with random glyphs that lock
 * left-to-right into the real text, exactly length- and space-preserving,
 * so a monospace span can never reflow while it runs.
 * @param {object} [defaults] - Per-composable alphabet/revealRate/cursor.
 * @returns {{play: Function, freeze: Function, stop: Function}} Launcher,
 *   one-shot noise primer, and cleanup.
 */
export const useScrambleText = (defaults = {}) => {
  const _owned = new Set();

  const _reduced_motion = () => {
    if (typeof window === 'undefined') {
      return true;
    }
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  };

  /**
   * Scramble-decode `text` into `el`. Resolves when the span settles.
   * Under reduced motion (or during SSR) it writes the final text
   * immediately and resolves — no listeners, no rAF.
   * @param {HTMLElement} el - Target element, ideally aria-hidden.
   * @param {string} text - Final string. Its length never changes
   *   during the effect, so a monospace span cannot reflow.
   * @param {object} [options] - Alphabet, revealRate, delay, cursor.
   * @returns {Promise<void>} Settle promise.
   */
  const play = (el, text, options = {}) => {
    if (_reduced_motion() || !el) {
      if (el) {
        el.textContent = text;
      }
      return Promise.resolve();
    }
    const rate = options.revealRate
      || defaults.revealRate
      || DEFAULT_REVEAL_RATE;
    return new Promise((resolve) => {
      const job = {
        el,
        text,
        alphabet: options.alphabet || defaults.alphabet || DEFAULT_ALPHABET,
        cursor: options.cursor ?? defaults.cursor ?? DEFAULT_CURSOR,
        delay: options.delay || 0,
        ms_per_char: MS_PER_SECOND / rate,
        start: performance.now(),
        last_tick: 0,
        done: false,
        /* Settling releases the handle: _jobs is pruned, _owned was not. */
        resolve: () => {
          _owned.delete(job);
          resolve();
        },
      };
      _owned.add(job);
      _jobs.push(job);
      if (_raf === null) {
        _raf = requestAnimationFrame(_tick);
      }
    });
  };

  /**
   * Write one frozen noise frame into `el` — same length- and
   * space-preserving contract as `play`, but no rAF and no job. Primes a
   * span that must not show its real text before its decode runs.
   * @param {HTMLElement} el - Target element, ideally aria-hidden.
   * @param {string} text - Final string; only its shape is borrowed.
   * @param {object} [options] - Alphabet override.
   * @returns {void}
   */
  const freeze = (el, text, options = {}) => {
    if (!el) {
      return;
    }
    if (_reduced_motion()) {
      el.textContent = text;
      return;
    }
    const alphabet = options.alphabet || defaults.alphabet || DEFAULT_ALPHABET;
    let out = '';
    for (let i = 0; i < text.length; i += 1) {
      out += text.charAt(i) === ' ' ? ' ' : _random_char(alphabet);
    }
    el.textContent = out;
  };

  /* Abandon this component's jobs, leaving the final text in place —
     never a frozen scramble frame. */
  const stop = () => {
    for (const job of _owned) {
      if (!job.done) {
        job.el.textContent = job.text;
        job.done = true;
        job.resolve();
      }
    }
    _owned.clear();
  };

  onBeforeUnmount(stop);

  return { play, freeze, stop };
};

export default useScrambleText;
