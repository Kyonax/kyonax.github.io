/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 */

const _svg_modules = import.meta.glob(
  '@assets/icons/*.svg',
  { eager: true, query: '?raw', import: 'default' },
);

export const APP_ICON_SOURCES = Object.fromEntries(
  Object.entries(_svg_modules).map(([path, raw]) => {
    const id = path.split('/').pop().replace(/\.svg$/, '');
    return [id, raw];
  }),
);

export const APP_ICON_IDS = new Set(Object.keys(APP_ICON_SOURCES));
