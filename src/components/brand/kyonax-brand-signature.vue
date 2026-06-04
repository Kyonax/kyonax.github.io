<script setup>
/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 *
 * KyonaxBrandSignature — drop-in brand signature container.
 *
 * Embed at the bottom of any KYONAX product/project to render the canonical
 * brand block: HUD strip + 京 stamp, KYONAX wordmark, identity row
 * (name / location / year), legal strip (license · EXPERT IN /
 * PERFORMANCE · ARCHITECTURE · AI · credit), corner anchor dots, and the
 * vertical margin labels (信号 / 接続).
 *
 * Self-contained:
 *   - Imports its own KYONAX SVG wordmark
 *   - Pulls translatable strings from `kyo-web.landing.footer.*` i18n keys
 *   - All styles are scoped to `.kyonax-sig` — no global side-effects
 *   - Accepts no required props; renders consistently across projects
 *
 * Responsive behavior:
 *   - Top-strip HUD labels: full text on ≥ 768px, short on < 768px
 *   - Identity city: VILLAVICENCIO → V/CIO at ≤ 414px (matches hero.vue)
 *   - Legal-strip pillars: PERFORMANCE · ARCHITECTURE · AI → · ARCH · AI at ≤ 414px
 *   - Credit: full text on ≥ 768px, KYONAX on < 768px
 *   - Identity font: fs-500 → fs-200 on < 768px
 *   - 京 kanji: fs-500 → fs-300 on < 768px
 *   - Vertical margin labels: hidden on < 1024px
 */

import logoKyonaxSvg from '@assets/app/LOGO_KYONAX.svg?raw';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
const current_year = new Date().getFullYear();
</script>

<template>
  <div class="kyonax-sig">
    <!-- Vertical margin labels — ref4 SIGNAL/ONLINE pattern, md+ only -->
    <span class="kyonax-sig__margin kyonax-sig__margin--left" aria-hidden="true">
      <span lang="ja">信号</span>
    </span>
    <span class="kyonax-sig__margin kyonax-sig__margin--right" aria-hidden="true">
      <span lang="ja">接続</span>
    </span>

    <!-- ═════════════════════════════════════════════════════════════════ -->
    <!-- BRAND BLOCK — cohesive rectangle anchored by 4 corner dots.       -->
    <!-- ═════════════════════════════════════════════════════════════════ -->
    <div class="kyonax-sig__block">
      <span class="kyonax-sig__anchor kyonax-sig__anchor--tl" aria-hidden="true" />
      <span class="kyonax-sig__anchor kyonax-sig__anchor--tr" aria-hidden="true" />
      <span class="kyonax-sig__anchor kyonax-sig__anchor--bl" aria-hidden="true" />
      <span class="kyonax-sig__anchor kyonax-sig__anchor--br" aria-hidden="true" />

      <!-- Row 1 — top strip: HUD-L · 京 · HUD-R -->
      <div class="kyonax-sig__strip kyonax-sig__strip--top">
        <span class="kyonax-sig__hud-label">
          <span class="kyonax-sig__hud-label-full">// SENIOR :: FULL-STACK ENGINEER</span>
          <span class="kyonax-sig__hud-label-short">// SR. FULL-STACK</span>
        </span>
        <span class="kyonax-sig__kanji" lang="ja" aria-hidden="true">京</span>
        <span class="kyonax-sig__hud-label kyonax-sig__hud-label--right">
          <span class="kyonax-sig__hud-label-full">LABS :: CCS · KYONAX · ZERONET \\</span>
          <span class="kyonax-sig__hud-label-short">LABS :: KYONAX \\</span>
        </span>
      </div>

      <!-- Row 2 — KYONAX wordmark -->
      <div class="kyonax-sig__wordmark-row" aria-hidden="true">
        <span class="kyonax-sig__logo" v-html="logoKyonaxSvg" />
      </div>

      <!-- Row 3 — identity: NAME (left) · LOCATION + YEAR (right) -->
      <div class="kyonax-sig__identity-row">
        <span class="kyonax-sig__id-name">CRISTIAN D. MORENO</span>
        <span class="kyonax-sig__id-info">
          <span class="kyonax-sig__id-city-full">VILLAVICENCIO</span><span class="kyonax-sig__id-city-short">V/CIO</span>
          / COL <span class="kyonax-sig__sep" aria-hidden="true">•</span> © {{ current_year }}
        </span>
      </div>

      <!-- Row 4 — legal strip: GPL · PERFORMANCE pillars (EXPERT IN above) · CREDIT -->
      <div class="kyonax-sig__strip kyonax-sig__strip--bottom">
        <span class="kyonax-sig__license">GPL-2.0</span>
        <span class="kyonax-sig__transmission">
          <span class="kyonax-sig__tagline-lead">{{ t('kyo-web.landing.footer.tagline-lead') }}</span>
          <span class="kyonax-sig__tagline-pillars-full">{{ t('kyo-web.landing.footer.tag') }}</span>
          <span class="kyonax-sig__tagline-pillars-short">{{ t('kyo-web.landing.footer.tag-short') }}</span>
        </span>
        <span class="kyonax-sig__credit">
          <span class="kyonax-sig__credit-full">{{ t('kyo-web.landing.footer.made-by') }}</span>
          <span class="kyonax-sig__credit-short">KYONAX</span>
        </span>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.kyonax-sig {
  position: relative;
  font-family: "SpaceMono", monospace;

  // ── Vertical margin labels (ref4 SIGNAL / ONLINE) ──────────────────────
  &__margin {
    display: none;

    @include min-media-query(md) {
      display: block;
      position: absolute;
      top: 50%;
      font-size: var(--fs-100);
      letter-spacing: 0.18em;
      color: var(--clr-primary-100);
      opacity: 0.35;
      writing-mode: vertical-rl;
      pointer-events: none;
    }

    &--left {
      left: 0.5rem;
      transform: translateY(-50%) rotate(180deg);
    }

    &--right {
      right: 0.5rem;
      transform: translateY(-50%);
    }
  }

  // ── BRAND BLOCK (cohesive tight rectangle with corner-dot frame) ───────
  &__block {
    position: relative;
    max-width: 1100px;
    margin: 0 auto;
    padding: 1.25rem 0.6rem;
  }

  // ── Corner anchor dots (ref4 implied-frame markers) ────────────────────
  &__anchor {
    position: absolute;
    width: 5px;
    height: 5px;
    background: var(--clr-primary-100);
    border-radius: 50%;
    opacity: 0.55;
    pointer-events: none;

    &--tl { top: 0; left: 0; }
    &--tr { top: 0; right: 0; }
    &--bl { bottom: 0; left: 0; }
    &--br { bottom: 0; right: 0; }
  }

  // ── ROW 1 + ROW 4: 3-slot strips (HUD top + legal bottom) ──────────────
  &__strip {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: center;
    gap: 0.5rem;
    padding: 0.05rem 0.4rem;
    min-height: 1rem;

    & > :nth-child(1) { justify-self: start; }
    & > :nth-child(2) { justify-self: center; }
    & > :nth-child(3) { justify-self: end; }
  }

  &__hud-label {
    font-size: var(--fs-200);
    letter-spacing: 0.14em;
    color: var(--clr-primary-100);
    opacity: 0.65;
    white-space: nowrap;

    @include max-media-query(sm) {
      font-size: var(--fs-100);
      letter-spacing: 0.08em;
    }
  }

  &__hud-label-full {
    @include max-media-query(sm) { display: none; }
  }

  &__hud-label-short {
    display: none;
    @include max-media-query(sm) { display: inline; }
  }

  &__kanji {
    font-family: "Geomanist", sans-serif;
    font-size: var(--fs-500);
    font-weight: 700;
    line-height: 1.35;
    color: var(--clr-primary-100);
    opacity: 0.9;

    @include max-media-query(sm) {
      font-size: var(--fs-300);
    }
  }

  // ── ROW 2: KYONAX wordmark — hugs strips above + identity below ────────
  &__wordmark-row {
    padding: 0 0.4rem;
    font-size: 0;
    line-height: 0;
  }

  &__logo {
    display: block;
    width: 100%;
    color: var(--clr-primary-100);

    :deep(svg) {
      display: block;
      width: 100%;
      height: auto;
    }
  }

  // ── ROW 3: identity row — NAME left · LOC + YEAR right ─────────────────
  &__identity-row {
    display: grid;
    grid-template-columns: auto auto;
    justify-content: space-between;
    align-items: baseline;
    gap: 0.5rem;
    padding: 0.05rem 0.4rem 0.05rem;
  }

  &__id-name,
  &__id-info {
    font-family: "Geomanist", sans-serif;
    font-size: var(--fs-500);
    letter-spacing: 0.04em;
    color: var(--clr-primary-100);
    opacity: 0.95;
    white-space: nowrap;

    @include max-media-query(sm) {
      font-size: var(--fs-200);
      letter-spacing: 0.02em;
    }
  }

  &__id-name {
    font-weight: 700;
    justify-self: start;
  }

  &__id-info {
    font-weight: 400;
    justify-self: end;
  }

  &__sep {
    color: var(--clr-primary-100);
    opacity: 0.45;
    margin: 0 0.2rem;
  }

  // VILLAVICENCIO → V/CIO swap at 414px (mirrors hero location-city-short).
  &__id-city-short {
    display: none;
  }

  @media (max-width: 414px) {
    &__id-city-full {
      display: none;
    }
    &__id-city-short {
      display: inline;
    }
  }

  // ── ROW 4: legal strip — license · pillars (EXPERT IN above) · credit ──
  &__license,
  &__transmission,
  &__credit {
    font-size: var(--fs-100);
    letter-spacing: 0.1em;
    color: var(--clr-primary-100);
    opacity: 0.5;
    white-space: nowrap;

    @include max-media-query(sm) {
      letter-spacing: 0.04em;
    }
  }

  &__transmission {
    position: relative;
    flex-shrink: 0;
    text-align: center;
  }

  // ── EXPERT IN — absolute-positioned lead label above PERFORMANCE pillars.
  &__tagline-lead {
    position: absolute;
    bottom: 100%;
    left: 50%;
    transform: translate(-50%, 0.35rem);
    font-size: var(--fs-100);
    font-weight: 400;
    letter-spacing: 0.1em;
    color: var(--clr-primary-100);
    white-space: nowrap;

    @include max-media-query(sm) {
      display: none;
    }
  }

  // Pillars dual content: full ≥ 415px, short ≤ 414px (matches hero swap).
  &__tagline-pillars-full {
    @media (max-width: 414px) { display: none; }
  }

  &__tagline-pillars-short {
    display: none;
    @media (max-width: 414px) { display: inline; }
  }

  &__credit {
    text-align: right;
  }

  &__credit-full {
    @include max-media-query(sm) { display: none; }
  }

  &__credit-short {
    display: none;
    @include max-media-query(sm) { display: inline; }
  }
}
</style>
