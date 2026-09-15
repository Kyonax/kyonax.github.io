<script setup>
/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 */

/*
 * The blog hero's ASCII galaxy: 96 × 42 characters, 36 frames, one turn every
 * 7.2 s, three greys and a vignette — the validated design's hero picture.
 *
 * ITS OWN CHUNK. blog-hero.vue loads it through defineAsyncComponent, so the
 * frame maths and the loop never ride in the archive's chunk. The file name is
 * the chunk name — `ascii-galaxy-*`, deliberately not `blog-*`, or the
 * archive's size glob would count it.
 *
 * FRAME 0 IS IN THE PRERENDERED HTML. vite-ssg awaits async components, and
 * the frame is a pure function of its phase, so Node draws the same <pre> the
 * browser hydrates; the loop (use-ascii-galaxy) only starts after mount.
 *
 * `v-html` BECAUSE A FRAME IS MARKUP: runs of one tone wrapped in <i> (mid) and
 * <b> (bright). The string is built from a fixed ten-character ramp — nothing
 * in it comes from content or a reader, and nothing in it needs escaping.
 *
 * DECORATION ONLY, so aria-hidden: the hero carries a visually hidden sentence
 * describing it, and type.spec.js skips hidden nodes when it ranks headings.
 */

import { useAsciiGalaxy } from '@composables/use-ascii-galaxy';
import { ref } from 'vue';

const pre_ref = ref(null);
const { markup } = useAsciiGalaxy(pre_ref);
</script>

<template>
  <pre
    ref="pre_ref"
    class="ascii-galaxy"
    aria-hidden="true"
    v-html="markup"
  />
</template>

<style lang="scss" scoped>
/* GALAXY_COLS × GALAXY_ROWS in ascii-galaxy-frame.js. */
$cols: 96;
$rows: 42;

/*
 * FIXED METRICS, ONE PAIR PER TIER — the picture is a character grid, so its
 * size is set, never measured.
 *
 * The phone and desktop pairs are the design's (6.1 / 6.6 and 11.5 / 12.5).
 * Between them the hero is two columns and the panel is at its narrowest, so
 * each step is sized to fit the panel at the NARROW end of its band: 96
 * columns of SpaceMono are 58.75em, the panel is 376px wide at 768px and 498px
 * at 1024px, so 6.3px (370px) and 8.3px (488px) keep every column inside it.
 *
 * THE BOX IS SIZED IN CHARACTERS (`96ch` × 42 lines), not by its content.
 * Every row is 96 characters, but a glyph the face lacks falls back to another
 * monospace with its own advance; a content-sized box would then change width
 * from frame to frame and the centred picture would shimmer sideways. With a
 * fixed box the rewrite is also free to stay inside it — `contain: strict`
 * keeps each frame's relayout from reaching the page.
 *
 * `flex: none` because the panel centres it: a picture wider than its panel
 * (the fixed desktop pair at the low end of `lg`) overflows both sides equally
 * and the panel clips the margins, instead of shrinking the box and pushing
 * the galaxy's centre off to the right.
 */
.ascii-galaxy {
  --galaxy-fs: 6.1px;
  --galaxy-lh: 6.6px;

  position: relative;
  flex: none;
  width: #{$cols}ch;
  height: calc(#{$rows} * var(--galaxy-lh));
  margin: 0;
  overflow: hidden;
  contain: strict;
  color: var(--clr-neutral-350);
  font-family: "SpaceMono", monospace;
  font-size: var(--galaxy-fs);
  line-height: var(--galaxy-lh);
  /* The body's -0.03rem tracking would pull the grid out of its box. */
  letter-spacing: 0;
  white-space: pre;

  @include between-media-query(sm, md) {
    --galaxy-fs: 6.3px;
    --galaxy-lh: 6.8px;
  }

  @include between-media-query(md, lg) {
    --galaxy-fs: 8.3px;
    --galaxy-lh: 9px;
  }

  @include min-media-query(lg) {
    --galaxy-fs: 11.5px;
    --galaxy-lh: 12.5px;
  }

  /* The vignette: clear through the middle, the page ground at the corners,
     so the disc dissolves into the panel rather than ending on a box. */
  &::after {
    content: "";
    position: absolute;
    inset: 0;
    background: radial-gradient(
      ellipse at center,
      transparent 55%,
      var(--clr-neutral-500) 100%
    );
    pointer-events: none;
  }

  /* The frame's runs arrive through v-html and carry no scope id. They are
     tones, not emphasis: same face, same weight, only the grey changes. */
  :deep(i) {
    font-style: normal;
    color: var(--clr-neutral-200);
  }

  :deep(b) {
    font-weight: 400;
    color: var(--clr-neutral-100);
  }
}
</style>
