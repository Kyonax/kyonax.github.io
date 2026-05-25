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
  { loc: 'https://kyonax.com/privacy' },
  { loc: 'https://kyonax.com/es/privacy' },
];

const X_DEFAULT = 'https://kyonax.com/';
const lastmod = today();

const alternates = URLS.map(
  (u) => `        <xhtml:link rel="alternate" hreflang="${u.locale}" href="${u.loc}"/>`,
).concat(`        <xhtml:link rel="alternate" hreflang="x-default" href="${X_DEFAULT}"/>`)
  .join('\n');

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
    </url>`).join('\n');

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${entries}
${privacy_entries}
</urlset>
`;

writeFileSync(resolve(PUBLIC_DIR, 'sitemap.xml'), xml, 'utf8');
console.log(`[generate-sitemap] wrote ${URLS.length + PRIVACY_URLS.length} URLs to public/sitemap.xml`);
