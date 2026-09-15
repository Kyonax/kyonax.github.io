/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 */

/*
 * use-blog-lightbox.js — make images inside generated prose openable.
 *
 * Every other lightbox on this site is an explicit <UiImageViewer> plus an
 * explicit click handler on a real <button>. Blog article bodies cannot work
 * that way: the markup arrives from org2html as a v-html string, so there is
 * no template to hang a handler on and no component to wrap the image in.
 *
 * So this delegates, exactly as document-page.vue already delegates its
 * [data-tip] tooltips and use-prose-links.js already hardens rel= on links
 * inside v-html output.
 *
 * ACCESSIBILITY. An <img> inside v-html is not an interactive element, and
 * this site's rule is that a hit area is always a real one. The directive
 * therefore UPGRADES each image in place — tabindex, role, an aria-label and
 * Enter/Space — rather than relying on a mouse-only click handler.
 *
 * THE ENGINE'S RUNTIME IS NOW LOADED ON THESE ROUTES, and it ships a lightbox
 * of its own — so this composable has to claim the images or the reader gets
 * TWO overlays on one click. o2h.js guards every enhancement with a dataset
 * flag and skips anything already marked, so `upgrade()` sets o2h's OWN flag
 * (`data-o2h-init-light`) before o2h boots. That is the runtime's documented
 * idempotence contract used as an opt-out: no patching, no monkey-patching,
 * and every other o2h enhancement (embed click-to-play, copy buttons, the
 * carousel, back-to-top) is left alone.
 *
 * The ordering holds because the script tag is `defer`: it cannot execute
 * before the document has parsed, while this directive runs during hydration.
 * `upgrade()` is also called from `updated`, which is the belt to that brace
 * for images that arrive later.
 */

import { warmImageViewer } from '@composables/use-warm-modal';
import { ref } from 'vue';

/* Images the engine emits for content — EVERY one, the hero included. The hero
   used to be left out as "already full width, not a detail to zoom into"; the
   owner asked for it back, and a cover is exactly the image a reader wants to
   see whole on a phone, where the column crops it to a strip. Carousel and
   gallery tiles are here because o2h's lightbox used to be the only thing
   offering them a zoom. A facade's poster is NOT: it is the play target of an
   embed, and a viewer would steal the tap that starts the video. */
const SELECTOR = [
  '.org-figure img',
  '.org-image',
  '.org-carousel-strip img',
  '[data-component="gallery"] img',
].join(', ');

/*
 * CHARTS OPEN IN THE SAME VIEWER — the fix for a chart nobody could read on a
 * phone.
 *
 * The engine draws a bar chart as an inline SVG sized to its column, with its
 * labels set in SVG units, so a 720-unit chart in a 360px column paints them at
 * half size — about 7px — however the page is styled. No width fixes that on a
 * portrait phone. The viewer does: it already pinch-zooms, double-tap-zooms and
 * pans, so the chart is handed to it as an image and the reader enlarges
 * exactly the part they want.
 *
 * The SVG is aria-hidden (the engine ships the chart's source table beside it
 * for screen readers), so it cannot itself be the control. Each chart gets a
 * real <button> instead, in its corner; a tap anywhere on the chart does the
 * same, since that is where a reader's thumb goes first.
 */
const CHART = '.org-chart';
const ZOOM_GLYPH = '\uF065'; /* Symbols Nerd Font — expand */

/* The serializer is its own chunk (see chart-picture.js): fetched the first
   time a reader reaches for a chart, warmed on hover, never paid for by a
   reader who does not. */
const loadChartPicture = () => import('@composables/chart-picture');

const pictureFrom = (el) => {
  const src = el.currentSrc || el.getAttribute('src') || '';
  const name = src.split('/').pop() || 'image';
  const dot = name.lastIndexOf('.');
  return {
    /* UiImageViewer's `picture` prop is the raw-URL escape hatch — it takes
       URLs rather than build-manifest keys, which is what generated content
       has. `name`/`ext` only feed its decorative corner label. */
    name: dot > 0 ? name.slice(0, dot) : name,
    ext: dot > 0 ? name.slice(dot + 1) : '',
    fallback: src,
    avif: null,
    webp: null,
  };
};

/**
 * Reactive state for the viewer plus the handler the directive calls.
 * The VIEW renders <UiImageViewer>; a directive cannot.
 */
export const useBlogLightbox = () => {
  const picture = ref(null);
  const alt = ref('');

  const open = (payload) => {
    picture.value = payload.picture;
    alt.value = payload.alt;
  };

  const close = () => {
    picture.value = null;
    alt.value = '';
  };

  return { picture, alt, open, close };
};

const upgrade = (host, label) => {
  for (const img of host.querySelectorAll(SELECTOR)) {
    if (img.dataset.blogLightbox === 'on') {
      continue;
    }
    img.dataset.blogLightbox = 'on';
    /* o2h's `once(img, "Light")` returns false when this flag is already set,
       so its lightbox skips the image entirely — no second overlay, and no
       inline `cursor: zoom-in` fighting this one's. */
    img.dataset.o2hInitLight = '1';
    img.setAttribute('tabindex', '0');
    img.setAttribute('role', 'button');
    if (!img.getAttribute('aria-label')) {
      img.setAttribute('aria-label', img.getAttribute('alt') || label);
    }
  }

  for (const figure of host.querySelectorAll(CHART)) {
    if (figure.dataset.blogLightbox === 'on' || !figure.querySelector('svg')) {
      continue;
    }
    figure.dataset.blogLightbox = 'on';
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'blog-chart-zoom';
    button.setAttribute('aria-label', host.dataset.chartZoomLabel || 'Enlarge chart');
    const glyph = document.createElement('span');
    glyph.className = 'icon-glyph';
    glyph.dataset.text = ZOOM_GLYPH;
    glyph.setAttribute('aria-hidden', 'true');
    button.append(glyph);
    figure.append(button);
  }
};

const handlerFor = (el) => {
  const open = el._blogLightboxOpen;
  return typeof open === 'function' ? open : null;
};

const activate = (el, target) => {
  const open = handlerFor(el);
  if (!open || !target) {
    return;
  }
  if (target.matches(CHART)) {
    const caption = target.querySelector('figcaption');
    loadChartPicture().then(({ chartPictureFrom }) => {
      open({ picture: chartPictureFrom(target), alt: caption ? caption.textContent.trim() : '' });
    });
    return;
  }
  open({ picture: pictureFrom(target), alt: target.getAttribute('alt') || '' });
};

/**
 * v-blog-lightbox="openHandler"
 *
 * Bind on the prose container, not on each image — the images do not exist
 * until v-html has run, and they change whenever the body does.
 */
export const vBlogLightbox = {
  mounted(el, binding) {
    el._blogLightboxOpen = binding.value;
    el._blogLightboxLabel = 'Open image';

    el._blogLightboxClick = (e) => {
      const target = e.target.closest(`${SELECTOR}, ${CHART}`);
      if (target && el.contains(target)) {
        activate(el, target);
      }
    };

    el._blogLightboxKey = (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') {
        return;
      }
      const img = e.target.closest(SELECTOR);
      if (img && el.contains(img)) {
        e.preventDefault();
        activate(el, img);
      }
    };

    /* Warm the async viewer chunk before it is needed, the same way the hero
       portrait and the project carousel do. */
    el._blogLightboxWarm = (e) => {
      if (e.target.closest(`${SELECTOR}, ${CHART}`)) {
        warmImageViewer();
      }
      if (e.target.closest(CHART)) {
        loadChartPicture();
      }
    };

    el.addEventListener('click', el._blogLightboxClick);
    el.addEventListener('keydown', el._blogLightboxKey);
    el.addEventListener('pointerenter', el._blogLightboxWarm, true);
    upgrade(el, el._blogLightboxLabel);
  },

  updated(el, binding) {
    el._blogLightboxOpen = binding.value;
    upgrade(el, el._blogLightboxLabel);
  },

  unmounted(el) {
    el.removeEventListener('click', el._blogLightboxClick);
    el.removeEventListener('keydown', el._blogLightboxKey);
    el.removeEventListener('pointerenter', el._blogLightboxWarm, true);
  },
};

export default { useBlogLightbox, vBlogLightbox };
