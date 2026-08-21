/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 */

export const DEFAULT_LANGUAGE = 'en';
export const SUPPORTED_LANGUAGES = ['en', 'es'];

/* Identity + contact block. Must stay in lockstep with the contact line of the
   verified CVs (EN 3afb94d4 / ES e7d13e27) and every landed professional profile. */
export const AUTHOR_INFO = {
  name:  'Cristian D. Moreno (Kyonax)',
  email: 'kyonax.corp@gmail.com',
  phone: '+57 302 253 9479',
  twitter: '@kyonax_on_tech',
  github:  'https://github.com/Kyonax',
  orcid:   'https://orcid.org/0009-0006-4459-5538',
  linkedin: 'https://www.linkedin.com/in/kyonax/',
};

export const SEO = {
  keywords: [
    'Cristian D. Moreno', 'Kyonax', 'KYO-T', 'kyonax_on_tech', '京',
    'Frontend Engineer', 'Full Stack Developer', 'Full-Stack Engineer', 'Vue.js', 'TypeScript',
    'Web Performance', 'AgileEngine', 'Madison Reed', 'Zerønet Labs',
    'Bogotá Developer', 'Colombia Frontend', 'Senior Software Engineer',
    'Remote Developer', 'LATAM Developer', 'Colombia Software Engineer', 'JavaScript Developer',
    'Web Developer', 'Full Stack Web Developer', 'Software Developer',
    'Nearshore Developer', 'LATAM Full Stack Developer', 'Hire LATAM Developer',
    'Desarrollador Web', 'Desarrollador Full Stack', 'Programador Web',
    'Desarrollador Web Villavicencio', 'Desarrollador Web Colombia', 'Ingeniero de Software',
  ],
  ogImage:        '/og-banner.jpg',
  /* Resume pages carry their own banner — the landing card shows the portrait
     composite, which says nothing about the CV being the page's content. */
  resumeOgImage: Object.freeze({
    en: '/og-resume-en.jpg',
    es: '/og-resume-es.jpg',
  }),
  ogImageWidth:   1200,
  ogImageHeight:  630,
  ogImageType:    'image/jpeg',
  ogImageAltFallback: 'Cristian D. Moreno (Kyonax), Senior Software Engineer (Full-Stack)',
};

export const THEME_SETTINGS = {
  themeColor: '#f9cd26',
  msApplicationTileColor: '#000000',
};

/* CV PDFs live in public/cv/ so they get STABLE, unhashed URLs. Vite content-hashes
   anything imported from src/assets, and that hash changes on every rebuild — which
   breaks whatever URL Google has indexed. Search engines index PDFs directly, so the
   URL must never move. Referenced by the sitemap; do not rename these files. */
export const CV_URL = Object.freeze({
  en: '/cv/Cristian-Moreno-Senior-Software-Engineer-EN.pdf',
  es: '/cv/Cristian-Moreno-Senior-Software-Engineer-ES.pdf',
});

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
  { id: 'js',      name: { en: 'JavaScript',     es: 'JavaScript'     }, iconGlyph: '', iconClass: '' },
  { id: 'ts',      name: { en: 'TypeScript',     es: 'TypeScript'     }, iconGlyph: '', iconClass: '' },
  { id: 'php',     name: { en: 'PHP',            es: 'PHP'            }, iconGlyph: '', iconClass: '' },
  { id: 'python',  name: { en: 'Python',         es: 'Python'         }, iconGlyph: '', iconClass: '' },
  { id: 'react',   name: { en: 'React',          es: 'React'          }, iconGlyph: '', iconClass: '' },
  { id: 'next',    name: { en: 'Next.js',        es: 'Next.js'        }, iconGlyph: '',       iconClass: '' },
  { id: 'vue',     name: { en: 'Vue.js',         es: 'Vue.js'         }, iconGlyph: '﵂', iconClass: '' },
  { id: 'symfony', name: { en: 'Symfony (PHP)',  es: 'Symfony (PHP)'  }, iconGlyph: '', iconClass: '' },
  { id: 'node',    name: { en: 'Node.js',        es: 'Node.js'        }, iconGlyph: '', iconClass: '' },
  { id: 'express', name: { en: 'Express.js',     es: 'Express.js'     }, iconGlyph: '', iconClass: '' },
  { id: 'docker',  name: { en: 'Docker',         es: 'Docker'         }, iconGlyph: '', iconClass: '' },
  { id: 'git',     name: { en: 'Git',            es: 'Git'            }, iconGlyph: '', iconClass: '' },
  { id: 'aws',     name: { en: 'AWS (Cloud)',    es: 'AWS (Nube)'     }, iconGlyph: '', iconClass: '' },
  { id: 'jest',    name: { en: 'Jest (Testing)', es: 'Jest (Pruebas)' }, iconGlyph: '',       iconClass: '' },
  { id: 'vite',          name: { en: 'Vite',            es: 'Vite'            }, iconGlyph: '', iconClass: '' },
  { id: 'nest',          name: { en: 'NestJS',         es: 'NestJS'         }, iconGlyph: '', iconClass: '' },
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
  { id: 'rust',          name: { en: 'Rust',            es: 'Rust'            }, iconGlyph: '', iconClass: '' },
  { id: 'preact',        name: { en: 'Preact',          es: 'Preact'          }, iconGlyph: '', iconClass: '' },
];

export const TECH_BY_ID = Object.freeze(
  Object.fromEntries(TECHNOLOGIES.map((tech) => [tech.id, tech])),
);

/* Contact section configuration. WARNING: flipping isActivelyLooking to false
   removes the hire-intent copy (status headline, criteria, philosophy) from
   the prerendered HTML — keep it true while open to work. Set whatsappNumber
   to the real number in '573001234567' shape (country code, no + or spaces)
   to reveal the WhatsApp CTA; while it stays 'TODO' the CTA is hidden. */
export const CONTACT_CONFIG = Object.freeze({
  isActivelyLooking: true,
  whatsappNumber:    'TODO',
  bookingUrl:        'https://cal.com/k-cristian/30min', // 'TODO' hides the CTA
});

export const CONTACT_SERVICES = Object.freeze([
  'web-dev',
  'seo',
  'performance',
  'full-stack',
  'consulting',
  'other',
]);

export const CONTACT_CRITERIA_NUMS = Object.freeze(['01', '02', '03']);
