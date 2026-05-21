#!/usr/bin/env node
/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 *
 * Reads `.lighthouseci/` output (multiple runs per URL) and emits a
 * markdown summary to stdout. Used by the lighthouse-ci CI job to post
 * a Lighthouse scorecard comment on every PR.
 */

import { readdirSync,readFileSync } from 'node:fs';
import { join } from 'node:path';

const LHCI_DIR = '.lighthouseci';
const COMMENT_MARKER = '<!-- lighthouse-ci-comment -->';

const median = (xs) => {
  const sorted = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

const formatScore = (s) => (s === null || s === undefined ? '—' : Math.round(s * 100));
const formatMs   = (n) => (Number.isFinite(n) ? `${Math.round(n)}ms` : '—');
const formatCls  = (n) => (Number.isFinite(n) ? n.toFixed(3) : '—');

const pathFromUrl = (url) => {
  try {
    return new URL(url).pathname;
  } catch {
    return url;
  }
};

const CATEGORIES = [
  ['performance',    'Performance'],
  ['accessibility',  'Accessibility'],
  ['best-practices', 'Best Practices'],
  ['seo',            'SEO'],
];

const METRICS = [
  ['largest-contentful-paint', 'LCP', formatMs],
  ['cumulative-layout-shift',  'CLS', formatCls],
  ['total-blocking-time',      'TBT', formatMs],
  ['first-contentful-paint',   'FCP', formatMs],
];

let lhrFiles = [];
let links = {};
try {
  lhrFiles = readdirSync(LHCI_DIR).filter((f) => f.startsWith('lhr-') && f.endsWith('.json'));
} catch {
  /* `.lighthouseci/` missing — lhci probably crashed before writing reports. */
}
try {
  links = JSON.parse(readFileSync(join(LHCI_DIR, 'links.json'), 'utf8'));
} catch {
  /* `links.json` missing — public report upload likely failed; continue without URLs. */
}

if (lhrFiles.length === 0) {
  process.stdout.write(
    `${COMMENT_MARKER}\n## Lighthouse CI\n\n` +
    '_Lighthouse CI did not produce any reports. Check the workflow logs to diagnose._\n',
  );
  process.exit(0);
}

const grouped = new Map();
for (const file of lhrFiles) {
  const lhr = JSON.parse(readFileSync(join(LHCI_DIR, file), 'utf8'));
  const url = lhr.finalUrl || lhr.requestedUrl;
  if (!grouped.has(url)) {
    grouped.set(url, []);
  }
  grouped.get(url).push(lhr);
}

const urls = [...grouped.keys()].sort();

let body = `${COMMENT_MARKER}\n## Lighthouse CI\n\n`;

const header = ['Category', ...urls.map((u) => `\`${pathFromUrl(u)}\``)].join(' | ');
const sep    = ['---', ...urls.map(() => ':---:')].join(' | ');
body += `| ${header} |\n| ${sep} |\n`;

for (const [id, label] of CATEGORIES) {
  const row = [label];
  for (const url of urls) {
    const runs = grouped.get(url);
    const scores = runs.map((r) => r.categories[id]?.score).filter((s) => s !== null && s !== undefined);
    row.push(scores.length ? String(formatScore(median(scores))) : '—');
  }
  body += `| ${row.join(' | ')} |\n`;
}

body += '\n**Core metrics (median):**\n\n';
const metricHeader = ['Metric', ...urls.map((u) => `\`${pathFromUrl(u)}\``)].join(' | ');
const metricSep    = ['---', ...urls.map(() => ':---:')].join(' | ');
body += `| ${metricHeader} |\n| ${metricSep} |\n`;
for (const [id, label, fmt] of METRICS) {
  const row = [label];
  for (const url of urls) {
    const runs = grouped.get(url);
    const values = runs.map((r) => r.audits[id]?.numericValue).filter((v) => Number.isFinite(v));
    row.push(values.length ? fmt(median(values)) : '—');
  }
  body += `| ${row.join(' | ')} |\n`;
}

body += '\n**Full reports:**\n';
for (const url of urls) {
  const reportUrl = links[url];
  if (reportUrl) {
    body += `- [\`${pathFromUrl(url)}\`](${reportUrl})\n`;
  } else {
    body += `- \`${pathFromUrl(url)}\` _(report URL unavailable)_\n`;
  }
}

body += '\n<sub>Median of 3 runs · desktop preset · auto-updated each push.</sub>\n';

process.stdout.write(body);
