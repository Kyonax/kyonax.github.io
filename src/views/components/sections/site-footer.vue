<script setup>
/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 *
 * Site footer. Renders the canonical KYONAX brand signature (drop-in
 * component, reusable across products) followed by site-specific info:
 * the LINKS column (socials + privacy) and the RUNTIME \\ column
 * (browser/session manifest).
 */

import useInViewport from '@composables/use-in-viewport';
import KyonaxBrandSignature from '@components/brand/kyonax-brand-signature.vue';
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';

const { t, locale } = useI18n();

const host         = ref('');
const path         = ref('');
const nav_language = ref('');
const viewport     = ref({ w: 0, h: 0 });

let _resize_frame = 0;
const onResize = () => {
  if (_resize_frame) return;
  _resize_frame = requestAnimationFrame(() => {
    _resize_frame = 0;
    viewport.value = { w: window.innerWidth, h: window.innerHeight };
  });
};

const resolved_tz = ref('—');

onMounted(() => {
  host.value         = window.location.host     || '—';
  path.value         = window.location.pathname || '/';
  nav_language.value = navigator.language        || '—';
  try {
    resolved_tz.value = Intl.DateTimeFormat().resolvedOptions().timeZone || '—';
  } catch { /* Intl unavailable in some embedded WebViews */ }
  onResize();
  window.addEventListener('resize', onResize, { passive: true });
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize);
  if (_resize_frame) cancelAnimationFrame(_resize_frame);
});

const manifest = computed(() => [
  { key: 'host',     label: 'HOST',     value: host.value || '—' },
  { key: 'path',     label: 'PATH',     value: path.value || '—' },
  { key: 'locale',   label: 'LOCALE',   value: locale.value.toUpperCase() },
  { key: 'lang',     label: 'LANG',     value: nav_language.value || '—' },
  { key: 'viewport', label: 'VIEWPORT', value: viewport.value.w ? `${viewport.value.w}×${viewport.value.h}` : '—' },
  { key: 'tz',       label: 'TZ',       value: resolved_tz.value },
]);

const SOCIALS = [
  { id: 'github',    url: 'https://github.com/kyonax',            label: 'GITHUB',    aria: 'GitHub, @kyonax' },
  { id: 'linkedin',  url: 'https://linkedin.com/in/kyonax',       label: 'LINKEDIN',  aria: 'LinkedIn, Cristian D. Moreno' },
  { id: 'x',         url: 'https://x.com/kyonax_on_tech',         label: 'X',         aria: 'X, @kyonax_on_tech' },
  { id: 'instagram', url: 'https://instagram.com/kyonax_on_tech', label: 'INSTAGRAM', aria: 'Instagram, @kyonax_on_tech' },
  { id: 'tiktok',    url: 'https://tiktok.com/@kyonax_on_tech',   label: 'TIKTOK',    aria: 'TikTok, @kyonax_on_tech' },
];

const privacy_href = computed(() => (locale.value === 'es' ? '/es/privacy' : '/privacy'));

const footer_ref = ref(null);
useInViewport(footer_ref);
</script>

<template>
  <footer
    id="contact"
    ref="footer_ref"
    class="site-footer"
    role="contentinfo"
    :aria-label="t('kyo-web.landing.footer.tag')"
  >
    <!-- Drop-in KYONAX brand signature (reusable across products) -->
    <KyonaxBrandSignature />

    <!-- ═══════════════════════════════════════════════════════════════════ -->
    <!-- INFO CONTAINER — site-specific: LINKS column + RUNTIME \\ column.   -->
    <!-- ═══════════════════════════════════════════════════════════════════ -->
    <div class="site-footer__info">
      <nav
        class="site-footer__socials"
        :aria-label="t('kyo-web.landing.nav.contact')"
      >
        <span class="site-footer__col-tag" aria-hidden="true">// LINKS</span>
        <ul role="list" class="site-footer__socials-list">
          <li
            v-for="(s, i) in SOCIALS"
            :key="s.id"
            class="site-footer__social-item"
          >
            <a
              :href="s.url"
              class="site-footer__social-link"
              target="_blank"
              rel="noopener noreferrer"
              :aria-label="s.aria"
            >{{ s.label }}</a><span
              v-if="i < SOCIALS.length - 1"
              class="site-footer__social-dot"
              aria-hidden="true"
            >·</span>
          </li>
        </ul>
        <ul role="list" class="site-footer__legal-list">
          <li>
            <a
              :href="privacy_href"
              class="site-footer__legal-link"
            >{{ t('kyo-web.landing.footer.privacy') }}</a>
          </li>
        </ul>
      </nav>

      <div class="site-footer__manifest" aria-hidden="true">
        <span class="site-footer__col-tag site-footer__col-tag--right">RUNTIME \\</span>
        <dl class="site-footer__manifest-list">
          <div
            v-for="entry in manifest"
            :key="entry.key"
            class="site-footer__manifest-row"
          >
            <dt class="site-footer__manifest-key">{{ entry.label }}</dt>
            <dd class="site-footer__manifest-val">{{ entry.value }}</dd>
          </div>
        </dl>
      </div>
    </div>
  </footer>
</template>

<style lang="scss" scoped>
.site-footer {
  position: relative;
  overflow: hidden;
  padding: 2.5rem 1rem 2.5rem;
  margin-top: 2rem;
  background: linear-gradient(
    to bottom,
    transparent 0%,
    color-mix(in srgb, var(--clr-primary-100) 1%, var(--clr-neutral-500)) 100%
  );
  font-family: "SpaceMono", monospace;

  @include min-media-query(sm) {
    padding: 2.5rem 1.5rem 2.5rem;
  }

  @include min-media-query(lg) {
    padding: 2.5rem 2.5rem 2.5rem;
  }

  // ── INFO CONTAINER (sits below brand signature with small gap) ─────────
  &__info {
    max-width: 1100px;
    margin: 1.25rem auto 0;
    padding: 0 0.6rem;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0;

    @include max-media-query(sm) {
      grid-template-columns: 1fr;
      gap: 1.25rem;
    }
  }

  &__socials {
    padding: 0 0.5rem 0 0;
    min-width: 0;
  }

  &__manifest {
    padding: 0 0 0 0.5rem;
    min-width: 0;
    text-align: right;
  }

  &__col-tag {
    display: block;
    font-size: var(--fs-300);
    font-weight: 700;
    letter-spacing: 0.14em;
    color: var(--clr-primary-100);
    opacity: 0.7;
    margin-bottom: 0.4rem;

    @include max-media-query(sm) {
      font-size: var(--fs-200);
      letter-spacing: 0.12em;
    }

    &--right {
      text-align: right;
    }
  }

  &__socials-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    row-gap: 0.1rem;
    line-height: 1.35;
  }

  &__social-item {
    display: inline-flex;
    align-items: baseline;
    line-height: 1.35;
  }

  &__social-link {
    font-size: var(--fs-100);
    font-weight: 700;
    letter-spacing: 0.1em;
    color: var(--clr-primary-100);
    opacity: 0.75;
    text-decoration: none;
    transition: opacity 0.15s ease;
    line-height: 1.35;

    &:hover,
    &:focus-visible {
      opacity: 1;
    }
  }

  &__social-dot {
    color: var(--clr-primary-100);
    opacity: 0.4;
    font-size: var(--fs-100);
    margin: 0 0.35rem;
    line-height: 1.35;
  }

  &__legal-list {
    list-style: none;
    margin: 0.1rem 0 0;
    padding: 0;
    display: flex;
    flex-wrap: wrap;
    gap: 0.1rem 0.75rem;
    line-height: 1.35;
  }

  &__legal-link {
    font-size: var(--fs-100);
    font-weight: 400;
    letter-spacing: 0.12em;
    color: var(--clr-primary-100);
    opacity: 0.55;
    text-decoration: none;
    transition: opacity 0.15s ease;
    line-height: 1.35;

    &:hover,
    &:focus-visible {
      opacity: 1;
    }
  }

  &__manifest-list {
    margin: 0;
    padding: 0;
    display: grid;
    grid-template-columns: auto auto;
    gap: 0.1rem 0.85rem;
    justify-content: flex-end;
    line-height: 1.35;
  }

  &__manifest-row {
    display: flex;
    gap: 0.5rem;
    align-items: baseline;
    min-width: 0;
    justify-content: flex-end;
    line-height: 1.35;
  }

  &__manifest-key {
    font-size: var(--fs-100);
    letter-spacing: 0.1em;
    color: var(--clr-primary-100);
    opacity: 0.65;
    font-weight: 700;
    min-width: 3.75rem;
    flex-shrink: 0;
    line-height: 1.35;
  }

  &__manifest-val {
    margin: 0;
    font-size: var(--fs-100);
    letter-spacing: 0.04em;
    color: var(--clr-primary-100);
    opacity: 0.45;
    word-break: break-all;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    line-height: 1.35;
  }
}
</style>
