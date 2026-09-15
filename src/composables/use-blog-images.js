/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 */

/*
 * use-blog-images.js — resolve a post's card image to a real asset.
 *
 * org2html does NOT copy content images and --asset-base does not rewrite
 * their URLs; both are scoped to the assets the engine itself writes. So the
 * blog repo keeps its images in media/, scripts/sync-blog.mjs copies them into
 * src/assets/blog/, and the site's own pipeline (scripts/convert-images.mjs)
 * emits the AVIF/WebP siblings and records intrinsic dimensions.
 *
 * WIDTH AND HEIGHT ARE THE POINT. Without them the card grid reflows as each
 * image lands, and the Lighthouse assertion this site holds itself to is
 * cumulative-layout-shift <= 0.1 as an ERROR, not a warning.
 *
 * AND SO ARE THE WIDTHS. The pipeline also cuts every blog source at a few
 * smaller widths (`<stem>-480.avif` and so on, the landing's naming), and the
 * card reads them as one srcset per format: a phone takes a file cut for its
 * column, not the 1280px original. Which steps exist is read from the
 * dimensions sidecar, not guessed from the files — sync-blog.mjs never clears
 * src/assets/blog/, so a step from an older ladder may still be lying there.
 *
 * The result has the shape use-image-manifest.js gives the landing's
 * pictures, so blog-picture.vue reads like blast-image.vue.
 *
 * A local eager glob rather than use-image-manifest.js, following the
 * precedent in now-projects-section.vue: that manifest globs only
 * {app,testimonials}, and blog media is a separate, generated directory.
 */

import IMAGE_DIMENSIONS from '@data/image-dimensions.generated.json';

/* `no-inline`: Vite writes any asset under 4,096 bytes into the importing
   chunk as a data: URL, and this glob is eager. The smallest step today, a
   flat diagram's 480px AVIF, is 4,442 bytes — one simpler cover and it would
   ride inside the archive chunk as base64 on every visit, whether its post is
   on the page or not. So every blog image stays a file of its own. */
const FILES = import.meta.glob('@assets/blog/**/*.{jpg,jpeg,png,webp,avif}', {
  eager: true,
  query: '?url&no-inline',
  import: 'default',
});

const baseOf = (p) => String(p || '').split('/').pop() || '';
const stemOf = (name) => {
  const dot = name.lastIndexOf('.');
  return dot > 0 ? name.slice(0, dot) : name;
};

/* basename -> served URL, for every raster the sync copied in. */
const BY_NAME = new Map();
for (const [path, url] of Object.entries(FILES)) {
  BY_NAME.set(baseOf(path), url);
}

/* stem -> { w, h, widths }, as convert-images.mjs recorded it. */
const DIMENSIONS = new Map(Object.entries(IMAGE_DIMENSIONS));

/*
 * One format's srcset: the steps that exist, then the full-size sibling at the
 * source's own width. Ascending, because the steps are cut in ladder order and
 * only below the source width. With no dimensions there is no width to
 * describe, so the sibling goes alone — a valid srcset of one candidate.
 */
const srcsetOf = (stem, ext, dims) => {
  const full = BY_NAME.get(`${stem}.${ext}`);
  if (!full) {
    return null;
  }
  if (!dims) {
    return full;
  }
  const steps = (dims.widths || [])
    .map((w) => ({ url: BY_NAME.get(`${stem}-${w}.${ext}`), w }))
    .filter((step) => step.url);
  return [...steps, { url: full, w: dims.w }]
    .map((step) => `${step.url} ${step.w}w`)
    .join(', ');
};

/**
 * The card image for a post, or null when it has none — which is a normal
 * state, not an error: #+HERO_IMAGE is deliberately outside the engine's card
 * ranking, so a hero-only post renders the text variant.
 * @returns {{fallback_src,avif_srcset,webp_srcset,width,height} | null}
 */
export const blogCardImage = (post) => {
  if (!post || !post.cardImage) {
    return null;
  }
  const name = baseOf(post.cardImage);
  const fallback = BY_NAME.get(name);
  if (!fallback) {
    return null;
  }
  const stem = stemOf(name);
  const dims = DIMENSIONS.get(stem) || null;
  return {
    fallback_src: fallback,
    avif_srcset: srcsetOf(stem, 'avif', dims),
    webp_srcset: srcsetOf(stem, 'webp', dims),
    width: dims ? dims.w : null,
    height: dims ? dims.h : null,
  };
};

export default { blogCardImage };
