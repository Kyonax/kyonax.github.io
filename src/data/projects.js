/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 *
 * Active and featured projects with deadline timestamps, lifecycle
 * status, and version. Consumed by NowProjectsSection (and the
 * useProjectCountdowns composable for the now-shipping grid).
 *
 * Two surfaces:
 *   - "NOW SHIPPING" — `featured: false`. Status enum:
 *       DONE, IN_PROGRESS, ON_HOLD, ON_TODO. Carries a deadline.
 *       Displayed top-six sorted by status priority, then by closest
 *       deadline within the same status.
 *   - "FEATURED // PORTFOLIO" — `featured: true`. Status enum:
 *       LIVE, DEPRECATED, UPDATING, RELEASE. No countdown displayed.
 *       Top-nine.
 *
 * `version` is a freeform string (e.g. "v1.2.0", "alpha-3"); consumers
 * render it verbatim next to the card name.
 *
 * Format of `deadlines.<label>`: "Mon DD HH:MM:SS YYYY" (Bogotá local
 * time). The worker parses these once per message via Intl.DateTimeFormat.
 */

export const PROJECT_STATUS = {
  /* Now-shipping states (5) */
  WORKING_ON:  { color: 'accent',    labelKey: 'kyo-web.landing.projects.status.working-on' },
  DONE:        { color: 'success',   labelKey: 'kyo-web.landing.projects.status.done' },
  IN_PROGRESS: { color: 'primary',   labelKey: 'kyo-web.landing.projects.status.in-progress' },
  ON_HOLD:     { color: 'warning',   labelKey: 'kyo-web.landing.projects.status.on-hold' },
  ON_TODO:     { color: 'secondary', labelKey: 'kyo-web.landing.projects.status.on-todo' },

  /* Featured states (4) */
  LIVE:        { color: 'success',   labelKey: 'kyo-web.landing.projects.status.live' },
  DEPRECATED:  { color: 'error',     labelKey: 'kyo-web.landing.projects.status.deprecated' },
  UPDATING:    { color: 'primary',   labelKey: 'kyo-web.landing.projects.status.updating' },
  RELEASE:     { color: 'secondary', labelKey: 'kyo-web.landing.projects.status.release' },
};

/* Sort order for the now-shipping grid: WORKING_ON first, ON_TODO last.
   Smaller number = higher priority. WORKING_ON tops the list because it
   represents what's being shipped right now (current employer / active
   contract). */
export const NOW_STATUS_PRIORITY = {
  WORKING_ON:  0,
  DONE:        1,
  IN_PROGRESS: 2,
  ON_HOLD:     3,
  ON_TODO:     4,
};

export const PROJECTS = {
  'agile-engine': {
    name: 'AGILE ENGINE',
    /* `description` overrides the deadline-derived milestone line on
       the card. For WORKING_ON entries this is where the client / scope
       lives; for projects with a `deadlines` map the deadline key is
       used as the fallback. */
    description: 'CLIENT MADISON REED',
    /* Private enterprise repo — leave URL empty so the card renders
       in non-clickable mode with the futuristic alt-text footer. */
    url: '',
    featured: false,
    status: 'WORKING_ON',
    /* The `version` chip is repurposed for WORKING_ON entries as the
       work-modality tag (REMOTE / HYBRID / ON-SITE). */
    version: 'REMOTE',
    /* Count-up start timestamp (Bogotá local time, UTC-5). When the user
       updates this status to DONE (or removes the entry), the card
       drops out of the WORKING_ON tier on the next render. */
    started: 'Nov 03 09:00:00 2024',
  },
  'sofia-married': {
    name: 'THE INVITE S&C',
    url: 'https://github.com/Kyonax/sofia-y-cristhian-se-casan',
    featured: false,
    status: 'IN_PROGRESS',
    version: 'v0.4.0',
    deadlines: {
      'final delivery': 'Aug 30 20:00:00 2026',
    },
  },
  'veyra-organization': {
    name: 'VEYRA ORG LANDING PAGE',
    url: 'https://github.com/veyra-code',
    featured: false,
    status: 'ON_TODO',
    version: 'v0.1.0',
    deadlines: {
      'org launch': 'Jul 20 18:00:00 2026',
    },
  },
  'zeronet-labs': {
    name: 'ZERONET LABS LANDING PAGE',
    url: 'https://github.com/zeronet-labs',
    featured: false,
    status: 'ON_HOLD',
    version: 'v0.2.0',
    deadlines: {
      'public reveal': 'Sep 15 22:00:00 2026',
    },
  },
  'zeronet-platform': {
    name: 'ZERONET LABS',
    url: 'https://github.com/zeronet-labs',
    featured: true,
    status: 'UPDATING',
    version: 'v0.4.0',
  },
  'veyra-project': {
    name: 'VEYRA PROJECT',
    url: 'https://github.com/veyra-code',
    featured: true,
    status: 'RELEASE',
    version: 'v1.0.0',
  },
  'cyber-code-syndicate': {
    name: 'CYBER CODE SYNDICATE',
    url: 'https://github.com/ccs-devhub',
    featured: true,
    status: 'LIVE',
    version: 'v0.3.0',
  },
};

export default PROJECTS;
