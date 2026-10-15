#!/usr/bin/env node
/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 */

/*
 * blog-mode.mjs — build (and optionally serve) the site against a chosen blog.
 *
 *   node scripts/blog-mode.mjs kitchen-sink [--serve] [--port 4173]
 *   node scripts/blog-mode.mjs no-articles  [--serve] [--port 4173]
 *
 *   npm run preview:kitchen-sink     the same, built and served on :4173
 *   npm run preview:no-articles
 *   npm run build                    back to the real corpus (../kyo-blog/dist)
 *
 * KITCHEN-SINK renders ONLY tests/fixtures/blog/ — "Everything org2html Renders"
 * and its Spanish twin, every include and image they reference — so the site's
 * article shell can be refined against every construct the engine emits without
 * depending on what kyo-blog happens to hold. NO-ARTICLES points sync-blog at a
 * directory with no build in it, which is the site's own supported fallback: an
 * EMPTY manifest, no blog routes, the site exactly as it looks with no article.
 *
 * THE ENGINE IS THE LOCAL CHECKOUT FIRST. The fixture exercises constructs the
 * published package may not render yet (1.1.0 prints LaTeX environments raw), so
 * ORG2HTML_BIN wins, then ../org-2-html/dist/cli/index.mjs, then kyo-blog's
 * installed package. The manifest comes from kyo-blog's ci/generate-manifest.mjs
 * (KYO_BLOG_DIR, default ../kyo-blog): one generator, never a copy that drifts.
 *
 * THE TRACKED SITEMAP IS PUT BACK. prebuild regenerates public/sitemap.xml from
 * whatever blog it was given; after a fixture or empty build that file would list
 * the wrong articles, and an unattended commit would ship it. The pre-build bytes
 * are restored once the build ends, pass or fail. dist/ and src/data/blog/ stay
 * in the chosen mode (both are ignored) until the next plain `npm run build`.
 */

import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { fail, head, line, ok, REPO_ROOT, warn } from './_lib.mjs';

const MODES = ['kitchen-sink', 'no-articles'];
const argv = process.argv.slice(2);
const mode = argv.find((a) => !a.startsWith('--'));
const serve = argv.includes('--serve');
const portAt = argv.indexOf('--port');
const port = portAt === -1 ? '4173' : argv[portAt + 1];

if (!MODES.includes(mode) || !/^\d+$/.test(port)) {
  fail(`usage: node scripts/blog-mode.mjs <${MODES.join('|')}> [--serve] [--port N]`);
  process.exit(2);
}

const FIXTURE = join(REPO_ROOT, 'tests/fixtures/blog');
const OUT = join(REPO_ROOT, '.cache/blog-mode', mode);
const SITEMAP = join(REPO_ROOT, 'public/sitemap.xml');
const DEV = resolve(REPO_ROOT, '..');
const KYO_BLOG = resolve(process.env.KYO_BLOG_DIR || join(DEV, 'kyo-blog'));

const run = (cmd, args, opts = {}) => {
  const r = spawnSync(cmd, args, { stdio: 'inherit', ...opts });
  return r.status ?? 1;
};

const resolveEngine = () => [
  process.env.ORG2HTML_BIN,
  join(DEV, 'org-2-html/dist/cli/index.mjs'),
  join(KYO_BLOG, 'node_modules/@kyonax/org2html/dist/cli/index.mjs'),
].find((p) => p && existsSync(p));

function buildKitchenSink() {
  const engine = resolveEngine();
  const generator = join(KYO_BLOG, 'ci/generate-manifest.mjs');
  if (!existsSync(join(FIXTURE, 'content'))) {
    fail(`the fixture is missing: ${FIXTURE} (restore it from git before anything else)`);
    process.exit(1);
  }
  if (!engine) {
    fail('no org2html engine: set ORG2HTML_BIN, or build ../org-2-html (npm run build there)');
    process.exit(1);
  }
  if (!existsSync(generator)) {
    fail(`no manifest generator at ${generator} (set KYO_BLOG_DIR)`);
    process.exit(1);
  }
  const version = spawnSync('node', [engine, '--version'], { encoding: 'utf8' }).stdout.trim();
  line(`engine ${version} · ${engine}`);

  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(OUT, { recursive: true });
  const blog = join(OUT, 'blog');
  if (run('node', [engine, 'build', 'content', '-o', blog, '--include-root', 'includes',
    '--base-url', 'https://kyonax.com/blog', '--asset-base', '/blog'], { cwd: FIXTURE }) !== 0) {
    fail('the engine could not render the fixture');
    process.exit(1);
  }
  cpSync(join(FIXTURE, 'media'), join(blog, 'media'), { recursive: true });
  if (run('node', [generator, blog, '-o', join(OUT, 'blog-manifest.json'), '--posts-dir', join(OUT, 'posts'),
    '--base', '/blog', '--origin', 'https://kyonax.com', '--content', join(FIXTURE, 'content'),
    '--engine-version', version], { cwd: FIXTURE }) !== 0) {
    fail('generate-manifest failed on the fixture');
    process.exit(1);
  }
  const { counts } = JSON.parse(readFileSync(join(OUT, 'blog-manifest.json'), 'utf8'));
  ok(`fixture rendered: ${counts.posts} posts · ${counts.families} EN/ES pair · ${counts.pages} archive pages`);
}

head(`blog-mode — ${mode}`);
if (mode === 'kitchen-sink') {
  buildKitchenSink();
} else {
  rmSync(OUT, { recursive: true, force: true });
  mkdirSync(OUT, { recursive: true });
  ok('no blog build: sync-blog writes the EMPTY manifest');
}

const sitemap = readFileSync(SITEMAP);
const built = run('npm', ['run', 'build'], { cwd: REPO_ROOT, env: { ...process.env, BLOG_DIST: OUT } });
if (!readFileSync(SITEMAP).equals(sitemap)) {
  writeFileSync(SITEMAP, sitemap);
  line('public/sitemap.xml put back as it was before the build');
}
if (built !== 0) {
  fail(`the site build failed in ${mode} mode`);
  process.exit(built);
}
ok(`dist/ is the ${mode} build; \`npm run build\` returns it to the real corpus`);

if (serve) {
  head(`serving dist/ on http://127.0.0.1:${port}/  (Ctrl+C stops it)`);
  if (mode === 'kitchen-sink') {
    line(`EN  http://127.0.0.1:${port}/blog/engineering/2026-08-13-everything-org2html-renders`);
    line(`ES  http://127.0.0.1:${port}/es/blog/engineering/2026-08-13-todo-lo-que-org2html-renderiza`);
  } else {
    warn('no blog routes in this mode: production answers /blog with error-pages/404.html,');
    line('while vite preview falls back to the landing for any unknown path');
  }
  process.exit(run('npx', ['vite', 'preview', '--port', port, '--strictPort', '--host', '127.0.0.1'], { cwd: REPO_ROOT }));
}
