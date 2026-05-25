/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 */

export const DEFAULT_LANGUAGE = 'en';
export const SUPPORTED_LANGUAGES = ['en', 'es'];

export const AUTHOR_INFO = {
  name:  'Cristian D. Moreno (Kyonax)',
  email: 'work@kyonax.com',
  twitter: '@kyonax_on_tech',
  github:  'https://github.com/Kyonax',
  orcid:   'https://orcid.org/0009-0006-4459-5538',
  linkedin: 'https://www.linkedin.com/in/kyonax/',
};

export const SEO = {
  keywords: [
    'Cristian D. Moreno', 'Kyonax', 'KYO-T', 'kyonax_on_tech', '京',
    'Frontend Engineer', 'Full Stack Developer', 'Full-Stack Engineer', 'Vue 3', 'TypeScript',
    'Web Performance', 'AgileEngine', 'Madison Reed', 'Zerønet Labs',
    'Bogotá Developer', 'Colombia Frontend', 'Senior Software Engineer',
    'Remote Developer', 'LATAM Developer', 'Colombia Software Engineer', 'JavaScript Developer',
  ],
  ogImage:        '/og-banner.jpg',
  ogImageWidth:   1200,
  ogImageHeight:  630,
  ogImageType:    'image/jpeg',
  ogImageAltFallback: 'Cristian D. Moreno (Kyonax), Frontend & Full-Stack Engineer',
};

export const THEME_SETTINGS = {
  themeColor: '#f9cd26',
  msApplicationTileColor: '#000000',
};

export const SITE_ORIGIN = 'https://kyonax.com';

export const LOCALE_URL = Object.freeze({
  en: 'https://kyonax.com/',
  es: 'https://kyonax.com/es',
});

export const X_DEFAULT_URL = 'https://kyonax.com/';

export const TECHNOLOGIES = [
  { id: 'html',    name: { en: 'HTML5',          es: 'HTML5'          }, iconGlyph: '', iconClass: '' },
  { id: 'css',     name: { en: 'CSS / CSS3',     es: 'CSS / CSS3'     }, iconGlyph: '', iconClass: '' },
  { id: 'scss',    name: { en: 'SCSS / SASS',    es: 'SCSS / SASS'    }, iconGlyph: '', iconClass: '' },
  { id: 'js',      name: { en: 'JavaScript',     es: 'JavaScript'     }, iconGlyph: '', iconClass: '' },
  { id: 'ts',      name: { en: 'TypeScript',     es: 'TypeScript'     }, iconGlyph: '', iconClass: '' },
  { id: 'php',     name: { en: 'PHP',            es: 'PHP'            }, iconGlyph: '', iconClass: '' },
  { id: 'python',  name: { en: 'Python',         es: 'Python'         }, iconGlyph: '', iconClass: '' },
  { id: 'react',   name: { en: 'React',          es: 'React'          }, iconGlyph: '', iconClass: '' },
  { id: 'next',    name: { en: 'Next.js',        es: 'Next.js'        }, iconGlyph: '',       iconClass: '' },
  { id: 'vue',     name: { en: 'Vue.js',         es: 'Vue.js'         }, iconGlyph: '﵂', iconClass: '' },
  { id: 'symfony', name: { en: 'Symfony (PHP)',  es: 'Symfony (PHP)'  }, iconGlyph: '', iconClass: '' },
  { id: 'node',    name: { en: 'Node.js',        es: 'Node.js'        }, iconGlyph: '', iconClass: '' },
  { id: 'express', name: { en: 'Express.js',     es: 'Express.js'     }, iconGlyph: '', iconClass: '' },
  { id: 'docker',  name: { en: 'Docker',         es: 'Docker'         }, iconGlyph: '', iconClass: '' },
  { id: 'git',     name: { en: 'Git',            es: 'Git'            }, iconGlyph: '', iconClass: '' },
  { id: 'aws',     name: { en: 'AWS (Cloud)',    es: 'AWS (Nube)'     }, iconGlyph: '', iconClass: '' },
  { id: 'jest',    name: { en: 'Jest (Testing)', es: 'Jest (Pruebas)' }, iconGlyph: '',       iconClass: '' },
  { id: 'vite',          name: { en: 'Vite',            es: 'Vite'            }, iconGlyph: '', iconClass: '' },
  { id: 'nest',          name: { en: 'Nest.js',         es: 'Nest.js'         }, iconGlyph: '', iconClass: '' },
  { id: 'postgresql',    name: { en: 'PostgreSQL',      es: 'PostgreSQL'      }, iconGlyph: '', iconClass: '' },
  { id: 'mongodb',       name: { en: 'MongoDB',         es: 'MongoDB'         }, iconGlyph: '', iconClass: '' },
  { id: 'githubactions', name: { en: 'GitHub Actions',  es: 'GitHub Actions'  }, iconGlyph: '', iconClass: '' },
  { id: 'pug',           name: { en: 'Pug',             es: 'Pug'             }, iconGlyph: '', iconClass: '' },
  { id: 'stylus',        name: { en: 'Stylus',          es: 'Stylus'          }, iconGlyph: '', iconClass: '' },
  { id: 'eslint',        name: { en: 'ESLint',          es: 'ESLint'          }, iconGlyph: '', iconClass: '' },
  { id: 'vitest',        name: { en: 'Vitest',          es: 'Vitest'          }, iconGlyph: '', iconClass: '' },
  { id: 'playwright',    name: { en: 'Playwright',      es: 'Playwright'      }, iconGlyph: '', iconClass: '' },
  { id: 'storybook',     name: { en: 'Storybook',       es: 'Storybook'       }, iconGlyph: '', iconClass: '' },
  { id: 'claude',        name: { en: 'Claude Code',     es: 'Claude Code'     }, iconGlyph: '', iconClass: '' },
  { id: 'openai',        name: { en: 'GPT (OpenAI)',    es: 'GPT (OpenAI)'    }, iconGlyph: '', iconClass: '' },
  { id: 'gemini',        name: { en: 'Gemini',          es: 'Gemini'          }, iconGlyph: '', iconClass: '' },
  { id: 'grok',          name: { en: 'Grok',            es: 'Grok'            }, iconGlyph: '', iconClass: '' },
  { id: 'gptel',         name: { en: 'GPTel (Emacs)',   es: 'GPTel (Emacs)'   }, iconGlyph: '', iconClass: '' },
  { id: 'n8n',           name: { en: 'n8n',             es: 'n8n'             }, iconGlyph: '', iconClass: '' },
  { id: 'bash',          name: { en: 'Bash Scripting',  es: 'Bash Scripting'  }, iconGlyph: '', iconClass: '' },
  { id: 'litellm',       name: { en: 'LiteLLM',         es: 'LiteLLM'         }, iconGlyph: '', iconClass: '' },
  { id: 'ai-workflows',  name: { en: 'AI Workflows',    es: 'Flujos IA'       }, iconGlyph: '', iconClass: '' },
];

export const TECH_BY_ID = Object.freeze(
  Object.fromEntries(TECHNOLOGIES.map((tech) => [tech.id, tech])),
);
