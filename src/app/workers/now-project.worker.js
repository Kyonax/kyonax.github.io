// now-project.worker.js

// Month mapping for date parsing
const MONTH_MAP = {
  Jan: 0,
  Feb: 1,
  Mar: 2,
  Apr: 3,
  May: 4,
  Jun: 5,
  Jul: 6,
  Aug: 7,
  Sep: 8,
  Oct: 9,
  Nov: 10,
  Dec: 11,
};

let timer = null;
let project_data = {};
let project_keys = [];

/**
 * Convert Bogotá time string to UTC timestamp using IANA zone
 * @param {string} ts - Time string (e.g. "May 31 10:00:00 2025")
 * @returns {number} UTC timestamp
 */
const _parse_colombia_time = (ts) => {
  const parts = ts.split(" ");
  if (parts.length !== 4) return Date.now();

  const month = MONTH_MAP[parts[0]];
  const day = parseInt(parts[1], 10);
  const time_parts = parts[2].split(":");
  const year = parseInt(parts[3], 10);

  const hours = parseInt(time_parts[0], 10);
  const minutes = parseInt(time_parts[1], 10);
  const seconds = parseInt(time_parts[2], 10);

  // Treat as UTC first
  const utc_guess = Date.UTC(year, month, day, hours, minutes, seconds);

  // Get Bogotá's local time for that UTC time
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Bogota",
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hour12: false,
  });

  const parts_local = formatter.formatToParts(new Date(utc_guess));
  const date_parts = {};
  for (const part of parts_local) {
    if (part.type !== "literal") {
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

/**
 * Format countdown string
 * @param {number} diff - Time difference in ms
 * @returns {string} Formatted countdown
 */
const _format_countdown = (diff) => {
  if (diff <= 0) return "ENDED";

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  const milliseconds = diff % 1000;

  return `${days}D_${hours.toString().padStart(2, "0")}H_${minutes.toString().padStart(2, "0")}M_${seconds.toString().padStart(2, "0")}S_${milliseconds.toString().padStart(3, "0")}MS`;
};

/**
 * Find closest deadline to current time
 * @param {Object} deadlines - Project deadlines
 * @param {number} now - Current UTC time
 * @returns {Object|null} Closest deadline data
 */
const _find_closest_deadline = (deadlines, now) => {
  let closest = null;
  let min_diff = Infinity;

  Object.entries(deadlines).forEach(([label, ts]) => {
    const utc_ts = _parse_colombia_time(ts);
    const diff = utc_ts - now;

    if (diff > 0 && diff < min_diff) {
      min_diff = diff;
      closest = {
        label: label.toUpperCase(),
        formatted: ts.toUpperCase(),
        countdown: _format_countdown(diff),
        utc_ts,
      };
    }
  });

  return closest;
};

/**
 * Build update data for all projects
 */
const _build_update = () => {
  const now = Date.now();
  const result = {};

  project_keys.forEach((key) => {
    const project = project_data[key];
    if (!project || !project.deadlines) return;

    const closest = _find_closest_deadline(project.deadlines, now);
    result[key] = closest ? { deadline: closest } : {};
  });

  postMessage(result);
};

// Handle incoming messages
onmessage = (e) => {
  project_data = e.data.projects;
  project_keys = e.data.keys;

  if (timer) clearInterval(timer);
  timer = setInterval(_build_update, 250);
  _build_update(); // Initial update
};
