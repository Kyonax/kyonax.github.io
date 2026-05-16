/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 */

const HINTS = [
  ['preconnect',   'https://www.youtube-nocookie.com'],
  ['preconnect',   'https://i.ytimg.com'],
  ['dns-prefetch', 'https://www.google.com'],
];

const _warmed = new Set();

/**
 * Inject preconnect / dns-prefetch hints for the YouTube hosts.
 * Deduped by `key`; `null` (default) acts as a single-shot global.
 */
export const warmYoutube = (key = null) => {
  if (typeof document === 'undefined') return;
  const cache_key = key === null ? '__global__' : key;
  if (_warmed.has(cache_key)) return;
  _warmed.add(cache_key);
  for (const [rel, href] of HINTS) {
    const link = document.createElement('link');
    link.rel = rel;
    link.href = href;
    if (rel === 'preconnect') link.crossOrigin = '';
    document.head.appendChild(link);
  }
};

export default warmYoutube;
