<script setup>
/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 */

import { ref, onMounted, computed, nextTick, watch } from 'vue';
import { useI18n } from 'vue-i18n';

const { t, locale } = useI18n();
const STORAGE_KEY = 'kyo:consent';

const privacy_href = computed(() => (locale.value === 'es' ? '/es/privacy' : '/privacy'));

const open = ref(false);
const decline_btn = ref(null);

const _update = (granted) => {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') return;
  const value = granted ? 'granted' : 'denied';
  window.gtag('consent', 'update', {
    ad_storage:         value,
    ad_user_data:       value,
    ad_personalization: value,
    analytics_storage:  value,
  });
};

const accept = () => {
  try { localStorage.setItem(STORAGE_KEY, 'granted'); } catch { /* private mode */ }
  _update(true);
  open.value = false;
};

const decline = () => {
  try { localStorage.setItem(STORAGE_KEY, 'denied'); } catch { /* private mode */ }
  _update(false);
  open.value = false;
};

const onKeydown = (event) => {
  if (event.key === 'Escape') {
    event.preventDefault();
    decline();
  }
};

watch(open, async (is_open) => {
  if (!is_open) return;
  await nextTick();
  if (decline_btn.value && typeof decline_btn.value.focus === 'function') {
    decline_btn.value.focus();
  }
});

onMounted(() => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    open.value = stored !== 'granted' && stored !== 'denied';
  } catch {
    open.value = true;
  }
});
</script>

<template>
  <aside
    v-if="open"
    class="cookie-consent"
    role="region"
    aria-live="polite"
    :aria-label="t('kyo-web.landing.consent.aria')"
    @keydown="onKeydown"
  >
    <p class="cookie-consent__copy">
      {{ t('kyo-web.landing.consent.copy') }}
      <a class="cookie-consent__link" :href="privacy_href">{{ t('kyo-web.landing.consent.privacy') }}</a>
    </p>
    <div class="cookie-consent__actions">
      <button
        ref="decline_btn"
        type="button"
        class="cookie-consent__btn cookie-consent__btn--ghost"
        @click="decline">
        {{ t('kyo-web.landing.consent.decline') }}
      </button>
      <button
        type="button"
        class="cookie-consent__btn cookie-consent__btn--primary"
        @click="accept">
        {{ t('kyo-web.landing.consent.accept') }}
      </button>
    </div>
  </aside>
</template>

<style lang="scss" scoped>
.cookie-consent {
  position: fixed;
  bottom: 1rem;
  right: 1rem;
  left: 1rem;
  z-index: 900;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  max-width: 520px;
  margin-left: auto;
  padding: 1.25rem 1.4rem;
  background: color-mix(in srgb, var(--clr-neutral-500) 88%, transparent);
  border: 1px solid var(--clr-border-100);
  border-radius: 0;
  backdrop-filter: blur(8px);
  font-family: "SpaceMono", monospace;
  font-size: var(--fs-300);
  color: var(--clr-neutral-100);
  box-shadow: 0 4px 20px color-mix(in srgb, var(--clr-neutral-500) 60%, transparent);

  &__copy {
    margin: 0;
    line-height: 1.55;
    letter-spacing: 0.01em;
  }
  &__link {
    color: var(--clr-primary-100);
    text-decoration: underline;
    text-underline-offset: 0.18em;
    margin-left: 0.35rem;
  }
  &__actions {
    display: flex;
    gap: 0.75rem;
    justify-content: flex-end;
  }
  &__btn {
    padding: 0.65rem 1.15rem;
    font-family: inherit;
    font-size: var(--fs-200);
    letter-spacing: 0.08em;
    text-transform: uppercase;
    border: 1px solid var(--clr-border-100);
    background: transparent;
    color: var(--clr-neutral-100);
    cursor: pointer;
    transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease;

    &--primary {
      background: var(--clr-primary-100);
      color: var(--clr-neutral-500);
      border-color: var(--clr-primary-100);
    }
    &:hover,
    &:focus-visible {
      background: var(--clr-primary-100);
      color: var(--clr-neutral-500);
      border-color: var(--clr-primary-100);
    }
    &:focus-visible {
      outline: 2px solid var(--clr-neutral-50);
      outline-offset: 2px;
    }
  }
}
</style>
