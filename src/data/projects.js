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
  DONE:        1,
  IN_PROGRESS: 2,
  ON_HOLD:     3,
  ON_TODO:     4,
};

export const DEFAULT_NOW_STATUS = 'IN_PROGRESS';
export const DEFAULT_FEATURED_STATUS = 'LIVE';

export const PROJECTS = {
  'agile-engine': {
    name: 'AGILE ENGINE',
    description: 'CLIENT MADISON REED',
    url: '',
    featured: false,
    status: 'WORKING_ON',
    modality: 'REMOTE',
    started: 'Nov 03 08:00:00 2025',
    images: [],
    stack: [],
  },
  'reckit': {
    name: 'RECKIT',
    description: 'REALTIME CAPTURE TOOLKIT',
    url: 'https://github.com/kyonax/reckit',
    featured: true,
    status: 'ON_HOLD',
    version: 'v0.3.0',
    deadlines: {
      'on hold until': 'May 23 21:00:00 2026',
      'dev release v0.4.0': 'May 29 21:00:00 2026',
      'main release v0.4.0': 'May 31 21:00:00 2026',
    },
    images: ['reckit.jpg'],
    stack: ['vue', 'vite', 'scss', 'eslint', 'js', 'html'],
  },
  'webcam2ascii': {
    name: 'WEBCAM 2 ASCII',
    description: 'REAL-TIME ASCII WEBCAM',
    url: 'https://github.com/kyonax/webcam2ascii',
    featured: true,
    status: 'IN_PROGRESS',
    version: 'v0.1.0',
    deadlines: {
      'on hold until': 'May 24 21:00:00 2026',
      'main release v0.1.0': 'May 25 21:00:00 2026',
    },
    images: ['webcam2ascii.jpg'],
    stack: ['rust', 'wgsl'],
  },
  'org2html': {
    name: 'ORG 2 HTML',
    description: 'ORG-MODE STATIC SITE CLI',
    url: 'https://github.com/kyonax/org2html',
    featured: true,
    status: 'IN_PROGRESS',
    version: 'v0.1.0',
    deadlines: {
      'regression testing': 'May 19 23:00:00 2026',
      'dev plan v0.1.0': 'May 20 10:00:00 2026',
      'dev release v0.1.0': 'May 20 11:00:00 2026',
      'main release v0.1.0': 'May 20 11:30:00 2026',
      'public reveal': 'May 20 12:00:00 2026',
    },
    images: ['org2html.jpg'],
    stack: ['ts', 'js', 'css', 'npm', 'node', 'eslint', 'html', 'vue', 'vitest'],
  },
  'kyo-website': {
    name: 'KYO WEBSITE',
    description: 'PORTFOLIO + IDENTITY HUB',
    url: 'https://github.com/kyonax/kyonax.github.io',
    featured: false,
    status: 'IN_PROGRESS',
    version: 'v0.3.0',
    deadlines: {
      'kyo-blog': 'May 20 09:00:00 2026',
    },
    images: ['kyo-website.jpg'],
    stack: ['js', 'html', 'css', 'scss', 'vue', 'vite', 'vitest', 'eslint', 'node', 'npm', 'githubactions'],
  },
  'zeronet-labs-website': {
    name: 'ZERONET LABS WEBSITE',
    description: 'COMMERCIAL STUDIO LANDING',
    url: '',
    featured: false,
    status: 'ON_HOLD',
    version: 'v0.1.0',
    deadlines: {
      'on hold until': 'Jun 15 07:00:00 2026',
    },
    images: ['zeronet-labs-website.jpg'],
  },
  'cyber-code-syndicate': {
    name: 'CYBER CODE SYNDICATE',
    description: 'OPEN-SOURCE COMMUNITY HUB',
    url: '',
    featured: false,
    status: 'ON_HOLD',
    version: 'v0.1.0',
    deadlines: {
      'on hold until': 'Jul 15 07:00:00 2026',
    },
    images: ['cyber-code-syndicate.jpg'],
  },
};

export default PROJECTS;
