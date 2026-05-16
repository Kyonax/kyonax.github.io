<!--
  Copyright (c) 2026 Cristian D. Moreno — @Kyonax
  Distributed under the terms of GPL-2.0-only — see LICENSE.
-->

<!--
  ________ ______  ______ ____________   ___
 /_  __/ // / __/ / __/ // /  _/ __/ /  / _ \
  / / / _  / _/  _\ \/ _  // // _// /__/ // /
 /_/ /_//_/___/ /___/_//_/___/___/____/____/

 SECURITY.md — Banned patterns, enforcement, reporting
 2026-05-14

 What is never allowed in source, how the rules are enforced
 (ESLint + local precheck + CI grep), and how to report a
 vulnerability privately. GitHub auto-links this file from
 the repo Security tab when the filename is exactly
 SECURITY.md (.org is not detected).

   Banned patterns table
   Enforced by (eslint.config.mjs / scripts/precheck.mjs / ci.yml)
   Reporting a vulnerability
   Out of scope

 Guidelines:
   Filename MUST stay SECURITY.md — GitHub requires .md exact
   GA4 measurement ID is a public identifier, not a secret
   90-day coordinated disclosure window for security reports
-->

# kyo-web-online Security Policy

Maintainer: [Cristian D. Moreno — Kyonax](https://orcid.org/0009-0006-4459-5538)

## Banned patterns

| Pattern | Reason |
|---|---|
| `eval()`, `Function()` | Code injection |
| `innerHTML` assignment | XSS vector |
| `document.write` | XSS vector |
| `setTimeout` / `setInterval` with string args | Implicit eval |
| Hardcoded tokens, secrets, API keys | Credential leak |
| `http://` URLs | Insecure transport |

The Google Analytics measurement ID `G-6M3P3M2HG5` is a public identifier
(transmitted in client-side `gtag()` calls) and is not a secret. Do not
treat it as one.

## Enforced by

- **`eslint.config.mjs`** — `no-eval`, `no-implied-eval`, `no-new-func`,
  `no-script-url`, `eslint-plugin-security`, `no-restricted-syntax`
  (`innerHTML`, `document.write`).
- **`scripts/precheck.mjs`** — local composite gate, runs all seven
  validators (`check-i18n`, `check-i18n-keys`, `check-trans-attrs`,
  `check-color-usage`, `check-aliases`, `check-license-headers`,
  `check-json-ld`).
- **`.github/workflows/ci.yml`** — `security-scan` job greps the working
  tree for every banned pattern on every PR and emits GitHub annotations
  pinned to file and line.

## Reporting a vulnerability

Email **kyonax.corp@gmail.com** with subject prefix `[SECURITY]`.

Do **not** open a public GitHub issue for a security report. Allow 90
days for triage and disclosure before any public write-up. Coordinated
disclosure is preferred.

## Out of scope

- Browser-extension noise injected into pages (extension-id prefixed
  console errors).
- `hostinger.com` shared-host platform-level concerns.
- Third-party transitive-dependency CVEs without a working exploit
  against this site's surface.
