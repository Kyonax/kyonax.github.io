/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 *
 * schema.org `description` accepts plain text only — strip every HTML tag
 * and decode the entities that show up in our i18n strings.
 */

const TAG_RE = /<[^>]*>/g;
const ENTITY_DECODE = {
  '&amp;':  '&',
  '&lt;':   '<',
  '&gt;':   '>',
  '&quot;': '"',
  '&#39;':  "'",
  '&nbsp;': ' ',
};

const _decode_numeric = (m, body) => {
  const code = body[0] === 'x' || body[0] === 'X'
    ? Number.parseInt(body.slice(1), 16)
    : Number.parseInt(body, 10);
  return Number.isFinite(code) ? String.fromCodePoint(code) : m;
};

export const stripHtml = (html) => {
  if (typeof html !== 'string') {
    return '';
  }
  const noTags = html.replace(TAG_RE, '');
  return noTags
    .replace(/&#([0-9]+|[xX][0-9a-fA-F]+);/g, _decode_numeric)
    .replace(/&[a-z]+;/gi, (m) => ENTITY_DECODE[m] ?? m)
    .replace(/\s+/g, ' ')
    .trim();
};
