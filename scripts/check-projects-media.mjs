#!/usr/bin/env node
/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 *
 * check-projects-media.mjs — validate every entry in PROJECTS[*].images.
 *
 * For each entry:
 *   - string + matches a YouTube URL  → must extract a valid 11-char ID
 *   - string + does NOT match a URL   → must exist in src/assets/projects/
 *   - object with kind: 'youtube'     → id required, must be 11-char.
 *                                       title must include en + es when set.
 *                                       poster (if set) must exist locally.
 *
 * Pure Node — no vite-node bootstrap needed because the loader is plain ESM
 * with no @-alias imports inside the modules we read.
 *
 * Run: node scripts/check-projects-media.mjs
 */

import { existsSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { c, exitWith, head, ok, REPO_ROOT } from './_lib.mjs';

const PROJECTS_PATH = resolve(REPO_ROOT, 'src/data/projects.js');
const YOUTUBE_PATH  = resolve(REPO_ROOT, 'src/data/youtube.js');
const ASSETS_DIR    = resolve(REPO_ROOT, 'src/assets/projects');

const failures = [];
head('check-projects-media — validating PROJECTS[*].images entries');

const { PROJECTS } = await import(pathToFileURL(PROJECTS_PATH).href);
const { classifyMediaEntry } = await import(pathToFileURL(YOUTUBE_PATH).href);

const _local_files = new Set();
if (existsSync(ASSETS_DIR)) {
  for (const f of readdirSync(ASSETS_DIR)) {
    _local_files.add(f);
  }
}

const _basename = (filename) => filename.replace(/\.[^.]+$/, '');

let total_entries = 0;
let youtube_entries = 0;
let image_entries = 0;

for (const [key, project] of Object.entries(PROJECTS)) {
  const arr = project.images || [];
  for (let i = 0; i < arr.length; i++) {
    const entry = arr[i];
    total_entries++;
    const classified = classifyMediaEntry(entry);

    if (!classified) {
      let raw;
      if (entry && typeof entry === 'object' && entry.kind === 'youtube') {
        raw = `object kind=youtube has invalid id "${entry.id}"`;
      } else if (typeof entry === 'string' && /youtu(\.be|be\.com)/i.test(entry)) {
        raw = `cannot extract YouTube ID from "${entry}"`;
      } else {
        raw = `unsupported entry shape (typeof ${typeof entry})`;
      }
      failures.push(`${key}.images[${i}]: ${raw}`);
      continue;
    }

    if (classified.kind === 'youtube') {
      youtube_entries++;
      const raw = classified.raw;
      if (raw && typeof raw === 'object') {
        if (raw.title && typeof raw.title === 'object') {
          if (!raw.title.en || typeof raw.title.en !== 'string') {
            failures.push(`${key}.images[${i}]: title.en missing or non-string`);
          }
          if (!raw.title.es || typeof raw.title.es !== 'string') {
            failures.push(`${key}.images[${i}]: title.es missing or non-string`);
          }
        }
        if (raw.poster) {
          if (typeof raw.poster !== 'string') {
            failures.push(`${key}.images[${i}]: poster must be a filename string`);
          } else if (!_local_files.has(raw.poster)) {
            failures.push(`${key}.images[${i}]: poster file "${raw.poster}" missing in src/assets/projects/`);
          }
        }
        if (raw.published && !/^\d{4}-\d{2}-\d{2}$/.test(raw.published)) {
          failures.push(`${key}.images[${i}]: published="${raw.published}" must be ISO YYYY-MM-DD`);
        }
      }
      continue;
    }

    image_entries++;
    const filename = classified.filename;
    if (!_local_files.has(filename)) {
      failures.push(`${key}.images[${i}]: local file "${filename}" missing in src/assets/projects/`);
      continue;
    }
    const base = _basename(filename);
    if (!_local_files.has(`${base}.webp`)) {
      failures.push(`${key}.images[${i}]: derived WebP "${base}.webp" missing (run convert-images)`);
    }
    if (!_local_files.has(`${base}.avif`)) {
      failures.push(`${key}.images[${i}]: derived AVIF "${base}.avif" missing (run convert-images)`);
    }
  }
}

ok(`scanned ${total_entries} entries across ${Object.keys(PROJECTS).length} projects`);
ok(`  ${c('cyan', image_entries)} local image, ${c('cyan', youtube_entries)} YouTube`);

exitWith({ failures, name: 'check-projects-media' });
