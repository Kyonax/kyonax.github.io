/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 *
 * Schema notes:
 *   - `version`  — semantic release tag (e.g. `v0.3.0`). Used for projects
 *     with shipped builds.
 *   - `modality` — work modality (REMOTE / HYBRID / ON-SITE). Used for
 *     WORKING_ON client engagements. Mutually exclusive with `version`.
 *   - `deadlines.<label>` is "Mon DD HH:MM:SS YYYY" in Bogotá local time.
 *   - `description` — 2-line card subtitle, also JSON-LD. String or
 *     `{ en, es }`. Sentence case, no em-dashes, SEO-relevant tech + type.
 *
 * Two landing surfaces, two selectors. Do not collapse them:
 *   NOW cards     — SHOWCASE_LIMIT / SHOWCASE_KEYS / getShowcaseMap
 *                   (detailed countdown cards, no pager)
 *   FEATURED chips — `featured: true` / FEATURED_MAX / getFeaturedKeys
 *                   (compact status + name + version; may overlap NOW)
 * A future NOW backend payload is capped at SHOWCASE_LIMIT. Featured is a
 * separate flag, not a leftover of the old carousel.
 */

export const PROJECT_STATUS = {
  WORKING_ON:  { color: 'accent', labelKey: 'kyo-web.landing.projects.status.working-on' },
  DONE:        { color: 'success', labelKey: 'kyo-web.landing.projects.status.done' },
  IN_PROGRESS: { color: 'primary', labelKey: 'kyo-web.landing.projects.status.in-progress' },
  ON_HOLD:     { color: 'warning', labelKey: 'kyo-web.landing.projects.status.on-hold' },
  ON_TODO:     { color: 'secondary', labelKey: 'kyo-web.landing.projects.status.on-todo' },

  LIVE:        { color: 'success', labelKey: 'kyo-web.landing.projects.status.live' },
  DEPRECATED:  { color: 'error', labelKey: 'kyo-web.landing.projects.status.deprecated' },
  UPDATING:    { color: 'primary', labelKey: 'kyo-web.landing.projects.status.updating' },
  RELEASE:     { color: 'secondary', labelKey: 'kyo-web.landing.projects.status.release' },
};

export const NOW_STATUS_PRIORITY = {
  WORKING_ON:  0,
  IN_PROGRESS: 1,
  ON_HOLD:     2,
  ON_TODO:     3,
  DONE:        4,
};

export const DEFAULT_NOW_STATUS = 'IN_PROGRESS';
export const DEFAULT_FEATURED_STATUS = 'LIVE';

/* Hard cap for the NOW card grid and for any future NOW backend payload. */
export const SHOWCASE_LIMIT = 3;
export const FEATURED_MAX = 9;

/* Ordered NOW roster. Keep this list and the image glob in
 * now-projects-section.vue in lockstep. Featured is NOT derived from this. */
export const SHOWCASE_KEYS = Object.freeze([
  'org2html',
  'kyo-blog',
  'reckit',
]);

/* Ordered FEATURED chip roster. Independent of SHOWCASE_KEYS. */
export const FEATURED_KEYS = Object.freeze([
  'org2html',
  'reckit',
  'nano-core',
]);

export const PROJECTS = {
  'kyo-blog': {
    name: 'KYO BLOG',
    description: {
      en: 'Org-mode articles and research site generated with org2html. First public cut waits on the org2html CLI.',
      es: 'Artículos e investigación en Org-mode, generados con org2html. El corte público espera la CLI.',
    },
    url: 'https://github.com/Kyonax/kyo-blog',
    featured: false,
    status: 'IN_PROGRESS',
    version: 'v0.1.0',
    deadlines: {
      'first public cut after org2html': 'Aug 25 18:00:00 2026',
    },
    images: ['kyo-blog.jpg'],
    stack: ['ts', 'js', 'html', 'css', 'vue', 'node'],
  },
  'org2html': {
    name: 'ORG 2 HTML',
    description: {
      en: 'TypeScript CLI on npm that converts Emacs Org-mode files into static HTML for blogs and sites.',
      es: 'CLI en TypeScript en npm que convierte Org-mode a HTML estático para blogs y sitios.',
    },
    url: 'https://github.com/kyonax/org2html',
    featured: true,
    status: 'IN_PROGRESS',
    version: 'v0.1.0',
    deadlines: {
      'cli public release v0.1.0': 'Aug 22 18:00:00 2026',
    },
    images: ['org2html.jpg'],
    stack: ['ts', 'js', 'css', 'node', 'eslint', 'html', 'vue', 'vitest'],
  },
  'reckit': {
    name: 'RECKIT',
    description: {
      en: 'Realtime OBS capture toolkit built with Vue 3 and Vite. Scenes, overlays, and recording at capture time.',
      es: 'Kit de captura en tiempo real para OBS, con Vue 3 y Vite. Escenas, overlays y grabación al capturar.',
    },
    url: 'https://github.com/kyonax/reckit',
    featured: true,
    status: 'IN_PROGRESS',
    version: 'v0.3.0',
    deadlines: {
      'vue capture: release v0.4.0': 'Aug 23 21:00:00 2026',
    },
    images: ['reckit.jpg'],
    stack: ['vue', 'vite', 'scss', 'eslint', 'js', 'html'],
  },
  'nano-core': {
    name: 'NANO CORE',
    description: 'Modular free-software Discord bot core with a live dashboard.',
    url: 'https://github.com/ccs-devhub/nano-core',
    featured: true,
    status: 'IN_PROGRESS',
    version: 'v0.6.1',
    deadlines: {
      'roles refine bank v0.6.2': 'Aug 25 19:00:00 2026',
    },
    images: [],
    stack: ['ts', 'js', 'node'],
  },
  'webcam2ascii': {
    name: 'WEBCAM 2 ASCII',
    description: 'ASCII webcam filter built in Rust with GPU shaders.',
    url: 'https://github.com/kyonax/webcam2ascii',
    featured: false,
    status: 'IN_PROGRESS',
    version: 'v0.1.0',
    deadlines: {
      'rust ascii: release v0.1.0': 'Aug 26 12:00:00 2026',
    },
    images: ['webcam2ascii.jpg'],
    stack: ['rust', 'wgsl'],
  },
  'kyo-website': {
    name: 'KYO WEBSITE',
    description: 'Vue 3 SSG engineer portfolio and identity site.',
    url: 'https://github.com/kyonax/kyonax.github.io',
    featured: false,
    status: 'IN_PROGRESS',
    version: 'v0.3.0',
    deadlines: {
      'blog module: org2html': 'Aug 25 09:00:00 2026',
    },
    images: ['kyo-website.jpg'],
    stack: ['js', 'html', 'css', 'scss', 'vue', 'vite', 'vitest', 'eslint', 'node', 'githubactions'],
  },
  'zeronet-labs-website': {
    name: 'ZERONET LABS WEBSITE',
    description: 'Zerønet Labs commercial studio landing page.',
    url: '',
    featured: false,
    status: 'IN_PROGRESS',
    version: 'v0.1.0',
    deadlines: {
      'studio site: first cut': 'Aug 26 19:00:00 2026',
    },
    images: ['zeronet-labs-website.jpg'],
    stack: ['vue', 'vite', 'scss', 'eslint', 'js'],
  },
  'cyber-code-syndicate': {
    name: 'CYBER CODE SYNDICATE',
    description: 'Open-source developer community platform.',
    url: '',
    featured: false,
    status: 'IN_PROGRESS',
    version: 'v0.1.0',
    deadlines: {
      'community hub: first cut': 'Aug 27 20:00:00 2026',
    },
    images: ['cyber-code-syndicate.jpg'],
    stack: ['vue', 'vite', 'scss', 'eslint', 'js'],
  },
  'agile-engine': {
    name: 'AGILE ENGINE',
    description: 'Vue 3 e-commerce redesign for Madison Reed.',
    milestone: 'madison reed: delivered',
    url: '',
    featured: false,
    status: 'DONE',
    modality: 'REMOTE',
    started: 'Nov 03 08:00:00 2025',
    ended: 'May 30 22:00:00 2026',
    images: [],
    stack: ['vue', 'pug', 'stylus', 'vite', 'vitest', 'playwright', 'eslint', 'express', 'mongodb', 'storybook', 'claude', 'gptel'],
  },
  'the-invite': {
    name: 'THE INVITE',
    description: 'Digital wedding invitation web app built in Preact.',
    milestone: 'preact app: v1.0 delivered',
    url: 'https://github.com/Kyonax/sofia-y-cristhian-se-casan',
    featured: false,
    status: 'DONE',
    version: 'v1.0.0',
    started: 'Dec 21 21:00:00 2025',
    ended: 'Feb 05 20:02:45 2026',
    images: [],
    stack: ['preact', 'js', 'ts'],
  },
};

export const getShowcaseKeys = (catalog = PROJECTS) =>
  SHOWCASE_KEYS.filter((key) => catalog[key]).slice(0, SHOWCASE_LIMIT);

export const getShowcaseMap = (catalog = PROJECTS) => {
  const map = {};
  for (const key of getShowcaseKeys(catalog)) {
    map[key] = catalog[key];
  }
  return map;
};

export const getFeaturedKeys = (catalog = PROJECTS) =>
  FEATURED_KEYS.filter((key) => catalog[key] && catalog[key].featured)
    .slice(0, FEATURED_MAX);

export const getFeaturedMap = (catalog = PROJECTS) => {
  const map = {};
  for (const key of getFeaturedKeys(catalog)) {
    map[key] = catalog[key];
  }
  return map;
};

export const getProjectDescription = (project, locale = 'en') => {
  const value = project?.description;
  if (!value) {
    return '';
  }
  if (typeof value === 'string') {
    return value;
  }
  return value[locale] || value.en || '';
};

export default PROJECTS;
