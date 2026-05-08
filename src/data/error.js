/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 *
 * Application error messages. Each entry is either a string template or a
 * factory that returns one. Migrated from Error.js (CommonJS) to ESM.
 */

export const ERROR_MSG = {
  IMGs_NOT_LOADED_YET:
    'Images not loaded yet. Initializing image manifest...',

  COMPONENT_ATTRIBUTE_REQUIRED: (attribute_name, component_name) =>
    `Attribute '${attribute_name}' is required on <${component_name}> component.`,

  COMPONENT_ATTRIBUTE_MISSING: (attribute_name) =>
    `Error: '${attribute_name}' attribute is missing.`,

  IMG_NAME_NOT_FOUND: (image_name) =>
    `Image with name "${image_name}" not found.`,
};

export default ERROR_MSG;
