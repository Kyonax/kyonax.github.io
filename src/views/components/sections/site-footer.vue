<script setup>
/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 */

import logoKyonaxSvg from '@assets/app/LOGO_KYONAX.svg?raw';
import useInViewport from '@composables/use-in-viewport';
import useObfuscatedEmail from '@composables/use-obfuscated-email';
import BrandIcon from '@ui/brand-icon.vue';
import UiHudDeco from '@ui/hud-deco.vue';
import UiLink from '@ui/link.vue';
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';

const { t, locale } = useI18n();

const current_year = new Date().getFullYear();

const host         = ref('');
const path         = ref('');
const nav_language = ref('');
const viewport     = ref({ w: 0, h: 0 });

let _resize_frame = 0;
const onResize = () => {
  if (_resize_frame) {
    return;
  }
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
  viewport.value = { w: window.innerWidth, h: window.innerHeight };
  window.addEventListener('resize', onResize, { passive: true });
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize);
  if (_resize_frame) {
    cancelAnimationFrame(_resize_frame);
  }
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
  { id: 'github',    url: 'https://github.com/kyonax',             glyph: '\uF09B', label: 'GitHub, @kyonax',    delay: '1s' },
  { id: 'linkedin',  url: 'https://linkedin.com/in/kyonax',        glyph: '\uF0E1', label: 'LinkedIn profile, Cristian D. Moreno',  delay: '2s' },
  { id: 'x',         url: 'https://x.com/kyonax_on_tech',          brand: 'x',      label: 'X (formerly Twitter), @kyonax_on_tech',        delay: '3s' },
  { id: 'instagram', url: 'https://instagram.com/kyonax_on_tech',  glyph: '\uF16D', label: 'Instagram, @kyonax_on_tech', delay: '4s' },
  { id: 'tiktok',    url: 'https://tiktok.com/@kyonax_on_tech',    brand: 'tiktok', label: 'TikTok, @kyonax_on_tech',    delay: '5s' },
];

const GLYPH_MAIL = '\uF0E0';
const GLYPH_WSP  = '\uF232';

const contact_email_href = useObfuscatedEmail('work', 'kyonax.com');

const WHATSAPP_URL =
  'https://wa.me/573022539479?text=Hola!%20me%20gustar%C3%ADa%20saber%20m%C3%A1s%20de%20tus%20Servicios';

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
    <UiHudDeco variant="tl" text="// BEACON :: ON" />
    <UiHudDeco variant="tr" text="// CHANNEL :: CCS // KYONAX // ZERONET" class="site-footer__deco-channel" />
    <div class="site-footer__top">
      <div class="site-footer__brand">
        <span
          class="site-footer__logo"
          aria-hidden="true"
          v-html="logoKyonaxSvg"
        />
        <div class="site-footer__signoff" aria-hidden="true">
          <span class="site-footer__signoff-tag">SYS // SIGNATURE</span>
          <p class="site-footer__signoff-text" v-html="t('kyo-web.landing.footer.signoff')" />
          <dl class="site-footer__manifest">
            <div
              v-for="entry in manifest"
              :key="entry.key"
              class="site-footer__manifest-row"
            >
              <dt class="site-footer__manifest-key">
                {{ entry.label }}
              </dt>
              <dd class="site-footer__manifest-value">
                {{ entry.value }}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      <div id="contact" class="site-footer__channels">
        <span class="site-footer__channels-label">// CONTACT_CHANNELS</span>
        <div class="site-footer__channels-grid">
          <UiLink
            :href="contact_email_href"
            variant="primary"
            class="site-footer__channel"
            external
          >
            <span class="icon-glyph" :data-text="GLYPH_MAIL" aria-hidden="true" />
            <span>{{ t('kyo-web.contact.contact-me') }}</span>
          </UiLink>
          <UiLink
            :href="WHATSAPP_URL"
            variant="primary"
            class="site-footer__channel"
            external
          >
            <span class="icon-glyph" :data-text="GLYPH_WSP" aria-hidden="true" />
            <span>{{ t('kyo-web.contact.wsp') }}</span>
          </UiLink>
        </div>
      </div>

      <nav class="site-footer__socials" :aria-label="t('kyo-web.landing.nav.contact')">
        <span class="site-footer__channels-label">// SOCIAL_GRID</span>
        <ul role="list" class="site-footer__socials-list">
          <li v-for="social in SOCIALS" :key="social.id">
            <UiLink
              :href="social.url"
              variant="ghost"
              class="site-footer__social"
              external
              :aria-label="social.label"
            >
              <BrandIcon
                v-if="social.brand"
                class="site-footer__social-icon brand-icon--lg"
                :name="social.brand"
              />
              <span
                v-else
                class="icon-glyph icon-glyph--lg site-footer__social-icon"
                :data-text="social.glyph"
                aria-hidden="true"
              />
            </UiLink>
          </li>
        </ul>
      </nav>
    </div>

    <div class="site-footer__divider" aria-hidden="true">
      <span class="site-footer__divider-tag">{{ t('kyo-web.landing.footer.tag') }}</span>
    </div>

    <div class="site-footer__bottom">
      <small class="site-footer__rights">{{ t('kyo-web.landing.footer.rights', { year: current_year }) }}</small>
      <small class="site-footer__made-by">{{ t('kyo-web.landing.footer.made-by') }}</small>
    </div>
  </footer>
</template>

<style lang="scss" scoped>
.site-footer {
  position: relative;
  overflow: hidden;
  padding: 4rem 1.5rem 2rem;
  margin-top: 4rem;
  background:
    linear-gradient(
      to bottom,
      transparent 0%,
      color-mix(in srgb, var(--clr-primary-100) 1%, var(--clr-neutral-500)) 100%
    );
  border-top: 1px solid var(--clr-primary-100);
  font-family: "SpaceMono", monospace;

  @include min-media-query(md) {
    padding: 5rem 2rem 2rem;
  }

  
  &__deco-channel {
    display: none;
    @include min-media-query(md) { display: inline-block; }
  }

  &__top {
    max-width: 1280px;
    margin: 0 auto;
    display: grid;
    
    grid-template-columns: 1fr 1fr;
    gap: 5rem 1.25rem;

    & > :first-child { grid-column: 1 / -1; }

    @include min-media-query(md) {
      gap: 5rem 3rem;
    }
  }

  &__brand {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
    align-items: flex-start;

    
    @include max-media-query(md) {
      align-items: stretch;
      gap: 1.5rem;
    }
  }


  &__logo {
    display: block;
    width: 100%;
    max-width: 480px;
    color: var(--clr-primary-100);

    :deep(svg) {
      display: block;
      width: 100%;
      height: auto;
    }

    @include max-media-query(md) {
      max-width: none;
    }
  }

  &__signoff {
    display: flex;
    flex-direction: column;
    gap: 0.65rem;
    border: 1px dashed var(--clr-border-100);
    padding: 0.85rem 1.1rem;
    width: 100%;
    background: color-mix(in srgb, var(--clr-neutral-500) 60%, transparent);
  }

  &__signoff-tag {
    font-size: var(--fs-100);
    color: var(--clr-primary-100);
    letter-spacing: 0.16em;
    text-transform: uppercase;
    opacity: 0.8;
  }

  
  &__signoff-text {
    margin: 0;
    font-family: "Geomanist", sans-serif;
    font-size: var(--fs-200);
    color: var(--clr-neutral-200);
    line-height: 1.55;
    letter-spacing: 0.02em;
    word-spacing: 0.06em;
    opacity: 0.75;

    :deep(.heart-glyph) {
      display: inline-block;
      font-size: 0.95em;
      line-height: 1;
      vertical-align: -0.06em;
      margin: 0 0.04em;
      color: var(--clr-primary-100);
    }
  }

  
  &__manifest {
    margin: 0;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
    gap: 0.4rem 1.25rem;
    font-family: "SpaceMono", monospace;
    font-size: var(--fs-100);
    opacity: 0.55;
  }

  &__manifest-row {
    display: flex;
    flex-direction: column;
    gap: 0.05rem;
    min-width: 0;
  }

  &__manifest-key {
    color: var(--clr-neutral-300);
    letter-spacing: 0.16em;
    font-weight: 700;
    text-transform: uppercase;
  }

  &__manifest-value {
    margin: 0;
    color: var(--clr-neutral-200);
    letter-spacing: 0.04em;
    word-break: break-word;
  }

  &__channels-label {
    display: block;
    font-size: var(--fs-200);
    color: var(--clr-primary-100);
    letter-spacing: 0.12em;
    margin-bottom: 0.75rem;
  }

  &__channels-grid {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 0.5rem;
    max-width: 16rem;
  }

  &__channel {
    display: inline-flex;
    align-items: center;
    justify-content: flex-start;
    gap: 0.6rem;
    padding-left: 0.9rem;
    padding-right: 0.9rem;
    width: 100%;
  }

  &__socials-list {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  &__social {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    height: 44px;
    padding: 0;
    border: 1px solid var(--clr-border-100);
    transition: border-color 0.2s ease, color 0.2s ease;

    &:hover {
      border-color: var(--clr-primary-100);
      color: var(--clr-primary-100);
    }
  }

  &__social-icon {
    font-size: 1.4rem;
    /* Cancel the global glyph lift inside the 44x44 square cells. */
    transform: translateY(0);
  }

  &__divider {
    position: relative;
    margin: 14rem auto 1.5rem;
    max-width: 1280px;
    height: 1px;
    background: linear-gradient(
      to right,
      transparent,
      var(--clr-primary-100),
      transparent
    );
    display: flex;
    justify-content: center;
    align-items: center;

    @include min-media-query(md) {
      margin-top: 16rem;
    }
  }

  &__divider-tag {
    background: var(--clr-neutral-500);
    color: var(--clr-primary-100);
    padding: 0.4rem 1rem;
    border: 1px solid var(--clr-primary-100);
    font-size: var(--fs-200);
    letter-spacing: 0.16em;
    transform: translateY(-50%);
  }

  &__bottom {
    max-width: 1280px;
    margin: 3rem auto 0;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
    color: var(--clr-neutral-300);
    font-size: var(--fs-200);
    letter-spacing: 0.06em;

    @include min-media-query(md) {
      margin-top: 4rem;
    }

    @include min-media-query(lg) {
      flex-direction: row;
      flex-wrap: wrap;
      justify-content: space-between;
      align-items: center;
      gap: 0.5rem 1.5rem;
    }
  }

  &__rights {
    font-family: "Geomanist", sans-serif;
    white-space: pre-line;
  }

  &__made-by {
    font-family: "SpaceMono", monospace;
    color: var(--clr-neutral-200);
    align-self: flex-end;

    @include min-media-query(lg) {
      align-self: center;
    }
  }
}
</style>
