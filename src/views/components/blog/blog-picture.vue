<script setup>
/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 */

/*
 * A blog cover as a <picture>: AVIF first, then WebP, each a srcset of the
 * widths scripts/convert-images.mjs cut, and the original raster as the <img>
 * a browser falls back to. It is the landing's blast-image.vue fed by
 * use-blog-images.js instead of the landing's manifest — the same markup, so
 * the two pipelines differ only in where their files come from.
 *
 * `sizes` IS THE CALLER'S, because only the caller knows the column the
 * picture sits in, and the browser chooses a file from `sizes` before any
 * stylesheet has told it how wide the box will be.
 *
 * EVERY COVER WAITS FOR THE VIEWPORT, the lead included. Measured on /blog
 * (2026-09-15): the lead sits under the hero on a phone (its top at 1394px on
 * a 390 × 844 screen), on a 900px-tall laptop and in both Lighthouse setups,
 * where the page's largest paint is the hero's title. Fetching it at once and
 * at high priority would race the stylesheets and fonts that paint is waiting
 * on; lazy costs nothing where it is in view, since the browser starts a lazy
 * image as soon as layout puts it near the viewport.
 *
 * It fills whatever box it is put in and owns no aspect ratio: the frame
 * around it reserves the space, and the <img> carries the source's own width
 * and height so the box is known before a byte of the image arrives.
 */
defineProps({
  media: { type: Object, required: true },
  alt: { type: String, default: '' },
  sizes: { type: String, required: true },
});
</script>

<template>
  <picture class="blog-picture">
    <source
      v-if="media.avif_srcset"
      type="image/avif"
      :srcset="media.avif_srcset"
      :sizes="sizes"
    />
    <source
      v-if="media.webp_srcset"
      type="image/webp"
      :srcset="media.webp_srcset"
      :sizes="sizes"
    />
    <img
      class="blog-picture__img"
      :src="media.fallback_src"
      :width="media.width"
      :height="media.height"
      :alt="alt"
      loading="lazy"
      decoding="async"
    />
  </picture>
</template>

<style lang="scss" scoped>
/* A block that fills its frame in both axes. Left inline, which is what a
   <picture> is by default, it would hold the block <img> inside an inline box,
   and the frame would lay out anonymous line boxes around it. */
.blog-picture {
  display: block;
  width: 100%;
  height: 100%;
}

.blog-picture__img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}
</style>
