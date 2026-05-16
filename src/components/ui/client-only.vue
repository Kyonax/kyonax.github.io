<script setup>
/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 */

import { onMounted, ref } from 'vue';

const mounted = ref(false);
onMounted(() => { mounted.value = true; });
</script>

<template>
  <slot v-if="mounted" />
  <slot v-else name="placeholder">
    <div aria-hidden="true" class="client-only-placeholder" />
  </slot>
</template>
