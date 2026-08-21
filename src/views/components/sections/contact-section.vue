<script setup>
/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 */

import useInViewport from '@composables/use-in-viewport';
import { CONTACT_CONFIG, CONTACT_SERVICES } from '@data/data';
import UiButton from '@ui/button.vue';
import UiLink from '@ui/link.vue';
import { computed, reactive, ref } from 'vue';
import { useI18n } from 'vue-i18n';

const { whatsappNumber, bookingUrl } = CONTACT_CONFIG;

const booking_href = !bookingUrl || bookingUrl === 'TODO' ? '' : bookingUrl;

const { t } = useI18n();

const section_ref = ref(null);
useInViewport(section_ref);

const form = reactive({ name: '', email: '', message: '' });
const is_touched = reactive({ name: false, email: false });
const selected_services = ref([]);
const action_feedback = ref('');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const email_error = computed(() => (
  is_touched.email && !EMAIL_RE.test(form.email)
    ? t('kyo-web.landing.contact.form.email-error')
    : ''
));
const is_valid = computed(() => (
  form.name.trim().length > 0 && EMAIL_RE.test(form.email)
));
const mailto_href = computed(() => {
  const svc = selected_services.value
    .map((s) => t(`kyo-web.landing.contact.services.${s}`))
    .join(' + ');
  const subject = svc
    ? `${svc} · ${form.name}`
    : `Web Development Inquiry · ${form.name}`;
  const lines = [
    `Name: ${form.name}`,
    `Email: ${form.email}`,
    svc ? `Service: ${svc}` : '',
    form.message.trim() ? `\nMessage:\n${form.message.trim()}` : '',
  ].filter(Boolean).join('\n');
  return `mailto:kyonax.corp@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines)}`;
});
const name_error = computed(() => (
  is_touched.name && form.name.trim().length === 0
    ? t('kyo-web.landing.contact.form.name-error')
    : ''
));
const whatsapp_href = computed(() => {
  if (!whatsappNumber || whatsappNumber === 'TODO') {
    return '';
  }
  const svc = selected_services.value
    .map((s) => t(`kyo-web.landing.contact.services.${s}`))
    .join(' + ');
  const msg = svc
    ? `Hi Cristian, I am interested in your ${svc} services.`
    : 'Hi Cristian, I would like to work with you.';
  return `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(msg)}`;
});

function toggle_service(svc) {
  const list = selected_services.value;
  const idx = list.indexOf(svc);
  if (idx === -1) {
    list.push(svc);
  } else {
    list.splice(idx, 1);
  }
  action_feedback.value = t(
    idx === -1
      ? 'kyo-web.landing.contact.form.feedback-select'
      : 'kyo-web.landing.contact.form.feedback-deselect',
    { svc: t(`kyo-web.landing.contact.services.${svc}`) },
  );
}

function touch(field) {
  is_touched[field] = true;
}

function send_request() {
  if (!is_valid.value) {
    is_touched.name = true;
    is_touched.email = true;
    return;
  }
  action_feedback.value = t('kyo-web.landing.contact.form.feedback-submit');
  window.location.href = mailto_href.value;
}
</script>

<template>
  <section
    id="contact"
    ref="section_ref"
    class="contact-section kyo-section"
    :aria-label="t('kyo-web.landing.contact.section-aria')"
  >
    <h2 class="contact-section__lead kyo-prose">
      {{ t('kyo-web.landing.contact.lead') }}
    </h2>

    <div class="sr-only" aria-live="polite" aria-atomic="true">
      {{ action_feedback }}
    </div>

    <form class="contact-section__form" novalidate @submit.prevent="send_request">
      <div class="contact-section__field">
        <label class="contact-section__label" for="contact-name">
          {{ t('kyo-web.landing.contact.form.name-label') }}
        </label>
        <input
          id="contact-name"
          v-model="form.name"
          type="text"
          class="contact-section__input"
          :placeholder="t('kyo-web.landing.contact.form.name-placeholder')"
          autocomplete="name"
          required
          aria-required="true"
          :aria-invalid="!!name_error"
          aria-describedby="contact-name-error"
          @blur="touch('name')"
        />
        <span
          id="contact-name-error"
          class="sr-only"
          role="alert"
          aria-live="polite"
        >{{ name_error }}</span>
      </div>

      <div class="contact-section__field">
        <label class="contact-section__label" for="contact-email">
          {{ t('kyo-web.landing.contact.form.email-label') }}
        </label>
        <input
          id="contact-email"
          v-model="form.email"
          type="email"
          class="contact-section__input"
          :placeholder="t('kyo-web.landing.contact.form.email-placeholder')"
          autocomplete="email"
          required
          aria-required="true"
          :aria-invalid="!!email_error"
          aria-describedby="contact-email-error"
          @blur="touch('email')"
        />
        <span
          id="contact-email-error"
          class="sr-only"
          role="alert"
          aria-live="polite"
        >{{ email_error }}</span>
      </div>

      <div class="contact-section__field">
        <fieldset class="contact-section__services">
          <legend class="contact-section__label">
            {{ t('kyo-web.landing.contact.form.service-label') }}
          </legend>
          <div class="contact-section__chips">
            <button
              v-for="svc in CONTACT_SERVICES"
              :key="svc"
              type="button"
              class="contact-section__service-chip"
              :class="{ 'is-selected': selected_services.includes(svc) }"
              :aria-pressed="String(selected_services.includes(svc))"
              @click="toggle_service(svc)"
            >
              {{ t(`kyo-web.landing.contact.services.${svc}`) }}
            </button>
          </div>
        </fieldset>
      </div>

      <div class="contact-section__field">
        <label class="contact-section__label" for="contact-message">
          {{ t('kyo-web.landing.contact.form.message-label') }}
        </label>
        <textarea
          id="contact-message"
          v-model="form.message"
          class="contact-section__textarea"
          :placeholder="t('kyo-web.landing.contact.form.message-placeholder')"
          rows="4"
        />
      </div>

      <div class="contact-section__actions">
        <UiButton
          type="submit"
          variant="cyber"
          size="md"
          :disabled="!is_valid"
          class="contact-section__submit"
          :aria-label="t('kyo-web.landing.contact.form.submit-aria')"
        >
          {{ t('kyo-web.landing.contact.form.submit') }}
        </UiButton>
        <template v-if="booking_href">
          <div class="contact-section__or" aria-hidden="true">
            <span class="contact-section__or-line" />
            <span
              class="contact-section__or-text"
            >{{ t('kyo-web.landing.contact.book-or') }}</span>
            <span class="contact-section__or-line" />
          </div>
          <UiLink
            :href="booking_href"
            variant="cyber-outline"
            size="md"
            external
            class="contact-section__book"
          >
            {{ t('kyo-web.landing.contact.book-cta') }}
          </UiLink>
        </template>
        <UiLink
          v-if="whatsapp_href"
          :href="whatsapp_href"
          variant="primary"
          size="sm"
          external
          class="contact-section__whatsapp"
        >
          {{ t('kyo-web.landing.contact.whatsapp-cta') }}
        </UiLink>
      </div>
    </form>
  </section>
</template>

<style lang="scss" scoped>
.contact-section {
  &__lead {
    margin: 0 auto 1.5rem;
    font-size: var(--fs-300);
    font-weight: 400;
    max-width: 60ch;
    text-align: center;
  }

  &__form {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    max-width: 36rem;
    margin: 0 auto;
  }

  &__field {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  &__label {
    font-family: "SpaceMono", monospace;
    font-size: var(--fs-200);
    color: var(--clr-primary-100);
    letter-spacing: 0.1em;
    margin: 0;
    padding: 0;
  }

  &__input,
  &__textarea {
    width: 100%;
    padding: 0.75rem 1rem;
    background: color-mix(in srgb, var(--clr-neutral-500) 90%, transparent);
    border: 1px solid var(--clr-border-100);
    color: var(--clr-neutral-100);
    font-family: "Geomanist", sans-serif;
    font-size: var(--fs-300);
    outline: none;
    transition: border-color 0.2s ease;

    &:focus-visible {
      border-color: var(--clr-primary-100);
    }

    &::placeholder {
      color: color-mix(in srgb, var(--clr-neutral-50) 70%, transparent);
    }
  }

  &__textarea {
    min-height: 6rem;
    resize: vertical;
  }

  &__services {
    margin: 0;
    padding: 0;
    border: 0;
  }

  &__chips {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-top: 0.5rem;
  }

  &__service-chip {
    min-height: 44px;
    padding: 0.5rem 0.75rem;
    border: 1px solid var(--clr-border-100);
    background: transparent;
    color: var(--clr-neutral-200);
    font-family: "SpaceMono", monospace;
    font-size: var(--fs-100);
    letter-spacing: 0.1em;
    text-transform: uppercase;
    cursor: pointer;
    transition: border-color 0.2s ease, color 0.2s ease;

    &.is-selected {
      color: var(--clr-primary-100);
      border-color: var(--clr-primary-100);
      background: color-mix(in srgb, var(--clr-primary-100) 8%, transparent);
    }

    &:hover:not(.is-selected) {
      color: var(--clr-primary-100);
      border-color: var(--clr-primary-100);
    }

    &:focus-visible {
      outline: 2px solid var(--clr-primary-100);
      outline-offset: 2px;
    }
  }

  &__actions {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    align-items: stretch;
  }

  &__submit,
  &__book {
    width: 100%;
    min-height: 44px;
    min-width: 44px;
  }

  &__or {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  &__or-line {
    flex: 1;
    border-top: 1px dashed var(--clr-border-100);
  }

  &__or-text {
    font-family: "SpaceMono", monospace;
    font-size: var(--fs-100);
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: var(--clr-neutral-300);
    white-space: nowrap;
  }

  @media (prefers-reduced-motion: reduce) {
    &__service-chip,
    &__input,
    &__textarea {
      transition: none;
    }
  }
}
</style>
