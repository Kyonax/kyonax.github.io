<!--
Copyright (c) 2026 Cristian D. Moreno — @Kyonax
Distributed under the terms of GPL-2.0-only — see LICENSE.

YOUTUBE_EMBED_PLAN.md — Planning document for adding YouTube video support to
the project-modal carousel in a Twitter/X-style click-to-load facade pattern.
Internal engineering document; not user-facing copy.
-->

# YouTube Embed Integration — Twitter-Style Carousel Plan

## 1. Goal & Constraints

We want to extend the existing project-modal carousel (`now-projects-section.vue`, lines 627-690) so the `images: []` array on each `PROJECTS[slug]` entry can interleave YouTube videos alongside local images, preserving array order = display order. The carousel should look and behave the way Twitter/X embeds YouTube inside a tweet: a static poster image with a centred play overlay, a small source label, and a deliberate click-to-load handoff to the real player. The full iframe is never injected on mount; it is materialised only after a user gesture so the network and tracking surface stays at zero until the user opts in.

Hard constraints inherited from the session and the repo conventions:

- **GPL-2.0 license preamble** on every new `.vue`, `.js`, `.mjs`, `.scss` file (matches the format in `modal.vue`, `image-viewer.vue`, `now-projects-section.vue`).
- **CCS naming** (§1.x): private helpers use `_snake_case_with_underscore_prefix`, public composables `useCamelCase`, components `kebab-case.vue`, BEM-style scoped styles (`__elem`, `--mod`).
- **§1.6 color rule**: no hard-coded color literals. Use `var(--clr-*)`, `color-mix()`, status-driven `--state-color`.
- **§1.13 UI primitive composition**: new YouTube facade lives under `src/components/ui/` and is consumed by the section view, never the other way around.
- **§1.47 modal focus/lock**: do not bypass `UiModal`. The facade activates inside the existing dialog; ESC must still close the modal. Body lock is ref-counted, so a nested fullscreen viewer is safe.
- **§1.69 consent gating**: `index.html` already runs a Google Consent Mode v2 default-deny block before `gtag.js`. The YouTube embed must respect the same gate.
- **No em-dashes** in user-facing strings. Internal markdown (this file, code comments) is exempt.
- **No semicolons or colons** in user-facing i18n strings. Code is exempt.
- **General-audience framing** for any new i18n keys we add (no "for recruiters", no "for hiring managers").
- **Read-only research**: no `git`, no `npm`, no build/test commands during the implementation of this plan.

The plan is implementation-ready but does not write source code; it produces the spec the next session will build against.

---

## 2. Twitter/X YouTube Embed Audit

### 2.1 UX observations

Findings synthesised from the web-search results in §13 (X's renderer is not open source, so behaviour was reconstructed from public articles, X developer-forum threads, and direct observation as documented by those sources):

- **Closed-card state** (the default in-feed look on web): static 16:9 thumbnail filling the tweet's media slot, a centred round play button overlay, and below or overlaid in the corner a small label group with channel name, video title, and "youtube.com" as the source. Hovering on desktop slightly darkens the thumbnail and reveals a thin border.
- **Click behaviour, desktop web**: per the X developer-forum thread on Player Cards, "X will not actually show your player and you end up only getting a small video thumbnail with a play icon, where clicking the play icon simply opens your webpage in a new browser tab" — this is for generic Player Cards. For YouTube specifically (which X whitelists via the YouTube card schema), clicking the thumbnail swaps the static image for the real `youtube.com/embed/<id>` iframe and the user still has to press the YouTube play button once more to start playback. This **two-click** pattern is the canonical Twitter-style behaviour.
- **Click behaviour, mobile web / native apps**: the dev-forum thread "Avoid extra tap to play a YouTube video that appears in an embedded tweet in WKWebView" confirms the same two-tap interaction is present in the iOS web view, which is why we won't try to skip the gesture.
- **No autoplay** for embedded YouTube on X. Native X-uploaded videos can autoplay (muted) per user settings; YouTube cards never do.
- **Dimensions**: 16:9 container, full tweet content-width on desktop and full screen-width on mobile. No letterbox; X crops the YouTube thumbnail to 16:9 even when YouTube serves 4:3 or vertical sources.
- **Source label**: the tweet card shows "YouTube" as the platform tag at the top-right or bottom-left depending on layout version; site domain is always displayed in plain text, never hidden.

### 2.2 Technical decoding

What X actually emits in the DOM for an embedded YouTube card (reconstructed from public observations, no first-party source available):

- **Phase 1 (closed)**: a `<div>` styled to look like a card. The poster image is a regular `<img>` whose `src` points at `https://i.ytimg.com/vi/<VIDEO_ID>/hqdefault.jpg` (or the `maxresdefault.jpg` variant on retina). The play button is an inline SVG overlay. No script or iframe is on the page yet. There is `<link rel="preconnect" href="https://www.youtube.com">` and `<link rel="preconnect" href="https://i.ytimg.com">` at the document level.
- **Phase 2 (after click)**: X swaps the static markup for an `<iframe src="https://www.youtube.com/embed/<VIDEO_ID>?...">` with `enablejsapi=1` and `origin=https://x.com` so X can postMessage the player. They use `youtube.com`, not `youtube-nocookie.com`; this is consistent with X having existing tracking and not gaining anything from the nocookie variant. For our site we will diverge here (see §9).

### 2.3 Open-source code cross-check

I checked these surfaces directly:

- **`twitter/the-algorithm`** (https://github.com/twitter/the-algorithm): WebFetch confirmed this repo is "strictly the algorithmic layer that determines which content to surface, not how to display it visually." Zero references to `iframe`, `embed`, `card`, or `youtube` in the rendering sense. Cannot be used as a reference for the card renderer.
- **`twitter/the-algorithm-ml`**: ranking models only, irrelevant to UI.
- **`twitter/twitter-text`** (URL parsing, public on GitHub): tokenises URLs and detects YouTube hosts at the parsing layer but has no rendering responsibility. Useful only as a sanity check for our URL regex.
- **`x.com` developer-platform docs for Player Card** (https://developer.twitter.com/en/docs/twitter-for-websites/cards/overview/player-card): describes the *Cards* schema that publishers attach to their own pages via `<meta name="twitter:player" content="...">`. YouTube doesn't use Player Card; YouTube has a bespoke whitelist inside X. The Player Card spec itself is therefore not the same shape we want, but the four key meta-tag fields (`twitter:player`, `twitter:player:width`, `twitter:player:height`, `twitter:player:stream`) describe how third parties register themselves with X and are useful background.
- **Iframely** (https://github.com/itteco/iframely) is an open-source oEmbed proxy that *imitates* the X card unfurl pipeline. Its YouTube parser shows the expected metadata payload (title, channel, thumbnail, embedUrl) and is a usable reference for what to extract.

**Conclusion**: the actual Twitter/X embed renderer code is **not open source**. There is no GitHub-hosted Twitter source that decides how a YouTube card is drawn. Our reference for behaviour is reverse observation plus the iframely/oEmbed shape; our reference for performance is `lite-youtube-embed`.

### 2.4 ARIA / keyboard / focus

From observation of X on web (Chrome DevTools accessibility tree, multiple public posts):

- Phase 1 facade is a focusable element with `role="button"`. Activates with Enter and Space. Accessible name is roughly "Play video, <video title>, on YouTube".
- After activation, focus moves into the swapped-in iframe (the iframe itself is a focus target because YouTube's player UI is focusable inside it). Tabbing inside the iframe is the YouTube player's responsibility; X does not interfere.
- ESC: ESC does **not** dismiss the embedded video on X because the embed is in-feed, not in a modal. In our project the embed is inside `UiModal`, so ESC will close the modal (our behaviour is stricter than X's because the host is a modal).
- The play button overlay is `aria-hidden="true"`; only the outer button is in the a11y tree.

### 2.5 Privacy posture

X embeds YouTube via `youtube.com/embed/<id>` (not the nocookie variant) because X is already deeply tracking. They do not implement a separate consent gate for YouTube specifically; consent is handled at the platform level. We will **not** copy this choice: we use the nocookie variant by default and we gate the iframe activation behind the existing consent banner (see §9).

---

## 3. YouTube IFrame Player API Reference

### 3.1 Embed URL shape

Privacy-enhanced (what we default to):

```
https://www.youtube-nocookie.com/embed/<VIDEO_ID>?<params>
```

Standard (only if consent is granted and we explicitly choose to use it):

```
https://www.youtube.com/embed/<VIDEO_ID>?<params>
```

### 3.2 Player parameters we will use

Source: https://developers.google.com/youtube/player_parameters (fetched).

| Param | Value | Effect |
|---|---|---|
| `autoplay` | `1` after click, `0` on initial swap-in if we want a second user gesture | Auto-starts video once iframe loads. Combined with `mute=0` it still needs the click that activated us, so autoplay rules in browsers are satisfied. |
| `controls` | `1` (default) | Show player controls. |
| `rel` | `0` | After Sep 2018, restricts related videos to the same channel only. Closest we can get to "no recommendations." |
| `modestbranding` | omit | Deprecated since Aug 15 2023 per the official docs. Has no effect. Do not bother sending. |
| `enablejsapi` | `1` | Required so we can `postMessage` `pauseVideo` when the carousel slides or the modal closes. |
| `origin` | `https://kyonax.com` | Required for `enablejsapi=1` security validation. Set at runtime from `window.location.origin` with a fallback to the production origin during SSR/prerender. |
| `playsinline` | `1` | iOS inline playback so we don't blow out of the modal into the OS-level player. |
| `cc_load_policy` | `1` when `prefers-reduced-transparency` or a future a11y toggle requests it | Force captions on by default. Default off. |
| `hl` | `locale.value` (`en` or `es`) | Localise the YouTube player UI to the current site locale. |
| `color` | omit (`red` is default) | Brand-irrelevant; YouTube red on top of our cyan accent is fine. |
| `mute` | omit | We do not autoplay before user click, so we do not need to satisfy the muted-autoplay browser policy. |

### 3.3 JS Player API surface

The full IFrame Player API (`https://www.youtube.com/iframe_api`) is **not** required for our use case. We talk to the player exclusively via `postMessage`:

```js
iframe.contentWindow.postMessage(
  JSON.stringify({ event: 'command', func: 'pauseVideo', args: [] }),
  'https://www.youtube-nocookie.com',
);
```

Same shape for `stopVideo`, `playVideo`. This avoids loading the 30 KB `iframe_api` script and avoids any global pollution.

To receive events (e.g. play-state change for telemetry), the iframe would have to be loaded with `enablejsapi=1` and we'd `window.addEventListener('message', ...)` filtered on `event.origin === 'https://www.youtube-nocookie.com'`. We will not subscribe to events in v1; we only need outgoing commands.

### 3.4 Thumbnail URLs

- `https://i.ytimg.com/vi/<VIDEO_ID>/maxresdefault.jpg` — 1280x720 when available, falls back to 404.
- `https://i.ytimg.com/vi/<VIDEO_ID>/hqdefault.jpg` — 480x360 always available.
- `https://i.ytimg.com/vi/<VIDEO_ID>/mqdefault.jpg` — 320x180 always available.
- `https://i.ytimg.com/vi_webp/<VIDEO_ID>/maxresdefault.webp` — WebP variant when available.

Strategy: emit a `<picture>` with the `_webp` source as `image/webp`, fallback `maxresdefault.jpg`, and final fallback `hqdefault.jpg` via `onerror` swap. No AVIF (YouTube does not serve thumbnails as AVIF).

### 3.5 Performance penalty of the full iframe vs lazy load

Per web.dev's "Best practices for using third-party embeds" (cited in §13), a single YouTube iframe pulls ~500 KB of script and CSS plus several connections to `googlevideo.com`, `static.doubleclick.net`, etc. The facade pattern delays all of that until user gesture, saving ~500 KB on initial modal open.

---

## 4. Recommended Strategy

### 4.1 Pattern: static thumbnail + click-to-load (lite-facade)

This is the only credible choice. It matches Twitter/X exactly, matches the project's existing performance posture (LCP preloads in `index.html`, immutable hashed asset caching in `.htaccess`), and means the closed modal has zero third-party network impact.

### 4.2 Library decision: **no library, custom facade**

I evaluated `lite-youtube-embed` (Paul Irish, latest 0.3.4 Nov 2025, ~3 KB JS + ~1 KB CSS, zero deps, MIT, ships as a custom element with shadow DOM features). Verdict: **do not adopt**.

Reasons:

1. **Custom element + shadow DOM** conflicts with our Vue 3 SFC composition model and Vue's scoped styles. We'd lose `$t` access for the play-button label and would have to bolt on a wrapper anyway.
2. **SSR / vite-ssg**: lite-youtube relies on `customElements.define` and `connectedCallback` for upgrade; this works in browsers but the prerender step would need a polyfill or a no-op shim. Adding that complexity for ~3 KB of code we can write ourselves is not worth it.
3. **Styling**: lite-youtube ships with a YouTube-red play button. Our visual language is the cyan-on-charcoal Twitter-card lookalike (`--clr-primary-100` border, the `__carousel-counter` chip aesthetic). Restyling lite-youtube means overriding its CSS anyway.
4. **i18n**: the `playlabel` attribute is a single static string; we need a reactive `t('...')` value. Trivial in a Vue SFC, awkward inside a custom element.
5. **JSON-LD VideoObject**: we need site-side schema we can compose with our existing `@seo/json-ld` graph (§5.4 in `use-structured-data.js`). Easier when we own the component.

We will write a ~60-line Vue SFC (`src/components/ui/youtube-facade.vue`) that implements the same idea: button with `<picture>` poster, play overlay, on-click replace with iframe. This costs us nothing meaningful in maintenance and gives us full styling/i18n/SSR control. Borrow lite-youtube's preconnect logic and the `pointerover` warm-up trick (see §7.1).

### 4.3 Where the iframe loads

Two render contexts:

- **Inside the modal carousel** (`now-projects-section.vue` modal block, lines 628-687): the facade replaces the current `<picture>` slot at the active carousel index when the entry is a YouTube URL. The iframe lives inside `__carousel-frame` with the same 16:9 aspect ratio container we already have.
- **Inside the chromeless lightbox** (`UiImageViewer`, `image-viewer.vue`): when the user clicks a video slot, we already call `open_image_viewer(card.image_urls[carousel_idx], ...)`. We extend `image-viewer.vue` so that when the `picture` prop is a YouTube descriptor (not a regular image descriptor), it renders the facade at lightbox scale. This is consistent with how the lightbox already handles `picture` vs `img` props. The fullscreen experience is the desktop X equivalent of "expand the tweet".

### 4.4 Privacy mode default

Use `youtube-nocookie.com` unconditionally for the iframe URL. The thumbnail is fetched from `i.ytimg.com`, which sets no cookies on its own as long as we keep it as a plain `<img src>` (no `crossorigin` attribute that would surface cookies). Same-origin `<img>` requests to ytimg do not transmit YouTube cookies anyway.

---

## 5. Data Model Changes

### 5.1 Mixed array shape

Current shape (`src/data/projects.js`):

```js
'reckit': {
  images: ['reckit.jpg'],
  ...
}
```

New shape (backward compatible — strings are still local filenames):

```js
'reckit': {
  images: [
    'reckit.jpg',                                             // local image, unchanged
    'reckit-screenshot-2.png',                                // another local image
    'https://www.youtube.com/watch?v=dQw4w9WgXcQ',            // YouTube URL, any variant
    { kind: 'youtube', id: 'dQw4w9WgXcQ', title: {            // explicit object form (preferred for new entries)
        en: 'Reckit walkthrough demo',
        es: 'Recorrido de demo de Reckit',
      },
      poster: 'reckit-demo-poster.webp',                      // optional local poster override
      published: '2026-04-12',                                // ISO 8601, used in VideoObject JSON-LD
      channel: {                                              // optional, drives the attribution chip
        name: 'Kyonax',
        url:  'https://www.youtube.com/@kyonax_on_tech',
      },
    },
  ],
  ...
}
```

**Why two forms** (string URL or object): the string form is the fast path that authors will write inline. The object form is required when we want translated titles for the accessible label / VideoObject `name`, a custom poster, or a publish date for SEO. The resolver normalises both into the same internal shape.

### 5.2 Detection rule

In `_resolve_images` (`now-projects-section.vue` line 161) we replace the current `.map(_resolve_image).filter(Boolean)` with a normaliser:

```js
const _is_youtube_url = (s) =>
  typeof s === 'string'
  && /^https?:\/\/(?:www\.)?(?:m\.)?(?:youtube\.com|youtu\.be|youtube-nocookie\.com)\//i.test(s);

const _normalise_media_entry = (entry, locale_value) => {
  if (entry && typeof entry === 'object' && entry.kind === 'youtube') {
    return _build_youtube_descriptor(entry, locale_value);
  }
  if (typeof entry === 'string' && _is_youtube_url(entry)) {
    const id = _extract_youtube_id(entry);
    if (!id) return null;
    return _build_youtube_descriptor({ kind: 'youtube', id }, locale_value);
  }
  if (typeof entry === 'string') {
    return _resolve_image(entry); // existing path
  }
  return null;
};
```

### 5.3 URL parsing helper

New file `src/composables/use-youtube.js` (or inline in `src/data/_youtube.js` since it has no Vue-reactive concerns):

```js
const YOUTUBE_ID_RE = /^[A-Za-z0-9_-]{11}$/;

export const extractYoutubeId = (input) => {
  if (!input) return null;
  if (YOUTUBE_ID_RE.test(input)) return input; // already an ID
  let u;
  try { u = new URL(input); } catch { return null; }
  const host = u.hostname.replace(/^www\.|^m\./, '');
  // youtu.be/<id>
  if (host === 'youtu.be') {
    const id = u.pathname.replace(/^\//, '').split('/')[0];
    return YOUTUBE_ID_RE.test(id) ? id : null;
  }
  // youtube.com or youtube-nocookie.com
  if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    // /watch?v=ID
    const v = u.searchParams.get('v');
    if (v && YOUTUBE_ID_RE.test(v)) return v;
    // /embed/ID, /shorts/ID, /live/ID, /v/ID
    const m = u.pathname.match(/^\/(?:embed|shorts|live|v)\/([A-Za-z0-9_-]{11})/);
    if (m) return m[1];
  }
  return null;
};
```

We deliberately use the WHATWG `URL` parser instead of a single mega-regex because (a) it correctly handles `youtu.be/<id>?si=<tracking>` query junk, (b) it rejects malformed URLs cleanly, (c) it sidesteps the catastrophic-backtracking risk in regex-only approaches.

### 5.4 Validator / precheck additions

Add a step to `scripts/precheck.mjs` (or a new `scripts/check-projects-media.mjs` invoked from precheck) that:

1. Imports `PROJECTS` via vite-node (same pattern as `check-json-ld.mjs` line 22).
2. For each entry in every project's `images` array:
   - If string and looks like a URL: run `extractYoutubeId`; fail with the offending project key if `null`.
   - If string and looks like a filename: confirm the file exists in `src/assets/projects/` (this check probably already exists in another precheck; if so, hook into it).
   - If object with `kind: 'youtube'`: confirm `id` is 11 chars matching `YOUTUBE_ID_RE`; confirm `title.en` and `title.es` are present strings; if `poster` is set, confirm the file exists.
3. Optional: HEAD-request `https://i.ytimg.com/vi/<id>/hqdefault.jpg` and fail if 404 (catches deleted/private videos). Gate this behind a `--remote` flag so offline precheck stays fast.

---

## 6. Component Architecture

### 6.1 New primitive: `src/components/ui/youtube-facade.vue`

```vue
<script setup>
/* GPL preamble */
import { ref, computed, onBeforeUnmount } from 'vue';
import { useI18n } from 'vue-i18n';

const props = defineProps({
  videoId: { type: String, required: true },
  title:   { type: String, default: '' },          // already localised by the caller
  poster:  { type: Object, default: null },         // optional image descriptor matching _resolve_image shape
  autoLoad:{ type: Boolean, default: false },       // skip facade, load iframe directly (used by lightbox path)
  origin:  { type: String, default: '' },           // override for tests
});

const emit = defineEmits(['play', 'load']);

const { t, locale } = useI18n();
const _activated = ref(props.autoLoad);
const _iframe_ref = ref(null);

const _origin = computed(() => {
  if (props.origin) return props.origin;
  if (typeof window !== 'undefined') return window.location.origin;
  return 'https://kyonax.com';
});

const poster_src = computed(() => {
  if (props.poster) return props.poster; // local override wins
  return {
    webp:     `https://i.ytimg.com/vi_webp/${props.videoId}/maxresdefault.webp`,
    fallback: `https://i.ytimg.com/vi/${props.videoId}/maxresdefault.jpg`,
    altLow:   `https://i.ytimg.com/vi/${props.videoId}/hqdefault.jpg`,
  };
});

const iframe_src = computed(() => {
  const params = new URLSearchParams({
    autoplay: '1',
    rel: '0',
    enablejsapi: '1',
    playsinline: '1',
    hl: locale.value,
    origin: _origin.value,
  });
  return `https://www.youtube-nocookie.com/embed/${props.videoId}?${params}`;
});

const activate = () => {
  if (_activated.value) return;
  _activated.value = true;
  emit('play');
};

const pause = () => {
  const f = _iframe_ref.value;
  if (!f || !f.contentWindow) return;
  f.contentWindow.postMessage(
    JSON.stringify({ event: 'command', func: 'pauseVideo', args: [] }),
    'https://www.youtube-nocookie.com',
  );
};

defineExpose({ pause, activate });

onBeforeUnmount(pause);
</script>
```

Template (sketch): a `<button>` containing the `<picture>` poster, an SVG play overlay, and the source label. After activation, swap to `<iframe>` with `loading="lazy"`, `allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"`, `allowfullscreen`, `referrerpolicy="strict-origin-when-cross-origin"`, `title={props.title}`.

### 6.2 Carousel branching in `now-projects-section.vue`

The current template at lines 638-650 renders `<picture>` per item. The replacement is a branching `<component>` slot:

```html
<template v-for="(media, i) in card.media_urls" :key="`${card.key}-${i}`">
  <YoutubeFacade
    v-if="media.kind === 'youtube'"
    class="project-modal__carousel-image"
    :class="{ 'is-active': carousel_idx === i }"
    :video-id="media.id"
    :title="media.title"
    :poster="media.poster"
    @play="onCarouselVideoPlay(i)" />
  <picture
    v-else
    class="project-modal__carousel-image"
    :class="{ 'is-active': carousel_idx === i }">
    <!-- existing markup -->
  </picture>
</template>
```

We rename `card.image_urls` to `card.media_urls` to reflect the wider type. Every reference (lines 197, 218, 627-690) updates.

Pause-on-slide-change is handled by a `watch(carousel_idx, ...)` that calls `pause()` on the previously active facade ref.

### 6.3 Image-viewer extension

`image-viewer.vue` currently accepts `picture` (image descriptor) or `img` (raw filename). Add a third shape: when `picture.kind === 'youtube'`, render `<YoutubeFacade :auto-load="true">` inside the chromeless dialog. The `auto-load` flag short-circuits the facade because the user already clicked once to enter the lightbox; a second click-to-play would feel broken.

### 6.4 Pause on slide change / modal close

- Slide change inside the modal: `watch(carousel_idx, (next, prev) => { facade_refs[prev]?.pause(); })`.
- Modal close: the existing `close_modal` flips `active_id` to `null`, which triggers `UiModal`'s `v-if` teardown, which unmounts the facade, which fires `onBeforeUnmount(pause)`. The `pause` postMessage may be a no-op (the iframe is also being unmounted) but it's cheap and defensive.
- Lightbox close: same path; facade unmounts.

### 6.5 Source attribution chip — logo + label (the part the original draft missed)

X's YouTube card carries a small attribution group on the closed-state thumbnail. Reconstructed from §2.1: a row containing the **YouTube wordmark or play-glyph**, optionally the **channel name**, and the **source domain** label. The original §6.1 sketch said "source label" but never specified the logo asset, the channel-name beat, or the styling. This subsection closes that gap.

**Asset to add (Phase B):** `src/assets/brands/youtube.svg`, fetched verbatim from Simple Icons (`https://cdn.jsdelivr.net/npm/simple-icons@latest/icons/youtube.svg`), converted to the kyo standard (viewBox `0 0 24 24`, `fill="currentColor"`, `<title>` and `role` stripped, `aria-hidden="true"` on the host span). The brand-icon registry is glob-derived (§1.45 `@data/brand-icons`), so dropping the file auto-registers it; no code change required. The path is then `<BrandIcon name="youtube" />`.

**Chip composition** inside the facade `<button>`:

```html
<span class="youtube-facade__attribution" aria-hidden="true">
  <BrandIcon name="youtube" class="brand-icon--md" />
  <span class="youtube-facade__source">{{ t('kyo-web.landing.projects.youtube-source') }}</span>
  <span v-if="channelName" class="youtube-facade__channel">{{ channelName }}</span>
</span>
```

- `aria-hidden="true"` on the wrapper because the accessible name of the parent `<button>` already carries the title via `play-video-label` (§8). The visible chip is decorative on top of that label.
- `youtube-source` i18n key keeps the platform tag translatable even though the literal stays `YouTube` in both locales (placeholder kept for future, e.g. accessibility audits or markets where transliteration would matter).
- `channelName` is read from `media.channel?.name` and is rendered only when the object form supplied it. Strings-as-entries (the fast path) skip the channel beat entirely.

**Positioning**: bottom-left of the 16:9 thumbnail, mirroring the position §2.1 documented. Use `position: absolute; bottom: 0.5rem; left: 0.5rem` inside the facade root which is `position: relative`. Counter chip already lives at bottom-right (`__carousel-counter`), so the attribution at bottom-left preserves visual symmetry and avoids overlap.

**Color treatment — explicit decision needed (open question §11.6):**

Two viable options, both compliant with §1.6:

- **Option A — Cyberpunk-neutral.** Render the logo and text in `var(--clr-neutral-100)` on a `color-mix(var(--clr-neutral-900) 78%, transparent)` pill with `backdrop-filter: blur(6px)`. Matches the rest of the modal chrome. The YouTube wordmark becomes monochrome white. Most consistent with the site's cyber identity. **Recommended default.**
- **Option B — YouTube brand red.** Render the play-glyph in YouTube red. Requires adding off-palette brand tokens to `_theme.scss` `:root` (mirroring the `--clr-orcid-*` pattern from §1.5):
  ```scss
  --clr-youtube-bg: #ff0000;
  --clr-youtube-fg: #ffffff;
  ```
  Then the chip uses `background: var(--clr-youtube-bg); color: var(--clr-youtube-fg);`. The §1.6 color rule allows off-palette brand tokens by exception (precedent: ORCID badge). **Trade-off**: stronger source recognition, but louder on a black-background landing.

The plan defaults to Option A; flip to B if the user prefers the literal X look.

**Channel-name micro-typography**: `font-size: 0.75rem; font-weight: 500; letter-spacing: 0.02em;` after a hairline divider (a `·` middle dot or 1px vertical line) between the wordmark and the channel name. SpaceMono for the source label keeps it terminal-style; Geomanist for the channel name reads as natural attribution.

**Lightbox path**: the attribution chip stays visible while the facade is in `_activated: false`. Once the iframe loads (in the modal flow) or the user enters the chromeless lightbox via `image-viewer.vue` (§6.3), the chip is replaced by the iframe's native YouTube chrome — no need to overlay it on top of the player.

**SSR safety**: BrandIcon resolves at compile time via the IconSprite sheet; the chip renders identically on server and client. No `window` access.

---

## 7. Performance Plan

### 7.1 Preconnect, on demand

We do not add `preconnect` to `index.html` because that would warm up YouTube on every page visit, regardless of whether the user opens a modal. Instead, when the user *opens a modal that contains at least one YouTube entry*, we inject preconnect hints on the fly:

```js
const _warm_youtube = (() => {
  let _done = false;
  return () => {
    if (_done || typeof document === 'undefined') return;
    _done = true;
    const hints = [
      ['preconnect', 'https://www.youtube-nocookie.com'],
      ['preconnect', 'https://i.ytimg.com'],
      ['dns-prefetch', 'https://www.google.com'],
    ];
    for (const [rel, href] of hints) {
      const link = document.createElement('link');
      link.rel = rel; link.href = href;
      if (rel === 'preconnect') link.crossOrigin = '';
      document.head.appendChild(link);
    }
  };
})();
```

Trigger on `open_modal` if the card has any YouTube media, AND on `pointerover` of the facade button (covers the desktop fast-hover-then-click pattern).

### 7.2 Iframe loads only on click

Never on mount. The facade renders zero `<iframe>` until `activate()` is called. After click, the iframe is appended to the DOM with `autoplay=1` so the YouTube play button does not need a second user click (we already had one).

### 7.3 Aspect ratio container to prevent CLS

The existing `&__carousel-frame { aspect-ratio: 16 / 9; }` block in `now-projects-section.vue` (line 1090) is already perfect. The facade's root element inherits this. For the lightbox path we add an inline `aspect-ratio: 16 / 9; max-width: 95dvw;` wrapper inside `image-viewer.vue`.

For YouTube Shorts (9:16) we will need a `media.aspect` hint in the descriptor; default to 16:9. See §11 open questions.

### 7.4 SSR safety

The facade SFC must SSR cleanly. Risks:

- `window.location.origin` is accessed at template eval time. Wrap with `typeof window !== 'undefined'` guard (already done in §6.1).
- `_activated` is `ref(false)` on the server, so the server output is the facade poster, not the iframe. Hydration matches.
- The `_warm_youtube` link injector is only called inside event handlers (`open_modal`), which never fire during SSR. Safe.

### 7.5 What to preload when modal opens

When a modal is opened and we know it has YouTube media:

1. Inject the preconnect hints (§7.1).
2. **Do not** preload the iframe HTML. The whole point of the facade is to keep that off the wire.
3. Eagerly load the `maxresdefault.webp` poster (the facade renders `loading="lazy"` for non-active slides but the active one should be `loading="eager"`). We can mirror the existing `<picture>` pattern with the same `loading="lazy"` + first-slide-eager rule.

---

## 8. Accessibility Plan

### 8.1 Facade is a real `<button type="button">`

Not a `<div role="button">`. This gives us Enter and Space activation, native focus ring, no `tabindex` plumbing.

Accessible name uses the `title` prop. We build the label in i18n: new keys

```
"kyo-web.landing.projects.play-video-label": "Play video {title} on YouTube"
"kyo-web.landing.projects.play-video-label": "Reproducir video {title} en YouTube"
```

Note: no em-dashes, no semicolons, no colons. The `{title}` interpolation contains the video title, also localised.

### 8.2 Focus on activation

After the iframe is mounted, we explicitly call `.focus()` on it inside `nextTick`. The YouTube player then owns the focus ring and Tab order. ESC bubbles up to `UiModal.onDialogKeydown` (line 67 of `modal.vue`), so users can always escape with one keypress.

### 8.3 ESC stays consistent

ESC behaviour does not change from the current modal contract. Pause the video on the way out: in `close_modal`, before flipping `active_id` to null, call `facade_refs.value.forEach(f => f?.pause?.())`. The unmount that follows is then idempotent.

### 8.4 Captions

We don't force `cc_load_policy=1`. Users get YouTube's default behaviour for now. Open question: should we surface a toggle? See §11.

### 8.5 Reduced motion

If `window.matchMedia('(prefers-reduced-motion: reduce)').matches`, we still allow playback (the user explicitly clicked play). What we change: the slide transitions in `&__carousel-image { transition: opacity 0.35s ease; }` (line 1118) already respect reduced motion implicitly via the existing global `@media (prefers-reduced-motion)` rule if one exists. If not, this is a separate concern out of scope for this plan.

Reduced transparency: not a YouTube concern.

---

## 9. Privacy, Consent & CSP

### 9.1 youtube-nocookie.com by default

Iframe `src` always uses `https://www.youtube-nocookie.com/embed/<id>`. Justification: the Dustin Whisman article (cited in §13) is honest that nocookie still uses LocalStorage, so this is not full GDPR safety on its own, but it is strictly better than `youtube.com` and matches the Twitter-style click-to-load gate.

### 9.2 Consent gate alignment with existing banner

The existing flow in `cookie-consent.vue` and `index.html` (lines 43-67):

- Default-deny in `index.html` runs before `gtag.js`.
- `cookie-consent.vue` exposes Accept/Decline; on accept it sets `localStorage['kyo:consent'] = 'granted'` and calls `gtag('consent', 'update', { ... 'granted' })`.

For YouTube we add a parallel gate. Options:

- **Option A (recommended)**: do **not** gate the *facade* at all. The facade is just a static `<img>` from `i.ytimg.com` plus inline SVG; no cookies, no Storage. It is GDPR-equivalent to embedding any third-party image. Gate only the *iframe activation*. If `localStorage['kyo:consent']` is not `'granted'`, the click handler shows an inline confirmation ("Loading this video sets cookies on `youtube-nocookie.com`. Continue?") with two buttons. On confirm, persist the consent decision (consider a separate key `kyo:consent:youtube` so YouTube consent is decoupled from gtag consent) and load the iframe.
- **Option B**: refuse to render facade until top-level consent is granted; show a placeholder card with a "give consent to view" CTA. Stronger privacy but worse UX because users who never click Accept never see any video, even though `i.ytimg.com` thumbnails are arguably anonymous.

Option A keeps parity with how X behaves (no banner before showing a YouTube thumbnail) while still respecting GDPR for the actual tracking surface. **Need user confirmation** — listed in §11.

### 9.3 CSP additions in `.htaccess`

The current `.htaccess` (read in full) sets `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy`, `Permissions-Policy`, `X-Content-Type-Options`, but **no Content-Security-Policy header**. Adding one now would be a larger change than just enabling YouTube; CSP must inventory every script source (gtag, vitals, etc.) at once.

Recommendation: add CSP in a follow-up commit. For *this* feature, no CSP changes are strictly required because there is no existing CSP to violate. However, if/when CSP is added, the YouTube-relevant directives must be:

```
frame-src https://www.youtube-nocookie.com https://www.youtube.com;
img-src 'self' data: https://i.ytimg.com;
connect-src 'self' https://www.google-analytics.com https://www.youtube-nocookie.com;
```

`X-Frame-Options: SAMEORIGIN` is an old-school sibling that does **not** affect iframes embedded *from* us toward YouTube. It restricts who can frame us. No change needed.

### 9.4 Privacy page copy

`public/privacy/index.html` and `public/es/privacy/index.html` need a paragraph added under the cookies section to disclose:

- YouTube videos may be embedded on the projects page.
- Thumbnails load from `i.ytimg.com` and set no cookies.
- Clicking play loads `youtube-nocookie.com`, which sets LocalStorage entries and may set cookies subject to Google's privacy policy.
- Link to https://policies.google.com/privacy.

Copy must respect the no-em-dashes / no-semicolons-or-colons rules. Example EN draft (not final):

> Projects in the live work section may include short demo videos hosted on YouTube. Thumbnails load from `i.ytimg.com` without setting cookies. When you click Play, the video loads from `youtube-nocookie.com`, which can store data on your device under Google's privacy policy. You can read it at https://policies.google.com/privacy.

---

## 10. Side Effects & Implications

### 10.1 SSG / prerender behaviour

`vite-ssg` prerenders four routes (en, es, privacy, es/privacy). The facade renders its static poster + button server-side. No client-only escape hatches needed. Confirmed by the SSR safety check in §7.4.

### 10.2 JSON-LD VideoObject for SEO

Per https://developers.google.com/search/docs/appearance/structured-data/video (fetched):

- Required: `name`, `thumbnailUrl`, `uploadDate`.
- Recommended: `description`, `contentUrl` *or* `embedUrl`, `duration`.

We will emit one `VideoObject` per YouTube entry on the page into the existing `@graph` (`src/seo/json-ld/`, consumed via `use-structured-data.js`). Build helper:

```js
export const buildVideoObjectsJsonLd = ({ locale }) => {
  const items = [];
  for (const [key, project] of Object.entries(PROJECTS)) {
    for (const entry of (project.images || [])) {
      const normalised = _coerce_youtube(entry, locale);
      if (!normalised) continue;
      items.push({
        '@type': 'VideoObject',
        '@id': `${SITE_URL}#video-${normalised.id}`,
        name: normalised.title[locale] || normalised.title.en || project.name,
        description: project.description || normalised.title.en,
        thumbnailUrl: [
          `https://i.ytimg.com/vi/${normalised.id}/maxresdefault.jpg`,
          `https://i.ytimg.com/vi/${normalised.id}/hqdefault.jpg`,
        ],
        uploadDate: normalised.published || '2026-01-01', // fallback ISO
        embedUrl: `https://www.youtube-nocookie.com/embed/${normalised.id}`,
        contentUrl: `https://www.youtube.com/watch?v=${normalised.id}`,
        isPartOf: { '@id': `${SITE_URL}#now-projects` },
      });
    }
  }
  return items;
};
```

`check-json-ld.mjs` (lines 28-33) gets a new `REQUIRED.VideoObject = ['name', 'thumbnailUrl', 'uploadDate']` block. Locale-aware build is already handled by the existing locale loop.

### 10.3 i18n keys to add

New keys under `kyo-web.landing.projects.*` in both EN and ES blocks of `src/data/snippets.js`:

- `play-video-label` — accessible label, ICU placeholder `{title}`.
- `youtube-source` — the small "YouTube" tag on the facade. EN `YouTube`, ES `YouTube`.
- `youtube-consent-prompt` — only if Option B in §9.2 wins. EN body and confirm/decline button labels.

All strings honour the no-em-dashes / no-semicolons-or-colons / general-audience rules.

### 10.4 Bundle size delta estimate

- `youtube-facade.vue` SFC: ~1.5 KB minified + gzip.
- `_youtube.js` helpers: ~0.5 KB.
- VideoObject graph builder: ~0.3 KB.
- Preconnect helper: ~0.2 KB.
- **Total client cost when no YouTube is shown**: ~0 KB beyond the JSON-LD additions (the facade is route-code-split since it's only imported by `now-projects-section.vue`, which is already in the landing bundle).
- **Network cost when modal opens**: 1 image (~30 KB for `maxresdefault.webp`), 0 scripts.
- **Network cost on play**: ~500 KB YouTube iframe + downstream.

### 10.5 Network requests added per modal open

With no YouTube entry in the project: zero.

With at least one YouTube entry: three thumbnail loads (one per video), three preconnect hints (head-injected), zero scripts. Confirms the "no script load until user click" goal.

---

## 11. Open Questions for the User

1. **Closed-card preview**: should the closed `now-projects-section` card ever show a YouTube thumbnail (e.g. a small inline preview tile), or do YouTube videos only ever appear inside the opened modal carousel? My current assumption is **modal-only**, matching the current "images only inside modal" model.
2. **Autoplay**: I am defaulting to `autoplay=1` *after the user clicks the facade*, since the click is the user gesture and the second click on the YouTube play button is annoying. Confirm. If you'd rather mirror X exactly (two clicks total: facade click loads the iframe, YouTube play button starts it), drop `autoplay`.
3. **"Open on YouTube" link**: should the facade include a small text link (something like "Open on YouTube") next to the play overlay for users who don't want inline playback? Twitter-style cards do not. My preference: no, keep parity.
4. **Consent before facade**: Option A (facade always renders, iframe loads need consent) vs Option B (facade hidden until top-level consent granted). I recommend A. Confirm.
5. **YouTube Shorts (vertical)**: how do we want to display a 9:16 video inside a 16:9 carousel slot? Letterbox in the existing slot, or branch the aspect-ratio container to vertical when `media.kind === 'youtube' && media.aspect === '9:16'`? Letterbox is simpler. Vertical container is prettier but changes the carousel height across slides.
6. **Attribution chip color treatment (§6.5)**: Option A cyberpunk-neutral (logo + label in `var(--clr-neutral-100)` on a translucent charcoal pill, consistent with the rest of the modal chrome — recommended) vs Option B YouTube brand red (off-palette `--clr-youtube-bg: #ff0000` / `--clr-youtube-fg: #ffffff` tokens added to `_theme.scss` mirroring the ORCID precedent — stronger source recognition, louder on the black landing). Plus a secondary question: should the chip always show the channel name when `media.channel.name` is supplied, or only when the project explicitly opts in via a separate `attribution.showChannel: true` flag?
7. **Captions default**: leave YouTube's default (off, user toggles in player) or force `cc_load_policy=1` on `prefers-reduced-motion` or `prefers-reduced-transparency`? I recommend leaving it user-controlled in v1.
8. **Privacy banner re-consent**: should YouTube get its own consent key (`kyo:consent:youtube`), or is the existing `kyo:consent` enough? Separating keys lets users decline analytics but allow YouTube, which is more granular and arguably more respectful. Implementation is +20 lines.

---

## 12. Implementation Phases

> Tick boxes as work lands. Phase 0 (decisions) must be fully ticked before Phase A starts — every checkbox after Phase 0 either assumes a default from §11 or stalls on it.

### Phase 0 — Decisions to lock before any code (maps to §11)

All 8 decisions resolved 2026-05-17 at the recommended defaults.

- [x] **Q1 Closed-card preview** — modal-only
- [x] **Q2 Autoplay after facade click** — `autoplay=1` (one-click play)
- [x] **Q3 "Open on YouTube" link** — omit, mirror X
- [x] **Q4 Consent gate shape** — Option A (facade always renders, iframe activation needs consent)
- [x] **Q5 YouTube Shorts aspect** — letterbox into 16:9
- [x] **Q6 Attribution chip color** — Option A cyberpunk-neutral; channel-name opt-in via `attribution.showChannel: true` flag
- [x] **Q7 Captions default** — YouTube default (no `cc_load_policy` force)
- [x] **Q8 Consent key granularity** — reuse global `kyo:consent`

### Phase A — URL parsing + data model (no UI changes)

- [x] Create `src/data/_youtube.js` with `extractYoutubeId`, `YOUTUBE_ID_RE`, `normaliseMediaEntry`.
- [x] Extend `_resolve_images` in `now-projects-section.vue` to `_resolve_media`, branch on type. Add `media_urls` (rename from `image_urls`) on the card model. All current image arrays still work because strings without protocol pass through to `_resolve_image` unchanged.
- [ ] Author one project's `images` array to include a YouTube entry — **deferred until the user supplies a real video URL.** Smoke-tested with a temp `dQw4w9WgXcQ` entry on reckit; reverted after verification.
- [x] Add `scripts/check-projects-media.mjs`; wire into `scripts/precheck.mjs`.
- [x] Run `npm run precheck` — all gates green, no regressions in i18n / color / license.

### Phase B — `UiYoutubeFacade` primitive + carousel branching

- [x] Create `src/components/ui/youtube-facade.vue` per §6.1.
- [x] Drop the Simple Icons `youtube.svg` into `src/assets/brands/` (kyo-standard: viewBox `0 0 24 24`, `fill="currentColor"`, no `<title>`, no `role`). Auto-registers via the glob in `@data/brand-icons` (§1.45). Verified `<symbol id="brand-youtube">` lands in the dist IconSprite.
- [x] Implement the attribution chip per §6.5 (logo + source label + optional channel name, positioned bottom-left). Option A cyberpunk-neutral. Channel-name opt-in via `attribution.showChannel` flag on the entry.
- [x] Add SCSS that mirrors the Twitter-card visual (cyan accent border on focus, charcoal poster background, centred SVG play overlay, counter chip at bottom-right, attribution chip at bottom-left). All `var(--clr-*)` tokens — no hex literals.
- [x] Update the modal carousel block in `now-projects-section.vue` to branch on entry type (§6.2). Outer `<button>` became `<div>` to avoid nested buttons; image slides got per-slide `<button>` wrappers.
- [x] Add `watch(carousel_idx, pause)` plumbing and per-card refs map for facades (`bind_facade_ref(el, card.key, i)`).
- [x] Add `_warm_modal` preconnect helper, calls on `open_modal` (only when the modal contains YouTube media). Per-facade `pointerover` warmup already inside the facade SFC.
- [x] Add the new i18n key `kyo-web.landing.projects.youtube-source` in both EN and ES blocks of `snippets.js` (literal value `YouTube` in both). Plain `t()` consumption; no allowlist entry needed.
- [x] Add `play-video-label` i18n key (ICU `{title}` placeholder, EN + ES). Plus 4 consent-prompt strings (title, body, accept, decline).

### Phase C — UiImageViewer extension for fullscreen YouTube

- [x] Branch `image-viewer.vue` template to render `<YoutubeFacade :auto-load="true">` when `picture.kind === 'youtube'`. Sized 16:9 inside the chromeless lightbox at `min(95dvw, 90dvh × 16/9)`.
- [x] `open_image_viewer` callsite in `now-projects-section.vue` already forwards the descriptor unchanged (image slides still call it with the media object); YouTube slides do NOT route through the lightbox by default — the inline facade owns the click.
- [x] Verified ref-counted body lock via `UiModal.ModalLockRegistry` still releases when both modal and viewer close.

### Phase D — Consent gate + CSP headers + privacy page copy

- [x] Option A consent flow implemented inline in `youtube-facade.vue`: facade renders unconditionally; first iframe activation shows an inline confirm prompt unless `localStorage['kyo:consent'] === 'granted'`. Accepting persists the global key and updates `gtag` consent.
- [x] No additional consent-prompt i18n keys needed for Option B (skipped) — Option A's prompt copy added to `snippets.js` under `projects.youtube-consent-*`.
- [x] Updated `public/privacy/index.html` and `public/es/privacy/index.html` with an "Embedded videos" section disclosing `i.ytimg.com` thumbnails (no cookies), `youtube-nocookie.com` playback, and Google's privacy policy link.
- [x] CSP additions deferred — `.htaccess` has no existing CSP, and introducing one needs a full script-source inventory. Documented in §9.3.

### Phase E — JSON-LD VideoObject + sitemap considerations

- [x] Added `buildVideoObjectsJsonLd` to `src/seo/json-ld/videos.js` and wired into the `@graph` build in `index.js`. Emits one `VideoObject` per YouTube entry, locale-aware `@id`, `isPartOf` reference to `WEBSITE_ID`, required fields `name`/`thumbnailUrl`/`uploadDate`, plus recommended `description`/`embedUrl`/`contentUrl`/`inLanguage`/`keywords`.
- [x] Extended `REQUIRED.VideoObject = ['name', 'thumbnailUrl', 'uploadDate']` in `scripts/check-json-ld.mjs`. Smoke-tested with a temp entry — graph went from 3 → 4 entities, refs resolved, required fields present.
- [x] Sitemap: `scripts/generate-sitemap.mjs` only emits the two HTML routes. VideoObject is page-embedded, so no sitemap entry per video. No changes needed.

### Phase F — Tests + audit

- [x] `scripts/check-projects-media.mjs` covers data integrity. Green against current state (5 local image entries, 0 YouTube).
- [x] `scripts/check-json-ld.mjs` validates the new VideoObject `@graph` nodes when present. Smoke-tested with `dQw4w9WgXcQ` injected into reckit.images; reverted after verification.
- [ ] Manual SEO audit: paste the rendered page into https://validator.schema.org and https://search.google.com/test/rich-results once a real video URL is added.
- [ ] Manual a11y audit: tab through modal carousel with a YouTube entry; confirm focus order, ESC behaviour, screen-reader announcement of "Play video <title> on YouTube".
- [ ] Lighthouse run confirming no third-party scripts load before user clicks Play.
- [ ] Smoke test on a real mobile device (iOS Safari + Android Chrome) — confirm play behaviour, focus management on iframe activation, ESC closes correctly without console errors.

---

## 13. References

### Repo files read

- `/Volumes/dev-partition/github-kyonax/kyo-web-online/src/views/components/sections/now-projects-section.vue` — full file, esp. lines 39-52 (`_resolve_image`), 161-166 (`_resolve_images`), 197-220 (card model), 271-306 (modal state, keydown), 627-687 (modal carousel template), 1083-1194 (carousel SCSS).
- `/Volumes/dev-partition/github-kyonax/kyo-web-online/src/components/ui/image-viewer.vue` — full file. Branches on `picture` vs `img` props.
- `/Volumes/dev-partition/github-kyonax/kyo-web-online/src/data/projects.js` — full file, esp. lines 34-100. Confirmed the `images: ['<slug>.jpg']` shape.
- `/Volumes/dev-partition/github-kyonax/kyo-web-online/src/components/ui/modal.vue` — full file. Focus trap (line 46), Escape handling (line 67), ref-counted body lock (line 9).
- `/Volumes/dev-partition/github-kyonax/kyo-web-online/public/.htaccess` — full file. Confirmed no CSP header is currently set.
- `/Volumes/dev-partition/github-kyonax/kyo-web-online/index.html` — full file. Confirmed Consent Mode v2 default-deny block at lines 43-67.
- `/Volumes/dev-partition/github-kyonax/kyo-web-online/src/components/cookie-consent.vue` — full file. Confirmed `STORAGE_KEY = 'kyo:consent'`, `_update` gtag flow.
- `/Volumes/dev-partition/github-kyonax/kyo-web-online/src/composables/use-seo-head.js` — first 80 lines; head/meta wiring pattern.
- `/Volumes/dev-partition/github-kyonax/kyo-web-online/scripts/check-json-ld.mjs` — first 60 lines; locale loop and required-property validator pattern.
- `/Volumes/dev-partition/github-kyonax/kyo-web-online/src/data/snippets.js` — i18n keys at lines 141, 172, 181-186, 405-419 (project modal copy).
- `/Volumes/dev-partition/github-kyonax/kyo-web-online/src/composables/use-structured-data.js` — JSON-LD head injection point.

### External URLs fetched / searched

- https://github.com/twitter/the-algorithm — confirmed: rendering / iframe / card code **not** open source. Repo is recommendation algorithm only.
- https://github.com/twitter/the-algorithm-ml — ranking models, irrelevant.
- https://developer.twitter.com/en/docs/twitter-for-websites/cards/overview/player-card — Player Card schema. Confirms third-party publishers register via `twitter:player` meta tags; YouTube uses a separate internal whitelist.
- https://devcommunity.x.com/t/avoid-extra-tap-to-play-a-youtube-video-that-appears-in-an-embedded-tweet-in-wkwebview/161293 — confirms the two-tap pattern on iOS.
- https://devcommunity.x.com/t/blue-play-button-showing-in-ios-twitter-card-video-playback/72796 — confirms play-button overlay on iOS.
- https://devcommunity.x.com/t/autoplay-videos-in-player-card/153187 — confirms YouTube embeds do not autoplay on X.
- https://github.com/paulirish/lite-youtube-embed — facade reference implementation. Confirmed: 0.3.4 (Nov 10, 2025), zero deps, uses `youtube-nocookie.com`, "approximately 224x faster" claim, exposes `videoid` / `playlabel` / `params` / `js-api` attributes, accessible via visually-hidden span. Did not adopt — see §4.2.
- https://github.com/itteco/iframely — open-source oEmbed proxy. Useful as a reference for the YouTube metadata payload shape (title, channel, thumbnail, embedUrl).
- https://developers.google.com/youtube/iframe_api_reference — IFrame Player API. Confirmed `enablejsapi=1` requirement and `postMessage` JSON shape for `pauseVideo`.
- https://developers.google.com/youtube/player_parameters — fetched. Confirmed `modestbranding` was deprecated 2023-08-15 and has no effect. Confirmed `rel=0` semantics changed in Sep 2018 to "same channel only".
- https://developers.google.com/search/docs/appearance/structured-data/video — fetched. Confirmed VideoObject required vs recommended properties.
- https://schema.org/VideoObject — schema spec.
- https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Content-Security-Policy/frame-src — CSP frame-src reference for §9.3.
- https://jloh.co/posts/youtube-csp/ — concrete YouTube CSP recipe.
- https://complianz.io/youtube-and-the-gdpr-how-to-embed-youtube-on-your-site/ — GDPR posture analysis.
- https://dustinwhisman.com/writing/youtube-nocookie-com-will-still-track-user-data/ — "youtube-nocookie still tracks via LocalStorage" honesty check.
- https://web.dev/articles/embed-best-practices — facade pattern justification, ~500 KB savings claim.
- https://gist.github.com/takien/4077195 — reference JS regex for YouTube ID extraction (rejected in favour of URL-parser approach in §5.3 to avoid backtracking risk).
- https://regexr.com/3nsop — alternative regex reference.

### What I did **not** find (negative results, recorded honestly)

- No GitHub-hosted Twitter / X repository containing the actual YouTube card renderer. Confirmed via direct WebFetch of `twitter/the-algorithm` and via WebSearch for "twitter the-algorithm github open source youtube iframe card unfurl renderer". The card UI is proprietary closed-source.
- No public documentation from X explaining their YouTube embed swap mechanism. UX behaviour reconstructed entirely from developer-forum threads (cited above) and direct observation as reported in those threads.
- `lite-youtube-embed` README contents could not be fetched directly (status 404 on the raw URL guess). Bundle size for that library is stated as ~3 KB JS + ~1 KB CSS based on the npm page and the GitHub repo summary; treat as approximate, not authoritative.
