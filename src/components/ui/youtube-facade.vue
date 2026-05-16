<script setup>
/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 *
 * Twitter-style YouTube facade. Static thumbnail + play overlay until the
 * user clicks; only then does the iframe mount. Consent is checked against
 * the global kyo:consent gate at activation time. The iframe URL uses
 * youtube-nocookie.com unconditionally.
 */

import { warmYoutube } from '@composables/use-youtube-warmup';
import { buildYoutubeThumbnails } from '@data/youtube';
import BrandIcon from '@ui/brand-icon.vue';
import { computed, nextTick, onBeforeUnmount, ref } from 'vue';
import { useI18n } from 'vue-i18n';

const props = defineProps({
  videoId:   { type: String, required: true },
  title:     { type: String, default: '' },
  poster:    { type: Object, default: null },
  channel:   { type: Object, default: null },
  showChannel: { type: Boolean, default: false },
  autoLoad:  { type: Boolean, default: false },
  origin:    { type: String, default: '' },
});

const emit = defineEmits(['play', 'activate']);

const { t, locale } = useI18n();

const _activated = ref(props.autoLoad);
const _consent_prompt_open = ref(false);
const _iframe_ref = ref(null);

const _origin = computed(() => {
  if (props.origin) {
    return props.origin;
  }
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return 'https://kyonax.com';
});

const _yt_thumbs = computed(() => buildYoutubeThumbnails(props.videoId));

const poster_avif     = computed(() => props.poster?.avif || null);
const poster_webp     = computed(() => props.poster?.webp || _yt_thumbs.value.webp);
const poster_fallback = computed(() => props.poster?.fallback || _yt_thumbs.value.fallback);
const poster_alt_low  = computed(() => _yt_thumbs.value.altLow);

const iframe_src = computed(() => {
  const params = new URLSearchParams({
    autoplay:    '1',
    rel:         '0',
    enablejsapi: '1',
    playsinline: '1',
    hl:          locale.value,
    origin:      _origin.value,
  });
  return `https://www.youtube-nocookie.com/embed/${props.videoId}?${params.toString()}`;
});

const play_label = computed(() =>
  t('kyo-web.landing.projects.play-video-label', { title: props.title || '' }).trim(),
);

const channel_name = computed(() => props.channel?.name || '');
const _show_channel = computed(() => props.showChannel && Boolean(channel_name.value));

const _has_consent = () => {
  if (typeof localStorage === 'undefined') {
    return false;
  }
  try {
    return localStorage.getItem('kyo:consent') === 'granted'; 
  } catch {
    return false; 
  }
};

const _persist_consent = () => {
  if (typeof localStorage === 'undefined') {
    return;
  }
  try {
    localStorage.setItem('kyo:consent', 'granted'); 
  } catch { /* private mode */ }
  if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
    window.gtag('consent', 'update', {
      ad_storage:         'granted',
      ad_user_data:       'granted',
      ad_personalization: 'granted',
      analytics_storage:  'granted',
    });
  }
};

const _warm = () => warmYoutube();

const _mount_iframe = async () => {
  _consent_prompt_open.value = false;
  _activated.value = true;
  emit('activate');
  emit('play');
  await nextTick();
  if (_iframe_ref.value && typeof _iframe_ref.value.focus === 'function') {
    _iframe_ref.value.focus();
  }
};

const activate = () => {
  if (_activated.value) {
    return;
  }
  if (_has_consent()) {
    _mount_iframe(); return; 
  }
  _consent_prompt_open.value = true;
};

const accept_consent = () => {
  _persist_consent();
  _mount_iframe();
};

const decline_consent = () => {
  _consent_prompt_open.value = false;
};

const pause = () => {
  const f = _iframe_ref.value;
  if (!f || !f.contentWindow) {
    return;
  }
  try {
    f.contentWindow.postMessage(
      JSON.stringify({ event: 'command', func: 'pauseVideo', args: [] }),
      'https://www.youtube-nocookie.com',
    );
  } catch { /* same-origin guard or detached frame */ }
};

defineExpose({ pause, activate });

onBeforeUnmount(pause);
</script>

<template>
  <div
    class="youtube-facade"
    :class="{ 'is-activated': _activated }"
  >
    <iframe
      v-if="_activated"
      ref="_iframe_ref"
      class="youtube-facade__iframe"
      :src="iframe_src"
      :title="title || play_label"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
      allowfullscreen
      referrerpolicy="strict-origin-when-cross-origin"
      loading="lazy"
    />

    <button
      v-else
      type="button"
      class="youtube-facade__button"
      :aria-label="play_label"
      @click="activate"
      @pointerover="_warm"
      @focus="_warm"
    >
      <picture class="youtube-facade__poster">
        <source v-if="poster_avif" :srcset="poster_avif" type="image/avif" />
        <source :srcset="poster_webp" type="image/webp" />
        <img
          class="youtube-facade__poster-img"
          :src="poster_fallback"
          :data-fallback="poster_alt_low"
          alt=""
          loading="lazy"
          decoding="async"
          @error="(e) => { if (e.target.src !== poster_alt_low) e.target.src = poster_alt_low; }"
        />
      </picture>

      <span class="youtube-facade__play" aria-hidden="true">
        <svg viewBox="0 0 24 24" focusable="false">
          <path d="M8 5.5v13l11-6.5z" fill="currentColor" />
        </svg>
      </span>

      <span class="youtube-facade__attribution" aria-hidden="true">
        <BrandIcon name="youtube" class="youtube-facade__brand" />
        <span class="youtube-facade__source">{{ t('kyo-web.landing.projects.youtube-source') }}</span>
        <span v-if="_show_channel" class="youtube-facade__divider">·</span>
        <span v-if="_show_channel" class="youtube-facade__channel">{{ channel_name }}</span>
      </span>
    </button>

    <div
      v-if="_consent_prompt_open"
      class="youtube-facade__consent"
      role="dialog"
      aria-modal="false"
      :aria-labelledby="`yt-consent-title-${videoId}`"
      :aria-describedby="`yt-consent-body-${videoId}`"
    >
      <div class="youtube-facade__consent-card">
        <h4 :id="`yt-consent-title-${videoId}`" class="youtube-facade__consent-title">
          {{ t('kyo-web.landing.projects.youtube-consent-title') }}
        </h4>
        <p :id="`yt-consent-body-${videoId}`" class="youtube-facade__consent-body">
          {{ t('kyo-web.landing.projects.youtube-consent-body') }}
        </p>
        <div class="youtube-facade__consent-actions">
          <button
            type="button"
            class="youtube-facade__consent-decline"
            @click="decline_consent"
          >
            {{ t('kyo-web.landing.projects.youtube-consent-decline') }}
          </button>
          <button
            type="button"
            class="youtube-facade__consent-accept"
            @click="accept_consent"
          >
            {{ t('kyo-web.landing.projects.youtube-consent-accept') }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.youtube-facade {
  position: relative;
  width: 100%;
  height: 100%;
  display: block;
  background: var(--clr-neutral-500);

  &__iframe {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    border: 0;
    display: block;
  }

  &__button {
    position: absolute;
    inset: 0;
    width: 100%;
    height: 100%;
    padding: 0;
    margin: 0;
    border: 0;
    background: var(--clr-neutral-500);
    color: inherit;
    cursor: pointer;
    overflow: hidden;
    isolation: isolate;

    &:hover,
    &:focus-visible {
      .youtube-facade__poster-img { transform: scale(1.02); }
      .youtube-facade__play       { transform: translate(-50%, -50%) scale(1.06); }
    }

    &:focus-visible {
      outline: 2px solid var(--clr-primary-100);
      outline-offset: 2px;
    }
  }

  &__poster {
    position: absolute;
    inset: 0;
    display: block;
  }

  &__poster-img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    transition: transform 0.25s ease;
  }

  &__play {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 3.5rem;
    height: 3.5rem;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: color-mix(in srgb, var(--clr-neutral-900) 70%, transparent);
    color: var(--clr-neutral-100);
    border: 1px solid var(--clr-primary-100);
    backdrop-filter: blur(6px);
    -webkit-backdrop-filter: blur(6px);
    transition: transform 0.25s ease, background 0.25s ease;
    z-index: 2;
    pointer-events: none;

    svg {
      width: 50%;
      height: 50%;
      display: block;
    }
  }

  &__attribution {
    position: absolute;
    bottom: 0.5rem;
    left: 0.5rem;
    z-index: 3;
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.3rem 0.55rem;
    font-family: "SpaceMono", monospace;
    font-size: var(--fs-100);
    letter-spacing: 0.08em;
    color: var(--clr-neutral-100);
    background: color-mix(in srgb, var(--clr-neutral-900) 78%, transparent);
    backdrop-filter: blur(6px);
    -webkit-backdrop-filter: blur(6px);
    border: 1px solid color-mix(in srgb, var(--clr-neutral-100) 18%, transparent);
    line-height: 1;
    pointer-events: none;
  }

  &__brand {
    font-size: 1.05em;
    color: var(--clr-youtube-red);
  }

  &__brand.brand-icon {
    transform: translateY(0.02em);
  }

  &__divider {
    color: var(--clr-neutral-300);
  }

  &__channel {
    font-family: "Geomanist", sans-serif;
    font-size: 0.78rem;
    font-weight: 500;
    letter-spacing: 0.02em;
    color: var(--clr-neutral-100);
  }

  &__consent {
    position: absolute;
    inset: 0;
    z-index: 4;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
    background: color-mix(in srgb, var(--clr-neutral-900) 80%, transparent);
    backdrop-filter: blur(6px);
    -webkit-backdrop-filter: blur(6px);
  }

  &__consent-card {
    width: 100%;
    max-width: 34rem;
    background: var(--clr-neutral-500);
    border: 1px solid var(--clr-primary-100);
    padding: 1.25rem 1.5rem;
    display: grid;
    gap: 0.75rem;
  }

  &__consent-title {
    font-family: "Geomanist", sans-serif;
    font-size: var(--fs-300);
    color: var(--clr-primary-100);
    margin: 0;
    letter-spacing: 0.02em;
  }

  &__consent-body {
    font-family: "Geomanist", sans-serif;
    font-size: var(--fs-200);
    color: var(--clr-neutral-200);
    margin: 0;
    line-height: 1.5;
  }

  &__consent-actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    justify-content: flex-end;
  }

  &__consent-decline,
  &__consent-accept {
    font-family: "SpaceMono", monospace;
    font-size: var(--fs-100);
    letter-spacing: 0.12em;
    text-transform: uppercase;
    padding: 0.55rem 0.85rem;
    cursor: pointer;
    line-height: 1;
    transition: background 0.2s ease, color 0.2s ease;
  }

  &__consent-decline {
    background: transparent;
    border: 1px solid var(--clr-border-100);
    color: var(--clr-neutral-100);

    &:hover,
    &:focus-visible {
      border-color: var(--clr-primary-100);
      color: var(--clr-primary-100);
    }
  }

  &__consent-accept {
    background: color-mix(in srgb, var(--clr-primary-100) 14%, transparent);
    border: 1px solid var(--clr-primary-100);
    color: var(--clr-primary-100);

    &:hover,
    &:focus-visible {
      background: color-mix(in srgb, var(--clr-primary-100) 24%, transparent);
    }
  }
}
</style>
