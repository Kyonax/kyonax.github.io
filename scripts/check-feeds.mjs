#!/usr/bin/env node
/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 *
 * check-feeds.mjs — the RSS feeds and llms.txt that generate-feeds.mjs writes
 * must be what they claim. Each feed must parse as STRICT XML (jsdom's
 * DOMParser, which is saxes: one stray `&` and the whole feed is refused, as
 * a feed reader would refuse it); be RSS 2.0 with one channel in its locale's
 * language; hold one item per article of that locale (the 20 newest), in date
 * order, and be exactly those articles; link every item absolute https on the
 * site origin; date every item in RFC 822. llms.txt must name the blog once
 * per locale that has posts, with the manifest's count of them, and list
 * every article.
 *
 * Run: node scripts/check-feeds.mjs
 *      node scripts/check-feeds.mjs --dir=<copy of public/> [--index=<json>] [--manifest=<json>]
 */

import { join, resolve } from 'node:path';

import { SITE_ORIGIN } from '../src/data/data.js';
import { c, exitWith, fail, head, ok, read, REPO_ROOT } from './_lib.mjs';

const arg = (name) => process.argv
  .find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);

const DIR = resolve(arg('dir') || join(REPO_ROOT, 'public'));
const INDEX = resolve(arg('index') || join(REPO_ROOT, 'src/data/blog/index.json'));
const MANIFEST = resolve(arg('manifest') || join(REPO_ROOT, 'src/data/blog/manifest.json'));

const FEED_LIMIT = 20;

/* The blog's name, signed untranslated in both locales. A literal rather than
   the catalogue's blog.title the generator reads, so an edit that translates
   the name fails here instead of shipping. */
const BLOG_NAME = 'Kyonax Build in Public';
const FEEDS = [
  { locale: 'en', language: 'en-US' },
  { locale: 'es', language: 'es-CO' },
];
const ATOM_NS = 'http://www.w3.org/2005/Atom'; // the xmlns:atom name, not a URL
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const RFC822 = /^(\w{3}), (\d{2}) (\w{3}) (\d{4}) \d{2}:\d{2}:\d{2} [+-]\d{4}$/;
const ORIGIN_PREFIX = `${SITE_ORIGIN}/`;

const failures = [];

/* A step's ✓ prints only if that step added no failure since `mark`. */
const passed = (mark, msg) => {
  if (failures.length === mark) {
    ok(msg);
  }
};

head('check-feeds — RSS 2.0 per locale + llms.txt');

let JSDOM = null;
try {
  ({ JSDOM } = await import('jsdom'));
} catch {
  fail('jsdom not installed (a dependency of vite-ssg). Run `npm ci`.');
  process.exit(1);
}
const { window } = new JSDOM('');

const readOr = (file, fallback) => {
  try {
    return read(file);
  } catch {
    return fallback;
  }
};
const readJson = (file) => {
  try {
    return JSON.parse(read(file));
  } catch {
    return null;
  }
};

const manifest = readJson(MANIFEST) || {};
const BASE = manifest.base || '/blog';
const DEFAULT_LOCALE = manifest.defaultLocale || 'en';
const archivePath = (locale) =>
  `${locale === DEFAULT_LOCALE ? '' : `/${locale}`}${BASE}`;

/* The expectation is re-derived from the index, never read back from the
   generator: a feed that went stale against a re-synced corpus has the right
   shape and the wrong articles, and only this comparison sees it. */
const index = readJson(INDEX);
const rows = Array.isArray(index?.posts) ? index.posts : [];
const linkOf = (row) => (typeof row.absolute === 'string' && row.absolute.startsWith(ORIGIN_PREFIX)
  ? row.absolute
  : `${SITE_ORIGIN}${row.url}`);
const expectedLinks = (locale) => rows
  .filter((row) => row && row.locale === locale)
  .map((row) => ({ date: /^\d{4}-\d{2}-\d{2}$/.test(row.date) ? row.date : '', link: linkOf(row) }))
  .sort((a, b) => b.date.localeCompare(a.date) || a.link.localeCompare(b.link))
  .slice(0, FEED_LIMIT)
  .map((row) => row.link);

const isSiteUrl = (u) => typeof u === 'string' && u.startsWith(ORIGIN_PREFIX);

/* Direct children in NO namespace: RSS 2.0's own elements. `atom:link` shares
   a local name with `link` and must not be counted as the channel's link. */
const kids = (el, name) => Array.from(el.children)
  .filter((k) => k.localName === name && k.namespaceURI === null);
const textOf = (el, name) => {
  const found = kids(el, name);
  return found.length === 1 ? found[0].textContent.trim() : null;
};

/* Shape, then meaning: the fields must spell a real calendar day, and the
   weekday must be that day's — "Mon, 14 Aug 2026" is well formed and false. */
const rfc822Error = (s) => {
  const m = RFC822.exec(s || '');
  if (!m || Number.isNaN(Date.parse(s))) {
    return `"${s}" is not an RFC 822 date`;
  }
  const [day, month, year] = [Number(m[2]), MONTHS.indexOf(m[3]), Number(m[4])];
  const at = new Date(Date.UTC(year, month, day));
  if (month < 0 || at.getUTCDate() !== day || DAYS.at(at.getUTCDay()) !== m[1]) {
    return `"${s}" names a day that does not exist or the wrong weekday`;
  }
  return null;
};

const checkFeed = ({ locale, language }) => {
  const archive = archivePath(locale);
  const rel_path = `${archive.slice(1)}/feed.xml`;
  const where = `${locale} ${rel_path}`;
  const bad = (msg) => failures.push(`${where}: ${msg}`);

  console.log(`\n──── locale :: ${c('cyan', locale)}`);
  const xml = readOr(join(DIR, rel_path), null);
  if (xml === null) {
    bad('missing. Run `npm run generate:feeds`');
    return;
  }

  const doc = new window.DOMParser().parseFromString(xml, 'application/xml');
  const error = doc.querySelector('parsererror');
  if (error) {
    bad(`not well-formed XML: ${error.textContent.trim().split('\n')[0]}`);
    return;
  }
  ok(`${rel_path}: strict XML parse`);

  const rss = doc.documentElement;
  if (rss.localName !== 'rss' || rss.namespaceURI !== null || rss.getAttribute('version') !== '2.0') {
    bad(`root must be <rss version="2.0">, found <${rss.nodeName} version="${rss.getAttribute('version')}">`);
    return;
  }
  const channels = kids(rss, 'channel');
  if (channels.length !== 1) {
    bad(`expected exactly one <channel>, found ${channels.length}`);
    return;
  }
  const [channel] = channels;

  let mark = failures.length;
  for (const name of ['title', 'description']) {
    if (!textOf(channel, name)) {
      bad(`channel <${name}> missing, repeated or empty`);
    }
  }
  const link = textOf(channel, 'link');
  if (link !== `${SITE_ORIGIN}${archive}`) {
    bad(`channel <link> should be ${SITE_ORIGIN}${archive}, found ${link}`);
  }
  if (textOf(channel, 'language') !== language) {
    bad(`channel <language> should be ${language}, found ${textOf(channel, 'language')}`);
  }
  const self = Array.from(channel.getElementsByTagNameNS(ATOM_NS, 'link'))
    .find((el) => el.getAttribute('rel') === 'self');
  if (!self || self.getAttribute('href') !== `${SITE_ORIGIN}${archive}/feed.xml`
    || self.getAttribute('type') !== 'application/rss+xml') {
    bad(`<atom:link rel="self" type="application/rss+xml" href="${SITE_ORIGIN}${archive}/feed.xml"/> missing or wrong`);
  }
  passed(mark, `${rel_path}: RSS 2.0, one channel, language ${language}`);

  mark = failures.length;
  const items = kids(channel, 'item');
  const expected = expectedLinks(locale);
  if (items.length !== expected.length) {
    bad(`${items.length} item(s), but the index has ${expected.length} article(s) for ${locale} (max ${FEED_LIMIT})`);
  }

  const links = [];
  const dates = [];
  for (const [i, item] of items.entries()) {
    const at = `item ${i + 1}`;
    const item_link = textOf(item, 'link');
    const guid = kids(item, 'guid');
    const pub = textOf(item, 'pubDate');
    if (!textOf(item, 'title')) {
      bad(`${at}: <title> missing or empty`);
    }
    if (!isSiteUrl(item_link)) {
      bad(`${at}: <link> "${item_link}" is not absolute https on ${SITE_ORIGIN}`);
    }
    if (guid.length !== 1 || guid[0].getAttribute('isPermaLink') !== 'true'
      || guid[0].textContent.trim() !== item_link) {
      bad(`${at}: <guid isPermaLink="true"> must be present once and equal the <link>`);
    }
    if (kids(item, 'description').length !== 1) {
      bad(`${at}: <description> missing or repeated`);
    }
    const date_error = rfc822Error(pub);
    if (date_error) {
      bad(`${at}: <pubDate> ${date_error}`);
    } else {
      dates.push(Date.parse(pub));
    }
    links.push(item_link);
  }
  if (dates.some((d, i) => i > 0 && d > dates[i - 1])) {
    bad('items are not newest first');
  }
  if (new Set(links).size !== links.length) {
    bad('two items share a link');
  }
  const missing = expected.filter((u) => !links.includes(u));
  if (missing.length > 0) {
    bad(`stale: the index's newest article(s) are not in the feed: ${missing.join(', ')}`);
  }

  const last = textOf(channel, 'lastBuildDate');
  if (items.length > 0) {
    if (rfc822Error(last)) {
      bad(`<lastBuildDate> ${rfc822Error(last)}`);
    } else if (Date.parse(last) !== Math.max(...dates)) {
      bad(`<lastBuildDate> ${last} is not the newest item's pubDate`);
    }
  }
  passed(mark, `${rel_path}: ${items.length} item(s) = the index's ${locale} articles, links absolute https, RFC 822 dates`);
};

for (const feed of FEEDS) {
  checkFeed(feed);
}

/* llms.txt: the site's name, the blog's front door once per locale, then
   every article as a Markdown link. */
console.log(`\n──── ${c('cyan', 'llms.txt')}`);
const llms = readOr(join(DIR, 'llms.txt'), null);
if (llms === null) {
  failures.push('llms.txt: missing. Run `npm run generate:feeds`');
} else {
  let mark = failures.length;
  const lines = llms.split('\n');
  const host = new URL(SITE_ORIGIN).host;
  if (lines[0] !== `# ${host}`) {
    failures.push(`llms.txt: first line should be "# ${host}", found "${lines[0]}"`);
  }
  if (!lines.some((l) => l.startsWith('> ') && l.length > 2)) {
    failures.push('llms.txt: no "> " one-line description');
  }

  /* A link line: `- [text](url)`, then nothing or a `: note`. */
  const links = lines
    .map((l) => /^- \[(.*?)\]\(([^\s)]+)\)(.*)$/.exec(l))
    .filter((k) => k && (k[3] === '' || k[3].startsWith(':')))
    .map(([, text, url, rest]) => ({ text, url, note: rest.slice(1).trim() }));

  /* The blog's front door: each locale's archive, named for the blog, with a
     count taken from the MANIFEST (the routes the site publishes), never from
     the index the generator listed, so a count left stale by a re-sync is
     caught here. A locale with no post has no line, as it has no archive. */
  const homes = new Map(FEEDS.map(({ locale }) => [`${SITE_ORIGIN}${archivePath(locale)}`, locale]));
  const routes = Array.isArray(manifest.routes) ? manifest.routes : [];
  let published = 0;
  for (const [home, locale] of homes) {
    const want = routes.filter((route) => route?.locale === locale).length;
    const found = links.filter((k) => k.url === home);
    if (want === 0) {
      if (found.length > 0) {
        failures.push(`llms.txt: links the ${locale} archive, but the manifest routes no ${locale} post`);
      }
      continue;
    }
    published += 1;
    if (found.length !== 1 || found[0].text !== BLOG_NAME) {
      failures.push(`llms.txt: expected one "- [${BLOG_NAME}](${home}): …" line for ${locale}, found ${found.length}`);
      continue;
    }
    const count = Number((/\d+/.exec(found[0].note) || [])[0]);
    if (count !== want) {
      failures.push(`llms.txt: the ${locale} blog line counts ${Number.isNaN(count) ? 'nothing' : count}, `
        + `but the manifest routes ${want} ${locale} post(s)`);
    }
  }
  const named = lines.filter((l) => l.includes(BLOG_NAME)).length;
  if (named !== published) {
    failures.push(`llms.txt: "${BLOG_NAME}" is on ${named} line(s), expected ${published} (once per locale with posts)`);
  }
  passed(mark, `llms.txt: "${BLOG_NAME}" once per locale with posts (${published}), each counted as the manifest counts`);

  /* Every other link line is an article. */
  mark = failures.length;
  const broken = lines.filter((l) => l.startsWith('- [')).length - links.length;
  if (broken > 0) {
    failures.push(`llms.txt: ${broken} "- [" line(s) are not a Markdown link`);
  }
  const urls = links.map((k) => k.url).filter((u) => !homes.has(u));
  const total = rows.filter((row) => row && FEEDS.some((f) => f.locale === row.locale)).length;
  if (urls.length !== total) {
    failures.push(`llms.txt: ${urls.length} article line(s), but the index has ${total}`);
  }
  for (const u of urls.filter((x) => !isSiteUrl(x))) {
    failures.push(`llms.txt: "${u}" is not absolute https on ${SITE_ORIGIN}`);
  }
  passed(mark, `llms.txt: ${urls.length} article line(s), links absolute https`);
}

window.close();

if (failures.length) {
  console.log('');
  for (const f of failures) {
    fail(f);
  }
}
exitWith({ failures, name: 'check-feeds' });
