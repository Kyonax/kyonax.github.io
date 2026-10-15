<script setup>
/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 */

/*
 * The blog's share sheet — the popup under the nav's share button.
 *
 * IT REPLACES A TEXT BUTTON THAT SAID "SHARE" AT THE END OF THE META ROW. That
 * button did one of two invisible things — the system share sheet where the
 * browser had one, a silent copy where it did not — and the word gave no hint
 * which. The nav now carries an icon, the way the résumé carries its download,
 * and this sheet names every destination on screen.
 *
 * AN ASYNC CHUNK, FETCHED ON FIRST OPEN (hud-nav warms it on hover and focus).
 * Nothing here exists in the prerender — a sheet that can only act through
 * script has nothing to say without it — so none of it belongs in the main
 * bundle every visitor downloads. Its file name must not start with `blog-`:
 * .size-limit.json sweeps `dist/assets/blog-*` into the archive's budget.
 *
 * A NON-MODAL DIALOG. Tab walks the rows and walks on out of them; nothing is
 * trapped and nothing behind it goes inert. Escape closes it and hands focus
 * back to the button, a press anywhere else closes it, and so does a route
 * change — the language toggle is a client-side push to the twin article,
 * whose title and URL are no longer the ones shown here.
 *
 * WHAT IS SHARED IS READ FROM THE PAGE, when the sheet opens. The canonical
 * <link> is the address the site already stands behind — never whichever host
 * happens to be serving it — and the <h1> is the headline the reader is
 * looking at. Both exist on the archive and on every article, so the sheet
 * needs no props and cannot be handed a stale pair.
 *
 * EVERY TRACKED LINK OPENS A NEW TAB AND EVERY TRACKED CONTROL IS A BUTTON —
 * the site's analytics law. Umami intercepts a same-tab <a> that carries
 * data-umami-event and re-navigates it itself; it leaves _blank links and
 * buttons alone.
 */

import { AUTHOR_INFO, SITE_ORIGIN } from '@data/data';
import {
  computed, nextTick, onBeforeUnmount, onMounted, ref, watch,
} from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';

const emit = defineEmits(['close']);

const { t } = useI18n();
const route = useRoute();

const COPIED_MS = 1400;
const MASTODON_KEY = 'kyo:mastodon-server';
const VIA = AUTHOR_INFO.twitter.replace(/^@/, '');

/*
 * THE GLYPHS LIVE HERE, NOT IN THE SPRITE. The sprite is inlined into every
 * page's HTML, so a mark added there is paid for on the landing and the CV by
 * people who never open this sheet. X and LinkedIn are already in it for the
 * site's own profiles, so those two are referenced; the rest ride in this
 * chunk. Single paths, painted with currentColor.
 *
 * Brand marks: Simple Icons, CC0 1.0 — Hacker News is drawn as the Y
 * Combinator mark, which is what it wears. The link and the system-share
 * arrow: Font Awesome Free 7, CC BY 4.0. The arrow is the platform's own
 * share glyph rather than the nav's share nodes, because "More options" hands
 * the reader to the system's sheet, not to another copy of this one.
 */
const ICON_BLUESKY = 'M5.202 2.857C7.954 4.922 10.913 9.11 12 11.358c1.087-2.247 4.046-6.436 6.798-8.501C20.783 1.366 24 .213 24 3.883c0 .732-.42 6.156-.667 7.037-.856 3.061-3.978 3.842-6.755 3.37 4.854.826 6.089 3.562 3.422 6.299-5.065 5.196-7.28-1.304-7.847-2.97-.104-.305-.152-.448-.153-.327 0-.121-.05.022-.153.327-.568 1.666-2.782 8.166-7.847 2.97-2.667-2.737-1.432-5.473 3.422-6.3-2.777.473-5.899-.308-6.755-3.369C.42 10.04 0 4.615 0 3.883c0-3.67 3.217-2.517 5.202-1.026';
const ICON_MASTODON = 'M23.268 5.313c-.35-2.578-2.617-4.61-5.304-5.004C17.51.242 15.792 0 11.813 0h-.03c-3.98 0-4.835.242-5.288.309C3.882.692 1.496 2.518.917 5.127.64 6.412.61 7.837.661 9.143c.074 1.874.088 3.745.26 5.611.118 1.24.325 2.47.62 3.68.55 2.237 2.777 4.098 4.96 4.857 2.336.792 4.849.923 7.256.38.265-.061.527-.132.786-.213.585-.184 1.27-.39 1.774-.753a.057.057 0 0 0 .023-.043v-1.809a.052.052 0 0 0-.02-.041.053.053 0 0 0-.046-.01 20.282 20.282 0 0 1-4.709.545c-2.73 0-3.463-1.284-3.674-1.818a5.593 5.593 0 0 1-.319-1.433.053.053 0 0 1 .066-.054c1.517.363 3.072.546 4.632.546.376 0 .75 0 1.125-.01 1.57-.044 3.224-.124 4.768-.422.038-.008.077-.015.11-.024 2.435-.464 4.753-1.92 4.989-5.604.008-.145.03-1.52.03-1.67.002-.512.167-3.63-.024-5.545zm-3.748 9.195h-2.561V8.29c0-1.309-.55-1.976-1.67-1.976-1.23 0-1.846.79-1.846 2.35v3.403h-2.546V8.663c0-1.56-.617-2.35-1.848-2.35-1.112 0-1.668.668-1.67 1.977v6.218H4.822V8.102c0-1.31.337-2.35 1.011-3.12.696-.77 1.608-1.164 2.74-1.164 1.311 0 2.302.5 2.962 1.498l.638 1.06.638-1.06c.66-.999 1.65-1.498 2.96-1.498 1.13 0 2.043.395 2.74 1.164.675.77 1.012 1.81 1.012 3.12z';
const ICON_YC = 'M0 24V0h24v24H0zM6.951 5.896l4.112 7.708v5.064h1.583v-4.972l4.148-7.799h-1.749l-2.457 4.875c-.372.745-.688 1.434-.688 1.434s-.297-.708-.651-1.434L8.831 5.896h-1.88z';
const ICON_REDDIT = 'M12 0C5.373 0 0 5.373 0 12c0 3.314 1.343 6.314 3.515 8.485l-2.286 2.286C.775 23.225 1.097 24 1.738 24H12c6.627 0 12-5.373 12-12S18.627 0 12 0Zm4.388 3.199c1.104 0 1.999.895 1.999 1.999 0 1.105-.895 2-1.999 2-.946 0-1.739-.657-1.947-1.539v.002c-1.147.162-2.032 1.15-2.032 2.341v.007c1.776.067 3.4.567 4.686 1.363.473-.363 1.064-.58 1.707-.58 1.547 0 2.802 1.254 2.802 2.802 0 1.117-.655 2.081-1.601 2.531-.088 3.256-3.637 5.876-7.997 5.876-4.361 0-7.905-2.617-7.998-5.87-.954-.447-1.614-1.415-1.614-2.538 0-1.548 1.255-2.802 2.803-2.802.645 0 1.239.218 1.712.585 1.275-.79 2.881-1.291 4.64-1.365v-.01c0-1.663 1.263-3.034 2.88-3.207.188-.911.993-1.595 1.959-1.595Zm-8.085 8.376c-.784 0-1.459.78-1.506 1.797-.047 1.016.64 1.429 1.426 1.429.786 0 1.371-.369 1.418-1.385.047-1.017-.553-1.841-1.338-1.841Zm7.406 0c-.786 0-1.385.824-1.338 1.841.047 1.017.634 1.385 1.418 1.385.785 0 1.473-.413 1.426-1.429-.046-1.017-.721-1.797-1.506-1.797Zm-3.703 4.013c-.974 0-1.907.048-2.77.135-.147.015-.241.168-.183.305.483 1.154 1.622 1.964 2.953 1.964 1.33 0 2.47-.81 2.953-1.964.057-.137-.037-.29-.184-.305-.863-.087-1.795-.135-2.769-.135Z';
const ICON_LINK = 'M419.5 96c-16.6 0-32.7 4.5-46.8 12.7-15.8-16-34.2-29.4-54.5-39.5 28.2-24 64.1-37.2 101.3-37.2 86.4 0 156.5 70 156.5 156.5 0 41.5-16.5 81.3-45.8 110.6l-71.1 71.1c-29.3 29.3-69.1 45.8-110.6 45.8-86.4 0-156.5-70-156.5-156.5 0-1.5 0-3 .1-4.5 .5-17.7 15.2-31.6 32.9-31.1s31.6 15.2 31.1 32.9c0 .9 0 1.8 0 2.6 0 51.1 41.4 92.5 92.5 92.5 24.5 0 48-9.7 65.4-27.1l71.1-71.1c17.3-17.3 27.1-40.9 27.1-65.4 0-51.1-41.4-92.5-92.5-92.5zM275.2 173.3c-1.9-.8-3.8-1.9-5.5-3.1-12.6-6.5-27-10.2-42.1-10.2-24.5 0-48 9.7-65.4 27.1L91.1 258.2c-17.3 17.3-27.1 40.9-27.1 65.4 0 51.1 41.4 92.5 92.5 92.5 16.5 0 32.6-4.4 46.7-12.6 15.8 16 34.2 29.4 54.6 39.5-28.2 23.9-64 37.2-101.3 37.2-86.4 0-156.5-70-156.5-156.5 0-41.5 16.5-81.3 45.8-110.6l71.1-71.1c29.3-29.3 69.1-45.8 110.6-45.8 86.6 0 156.5 70.6 156.5 156.9 0 1.3 0 2.6 0 3.9-.4 17.7-15.1 31.6-32.8 31.2s-31.6-15.1-31.2-32.8c0-.8 0-1.5 0-2.3 0-33.7-18-63.3-44.8-79.6z';
const ICON_NATIVE = 'M246.6 9.4c-12.5-12.5-32.8-12.5-45.3 0l-128 128c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L192 109.3 192 320c0 17.7 14.3 32 32 32s32-14.3 32-32l0-210.7 73.4 73.4c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3l-128-128zM64 352c0-17.7-14.3-32-32-32S0 334.3 0 352l0 64c0 53 43 96 96 96l256 0c53 0 96-43 96-96l0-64c0-17.7-14.3-32-32-32s-32 14.3-32 32l0 64c0 17.7-14.3 32-32 32L96 448c-17.7 0-32-14.3-32-32l0-64z';

const canonical = document.querySelector('link[rel="canonical"]');
const url = canonical?.href || `${SITE_ORIGIN}${window.location.pathname}`;
const headline = document.querySelector('h1')?.textContent || '';
const title = headline.replace(/\s+/g, ' ').trim() || document.title;

const enc = encodeURIComponent;
/* Bluesky and Mastodon take one text field, so the link rides in the post. */
const text = `${title} ${url}`;

/*
 * THE ORDER IS THE OWNER'S, and share.spec.js pins it. Brand names are
 * literals, not catalogue keys — a name is the same word in every language,
 * and the catalogue ships eagerly. Mastodon has no `href` because it has no
 * universal intent: it asks for the reader's server first (see below).
 */
const TARGETS = [
  {
    id: 'x',
    label: 'X',
    use: '#brand-x',
    href: `https://x.com/intent/post?text=${enc(title)}&url=${enc(url)}&via=${enc(VIA)}`,
  },
  {
    id: 'bluesky',
    label: 'Bluesky',
    d: ICON_BLUESKY,
    href: `https://bsky.app/intent/compose?text=${enc(text)}`,
  },
  { id: 'mastodon', label: 'Mastodon', d: ICON_MASTODON },
  {
    id: 'linkedin',
    label: 'LinkedIn',
    use: '#brand-linkedin',
    href: `https://www.linkedin.com/sharing/share-offsite/?url=${enc(url)}`,
  },
  {
    id: 'hackernews',
    label: 'Hacker News',
    d: ICON_YC,
    href: `https://news.ycombinator.com/submitlink?u=${enc(url)}&t=${enc(title)}`,
  },
  {
    id: 'reddit',
    label: 'Reddit',
    d: ICON_REDDIT,
    href: `https://www.reddit.com/submit?url=${enc(url)}&title=${enc(title)}`,
  },
];

const root = ref(null);

/* The button that owns this sheet is whichever control names it in
   aria-controls — the ARIA contract itself, so hud-nav hands nothing down. */
const trigger = () => document.querySelector('[aria-controls="share-sheet"]');

const close = (refocus) => {
  /* Focus moves BEFORE the sheet unmounts: removed with focus inside it, the
     browser would drop focus on <body>, and a keyboard reader would start
     over from the top of the page. */
  if (refocus) {
    trigger()?.focus();
  }
  emit('close');
};

/* `defaultPrevented` means a control inside the page already spent this
   Escape — the language menu closing itself — and one key closes one thing. */
const onKeydown = (event) => {
  if (event.key === 'Escape' && !event.defaultPrevented) {
    close(true);
  }
};

/* A press, not a click: the sheet is gone before the pointer lifts, the way
   the nav drawer dismisses. The button itself is left out, so a press on it
   is the button's own toggle rather than a close and an instant reopen.
   Capture phase, so a child that stops propagation cannot keep it open. */
const onPointerDown = (event) => {
  if (root.value?.contains(event.target) || trigger()?.contains(event.target)) {
    return;
  }
  close(false);
};

watch(() => route.path, () => close(false));

onMounted(() => {
  root.value?.querySelector('.share-sheet__row')?.focus();
  document.addEventListener('keydown', onKeydown);
  document.addEventListener('pointerdown', onPointerDown, true);
});

let copied_timer = 0;

onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKeydown);
  document.removeEventListener('pointerdown', onPointerDown, true);
  clearTimeout(copied_timer);
  /* Whatever takes the sheet away — its own close, or the button leaving the
     nav on a page that is not the blog — the button's state follows it, so
     the next blog page never opens with a sheet nobody asked for. */
  emit('close');
});

/*
 * MASTODON — THE ONE NETWORK WITH NO SINGLE ADDRESS TO SEND A POST TO. Every
 * server hosts its own compose page, so the row opens a field for the
 * reader's server, and the site remembers it for next time.
 *
 * WHAT A READER TYPES IS FORGIVEN BEFORE IT IS CHECKED: a pasted profile URL
 * or a full handle both name the server, so the protocol, any path and a
 * leading `@user@` are stripped first. What remains must be a bare host.
 *
 * STORAGE IS OPTIONAL. A browser that refuses it — private windows, blocked
 * site data — still posts; it just asks again next time.
 */
/* safe-regex flags any nested quantifier, but this one cannot backtrack: every
   repeat opens on a literal dot the inner class never matches, so a string
   splits into labels exactly one way and the match is linear. */
// eslint-disable-next-line security/detect-unsafe-regex
const HOST_RE = /^[a-z0-9-]+(\.[a-z0-9-]+)+$/i;

const readServer = () => {
  try {
    return localStorage.getItem(MASTODON_KEY) || '';
  } catch {
    return '';
  }
};

const keepServer = (host) => {
  try {
    localStorage.setItem(MASTODON_KEY, host);
  } catch {
    /* Nothing to keep it in; the post goes out regardless. */
  }
};

const mastodon_open = ref(false);
const server = ref(readServer());
const server_invalid = ref(false);

const focusServer = () => root.value?.querySelector('.share-sheet__input')?.focus();

const toggleMastodon = async () => {
  mastodon_open.value = !mastodon_open.value;
  if (mastodon_open.value) {
    await nextTick();
    focusServer();
  }
};

const normaliseServer = (raw) => raw.trim()
  .replace(/^[a-z][\w+.-]*:\/\//i, '')
  .replace(/[/?#].*$/, '')
  .replace(/^@?[^@]*@/, '')
  .toLowerCase();

const postToMastodon = () => {
  const host = normaliseServer(server.value);
  /* No catalogue string says what is wrong, so the field says it the way a
     field can: aria-invalid for a screen reader, and the caret back in it —
     a text input always shows its focus ring, whatever moved focus there. */
  if (!HOST_RE.test(host)) {
    server_invalid.value = true;
    focusServer();
    return;
  }
  server_invalid.value = false;
  server.value = host;
  keepServer(host);
  window.open(`https://${host}/share?text=${enc(text)}`, '_blank', 'noopener');
};

/* The meta-row button's behaviour, kept: the label says it worked, for as
   long as it takes to read, inside a polite live region so a screen reader
   hears it too. With no clipboard the label simply never changes. */
const copied = ref(false);
const copy_label = computed(() => (copied.value
  ? t('kyo-web.blog.share-copied')
  : t('kyo-web.blog.share-copy')));

const copyLink = async () => {
  try {
    await navigator.clipboard.writeText(url);
  } catch {
    return;
  }
  copied.value = true;
  clearTimeout(copied_timer);
  copied_timer = setTimeout(() => {
    copied.value = false;
  }, COPIED_MS);
};

/* The system's own share sheet, offered only where it exists — a row that
   did nothing on a desktop Linux browser would be a lie. */
const has_native = typeof navigator.share === 'function';

const shareNative = async () => {
  try {
    await navigator.share({ title, url });
  } catch {
    /* An AbortError is the reader closing the system sheet — a choice, not
       a failure — and any other rejection leaves nothing to recover. */
  }
};
</script>

<template>
  <div
    id="share-sheet"
    ref="root"
    class="share-sheet"
    role="dialog"
    :aria-label="t('kyo-web.blog.share')"
  >
    <div class="share-sheet__head">
      <p class="share-sheet__label">
        {{ t('kyo-web.blog.share') }}
      </p>
      <button
        type="button"
        class="share-sheet__close"
        :aria-label="t('kyo-web.landing.modal.close')"
        @click="close(true)"
      >
        <svg
          class="share-sheet__close-icon"
          viewBox="0 0 16 16"
          aria-hidden="true"
          focusable="false"
        >
          <path d="M3.5 3.5l9 9m0-9-9 9" />
        </svg>
      </button>
    </div>

    <p class="share-sheet__title">
      {{ title }}
    </p>

    <ul class="share-sheet__list" role="list">
      <li v-for="target in TARGETS" :key="target.id">
        <a
          v-if="target.href"
          class="share-sheet__row"
          :href="target.href"
          target="_blank"
          rel="noopener noreferrer"
          data-umami-event="share"
          :data-umami-event-to="target.id"
        >
          <svg
            class="share-sheet__icon"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
            focusable="false"
          >
            <use v-if="target.use" :href="target.use" />
            <path v-else :d="target.d" />
          </svg>
          {{ target.label }}
        </a>

        <template v-else>
          <button
            type="button"
            class="share-sheet__row"
            aria-controls="share-sheet-mastodon"
            :aria-expanded="String(mastodon_open)"
            @click="toggleMastodon"
          >
            <svg
              class="share-sheet__icon"
              viewBox="0 0 24 24"
              fill="currentColor"
              aria-hidden="true"
              focusable="false"
            >
              <path :d="target.d" />
            </svg>
            {{ target.label }}
          </button>

          <!-- A real form, so Enter submits it and a phone's keyboard offers
               "send". The submit is the tracked control, a <button>. -->
          <form
            v-if="mastodon_open"
            id="share-sheet-mastodon"
            class="share-sheet__mastodon"
            @submit.prevent="postToMastodon"
          >
            <label class="share-sheet__field-label" for="share-sheet-server">
              {{ t('kyo-web.blog.share-mastodon') }}
            </label>
            <div class="share-sheet__field">
              <input
                id="share-sheet-server"
                v-model="server"
                class="share-sheet__input"
                type="text"
                placeholder="mastodon.social"
                inputmode="url"
                enterkeyhint="send"
                autocomplete="off"
                autocapitalize="off"
                spellcheck="false"
                :aria-invalid="server_invalid"
                @input="server_invalid = false"
              />
              <button
                type="submit"
                class="share-sheet__go"
                data-umami-event="share"
                data-umami-event-to="mastodon"
              >
                {{ t('kyo-web.blog.share-mastodon-go') }}
              </button>
            </div>
          </form>
        </template>
      </li>
    </ul>

    <ul class="share-sheet__list share-sheet__list--tools" role="list">
      <li>
        <button
          type="button"
          class="share-sheet__row"
          :class="{ 'is-copied': copied }"
          data-umami-event="share"
          data-umami-event-to="copy"
          @click="copyLink"
        >
          <svg
            class="share-sheet__icon"
            viewBox="0 0 576 512"
            fill="currentColor"
            aria-hidden="true"
            focusable="false"
          >
            <path :d="ICON_LINK" />
          </svg>
          <span aria-live="polite">{{ copy_label }}</span>
        </button>
      </li>
      <li v-if="has_native">
        <button
          type="button"
          class="share-sheet__row"
          data-umami-event="share"
          data-umami-event-to="native"
          @click="shareNative"
        >
          <svg
            class="share-sheet__icon"
            viewBox="0 0 448 512"
            fill="currentColor"
            aria-hidden="true"
            focusable="false"
          >
            <path :d="ICON_NATIVE" />
          </svg>
          {{ t('kyo-web.blog.share-more') }}
        </button>
      </li>
    </ul>
  </div>
</template>

<style lang="scss" scoped>
/*
 * THE LANGUAGE MENU'S PANEL, GROWN INTO A SHEET: the page ground, one hairline,
 * no radius. Everything inside is the landing's vocabulary rather than a new
 * one — the header row is the hero's chip strip (a hairline under it, the close
 * button a full-height cell with its own left rule), its "// " is the section
 * header's index mark and the only accent at rest, and the rows answer a
 * pointer the way every list of links on the site does: a 3% lift, the words
 * brightening, the glyph taking the accent.
 *
 * WHERE IT HANGS DEPENDS ON THE NAV'S OWN FOLD, `nav` (700px), and hud-nav.vue
 * holds the other half of this. Below the fold hud-nav leaves the button's
 * wrapper static, so the containing block here is the sticky header itself and
 * the sheet drops under the bar as a panel, the drawer's placement, inset by
 * the bar's 1rem gutter so its edges meet the brand and the menu button. From
 * the fold up the wrapper is positioned, and the sheet hangs off the button's
 * right edge, the language menu's placement. Mobile first, so exactly 700px —
 * where `max-media-query` would also match — is unambiguous.
 *
 * NEVER TALLER THAN THE SCREEN. The header is sticky, so a sheet running past
 * the bottom edge could not be scrolled to; it scrolls itself instead.
 */
.share-sheet {
  --share-inset: 1rem;
  --share-icon: 1.25rem;
  --share-gap: 0.75rem;
  --share-lift: color-mix(in srgb, var(--clr-neutral-100) 3%, transparent);

  position: absolute;
  top: 100%;
  right: 1rem;
  left: 1rem;
  z-index: 10;
  max-height: calc(100dvh - 6rem);
  overflow-y: auto;
  overscroll-behavior: contain;
  background: var(--clr-neutral-500);
  border: 1px solid var(--clr-border-100);
  color: var(--clr-neutral-50);
  font-family: "SpaceMono", monospace;
  font-size: var(--fs-300);

  /* 26rem: the narrowest sheet whose Mastodon field still shows its whole
     "mastodon.social" beside PUBLICAR at the large type tier. At 24rem the
     placeholder was cut mid-word. */
  @include min-media-query(nav) {
    top: calc(100% + 0.25rem);
    right: 0;
    left: auto;
    width: 26rem;
  }
}

/* The chip strip's head: its label on the left, and the close button a cell
   that meets the rule under it. The CELL sets the row's height, not the row:
   a 44px row with its own hairline inside it left a 43px target. */
.share-sheet__head {
  display: flex;
  align-items: stretch;
  border-bottom: 1px solid var(--clr-border-100);
}

.share-sheet__label {
  flex: 1 1 auto;
  align-self: center;
  margin: 0;
  padding-left: var(--share-inset);
  color: var(--clr-neutral-200);
  font-size: var(--fs-200);
  letter-spacing: 0.12em;
  text-transform: uppercase;

  /* Drawn, not written: the alt text is empty, so a screen reader hears the
     word and not two slashes. */
  &::before {
    content: "// " / "";
    color: var(--clr-primary-100);
  }
}

.share-sheet__close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  width: 2.75rem;
  height: 2.75rem;
  padding: 0;
  border: 0;
  border-left: 1px solid var(--clr-border-100);
  background: transparent;
  color: var(--clr-neutral-200);
  cursor: pointer;
  transition: background-color 0.15s ease, color 0.15s ease;

  &:hover,
  &:focus-visible {
    background-color: var(--share-lift);
    color: var(--clr-primary-100);
  }

  &:focus-visible {
    outline: 2px solid var(--clr-primary-100);
    outline-offset: -2px;
  }

  @media (pointer: coarse) {
    width: 44px;
    height: 44px;
  }
}

/* Two strokes with square ends, not a font glyph: a cached older subset of
   the icon font renders tofu, and a text "×" sits on the baseline, not in
   the middle of its cell. */
.share-sheet__close-icon {
  width: 1rem;
  height: 1rem;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.5;
}

/* What is being shared, in the words the reader is looking at: the display
   face, the brightest ink, one line. One step over the rows, the archive's
   row-title size — at the rows' own step the proportional face read smaller
   than the monospace under it, and the title sank into the list. */
.share-sheet__title {
  margin: 0;
  padding: 0.85rem var(--share-inset) 0.4rem;
  overflow: hidden;
  color: var(--clr-neutral-100);
  font-family: "Geomanist", sans-serif;
  font-size: var(--fs-400);
  line-height: 1.3;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.share-sheet__list {
  margin: 0;
  padding: 0.25rem 0;
  list-style: none;

  /* The one rule inside the sheet: where to send it, then what else to do
     with it. */
  &--tools { border-top: 1px solid var(--clr-border-100); }
}

/*
 * A ROW IS THE WHOLE WIDTH OF THE SHEET, AND ITS PADDING IS THE INSET — the
 * lift fills the row edge to edge while the words keep their 1rem of air.
 * The glyph is the marker, and it earns its place: it is the network's own
 * mark, which a reader finds faster than the name. There is no chevron.
 *
 * THE OPEN MASTODON ROW WEARS ITS HOVER FOR AS LONG AS ITS FIELD IS OPEN: an
 * active item, which is what the accent is for.
 *
 * FOCUS IS DRAWN INSIDE THE ROW. The sheet scrolls, so it clips, and the
 * site's outward ring would be cut off at both sides.
 */
.share-sheet__row {
  display: flex;
  align-items: center;
  gap: var(--share-gap);
  width: 100%;
  min-height: 2.5rem;
  padding: 0.5rem var(--share-inset);
  border: 0;
  background: transparent;
  color: var(--clr-neutral-50);
  font: inherit;
  letter-spacing: 0.04em;
  text-align: left;
  text-decoration: none;
  cursor: pointer;
  transition: background-color 0.15s ease, color 0.15s ease;

  &:hover,
  &:focus-visible,
  &[aria-expanded="true"] {
    background-color: var(--share-lift);
    color: var(--clr-neutral-100);

    .share-sheet__icon { color: var(--clr-primary-100); }
  }

  &:focus-visible {
    outline: 2px solid var(--clr-primary-100);
    outline-offset: -2px;
  }

  /* A confirmation, not a place to point: ink, not accent. */
  &.is-copied { color: var(--clr-neutral-100); }

  @media (pointer: coarse) { min-height: 44px; }
}

.share-sheet__icon {
  flex: 0 0 auto;
  width: var(--share-icon);
  height: var(--share-icon);
  color: var(--clr-neutral-200);
  transition: color 0.15s ease;
}

/* Hung under the Mastodon row's name rather than its glyph, so it reads as
   that row opened up and not as a new block. `minmax(0, 1fr)`, because an
   `auto` track grows to the input's intrinsic 20 characters and pushed the
   submit out of a 320px sheet, which then scrolled sideways inside itself. */
.share-sheet__mastodon {
  --share-hang: calc(var(--share-inset) + var(--share-icon) + var(--share-gap));

  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 0.5rem;
  padding: 0.35rem var(--share-inset) 0.85rem var(--share-hang);
}

/* The archive search's label: mono, the smallest step, tracked, muted. */
.share-sheet__field-label {
  color: var(--clr-neutral-200);
  font-size: var(--fs-100);
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

/* The archive search's frame: the frame, not the input, carries the border
   and the focus state, and the submit is a cell inside it with its own left
   rule — one control, not a field with a button parked beside it. */
.share-sheet__field {
  display: flex;
  height: 2.5rem;
  border: 1px solid var(--clr-border-100);
  transition: border-color 0.2s ease;

  &:focus-within { border-color: var(--clr-primary-100); }

  @media (pointer: coarse) { height: 44px; }
}

/* A zero basis for the same reason: the field is whatever the submit leaves. */
.share-sheet__input {
  flex: 1 1 0;
  min-width: 0;
  padding: 0 0.6rem;
  border: 0;
  border-radius: 0;
  background: transparent;
  color: var(--clr-neutral-100);
  font: inherit;
  font-size: var(--fs-200);
  letter-spacing: 0.04em;

  /* The frame owns the focus affordance; a second ring inside it reads as two
     controls. Safe only BECAUSE :focus-within above is there. */
  &:focus,
  &:focus-visible { outline: none; }

  &::placeholder { color: var(--clr-neutral-300); }
}

.share-sheet__go {
  flex: 0 0 auto;
  padding: 0 0.75rem;
  border: 0;
  border-left: 1px solid var(--clr-border-100);
  background: transparent;
  color: var(--clr-neutral-50);
  font: inherit;
  font-size: var(--fs-200);
  letter-spacing: 0.12em;
  text-transform: uppercase;
  cursor: pointer;
  transition: background-color 0.15s ease, color 0.15s ease;

  &:hover,
  &:focus-visible {
    background-color: var(--share-lift);
    color: var(--clr-primary-100);
  }

  &:focus-visible {
    outline: 2px solid var(--clr-primary-100);
    outline-offset: -2px;
  }
}
</style>
