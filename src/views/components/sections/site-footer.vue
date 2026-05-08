<script setup>
/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 */

import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import BrandIcon from '@ui/brand-icon.vue';
import UiIcon from '@ui/icon.vue';
import UiLink from '@ui/link.vue';

const { t, locale } = useI18n();

/* ─── Signature manifest — decorative browser-state readout ─────────
 * Every value in this manifest comes from a real browser API. No
 * hand-curated brand strings ("CHANNEL", "STATUS", "BUILD") — the
 * point is that this card mirrors the visitor's actual environment,
 * not our marketing. Updates reactively as the viewport resizes or
 * the locale toggles.
 *
 * SSR/static-prerender note: `window` and `navigator` are undefined
 * server-side, so the refs start empty and hydrate in onMounted to
 * avoid hydration mismatch.
 * ───────────────────────────────────────────────────────────────── */
const host         = ref('');
const path         = ref('');
const nav_language = ref('');
const viewport     = ref({ w: 0, h: 0 });

const onResize = () => {
  viewport.value = { w: window.innerWidth, h: window.innerHeight };
};

onMounted(() => {
  host.value         = window.location.host     || '—';
  path.value         = window.location.pathname || '/';
  nav_language.value = navigator.language        || '—';
  onResize();
  window.addEventListener('resize', onResize, { passive: true });
});

onBeforeUnmount(() => {
  window.removeEventListener('resize', onResize);
});

/* `Intl.DateTimeFormat().resolvedOptions().timeZone` returns the
   IANA zone the browser is running in (e.g. "America/Bogota"). It's
   safe to evaluate at module load — `Intl` is available everywhere
   modern Vue runs. */
const resolved_tz = (() => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || '—';
  } catch {
    return '—';
  }
})();

const manifest = computed(() => [
  { key: 'host',     label: 'HOST',     value: host.value || '—' },
  { key: 'path',     label: 'PATH',     value: path.value || '—' },
  { key: 'locale',   label: 'LOCALE',   value: locale.value.toUpperCase() },
  { key: 'lang',     label: 'LANG',     value: nav_language.value || '—' },
  { key: 'viewport', label: 'VIEWPORT', value: viewport.value.w ? `${viewport.value.w}×${viewport.value.h}` : '—' },
  { key: 'tz',       label: 'TZ',       value: resolved_tz },
]);

const SOCIALS = [
  { id: 'github',    url: 'https://github.com/kyonax',             glyph: '', label: 'GitHub',    delay: '1s' },
  { id: 'linkedin',  url: 'https://linkedin.com/in/kyonax',        glyph: '', label: 'LinkedIn',  delay: '2s' },
  { id: 'x',         url: 'https://x.com/kyonax_on_tech',          brand: 'x',      label: 'X',        delay: '3s' },
  { id: 'instagram', url: 'https://instagram.com/kyonax_on_tech',  glyph: '', label: 'Instagram', delay: '4s' },
  { id: 'tiktok',    url: 'https://tiktok.com/@kyonax_on_tech',    brand: 'tiktok', label: 'TikTok',    delay: '5s' },
];

const GLYPH_MAIL = '';
const GLYPH_WSP  = '';

const WHATSAPP_URL =
  'https://wa.me/573022539479?text=Hola!%20me%20gustar%C3%ADa%20saber%20m%C3%A1s%20de%20tus%20Servicios';
</script>

<template>
  <footer
    id="contact"
    class="site-footer"
    role="contentinfo"
    :aria-label="t('kyo-web.landing.footer.tag')">
    <span class="hud-deco hud-deco--tl" aria-hidden="true">// BEACON :: ON</span>
    <span class="hud-deco hud-deco--tr site-footer__deco-channel" aria-hidden="true">// CHANNEL :: CCS // KYONAX // ZERONET</span>
    <div class="site-footer__top">
      <div class="site-footer__brand">
        <UiIcon
          class="site-footer__logo"
          name="LOGO_KYONAX"
          alt="Kyonax Logo" />
        <div class="site-footer__signoff" aria-hidden="true">
          <span class="site-footer__signoff-tag">SYS // SIGNATURE</span>
          <p class="site-footer__signoff-text" v-html="t('kyo-web.landing.footer.signoff')" />
          <dl class="site-footer__manifest">
            <div
              v-for="entry in manifest"
              :key="entry.key"
              class="site-footer__manifest-row">
              <dt class="site-footer__manifest-key">{{ entry.label }}</dt>
              <dd class="site-footer__manifest-value">{{ entry.value }}</dd>
            </div>
          </dl>
        </div>
      </div>

      <div class="site-footer__channels">
        <span class="site-footer__channels-label">// CONTACT_CHANNELS</span>
        <div class="site-footer__channels-grid">
          <UiLink
            href="mailto:kyonax.corp@gmail.com"
            variant="primary"
            flare-delay="1s"
            class="site-footer__channel"
            external>
            <span class="icon-glyph" aria-hidden="true">{{ GLYPH_MAIL }}</span>
            <span>{{ t('kyo-web.contact.contact-me') }}</span>
          </UiLink>
          <UiLink
            :href="WHATSAPP_URL"
            variant="primary"
            flare-delay="2s"
            class="site-footer__channel"
            external>
            <span class="icon-glyph" aria-hidden="true">{{ GLYPH_WSP }}</span>
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
              :flare-delay="social.delay"
              class="site-footer__social"
              external
              :aria-label="social.label">
              <BrandIcon
                v-if="social.brand"
                class="site-footer__social-icon brand-icon--lg"
                :name="social.brand" />
              <span
                v-else
                class="icon-glyph icon-glyph--lg site-footer__social-icon"
                aria-hidden="true">{{ social.glyph }}</span>
            </UiLink>
          </li>
        </ul>
      </nav>
    </div>

    <div class="site-footer__divider" aria-hidden="true">
      <span class="site-footer__divider-tag">{{ t('kyo-web.landing.footer.tag') }}</span>
    </div>

    <div class="site-footer__bottom">
      <small class="site-footer__rights">{{ t('kyo-web.landing.footer.rights') }}</small>
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
      color-mix(in srgb, var(--clr-primary-100) 4%, var(--clr-neutral-500)) 100%
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
    width: 100%;
    max-width: 480px;
    height: auto;
    filter:
      brightness(0)
      saturate(100%)
      invert(83%)
      sepia(58%)
      saturate(580%)
      hue-rotate(2deg)
      brightness(98%)
      contrast(95%);

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
    /* Override the global .icon-glyph / .brand-icon baseline lift so social
       icons sit visually centered inside the 44×44 cell (the lift is helpful
       inline with text but reads as "floating high" inside a square box). */
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
    flex-wrap: wrap;
    justify-content: space-between;
    gap: 0.5rem 1.5rem;
    color: var(--clr-neutral-300);
    font-size: var(--fs-200);
    letter-spacing: 0.06em;

    @include min-media-query(md) {
      margin-top: 4rem;
    }
  }

  &__rights {
    font-family: "Geomanist", sans-serif;
  }

  &__made-by {
    font-family: "SpaceMono", monospace;
    color: var(--clr-neutral-200);
  }
}
</style>
