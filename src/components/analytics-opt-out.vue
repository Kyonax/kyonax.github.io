<script setup>
/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 */

/*
 * The privacy page's analytics opt-out: one toggle button.
 *
 * WHAT IT SWITCHES: one localStorage entry. While `umami.disabled` holds a
 * value, use-analytics never injects the Umami script, and Umami's own tracker
 * checks the same entry before every send — so pressing it stops this page's
 * next events too, and releasing it resumes counting from the next page load.
 * The value is `1` because that is what Umami's docs set; the copy says so.
 *
 * CLIENT ONLY, the ui/client-only.vue way: the state lives in the browser,
 * which the prerender cannot read, so the server and the first client render
 * both emit nothing and the button appears on mount. Nothing is lost without
 * JS: the analytics script is injected by JS, so there is nothing to opt out
 * of. If storage is blocked the button stays hidden — it could not work, and
 * a switch that does nothing is worse than none.
 *
 * TWO STATES, ONE LABEL: `aria-pressed` carries the state to assistive tech,
 * and the square box beside the label fills when pressed. The label never
 * changes, so the accessible name never changes under the reader's cursor.
 *
 * COLOUR: grayscale at rest, in the document's link white. The accent appears
 * only as state — hover and focus (from UiButton) and the pressed switch.
 *
 * SIZE: UiButton's default `md` step is ~30px tall on every tier, past the
 * 24px target floor without a rule of its own. privacy.vue loads this file
 * lazily, as its own chunk, so the privacy chunk's budget pays only for the
 * loader; keep this file small all the same.
 */

import UiButton from '@ui/button.vue';
import { onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';

const OPT_OUT_KEY = 'umami.disabled';

const { t } = useI18n();

const ready = ref(false);
const excluded = ref(false);

const toggle = () => {
  try {
    if (excluded.value) {
      localStorage.removeItem(OPT_OUT_KEY);
    } else {
      localStorage.setItem(OPT_OUT_KEY, '1');
    }
    excluded.value = !excluded.value;
  } catch {
    /* The write failed, so nothing changed — and neither does the button,
       which therefore never shows an opt-out that is not stored. */
  }
};

onMounted(() => {
  try {
    excluded.value = Boolean(localStorage.getItem(OPT_OUT_KEY));
    ready.value = true;
  } catch {
    /* Storage is blocked: the toggle could not work, so it stays hidden. */
  }
});
</script>

<template>
  <UiButton
    v-if="ready"
    class="analytics-opt-out"
    :aria-pressed="String(excluded)"
    @click="toggle"
  >
    <span class="analytics-opt-out__box" aria-hidden="true" />
    {{ t('kyo-web.privacy.opt-out') }}
  </UiButton>
</template>

<style lang="scss" scoped>
/* Takes the prose rhythm (1.4rem) below the copy that points at it, and its
   border starts on that copy's left edge. The rest colour is the document's
   link white (`.kyo-prose a`), so the one control on the page reads like the
   page's other interactive text rather than like UiButton's softer grey. */
.analytics-opt-out {
  margin-top: 1.4rem;
  color: var(--clr-neutral-100);

  &[aria-pressed="true"] {
    color: var(--clr-primary-100);
    border-color: currentColor;
  }

  /* A square check drawn in the button's own colour: an outline at rest,
     filled when pressed, and it follows the accent on hover and focus. */
  &__box {
    flex-shrink: 0;
    width: 0.75em;
    height: 0.75em;
    border: 1px solid currentColor;
  }

  &[aria-pressed="true"] &__box { background: currentColor; }
}
</style>
