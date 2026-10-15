<script setup>
/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 */

/*
 * The blog landing's pipeline band: three wordless drawings of how this blog
 * is made — PARSE (an .org file through the engine, components out), INTEGRATE
 * (the components dragged into a page), DEPLOY (the page shipped to a host
 * until the check) — and one line under them that credits org2html.
 *
 * TRANSCRIBED, NOT REDRAWN. Every coordinate and every SMIL timing is the
 * validated design's (docs/plans/blog-landing-design/blog-landing.design.mjs,
 * cellParse / cellIntegrate / cellDeploy). Two things differ and neither
 * changes a frame of the running loop: the inks are classes coloured from
 * tokens (the generator wrote raw oklch), and two packets begin one period
 * early (see the note in the third drawing).
 *
 * IT PRERENDERS. The markup is static, so the drawings ship in the HTML and
 * move with JavaScript off — SMIL needs no runtime. The script only ever STOPS
 * them: for a reader who asked for less motion (CSS `animation: none` does not
 * reach SMIL; only pauseAnimations() does), and while the band is off-screen,
 * where a loop nobody sees is just a wake-up for the CPU.
 */
import useInViewport from '@composables/use-in-viewport';
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();

const REDUCED_MOTION = '(prefers-reduced-motion: reduce)';

/* The frame a reader who asked for less motion is left on: about 6.45s, the
   one frame where all three scenes are complete at once (every component out,
   the last card down, the check drawn). The loop's first frame would leave two
   drawings empty and the host unlit, a still that tells the reader nothing. */
const STILL_FRAME_S = 6.45;

const band_ref = ref(null);
let motion_mq = null;
let on_screen = true;

const syncMotion = () => {
  const band = band_ref.value;
  if (!band || !motion_mq) {
    return;
  }
  const still = motion_mq.matches;
  for (const svg of band.querySelectorAll('.blog-pipeline-band__art')) {
    if (typeof svg.pauseAnimations !== 'function') {
      continue;
    }
    if (still || !on_screen) {
      svg.pauseAnimations();
    } else {
      svg.unpauseAnimations();
    }
    if (still) {
      svg.setCurrentTime(STILL_FRAME_S);
    }
  }
};

useInViewport(band_ref, {
  on_change: (visible) => {
    on_screen = visible;
    syncMotion();
  },
});

onMounted(() => {
  motion_mq = window.matchMedia(REDUCED_MOTION);
  motion_mq.addEventListener('change', syncMotion);
  syncMotion();
});

onBeforeUnmount(() => {
  if (motion_mq) {
    motion_mq.removeEventListener('change', syncMotion);
  }
});
</script>

<template>
  <section ref="band_ref" class="blog-pipeline-band">
    <!-- aria-hidden on every drawing: they illustrate, they say nothing a
         reader needs. The one line under them is the band's only content. -->

    <!-- 1 · PARSE — the .org file feeds the engine; components come out. -->
    <div class="blog-pipeline-band__cell">
      <svg
        class="blog-pipeline-band__art"
        viewBox="0 0 324 180"
        fill="none"
        stroke-width="1"
        aria-hidden="true"
        focusable="false"
      >
        <!-- The .org file: a title, two `*` headlines, body, a dotted line. -->
        <rect
          class="s-fg f-bg"
          x="18"
          y="36"
          width="86"
          height="108"
        />
        <rect
          class="f-hi"
          x="28"
          y="48"
          width="46"
          height="5"
        />
        <text class="glyph" x="28" y="72">
          *
        </text>
        <path class="s-dim" d="M36 69h58" />
        <text class="glyph" x="28" y="86">
          *
        </text>
        <path class="s-dim" d="M36 83h50M28 97h64M28 109h40" />
        <path class="s-fg" d="M28 123h30" stroke-dasharray="2 2" />
        <!-- Wire in. Every dashed wire marches 16 units per 1.6s. -->
        <path class="s-dim" d="M110 90h24" stroke-dasharray="4 4">
          <animate
            attributeName="stroke-dashoffset"
            values="0;-16"
            dur="1.6s"
            repeatCount="indefinite"
          />
        </path>
        <!-- The engine: two concentric gears turning opposite ways,
             the outer one clockwise in 9s, the inner one back in 6.75s. -->
        <rect
          class="s-hi f-bg"
          x="140"
          y="64"
          width="52"
          height="52"
        />
        <g>
          <path
            class="s-hi f-bg"
            d="M184.0 90.0L183.5 94.2L178.5 95.2L176.9 97.9L178.7 102.7
              L175.4 105.3L171.2 102.5L168.1 103.3L166.0 108.0L161.8 107.5
              L160.8 102.5L158.1 100.9L153.3 102.7L150.7 99.4L153.5 95.2
              L152.7 92.1L148.0 90.0L148.5 85.8L153.5 84.8L155.1 82.1
              L153.3 77.3L156.6 74.7L160.8 77.5L163.9 76.7L166.0 72.0
              L170.2 72.5L171.2 77.5L173.9 79.1L178.7 77.3L181.3 80.6
              L178.5 84.8L179.3 87.9Z"
          />
          <animateTransform
            attributeName="transform"
            type="rotate"
            from="0 166 90"
            to="360 166 90"
            dur="9s"
            repeatCount="indefinite"
          />
        </g>
        <g>
          <path
            class="s-fg f-bg"
            d="M174.5 90.0L174.1 92.6L171.2 93.0L170.0 94.5L170.3 97.4
              L167.8 98.3L166.0 96.0L164.1 95.7L161.8 97.4L159.7 95.7
              L160.8 93.0L160.1 91.2L157.5 90.0L157.9 87.4L160.8 87.0
              L162.0 85.5L161.8 82.6L164.2 81.7L166.0 84.0L167.9 84.3
              L170.3 82.6L172.3 84.3L171.2 87.0L171.9 88.8Z"
          />
          <circle
            class="f-hi"
            cx="166"
            cy="90"
            r="2.5"
          />
          <animateTransform
            attributeName="transform"
            type="rotate"
            from="360 166 90"
            to="0 166 90"
            dur="6.75s"
            repeatCount="indefinite"
          />
        </g>
        <!-- Wire out, onto a bus the components hang from. -->
        <path class="s-dim" d="M198 90h20" stroke-dasharray="4 4">
          <animate
            attributeName="stroke-dashoffset"
            values="0;-16"
            dur="1.6s"
            repeatCount="indefinite"
          />
        </path>
        <path class="s-dim" d="M218 46v96" stroke-dasharray="4 4">
          <animate
            attributeName="stroke-dashoffset"
            values="0;-16"
            dur="1.6s"
            repeatCount="indefinite"
          />
        </path>
        <!-- Five components: heading, paragraph, code, chart, image. Each
             fades and slides in .13 of the 7s loop after the one before;
             all five leave together at .93. -->
        <g>
          <animate
            attributeName="opacity"
            values="0;0;1;1;0"
            keyTimes="0;0.14;0.19;.93;1"
            dur="7s"
            repeatCount="indefinite"
          />
          <animateTransform
            attributeName="transform"
            type="translate"
            values="-5 0;-5 0;0 0;0 0;-5 0"
            keyTimes="0;0.14;0.19;.93;1"
            dur="7s"
            repeatCount="indefinite"
          />
          <rect
            class="s-fg f-bg"
            x="228"
            y="42"
            width="78"
            height="12"
          />
          <rect
            class="f-hi"
            x="232"
            y="45"
            width="56"
            height="6"
          />
        </g>
        <g>
          <animate
            attributeName="opacity"
            values="0;0;1;1;0"
            keyTimes="0;0.27;0.32;.93;1"
            dur="7s"
            repeatCount="indefinite"
          />
          <animateTransform
            attributeName="transform"
            type="translate"
            values="-5 0;-5 0;0 0;0 0;-5 0"
            keyTimes="0;0.27;0.32;.93;1"
            dur="7s"
            repeatCount="indefinite"
          />
          <rect
            class="s-fg f-bg"
            x="228"
            y="60"
            width="78"
            height="24"
          />
          <path class="s-fg" d="M232 66h64M232 73h56M232 80h60" />
        </g>
        <g>
          <animate
            attributeName="opacity"
            values="0;0;1;1;0"
            keyTimes="0;0.40;0.45;.93;1"
            dur="7s"
            repeatCount="indefinite"
          />
          <animateTransform
            attributeName="transform"
            type="translate"
            values="-5 0;-5 0;0 0;0 0;-5 0"
            keyTimes="0;0.40;0.45;.93;1"
            dur="7s"
            repeatCount="indefinite"
          />
          <rect
            class="s-fg f-bg"
            x="228"
            y="90"
            width="38"
            height="32"
          />
          <rect
            class="f-card"
            x="229"
            y="91"
            width="36"
            height="30"
          />
          <path class="s-fg" d="M234 98h20M234 105h26M234 112h16" />
        </g>
        <g>
          <animate
            attributeName="opacity"
            values="0;0;1;1;0"
            keyTimes="0;0.53;0.58;.93;1"
            dur="7s"
            repeatCount="indefinite"
          />
          <animateTransform
            attributeName="transform"
            type="translate"
            values="-5 0;-5 0;0 0;0 0;-5 0"
            keyTimes="0;0.53;0.58;.93;1"
            dur="7s"
            repeatCount="indefinite"
          />
          <rect
            class="s-fg f-bg"
            x="268"
            y="90"
            width="38"
            height="32"
          />
          <rect
            class="f-hi"
            x="272"
            y="106"
            width="7"
            height="12"
          />
          <rect
            class="f-fg"
            x="283"
            y="99"
            width="7"
            height="19"
          />
          <rect
            class="f-fg"
            x="294"
            y="110"
            width="7"
            height="8"
          />
        </g>
        <g>
          <animate
            attributeName="opacity"
            values="0;0;1;1;0"
            keyTimes="0;0.66;0.71;.93;1"
            dur="7s"
            repeatCount="indefinite"
          />
          <animateTransform
            attributeName="transform"
            type="translate"
            values="-5 0;-5 0;0 0;0 0;-5 0"
            keyTimes="0;0.66;0.71;.93;1"
            dur="7s"
            repeatCount="indefinite"
          />
          <rect
            class="s-fg f-bg"
            x="228"
            y="128"
            width="78"
            height="14"
          />
          <path class="s-hi" d="M232 136l10-6 8 5 12-8 10 6" />
          <rect
            class="f-fg"
            x="286"
            y="131"
            width="6"
            height="6"
          />
        </g>
      </svg>
    </div>

    <!-- 2 · INTEGRATE — the components are dragged into their slots. -->
    <div class="blog-pipeline-band__cell">
      <svg
        class="blog-pipeline-band__art"
        viewBox="0 0 324 180"
        fill="none"
        stroke-width="1"
        aria-hidden="true"
        focusable="false"
      >
        <!-- The page: a window, three dots, a title bar. -->
        <rect
          class="s-fg f-bg"
          x="40"
          y="22"
          width="244"
          height="140"
        />
        <path class="s-fg" d="M40 36h244" />
        <rect
          class="f-dim"
          x="46"
          y="27"
          width="4"
          height="4"
        />
        <rect
          class="f-dim"
          x="53"
          y="27"
          width="4"
          height="4"
        />
        <rect
          class="f-dim"
          x="60"
          y="27"
          width="4"
          height="4"
        />
        <rect
          class="f-hi"
          x="52"
          y="46"
          width="100"
          height="8"
        />
        <!-- Three dashed slots. A slot's dashes vanish as its card lands:
             .24, .52 and .80 of the 8s loop. -->
        <rect
          class="s-dim"
          x="52"
          y="62"
          width="110"
          height="40"
          stroke-dasharray="3 3"
        >
          <animate
            attributeName="opacity"
            values="1;1;0;0;1"
            keyTimes="0;0.24;0.27;.96;1"
            dur="8s"
            repeatCount="indefinite"
          />
        </rect>
        <rect
          class="s-dim"
          x="172"
          y="62"
          width="100"
          height="40"
          stroke-dasharray="3 3"
        >
          <animate
            attributeName="opacity"
            values="1;1;0;0;1"
            keyTimes="0;0.52;0.55;.96;1"
            dur="8s"
            repeatCount="indefinite"
          />
        </rect>
        <rect
          class="s-dim"
          x="52"
          y="110"
          width="220"
          height="40"
          stroke-dasharray="3 3"
        >
          <animate
            attributeName="opacity"
            values="1;1;0;0;1"
            keyTimes="0;0.8;0.83;.96;1"
            dur="8s"
            repeatCount="indefinite"
          />
        </rect>
        <!-- Three cards, dragged in by a cursor one after another; the
             cursor lets go just after each drop. -->
        <g opacity="0">
          <animate
            attributeName="opacity"
            values="0;0;1;1;1;0"
            keyTimes="0;0.04;0.06;0.24;.95;1"
            dur="8s"
            repeatCount="indefinite"
          />
          <animateTransform
            attributeName="transform"
            type="translate"
            values="200 118;200 118;52 62;52 62;200 118"
            keyTimes="0;0.06;0.24;.96;1"
            calcMode="spline"
            keySplines="0 0 1 1;.4 0 .2 1;0 0 1 1;0 0 1 1"
            dur="8s"
            repeatCount="indefinite"
          />
          <rect class="f-card s-hi" width="110" height="40" />
          <rect
            class="f-hi"
            x="8"
            y="8"
            width="60"
            height="5"
          />
          <rect
            class="f-fg"
            x="8"
            y="18"
            width="90"
            height="4"
          />
          <rect
            class="f-dim"
            x="8"
            y="27"
            width="70"
            height="4"
          />
          <g>
            <animate
              attributeName="opacity"
              values="1;1;1;0;0"
              keyTimes="0;0.24;0.27;0.30;1"
              dur="8s"
              repeatCount="indefinite"
            />
            <path
              class="f-hi s-bg"
              d="M100 32l0 13 3.5-3 2.5 5.5 2.5-1-2.5-5.5 4.5-.5z"
              stroke-width=".8"
            />
          </g>
        </g>
        <g opacity="0">
          <animate
            attributeName="opacity"
            values="0;0;1;1;1;0"
            keyTimes="0;0.32;0.34;0.52;.95;1"
            dur="8s"
            repeatCount="indefinite"
          />
          <animateTransform
            attributeName="transform"
            type="translate"
            values="200 118;200 118;172 62;172 62;200 118"
            keyTimes="0;0.34;0.52;.96;1"
            calcMode="spline"
            keySplines="0 0 1 1;.4 0 .2 1;0 0 1 1;0 0 1 1"
            dur="8s"
            repeatCount="indefinite"
          />
          <rect class="f-card s-hi" width="100" height="40" />
          <rect
            class="f-hi"
            x="8"
            y="10"
            width="7"
            height="20"
          />
          <rect
            class="f-fg"
            x="19"
            y="16"
            width="7"
            height="14"
          />
          <rect
            class="f-fg"
            x="30"
            y="22"
            width="7"
            height="8"
          />
          <rect
            class="f-fg"
            x="41"
            y="12"
            width="7"
            height="18"
          />
          <g>
            <animate
              attributeName="opacity"
              values="1;1;1;0;0"
              keyTimes="0;0.52;0.55;0.58;1"
              dur="8s"
              repeatCount="indefinite"
            />
            <path
              class="f-hi s-bg"
              d="M90 32l0 13 3.5-3 2.5 5.5 2.5-1-2.5-5.5 4.5-.5z"
              stroke-width=".8"
            />
          </g>
        </g>
        <g opacity="0">
          <animate
            attributeName="opacity"
            values="0;0;1;1;1;0"
            keyTimes="0;0.60;0.62;0.8;.95;1"
            dur="8s"
            repeatCount="indefinite"
          />
          <animateTransform
            attributeName="transform"
            type="translate"
            values="30 130;30 130;52 110;52 110;30 130"
            keyTimes="0;0.62;0.8;.96;1"
            calcMode="spline"
            keySplines="0 0 1 1;.4 0 .2 1;0 0 1 1;0 0 1 1"
            dur="8s"
            repeatCount="indefinite"
          />
          <rect class="f-card s-hi" width="220" height="40" />
          <rect
            class="f-bg s-dim"
            x="8"
            y="8"
            width="204"
            height="24"
          />
          <path class="s-fg" d="M16 16h60M16 24h96" />
          <rect
            class="f-hi"
            x="190"
            y="14"
            width="14"
            height="12"
          />
          <g>
            <animate
              attributeName="opacity"
              values="1;1;1;0;0"
              keyTimes="0;0.8;0.83;0.86;1"
              dur="8s"
              repeatCount="indefinite"
            />
            <path
              class="f-hi s-bg"
              d="M210 32l0 13 3.5-3 2.5 5.5 2.5-1-2.5-5.5 4.5-.5z"
              stroke-width=".8"
            />
          </g>
        </g>
      </svg>
    </div>

    <!-- 3 · DEPLOY — the page ships to the host, packet by packet. -->
    <div class="blog-pipeline-band__cell">
      <svg
        class="blog-pipeline-band__art"
        viewBox="0 0 324 180"
        fill="none"
        stroke-width="1"
        aria-hidden="true"
        focusable="false"
      >
        <!-- The assembled page. -->
        <rect
          class="s-fg f-bg"
          x="22"
          y="40"
          width="110"
          height="100"
        />
        <path class="s-fg" d="M22 52h110" />
        <rect
          class="f-dim"
          x="27"
          y="44"
          width="4"
          height="4"
        />
        <rect
          class="f-dim"
          x="34"
          y="44"
          width="4"
          height="4"
        />
        <rect
          class="f-hi"
          x="30"
          y="60"
          width="50"
          height="6"
        />
        <rect
          class="s-dim"
          x="30"
          y="72"
          width="44"
          height="20"
        />
        <rect
          class="s-dim"
          x="80"
          y="72"
          width="44"
          height="20"
        />
        <rect
          class="s-dim"
          x="30"
          y="98"
          width="94"
          height="18"
        />
        <path class="s-fg" d="M36 106h60" />
        <rect
          class="s-dim"
          x="30"
          y="122"
          width="94"
          height="10"
        />
        <!-- The wire, clear of both boxes; the packets ride it. -->
        <path
          id="blog-pipeline-band-wire"
          class="s-dim"
          d="M140 90h64"
          stroke-dasharray="4 4"
        >
          <animate
            attributeName="stroke-dashoffset"
            values="0;-16"
            dur="1.6s"
            repeatCount="indefinite"
          />
        </path>
        <!-- Three packets a third of the 2.4s trip apart. The design's
             begins (0, .8s, 1.6s) are shifted back one period to
             (0, -1.6s, -0.8s): the same motion, but the idle packets never
             park on the svg origin before they start. -->
        <rect
          class="f-hi"
          width="6"
          height="6"
          x="-3"
          y="-3"
        >
          <animateMotion dur="2.4s" begin="0s" repeatCount="indefinite">
            <mpath href="#blog-pipeline-band-wire" />
          </animateMotion>
        </rect>
        <rect
          class="f-hi"
          width="6"
          height="6"
          x="-3"
          y="-3"
        >
          <animateMotion dur="2.4s" begin="-1.6s" repeatCount="indefinite">
            <mpath href="#blog-pipeline-band-wire" />
          </animateMotion>
        </rect>
        <rect
          class="f-hi"
          width="6"
          height="6"
          x="-3"
          y="-3"
        >
          <animateMotion dur="2.4s" begin="-0.8s" repeatCount="indefinite">
            <mpath href="#blog-pipeline-band-wire" />
          </animateMotion>
        </rect>
        <!-- The host: three slots whose lights come on at .20, .42 and .64
             of the 7s loop. -->
        <rect
          class="s-hi f-bg"
          x="210"
          y="44"
          width="92"
          height="92"
        />
        <rect
          class="s-dim"
          x="220"
          y="54"
          width="72"
          height="20"
        />
        <path class="s-dim" d="M226 64h30" />
        <rect
          class="f-hi"
          x="280"
          y="61"
          width="6"
          height="6"
        >
          <animate
            attributeName="opacity"
            values="0;0;1;1;0"
            keyTimes="0;0.20;0.24;.94;1"
            dur="7s"
            repeatCount="indefinite"
          />
        </rect>
        <rect
          class="s-dim"
          x="280"
          y="61"
          width="6"
          height="6"
        />
        <rect
          class="s-dim"
          x="220"
          y="80"
          width="72"
          height="20"
        />
        <path class="s-dim" d="M226 90h30" />
        <rect
          class="f-hi"
          x="280"
          y="87"
          width="6"
          height="6"
        >
          <animate
            attributeName="opacity"
            values="0;0;1;1;0"
            keyTimes="0;0.42;0.46;.94;1"
            dur="7s"
            repeatCount="indefinite"
          />
        </rect>
        <rect
          class="s-dim"
          x="280"
          y="87"
          width="6"
          height="6"
        />
        <rect
          class="s-dim"
          x="220"
          y="106"
          width="72"
          height="20"
        />
        <path class="s-dim" d="M226 116h30" />
        <rect
          class="f-hi"
          x="280"
          y="113"
          width="6"
          height="6"
        >
          <animate
            attributeName="opacity"
            values="0;0;1;1;0"
            keyTimes="0;0.64;0.68;.94;1"
            dur="7s"
            repeatCount="indefinite"
          />
        </rect>
        <rect
          class="s-dim"
          x="280"
          y="113"
          width="6"
          height="6"
        />
        <!-- The progress bar fills by .74; the check is drawn beside it
             from .76 to .84. -->
        <rect
          class="f-card"
          x="22"
          y="156"
          width="246"
          height="2"
        />
        <rect
          class="f-hi"
          x="22"
          y="156"
          width="246"
          height="2"
        >
          <animate
            attributeName="width"
            values="0;246;246;0"
            keyTimes="0;.74;.94;1"
            dur="7s"
            repeatCount="indefinite"
          />
        </rect>
        <path
          class="s-hi"
          d="M282 157l4 4 8-9"
          stroke-width="1.5"
          stroke-dasharray="30"
          stroke-dashoffset="30"
        >
          <animate
            attributeName="stroke-dashoffset"
            values="30;30;0;0;30"
            keyTimes="0;.76;.84;.94;1"
            dur="7s"
            repeatCount="indefinite"
          />
        </path>
      </svg>
    </div>

    <!-- MADE WITH ORG2HTML. target="_blank" is load-bearing, not taste: Umami
         intercepts a SAME-tab link that carries data-umami-event and
         re-navigates it through location.href; a _blank link is left alone.
         The URL is a URL and is not translated; the label is. -->
    <p class="blog-pipeline-band__made-with">
      <span class="blog-pipeline-band__label">
        {{ t('kyo-web.blog.made-with') }}
      </span>
      <a
        class="blog-pipeline-band__repo"
        href="https://github.com/Kyonax/org2html"
        target="_blank"
        rel="noopener noreferrer"
        data-umami-event="org2html-github"
      >
        github.com/Kyonax/org2html
        <span
          class="blog-pipeline-band__arrow"
          data-text="↗"
          aria-hidden="true"
        />
      </a>
    </p>
  </section>
</template>

<style lang="scss" scoped>
/*
 * INKS. The generator painted five raw colour values; each is a token here, or
 * a mix of two tokens, so the drawings follow the theme and the colour gate
 * stays green. Monochrome by law — nothing in the band is the accent.
 *
 *   fg    lines, minor fills        neutral-200             (the design's FG)
 *   hi    the highlighted element   neutral-100             (HI)
 *   bg    box fills, cursor edge    neutral-500             (BG)
 *   dim   secondary lines, slots    neutral-300 at 50%      (DIM)
 *   card  a raised card             neutral-100 8.8% into   (CARD — 8.8% in
 *                                   neutral-500              sRGB lands on
 *                                                            its 24% L)
 *
 * One class carries one ink on one channel: `s-*` strokes, `f-*` fills. The
 * svg itself says fill="none" and no stroke, as the design's did, so an
 * element with no class paints nothing.
 */
$band-hairline: 1px solid var(--clr-border-100);
$band-ink-fg: var(--clr-neutral-200);
$band-ink-hi: var(--clr-neutral-100);
$band-ink-bg: var(--clr-neutral-500);
$band-ink-dim: color-mix(in srgb, var(--clr-neutral-300) 50%, transparent);
$band-ink-card: color-mix(
  in srgb, var(--clr-neutral-100) 8.8%, var(--clr-neutral-500)
);

/* The dot grid's dot is 11% white; the border token is 20% white, so 55% of
   it is the same dot. */
$band-dot: color-mix(in srgb, var(--clr-border-100) 55%, transparent);

/*
 * STACKED ON A PHONE, THREE ACROSS FROM `sm`. The design switches at 720px;
 * `sm` (768px) is the nearest step on the site's own scale, and the one the
 * blog's card row already turns on. The section is the grid itself — the
 * made-with line spans it — so a cell is always a direct child.
 */
.blog-pipeline-band {
  display: grid;
  grid-template-columns: minmax(0, 1fr);

  @include min-media-query(sm) {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

/*
 * THE HAIRLINES ARE THE CELLS' OWN, between cells only: horizontal where they
 * stack, vertical where they sit side by side. The band draws no rule above
 * itself — the marquee's bottom rule is its top edge, so the two sit flush —
 * and its bottom edge is the made-with line's top rule.
 */
.blog-pipeline-band__cell {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 22px 30px;
  background-image: radial-gradient($band-dot 0.8px, transparent 0.9px);
  background-size: 12px 12px;

  & + & { border-top: $band-hairline; }

  @include min-media-query(sm) {
    padding: 26px 22px;

    & + & {
      border-top: 0;
      border-left: $band-hairline;
    }
  }
}

/* 324×180 in the drawing's units, never wider than 300px, fluid below it. The
   aspect ratio is stated so the box is reserved before layout settles. */
.blog-pipeline-band__art {
  display: block;
  width: 100%;
  max-width: 300px;
  height: auto;
  aspect-ratio: 324 / 180;
}

.s-fg { stroke: $band-ink-fg; }
.s-hi { stroke: $band-ink-hi; }
.s-bg { stroke: $band-ink-bg; }
.s-dim { stroke: $band-ink-dim; }
.f-fg { fill: $band-ink-fg; }
.f-hi { fill: $band-ink-hi; }
.f-bg { fill: $band-ink-bg; }
.f-dim { fill: $band-ink-dim; }
.f-card { fill: $band-ink-card; }

/* The file's `*` headlines: the system monospace at 9 units, as designed. */
.glyph {
  fill: $band-ink-fg;
  font-family: monospace;
  font-size: 9px;
}

/*
 * ONE LINE, TWO ENDS: the label left, the repository right; two rows on a
 * phone. Same voice as the marquee — mono, the smallest step, tracked,
 * uppercase — and `line-height: normal`, the design's, so the line is the
 * height it was drawn at. Both rows start on the band's left edge.
 */
.blog-pipeline-band__made-with {
  grid-column: 1 / -1;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
  margin: 0;
  padding: 10px 0;
  border-top: $band-hairline;
  border-bottom: $band-hairline;
  color: var(--clr-neutral-300);
  font-family: "SpaceMono", monospace;
  font-size: var(--fs-100);
  line-height: normal;
  letter-spacing: 0.16em;
  text-transform: uppercase;

  @include min-media-query(sm) {
    flex-direction: row;
    justify-content: space-between;
    gap: 16px;
  }
}

/* The blog footer's plain-link voice: bright and underlined at rest, the
   accent only as a STATE (hover, keyboard focus). */
.blog-pipeline-band__repo {
  max-width: 100%;
  color: var(--clr-neutral-100);
  text-decoration: underline;
  text-underline-offset: 3px;
  overflow-wrap: anywhere;
  transition: color 0.15s ease;

  &:hover,
  &:focus-visible { color: var(--clr-primary-100); }
}
</style>
