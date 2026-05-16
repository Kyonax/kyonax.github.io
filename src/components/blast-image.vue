<script setup>
/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 */

import useImageManifest from '@composables/use-image-manifest';
import { computed } from 'vue';

const props = defineProps({
  img:   { type: String, required: true },
  alt:   { type: String, default: '' },
  eager: { type: Boolean, default: false },
  sizes: {
    type: String,
    default: '(max-width: 768px) 300px, 600px',
  },
});

const manifest = computed(() => useImageManifest(props.img));

const has_avif = computed(() => Boolean(manifest.value?.avif_srcset));
const has_webp = computed(() => Boolean(manifest.value?.webp_srcset));

const alt_text = computed(() => props.alt || props.img);
</script>

<template>
  <picture v-if="manifest">
    <source
      v-if="has_avif"
      type="image/avif"
      :srcset="manifest.avif_srcset"
      :sizes="sizes"
    />

    <source
      v-if="has_webp"
      type="image/webp"
      :srcset="manifest.webp_srcset"
      :sizes="sizes"
    />

    <img
      :src="manifest.fallback_src"
      :srcset="manifest.raster_srcset || undefined"
      :sizes="manifest.raster_srcset ? sizes : undefined"
      :width="manifest.width || undefined"
      :height="manifest.height || undefined"
      :alt="alt_text"
      :loading="eager ? 'eager' : 'lazy'"
      :fetchpriority="eager ? 'high' : 'auto'"
      decoding="async"
    />
  </picture>
</template>
