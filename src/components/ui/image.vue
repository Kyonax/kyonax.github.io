<script setup>
/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 */

import { computed } from 'vue';

import BlastImage from '@components/blast-image.vue';

const props = defineProps({
  img:      { type: String,  required: true },
  alt:      { type: String,  default: '' },
  eager:    { type: Boolean, default: false },
  sizes:    { type: String,  default: '(max-width: 768px) 80vw, 25vw' },
  aspect:   { type: String,  default: '1 / 1' },
  size:     {
    type: [Number, Object],
    default: () => ({ sm: 140, md: 180, lg: 200 }),
  },
  fit:      {
    type: String,
    default: 'cover',
    validator: (v) => ['cover', 'contain', 'fill', 'none', 'scale-down'].includes(v),
  },
  position: { type: String,  default: 'center' },
  scale:    { type: Number,  default: 1 },
  framed:   { type: Boolean, default: false },
});
const frame_style = computed(() => {
  const style = {
    aspectRatio: props.aspect,
    '--image-fit': props.fit,
    '--image-position': props.position,
    '--image-scale': props.scale,
  };

  if (typeof props.size === 'number') {
    style.width = `${props.size}px`;
  } else {
    
    if (props.size.sm !== undefined) style['--image-size-sm'] = `${props.size.sm}px`;
    if (props.size.md !== undefined) style['--image-size-md'] = `${props.size.md}px`;
    if (props.size.lg !== undefined) style['--image-size-lg'] = `${props.size.lg}px`;
    if (props.size.xl !== undefined) style['--image-size-xl'] = `${props.size.xl}px`;
  }

  return style;
});

const wrapper_class = computed(() => [
  'ui-image',
  props.framed ? 'ui-image--framed' : null,
]);
</script>

<template>
  <div :class="wrapper_class">
    <div
      class="ui-image__frame"
      :style="frame_style">
      <BlastImage
        class="ui-image__picture"
        :img="img"
        :alt="alt || img"
        :eager="eager"
        :sizes="sizes" />
    </div>
  </div>
</template>

<style lang="scss" scoped>
.ui-image {
  display: inline-block;
  margin: 0 auto;

  &--framed {
    border: 1px solid var(--clr-border-100);
    padding: 0.25rem;
  }

  &__frame {
    
    position: relative;
    overflow: hidden;
    background-color: var(--clr-neutral-400);

    /* Breakpoint-aware width, driven by the --image-size-* custom props. */
    width: var(--image-size-sm, 140px);

    @include min-media-query(md) {
      width: var(--image-size-md, var(--image-size-sm, 180px));
    }

    @include min-media-query(lg) {
      width: var(--image-size-lg, var(--image-size-md, var(--image-size-sm, 200px)));
    }

    @include min-media-query(xl) {
      width: var(--image-size-xl, var(--image-size-lg, var(--image-size-md, var(--image-size-sm, 200px))));
    }
  }

  &__picture {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;

    /* The <img> inside <picture> needs the cropping treatment. */
    :deep(img) {
      width: 100%;
      height: 100%;
      object-fit: var(--image-fit, cover);
      object-position: var(--image-position, center);
      transform: scale(var(--image-scale, 1));
      transform-origin: var(--image-position, center);
    }
  }
}
</style>
