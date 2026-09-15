/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 */

/*
 * og-blog.spec.js — the picture a share of the blog archive previews.
 *
 * Every blog page used to share the landing banner, a portrait composite that
 * says nothing about a blog, so a link to /blog previewed as the homepage. The
 * owner's decision of 2026-09-14 (Step 1b, topic 6) gives the archive a card
 * of its own per locale, made by scripts/generate-og-blog.mjs, with an alt
 * that describes it. The contracts:
 *   · every archive page, /blog and /blog/page/N and their /es twins, shares
 *     ITS LOCALE's card in og:image and twitter:image, with the 1200 × 630
 *     JPEG tags beside it, and names exactly one picture;
 *   · its og:image:alt and twitter:image:alt are the catalogue's
 *     kyo-web.blog.meta.og-image-alt for that locale, and that sentence names
 *     what the card prints: its title and its address;
 *   · both cards are served, and are 1200 × 630 JPEGs by their own bytes, not
 *     by their names;
 *   · no blog page pairs the card's alt with another picture. Articles keep
 *     the landing banner, and the alt they read from the same key would
 *     otherwise describe a card they do not show.
 *
 * READ WITH NO SCRIPT RUN, the way a platform's crawler reads a page: the
 * prerendered head, parsed by the browser, so an escaped quote or ampersand
 * in a content attribute reads as the sentence it encodes. With no script
 * there is no tracker either, so nothing here needs page.route or Umami's
 * opt-out.
 *
 * EVERY ARCHIVE PAGE, IN EITHER SHAPE. The pages and the articles come from
 * the synced routing manifest, so a production build (one archive page per
 * locale) and a paged review build (three) are both covered as they are.
 *
 * WRITTEN RED. Against the build before this change every archive page shares
 * /og-banner.jpg, neither card is served, the alt is a sentence about the
 * blog that names no address, and every article carries that same alt.
 */

import { existsSync, readFileSync } from 'node:fs';

import { expect, test } from '@playwright/test';

import { TRANSLATIONS_CORE } from '../../src/data/snippets-core.js';
import { ROUTES } from './viewports.js';

const SITE = 'https://kyonax.com';
const WIDTH = 1200;
const HEIGHT = 630;
const TITLE = 'Kyonax Build in Public';

/* Each locale's card and the address printed on it. Pinned rather than read
   from the generator: the address is the page's own, and a card that printed
   another would be advertising another page. */
const CARDS = new Map([
  ['en', { file: '/og-blog-en.jpg', address: 'kyonax.com/blog' }],
  ['es', { file: '/og-blog-es.jpg', address: 'kyonax.com/es/blog' }],
]);

/* The alt is the catalogue's to word; what is pinned here is that the page
   carries its own locale's sentence, and that the sentence names the card. */
const BLOG_META = new Map([
  ['en', TRANSLATIONS_CORE.en['kyo-web'].blog.meta],
  ['es', TRANSLATIONS_CORE.es['kyo-web'].blog.meta],
]);

/* The routing manifest the build synced. Read from disk, never imported: it
   is generated and gitignored, and a failed import would take the whole spec
   down at load. */
const ROOT = new URL('../../', import.meta.url);
const readJson = (path) => {
  const url = new URL(path, ROOT);
  try {
    return existsSync(url) ? JSON.parse(readFileSync(url, 'utf8')) : null;
  } catch {
    return null;
  }
};
const MANIFEST = readJson('src/data/blog/manifest.json') || {};
const PAGES = new Map(Object.entries(MANIFEST.pages || {}));
const ARCHIVE = new Map([['en', '/blog'], ['es', '/es/blog']]);

/* With no manifest the archive's first page still runs, so the spec can
   never pass by testing nothing. */
const archivePages = (locale) => {
  const urls = (PAGES.get(locale) || []).map((p) => p.url);
  return urls.length ? urls : [ARCHIVE.get(locale)];
};
const articlesOf = (locale) => {
  const urls = (MANIFEST.routes || []).filter((r) => r.locale === locale).map((r) => r.url);
  if (urls.length) {
    return urls;
  }
  return ROUTES.filter((r) => r.name === `article ${locale.toUpperCase()}`).map((r) => r.path);
};

const readHead = (page) => page.evaluate(() => {
  const meta = (attr, key) => {
    const tag = document.head.querySelector(`meta[${attr}="${key}"]`);
    return tag ? tag.getAttribute('content') : null;
  };
  return {
    images: document.head.querySelectorAll('meta[property="og:image"]').length,
    image: meta('property', 'og:image'),
    type: meta('property', 'og:image:type'),
    width: meta('property', 'og:image:width'),
    height: meta('property', 'og:image:height'),
    alt: meta('property', 'og:image:alt'),
    twitterImage: meta('name', 'twitter:image'),
    twitterAlt: meta('name', 'twitter:image:alt'),
  };
});

const open = async (page, path) => {
  const res = await page.goto(path);
  expect(res.status(), `${path} did not answer 200`).toBe(200);
  return readHead(page);
};

/*
 * THE FRAME SIZE FROM THE JPEG ITSELF: SOI, then segment after segment until
 * a start-of-frame, whose header holds the height and the width. Every SOF
 * marker counts (baseline, progressive, …); C4, C8 and CC share the range and
 * are not frames.
 */
const SOF = new Set([0xC0, 0xC1, 0xC2, 0xC3, 0xC5, 0xC6, 0xC7, 0xC9, 0xCA, 0xCB, 0xCD, 0xCE, 0xCF]);
const jpegSize = (bytes) => {
  if (bytes.length < 4 || bytes.readUInt16BE(0) !== 0xFFD8) {
    return null;
  }
  let at = 2;
  while (at + 9 <= bytes.length && bytes.readUInt8(at) === 0xFF) {
    if (SOF.has(bytes.readUInt8(at + 1))) {
      return { width: bytes.readUInt16BE(at + 7), height: bytes.readUInt16BE(at + 5) };
    }
    at += 2 + bytes.readUInt16BE(at + 2);
  }
  return null;
};

test.use({ javaScriptEnabled: false });

for (const [locale, card] of CARDS) {
  const alt = BLOG_META.get(locale)['og-image-alt'];
  const src = `${SITE}${card.file}`;

  for (const path of archivePages(locale)) {
    test(`${path}: shares the ${locale.toUpperCase()} blog card, 1200 × 630, with the catalogue's alt`, async ({ page }) => {
      const head = await open(page, path);
      expect(head.images, `${path} names ${head.images} og:image tags`).toBe(1);
      expect(head.image, `${path} does not share its locale's blog card`).toBe(src);
      expect(head.twitterImage, `${path}: twitter:image is not its locale's blog card`).toBe(src);
      expect(head.type, `${path}: og:image:type`).toBe('image/jpeg');
      expect(head.width, `${path}: og:image:width`).toBe(String(WIDTH));
      expect(head.height, `${path}: og:image:height`).toBe(String(HEIGHT));
      expect(head.alt, `${path}: og:image:alt is not kyo-web.blog.meta.og-image-alt (${locale})`).toBe(alt);
      expect(head.twitterAlt, `${path}: twitter:image:alt is not kyo-web.blog.meta.og-image-alt (${locale})`).toBe(alt);
    });
  }

  test(`${locale}: the card's alt names what the card prints`, () => {
    expect(alt, `kyo-web.blog.meta.og-image-alt (${locale}) does not name the card's title`).toContain(TITLE);
    expect(alt, `kyo-web.blog.meta.og-image-alt (${locale}) does not name the address the card prints`)
      .toContain(card.address);
  });

  test(`${card.file}: is served, and is a 1200 × 630 JPEG by its own bytes`, async ({ request }) => {
    const res = await request.get(card.file);
    expect(res.status(), `${card.file} is not served (node scripts/generate-og-blog.mjs, then build)`).toBe(200);
    expect(res.headers()['content-type'], `${card.file}: content type`).toMatch(/^image\/jpeg\b/);
    const size = jpegSize(await res.body());
    expect(size, `${card.file} is not a JPEG`).not.toBeNull();
    expect(size, `${card.file}: frame size`).toEqual({ width: WIDTH, height: HEIGHT });
  });

  test(`${locale}: no article pairs the card's alt with another picture`, async ({ page }) => {
    const lies = [];
    for (const path of articlesOf(locale)) {
      const head = await open(page, path);
      const shares_card = head.image === src;
      if (!shares_card && (head.alt === alt || head.twitterAlt === alt)) {
        lies.push(`${path} shares ${head.image} under the card's alt`);
      }
      if (shares_card && (head.alt !== alt || head.twitterAlt !== alt)) {
        lies.push(`${path} shares the card under another alt: "${head.alt}"`);
      }
    }
    expect(lies, 'blog pages whose og:image:alt describes a picture they do not share').toEqual([]);
  });
}
