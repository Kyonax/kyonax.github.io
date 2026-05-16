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

import { fileURLToPath, URL } from 'node:url';
import { existsSync, readFileSync } from 'node:fs';
import { resolve as resolvePath } from 'node:path';

import vue from '@vitejs/plugin-vue';
import { defineConfig, loadEnv } from 'vite';
import { createHtmlPlugin } from 'vite-plugin-html';

const r = (path) => fileURLToPath(new URL(path, import.meta.url));
const SCSS_DIR = r('./src/scss');

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
  if (path === '/' || /\.[a-z0-9]+$/i.test(path)) return next();
  const candidate = resolvePath(rootDir, '.' + path, 'index.html');
  if (existsSync(candidate)) {
    req.url = path + '/index.html' + query;
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
  if (path === '/' || /\.[a-z0-9]+$/i.test(path)) return next();
  const candidate = resolvePath(publicDir, '.' + path, 'index.html');
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
};

export default defineConfig(({ mode }) => {
  // vite-ssg invokes the config under non-standard mode names ("local" etc.)
  // which loadEnv rejects. Skip loadEnv unless mode is the usual pair.
  const env = (mode === 'production' || mode === 'development')
    ? loadEnv(mode, process.cwd(), '')
    : {};

  const VIMEO_ENABLED = env.VITE_VIMEO_ENABLED !== 'false';
  const VIMEO_PRECONNECT = VIMEO_ENABLED && env.VITE_VIMEO_PRECONNECT !== 'false';

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

      createHtmlPlugin({
        inject: {
          data: {
            vimeoPreconnect: VIMEO_PRECONNECT
              ? '<link rel="preconnect" href="https://player.vimeo.com" crossorigin>'
              : '',

            // Placeholder in dev; the lcp-preload-injector plugin below
            // replaces it post-hash so the href is content-addressed.
            lcpPreload: mode === 'production'
              ? '<!-- LCP-PRELOAD-PLACEHOLDER -->'
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
            const portrait = Object.keys(bundle)
              .filter((name) =>
                /kyonax_portrait(?:-\d+)?-[A-Za-z0-9_-]+\.(?:jpg|jpeg|webp|avif)$/
                  .test(name))
              .map((name) => {
                const m = name.match(/kyonax_portrait-(\d+)-/);
                return { name, width: m ? parseInt(m[1], 10) : 0 };
              })
              .sort((a, b) => a.width - b.width);

            if (portrait.length === 0) {
              return html.replace('<!-- LCP-PRELOAD-PLACEHOLDER -->', '');
            }

            const sized = portrait.filter((p) => p.width > 0);
            const fallback = portrait.find((p) => p.width === 0) || sized[sized.length - 1];

            const srcset = sized
              .map((p) => `/${p.name} ${p.width}w`)
              .join(', ');

            const tag = sized.length > 0
              ? `<link rel="preload" as="image" `
                + `href="/${fallback.name}" `
                + `imagesrcset="${srcset}" `
                + `imagesizes="(max-width: 768px) 300px, (max-width: 1200px) 600px, 900px" `
                + `fetchpriority="high">`
              : `<link rel="preload" as="image" `
                + `href="/${fallback.name}" `
                + `fetchpriority="high">`;

            return html.replace('<!-- LCP-PRELOAD-PLACEHOLDER -->', tag);
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
            const snippet = `<script>(function(){var p=location.pathname,e=new URLSearchParams(location.search).get("language");if(p==="/"||p===""){var s=null;try{s=localStorage.getItem("kyo:lang")}catch(x){}var n=(navigator.language||"").slice(0,2).toLowerCase(),k=e||s||n;if(k==="es")location.replace("/es"+location.hash)}else if(p==="/es"){if(e==="en")location.replace("/"+location.hash)}})();</script>`;
            return html.replace(/<meta name="viewport"[^>]*>/, (m) => m + snippet);
          },
        },
      },

    ],

    ssgOptions: {
      script: 'async',
      formatting: 'minify',
      mode: 'production',
      rootContainerId: 'root',
      /* beasties (critical-CSS inliner) crashes under vite-ssg's JSDOM
         renderer on :root custom-property blocks. Re-enable once upstream
         resolves JSDOM serialization. */
      beastiesOptions: false,
      /* Emit dist/<path>/index.html so /es and /es/ both resolve cleanly
         via Apache + DirectorySlash Off + strip-slash rule. */
      dirStyle: 'nested',
      includedRoutes() {
        return ['/', '/es'];
      },
    },

    define: {
      'import.meta.env.VITE_VIMEO_ENABLED': JSON.stringify(env.VITE_VIMEO_ENABLED ?? 'true'),
      'import.meta.env.VITE_VIMEO_PRECONNECT': JSON.stringify(env.VITE_VIMEO_PRECONNECT ?? 'true'),
      __APP_VERSION__: JSON.stringify(process.env.npm_package_version || '0.0.0'),
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
        '@config':      r('./src/config'),
        '@scss':        r('./src/scss'),
        '@assets':      r('./src/assets'),
        '@fonts':       r('./src/fonts'),
        '@seo':         r('./src/seo'),
      },
    },

    css: {
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
      target: 'es2020',
      cssCodeSplit: true,
      sourcemap: true,
      rollupOptions: {
        output: {
          assetFileNames: 'assets/[name]-[hash][extname]',
          chunkFileNames: 'assets/[name]-[hash].js',
          entryFileNames: 'assets/[name]-[hash].js',
        },
      },
    },

    test: {
      environment: 'happy-dom',
      globals: true,
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
