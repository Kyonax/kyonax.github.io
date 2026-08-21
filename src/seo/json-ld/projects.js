/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 *
 * SoftwareApplication nodes for every project the landing RENDERS
 * (NOW showcase + FEATURED chips). ad-w13. Catalog-only stay out.
 *
 * Nodes are added to the main @graph in index.js. Person.hasCreatedWork
 * in person.js references PROJECT_IDS so Google can link author → works.
 */

import { SITE_ORIGIN } from '@data/data';
import { getProjectDescription, PROJECTS } from '@data/projects';

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
  _project('org2html', {
    name: PROJECTS['org2html'].name,
    alternateName: '@kyonax/org2html',
    description: getProjectDescription(PROJECTS.org2html),
    url: 'https://www.npmjs.com/package/@kyonax/org2html',
    sameAs: 'https://github.com/kyonax/org2html',
    applicationCategory: 'DeveloperApplication',
    programmingLanguage: [_lang('TypeScript'), _lang('JavaScript')],
    softwareVersion: 'v0.1.0',
  }),
  _project('kyo-blog', {
    name: PROJECTS['kyo-blog'].name,
    description: getProjectDescription(PROJECTS['kyo-blog']),
    sameAs: 'https://github.com/Kyonax/kyo-blog',
    applicationCategory: 'WebApplication',
    programmingLanguage: [_lang('TypeScript'), _lang('JavaScript')],
    softwareVersion: 'v0.1.0',
  }),
  _project('reckit', {
    name: PROJECTS['reckit'].name,
    alternateName: 'Realtime Edit-free Capture Kyonax Integrated Toolkit',
    description: getProjectDescription(PROJECTS.reckit),
    sameAs: 'https://github.com/kyonax/reckit',
    applicationCategory: 'MultimediaApplication',
    programmingLanguage: [_lang('JavaScript'), _lang('Vue.js')],
    softwareVersion: 'v0.3.0',
  }),
  _project('nano-core', {
    name: PROJECTS['nano-core'].name,
    alternateName: '@ccs-devhub/nano-core',
    description: 'Lightweight free-software modular core for Discord bots, with command injection, a live dashboard, and community-driven modules.',
    url: 'https://nano-core.kyonax.tech',
    sameAs: 'https://github.com/ccs-devhub/nano-core',
    applicationCategory: 'DeveloperApplication',
    programmingLanguage: [_lang('TypeScript'), _lang('JavaScript')],
    softwareVersion: 'v0.6.1',
    license: 'https://spdx.org/licenses/MPL-2.0.html',
  }),
];

export const PROJECT_IDS = PROJECTS_SCHEMA.map((p) => ({ '@id': p['@id'] }));

export const buildProjectsJsonLd = (locale = 'en') => PROJECTS_SCHEMA.map((node) => {
  const slug = node['@id'].split('#project-')[1];
  const catalog = PROJECTS[slug];
  if (!catalog) {
    return node;
  }
  return {
    ...node,
    description: getProjectDescription(catalog, locale),
  };
});

export default buildProjectsJsonLd;
