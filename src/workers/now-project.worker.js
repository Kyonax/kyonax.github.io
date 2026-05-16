/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 *
 * Project deadline countdown worker. Parses deadlines once on receipt
 * (Intl.DateTimeFormat is ~50–500 µs per call), then ticks at 1 Hz
 * (display precision is seconds). Accepts `{cmd: 'pause'|'resume'}` to
 * suspend work explicitly when the host tab hides.
 *
 * Wire protocol:
 *   inbound:  {projects: Record<string, Project>, keys: string[]}
 *             {cmd: 'pause'|'resume'}
 *   outbound: Record<string, {label: string, countdown: string, utc_ts: number} | {}>
 *
 * Deadline strings are interpreted in America/Bogota (UTC-5) then converted to UTC.
 */

const TICK_INTERVAL_MS = 1000;
const MS_PER_SECOND = 1000;
const MS_PER_MINUTE = 60 * MS_PER_SECOND;
const MS_PER_HOUR   = 60 * MS_PER_MINUTE;
const MS_PER_DAY    = 24 * MS_PER_HOUR;
const PAD_LENGTH    = 2;

const MONTH_MAP = {
  Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4,  Jun: 5,
  Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
};

let cached_deadlines = [];
let timer_id = null;

const _parse_colombia_time = (ts) => {
  const parts = ts.split(' ');
  if (parts.length !== 4) {
    return Date.now();
  }

  const month = MONTH_MAP[parts[0]];
  const day = parseInt(parts[1], 10);
  const time_parts = parts[2].split(':');
  const year = parseInt(parts[3], 10);

  const hours   = parseInt(time_parts[0], 10);
  const minutes = parseInt(time_parts[1], 10);
  const seconds = parseInt(time_parts[2], 10);

  const utc_guess = Date.UTC(year, month, day, hours, minutes, seconds);

  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false,
  });

  const parts_local = formatter.formatToParts(new Date(utc_guess));
  const date_parts = {};
  for (const part of parts_local) {
    if (part.type !== 'literal') {
      date_parts[part.type] = parseInt(part.value, 10);
    }
  }

  const local_as_utc = Date.UTC(
    date_parts.year,
    date_parts.month - 1,
    date_parts.day,
    date_parts.hour,
    date_parts.minute,
    date_parts.second,
  );

  const offset_ms = utc_guess - local_as_utc;
  return utc_guess + offset_ms;
};

const _format_countdown = (diff) => {
  if (diff <= 0) {
    return null;
  }
  const days    = Math.floor(diff / MS_PER_DAY);
  const hours   = Math.floor((diff % MS_PER_DAY) / MS_PER_HOUR);
  const minutes = Math.floor((diff % MS_PER_HOUR) / MS_PER_MINUTE);
  const seconds = Math.floor((diff % MS_PER_MINUTE) / MS_PER_SECOND);
  const pad = (n) => String(n).padStart(PAD_LENGTH, '0');
  return `${days}D_${pad(hours)}H_${pad(minutes)}M_${pad(seconds)}S`;
};

const _hydrate_cache = (projects, keys) => {
  const now = Date.now();
  cached_deadlines = [];

  for (const key of keys) {
    const project = projects[key];
    if (!project || !project.deadlines) {
      continue;
    }

    let best = null;
    for (const [label, ts] of Object.entries(project.deadlines)) {
      const utc_ts = _parse_colombia_time(ts);
      if (utc_ts <= now) {
        continue;
      }
      if (!best || utc_ts < best.utc_ts) {
        best = {
          key,
          label: label.toUpperCase(),
          utc_ts,
        };
      }
    }

    if (best) {
      cached_deadlines.push(best);
    }
  }
};

const _tick = () => {
  const now = Date.now();
  const out = {};

  for (const { key, label, utc_ts } of cached_deadlines) {
    out[key] = {
      label,
      utc_ts,
      countdown: _format_countdown(utc_ts - now),
    };
  }

  postMessage(out);
};

const _start_timer = () => {
  if (timer_id) {
    return;
  }
  timer_id = setInterval(_tick, TICK_INTERVAL_MS);
  _tick();
};

const _stop_timer = () => {
  if (!timer_id) {
    return;
  }
  clearInterval(timer_id);
  timer_id = null;
};

self.addEventListener('message', (event) => {
  const data = event.data;

  if (data && data.cmd === 'pause') {
    _stop_timer();
    return;
  }

  if (data && data.cmd === 'resume') {
    _start_timer();
    return;
  }

  if (data && data.projects && Array.isArray(data.keys)) {
    _hydrate_cache(data.projects, data.keys);
    _stop_timer();
    _start_timer();
  }
});
