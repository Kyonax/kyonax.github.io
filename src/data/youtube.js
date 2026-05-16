/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 *
 * YouTube URL parsing + media-entry normalisation. Pure utility module
 * (no Vue-reactive concerns) so it can be consumed from SFCs and from
 * the precheck script alike.
 *
 * Detection uses the WHATWG URL parser rather than a mega-regex —
 * correctly handles `youtu.be/<id>?si=<tracking>` query junk, rejects
 * malformed URLs cleanly, sidesteps catastrophic-backtracking risk.
 */

export const YOUTUBE_ID_RE = /^[A-Za-z0-9_-]{11}$/;

const YOUTUBE_URL_RE =
  /^https?:\/\/(?:www\.)?(?:m\.)?(?:youtube\.com|youtu\.be|youtube-nocookie\.com)\//i;

export const isYoutubeUrl = (s) =>
  typeof s === 'string' && YOUTUBE_URL_RE.test(s);

/** Extract the 11-char video ID from a YouTube URL or raw ID. Returns `null` on miss. */
export const extractYoutubeId = (input) => {
  if (!input) return null;
  if (YOUTUBE_ID_RE.test(input)) return input;
  let u;
  try { u = new URL(input); } catch { return null; }
  const host = u.hostname.replace(/^www\.|^m\./, '');
  if (host === 'youtu.be') {
    const id = u.pathname.replace(/^\//, '').split('/')[0];
    return YOUTUBE_ID_RE.test(id) ? id : null;
  }
  if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    const v = u.searchParams.get('v');
    if (v && YOUTUBE_ID_RE.test(v)) return v;
    const m = u.pathname.match(/^\/(?:embed|shorts|live|v)\/([A-Za-z0-9_-]{11})/);
    if (m) return m[1];
  }
  return null;
};

export const buildYoutubeThumbnails = (id) => ({
  webp:     `https://i.ytimg.com/vi_webp/${id}/maxresdefault.webp`,
  fallback: `https://i.ytimg.com/vi/${id}/maxresdefault.jpg`,
  altLow:   `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
});

/**
 * Pick a localized title. Accepts a string or a `{ en, es, ... }` map.
 * Fallback order: locale → en → es → `fallback` → ''.
 */
export const resolveLocalizedTitle = (title, locale, fallback = '') => {
  if (typeof title === 'string' && title.trim()) return title;
  if (title && typeof title === 'object') {
    return title[locale] || title.en || title.es || fallback;
  }
  return fallback;
};

const _resolve_title = (title, locale) => resolveLocalizedTitle(title, locale, '');

/**
 * Type-only classifier for `PROJECTS[*].images[*]` entries.
 * @returns {{kind:'youtube',id,raw} | {kind:'image',filename} | null}
 */
export const classifyMediaEntry = (entry) => {
  if (entry && typeof entry === 'object' && entry.kind === 'youtube') {
    if (!entry.id || !YOUTUBE_ID_RE.test(entry.id)) return null;
    return { kind: 'youtube', id: entry.id, raw: entry };
  }
  if (typeof entry === 'string' && isYoutubeUrl(entry)) {
    const id = extractYoutubeId(entry);
    return id ? { kind: 'youtube', id, raw: entry } : null;
  }
  if (typeof entry === 'string') {
    return { kind: 'image', filename: entry };
  }
  return null;
};

/* Output shape mirrors `_resolve_image` (name/ext/fallback/webp) so the carousel template treats both kinds uniformly. */
export const buildYoutubeDescriptor = (entry, locale = 'en', resolvePoster = null) => {
  const id = entry.id || extractYoutubeId(entry.url || '');
  if (!id || !YOUTUBE_ID_RE.test(id)) return null;
  const poster_local = entry.poster && typeof resolvePoster === 'function'
    ? resolvePoster(entry.poster)
    : null;
  const thumbs = buildYoutubeThumbnails(id);
  return {
    kind:       'youtube',
    id,
    name:       id,
    ext:        'youtube',
    title:      _resolve_title(entry.title, locale),
    aspect:     entry.aspect || '16:9',
    published:  entry.published || '',
    channel:    entry.channel || null,
    showChannel: Boolean(entry.attribution && entry.attribution.showChannel),
    fallback:   poster_local?.fallback || thumbs.fallback,
    webp:       poster_local?.webp     || thumbs.webp,
    avif:       poster_local?.avif     || null,
    altLow:     thumbs.altLow,
    embedUrl:   `https://www.youtube-nocookie.com/embed/${id}`,
    contentUrl: `https://www.youtube.com/watch?v=${id}`,
  };
};

export const normaliseMediaEntry = (entry, locale = 'en', resolveLocal = null) => {
  if (entry && typeof entry === 'object' && entry.kind === 'youtube') {
    return buildYoutubeDescriptor(entry, locale, resolveLocal);
  }
  if (typeof entry === 'string' && isYoutubeUrl(entry)) {
    const id = extractYoutubeId(entry);
    if (!id) return null;
    return buildYoutubeDescriptor({ kind: 'youtube', id }, locale, resolveLocal);
  }
  if (typeof entry === 'string' && resolveLocal) {
    const img = resolveLocal(entry);
    if (!img) return null;
    return { kind: 'image', ...img };
  }
  return null;
};
