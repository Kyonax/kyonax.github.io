/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 */

const VARIANT_PATTERN = /^(.+?)-(\d+)\.(jpg|jpeg|png|webp|avif)$/;
const PLAIN_PATTERN   = /^(.+?)\.(jpg|jpeg|png|webp|avif)$/;

const _is_image_path = (path) =>
  /\.(jpg|jpeg|png|webp|avif)$/.test(path);

const _build_manifest = () => {
  /* eager glob — Vite resolves URLs at build time. */
  const modules = import.meta.glob(
    '@assets/app/*.{jpg,jpeg,png,webp,avif}',
    { eager: true, query: '?url', import: 'default' },
  );

  const groups = {};
  /* groups[base] = { jpg: [{url, width}], webp: [...], avif: [...], fallback: url } */

  for (const [path, url] of Object.entries(modules)) {
    if (!_is_image_path(path)) {
      continue;
    }

    const file = path.split('/').pop();

    let base;
    let width = 0;
    let ext;

    const variant_match = file.match(VARIANT_PATTERN);
    const plain_match   = file.match(PLAIN_PATTERN);

    if (variant_match) {
      [, base, , ext] = variant_match;
      width = parseInt(variant_match[2], 10);
    } else if (plain_match) {
      [, base, ext] = plain_match;
    } else {
      continue;
    }

    if (!groups[base]) {
      groups[base] = { jpg: [], webp: [], avif: [], fallback_src: null };
    }

    const ext_key = ext === 'jpeg' ? 'jpg' : (ext === 'png' ? 'jpg' : ext);

    if (width > 0) {
      groups[base][ext_key].push({ url, width });
    } else if (ext_key === 'jpg' || ext_key === 'png') {
      groups[base].fallback_src = url;
    }
  }

  /* Compose the per-base manifest entries. */
  const manifest = {};
  for (const [base, group] of Object.entries(groups)) {
    const _to_srcset = (arr) =>
      arr
        .filter((v) => v.width > 0)
        .sort((a, b) => a.width - b.width)
        .map((v) => `${v.url} ${v.width}w`)
        .join(', ');

    const widths = group.jpg.map((v) => v.width);
    const max_width = widths.length > 0 ? Math.max(...widths) : 0;

    manifest[base] = {
      fallback_src: group.fallback_src
        || (group.jpg.length > 0 ? group.jpg[group.jpg.length - 1].url : null),
      jpg_srcset:   _to_srcset(group.jpg),
      webp_srcset:  _to_srcset(group.webp),
      avif_srcset:  _to_srcset(group.avif),
      width:  max_width,
      /* height is unknown without sharp/imagetools metadata. Phase 7 may
         hydrate this via vite-imagetools `?as=metadata` imports. */
      height: 0,
    };
  }

  return manifest;
};

const MANIFEST = _build_manifest();

/**
 * @param {string} name — base filename (no extension, no variant suffix).
 * @returns {object|null}
 */
export const useImageManifest = (name) => MANIFEST[name] || null;

export default useImageManifest;
