/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 */

const VARIANT_PATTERN = /^(.+?)-(\d+)\.(jpg|jpeg|png|webp|avif)$/;
const PLAIN_PATTERN   = /^(.+?)\.(jpg|jpeg|png|webp|avif)$/;

const _is_raster_path = (path) =>
  /\.(jpg|jpeg|png|webp|avif)$/.test(path);

const _build_manifest = () => {
  const modules = import.meta.glob(
    '@assets/app/*.{jpg,jpeg,png,webp,avif}',
    { eager: true, query: '?url', import: 'default' },
  );

  const groups = {};

  for (const [path, url] of Object.entries(modules)) {
    if (!_is_raster_path(path)) {
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
      width = Number.parseInt(variant_match[2], 10);
    } else if (plain_match) {
      [, base, ext] = plain_match;
    } else {
      continue;
    }

    if (!groups[base]) {
      groups[base] = { raster: [], webp: [], avif: [], fallback_src: null };
    }

    const is_raster = ext === 'jpg' || ext === 'jpeg' || ext === 'png';
    const tier_key = is_raster ? 'raster' : ext;

    if (width > 0) {
      groups[base][tier_key].push({ url, width });
    } else if (is_raster) {
      groups[base].fallback_src = url;
    }
  }

  const manifest = {};
  for (const [base, group] of Object.entries(groups)) {
    const _to_srcset = (arr) =>
      arr
        .filter((v) => v.width > 0)
        .sort((a, b) => a.width - b.width)
        .map((v) => `${v.url} ${v.width}w`)
        .join(', ');

    const widths = group.raster.map((v) => v.width);
    const max_width = widths.length > 0 ? Math.max(...widths) : 0;

    manifest[base] = {
      fallback_src:   group.fallback_src
        || (group.raster.length > 0 ? group.raster[group.raster.length - 1].url : null),
      raster_srcset:  _to_srcset(group.raster),
      webp_srcset:    _to_srcset(group.webp),
      avif_srcset:    _to_srcset(group.avif),
      width:  max_width,
      height: 0,
    };
  }

  return manifest;
};

const MANIFEST = _build_manifest();

/**
 * Get the precomputed `<picture>` manifest for an asset basename.
 * @returns {{fallback_src,raster_srcset,webp_srcset,avif_srcset,width,height} | null}
 */
export const useImageManifest = (name) => MANIFEST[name] || null;

export default useImageManifest;
