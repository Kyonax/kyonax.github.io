<script setup>
/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 */

import { nextTick, onBeforeUnmount, ref, watch } from 'vue';

const ModalLockRegistry = (() => {
  let count = 0;
  return {
    set(locked) {
      if (typeof document === 'undefined') return;
      count = Math.max(0, count + (locked ? 1 : -1));
      document.body.style.overflow = count > 0 ? 'hidden' : '';
    },
  };
})();

const props = defineProps({
  isOpen: { type: Boolean, required: true },
  title: { type: String, default: '' },
  subtitle: { type: String, default: '' },
  subtitleHtml: { type: Boolean, default: false },
  size: {
    type: String,
    default: 'md',
    validator: (v) => ['sm', 'md', 'lg', 'full'].includes(v),
  },
  ariaLabel: { type: String, default: '' },
  closeLabel: { type: String, default: 'Close' },
  chromeless: { type: Boolean, default: false },
});

const emit = defineEmits(['close', 'keydown']);

const dialog_ref = ref(null);
let _previous_focus = null;

const FOCUSABLE = [
  'a[href]', 'button:not([disabled])', 'input:not([disabled])',
  'select:not([disabled])', 'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

const _trap_tab = (event) => {
  if (!dialog_ref.value) return;
  const items = dialog_ref.value.querySelectorAll(FOCUSABLE);
  if (!items.length) {
    event.preventDefault();
    dialog_ref.value.focus();
    return;
  }
  const first = items[0];
  const last = items[items.length - 1];
  const active = document.activeElement;
  if (event.shiftKey && (active === first || active === dialog_ref.value)) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && active === last) {
    event.preventDefault();
    first.focus();
  }
};

const onDialogKeydown = (event) => {
  if (event.key === 'Escape') {
    event.stopPropagation();
    emit('close');
    return;
  }
  if (event.key === 'Tab') _trap_tab(event);
  emit('keydown', event);
};

/* Ref-counted: nested modals (image viewer over a project modal)
   must keep the lock until the LAST one closes. */
let _holds_lock = false;

const _set_body_lock = (locked) => {
  if (typeof document === 'undefined') return;
  if (locked === _holds_lock) return;
  _holds_lock = locked;
  ModalLockRegistry.set(locked);
};

watch(
  () => props.isOpen,
  async (open) => {
    _set_body_lock(open);
    if (open) {
      _previous_focus = typeof document !== 'undefined' ? document.activeElement : null;
      await nextTick();
      dialog_ref.value?.focus();
    } else if (_previous_focus && typeof _previous_focus.focus === 'function') {
      _previous_focus.focus();
      _previous_focus = null;
    }
  },
);

onBeforeUnmount(() => {
  if (_holds_lock) _set_body_lock(false);
});

const GLYPH_CLOSE = '\uF00D';
</script>

<template>
  <Transition name="ui-modal">
    <div
      v-if="isOpen"
      class="ui-modal__backdrop"
      @click.self="emit('close')">
      <div
        ref="dialog_ref"
        class="ui-modal__dialog"
        :class="[`ui-modal__dialog--${size}`, { 'ui-modal__dialog--chromeless': chromeless }]"
        role="dialog"
        aria-modal="true"
        :aria-label="ariaLabel || title"
        tabindex="-1"
        @keydown="onDialogKeydown">
        <header v-if="!chromeless" class="ui-modal__header">
          <div class="ui-modal__titles">
            <h1 v-if="title" class="ui-modal__title">{{ title }}</h1>
            <p
              v-if="subtitle && subtitleHtml"
              class="ui-modal__subtitle"
              v-html="subtitle" />
            <p v-else-if="subtitle" class="ui-modal__subtitle">{{ subtitle }}</p>
          </div>
          <button
            type="button"
            class="ui-modal__close"
            :aria-label="closeLabel"
            @click="emit('close')">
            <span class="icon-glyph" :data-text="GLYPH_CLOSE" aria-hidden="true" />
          </button>
        </header>

        <button
          v-if="chromeless"
          type="button"
          class="ui-modal__close ui-modal__close--floating"
          :aria-label="closeLabel"
          @click="emit('close')">
          <span class="icon-glyph" :data-text="GLYPH_CLOSE" aria-hidden="true" />
        </button>

        <div class="ui-modal__body" :class="{ 'ui-modal__body--tight': chromeless }">
          <slot />
        </div>

        <footer v-if="$slots.footer" class="ui-modal__footer">
          <slot name="footer" />
        </footer>
      </div>
    </div>
  </Transition>
</template>

<style lang="scss" scoped>
.ui-modal {
  &__backdrop {
    position: fixed;
    inset: 0;
    z-index: 200;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
    background: color-mix(in srgb, var(--clr-neutral-500) 78%, transparent);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);

    @include max-media-query(md) {
      padding: 0.5rem;
    }
  }

  &__dialog {
    position: relative;
    background: color-mix(in srgb, var(--clr-neutral-500) 92%, var(--clr-primary-100) 4%);
    border: 1px solid var(--clr-border-100);
    width: 100%;
    max-width: 95dvw;
    max-height: 95dvh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    isolation: isolate;

    &--sm   { max-width: min(95dvw, 480px); }
    &--md   { max-width: min(95dvw, 760px); }
    &--lg   { max-width: min(95dvw, 1040px); }
    &--full { max-width: 95dvw; max-height: 95dvh; }

    &--chromeless {
      width: auto;
      height: auto;
      max-width: none;
      max-height: none;
      background: var(--clr-neutral-500);
    }
  }

  &__header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
    padding: 1.5rem 1.5rem 1.1rem;
    border-bottom: 1px solid var(--clr-border-100);
    flex-shrink: 0;
  }

  &__titles {
    flex: 1;
    min-width: 0;
  }

  &__title {
    font-family: "Geomanist", sans-serif;
    font-size: var(--fs-500);
    font-weight: 700;
    color: var(--clr-primary-100);
    margin: 0 0 0.35rem;
    letter-spacing: 0.02em;
    line-height: 1.2;
  }

  &__subtitle {
    font-family: "SpaceMono", monospace;
    font-size: var(--fs-200);
    color: var(--clr-neutral-300);
    letter-spacing: 0.06em;
    margin: 0;

    :deep(strong) {
      color: var(--clr-neutral-100);
      font-weight: 700;
    }
  }

  &__close {
    background: transparent;
    border: 1px solid var(--clr-border-100);
    color: var(--clr-neutral-100);
    width: 38px;
    height: 38px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    flex-shrink: 0;
    padding: 0;
    line-height: 1;
    transition: border-color 0.2s ease, color 0.2s ease;

    .icon-glyph { transform: translateY(0); }

    &:hover,
    &:focus-visible {
      border-color: var(--clr-primary-100);
      color: var(--clr-primary-100);
    }

    &--floating {
      position: absolute;
      top: 1rem;
      right: 1rem;
      z-index: 4;
      width: 40px;
      height: 40px;
      background: color-mix(in srgb, var(--clr-neutral-500) 80%, transparent);
      backdrop-filter: blur(4px);
      -webkit-backdrop-filter: blur(4px);
    }
  }

  &__body {
    overflow-y: auto;
    overscroll-behavior: contain;
    padding: 1.25rem 1.5rem;
    flex: 1;
    scrollbar-width: thin;
    scrollbar-color: var(--clr-primary-100) color-mix(in srgb, var(--clr-neutral-500) 60%, transparent);

    &--tight {
      padding: 0.4rem;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      overflow: visible;
      flex: 0 0 auto;
    }

    &::-webkit-scrollbar {
      width: 5px;
    }
    &::-webkit-scrollbar-track {
      background: color-mix(in srgb, var(--clr-neutral-500) 60%, transparent);
      border-left: 1px solid var(--clr-border-100);
    }
    &::-webkit-scrollbar-thumb {
      background:
        linear-gradient(
          180deg,
          color-mix(in srgb, var(--clr-primary-100) 22%, var(--clr-neutral-500)),
          color-mix(in srgb, var(--clr-primary-100) 14%, var(--clr-neutral-500))
        );
      border: 1px solid color-mix(in srgb, var(--clr-primary-100) 40%, transparent);
      border-radius: 0;
      background-clip: padding-box;
    }
    &::-webkit-scrollbar-thumb:hover {
      background:
        linear-gradient(
          180deg,
          color-mix(in srgb, var(--clr-primary-100) 55%, var(--clr-neutral-500)),
          color-mix(in srgb, var(--clr-primary-100) 35%, var(--clr-neutral-500))
        );
      border-color: var(--clr-primary-100);
    }
    &::-webkit-scrollbar-corner {
      background: transparent;
    }
  }

  &__footer {
    padding: 1rem 1.5rem;
    border-top: 1px solid var(--clr-border-100);
    flex-shrink: 0;
  }
}

.ui-modal-enter-active,
.ui-modal-leave-active {
  transition: opacity 0.25s ease;

  .ui-modal__dialog {
    transition: transform 0.25s ease, opacity 0.25s ease;
  }
}

.ui-modal-enter-from,
.ui-modal-leave-to {
  opacity: 0;

  .ui-modal__dialog {
    opacity: 0;
    transform: translateY(8px);
  }
}
</style>
