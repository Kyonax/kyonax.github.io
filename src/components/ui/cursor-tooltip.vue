<script setup>
/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 *
 * CursorTooltip — the one Teleport + Transition wrapper every
 * cursor-following tooltip shares. Measures its own width once per
 * reveal, then flips to open bottom-left of the cursor whenever
 * bottom-right would cross the viewport's right edge.
 *
 * Usage:
 *   <CursorTooltip :visible="visible" :x="x" :y="y">label</CursorTooltip>
 */

import { computed, onMounted, ref, watch } from 'vue';

const props = defineProps({
  visible: { type: Boolean, required: true },
  x: { type: Number, required: true },
  y: { type: Number, required: true },
});

/* Mirrors the 10px cursor offset baked into .kyo-cursor-tooltip. */
const OFFSET_X = 10;
const EDGE_PAD = 4;

const is_mounted = ref(false);
onMounted(() => {
  is_mounted.value = true;
});

const tip_ref = ref(null);
const tip_width = ref(0);

/* flush:'post' so the node exists; one rect read per reveal, never per move. */
watch(() => props.visible, (shown) => {
  if (shown) {
    tip_width.value = tip_ref.value?.getBoundingClientRect().width ?? 0;
  }
}, { flush: 'post' });

const flipped = computed(() =>
  props.x + OFFSET_X + tip_width.value + EDGE_PAD > window.innerWidth
  && props.x - OFFSET_X - tip_width.value - EDGE_PAD >= 0,
);
</script>

<template>
  <Teleport v-if="is_mounted" to="body">
    <Transition name="kyo-ct">
      <div
        v-if="visible"
        ref="tip_ref"
        class="kyo-cursor-tooltip"
        :class="{ 'kyo-cursor-tooltip--flip': flipped }"
        :style="{ left: `${x}px`, top: `${y}px` }"
      >
        <slot />
      </div>
    </Transition>
  </Teleport>
</template>
