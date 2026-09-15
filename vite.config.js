/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 */

/*
 *  ________ ______  ________  ___  _________
 * /_  __/ // / __/ / __/ __ \/ _ \/ ___/ __/
 *  / / / _  / _/  / _// /_/ / , _/ (_ / _/
 * /_/ /_//_/___/ /_/  \____/_/|_|\___/___/
 *
 * vite.config.js — Build, dev server, preview, SSG pipeline
 * 2026-05-14
 *
 * Owns the full Vite surface: 14 aliases, SCSS additional-data
 * injection, vite-ssg SSG options (dirStyle nested, hydration,
 * rootContainer), LCP-preload + AD-10 redirect transformIndexHtml
 * plugins, and the dev/preview middleware stack (strip-slash + dir
 * index resolution to mirror Apache DirectorySlash Off).
 *
 *   Imports + alias map (@views, @sections, @ui, ...)
 *   stripTrailingSlash middleware (302 + no-store)
 *   resolveDirIndex middleware (internal rewrite to /index.html)
 *   ssgOptions (mode: production, dirStyle: nested, includedRoutes)
 *   transformIndexHtml plugins (LCP preload, AD-10 redirect)
 *
 * Guidelines:
 *   Every kind-folder MUST have an alias here AND a matching
 *     entry in eslint.config.mjs (Rule H)
 *   Zero relative parent imports anywhere in src/
 *   Canonical URLs carry NO trailing slash on non-root paths
 *   SCSS additionalData injects @scss/abstracts globally
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { resolve as resolvePath } from 'node:path';
import { fileURLToPath, URL } from 'node:url';

import VueI18nPlugin from '@intlify/unplugin-vue-i18n/vite';
import vue from '@vitejs/plugin-vue';
import browserslist from 'browserslist';
import browserslistToEsbuild from 'browserslist-to-esbuild';
import { browserslistToTargets } from 'lightningcss';
import { defineConfig } from 'vite';
import { createHtmlPlugin } from 'vite-plugin-html';

import { previewCache } from './scripts/preview-cache.mjs';
import { ssgPreload } from './scripts/ssg-preload.mjs';

/*
 * Blog routes for the prerender list. A route missing here is silently NOT
 * prerendered and ships as an empty shell to crawlers, so this must stay in
 * lockstep with src/router.js — both read this one generated manifest.
 */
const _blogRoutePaths = () => {
  try {
    const file = fileURLToPath(new URL('./src/data/blog/manifest.json', import.meta.url));
    const m = JSON.parse(readFileSync(file, 'utf8'));
    const pages = Object.values(m.pages || {}).flat().map((p) => p.url);
    /* `routes`, not `posts`: the manifest is split so the eagerly-imported half
       carries only routing rows. Reading the wrong key here does not error —
       it silently prerenders nothing, which is exactly the failure this list's
       own comment warns about. */
    const posts = (m.routes || []).map((p) => p.url);
    return [...pages, ...posts];
  } catch {
    /* No manifest yet: the site builds exactly as it did before the blog existed. */
    return [];
  }
};


const r = (path) => fileURLToPath(new URL(path, import.meta.url));
const SCSS_DIR = r('./src/scss');

/*
 * THE STYLE BOOK AND ITS RUNTIME, BY THEIR CONTENT-HASHED NAMES. sync-blog.mjs
 * writes `style-book-<hash>.css` and `o2h-<hash>.js` into public/blog/ beside
 * the plain names, and public/.htaccess caches the hashed ones for a year.
 * blog-post.vue links whichever name `define` gives it below: the hashed copy,
 * or the plain name when there is none (a bare `vite` runs no prebuild, so no
 * sync). Read at config time, which `npm run build` reaches after its sync.
 */
const _blogAsset = (hashed, plain) => {
  try {
    const hit = readdirSync(r('./public/blog')).find((f) => hashed.test(f));
    return `/blog/${hit || plain}`;
  } catch {
    return `/blog/${plain}`;
  }
};

// Canonical routes have NO trailing slash. Any request that arrives with a
// trailing slash is redirected to the non-slash form. `/` itself is exempt.
const stripTrailingSlash = (req, res, next) => {
  const raw = req.url || '/';
  const qIdx = raw.indexOf('?');
  const path = qIdx === -1 ? raw : raw.slice(0, qIdx);
  const query = qIdx === -1 ? '' : raw.slice(qIdx);
  if (path.length > 1 && path.endsWith('/')) {
    res.statusCode = 302;
    res.setHeader('Location', path.replace(/\/+$/, '') + query);
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.end();
    return;
  }
  next();
};

// Internal rewrite — vite preview's SPA fallback otherwise sends every
// non-matching URL to /index.html, so /es, /privacy, /es/privacy all serve
// the EN home shell. Rewrites the URL server-side (no client-visible
// redirect) so sirv finds the right prerendered HTML. Mirrors Apache
// `mod_dir` + `DirectorySlash Off` on production.
const resolveDirIndex = (rootDir) => (req, res, next) => {
  const raw = req.url || '/';
  const qIdx = raw.indexOf('?');
  const path = qIdx === -1 ? raw : raw.slice(0, qIdx);
  const query = qIdx === -1 ? '' : raw.slice(qIdx);
  if (path === '/' || /\.[a-z0-9]+$/i.test(path)) {
    return next();
  }
  const candidate = resolvePath(rootDir, `.${  path}`, 'index.html');
  if (existsSync(candidate)) {
    req.url = `${path  }/index.html${  query}`;
  }
  next();
};

/* Vite dev's SPA fallback (connect-history-api-fallback) fires whenever
   `Accept: text/html` is present on a non-existent path, and Vite does NOT
   serve HTML files from `public/` in dev. The result: /privacy and /es/privacy
   silently render the SPA home shell to anything other than curl's default
   `Accept: *\/*`. Read the static HTML ourselves and end the response before
   the fallback can intercept. Preview (configurePreviewServer) is unaffected
   because sirv serves dist/ files directly. */
const servePublicHtmlInDev = (publicDir) => (req, res, next) => {
  const raw = req.url || '/';
  const qIdx = raw.indexOf('?');
  const path = qIdx === -1 ? raw : raw.slice(0, qIdx);
  if (path === '/' || /\.[a-z0-9]+$/i.test(path)) {
    return next();
  }
  const candidate = resolvePath(publicDir, `.${  path}`, 'index.html');
  if (existsSync(candidate)) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache');
    res.end(readFileSync(candidate));
    return;
  }
  next();
};

const applyDevMiddleware = (server) => {
  server.middlewares.use(stripTrailingSlash);
  server.middlewares.use(servePublicHtmlInDev(r('./public')));
};

const applyPreviewMiddleware = (server) => {
  server.middlewares.use(stripTrailingSlash);
  server.middlewares.use(resolveDirIndex(r('./dist')));
  /* public/.htaccess's Cache-Control, only when the preview is started with
     KYO_PREVIEW_CACHE=prod (the cache specs, via playwright.config.js); any
     other time a pass-through, and the preview answers no-cache as before.
     After resolveDirIndex, so a route is already its index.html. */
  server.middlewares.use(previewCache(r('./public/.htaccess')));
};

export default defineConfig(({ mode }) => {
  /* Each prerendered blog page's own chunk preloads (scripts/ssg-preload.mjs):
     a plugin that learns this build's outDir, and the vite-ssg hook that reads
     that build's ssr-manifest. `ssgPreload({ archives: false })` keeps them on
     the articles alone. */
  const preload = ssgPreload();
  return {
    plugins: [
      /* MUST come before createHtmlPlugin AND carry `enforce: 'pre'` —
         vite-plugin-html is `enforce: 'pre'` and installs a
         connect-history-api-fallback middleware that rewrites EVERY HTML
         navigation request to `/index.html`. Vite resolves all `pre` plugins
         before any normal-order plugin, so our serve-public middleware would
         see `/index.html` instead of `/privacy` unless we also enforce pre
         and list this plugin earlier in the pre bucket. */
      {
        name: 'canonical-routing',
        enforce: 'pre',
        apply: 'serve',
        configureServer: applyDevMiddleware,
        configurePreviewServer: applyPreviewMiddleware,
      },

      vue(),

      VueI18nPlugin({
        /* Keep runtime+compiler bundled — message strings live in
           `@data/snippets` as a JS object, and `src/seo/json-ld/*` reads
           leaf strings directly (not via t()). Pre-compilation would
           require migrating to JSON + refactoring those consumers. */
        runtimeOnly: false,
        compositionOnly: true,
        fullInstall: true,
        strictMessage: false,
      }),

      createHtmlPlugin({
        inject: {
          data: {
            // Placeholder in dev; the lcp-preload-injector plugin below
            // replaces it post-hash so the href is content-addressed.
            lcpPreload: mode === 'production'
              ? '<!-- LCP-PRELOAD-PLACEHOLDER -->'
              : '',

            fontPreload: mode === 'production'
              ? '<!-- FONT-PRELOAD-PLACEHOLDER -->'
              : '',
          },
        },
      }),

      // Runs post-hash so the href contains the content-hashed filename.
      // Browser's preload scanner fires the request before the JS bundle.
      {
        name: 'lcp-preload-injector',
        apply: 'build',
        transformIndexHtml: {
          order: 'post',
          handler(html, ctx) {
            const bundle = ctx.bundle || {};
            const PORTRAIT_EXT = /\.(jpg|jpeg|webp|avif)$/;
            const PORTRAIT_WIDTH = /^kyonax_portrait-(\d+)-/;
            const portrait = Object.keys(bundle)
              .filter((name) => {
                if (!PORTRAIT_EXT.test(name)) {
                  return false;
                }
                const base = name.split('/').pop();
                return base.startsWith('kyonax_portrait');
              })
              .map((name) => {
                const base = name.split('/').pop();
                const m = base.match(PORTRAIT_WIDTH);
                return { name, width: m ? Number.parseInt(m[1], 10) : 0 };
              })
              .sort((a, b) => a.width - b.width);

            if (portrait.length === 0) {
              return html.replace('<!-- LCP-PRELOAD-PLACEHOLDER -->', '');
            }

            const sized = portrait.filter((p) => p.width > 0);

            // Preload avif only + matching type/sizes so the scanner picks the same candidate the <picture> uses.
            const IS_AVIF = /\.avif$/;
            const avif = sized.filter((p) => IS_AVIF.test(p.name));
            const preload_set = avif.length > 0 ? avif : sized;
            const preload_type = avif.length > 0 ? 'image/avif' : '';
            const fallback = avif.length > 0
              ? (portrait.find((p) => p.width === 0 && IS_AVIF.test(p.name)) || avif[avif.length - 1])
              : (portrait.find((p) => p.width === 0) || sized[sized.length - 1]);

            const srcset = preload_set
              .map((p) => `/${p.name} ${p.width}w`)
              .join(', ');

            // imagesizes MUST mirror the <UiImage sizes> in hero-visual.vue.
            const has_set = preload_set.length > 0;
            const tag = [
              '<link rel="preload" as="image"',
              preload_type ? `type="${preload_type}"` : '',
              `href="/${fallback.name}"`,
              has_set ? `imagesrcset="${srcset}"` : '',
              has_set ? 'imagesizes="(max-width: 768px) 70vw, 380px"' : '',
              'fetchpriority="high">',
            ].filter(Boolean).join(' ');

            return html.replace('<!-- LCP-PRELOAD-PLACEHOLDER -->', tag);
          },
        },
      },

      /* Preload the 4 hero fonts (Geomanist Regular/Bold + SpaceMonoNerdFont
         Regular/Bold) so the browser fetches them in parallel with the CSS
         and JS rather than after the CSS parser hits @font-face. Kills the
         FOIT on first paint. `crossorigin` is mandatory — without it, the
         browser fetches the font twice (once for preload, once for the real
         request) because @font-face is always credentialed. */
      {
        name: 'font-preload-injector',
        apply: 'build',
        transformIndexHtml: {
          order: 'post',
          handler(html, ctx) {
            const bundle = ctx.bundle || {};
            const FONT_FAMILIES = [
              'GeomanistRegular',
              'GeomanistBold',
              'SpaceMonoNerdFont-Regular',
              'SpaceMonoNerdFont-Bold',
              'SymbolsNerdFontMono-Regular',
            ];
            const matches = FONT_FAMILIES
              .map((family) => {
                const re = new RegExp(`(^|/)${family}(-[\\w]+)?\\.woff2$`);
                return Object.keys(bundle).find((name) => re.test(name));
              })
              .filter(Boolean);

            if (matches.length === 0) {
              return html.replace('<!-- FONT-PRELOAD-PLACEHOLDER -->', '');
            }

            const tags = matches
              .map((name) =>
                '<link rel="preload" as="font" type="font/woff2" crossorigin '
                + `href="/${name}">`,
              )
              .join('\n    ');

            return html.replace('<!-- FONT-PRELOAD-PLACEHOLDER -->', tags);
          },
        },
      },

      // Inline pre-hydration redirect — runs synchronously before the module
      // bundle loads. Returning ES visitors land on /es directly; no flash.
      {
        name: 'pre-hydration-redirect',
        apply: 'build',
        transformIndexHtml: {
          order: 'post',
          handler(html) {
            const snippet = '<script>(function(){var p=location.pathname,e=new URLSearchParams(location.search).get("language");if(p==="/"||p===""){var s=null;try{s=localStorage.getItem("kyo:lang")}catch(x){}var n=(navigator.language||"").slice(0,2).toLowerCase(),k=e||s||n;if(k==="es")location.replace("/es"+location.hash)}else if(p==="/es"){if(e==="en")location.replace("/"+location.hash)}})();</script>';
            return html.replace(/<meta name="viewport"[^>]*>/, (m) => m + snippet);
          },
        },
      },

      /* THE ARCHIVE SEARCH HOLD. An archive URL that carries ?search= (or the
         old ?q=) would paint its prerendered list unfiltered until the chunks
         hydrate, then drop to the matches: a flash and a layout shift. So
         before first paint <html> gets `kyo-search-hold`, which keeps the
         list, the pager and the footer visibility:hidden (_global.scss — the
         render-blocking sheet; the archive's own CSS is deferred), and
         blog-search.vue removes it on mount, right after it emits the
         filtered rows. Three seconds is the failsafe. An invisible box logs
         no layout shift, and with JavaScript off nothing is held. */
      {
        name: 'archive-search-hold',
        apply: 'build',
        transformIndexHtml: {
          order: 'post',
          handler(html) {
            const snippet = '<script>(function(){var d=document.documentElement;if(/^(\\/es)?\\/blog(\\/page\\/\\d+)?\\/?$/.test(location.pathname)&&/[?&](search|q)=[^&]/.test(location.search)){d.classList.add("kyo-search-hold");setTimeout(function(){d.classList.remove("kyo-search-hold")},3e3)}})();</script>';
            return html.replace(/<meta name="viewport"[^>]*>/, (m) => m + snippet);
          },
        },
      },

      /* THE ARCHIVE'S FRAGMENTS LAND IN FIREFOX TOO. Firefox scrolls to a
         #fragment once, about 90 ms in, before the archive's deferred
         stylesheets swap in (~123 ms), and never corrects: /blog#all-posts
         ended 646px off at 390 and 467px off at 1440, so every tag chip,
         pager link and section link mis-landed. Chromium re-anchors on its
         own, but not always: #pipeline landed 40px low (the marquee's height)
         when the marquee's deferred CSS arrived after the load. So on `load`
         this aligns the target, then again whenever the document resizes,
         for 2.5 s — until the reader scrolls, types or presses, which stops
         it at once. Archive paths only: on the landing it moved Chromium's
         /#faq off the nav. */
      {
        name: 'archive-fragment-anchor',
        apply: 'build',
        transformIndexHtml: {
          order: 'post',
          handler(html) {
            const snippet = '<script>(function(){var h=location.hash,id;if(h.length<2||!/^(\\/[a-z]{2})?\\/blog(\\/page\\/\\d+)?\\/?$/.test(location.pathname))return;try{id=decodeURIComponent(h.slice(1))}catch(x){return}var m=0,s=function(){m=1};["wheel","touchmove","keydown","pointerdown"].forEach(function(e){addEventListener(e,s,{once:true,passive:true})});addEventListener("load",function(){var t0=Date.now(),a=function(){if(m||Date.now()-t0>2500)return;var t=document.getElementById(id);if(t)t.scrollIntoView({block:"start",behavior:"instant"})};a();if(window.ResizeObserver){var r=new ResizeObserver(a);r.observe(document.documentElement);setTimeout(function(){r.disconnect()},2500)}},{once:true})})();</script>';
            return html.replace(/<meta name="viewport"[^>]*>/, (m) => m + snippet);
          },
        },
      },

      /* THE NEXT BLOG PAGE, PRERENDERED ON INTENT. Every blog link is a full
         document load, so Chromium is handed speculation rules: at `moderate`
         eagerness a link the reader rests on (about 200 ms) or presses is
         prerendered in the background, and the click only has to show it.
         Scoped to the blog's pages, /blog and /es/blog and all under them,
         minus what is not a page (the feeds, the body media) and what the
         reader did not ask to open here: a new tab, a download, or a link
         under [data-no-warm], which the link warmer refuses as well. A
         prerendered page runs its scripts unseen, so use-analytics.js holds
         Umami until `prerenderingchange`. Other engines ignore the script.
         Under Playwright, DevTools cancels every prerender and it downgrades
         to a prefetch, which is what prefetch.spec.js asserts; the prerender
         itself is checked by hand. A CSP script-src would need
         'inline-speculation-rules' (see public/.htaccess). */
      {
        name: 'speculation-rules',
        apply: 'build',
        transformIndexHtml: {
          order: 'post',
          handler(html) {
            const rules = JSON.stringify({
              prerender: [{
                where: {
                  and: [
                    { href_matches: ['/blog', '/blog/*', '/es/blog', '/es/blog/*'] },
                    { not: { href_matches: ['/blog/feed.xml', '/es/blog/feed.xml', '/blog/media/*'] } },
                    { not: { selector_matches: ['[target=_blank]', '[download]', '[data-no-warm]', '[data-no-warm] a'] } },
                  ],
                },
                eagerness: 'moderate',
              }],
            });
            return html.replace(/<meta name="viewport"[^>]*>/, (m) => `${m}<script type="speculationrules">${rules}</script>`);
          },
        },
      },

      preload.plugin,

    ],

    ssgOptions: {
      script: 'async',
      formatting: 'minify',
      mode: 'production',
      rootContainerId: 'root',
      /* Critical-CSS extraction (beasties / critters) is fundamentally
         incompatible with full SSG prerender: it classifies a CSS rule as
         critical iff a matching selector appears in the rendered HTML, but
         vite-ssg renders every section upfront, so 100% of the stylesheet
         is marked critical. With `pruneSource: true` the external file
         drops to 0 bytes; without it, the entire sheet duplicates inline
         + external, regressing total bytes. Would need a viewport-aware
         render (headless Chrome) to be useful — negates the build-only
         premise. Disabled. */
      beastiesOptions: false,
      /* Emit dist/<path>/index.html so /es and /es/ both resolve cleanly
         via Apache + DirectorySlash Off + strip-slash rule. */
      dirStyle: 'nested',
      /* Explicit prerender list. Keep in lockstep with src/router.js ROUTES and
         the URL lists in scripts/generate-sitemap.mjs — a route missing here is
         silently NOT prerendered and ships as an empty shell to crawlers. */
      includedRoutes() {
        /* The hand-written pages, plus every blog route the synced manifest names.
           Read with readFileSync rather than imported: this runs at CONFIG time,
           before the @-aliases exist, and the file is generated so it may be an
           empty manifest on a checkout with no blog build. */
        const blog = _blogRoutePaths();
        return [
          '/', '/es', '/resume', '/es/hoja-de-vida', '/privacy', '/es/privacy',
          ...blog,
        ];
      },
      /* Runs after vite-ssg's own preload links and before the minifier. */
      onPageRendered: preload.onPageRendered,
    },

    define: {
      __APP_VERSION__: JSON.stringify(process.env.npm_package_version || '0.0.0'),
      __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: 'false',
      /* `import.meta.env.*`, so no ESLint global is needed in blog-post.vue. */
      'import.meta.env.KYO_BLOG_STYLE_BOOK': JSON.stringify(_blogAsset(/^style-book-[A-Za-z0-9_-]{8}\.css$/, 'style-book.css')),
      'import.meta.env.KYO_BLOG_O2H': JSON.stringify(_blogAsset(/^o2h-[A-Za-z0-9_-]{8}\.js$/, 'o2h.js')),
    },

    resolve: {
      alias: {
        '@views':       r('./src/views'),
        '@sections':    r('./src/views/components/sections'),
        '@components':  r('./src/components'),
        '@ui':          r('./src/components/ui'),
        '@widgets':     r('./src/widgets'),
        '@composables': r('./src/composables'),
        '@data':        r('./src/data'),
        '@workers':     r('./src/workers'),
        '@i18n':        r('./src/i18n'),
        '@scss':        r('./src/scss'),
        '@assets':      r('./src/assets'),
        '@fonts':       r('./src/fonts'),
        '@seo':         r('./src/seo'),
      },
    },

    css: {
      // Prefixing + down-levelling follow the signed browserslist floor (scripts/targets.lock.txt).
      transformer: 'lightningcss',
      lightningcss: {
        targets: browserslistToTargets(browserslist()),
      },
      preprocessorOptions: {
        scss: {
          // SASS needs its own resolver hint — Vite's resolve.alias is JS-only.
          loadPaths: [SCSS_DIR],

          /* CRITICAL: only declarations — never CSS rules. _theme.scss
             (which emits :root { ... } and utility classes) is loaded ONCE
             via main.scss, NOT here, otherwise every SFC <style> block
             would re-emit the :root block. */
          additionalData: '@use "abstracts" as *;\n',

          api: 'modern-compiler',
        },
      },
    },

    server: {
      port: 9000,
      open: false,
    },

    build: {
      // Derived from the same signed browserslist floor — never hardcode an esN here.
      target: browserslistToEsbuild(),
      cssCodeSplit: true,
      // Maps are a dev aid; production ships none (public .map = source disclosure).
      sourcemap: mode !== 'production',
      /* Subset fonts (e.g. SymbolsNerdFontMono → 2.7 KB) would otherwise
         fall under Vite's 4 KB inline threshold and be embedded as
         data: URLs inside the render-blocking CSS. We need them as
         separately-hashed cacheable assets so the font-preload pass
         can target them. */
      assetsInlineLimit: (filePath) => filePath.endsWith('.woff2') ? false : undefined,
      rollupOptions: {
        output: {
          assetFileNames: 'assets/[name]-[hash][extname]',
          /* THE ARCHIVE'S DATA IS NOT THE ARCHIVE'S CODE. The blog's rich index
             (src/data/blog/index.json, every post of both locales, loaded
             lazily) is a chunk of its own. vite 6 named it index-*.js; vite 8's
             rolldown names a chunk built from an index file after its folder,
             so it became blog-*.js and the "blog index chunk" size budget
             counted 3.66 KB of DATA as view code (10.58 of 7.25 KB). Named for
             what it is, it stays unbudgeted, as it always was. */
          chunkFileNames: (chunk) => (
            /\/src\/data\/blog\/index\.json$/.test(chunk.facadeModuleId || '')
              ? 'assets/archive-index-[hash].js'
              : 'assets/[name]-[hash].js'
          ),
          entryFileNames: 'assets/[name]-[hash].js',
        },
      },
    },

    test: {
      environment: 'happy-dom',
      globals: true,
      passWithNoTests: true,
      include: ['src/**/*.{test,spec}.{js,mjs}'],
      coverage: {
        provider: 'v8',
        reporter: ['text', 'html'],
        include: ['src/**/*.{js,mjs,vue}'],
        exclude: [
          'src/main.js',
          'src/App.vue',
          'src/router.js',
          '**/*.{test,spec}.*',
        ],
      },
    },
  };
});
