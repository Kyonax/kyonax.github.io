/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 */

/*
 * snippets.js — the WHOLE translation catalogue, reassembled.
 *
 * *** THIS FILE IS FOR BUILD-TIME TOOLS. APPLICATION CODE MUST NOT IMPORT IT. ***
 *
 * The catalogue used to be one literal in the main bundle, and about 13.5 KB
 * gzipped of it was copy that only an ASYNC view ever reads: the privacy page's
 * body, the resume page's body, and the long project descriptions behind the
 * project modal. Every visitor downloaded all of it to render a landing page
 * that uses none of it. It now lives in four files — `snippets-core.js` plus one
 * slice per async view — and each slice is merged into vue-i18n by the view that
 * reads it.
 *
 * THIS FILE EXISTS SO THAT SPLIT CANNOT HIDE ANYTHING. `check-i18n` resolves its
 * translation source through `loadTranslations()`, which takes the FIRST of
 * `src/data/snippets.js` / `src/i18n/messages.js` that exists — so if the moved
 * copy stopped being reachable from here, those keys would silently leave the
 * locale-parity and raw-html-allowlist gates. Re-merging keeps one file that
 * still means "every key in both locales", and the gates keep their teeth.
 *
 * Importing it from the app would defeat the whole exercise: it statically pulls
 * all four slices, so the deferred copy would land straight back in the main
 * bundle. Import `@data/snippets-core` instead.
 */

import { TRANSLATIONS_CORE } from './snippets-core.js';
import { TRANSLATIONS_PRIVACY } from './snippets-privacy.js';
import { TRANSLATIONS_PROJECTS } from './snippets-projects.js';
import { TRANSLATIONS_RESUME } from './snippets-resume.js';

/* Plain objects only — the catalogue holds strings, objects and arrays, and an
   array is replaced wholesale rather than merged index by index. */
const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

const deepMerge = (target, source) => {
  for (const key of Object.keys(source)) {
    const next = source[key];
    if (isPlainObject(next)) {
      target[key] = deepMerge(isPlainObject(target[key]) ? target[key] : {}, next);
    } else {
      target[key] = next;
    }
  }
  return target;
};

export const TRANSLATIONS = [
  TRANSLATIONS_PRIVACY,
  TRANSLATIONS_RESUME,
  TRANSLATIONS_PROJECTS,
].reduce(deepMerge, structuredClone(TRANSLATIONS_CORE));

export default TRANSLATIONS;
