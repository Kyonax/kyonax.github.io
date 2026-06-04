/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 *
 * Three Review nodes — one per LinkedIn recommendation.
 * reviewBody carries the FULL text for LLM/AEO indexing even when the
 * visible card visually truncates the quote to 5 lines.
 */

import { SITE_ORIGIN } from '@data/data';
import { PERSON_ID } from './identifiers';

const LINKEDIN_RECS_URL = 'https://www.linkedin.com/in/kyonax/details/recommendations/';

/*
 * Declaring LinkedIn as the publisher on each Review node tells crawlers
 * the platform that hosts and validates these recommendations, strengthening
 * Google's trust signal for the review content.
 */
const LINKEDIN_ORG = {
  '@type': 'Organization',
  name:   'LinkedIn',
  url:    'https://www.linkedin.com',
  sameAs: 'https://www.linkedin.com',
};

const _review = ({ id, author_name, author_url, body_en, body_es, date }) => ({
  '@type': 'Review',
  '@id': `${SITE_ORIGIN}/#review-${id}`,
  url:           LINKEDIN_RECS_URL,
  datePublished: date,
  itemReviewed:  { '@id': PERSON_ID },
  publisher:     LINKEDIN_ORG,
  reviewRating:  { '@type': 'Rating', ratingValue: '5', bestRating: '5', worstRating: '1' },
  author: {
    '@type': 'Person',
    name:    author_name,
    url:     author_url,
    sameAs:  author_url,
  },
  reviewBody: { en: body_en, es: body_es },
});

const REVIEWS_DATA = [
  _review({
    id: 'john-montes',
    author_name: 'John C. Montes',
    author_url:  'https://www.linkedin.com/in/johncmontes/',
    date: '2025-07',
    body_en: 'I had the privilege of working alongside Cristian at Softtek on a critical Shopware ecommerce project, where his expertise in Symfony, Vue.js, PHP, and JavaScript was instrumental to our success. As the Senior QA, I deeply valued Cristian\'s technical mastery and collaborative spirit. He consistently delivered clean, testable code that accelerated our testing cycles and minimized issues. His ability to navigate high-pressure scenarios (whether resolving critical bugs, optimizing integrations, or meeting tight deadlines) set him apart. Cristian didn\'t just fix problems; he anticipated them, implementing preventative solutions that elevated our entire project\'s resilience. Cristian seamlessly collaborated with technology teams at Maritz (also Codal and Shopware), aligning technical execution with business goals and exceeding stakeholder expectations. His proactive communication and knack for translating complex requirements into actionable work made him a unifying force across departments. Cristian is more than a skilled developer: he\'s a strategic problem-solver, a reliable teammate, and a catalyst for quality. Any team would thrive with his technical prowess and dedication.',
    body_es: 'Tuve el privilegio de trabajar junto a Cristian en Softtek en un proyecto crítico de e-commerce con Shopware, donde su expertise en Symfony, Vue.js, PHP y JavaScript fue fundamental para nuestro éxito. Como QA Senior, valoré profundamente su dominio técnico y espíritu colaborativo. Entregó consistentemente código limpio y testeable que aceleró nuestros ciclos de pruebas y minimizó los incidentes. Su capacidad para manejar escenarios de alta presión, ya fuera resolviendo bugs críticos, optimizando integraciones o cumpliendo plazos ajustados, lo distinguió del resto. Cristian no solo resolvía problemas, los anticipaba, implementando soluciones preventivas que elevaron la resiliencia del proyecto. Colaboró de forma ejemplar con los equipos de Maritz, Codal y Shopware, alineando la ejecución técnica con los objetivos del negocio y superando las expectativas de los stakeholders. Su comunicación proactiva y su habilidad para traducir requisitos complejos en trabajo concreto lo convirtieron en una fuerza unificadora entre departamentos. Cristian es más que un desarrollador hábil. Es un solucionador de problemas estratégico, un compañero confiable y un catalizador de calidad. Cualquier equipo prosperaría con su destreza técnica y dedicación.',
  }),
  _review({
    id: 'mo-osburn',
    author_name: 'Mo Osburn',
    author_url:  'https://www.linkedin.com/in/mo-osburn-safe%C2%AE-asm-ssm-csm-capm-81bb3089',
    date: '2025-07',
    body_en: 'I had the pleasure of working with Cristian Moreno on a complex eCommerce project for Maritz, where he served as our lead front end developer. Cristian handled challenging front end tasks and resolved difficult bugs with expertise, all while mentoring and coaching new developers on the team. He played a pivotal role in the project\'s success.',
    body_es: 'Tuve el placer de trabajar con Cristian Moreno en un complejo proyecto de e-commerce para Maritz, donde se desempeñó como nuestro desarrollador frontend líder. Cristian manejó tareas frontend complejas y resolvió bugs difíciles con gran destreza, mientras guiaba y capacitaba a los nuevos desarrolladores del equipo. Fue un actor clave en el éxito del proyecto.',
  }),
  _review({
    id: 'diego-yair',
    author_name: 'Diego Yair Hernández Mejía',
    author_url:  'https://www.linkedin.com/in/diego-yair-hernandez-mejia-092154226/',
    date: '2025-06',
    body_en: 'It has been an absolute pleasure working with you over the past year. You are an amazing developer, and I truly appreciate your patience and dedication in introducing me to the project and providing support whenever needed. Your guidance through the challenges we faced together was invaluable, and I am incredibly grateful for the opportunity to collaborate with you. Working with you has been a rewarding and inspiring experience.',
    body_es: 'Ha sido un placer absoluto trabajar contigo durante el último año. Eres un desarrollador increíble, y valoro mucho tu paciencia y dedicación al integrarme al proyecto y brindarme apoyo en todo momento. Tu guía en los desafíos que enfrentamos juntos fue invaluable, y estoy muy agradecido por la oportunidad de colaborar contigo. Trabajar contigo ha sido una experiencia enriquecedora e inspiradora.',
  }),
];

/* Referenced by person.js to build Person.review + Person.aggregateRating */
export const REVIEW_IDS = REVIEWS_DATA.map((r) => ({ '@id': r['@id'] }));

export const buildTestimonialsJsonLd = (locale = 'en') =>
  REVIEWS_DATA.map((r) => ({
    ...r,
    reviewBody: r.reviewBody[locale] || r.reviewBody.en,
  }));
