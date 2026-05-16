/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 *
 * Locale at boot is derived from the URL pathname. localStorage and
 * navigator.language are consulted only by the pre-hydration redirect
 * script in index.html — never here. Keeps SSR and first-client-paint
 * identical (no hydration mismatch).
 */

export const STORAGE_KEY = 'kyo:lang';
