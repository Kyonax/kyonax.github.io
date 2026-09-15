/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 */

/*
 * ssg-preload.mjs — every prerendered document names the chunks it will import.
 *
 * WHAT THE PRERENDER CANNOT SEE. vite-ssg writes a <link rel=modulepreload> for
 * each chunk that holds a COMPONENT the page rendered (its `ctx.modules`, read
 * through dist/.vite/ssr-manifest.json). Three of the blog's loads are not
 * components: use-blog.js, the composable both blog views import, and the two
 * things it imports on demand — an article's body (one chunk per post, from
 * `import.meta.glob`) and the archive's rich index (archive-index-*.js). The
 * browser met each of them only after the view chunk had arrived and been
 * parsed, one more round trip on every direct load. And an article's body chunk
 * was named nowhere in its HTML, so the link warmer, which reads the NEXT
 * page's HTML for what to fetch ahead, could never fetch it.
 *
 * SO EACH DOCUMENT DECLARES THEM, before </head>:
 *
 *   an article   its body chunk, then use-blog
 *   an archive   use-blog, then archive-index   (`archives: false` drops both)
 *   anything else  untouched
 *
 * Every link is fetchpriority=low: hydration needs them, the first paint does
 * not, and they must not compete with the stylesheets and the LCP image.
 *
 * WHERE THE MANIFEST IS. vite-ssg calls onPageRendered(route, html, appCtx)
 * after its own preload links and before the minifier, but appCtx does not
 * carry the manifest. It is read from the client build's outDir, which the
 * plugin half learns from the resolved config, so a build into another outDir
 * (the diagnosis builds do exactly that) reads its own manifest and never a
 * stale dist/.vite left behind by an interrupted build. The site's postbuild
 * deletes dist/.vite afterwards; the pages are written by then.
 *
 * IT NEVER FAILS A BUILD. No manifest, a key the manifest lacks, a chunk that
 * is not on disk: one warning each, and the page ships exactly as it would
 * have without this.
 *
 *   const preload = ssgPreload();
 *   plugins: [..., preload.plugin]
 *   ssgOptions: { ..., onPageRendered: preload.onPageRendered }
 */

import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

/* ssr-manifest keys are module paths relative to the Vite root. */
const USE_BLOG = 'src/composables/use-blog.js';
const ARCHIVE_INDEX = 'src/data/blog/index.json';
const POSTS = 'src/data/blog/posts/';
const BLOG_MANIFEST = 'src/data/blog/manifest.json';

const _strip = (p) => (p.length > 1 && p.endsWith('/') ? p.slice(0, -1) : p);

const _readJson = (file) => {
  if (!existsSync(file)) {
    return null;
  }
  try {
    return JSON.parse(readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
};

/*
 * An article's body module, derived from its URL exactly as use-blog.js's
 * bodyLoaderFor derives it, so the two cannot name different files:
 * /es/blog/engineering/2026-05-01-x -> src/data/blog/posts/es/engineering__2026-05-01-x.json
 */
const _bodyKey = (blog, post) => {
  const base = blog.base || '/blog';
  const prefix = post.locale === (blog.defaultLocale || 'en')
    ? base
    : `/${post.locale}${base}`;
  const tail = post.url
    .slice(prefix.length)
    .replace(/^\//, '')
    .replaceAll('/', '__');
  return `${POSTS}${post.locale}/${tail}.json`;
};

const _tag = (href) => `<link rel="modulepreload" crossorigin="" href="${href}" fetchpriority="low">`;

export const ssgPreload = ({ archives = true } = {}) => {
  let root = process.cwd();
  let outDir = resolve(root, 'dist');
  let plan = null;

  const warned = new Set();
  const warn = (msg) => {
    if (!warned.has(msg)) {
      warned.add(msg);
      console.warn(`[ssg-preload] ${msg}`);
    }
  };

  /* route -> the chunk URLs its document preloads, built once per build. */
  const _plan = () => {
    const out = new Map();
    const blog = _readJson(join(root, BLOG_MANIFEST));
    if (!blog || !Array.isArray(blog.routes)) {
      /* No synced corpus: no blog routes, so nothing to name. */
      return out;
    }
    const manifestFile = join(outDir, '.vite', 'ssr-manifest.json');
    const ssr = _readJson(manifestFile);
    if (!ssr) {
      warn(`no ${manifestFile}: no blog page gets its chunk preloads`);
      return out;
    }
    const files = new Map(Object.entries(ssr));

    /* The JS files the manifest maps a module to, kept only if the build
       really wrote them: a manifest that disagrees with the disk names
       nothing rather than a 404. */
    const chunksOf = (key) => {
      const js = (files.get(key) || []).filter((f) => f.endsWith('.js'));
      if (js.length === 0) {
        warn(`the ssr-manifest maps no chunk to ${key}`);
        return [];
      }
      const written = js.filter((f) => existsSync(join(outDir, f)));
      if (written.length < js.length) {
        warn(`the ssr-manifest names chunks for ${key} that are not in ${outDir}`);
      }
      return written;
    };

    const useBlog = chunksOf(USE_BLOG);
    for (const post of blog.routes) {
      out.set(_strip(post.url), [...chunksOf(_bodyKey(blog, post)), ...useBlog]);
    }
    if (archives) {
      const index = chunksOf(ARCHIVE_INDEX);
      for (const page of Object.values(blog.pages || {}).flat()) {
        out.set(_strip(page.url), [...useBlog, ...index]);
      }
    }
    return out;
  };

  const onPageRendered = (route, html) => {
    plan = plan || _plan();
    const want = plan.get(_strip(route));
    if (!want || want.length === 0) {
      return html;
    }
    /* The real </head> is the last one before <body: a head script's text
       (an article's JSON-LD about HTML, say) may spell the tag too. */
    const body = html.indexOf('<body');
    const at = html.lastIndexOf('</head>', body === -1 ? html.length : body);
    if (at === -1) {
      warn(`${route} has no </head>`);
      return html;
    }
    const tags = [...new Set(want)]
      .filter((href) => !html.includes(`href="${href}"`))
      .map(_tag)
      .join('');
    return `${html.slice(0, at)}${tags}${html.slice(at)}`;
  };

  const plugin = {
    name: 'ssg-preload',
    apply: 'build',
    configResolved(config) {
      /* vite-ssg resolves the config for its client build and again for its
         server build, whose outDir is a throwaway temp folder: only the
         client's outDir holds the ssr-manifest and the chunks. */
      if (config.build.ssr) {
        return;
      }
      root = config.root;
      outDir = resolve(config.root, config.build.outDir);
      plan = null;
    },
  };

  return { plugin, onPageRendered };
};

export default ssgPreload;
