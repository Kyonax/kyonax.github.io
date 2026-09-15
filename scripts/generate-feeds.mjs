#!/usr/bin/env node
/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 */

/*
 * generate-feeds.mjs — the blog's RSS feeds and the site's llms.txt, derived
 * from the synced corpus.
 *
 *   public/blog/feed.xml      RSS 2.0, English: the 20 newest articles
 *   public/es/blog/feed.xml   RSS 2.0, Spanish: the 20 newest articles
 *   public/llms.txt           the site in plain text, for language models
 *
 * Runs after sync:blog and reads what it copied: src/data/blog/index.json for
 * the articles, manifest.json for where the archive is mounted. All three
 * outputs are build artefacts of gitignored data, so they are gitignored too.
 * scripts/check-feeds.mjs is the gate that proves them.
 *
 * EACH FEED LIVES BESIDE THE ARCHIVE IT SYNDICATES: <archive>/feed.xml, with
 * the archive's path derived exactly as src/seo/blog-routes.js derives it. So
 * use-seo-head.js and the blog footer link the feed as the archive's URL plus
 * a file name, and neither holds a second copy of the path.
 *
 * DETERMINISTIC. Nothing reads the clock. Every pubDate is the article's own
 * date and lastBuildDate is the newest of them, so two builds of one corpus
 * write the same bytes, and a file whose bytes did not change is left alone.
 *
 * IT NEVER BLOCKS A BUILD. No index, or sync-blog's empty one, still writes
 * both feeds (valid, zero items) and an llms.txt without articles, and warns.
 *
 *   node scripts/generate-feeds.mjs
 *   node scripts/generate-feeds.mjs --index=<index.json> --out=<dir>
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';

import { AUTHOR_INFO, SITE_ORIGIN } from '../src/data/data.js';
import { head, loadTranslations, ok, REPO_ROOT, warn } from './_lib.mjs';

const arg = (name) => process.argv
  .find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);

const INDEX = resolve(arg('index') || join(REPO_ROOT, 'src/data/blog/index.json'));
const MANIFEST = join(REPO_ROOT, 'src/data/blog/manifest.json');
const OUT = resolve(arg('out') || join(REPO_ROOT, 'public'));

/* A feed is a window onto what is new, not an archive: a reader subscribes
   once and polls. The archive is /blog. */
const FEED_LIMIT = 20;

/* `language` is the site's own regional tag for the locale: og:locale is
   en_US / es_CO and every date the site formats uses en-US / es-CO. */
const FEEDS = [
  { locale: 'en', language: 'en-US', heading: 'Posts (English)' },
  { locale: 'es', language: 'es-CO', heading: 'Artículos (Español)' },
];

/* Repo-relative in the log, unless an override points outside the repo. */
const shown = (file) => {
  const rel = relative(REPO_ROOT, file);
  return rel.startsWith('..') ? file : rel;
};

const readText = (file) => {
  try {
    return readFileSync(file, 'utf8');
  } catch {
    return null;
  }
};

const readJson = (file) => {
  try {
    return JSON.parse(readText(file));
  } catch {
    return null;
  }
};

const manifest = readJson(MANIFEST) || {};
const BASE = manifest.base || '/blog';
const DEFAULT_LOCALE = manifest.defaultLocale || 'en';

/* blog-routes.js's indexUrlFor(): the default locale at the root, every other
   locale under /<locale>. */
const archivePath = (locale) =>
  `${locale === DEFAULT_LOCALE ? '' : `/${locale}`}${BASE}`;

// ---------------------------------------------------------------- text ----

/* XML 1.0 forbids most C0 controls, U+FFFE/U+FFFF and lone surrogates, and a
   strict parser rejects the whole feed over one of them. Dropped, not escaped:
   no character reference can encode them either. */
const isXmlChar = (ch) => {
  const cp = ch.codePointAt(0);
  return cp === 0x9 || cp === 0xa || cp === 0xd
    || (cp >= 0x20 && cp <= 0xd7ff)
    || (cp >= 0xe000 && cp <= 0xfffd)
    || cp >= 0x10000;
};

/* Every field here is one line of plain text: a title, an excerpt, a tag. */
const oneLine = (s) => Array.from(String(s ?? ''))
  .filter(isXmlChar)
  .join('')
  .replace(/\s+/g, ' ')
  .trim();

const XML_ENTITIES = new Map([
  ['&', '&amp;'], ['<', '&lt;'], ['>', '&gt;'], ['"', '&quot;'], ["'", '&apos;'],
]);
const esc = (s) => oneLine(s).replace(/[&<>"']/g, (ch) => XML_ENTITIES.get(ch));

/* The catalogue is vue-i18n source: a literal @ is written {'@'}. Nothing
   compiles a feed, so the braces would ship as they are. */
const plain = (s) => oneLine(s).replace(/\{'([^']*)'\}/g, '$1');

/* llms.txt is Markdown: brackets in a title would end the link text early,
   and a parenthesis or a space in a URL would end the link. */
const mdText = (s) => oneLine(s).replace(/[\\[\]]/g, '\\$&');
const mdUrl = (u) => u.replace(/[()\s]/g, (ch) =>
  `%${ch.codePointAt(0).toString(16).toUpperCase().padStart(2, '0')}`);

// ---------------------------------------------------------------- dates ---

/* RFC 822 names are English whatever the feed's language: the format is a
   protocol, not prose. */
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/* An article's date is the day it was published in Colombia, which is UTC-5
   all year (no DST). Midnight UTC would be the previous evening there. */
const OFFSET = '-0500';
const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/* `YYYY-MM-DD` to `Fri, 14 Aug 2026 00:00:00 -0500`; null for anything that
   is not a real calendar day (2026-02-30 included). */
const rfc822 = (iso) => {
  const m = ISO_DATE.exec(typeof iso === 'string' ? iso : '');
  if (!m) {
    return null;
  }
  const [year, month, day] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const at = new Date(Date.UTC(year, month - 1, day));
  if (at.getUTCMonth() !== month - 1 || at.getUTCDate() !== day) {
    return null;
  }
  return `${DAYS.at(at.getUTCDay())}, ${m[3]} ${MONTHS.at(month - 1)} `
    + `${m[1]} 00:00:00 ${OFFSET}`;
};

// ---------------------------------------------------------------- posts ---

/* The index's own absolute URL when it is on this site's origin (kyo-blog
   builds it from ITS manifest, not from this site's constant), else this
   origin plus the route. */
const linkOf = (row) => {
  if (typeof row.absolute === 'string' && row.absolute.startsWith(`${SITE_ORIGIN}/`)) {
    return row.absolute;
  }
  if (typeof row.url === 'string' && row.url.startsWith('/')) {
    return `${SITE_ORIGIN}${row.url}`;
  }
  return null;
};

/* Newest first; an undated row sorts last. The URL breaks a tie, so the
   order never depends on the index's own row order. */
const newestFirst = (a, b) =>
  b.date.localeCompare(a.date) || a.link.localeCompare(b.link);

head('generate-feeds');

const index = readJson(INDEX);
const rows = Array.isArray(index?.posts) ? index.posts : [];
if (rows.length === 0) {
  warn(`${shown(INDEX)} ${index ? 'lists no articles' : 'is missing or unreadable'}`
    + ' — writing empty feeds and an llms.txt without articles');
}

const by_locale = new Map(FEEDS.map(({ locale }) => [locale, []]));
let skipped = 0;
for (const row of rows) {
  const bucket = row && by_locale.get(row.locale);
  const link = bucket && linkOf(row);
  if (!bucket || !link || !oneLine(row.title)) {
    skipped += 1;
    continue;
  }
  const pub_date = rfc822(row.date);
  const tags = Array.isArray(row.tags) ? row.tags.map(oneLine) : [];
  bucket.push({
    title: row.title,
    link,
    date: pub_date ? row.date : '',
    pubDate: pub_date,
    description: row.excerpt || row.description || '',
    tags: [...new Set(tags.filter(Boolean))],
  });
}
for (const items of by_locale.values()) {
  items.sort(newestFirst);
}
if (skipped > 0) {
  warn(`${skipped} index row(s) skipped: a locale with no feed, no URL on ${SITE_ORIGIN}, or no title`);
}

// ---------------------------------------------------------------- write ---

const loaded = await loadTranslations();
const MESSAGES = new Map(Object.entries(loaded?.data || {}));
const kyo = (locale) => MESSAGES.get(locale)?.['kyo-web'] || {};

const emit = (rel_path, content) => {
  const file = join(OUT, rel_path);
  const changed = readText(file) !== content;
  if (changed) {
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, content, 'utf8');
  }
  return `${shown(file)} (${Buffer.byteLength(content)} B${changed ? '' : ', unchanged'})`;
};

const itemXml = (it) => [
  '    <item>',
  `      <title>${esc(it.title)}</title>`,
  `      <link>${esc(it.link)}</link>`,
  `      <guid isPermaLink="true">${esc(it.link)}</guid>`,
  ...(it.pubDate ? [`      <pubDate>${it.pubDate}</pubDate>`] : []),
  `      <description>${esc(it.description)}</description>`,
  ...it.tags.map((tag) => `      <category>${esc(tag)}</category>`),
  '    </item>',
];

const feedXml = ({ title, archive, description, language, self, items }) => {
  const newest = items.find((it) => it.pubDate);
  return `${[
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    '  <channel>',
    `    <title>${esc(title)}</title>`,
    `    <link>${esc(archive)}</link>`,
    `    <description>${esc(description)}</description>`,
    `    <language>${language}</language>`,
    ...(newest ? [`    <lastBuildDate>${newest.pubDate}</lastBuildDate>`] : []),
    `    <atom:link href="${esc(self)}" rel="self" type="application/rss+xml"/>`,
    ...items.flatMap(itemXml),
    '  </channel>',
    '</rss>',
  ].join('\n')}\n`;
};

for (const { locale, language } of FEEDS) {
  /* The archive's own title and description: the feed IS that page. */
  const meta = kyo(locale).blog?.meta || {};
  if (!plain(meta.title) || !plain(meta.description)) {
    warn(`kyo-web.blog.meta.title / .description missing for ${locale}`);
  }
  const archive = archivePath(locale);
  const items = by_locale.get(locale).slice(0, FEED_LIMIT);
  const wrote = emit(`${archive.slice(1)}/feed.xml`, feedXml({
    title: plain(meta.title),
    archive: `${SITE_ORIGIN}${archive}`,
    description: plain(meta.description),
    language,
    self: `${SITE_ORIGIN}${archive}/feed.xml`,
    items,
  }));
  ok(`${wrote}: ${items.length} item(s)`);
}

/* llms.txt (llmstxt.org): a title, a one-line summary, then Markdown link
   lists, blank lines between blocks so the summary's quote does not swallow
   the lines under it. Every article, newest first, English then Spanish. */
const llmsLine = (it) => {
  const note = oneLine(it.description);
  return `- [${mdText(it.title)}](${mdUrl(it.link)})${note ? `: ${note}` : ''}`;
};

const llms = [
  `# ${new URL(SITE_ORIGIN).host}`,
  '',
  `> ${plain(kyo(DEFAULT_LOCALE).landing?.meta?.description)}`,
  '',
  `Author: ${AUTHOR_INFO.name}`,
  `Blog: ${SITE_ORIGIN}${archivePath(DEFAULT_LOCALE)}`,
];
for (const { locale, heading } of FEEDS) {
  const items = by_locale.get(locale);
  if (items.length > 0) {
    llms.push('', `## ${heading}`, '', ...items.map(llmsLine));
  }
}
const total = [...by_locale.values()].reduce((n, items) => n + items.length, 0);
ok(`${emit('llms.txt', `${llms.join('\n')}\n`)}: ${total} article(s)`);
