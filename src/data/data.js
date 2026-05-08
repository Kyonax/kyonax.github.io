/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 *
 * Application-wide data constants. Migrated from
 * kyo-web-online-old/src/app/constants/Data.js (CommonJS) to ESM.
 *
 * Cleanups vs legacy:
 *   - SUPPORTED_LANGUAGES dropped 'fr' (no French translations authored).
 *     Re-add when content lands in src/data/snippets.js.
 *   - CUSTOM_COMPONENT removed — it referenced the deleted class-scheduler
 *     and blast-image web-component names from the legacy WC architecture.
 */

export const APP_NAME        = "Kyo's Personal Website";
export const APP_VERSION     = '2.0.0-vue-migration';
export const DEFAULT_LANGUAGE = 'en';
export const MAX_UPLOAD_SIZE = 10 * 1024 * 1024;
export const SUPPORTED_LANGUAGES = ['en', 'es'];

export const AUTHOR_INFO = {
  name:  'Cristian Moreno (Kyonax)',
  email: 'support@kyo.wtf',
};

export const SEO = {
  description:
    'Kyonax, con +7 años de experiencia, crea sitios únicos y futuristas. ' +
    'Transforma tu idea en una experiencia digital impactante. ' +
    '¡Da click ahora y lleva tu marca al siguiente nivel!',
  keywords: ['KYO-T', 'kyo', 'kyonax', 'kyonax_on_tech', 'kyo-wtf', '京'],
  ogTitle:
    'Fast. Functional. Futuristic. Web Development by Cristian D. Moreno',
  twitterTitle:
    'Fast. Functional. Futuristic. Web Development by Cristian D. Moreno',
  title: "I'm Kyo",
  websiteBanner: 'assets/seo_banner.webp',
  websiteUrl: 'https://kyonax.github.io/kyo-web-online/',
};

export const THEME_SETTINGS = {
  color: '#ffffff',
  msApplicationTileColor: '#ffffff',
  primaryColor: '#ff5733',
  secondaryColor: '#4a90e2',
  backgroundColor: '#f4f4f4',
};

export const FAVICON = {
  path: 'src/assets/favicon.png',
  dest: 'dist/favicons',
  grunt: {
    path: '/',
    appName: 'Kyo Web Online',
    appShortName: 'Kyo',
    appDescription: 'Cristian Moreno (Kyonax)',
    developerName: 'Cristian Moreno',
    developerURL: 'https://kyonax.github.io/kyo-web-online/',
    dir: 'auto',
    url: 'https://kyonax.github.io/kyo-web-online/',
    display: 'standalone',
    orientation: 'any',
    start_url: '/?homescreen=1',
    version: 1.0,
    logging: false,
    icons: {
      android: true,
      appleIcon: true,
      appleStartup: false,
      coast: false,
      favicons: true,
      firefox: true,
      windows: true,
      yandex: false,
    },
  },
};

export const SITE_URL   = 'https://kyonax.github.io/kyo-web-online/';
export const SITE_TITLE = "I'm Kyo";
export const APP_DESCRIPTION =
  'Kyonax, con +7 años de experiencia, crea sitios únicos y futuristas. ' +
  'Transforma tu idea en una experiencia digital impactante. ' +
  '¡Da click ahora y lleva tu marca al siguiente nivel!';

export const CV_BUTTON = {
  EN_ID: 'download-en',
  ES_ID: 'download-es',
};

/* iconGlyph values are Nerd Font (Devicons / Font Awesome) PUA codepoints
   stored as \u escape sequences. Empty string falls back to a 2-letter abbr
   inside tech-stack.vue / skills.vue. */
export const TECHNOLOGIES = [
  { id: 'html',    name: { en: 'HTML5',          es: 'HTML5'          }, iconGlyph: '', iconClass: '' },
  { id: 'css',     name: { en: 'CSS / CSS3',     es: 'CSS / CSS3'     }, iconGlyph: '', iconClass: '' },
  { id: 'scss',    name: { en: 'SCSS / SASS',    es: 'SCSS / SASS'    }, iconGlyph: '', iconClass: '' },
  { id: 'js',      name: { en: 'JavaScript',     es: 'JavaScript'     }, iconGlyph: '', iconClass: '' },
  { id: 'ts',      name: { en: 'TypeScript',     es: 'TypeScript'     }, iconGlyph: '', iconClass: '' },
  { id: 'php',     name: { en: 'PHP',            es: 'PHP'            }, iconGlyph: '', iconClass: '' },
  { id: 'python',  name: { en: 'Python',         es: 'Python'         }, iconGlyph: '', iconClass: '' },
  { id: 'react',   name: { en: 'React',          es: 'React'          }, iconGlyph: '', iconClass: '' },
  { id: 'next',    name: { en: 'Next.js',        es: 'Next.js'        }, iconGlyph: '',       iconClass: '' },
  { id: 'vue',     name: { en: 'Vue.js',         es: 'Vue.js'         }, iconGlyph: '﵂', iconClass: '' },
  { id: 'symfony', name: { en: 'Symfony (PHP)',  es: 'Symfony (PHP)'  }, iconGlyph: '', iconClass: '' },
  { id: 'node',    name: { en: 'Node.js',        es: 'Node.js'        }, iconGlyph: '', iconClass: '' },
  { id: 'express', name: { en: 'Express.js',     es: 'Express.js'     }, iconGlyph: '', iconClass: '' },
  { id: 'docker',  name: { en: 'Docker',         es: 'Docker'         }, iconGlyph: '', iconClass: '' },
  { id: 'git',     name: { en: 'Git',            es: 'Git'            }, iconGlyph: '', iconClass: '' },
  { id: 'aws',     name: { en: 'AWS (Cloud)',    es: 'AWS (Nube)'     }, iconGlyph: '', iconClass: '' },
  { id: 'jest',    name: { en: 'Jest (Testing)', es: 'Jest (Pruebas)' }, iconGlyph: '',       iconClass: '' },
  /* The five entries below ship via BrandIcon (SVGs in src/assets/brands/).
     iconGlyph stays empty so the dispatch in skills.vue uses the SVG path
     for these tech IDs. */
  { id: 'vite',          name: { en: 'Vite',            es: 'Vite'            }, iconGlyph: '', iconClass: '' },
  { id: 'nest',          name: { en: 'Nest.js',         es: 'Nest.js'         }, iconGlyph: '', iconClass: '' },
  { id: 'postgresql',    name: { en: 'PostgreSQL',      es: 'PostgreSQL'      }, iconGlyph: '', iconClass: '' },
  { id: 'mongodb',       name: { en: 'MongoDB',         es: 'MongoDB'         }, iconGlyph: '', iconClass: '' },
  { id: 'githubactions', name: { en: 'GitHub Actions',  es: 'GitHub Actions'  }, iconGlyph: '', iconClass: '' },
];
