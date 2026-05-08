/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 *
 * vite.config.js — build + dev server configuration for the Vue 3 migration.
 *
 * Conventions sourced from:
 *   ../reckit/vite.config.js  (canonical pattern reference)
 *   CODE_STANDARDS_MIGRATION.md §3.3  (16-alias registry)
 *   SASS_THEMING_MIGRATION.md §3.2    (additionalData injection)
 *   PERFORMANCE_MIGRATION.md §7.2     (Vimeo feature flag)
 *
 * Rule: every kind-folder has an alias + matching ESLint resolver entry
 * (Rule H from reckit_naming_conventions). Zero relative parent imports.
 */

import { fileURLToPath, URL } from 'node:url';

import vue from '@vitejs/plugin-vue';
import { defineConfig, loadEnv } from 'vite';
import { beasties } from 'vite-plugin-beasties';
import { createHtmlPlugin } from 'vite-plugin-html';

/* vite-imagetools was removed — it intercepted .avif imports even with
   defaultDirectives disabled, breaking Vite's asset-hashing pipeline.
   Image variants (WebP + AVIF) are generated pre-build by
   `npm run convert:images` (sharp-based, see scripts/convert-images.mjs).
   Vite then handles them as plain hashed assets via `?url` imports in
   useImageManifest. */

const r = (path) => fileURLToPath(new URL(path, import.meta.url));
const SCSS_DIR = r('./src/scss');

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  // Build-time feature flags (evaluated once per build, tree-shakeable)
  const VIMEO_ENABLED = env.VITE_VIMEO_ENABLED !== 'false';
  const VIMEO_PRECONNECT = VIMEO_ENABLED && env.VITE_VIMEO_PRECONNECT !== 'false';

  return {
    plugins: [
      vue(),

      createHtmlPlugin({
        inject: {
          data: {
            // <%- vimeoPreconnect %> resolves to a tag or empty string.
            vimeoPreconnect: VIMEO_PRECONNECT
              ? '<link rel="preconnect" href="https://player.vimeo.com" crossorigin>'
              : '',

            // <%- lcpPreload %> is set in dev to a placeholder; the
            // post-build plugin below replaces it with hashed-URL preload
            // tags in prod (PERFORMANCE_MIGRATION.md §3.3 A).
            lcpPreload: mode === 'production'
              ? '<!-- LCP-PRELOAD-PLACEHOLDER -->'
              : '',
          },
        },
      }),

      // Auto-extracts critical CSS and inlines it in <head>; defers the
      // rest with <link rel="preload" as="style" onload>. Build-only — no
      // dev cost. PERFORMANCE_MIGRATION.md §5.
      beasties({
        options: {
          preload: 'swap',
          pruneSource: true,
          logLevel: 'warn',
        },
      }),

      // Post-build LCP preload injector. Runs after rollup hashes assets,
      // replaces the LCP-PRELOAD-PLACEHOLDER comment with a real
      // <link rel="preload"> tag pointing at the highest-resolution variant
      // of the kyonax_multiverse_characters portrait. Browser's preload
      // scanner picks it up during HTML parse — fires the request before
      // the JS bundle even loads.
      {
        name: 'lcp-preload-injector',
        apply: 'build',
        transformIndexHtml: {
          order: 'post',
          handler(html, ctx) {
            const bundle = ctx.bundle || {};
            const portrait = Object.keys(bundle)
              .filter((name) =>
                /kyonax_multiverse_characters(?:-\d+)?-[A-Za-z0-9_-]+\.(?:jpg|jpeg|webp|avif)$/
                  .test(name))
              .map((name) => {
                const m = name.match(/kyonax_multiverse_characters-(\d+)-/);
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
                + `imagesizes="(max-width: 768px) 300px, 600px" `
                + `fetchpriority="high">`
              : `<link rel="preload" as="image" `
                + `href="/${fallback.name}" `
                + `fetchpriority="high">`;

            return html.replace('<!-- LCP-PRELOAD-PLACEHOLDER -->', tag);
          },
        },
      },
    ],

    define: {
      // Surface env to runtime so src/config/features.js can read it
      'import.meta.env.VITE_VIMEO_ENABLED': JSON.stringify(env.VITE_VIMEO_ENABLED ?? 'true'),
      'import.meta.env.VITE_VIMEO_PRECONNECT': JSON.stringify(env.VITE_VIMEO_PRECONNECT ?? 'true'),
      __APP_VERSION__: JSON.stringify(process.env.npm_package_version || '2.0.0-vue-migration'),
    },

    resolve: {
      alias: {
        // (`@app` removed in Phase 8 — its target src/app/ was deleted.
        //  SCSS lives at @scss, fonts at @fonts, data at @data.)
        '@views':       r('./src/views'),
        '@sections':    r('./src/views/components/sections'),
        '@elements':    r('./src/views/components/elements'),
        '@modals':      r('./src/views/components/modals'),
        '@components':  r('./src/components'),
        '@ui':          r('./src/components/ui'),
        '@widgets':     r('./src/widgets'),
        '@composables': r('./src/composables'),
        '@utils':       r('./src/utils'),
        '@data':        r('./src/data'),
        '@workers':     r('./src/workers'),
        '@i18n':        r('./src/i18n'),
        '@config':      r('./src/config'),
        '@scss':        r('./src/scss'),
        '@assets':      r('./src/assets'),
        '@fonts':       r('./src/fonts'),
      },
    },

    css: {
      preprocessorOptions: {
        scss: {
          // src/scss/ on the SASS loadPath so partials (e.g. base/_typography
          // which is loaded by base/_index) can resolve `abstracts` without
          // a relative path. Vite's resolve.alias is JS-only — SASS imports
          // need their own resolver hint.
          loadPaths: [SCSS_DIR],

          // Auto-injected at the top of every .scss file and every
          // <style lang="scss"> block. Provides $breakpoints, $colors,
          // $typo-scale, and every mixin (font-face, *-media-query,
          // cyberpunk-glow, element-flare).
          //
          // CRITICAL: only declarations — never CSS rules. _theme.scss
          // (which emits :root { ... } and utility classes) is loaded ONCE
          // via main.scss instead. See SASS_THEMING_MIGRATION.md §3.2.
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
