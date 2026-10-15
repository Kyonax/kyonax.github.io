/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 */

/*
 * preview-cache.mjs — `vite preview` answers with production's Cache-Control.
 *
 * WHY. The cache specs (tests/e2e/prefetch.spec.js, "from the HTTP cache") ask
 * whether the document the link warmer fetched, and the CSS and JS it names,
 * come back from the browser's cache on the click. vite preview serves every
 * file `Cache-Control: no-cache`, so under it nothing is ever read back from
 * the cache and the question cannot even be asked. Production answers with the
 * rules in public/.htaccess, so the preview is made to answer with the same.
 *
 * ONLY WHEN ASKED: KYO_PREVIEW_CACHE=prod, which playwright.config.js hands to
 * the preview it starts. Otherwise this is a pass-through and the preview
 * behaves exactly as it always has.
 *
 * READ, NEVER RETYPED. The rules are parsed from .htaccess when the preview
 * starts (every <FilesMatch "re"> block that sets Cache-Control), so the
 * preview cannot drift from the file that ships. As in Apache, a block tests
 * the served file's NAME, a route is served as its directory's index.html,
 * every matching block applies in file order and the last one wins, and a
 * plain `Header set` (no `always`) reaches only a 2xx or a 304.
 *
 * SET WHEN THE STATUS LINE IS WRITTEN. vite preview has two senders: sirv, for
 * the static files, which keeps a Cache-Control already on the response, and
 * its index.html fallback (`/`, and any path with no file), which overwrites
 * it with no-cache. Setting the header inside writeHead wins over both, and it
 * is also the moment Apache's `Header set` applies its own.
 */

import { readFileSync } from 'node:fs';

const BLOCK = /<FilesMatch\s+"([^"]+)"\s*>([\s\S]*?)<\/FilesMatch>/gi;
const SET_CACHE_CONTROL = /^\s*Header\s+(always\s+|)set\s+Cache-Control\s+"([^"]+)"/im;

/* Every Cache-Control rule in an .htaccess text, in file order. */
export const cacheRules = (htaccess) => {
  const rules = [];
  for (const [, pattern, body] of htaccess.matchAll(BLOCK)) {
    const set = body.match(SET_CACHE_CONTROL);
    if (set) {
      rules.push({
        // eslint-disable-next-line security/detect-non-literal-regexp -- the pattern is this repository's own .htaccess, not input
        match: new RegExp(pattern),
        always: Boolean(set[1]),
        value: set[2],
      });
    }
  }
  return rules;
};

/* The name Apache matches a <FilesMatch> against. A path whose last segment
   has no extension is a route, served as its directory's index.html. */
export const servedName = (url) => {
  let path = (url || '/').split(/[?#]/)[0];
  try {
    path = decodeURIComponent(path);
  } catch {
    /* A malformed escape: match the name as it was sent. */
  }
  const last = path.split('/').pop();
  return last.includes('.') ? last : 'index.html';
};

/* The rule that wins for a name — the last one that matches — or null. */
export const ruleFor = (rules, name) => rules
  .reduce((won, rule) => (rule.match.test(name) ? rule : won), null);

const _passThrough = (_req, _res, next) => next();

/* A Vary value with Origin taken out; '' when nothing else is left. */
const withoutOrigin = (value) => String(value || '')
  .split(',')
  .map((field) => field.trim())
  .filter((field) => field && field.toLowerCase() !== 'origin')
  .join(', ');

export const previewCache = (htaccessPath, env = process.env) => {
  if (env.KYO_PREVIEW_CACHE !== 'prod') {
    return _passThrough;
  }
  const rules = cacheRules(readFileSync(htaccessPath, 'utf8'));
  if (rules.length === 0) {
    throw new Error(`KYO_PREVIEW_CACHE=prod, but ${htaccessPath} sets no Cache-Control to mirror`);
  }
  console.log(`preview-cache: answering with the ${rules.length} Cache-Control rule(s) of ${htaccessPath}`);

  return (req, res, next) => {
    const rule = ruleFor(rules, servedName(req.url));
    if (rule) {
      const writeHead = res.writeHead;
      res.writeHead = (status, ...rest) => {
        const success = (status >= 200 && status < 300) || status === 304;
        if (rule.always || success) {
          /* sirv hands its headers to writeHead as an object, and those beat
             anything set before, so its own Cache-Control leaves it first. */
          for (const headers of rest) {
            if (headers && typeof headers === 'object' && !Array.isArray(headers)) {
              for (const key of Object.keys(headers)) {
                if (key.toLowerCase() === 'cache-control') {
                  Reflect.deleteProperty(headers, key);
                } else if (key.toLowerCase() === 'vary') {
                  const vary = withoutOrigin(Reflect.get(headers, key));
                  if (vary) {
                    Reflect.set(headers, key, vary);
                  } else {
                    Reflect.deleteProperty(headers, key);
                  }
                }
              }
            }
          }
          res.setHeader('Cache-Control', rule.value);
          /* PRODUCTION DOES NOT VARY ON ORIGIN. Apache sends Vary:
             Accept-Encoding only (measured in the audit); vite preview's CORS
             layer adds `Vary: Origin`. The link warmer's no-cors prefetch and
             the page's cors module load differ in Origin, and Chromium
             revalidates a cached entry whose Vary it cannot match — so every
             warmed chunk came back as a 304 here, never in production. */
          const vary = withoutOrigin(res.getHeader('Vary'));
          if (vary) {
            res.setHeader('Vary', vary);
          } else {
            res.removeHeader('Vary');
          }
        }
        return writeHead.call(res, status, ...rest);
      };
    }
    next();
  };
};

export default previewCache;
