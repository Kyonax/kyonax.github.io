#!/usr/bin/env node
/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { today } from './_lib.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = resolve(__dirname, '..', 'public');

const URLS = [
  { loc: 'https://kyonax.com/',   locale: 'en' },
  { loc: 'https://kyonax.com/es', locale: 'es' },
];

const PRIVACY_URLS = [
  { loc: 'https://kyonax.com/privacy',    locale: 'en' },
  { loc: 'https://kyonax.com/es/privacy', locale: 'es' },
];

/* Dedicated resume pages. Higher priority than privacy: they publish the full
   CV as crawlable HTML and are a primary ranking target for CV/resume queries. */
const RESUME_URLS = [
  { loc: 'https://kyonax.com/resume',          locale: 'en' },
  { loc: 'https://kyonax.com/es/hoja-de-vida', locale: 'es' },
];

/* CV PDFs. Search engines index PDFs directly, so they are listed as their own
   sitemap URLs. Stable /cv/ paths (public/cv/) — NEVER content-hashed, or the
   indexed URL breaks on the next deploy. No hreflang: PDF alternates are not
   reliably honoured, and each file carries its own language in its metadata. */
const CV_URLS = [
  { loc: 'https://kyonax.com/cv/Cristian-Moreno-Senior-Software-Engineer-EN.pdf' },
  { loc: 'https://kyonax.com/cv/Cristian-Moreno-Senior-Software-Engineer-ES.pdf' },
];

const X_DEFAULT = 'https://kyonax.com/';
const lastmod = today();

const _alternates = (pairs, x_default) => pairs.map(
  (u) => `        <xhtml:link rel="alternate" hreflang="${u.locale}" href="${u.loc}"/>`,
).concat(`        <xhtml:link rel="alternate" hreflang="x-default" href="${x_default}"/>`)
  .join('\n');

const alternates = _alternates(URLS, X_DEFAULT);
const privacy_alternates = _alternates(PRIVACY_URLS, 'https://kyonax.com/privacy');
const resume_alternates  = _alternates(RESUME_URLS, 'https://kyonax.com/resume');

const entries = URLS.map((u) => `    <url>
        <loc>${u.loc}</loc>
        <lastmod>${lastmod}</lastmod>
        <changefreq>monthly</changefreq>
        <priority>1.0</priority>
${alternates}
    </url>`).join('\n');

const privacy_entries = PRIVACY_URLS.map((u) => `    <url>
        <loc>${u.loc}</loc>
        <lastmod>${lastmod}</lastmod>
        <changefreq>yearly</changefreq>
        <priority>0.3</priority>
${privacy_alternates}
    </url>`).join('\n');

const resume_entries = RESUME_URLS.map((u) => `    <url>
        <loc>${u.loc}</loc>
        <lastmod>${lastmod}</lastmod>
        <changefreq>monthly</changefreq>
        <priority>0.8</priority>
${resume_alternates}
    </url>`).join('\n');

const cv_entries = CV_URLS.map((u) => `    <url>
        <loc>${u.loc}</loc>
        <lastmod>${lastmod}</lastmod>
        <changefreq>monthly</changefreq>
        <priority>0.7</priority>
    </url>`).join('\n');

/*
 * The blog, from the manifest kyo-blog builds and scripts/sync-blog.mjs copies
 * into src/data/blog/. Everything above is a page written by hand with a fixed
 * URL; the archive is not, so its entries are DERIVED.
 *
 * The alternates block above is built ONCE PER FAMILY and stamped into every
 * <url> of that family. That cannot work here: each article pairs with its own
 * translation, so the rows are built PER POST. An archive page pairs with the
 * same page number in the other locale, falling back to that locale's index.
 *
 * No manifest, or an empty one, contributes nothing — the sitemap is then
 * byte-identical to what it was before the blog existed.
 */
const _blog = () => {
  const file = resolve(__dirname, '..', 'src/data/blog/manifest.json');
  if (!existsSync(file)) {
    return '';
  }

  const m = JSON.parse(readFileSync(file, 'utf8'));
  const origin = m.origin || 'https://kyonax.com';
  const abs = (u) => `${origin}${u}`;
  const rows = [];

  const block = (pairs, x_default) => _alternates(pairs, x_default);

  /* Archive pages: /blog, /blog/page/2, and their locale twins. */
  for (const [locale, pages] of Object.entries(m.pages || {})) {
    for (const page of pages) {
      const pairs = (m.locales || []).map((l) => {
        const twin = (m.pages[l] || [])[page.number - 1];
        const index = (m.pages[l] || [])[0];
        return { locale: l, loc: abs((twin || index || page).url) };
      });
      const first = (m.pages[m.defaultLocale] || [])[0];
      rows.push(`    <url>
        <loc>${abs(page.url)}</loc>
        <lastmod>${lastmod}</lastmod>
        <changefreq>weekly</changefreq>
        <priority>${page.number === 1 ? '0.8' : '0.5'}</priority>
${block(pairs, abs((first || page).url))}
    </url>`);
      void locale;
    }
  }

  /* Articles — the manifest's `routes` ({ url, locale, key }), their locale
     twins from `families`. This loop used to read `m.posts`, a key the
     manifest never carried, and wrote no article at all. lastmod is the
     post's own date — the route's YYYY-MM-DD prefix, which IS its #+DATE by
     construction — not the build date: a sitemap that claims every article
     changed today teaches a crawler to ignore the field. */
  const archive_rows = rows.length;
  for (const post of m.routes || []) {
    const family = (m.families || {})[post.key] || {};
    const pairs = Object.entries(family).map(([l, u]) => ({ locale: l, loc: abs(u) }));
    const x_default = family[m.defaultLocale] || post.url;
    const date = (post.url.match(/\/(\d{4}-\d{2}-\d{2})-/) || [])[1];
    rows.push(`    <url>
        <loc>${abs(post.url)}</loc>
        <lastmod>${date || lastmod}</lastmod>
        <changefreq>monthly</changefreq>
        <priority>0.7</priority>
${block(pairs, abs(x_default))}
    </url>`);
  }

  /* A SITEMAP THAT DROPS ARTICLES MUST NOT BUILD. Every article the manifest
     routes has to reach the sitemap; a silent zero is how the whole blog went
     missing from it once already. */
  const routed = (m.routes || []).length;
  const written = rows.length - archive_rows;
  if (written !== routed) {
    console.error(`✘ generate-sitemap: the manifest routes ${routed} article(s) but ${written} reached the sitemap`);
    process.exit(1);
  }

  return rows.join('\n');
};

const blog_entries = _blog();

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${entries}
${resume_entries}
${cv_entries}
${privacy_entries}${blog_entries ? `\n${blog_entries}` : ''}
</urlset>
`;

writeFileSync(resolve(PUBLIC_DIR, 'sitemap.xml'), xml, 'utf8');
const _count = (xml.match(/<url>/g) || []).length;
console.log(`[generate-sitemap] wrote ${_count} URLs to public/sitemap.xml`);
