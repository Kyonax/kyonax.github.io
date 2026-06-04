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
 *   - `description` — short sentence-case subtitle shown on the card and
 *     used in JSON-LD. Sentence case, no em-dashes, SEO-relevant tech + type.
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

export const PROJECTS = {
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
  'reckit': {
    name: 'RECKIT',
    description: 'Realtime OBS capture toolkit built with Vue 3 and Vite.',
    url: 'https://github.com/kyonax/reckit',
    featured: true,
    status: 'ON_HOLD',
    version: 'v0.3.0',
    deadlines: {
      'vue capture: paused':         'Jun 20 21:00:00 2026',
      'vue capture: dev build v0.4.0': 'Jun 26 21:00:00 2026',
      'vue capture: release v0.4.0':  'Jun 28 21:00:00 2026',
    },
    images: ['reckit.jpg'],
    stack: ['vue', 'vite', 'scss', 'eslint', 'js', 'html'],
  },
  'webcam2ascii': {
    name: 'WEBCAM 2 ASCII',
    description: 'ASCII webcam filter built in Rust with GPU shaders.',
    url: 'https://github.com/kyonax/webcam2ascii',
    featured: true,
    status: 'ON_HOLD',
    version: 'v0.1.0',
    deadlines: {
      'rust ascii: paused':          'Jun 21 21:00:00 2026',
      'rust ascii: release v0.1.0':  'Jun 22 21:00:00 2026',
    },
    images: ['webcam2ascii.jpg'],
    stack: ['rust', 'wgsl'],
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
  'org2html': {
    name: 'ORG 2 HTML',
    description: 'Org-mode to HTML generator, TypeScript CLI on npm.',
    url: 'https://github.com/kyonax/org2html',
    featured: true,
    status: 'IN_PROGRESS',
    version: 'v0.1.0',
    deadlines: {
      'cli regression tests':       'Jun 18 23:00:00 2026',
      'cli dev plan v0.1.0':        'Jun 19 10:00:00 2026',
      'cli dev build v0.1.0':       'Jun 19 11:00:00 2026',
      'cli public release v0.1.0':  'Jun 19 11:30:00 2026',
      'cli npm launch':             'Jun 20 12:00:00 2026',
    },
    images: ['org2html.jpg'],
    stack: ['ts', 'js', 'css', 'node', 'eslint', 'html', 'vue', 'vitest'],
  },
  'kyo-website': {
    name: 'KYO WEBSITE',
    description: 'Vue 3 SSG engineer portfolio and identity site.',
    url: 'https://github.com/kyonax/kyonax.github.io',
    featured: false,
    status: 'IN_PROGRESS',
    version: 'v0.3.0',
    deadlines: {
      'blog module: org2html': 'Jun 22 09:00:00 2026',
    },
    images: ['kyo-website.jpg'],
    stack: ['js', 'html', 'css', 'scss', 'vue', 'vite', 'vitest', 'eslint', 'node', 'githubactions'],
  },
  'zeronet-labs-website': {
    name: 'ZERONET LABS WEBSITE',
    description: 'Zerønet Labs commercial studio landing page.',
    url: '',
    featured: false,
    status: 'ON_HOLD',
    version: 'v0.1.0',
    deadlines: {
      'studio site: paused': 'Jul 13 07:00:00 2026',
    },
    images: ['zeronet-labs-website.jpg'],
    stack: ['vue', 'vite', 'scss', 'eslint', 'js'],
  },
  'cyber-code-syndicate': {
    name: 'CYBER CODE SYNDICATE',
    description: 'Open-source developer community platform.',
    url: '',
    featured: false,
    status: 'ON_HOLD',
    version: 'v0.1.0',
    deadlines: {
      'community hub: paused': 'Aug 12 07:00:00 2026',
    },
    images: ['cyber-code-syndicate.jpg'],
    stack: ['vue', 'vite', 'scss', 'eslint', 'js'],
  },
};

export default PROJECTS;
