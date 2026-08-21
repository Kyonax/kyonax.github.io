#!/usr/bin/env node
/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 *
 * check-browser-support.mjs — the cross-browser gate. Five checks against the
 * SIGNED browserslist floor (scripts/targets.lock.txt):
 *
 *   1. query-drift    resolved browserslist == committed targets.lock.txt
 *   2. data-rot       caniuse data stamped in the lock is < 6 months old
 *   3. css-registry   no dist/ CSS feature above the floor outside @supports
 *   4. js-registry    no dist/ JS builtin above the floor (Vue's inert
 *                     reactive-array wrappers are allowlisted by exact shape)
 *   5. target-honesty vite build.target derives from browserslist, never es20xx
 *
 * Registry min-versions come from MDN browser-compat-data 8.0.12 — the registry
 * doubles as the list of modern features this site is ALLOWED to ship unguarded.
 *
 * Run: node scripts/check-browser-support.mjs
 *      node scripts/check-browser-support.mjs --write-lock   (regenerate fixture)
 */

import { existsSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import browserslist from 'browserslist';

import { exitWith, fail, head, line, ok, read, REPO_ROOT, warn } from './_lib.mjs';

const LOCK = join(REPO_ROOT, 'scripts/targets.lock.txt');
const DIST = join(REPO_ROOT, 'dist/assets');
const VITE = join(REPO_ROOT, 'vite.config.js');

const failures = [];
head('check-browser-support — the signed floor is the law');

/* ------------------------------------------------------------------ resolve */
const resolved = browserslist(undefined, { path: REPO_ROOT });

if (process.argv.includes('--write-lock')) {
  const query = JSON.parse(read(join(REPO_ROOT, 'package.json'))).browserslist.join(', ');
  const today = new Date().toISOString().slice(0, 10);
  const caniuse = JSON.parse(read(join(REPO_ROOT, 'node_modules/caniuse-lite/package.json'))).version;
  const bl = JSON.parse(read(join(REPO_ROOT, 'node_modules/browserslist/package.json'))).version;
  writeFileSync(LOCK, [
    '# targets.lock.txt — resolved browserslist targets (the SIGNED audience floor).',
    `# query: ${query}`,
    `# generated: ${today} · caniuse-lite ${caniuse} · browserslist ${bl}`,
    '# regenerate: npx update-browserslist-db@latest && node scripts/check-browser-support.mjs --write-lock',
    ...resolved,
    '',
  ].join('\n'));
  ok(`targets.lock.txt regenerated — ${resolved.length} targets`);
  process.exit(0);
}

/* The floor per engine, from the resolution. ios_saf lowers the safari floor. */
const floor = {};
for (const t of resolved) {
  const [agent, ver] = t.split(' ');
  const num = Number.parseFloat(ver);
  const eng = agent === 'ios_saf' ? 'safari' : agent;
  if (['chrome', 'firefox', 'safari'].includes(eng) && Number.isFinite(num)) {
    floor[eng] = Math.min(floor[eng] ?? Infinity, num);
  }
}

/* ------------------------------------------------- 1 · query drift */
if (!existsSync(LOCK)) {
  failures.push('targets.lock.txt missing');
  fail('query-drift — scripts/targets.lock.txt does not exist (run --write-lock)');
} else {
  const locked = read(LOCK).split('\n').filter((l) => l.trim() && !l.startsWith('#'));
  const same = locked.length === resolved.length && locked.every((l, i) => l === resolved[i]);
  if (same) {
    ok(`query-drift — resolution matches the lock (${resolved.length} targets; floor chrome ${floor.chrome} · firefox ${floor.firefox} · safari ${floor.safari})`);
  } else {
    failures.push('query drift');
    fail('query-drift — resolved browserslist no longer matches targets.lock.txt');
    line('re-sign the floor: review the diff, then node scripts/check-browser-support.mjs --write-lock');
  }
}

/* ------------------------------------------------- 2 · data rot */
const stamp = existsSync(LOCK) && read(LOCK).match(/^# generated: (\d{4}-\d{2}-\d{2})/m);
if (!stamp) {
  failures.push('no generated stamp');
  fail('data-rot — targets.lock.txt carries no "# generated: YYYY-MM-DD" stamp');
} else {
  const ageDays = Math.floor((Date.now() - Date.parse(stamp[1])) / 86400000);
  if (ageDays > 183) {
    failures.push('caniuse data stale');
    fail(`data-rot — floor data is ${ageDays} days old (limit 183): npx update-browserslist-db@latest && --write-lock`);
  } else {
    ok(`data-rot — floor data is ${ageDays} days old (limit 183)`);
  }
}

/* ------------------------------------------------- 3 · css registry */
/* [regex, label, {chrome, firefox, safari}] — BCD 8.0.12 first-full-support. */
const CSS_REGISTRY = [
  [/(?<!ok)(?<!-)\blab\(/g, 'lab()', { chrome: 111, firefox: 113, safari: 15 }],
  [/(?<!ok)\blch\(/g, 'lch()', { chrome: 111, firefox: 113, safari: 15 }],
  [/oklch\(/g, 'oklch()', { chrome: 111, firefox: 113, safari: 15.4 }],
  [/oklab\(/g, 'oklab()', { chrome: 111, firefox: 113, safari: 15.4 }],
  [/color-mix\(/g, 'color-mix()', { chrome: 111, firefox: 113, safari: 16.2 }],
  [/(?<![-a-z])color\(/g, 'color()', { chrome: 111, firefox: 113, safari: 15 }],
  [/(?:rgb|hsl|hwb|lab|lch|oklab|oklch|color)\(\s*from\s/g, 'relative color (from)', { chrome: 131, firefox: 133, safari: 18 }],
  [/:has\(/g, ':has()', { chrome: 105, firefox: 121, safari: 15.4 }],
  [/[\d.](?:dvh|dvw|svh|svw|lvh|lvw)\b/g, 'dynamic viewport units', { chrome: 108, firefox: 101, safari: 15.4 }],
  [/@container/g, '@container', { chrome: 105, firefox: 110, safari: 16 }],
  [/@starting-style/g, '@starting-style', { chrome: 117, firefox: 129, safari: 17.5 }],
  [/text-wrap\s*:/g, 'text-wrap', { chrome: 114, firefox: 121, safari: 17.5 }],
  [/@view-transition/g, '@view-transition', { chrome: 126, firefox: Infinity, safari: 18.2 }],
];
/* At-rules that no-op harmlessly where unsupported — allowed above the floor. */
const PROGRESSIVE_OK = new Set(['@view-transition']);

/* Ranges of the file covered by an @supports block (guarded = allowed). */
function supportsRanges(css) {
  const ranges = [];
  const re = /@supports[^{]*\{/g;
  let m;
  while ((m = re.exec(css)) !== null) {
    let depth = 1;
    let i = re.lastIndex;
    while (i < css.length && depth > 0) {
      if (css[i] === '{') {
        depth += 1;
      } else if (css[i] === '}') {
        depth -= 1;
      }
      i += 1;
    }
    ranges.push([m.index, i]);
  }
  return ranges;
}
const aboveFloor = (min) =>
  ['chrome', 'firefox', 'safari'].filter((e) => floor[e] !== undefined && min[e] > floor[e]);

if (!existsSync(DIST)) {
  warn('css/js registries — dist/assets missing (run a build first); scans skipped');
} else {
  const cssFiles = readdirSync(DIST).filter((f) => f.endsWith('.css'));
  let cssHits = 0;
  for (const f of cssFiles) {
    const css = read(join(DIST, f));
    const guarded = supportsRanges(css);
    for (const [re, label, min] of CSS_REGISTRY) {
      const losers = aboveFloor(min);
      if (losers.length === 0 || PROGRESSIVE_OK.has(label)) {
        continue;
      }
      re.lastIndex = 0;
      let m;
      while ((m = re.exec(css)) !== null) {
        if (guarded.some(([a, b]) => m.index >= a && m.index < b)) {
          continue;
        }
        cssHits += 1;
        failures.push(`css ${label}`);
        fail(`css-registry — ${label} in ${f} is unguarded, and ${losers.map((e) => `${e} ${floor[e]}`).join(' + ')} in the signed floor cannot render it`);
        break;
      }
    }
  }
  if (cssHits === 0) {
    ok(`css-registry — ${cssFiles.length} files scanned, nothing above the floor unguarded`);
  }

  /* --------------------------------------------- 4 · js registry */
  /* Vue 3.5 defines reactive-array wrappers (`toSorted(e){return Xn(this).toSorted(e)`)
     that are inert unless app code calls them — strip that exact shape first. */
  const WRAPPER = /\b(at|findLast|findLastIndex|toSorted|toReversed|toSpliced)\(([$\w,\s.]*)\)\s*\{\s*return\s+[$\w]+\(this\)\.\1\(/g;
  const JS_REGISTRY = [
    [/\.at\(/g, 'Array/String .at()', { chrome: 92, firefox: 90, safari: 15.4 }],
    [/\.findLast\(/g, '.findLast()', { chrome: 97, firefox: 104, safari: 15.4 }],
    [/\.findLastIndex\(/g, '.findLastIndex()', { chrome: 97, firefox: 104, safari: 15.4 }],
    [/\.toSorted\(/g, '.toSorted()', { chrome: 110, firefox: 115, safari: 16 }],
    [/\.toReversed\(/g, '.toReversed()', { chrome: 110, firefox: 115, safari: 16 }],
    [/\.toSpliced\(/g, '.toSpliced()', { chrome: 110, firefox: 115, safari: 16 }],
    [/Array\.fromAsync/g, 'Array.fromAsync', { chrome: 121, firefox: 115, safari: 16.4 }],
    [/(?:Object|Map)\.groupBy/g, 'groupBy', { chrome: 117, firefox: 119, safari: 17.4 }],
    [/Promise\.withResolvers/g, 'Promise.withResolvers', { chrome: 119, firefox: 121, safari: 17.4 }],
    [/structuredClone/g, 'structuredClone', { chrome: 98, firefox: 94, safari: 15.4 }],
    [/Object\.hasOwn/g, 'Object.hasOwn', { chrome: 93, firefox: 92, safari: 15.4 }],
    [/\.(?:union|intersection|difference|symmetricDifference|isSubsetOf|isSupersetOf|isDisjointFrom)\(/g, 'Set methods', { chrome: 122, firefox: 127, safari: 17 }],
  ];
  const jsFiles = readdirSync(DIST).filter((f) => f.endsWith('.js'));
  let jsHits = 0;
  for (const f of jsFiles) {
    const js = read(join(DIST, f)).replace(WRAPPER, '');
    for (const [re, label, min] of JS_REGISTRY) {
      const losers = aboveFloor(min);
      if (losers.length === 0) {
        continue;
      }
      re.lastIndex = 0;
      if (re.test(js)) {
        jsHits += 1;
        failures.push(`js ${label}`);
        fail(`js-registry — ${label} in ${f}, and ${losers.map((e) => `${e} ${floor[e]}`).join(' + ')} in the signed floor cannot run it`);
      }
    }
  }
  if (jsHits === 0) {
    ok(`js-registry — ${jsFiles.length} files scanned (Vue wrapper shape allowlisted), nothing above the floor`);
  }
}

/* ------------------------------------------------- 5 · target honesty */
const vite = read(VITE);
if (/target:\s*['"]es20\d{2}['"]/.test(vite)) {
  failures.push('hardcoded es20xx');
  fail('target-honesty — vite.config.js hardcodes an es20xx build.target; derive it from browserslist');
} else if (!/browserslistToEsbuild\(\)/.test(vite)) {
  failures.push('no browserslist-derived target');
  fail('target-honesty — vite.config.js build.target is not browserslistToEsbuild()');
} else {
  ok('target-honesty — build.target derives from the signed browserslist floor');
}

exitWith({ failures, name: 'check-browser-support' });
