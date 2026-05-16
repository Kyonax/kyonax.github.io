<script setup>
/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 */

import useClickOutside from '@composables/use-click-outside';
import useLanguage from '@composables/use-language';
import UiButton from '@ui/button.vue';
import { nextTick,ref } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
const { locale, supportedLanguages, setLanguage } = useLanguage();

const open = ref(false);
const root = ref(null);
const trigger = ref(null);
const item_refs = ref([]);

useClickOutside(root, () => {
  open.value = false; 
});

const focusItem = (idx) => {
  const els = item_refs.value;
  if (!els.length) {
    return;
  }
  const wrapped = (idx + els.length) % els.length;
  const target = els[wrapped];
  if (target && typeof target.focus === 'function') {
    target.focus();
  }
};

const openMenu = async () => {
  open.value = true;
  await nextTick();
  const idx = supportedLanguages.findIndex((c) => c === locale.value);
  focusItem(idx > -1 ? idx : 0);
};

const closeMenu = (returnFocus = true) => {
  open.value = false;
  if (returnFocus && trigger.value && typeof trigger.value.$el?.focus === 'function') {
    trigger.value.$el.focus();
  }
};

const onTriggerClick = () => {
  if (open.value) {
    closeMenu(false);
  } else {
    openMenu();
  }
};

const select = (code) => {
  setLanguage(code);
  closeMenu();
};

const onTriggerKeydown = (event) => {
  if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    openMenu();
  }
};

const ITEM_KEY_HANDLERS = {
  ArrowDown: (idx) => focusItem(idx + 1),
  ArrowUp:   (idx) => focusItem(idx - 1),
  Home:      ()    => focusItem(0),
  End:       ()    => focusItem(item_refs.value.length - 1),
  Escape:    ()    => closeMenu(),
  // Tab intentionally lets focus leave naturally (no preventDefault).
  Tab:       ()    => {
    open.value = false; 
  },
};

const onItemKeydown = (event, idx) => {
  const handler = ITEM_KEY_HANDLERS[event.key];
  if (!handler) {
    return;
  }
  if (event.key !== 'Tab') {
    event.preventDefault();
  }
  handler(idx);
};

const setItemRef = (el, idx) => {
  if (!el) {
    return;
  }
  item_refs.value[idx] = el;
};
</script>

<template>
  <div ref="root" class="language-toggle">
    <UiButton
      ref="trigger"
      variant="primary"
      size="sm"
      class="language-toggle__button"
      :class="{ 'is-open': open }"
      :aria-expanded="open"
      aria-haspopup="menu"
      aria-controls="language-toggle-menu"
      :aria-label="t('kyo-web.widget.trans-lang.button-aria')"
      @click="onTriggerClick"
      @keydown="onTriggerKeydown"
    >
      <span class="language-toggle__current">
        {{ t('kyo-web.widget.trans-lang.current') }}
      </span>
      <span class="language-toggle__chevron" aria-hidden="true" />
    </UiButton>

    <ul
      v-show="open"
      id="language-toggle-menu"
      class="language-toggle__list"
      role="menu"
    >
      <li
        v-for="(code, idx) in supportedLanguages"
        :key="code"
        role="none"
      >
        <button
          :id="`language-option-${code}`"
          :ref="(el) => setItemRef(el, idx)"
          type="button"
          role="menuitemradio"
          :aria-checked="locale === code"
          :tabindex="open ? 0 : -1"
          class="language-toggle__item"
          :class="{ 'is-active': locale === code }"
          @click="select(code)"
          @keydown="onItemKeydown($event, idx)"
        >
          {{ t(`kyo-web.widget.trans-lang.${code}`) }}
        </button>
      </li>
    </ul>
  </div>
</template>

<style lang="scss" scoped>
.language-toggle {
  position: relative;
  display: inline-block;
  font-family: "SpaceMono", monospace;

  &__button {
    
    min-width: 4.25rem;
    padding-left: 0.7rem;
    padding-right: 0.7rem;
    white-space: nowrap;

    
    @include max-media-query(md) {
      height: 44px;
      min-height: 44px;
    }
  }

  &__current { line-height: 1; }

  &__chevron {
    display: inline-block;
    width: 0;
    height: 0;
    border-left: 4px solid transparent;
    border-right: 4px solid transparent;
    border-top: 5px solid currentColor;
    transition: transform 0.2s ease;
  }

  &__button.is-open &__chevron {
    transform: rotate(180deg);
  }

  &__list {
    position: absolute;
    top: calc(100% + 0.25rem);
    right: 0;
    min-width: 9rem;
    list-style: none;
    margin: 0;
    padding: 0.25rem 0;
    background: var(--clr-neutral-500);
    border: 1px solid var(--clr-border-100);
    z-index: 10;
  }

  &__item {
    display: block;
    width: 100%;
    text-align: left;
    background: transparent;
    border: 0;
    padding: 0.5rem 0.9rem;
    cursor: pointer;
    color: var(--clr-neutral-100);
    font-family: inherit;
    font-size: var(--fs-300);
    letter-spacing: 0.06em;
    white-space: nowrap;
    transition: background-color 0.15s ease, color 0.15s ease;

    &:hover,
    &:focus-visible {
      color: var(--clr-neutral-50);
      background: color-mix(in srgb, var(--clr-primary-100) 15%, transparent);
    }

    &.is-active {
      color: var(--clr-primary-100);
      font-weight: 700;
    }
  }
}
</style>
