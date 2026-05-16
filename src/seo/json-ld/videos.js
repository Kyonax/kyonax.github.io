/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 *
 * Emits one VideoObject per YouTube entry across PROJECTS[*].images for the
 * given locale. Required schema.org fields (name, thumbnailUrl, uploadDate)
 * always present. Schema validator at https://validator.schema.org owns the
 * final spec check.
 */

import { PROJECTS } from '@data/projects';
import { classifyMediaEntry, resolveLocalizedTitle } from '@data/youtube';
import { stripHtml } from './sanitize';
import { WEBSITE_ID } from './identifiers';

const DEFAULT_UPLOAD_DATE = '2026-01-01';

const _video_payload = (entry, locale, project) => {
  const classified = classifyMediaEntry(entry);
  if (!classified || classified.kind !== 'youtube') return null;
  const raw = classified.raw;
  const is_object = raw && typeof raw === 'object';
  return {
    id:         classified.id,
    title:      is_object
      ? resolveLocalizedTitle(raw.title, locale, project.name)
      : project.name,
    uploadDate: (is_object && raw.published) || DEFAULT_UPLOAD_DATE,
  };
};

/** Emit one VideoObject per YouTube entry across `PROJECTS[*].images` for the given locale. */
export const buildVideoObjectsJsonLd = ({ locale = 'en' } = {}) => {
  const items = [];
  for (const [key, project] of Object.entries(PROJECTS)) {
    const arr = project.images || [];
    for (const entry of arr) {
      const v = _video_payload(entry, locale, project);
      if (!v) continue;
      items.push({
        '@type':       'VideoObject',
        '@id':         `${WEBSITE_ID.replace(/#website$/, '')}#video-${v.id}-${locale}`,
        name:          v.title,
        description:   stripHtml(project.description || v.title),
        thumbnailUrl:  [
          `https://i.ytimg.com/vi/${v.id}/maxresdefault.jpg`,
          `https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`,
        ],
        uploadDate:    v.uploadDate,
        embedUrl:      `https://www.youtube-nocookie.com/embed/${v.id}`,
        contentUrl:    `https://www.youtube.com/watch?v=${v.id}`,
        isPartOf:      { '@id': WEBSITE_ID },
        inLanguage:    locale,
        keywords:      [project.name, key].filter(Boolean).join(', '),
      });
    }
  }
  return items;
};

export default buildVideoObjectsJsonLd;
