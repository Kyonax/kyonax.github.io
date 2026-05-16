/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 *
 * Hover/focus prediction-preload for modal-bound assets. Dedup is
 * module-scoped — once a chunk or URL has been warmed it never fetches
 * twice, even across components and re-mounts.
 */

import { warmYoutube } from '@composables/use-youtube-warmup';

const _warmed_chunks = new Set();
const _warmed_images = new Set();
/* Hold strong refs to every Image() we create. Without this the GC
   eventually reclaims them and the browser may evict the decoded bitmap,
   forcing a re-fetch on the next modal open even when HTTP cache headers
   are correct — and absolutely re-fetching when they're not (dev server,
   or DevTools' "Disable cache when DevTools is open" toggle). */
const _retained_images = [];

const _makeChunkWarmer = (key, loader) => () => {
  if (_warmed_chunks.has(key)) {
    return;
  }
  _warmed_chunks.add(key);
  loader().catch(() => {
    _warmed_chunks.delete(key); 
  });
};

export const warmModal = _makeChunkWarmer('modal', () => import('@ui/modal.vue'));
export const warmImageViewer = _makeChunkWarmer('image-viewer', () => import('@ui/image-viewer.vue'));
export const warmYoutubeFacade = _makeChunkWarmer('youtube-facade', () => import('@ui/youtube-facade.vue'));

/* Retain a URL the browser has ALREADY fetched (or is about to fetch).
   The held Image() pins the decoded bitmap in renderer memory for the
   page session, so subsequent <img src=same-url> mounts skip the network
   round-trip AND the decode step. Deduped. */
export const retainImageUrl = (url) => {
  if (typeof Image === 'undefined') {
    return;
  }
  if (!url || _warmed_images.has(url)) {
    return;
  }
  _warmed_images.add(url);
  const img = new Image();
  img.decoding = 'async';
  img.src = url;
  _retained_images.push(img);
};

export const warmImages = (media_list) => {
  if (!Array.isArray(media_list)) {
    return;
  }
  for (const media of media_list) {
    if (!media || media.kind === 'youtube') {
      continue;
    }
    retainImageUrl(media.avif || media.webp || media.fallback);
  }
};

/* Walks the card's media list once and warms ONLY the chunks reachable
   from this card's content. Cards with no YT entries never fetch YT
   bytes; YT-only cards never fetch image-viewer bytes. */
export const warmProjectCard = (card) => {
  warmModal();
  const media = card?.media_urls;
  if (!media?.length) {
    return;
  }

  let has_image = false;
  let has_youtube = false;
  for (const m of media) {
    if (!m) {
      continue;
    }
    if (m.kind === 'youtube') {
      has_youtube = true;
    } else {
      has_image = true;
    }
  }

  if (has_image) {
    warmImages(media);
    warmImageViewer();
  }
  if (has_youtube) {
    warmYoutubeFacade();
    warmYoutube();
  }
};

export default warmProjectCard;
