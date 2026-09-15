/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 */

/*
 * snippets-resume.js — the resume page's body copy, read only by
 * views/resume.vue. `resume.download-aria` and `.tooltip` stay in the core
 * because the always-present hud-nav labels its download control with them,
 * and `.meta` / `.breadcrumb` stay for the JSON-LD builders.
 */
export const TRANSLATIONS_RESUME = {
  'en': {
    'kyo-web': {
      'resume': {
        'role-line': 'Senior Software Engineer &#124; Full-Stack (React, Vue, Node.js)',
        'contact': [
          {
            'text': 'Villavicencio/Colombia',
            'href': '',
          },
          {
            'text': '+57 302 253 9479',
            'href': '',
          },
          {
            'text': 'kyonax.corp&#64;gmail.com',
            'href': 'mailto:kyonax.corp{\'@\'}gmail.com',
            'tip': 'Send me an email',
          },
          {
            'text': 'linkedin.com/in/kyonax',
            'href': 'https://www.linkedin.com/in/kyonax/',
            'tip': 'LinkedIn profile',
          },
          {
            'text': 'github.com/Kyonax',
            'href': 'https://github.com/Kyonax',
            'tip': 'GitHub profile',
          },
          {
            'text': 'orcid.org/0009-0006-4459-5538',
            'href': 'https://orcid.org/0009-0006-4459-5538',
            'tip': 'Open Researcher & Contributor ID',
          },
          {
            'text': 'kyonax.com',
            'href': 'https://kyonax.com',
            'tip': 'Personal Site',
          },
        ],
        'entries': {
          'agile-engine': {
            'period': '10/2025 – 05/2026',
            'location': 'Remote - Villavicencio/Colombia',
            'orgs': [
              {
                'name': 'AgileEngine',
                'href': 'https://agileengine.com',
                'tip': 'US software engineering partner',
              },
              {
                'name': 'Madison Reed',
                'href': 'https://www.madison-reed.com/',
                'tip': 'US hair care brand, ~500k monthly visits',
              },
            ],
          },
          'zeronet': {
            'period': '01/2018 – Present',
            'location': 'Remote - Villavicencio/Colombia',
            'orgs': [
              {
                'name': 'Zerønet Labs',
                'href': 'https://github.com/zeronet-labs',
                'tip': 'Full-Stack & AI development studio',
              },
            ],
          },
          'softtek': {
            'period': '11/2023 – 07/2025',
            'location': 'Remote - Villavicencio/Colombia',
            'orgs': [
              {
                'name': 'Softtek',
                'href': 'https://softtek.com',
                'tip': 'LATAM digital transformation firm',
              },
              {
                'name': 'Maritz',
                'href': 'https://www.maritz.com',
                'tip': 'US customer and employee experience company',
              },
            ],
          },
          'cabeza-rota': {
            'period': '10/2020 – 11/2023',
            'location': 'Remote - Villavicencio/Colombia',
            'orgs': [
              {
                'name': 'Cabeza Rota',
                'href': 'https://cabezarota.co',
                'tip': 'Creative and web development studio',
              },
            ],
          },
        },
        'summary-title': 'SUMMARY',
        'education-title': 'EDUCATION',
        'tech-label': 'Additional technologies',
        'signoff': 'Cristian D. Moreno - Resume',
        'summary': 'Specializes in building performant and scalable e-commerce, SaaS, backend applications, and product page projects using <strong>React, Vue.js, and Node.js</strong>, with over <strong>8 years</strong> of full stack and visual design experience. Delivered frontend and backend architectures for Madison Reed’s storefront serving <strong>~500k monthly visits</strong> and Maritz’s self service platform, achieving <strong>20–60%</strong> conversion increases on <strong>more than 20 sites</strong> through performance, SEO/AEO optimization, and strong UI/UX design, with end to end project ownership and implementation of AI agent workflows and automation.',
        'tech': {
          'agile-engine': 'JavaScript, HTML5, CSS3, Lazy Loading, A/B Testing, Segment, GPT, LiteLLM',
          'zeronet': 'Bash, Nuxt.js, HTML5, CSS3, Material UI, Styled Components, Turbopack, Babel, Gulp, Grunt, Vercel, Linux, Lazy Loading, Segment, Sentry, GPT, LLM Orchestration, Figma',
          'softtek': 'JavaScript, Bash, HTML5, CSS3, Code Splitting, Lazy Loading, Figma',
          'cabeza-rota': 'Redux, Recoil, GraphQL, Apollo, WebSockets, Heatmaps, MongoDB',
        },
        'education': [
          {
            'period': '2018 – 2020',
            'school': 'Universidad de Los Llanos',
            'place': 'Villavicencio/Colombia',
            'detail': '<strong>Systems Engineering - Relevant Completed Subjects:</strong> Fundamentals of Programming - Introduction to Systems Engineering - Logical Thinking - Data Structures - Science, Technology, and Development',
          },
          {
            'period': '2021',
            'school': 'Caldas University',
            'place': 'Villavicencio/Colombia',
            'detail': 'Diploma in Basic Programming Skills - Mision TIC 2022',
          },
        ],
        'eyebrow': 'CV // RESUME',
        'download': 'DOWNLOAD PDF',
        'experience-title': 'EXPERIENCE',
      },
    },
  },
  'es': {
    'kyo-web': {
      'resume': {
        'role-line': 'Ingeniero de Software Senior &#124; Full-Stack (React, Vue, Node.js)',
        'contact': [
          {
            'text': 'Villavicencio/Colombia',
            'href': '',
          },
          {
            'text': '+57 302 253 9479',
            'href': '',
          },
          {
            'text': 'kyonax.corp&#64;gmail.com',
            'href': 'mailto:kyonax.corp{\'@\'}gmail.com',
            'tip': 'Envíame un correo',
          },
          {
            'text': 'linkedin.com/in/kyonax',
            'href': 'https://www.linkedin.com/in/kyonax/',
            'tip': 'Perfil de LinkedIn',
          },
          {
            'text': 'github.com/Kyonax',
            'href': 'https://github.com/Kyonax',
            'tip': 'Perfil de GitHub',
          },
          {
            'text': 'orcid.org/0009-0006-4459-5538',
            'href': 'https://orcid.org/0009-0006-4459-5538',
            'tip': 'ID de Investigador y Colaborador',
          },
          {
            'text': 'kyonax.com',
            'href': 'https://kyonax.com',
            'tip': 'Sitio Personal',
          },
        ],
        'entries': {
          'agile-engine': {
            'period': '10/2025 – 05/2026',
            'location': 'Remoto - Villavicencio/Colombia',
            'orgs': [
              {
                'name': 'AgileEngine',
                'href': 'https://agileengine.com',
                'tip': 'Partner de ingeniería de software en EE. UU.',
              },
              {
                'name': 'Madison Reed',
                'href': 'https://www.madison-reed.com/',
                'tip': 'Marca de cuidado capilar en EE. UU., ~500k visitas mensuales',
              },
            ],
          },
          'zeronet': {
            'period': '01/2018 – Presente',
            'location': 'Remoto - Villavicencio/Colombia',
            'orgs': [
              {
                'name': 'Zerønet Labs',
                'href': 'https://github.com/zeronet-labs',
                'tip': 'Estudio Full-Stack e IA',
              },
            ],
          },
          'softtek': {
            'period': '11/2023 – 07/2025',
            'location': 'Remoto - Villavicencio/Colombia',
            'orgs': [
              {
                'name': 'Softtek',
                'href': 'https://softtek.com',
                'tip': 'Firma de transformación digital en LATAM',
              },
              {
                'name': 'Maritz',
                'href': 'https://www.maritz.com',
                'tip': 'Empresa de experiencia de cliente y empleado en EE. UU.',
              },
            ],
          },
          'cabeza-rota': {
            'period': '10/2020 – 11/2023',
            'location': 'Remoto - Villavicencio/Colombia',
            'orgs': [
              {
                'name': 'Cabeza Rota',
                'href': 'https://cabezarota.co',
                'tip': 'Estudio creativo y de desarrollo web',
              },
            ],
          },
        },
        'summary-title': 'RESUMEN',
        'education-title': 'EDUCACIÓN',
        'tech-label': 'Tecnologías adicionales',
        'signoff': 'Cristian D. Moreno - Hoja de Vida',
        'summary': 'Especializado en construir plataformas e-commerce, SaaS, aplicaciones backend y páginas de producto escalables y de alto rendimiento con <strong>React, Vue.js y Node.js</strong>, con más de <strong>8 años</strong> de experiencia en desarrollo full stack y diseño visual. Entregué arquitecturas frontend y backend para la tienda e-commerce de Madison Reed, que atiende <strong>~500k visitas mensuales</strong>, y para la plataforma de autogestión de Maritz, logrando aumentos de conversión del <strong>20–60%</strong> en <strong>más de 20 sitios</strong> mediante optimización de rendimiento y SEO/AEO, un diseño UI/UX sólido y ownership de principio a fin del proyecto, con implementación de flujos de agentes de IA y automatización.',
        'tech': {
          'agile-engine': 'JavaScript, HTML5, CSS3, Lazy Loading, A/B Testing, Segment, GPT, LiteLLM',
          'zeronet': 'Bash, Nuxt.js, HTML5, CSS3, Material UI, Styled Components, Turbopack, Babel, Gulp, Grunt, Vercel, Linux, Lazy Loading, Segment, Sentry, GPT, LLM Orchestration, Figma',
          'softtek': 'JavaScript, Bash, HTML5, CSS3, Code Splitting, Lazy Loading, Figma',
          'cabeza-rota': 'Redux, Recoil, GraphQL, Apollo, WebSockets, Heatmaps, MongoDB',
        },
        'education': [
          {
            'period': '2018 – 2020',
            'school': 'Universidad de Los Llanos',
            'place': 'Villavicencio/Colombia',
            'detail': '<strong>Ingeniería de Sistemas - Asignaturas Relevantes Cursadas:</strong> Fundamentos de Programación - Introducción a la Ingeniería de Sistemas - Pensamiento Lógico - Estructuras de Datos - Ciencia, Tecnología y Desarrollo',
          },
          {
            'period': '2021',
            'school': 'Universidad de Caldas',
            'place': 'Villavicencio/Colombia',
            'detail': 'Diplomado en Habilidades Básicas de Programación - Misión TIC 2022',
          },
        ],
        'eyebrow': 'CV // HOJA DE VIDA',
        'download': 'DESCARGAR PDF',
        'experience-title': 'EXPERIENCIA',
      },
    },
  },
};

export default TRANSLATIONS_RESUME;
