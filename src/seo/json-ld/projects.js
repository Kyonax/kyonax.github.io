/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 *
 * SoftwareApplication nodes for open-source projects with public URLs.
 * Only projects with a verified public URL are included; client work and
 * unreleased sites are intentionally omitted to keep structured data accurate.
 *
 * Nodes are added to the main @graph in index.js. Person.hasCreatedWork
 * in person.js references PROJECT_IDS so Google can link author → works.
 */

import { SITE_ORIGIN } from '@data/data';

import { PERSON_ID } from './identifiers';

const _gpl2 = 'https://spdx.org/licenses/GPL-2.0-only.html';

const _lang = (name) => ({ '@type': 'ComputerLanguage', name });

const _project = (slug, fields) => ({
  '@type': 'SoftwareApplication',
  '@id': `${SITE_ORIGIN}/#project-${slug}`,
  author: { '@id': PERSON_ID },
  license: _gpl2,
  operatingSystem: 'Cross-platform',
  ...fields,
});

const PROJECTS_SCHEMA = [
  _project('reckit', {
    name: 'RECKIT',
    alternateName: 'Realtime Edit-free Capture Kyonax Integrated Toolkit',
    description: 'Realtime OBS capture toolkit built with Vue 3 and Vite. Handles scenes, overlays, and recording automation for multi-brand technical content creation.',
    sameAs: 'https://github.com/kyonax/reckit',
    applicationCategory: 'MultimediaApplication',
    programmingLanguage: [_lang('JavaScript'), _lang('Vue.js')],
    softwareVersion: 'v0.3.0',
  }),
  _project('webcam2ascii', {
    name: 'webcam2ascii',
    description: 'Real-time ASCII webcam filter built in Rust with GPU compute shaders. Converts a live webcam feed into ASCII art for use as an OBS filter.',
    sameAs: 'https://github.com/kyonax/webcam2ascii',
    applicationCategory: 'MultimediaApplication',
    programmingLanguage: [_lang('Rust')],
    softwareVersion: 'v0.1.0',
  }),
  _project('org2html', {
    name: 'org2html',
    alternateName: '@kyonax/org2html',
    description: 'Org-mode to HTML static site generator and TypeScript CLI published on npm. Converts Emacs Org-mode files into full static sites or Vue 3 component trees.',
    url: 'https://www.npmjs.com/package/@kyonax/org2html',
    sameAs: 'https://github.com/kyonax/org2html',
    applicationCategory: 'DeveloperApplication',
    programmingLanguage: [_lang('TypeScript'), _lang('JavaScript')],
    softwareVersion: 'v0.1.0',
  }),
  _project('the-invite', {
    name: 'The Invite',
    description: 'Digital wedding invitation web app built with Preact and TypeScript. Delivered as a custom static site for a personal event.',
    sameAs: 'https://github.com/Kyonax/sofia-y-cristhian-se-casan',
    applicationCategory: 'WebApplication',
    programmingLanguage: [_lang('JavaScript'), _lang('TypeScript')],
    softwareVersion: 'v1.0.0',
  }),
];

export const PROJECT_IDS = PROJECTS_SCHEMA.map((p) => ({ '@id': p['@id'] }));

export const buildProjectsJsonLd = () => PROJECTS_SCHEMA;

export default buildProjectsJsonLd;
