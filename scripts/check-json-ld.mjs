#!/usr/bin/env node
/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 *
 * Builds the @graph through vite-node so @-aliases resolve; spec-level
 * conformance is deferred to https://validator.schema.org.
 */

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync,writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { c,exitWith, fail, head, ok, REPO_ROOT } from './_lib.mjs';

const SEO_INDEX = resolve(REPO_ROOT, 'src/seo/json-ld/index.js');
if (!existsSync(SEO_INDEX)) {
  ok('src/seo/json-ld/index.js not present yet — skipping check-json-ld');
  process.exit(0);
}

const VITE_NODE = resolve(REPO_ROOT, 'node_modules/.bin/vite-node');
if (!existsSync(VITE_NODE)) {
  fail('vite-node not installed (ships with vitest). Run `npm i`.');
  process.exit(1);
}

const REQUIRED = {
  WebSite:     ['name', 'url'],
  Person:      ['name'],
  ProfilePage: ['mainEntity'],
  FAQPage:     ['mainEntity', 'inLanguage', 'isPartOf'],
  VideoObject: ['name', 'thumbnailUrl', 'uploadDate'],
  /* The blog graph. BreadcrumbList was already emitted by the resume and
     privacy pages without being listed here — only seo-audit's per-document
     dangling-@id pass caught it — so both are declared now. `blogPost` is not
     required on Blog: an article's graph names the Blog without listing its
     posts, and an EMPTY blog (CI syncs none) lists nothing. */
  BlogPosting: ['headline', 'url', 'inLanguage'],
  Blog: ['name', 'url', 'inLanguage'],
  CollectionPage: ['name', 'url', 'inLanguage', 'isPartOf', 'mainEntity'],
  BreadcrumbList: ['itemListElement'],
};

const SUPPORTED_LOCALES = ['en', 'es'];
const failures = [];

head('check-json-ld — validating @graph for each locale');

const TMP_DIR = resolve(REPO_ROOT, '.cache/json-ld-check');
mkdirSync(TMP_DIR, { recursive: true });

/*
 * THE BLOG GRAPHS ARE CHECKED, not just built. This builder always produced
 * `blog` and then dropped it, so the Blog row above validated nothing. Three
 * graphs now: the archive's first page with no posts (what CI's empty blog
 * ships), a later page listing one post, and an article. The post is a fixed
 * sample rather than the synced corpus, so the gate runs the same with no
 * blog checkout at all.
 */
const SAMPLE_POST = {
  title: 'check-json-ld sample post',
  description: 'A sample post the JSON-LD gate builds the blog graphs from.',
  date: '2026-01-01',
  cardImage: '/blog/media/sample.png',
  tags: ['sample'],
  categories: ['engineering'],
};

const _build = (locale) => {
  const entry = resolve(TMP_DIR, `entry-${locale}.mjs`);
  const prefix = locale === 'en' ? '/blog' : `/${locale}/blog`;
  const post = { ...SAMPLE_POST, locale, url: `${prefix}/engineering/sample` };
  const page = { number: 2, url: `${prefix}/page/2`, locale, posts: [post] };
  writeFileSync(entry, `
import { buildSiteJsonLd, buildBlogJsonLd, buildFaqJsonLd } from '@seo/json-ld';
const locale = ${JSON.stringify(locale)};
const out = {
  site: buildSiteJsonLd({ locale }),
  faq:  buildFaqJsonLd(locale),
  blog: buildBlogJsonLd({ locale }),
  blogPage: buildBlogJsonLd({ locale, page: ${JSON.stringify(page)} }),
  article: buildBlogJsonLd({ locale, post: ${JSON.stringify(post)} }),
};
process.stdout.write(JSON.stringify(out));
`);
  const r = spawnSync(VITE_NODE, [entry], { encoding: 'utf8', cwd: REPO_ROOT });
  try {
    rmSync(entry); 
  } catch { /* noop */ }
  if (r.status !== 0) {
    return { error: r.stderr.trim() || 'vite-node failed', stdout: r.stdout };
  }
  try {
    const parsed = JSON.parse(r.stdout);
    return {
      graphs: {
        site: parsed.site,
        'blog archive': parsed.blog,
        'blog page 2': parsed.blogPage,
        'blog article': parsed.article,
      },
      faq: parsed.faq,
      sample: { page, post },
    };
  } catch (e) {
    return { error: `invalid JSON: ${e.message}`, stdout: r.stdout };
  }
};

/* One graph: every @id reference resolves in it, every node carries its
   type's required fields, every URL is absolute HTTPS. */
const _check_graph = (locale, name, graph) => {
  const where = name === 'site' ? `locale=${locale}` : `locale=${locale} ${name}`;
  const label = name === 'site' ? locale : `${locale} ${name}`;
  if (!graph || !Array.isArray(graph['@graph'])) {
    failures.push(`${where}: the builder returned no @graph`);
    fail(`${label}: no @graph to check`);
    return;
  }
  const ids = new Set();
  for (const node of graph['@graph'] || []) {
    if (node['@id']) {
      ids.add(node['@id']);
    }
  }
  const _scan_refs = (node, path = '') => {
    if (!node || typeof node !== 'object') {
      return;
    }
    if (Array.isArray(node)) {
      for (const [i, v] of node.entries()) {
        _scan_refs(v, `${path}[${i}]`);
      }
      return;
    }
    for (const [k, v] of Object.entries(node)) {
      if (k === '@id' && path !== '' && typeof v === 'string') {
        if (!ids.has(v)) {
          failures.push(`${where}: dangling @id ref → ${v} at ${path}`);
        }
      }
      _scan_refs(v, `${path}.${k}`);
    }
  };
  for (const node of graph['@graph'] || []) {
    if (!node['@type']) {
      continue;
    }
    _scan_refs(node, node['@type']);
  }
  ok(`${label}: ${ids.size} entities, refs resolved`);

  for (const node of graph['@graph'] || []) {
    const t = node['@type'];
    const required = REQUIRED[t];
    if (!required) {
      continue;
    }
    for (const field of required) {
      if (node[field] === null || node[field] === undefined || node[field] === '') {
        failures.push(`${where}: ${t} ${node['@id'] || '<no @id>'} missing required field "${field}"`);
      }
    }
  }
  ok(`${label}: required fields present`);

  const URL_FIELDS = ['url', 'image', 'logo', 'item', 'primaryImageOfPage'];
  const _scan_urls = (node) => {
    if (!node || typeof node !== 'object') {
      return;
    }
    if (Array.isArray(node)) {
      node.forEach(_scan_urls); return; 
    }
    for (const [k, v] of Object.entries(node)) {
      if (URL_FIELDS.includes(k) && typeof v === 'string' && v && !v.startsWith('mailto:')) {
        if (!/^https:\/\//.test(v)) {
          failures.push(`${where}: ${k}="${v}" is not absolute HTTPS`);
        }
      }
      if (k === 'sameAs' && Array.isArray(v)) {
        for (const [i, u] of v.entries()) {
          if (typeof u === 'string' && !/^https:\/\//.test(u)) {
            failures.push(`${where}: sameAs[${i}]="${u}" is not absolute HTTPS`);
          }
        }
      }
      _scan_urls(v);
    }
  };
  graph['@graph']?.forEach(_scan_urls);
  ok(`${label}: URLs are absolute HTTPS`);
};

/*
 * What only the blog can get wrong. A later archive page is a page of its own:
 * its CollectionPage carries THAT page's url (every archive page used to carry
 * the index's), and the Blog it is about lists the post the page shows. An
 * article is part of that Blog as well as of the WebSite.
 */
const _typed = (graph, type) => (graph?.['@graph'] || [])
  .filter((n) => n['@type'] === type);

const _check_blog = (locale, { page, article }, sample) => {
  const [collection] = _typed(page, 'CollectionPage');
  if (collection && !String(collection.url).endsWith(sample.page.url)) {
    failures.push(`locale=${locale} blog page 2: CollectionPage url is ${collection.url}, not the page's own ${sample.page.url}`);
  }
  const [blog] = _typed(page, 'Blog');
  const listed = ((blog && blog.blogPost) || []).map((p) => String(p.url));
  if (!listed.some((u) => u.endsWith(sample.post.url))) {
    failures.push(`locale=${locale} blog page 2: the Blog lists ${listed.length} post(s), not the one the page shows`);
  }
  const [posting] = _typed(article, 'BlogPosting');
  const part_of = [posting && posting.isPartOf].flat().map((r) => r && r['@id']);
  if (!blog || !part_of.includes(blog['@id'])) {
    failures.push(`locale=${locale} blog article: the BlogPosting is not isPartOf the Blog ${blog && blog['@id']}`);
  }
  ok(`${locale}: blog page 2 is its own CollectionPage; the Blog lists its post and holds the article`);
};

for (const locale of SUPPORTED_LOCALES) {
  console.log(`\n──── locale :: ${c('cyan', locale)}`);
  const { graphs, faq, sample, error, stdout } = _build(locale);
  if (error) {
    failures.push(`builder failed for locale=${locale}: ${error}`);
    fail(`builder failed for ${locale} — see stderr above`);
    if (stdout) {
      console.error('stdout:', stdout.slice(0, 500));
    }
    continue;
  }

  for (const [name, graph] of Object.entries(graphs)) {
    _check_graph(locale, name, graph);
  }
  _check_blog(locale, { page: graphs['blog page 2'], article: graphs['blog article'] }, sample);

  if (!faq || faq['@type'] !== 'FAQPage') {
    failures.push(`locale=${locale}: FAQPage payload missing or wrong @type`);
    fail(`${locale}: FAQPage builder did not return a FAQPage`);
    continue;
  }
  for (const field of REQUIRED.FAQPage) {
    if (faq[field] === null || faq[field] === undefined || (Array.isArray(faq[field]) && faq[field].length === 0)) {
      failures.push(`locale=${locale}: FAQPage missing required field "${field}"`);
    }
  }
  if (typeof faq['@id'] !== 'string' || !/^https:\/\//.test(faq['@id'])) {
    failures.push(`locale=${locale}: FAQPage @id="${faq['@id']}" is not absolute HTTPS`);
  }
  const items = Array.isArray(faq.mainEntity) ? faq.mainEntity : [];
  if (items.length < 1) {
    failures.push(`locale=${locale}: FAQPage.mainEntity is empty`);
  }
  for (const [i, q] of items.entries()) {
    if (q['@type'] !== 'Question') {
      failures.push(`locale=${locale}: FAQPage.mainEntity[${i}].@type != "Question"`);
    }
    if (typeof q.name !== 'string' || q.name.trim() === '') {
      failures.push(`locale=${locale}: FAQPage.mainEntity[${i}].name is empty`);
    }
    if (typeof q['@id'] !== 'string' || !/^https:\/\//.test(q['@id'])) {
      failures.push(`locale=${locale}: FAQPage.mainEntity[${i}].@id="${q['@id']}" is not absolute HTTPS`);
    }
    const ans = q.acceptedAnswer;
    if (!ans || ans['@type'] !== 'Answer' || typeof ans.text !== 'string' || ans.text.trim() === '') {
      failures.push(`locale=${locale}: FAQPage.mainEntity[${i}].acceptedAnswer.text is empty or wrong shape`);
    }
  }
  ok(`${locale}: FAQPage ${items.length} questions, fields valid`);
}

exitWith({ failures, name: 'check-json-ld' });
