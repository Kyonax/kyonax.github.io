#!/usr/bin/env node
/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 */

import { writeFileSync } from 'node:fs';
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

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${entries}
${resume_entries}
${cv_entries}
${privacy_entries}
</urlset>
`;

writeFileSync(resolve(PUBLIC_DIR, 'sitemap.xml'), xml, 'utf8');
console.log(`[generate-sitemap] wrote ${URLS.length + RESUME_URLS.length + CV_URLS.length + PRIVACY_URLS.length} URLs to public/sitemap.xml`);
