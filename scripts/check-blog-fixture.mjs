#!/usr/bin/env node
/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 *
 * check-blog-fixture.mjs — the kitchen-sink fixture is present and whole.
 *
 * tests/fixtures/blog/ holds "Everything org2html Renders" and its Spanish
 * twin: the one page that exercises every construct the engine emits, which
 * `npm run preview:kitchen-sink` renders on its own and the article specs read.
 * It is the only copy under version control, so losing it is not a warning:
 * this gate runs in precheck, which Shipwright and CI both run, and a deleted
 * or gutted fixture stops the commit.
 *
 * Each post must exist with its title (the title IS the URL: the engine
 * derives the slug from #+TITLE, so a retitle moves every spec's target), and
 * everything it pulls in must resolve inside the fixture: every #+INCLUDE and
 * #+SETUPFILE, and every /blog/media/ image it names.
 *
 * Run: node scripts/check-blog-fixture.mjs [fixture-dir]
 */

import { existsSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';

import { exitWith, fail, head, ok, read, REPO_ROOT } from './_lib.mjs';

const FIXTURE = resolve(process.argv[2] || join(REPO_ROOT, 'tests/fixtures/blog'));

const POSTS = [
  { file: 'content/engineering/everything-org2html-renders.en.org', title: 'Everything org2html Renders' },
  { file: 'content/engineering/todo-lo-que-org2html-renderiza.es.org', title: 'Todo lo que org2html renderiza' },
];

const failures = [];
const miss = (msg) => {
  failures.push(msg);
  fail(msg);
};
const inside = (p) => !relative(FIXTURE, p).startsWith('..');

const shown = relative(REPO_ROOT, FIXTURE);
head(`check-blog-fixture — ${shown.startsWith('..') ? FIXTURE : shown}`);

for (const { file, title } of POSTS) {
  const abs = join(FIXTURE, file);
  if (!existsSync(abs) || statSync(abs).size === 0) {
    miss(`${file}: missing or empty. Restore it from git: it is the only versioned copy`);
    continue;
  }
  const src = read(abs);
  if (!src.split('\n').some((l) => l.trim() === `#+TITLE: ${title}`)) {
    miss(`${file}: #+TITLE is no longer "${title}" (the slug, and every spec's URL, follows the title)`);
  }

  const pulled = [
    ...[...src.matchAll(/^#\+(?:INCLUDE|SETUPFILE):\s*"?([^"\s]+)"?/gim)]
      .map((m) => resolve(dirname(abs), m[1].split('::')[0])),
    ...[...new Set([...src.matchAll(/\/blog\/media\/([\w.-]+\.(?:png|jpe?g|webp|avif|gif|svg))/g)].map((m) => m[1]))]
      .map((name) => join(FIXTURE, 'media', name)),
  ];
  const missing = pulled.filter((p) => !inside(p) || !existsSync(p));
  for (const p of missing) {
    miss(`${file}: references ${relative(FIXTURE, p)}, which is not in the fixture`);
  }
  if (missing.length === 0) {
    ok(`${file} — "${title}", ${pulled.length} include/media reference(s) resolve`);
  }
}

exitWith({ failures, name: 'check-blog-fixture' });
