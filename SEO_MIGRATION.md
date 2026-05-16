<!--
  Copyright (c) 2026 Cristian D. Moreno — @Kyonax
  Distributed under the terms of GPL-2.0-only — see LICENSE.
-->

# SEO_MIGRATION.md

**Status:** Draft v2 (2026-05-14) — refined after a full code audit. Pending user approval.

**Refinement log:**
- **v4 (2026-05-14)** — Deployment mechanism switched from FTPS to **build-branch git pattern**. GitHub Actions builds on push to `main` and force-pushes `dist/` contents to a dedicated `deploy` branch (single-commit, history flat). Hostinger's native Git integration (configured manually later in hPanel) pulls that branch into `/public_html/`. No FTP credentials needed. AD-11 rewritten; §14 runbook updated. Added `.git`-blocking rule to `.htaccess` since the deploy branch's `.git/` directory will sit at the document root.
- **v3 (2026-05-14)** — Open decisions resolved (see §9). Host moves from GH Pages → **Hostinger shared hosting** at apex `https://kyo.wtf/`. Base path becomes `/` (no `/kyo-web-online/` prefix). Added **AD-11** (Hostinger deployment + `.htaccess`) + **AD-12** (Google Consent Mode v2 — GA consent now in scope). Added **Phase 8** (Deployment + analytics consent). Updated AD-10 inline-redirect script (drops the GH-Pages base-path strip). Added **§14 Hostinger deployment runbook**. OG image solution: single 1200×630 JPG shared across locales (banner carries no text copy, only the portrait + brand mark).
- **v2 (2026-05-14)** — Reorganized around **SSG with client hydration** as the explicit model (no SSR). Added §12 hydration-safety reference + §13 locale-boot model. Refined AD-1 and AD-5; added AD-8 (hydration safety), AD-9 (URL-authoritative locale at boot), AD-10 (pre-hydration redirect for returning visitors). Phase 2 expanded with concrete entry/router files and the mitigations the audit surfaced. Phase 5 slimmed because Phase 2 now absorbs most of the i18n routing work.
- **v1 (2026-05-14)** — Initial draft.
**Owner:** Cristian D. Moreno.
**Scope:** Bring `kyo-web-online` from a "shipped but invisible" SPA to a **fully crawlable, rich-result-eligible, internationally-targeted** portfolio. Both human visitors and crawlers (Googlebot, Bingbot, Twitterbot, LinkedInBot, ChatGPT-User, GPTBot, ClaudeBot, PerplexityBot) get the same complete page on first byte.

This document is the canonical plan for the SEO track. It companions `VUE_MIGRATION_PLAN.md`, `PERFORMANCE_MIGRATION.md`, `SASS_THEMING_MIGRATION.md`, `TRANSLATION_MIGRATION.md`, `CODE_STANDARDS_MIGRATION.md`, and `SCRIPTS_AUTOMATION.md`. Reference companion: `~/Documents/github-kyonax/dot-files/.config/doom-mac/gptel-directives/sessions/mr-seo-structured-data-architecture.md` (the MR JSON-LD architecture session — patterns ad-002/ad-003/ad-004/ad-005/ad-006/dp-001/dp-004 translate to this project).

---

## 0. Why this matters

The site renders correctly in a browser, but the HTML the network serves looks like this:

```html
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <link rel="preload" as="image" href="/assets/kyonax_portrait-…">
  <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
  <title>I'm Kyo</title>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/assets/index-…js"></script>
</body>
```

A crawler that does not execute JS sees ZERO content. A crawler that does execute JS (Googlebot, Bingbot) sees the rendered page but on a delayed second pass with weaker signal weighting, and never sees server-only signals like canonical / hreflang / JSON-LD if those are also runtime-injected. Outcome: the site under-indexes for `Cristian D. Moreno`, `Kyonax`, `AgileEngine Madison Reed`, `Zerønet Labs`, plus the long-tail of skill / project terms it should rank for.

This plan fixes that.

---

## 1. Target outcome

After this migration, a single `curl https://kyo.wtf` (or the GitHub Pages URL) returns HTML containing, **before any JS executes**:

1. Full `<title>` and `<meta name="description">` localized to the rendered locale.
2. Full Open Graph + Twitter Card meta with absolute image URL + dimensions.
3. `<link rel="canonical">` to the canonical URL for the rendered locale.
4. `<link rel="alternate" hreflang="en|es|x-default">` cross-references.
5. `<meta name="robots" content="index,follow,max-image-preview:large">`.
6. Theme color + favicon links.
7. The full rendered body content (hero + skills + experience + projects + footer) as static HTML, hydrated by Vue on load.
8. A single `<script type="application/ld+json">` block holding a `@graph` array with: `WebSite`, `Person`, `Organization` (Zerønet Labs), `ProfilePage`, `BreadcrumbList`, `WorkExperience` entries (as Person.hasOccupation + alumniOf/worksFor refs), and `CreativeWork` entries for featured projects. All entities cross-referenced via stable `@id` URIs.

Plus the supporting infrastructure: `robots.txt`, `sitemap.xml`, per-locale prerendered routes (`/` for EN, `/es/` for ES), and a JSON-LD validation gate in `scripts/precheck.mjs`.

---

## 2. Current state — audit baseline (Phase 0)

Before changing anything, capture the baseline. This file's §10 holds the running numbers.

### 2.1 What we already have ✓

| Asset | State | Notes |
|---|---|---|
| HTTPS | ✓ | GH Pages auto |
| Responsive viewport | ✓ | `width=device-width, initial-scale=1` |
| Mobile-friendly | ✓ | Recent overhaul (sessions 2026-05-08, 2026-05-13) |
| `@unhead/vue` runtime head | ✓ | `useSeoHead()` in App.vue; locale-reactive |
| Favicons | ✓ | Grunt-generated |
| LCP preload | ✓ | Custom Vite plugin, hashed-asset aware |
| Inline critical CSS | ✓ | `vite-plugin-beasties` |
| AVIF/WebP/JPG image variants | ✓ | sharp pipeline (q=90/q=75) |
| Image `alt` text | ✓ | Localized via i18n (`portrait-alt`, `preview-alt`, …) |
| Single `<h1>` per page | ✓ | Hero name |
| Heading hierarchy | ✓ | h1 → h2 per section → h3 for cards |
| Skip-to-content link | ✓ | Added 2026-05-13 |
| `:focus-visible` rings | ✓ | Global floor + per-component overrides |
| Tap targets ≥ 44 px | ✓ | UiButton/UiLink primitives |
| `prefers-reduced-motion` | ✓ | Global rule |

### 2.2 What's broken or missing ✗

| Gap | Severity | Notes |
|---|---|---|
| Empty `<div id="root">` in built HTML | **CRITICAL** | Crawler sees no content |
| `<title>I'm Kyo</title>` static placeholder | **CRITICAL** | Generic; runtime override never reaches non-JS crawlers |
| No `<meta name="description">` in built HTML | **CRITICAL** | Runtime-only via `useSeoHead` |
| No OG / Twitter meta in built HTML | **CRITICAL** | Same problem |
| No JSON-LD | **CRITICAL** | Zero rich-result eligibility |
| No `robots.txt` | HIGH | Crawlers cannot discover sitemap |
| No `sitemap.xml` | HIGH | Cannot signal canonical URL set |
| No `<link rel="canonical">` | HIGH | Both `?language=en` and `?language=es` look like duplicates |
| No `hreflang` cross-references | HIGH | Bilingual content not signaled |
| Static `<html lang="en">` only | HIGH | ES visitors get wrong `lang` until hydration |
| OG image is relative path | MEDIUM | OG validators reject; some platforms fail to render |
| OG image dimensions missing | MEDIUM | `og:image:width` + `og:image:height` recommended |
| `keywords` meta still emitted | LOW | Ignored by Google but harmless; keep or drop |
| `SEO.description` is Spanish copy used as default | MEDIUM | EN visitors briefly see ES until hydration finishes (same issue as title) |
| Locale switch uses `?language=es` on same URL | MEDIUM | Better: distinct `/es/` route OR self-canonical with hreflang |
| GA `gtag.js` hardcoded in `<head>` with no consent gate | LOW | Not strictly SEO; flag for follow-up |
| No `og:locale:alternate` | LOW | OG bilingual signal missing |
| No `theme-color` for dark UI | LOW | Already injected runtime; OK |
| No `apple-mobile-web-app-*` meta | LOW | PWA-adjacent, optional |

### 2.3 Tools used in the audit

| Tool | Purpose | Run command |
|---|---|---|
| `curl -sS <url>` | Crawler-eye-view of HTML | manual |
| Lighthouse (Chrome DevTools) | Composite SEO score | manual / CI (Phase 8) |
| Google Rich Results Test | JSON-LD validation | https://search.google.com/test/rich-results |
| Schema.org Validator | Spec validation | https://validator.schema.org |
| Google Search Console | Indexing + crawl + Core Web Vitals | post-deploy |
| Bing Webmaster Tools | Bing indexing | post-deploy |
| Twitter Card Validator | OG/Twitter render preview | https://cards-dev.twitter.com/validator |
| OpenGraph.xyz | OG preview | https://www.opengraph.xyz |
| `scripts/seo-audit.mjs` (NEW) | Local gate: `curl` built HTML and assert all SEO surfaces are populated | Phase 7 |

### 2.4 Baseline metrics to capture before any change

Run before Phase 1 starts and record the values in §10:

- `curl -sS https://kyonax.github.io/kyo-web-online/ | wc -c` (HTML byte count)
- Lighthouse SEO score (mobile + desktop)
- Number of `<script type="application/ld+json">` blocks in built HTML (= 0 today)
- Google Search Console: pages indexed, average position for queries `kyonax`, `cristian d moreno developer`, `kyonax portfolio`.

---

## 3. Architecture decisions

These are the load-bearing decisions. Subsequent phases reference them by ID.

### AD-1 — Static prerender via `vite-ssg` + true client hydration (NO SSR)
**Status:** proposed (confirmed v2).
**Context:** SPA HTML is empty. Runtime `@unhead/vue` is invisible to non-JS crawlers and weakly indexed by JS crawlers. We need static HTML containing the full meta + JSON-LD + rendered body. We do NOT want a Node server in production — the deploy target is a static host (GitHub Pages, eventually `kyo.wtf` via CNAME).
**Decision:** Adopt `vite-ssg` (antfu) in its **static-only / build-once** mode. At build time it spins up the Vue app in Node, walks the route list, and emits one static HTML file per route into `dist/`. The same `App.vue` + same bundled JS ship to the client. On client load, **Vue 3 hydration** matches the rendered DOM against the prerendered HTML (no replace-and-mount), so the SPA UX is preserved and there is no flash of empty content.

Why "SSG + hydration" and not just "SSG + replace":
- True hydration keeps event listeners attached to the existing DOM, preserves form state on back-nav, and avoids a layout reflow at hydration time.
- `vite-ssg` already uses Vue's `createSSRApp` on both sides so this is its default mode — we just have to not break it.

**Alternatives considered:**
- **`vite-plugin-prerender-spa-plugin` (Puppeteer-driven)** — heavier (Chromium dep), slower, can't easily inject per-route locale state into i18n before the crawl, doesn't compose with `@unhead/vue` as cleanly.
- **Manual prerender** (`vite build` then headless `node ./scripts/prerender.mjs`) — reinvents `vite-ssg` poorly.
- **Server-side render at request time** (Nuxt / vite-plugin-ssr) — explicitly out of scope; the user wants a static host. Adds a Node server, breaks the GH-Pages story.
- **Status quo + rely on Googlebot's JS rendering** — fails for OG previews on LinkedIn/Twitter/Slack/Discord (none of them run JS), fails for non-Google crawlers (Bingbot is JS-limited; LLM crawlers vary).

**Consequences:**
- Two prerendered routes: `/` (EN canonical) and `/es/` (ES canonical).
- Every meta tag and the JSON-LD `@graph` lands in built HTML at build time.
- `useSeoHead()` keeps working — `@unhead/vue` writes during SSG render and re-hydrates on the client.
- The bundled JS path is identical for both routes (one bundle, two HTML wrappers).
- GH Pages deploy stays one-step (`npm run build` outputs `/dist/`; pushed to `gh-pages`).
- **Pinned versions** to avoid breakage: `vite-ssg@^0.24`, `@unhead/vue@^1.11` (already installed), `vue-router@^4.4`. Lockfile committed.

### AD-2 — Single JSON-LD `@graph` payload, single emission
**Status:** proposed.
**Context:** The MR session (ad-005) found per-schema slots produced ceremony; unifying to one pipeline made the system simpler and more debuggable.
**Decision:** Every page emits exactly **one** `<script type="application/ld+json">` block containing a `@graph` array. Entities cross-reference via stable `@id` URIs (e.g., `https://kyo.wtf/#cristian`, `https://kyo.wtf/#zeronet`). One builder, one emission point, one debug surface.
**Alternatives considered:**
- One `<script>` per schema — works, but encourages drift between blocks and complicates de-duplication.
- Inline JSON-LD per component — couples schema to view, hard to validate.
**Consequences:**
- `src/seo/json-ld/index.js` exports `buildSiteJsonLd({ locale, route })` → returns the full `@graph`. The composable `useStructuredData()` injects it via `@unhead/vue`.
- Adding a new entity (e.g., `Article` once a blog ships) means adding a new builder + extending the `@graph`. No template edits, no new injection slot.

### AD-3 — Per-entity builders under `src/seo/json-ld/`
**Status:** proposed.
**Context:** MR session ad-004 (schema-builders-in-jsonld-subdir).
**Decision:** One file per schema type. Each exports `buildXJsonLd(data, locale)` returning a plain object. No side effects, no I/O. Pure data → JSON-LD object. Easy to unit-test.
**Layout:**
```
src/seo/
├── json-ld/
│   ├── index.js              # buildSiteJsonLd() — assembles @graph
│   ├── website.js            # WebSite
│   ├── person.js             # Person (Cristian)
│   ├── organization.js       # Organization (Zerønet Labs)
│   ├── profile-page.js       # ProfilePage (wraps Person as mainEntity)
│   ├── work-experience.js    # Person.hasOccupation[] entries
│   ├── creative-work.js      # CreativeWork[] for featured projects
│   ├── breadcrumb-list.js    # BreadcrumbList
│   └── sanitize.js           # HTML allowlist (mirrors MR ad-003)
├── meta/
│   ├── index.js              # buildMetaTags({ locale, route, content })
│   └── og-image.js           # resolves absolute OG image URL + dims
└── routes.js                 # canonical URL + hreflang map per route
```

### AD-4 — Source of truth for SEO data lives in `src/data/`
**Status:** proposed.
**Context:** `src/data/projects.js`, `src/data/data.js`, `src/data/snippets.js` already hold the canonical content. JSON-LD must derive from them — never duplicate.
**Decision:** Builders import from `@data/*` and `@i18n/messages`. No SEO copy lives anywhere else. If a string appears in JSON-LD AND on the page, it comes from the same translation key.
**Consequences:**
- Editing a role title in `snippets.js` automatically updates the JSON-LD on next build.
- One i18n key, one source. No drift.

### AD-5 — Locale-canonical routes: `/` (EN) + `/es/` (ES)
**Status:** proposed (refined v2).
**Context:** Today's `?language=es` query param serves both languages from the same URL — confuses canonical signals, makes hreflang useless. International SEO needs distinct URLs per locale.
**Decision:** Vite-ssg prerenders two routes. Vue Router (`history` mode) defines:
- `/` → renders `App.vue` with `i18n.locale='en'`. Canonical `https://kyo.wtf/`. `hreflang="en"` + `hreflang="x-default"`.
- `/es/` → renders `App.vue` with `i18n.locale='es'`. Canonical `https://kyo.wtf/es/`. `hreflang="es"`.
The runtime locale toggle (`setLanguage('es')`) calls `router.push('/es/')`; the route guard binds `i18n.locale` + `document.documentElement.lang` before the new view paints. The legacy `?language=` query param is parsed on first load only and triggers a one-time `location.replace('/es/')` redirect (see AD-10).
**Consequences:**
- `kyonax.github.io/kyo-web-online/` is canonical until DNS for `kyo.wtf` is set up; afterwards both work but the apex is canonical.
- Sitemap lists both URLs.
- Each prerendered HTML carries the full pair of `hreflang` links + a self-referencing canonical.
- The route is the **only authoritative source of locale at boot** — see AD-9.

### AD-8 — Hydration-safety floor (no DOM mismatches)
**Status:** proposed (NEW v2).
**Context:** Vue 3 hydration compares the prerendered DOM against the first client render. Any divergence (different text, different conditional branch, different attribute) produces a hydration warning in dev and, in worst cases, leaves the DOM in an inconsistent state until the next effect cycle. The audit identified one structural risk and several safe-but-worth-documenting patterns.
**Decision:** Apply these rules to every component that ships into SSG:
1. **Module-load DOM access is BANNED.** The one current violation (`src/main.js:29` — `document.documentElement.lang = …`) gets a guard.
2. **`onMounted` is the floor** for `window`, `document`, `navigator`, `matchMedia`, `IntersectionObserver`, `Worker`, `setInterval`, scroll listeners, body-scroll lock writes. (The audit confirms every existing site already obeys this.)
3. **`Intl` may be called at module load** (it's standard JS, present in Node). `Intl.DateTimeFormat` cache instantiation in `now-projects-section.vue` and `site-footer.vue` is safe.
4. **Mobile-first defaults for viewport-dependent state.** The `is_desktop` ref in `hero.vue` initializes to `false` on the server (because `window` is undefined and we keep the `?? false` fallback). At first hydration the same `false` initial value is used, so the prerendered DOM matches the first client render. `onMounted` then re-evaluates `matchMedia` and the v-if branches swap — this happens AFTER hydration, post a `nextTick`, so Vue does not flag a mismatch.
   - **Side effect (accepted):** desktop users see the mobile DOM order for ~1 frame on first paint before the v-if swaps. This is a single-tick paint flicker, not a layout jump (the `.hero` grid placement is purely CSS-driven). Acceptable trade-off; the alternative would be UA-sniffing in the prerender, which is fragile.
5. **Refs that mirror runtime browser state stay empty during SSR.** `host`, `path`, `nav_language`, `viewport` in `site-footer.vue` start as empty strings; the prerendered DOM has the manifest grid present but with empty `<dd>` cells. First hydration matches. `onMounted` then populates. This is already how the file is written — keep it.
6. **No reactive `Date.now()` in the render path on the server.** `_now_ms` in `now-projects-section.vue` initializes to `Date.now()` at module load. On SSR this is the build-time timestamp; on client hydration it's the load timestamp. The countdown DOM rendered server-side will show stale values, then resync after `onMounted` kicks off the 1Hz tick. To prevent a hydration mismatch on the **first** render, initialize `_now_ms` to `0` (or a fixed sentinel like `START_OF_EPOCH`) at module load, and let `onMounted` set the real value. The countdown text rendered on the server then says `--d -- · --h · --m · --s` (or simply hides until mount), matching the first client paint. See Phase 2 mitigations.
7. **The site-footer `resolved_tz` initializer** (`Intl.DateTimeFormat().resolvedOptions().timeZone`) returns the Node process's timezone during prerender (likely `UTC`) and the user's timezone after hydration. Initialize it to `null` (or `'—'`) at module load instead, and set the real value inside `onMounted`. Prevents `TZ: UTC` showing for one tick before re-render.

**Consequences:**
- Two surgical edits to existing files (the `_now_ms` and `resolved_tz` defaults) plus the `main.js:29` guard.
- A new linting rule (Phase 7) flags top-level `window`/`document`/`navigator` access outside guards.

### AD-9 — URL prefix is authoritative for locale at boot (no localStorage override at first paint)
**Status:** proposed (NEW v2).
**Context:** Today `detectInitialLocale()` runs at module load: URL `?language=` → `localStorage['kyo:lang']` → `navigator.language` → `'en'`. Under SSG this is a hydration-mismatch landmine: the server has no `window`/`localStorage`/`navigator` and falls all the way to `'en'`; if the client then resolves `'es'` from localStorage, the first client render diverges from the prerendered HTML.
**Decision:** Rewrite the boot chain so the **URL pathname is the single source of truth** at first paint, on both sides:
- Server prerender of `/` → `locale='en'`.
- Server prerender of `/es/` → `locale='es'`.
- Client first render: read `window.location.pathname`; if it starts with `/es/`, `locale='es'`; else `'en'`. **Do not consult localStorage or navigator before hydration finishes.**
- After hydration, `useLanguage().setLanguage()` continues to mutate i18n, update `<html lang>`, persist to localStorage, AND `router.push()` to the matching route.
- `popstate` continues to mirror the URL into the i18n locale.
- `localStorage` and `navigator.language` become inputs to the **first-visit redirect** (AD-10) only — not to the per-render locale resolution.
**Consequences:**
- `src/i18n/detect-locale.js` becomes simpler: it's now just `_from_url_pathname()` with no fallback to storage/navigator at this layer.
- `src/composables/use-language.js` no longer needs to update `?language=`; it `router.push()`es instead. The `?language=` legacy param is read once on first load by the redirect snippet (AD-10) and then discarded.
- Zero risk of hydration mismatch on locale-derived text.

### AD-11 — Hostinger deployment via build-branch git pattern + `.htaccess` (REWRITTEN v4)
**Status:** proposed.
**Context:** Decision §9.1 — host is Hostinger shared hosting; document root is `/public_html/`; site lives at apex `https://kyo.wtf/`. LiteSpeed Web Server underpins Hostinger shared plans (Apache-compatible `.htaccess`). For the deploy mechanism, the user picked **Hostinger's native GitHub integration**: a dedicated build branch in this repo (e.g. `deploy`, name is flexible — `build` or `built` are acceptable) holds the prerendered `dist/` artifacts; Hostinger's hPanel Git connector watches that branch and pulls into `/public_html/` on every change. The pair-up on Hostinger's side is one-time manual config, deferred until DNS is live.

**Decision — two halves:**

**Half A — CI side (in scope now).** GitHub Actions watches `main`. On push:
1. Checkout, install, run `precheck`, run `vite-ssg build` → `dist/` populated.
2. Push the contents of `dist/` to the `deploy` branch as a **single force-pushed commit** (using `JamesIves/github-pages-deploy-action@v4` with `single-commit: true`). The branch always holds exactly one commit = the latest build. No history bloat.
3. Hostinger sees the branch update and pulls. (Half B.)

**Half B — Hostinger side (deferred manual config).** In hPanel → Websites → kyo.wtf → Advanced → Git → Connect Repository:
- Repository: `https://github.com/Kyonax/kyo-web-online.git`
- Branch: `deploy`
- Install path: `/public_html/`
- Auto-deploy: ON (webhook OR scheduled poll, depending on plan).
- Build command: **none** (the branch already contains the built artifacts).

Hostinger clones the branch into `/public_html/`, which means `.git/` lands at the document root. Block public access to it via `.htaccess` (§14.2 includes this rule).

**`.htaccess` content** (also lives at the document root after deploy): handles HTTPS enforcement, apex canonicalization (`www.` → bare), legacy `?language=` 301 redirects (better for SEO than the AD-10 client redirect — crawlers honor 301s), trailing-slash normalization, AVIF/WebP/SVG MIME types, far-future cache headers for hashed assets, short cache for HTML, gzip/brotli (LiteSpeed default), security headers, and the `.git`-block. Lives at `public/.htaccess` in source so Vite copies it verbatim into `dist/` on every build, so it lands in the `deploy` branch with every push.

**Alternatives considered:**
- **GitHub Actions → FTPS (`SamKirkland/FTP-Deploy-Action`)** — v3's previous choice. Works fine, but requires FTP credentials in GH Secrets, depends on incremental-sync state file, slower than git clone for large image trees. Build-branch is strictly cleaner.
- **Hostinger Git Auto-Deploy pulling `main` directly** — would require Hostinger to run `npm run build` server-side. Hostinger shared plans don't reliably support that for static sites (Node availability varies by plan; build can fail silently). Build-in-CI / pull-from-`deploy` sidesteps this entirely.
- **rsync over SSH** — requires Premium/Business/Cloud plan.
- **Manual upload via FileZilla / File Manager** — fine as a one-off fallback, not as the regular deploy path.

**Consequences:**
- Push to `main` → site updates in ~3-5 minutes (CI build ~2 min, Hostinger poll latency 1-3 min on free webhook; instant if hPanel webhook is wired).
- Rollback = `git revert <bad-main-commit>` + push → CI rebuilds + force-pushes the previous state to `deploy` → Hostinger pulls. Single-commit branch makes the diff trivial.
- The `deploy` branch is **derived state**; never edited by hand, never merged to `main`. Marked as protected with `Restrict pushes` rules so only the GH Actions service account can push to it.
- DNS: point `kyo.wtf` nameservers to `ns1.dns-parking.com` + `ns2.dns-parking.com` (cleanest). SSL provisioning is automatic via Let's Encrypt after DNS resolves.
- HSTS (`Strict-Transport-Security`) **NOT** enabled in initial `.htaccess` — leave it disabled until the site has been live + HTTPS-clean for 1-2 weeks; HSTS is sticky in browsers and prematurely enabling makes rollback to HTTP painful.
- The legacy `?language=es` → `/es/` 301 redirect is **server-side**, so social-card previews, archive crawlers, and JS-less clients all follow correctly. AD-10's inline JS check stays as the fallback for the localStorage / navigator path.
- **No FTP credentials ever leave the GH Secrets store** — the workflow uses the auto-provisioned `GITHUB_TOKEN` to push to the same repo's `deploy` branch. Lower attack surface than FTP.

### AD-12 — Google Consent Mode v2 + lazy gtag.js (NEW v3)
**Status:** proposed.
**Context:** Decision §9.5 — GA consent is now in scope. Today `gtag.js` loads unconditionally in `<head>` with no consent gate, which (a) fires GA events before the user has any chance to opt out, (b) violates GDPR / CCPA / LGPD if any EU/CA/BR visitors hit the site, (c) creates a privacy-policy gap. Google's **Consent Mode v2** (mandatory for EEA traffic since March 2024) lets us pre-load gtag.js with default `denied` flags so analytics fires no events until the user accepts.
**Decision:** Three-step pattern:

1. **Default-deny consent at boot.** Before the existing `gtag.js` script loads, set the consent defaults:
   ```html
   <script>
     window.dataLayer = window.dataLayer || [];
     function gtag(){dataLayer.push(arguments);}
     gtag('consent', 'default', {
       'ad_storage':           'denied',
       'ad_user_data':         'denied',
       'ad_personalization':   'denied',
       'analytics_storage':    'denied',
       'functionality_storage':'granted',
       'security_storage':     'granted',
       'wait_for_update':      500
     });
     gtag('js', new Date());
     gtag('config', 'G-6M3P3M2HG5', { 'anonymize_ip': true });
   </script>
   <script async src="https://www.googletagmanager.com/gtag/js?id=G-6M3P3M2HG5"></script>
   ```
   With these defaults, gtag.js loads but transmits no analytics events. The `wait_for_update: 500` tells gtag to hold pageview for 500ms while the consent UI decides — avoids the "first pageview lost" trap.

2. **Consent banner component** (`@components/cookie-consent.vue`). Persistent footer-anchored banner shown on first visit (`localStorage['kyo:consent']` absent). Two buttons:
   - `Accept` → `gtag('consent', 'update', { analytics_storage: 'granted', ... })` + `localStorage.setItem('kyo:consent', 'granted')`.
   - `Decline` → `gtag('consent', 'update', { analytics_storage: 'denied', ... })` + `localStorage.setItem('kyo:consent', 'denied')`.
   On subsequent visits the banner stays hidden and the stored decision replays via `gtag('consent', 'update', …)` on boot.

3. **Privacy policy link.** Footer gets a `kyo.wtf/privacy/` link (Phase 8 ships a minimal one-page privacy notice — what data we collect, how, retention, contact). Not a SEO win, but it's the compliance pairing for the banner.

**Alternatives considered:**
- **Don't load gtag.js until accept** — possible but loses pre-consent pageview data (which Consent Mode v2 PRESERVES via cookieless pings).
- **Use a third-party CMP** (Cookiebot / OneTrust / Iubenda) — overkill for a personal portfolio; adds ~30-100 kB.
- **Drop GA entirely** — simplest, but the user wants the analytics.

**Consequences:**
- ESLint allowlist updated to permit the consent banner's `window.gtag` calls (gated by `onMounted`).
- A small banner DOM (always rendered prerendered, hidden via `display: none` when `localStorage['kyo:consent']` exists — but SSR doesn't know, so it ships visible by default and JS hides on hydration if already accepted). This produces a one-tick visual flash for returning users; acceptable trade-off vs. a hydration mismatch.
- Privacy policy page is OUT of scope as a SEO concern but ships as a sibling page (`/privacy/index.html` prerendered, no `<meta robots>` change; `noindex` optional if you don't want it ranked).

### AD-10 — Pre-hydration redirect for returning visitors + legacy URLs
**Status:** proposed (NEW v2).
**Context:** A returning ES visitor who lands on `/` should be sent to `/es/` *before* any HTML renders, so they get the right prerendered content and don't experience a flash + reload. Similarly, legacy `/?language=es` links from social posts should bounce to `/es/`. This must happen synchronously before the main bundle loads, so it sits as a tiny inline `<head>` script.
**Decision:** Inject a small inline script (~30 lines, minified ~600 bytes) into each prerendered HTML, BEFORE the main bundle's `<script type="module">`:

```html
<script>
(function () {
  var p = location.pathname;
  var explicit = new URLSearchParams(location.search).get('language');
  // Legacy ?language= takes priority — let .htaccess 301 handle this server-side first
  // (AD-11). This client-side check is the fallback for direct visits without the query.
  if (p === '/' || p === '') {
    var stored = null;
    try { stored = localStorage.getItem('kyo:lang'); } catch (e) {}
    var nav = (navigator.language || '').slice(0, 2).toLowerCase();
    var pick = explicit || stored || nav;
    if (pick === 'es') {
      location.replace('/es/' + location.hash);
    }
  } else if (p === '/es/' || p === '/es') {
    if (explicit === 'en') {
      location.replace('/' + location.hash);
    }
  }
})();
</script>
```

Note: `.htaccess` (AD-11) handles legacy `?language=es` → `/es/` as a **server-side 301**, which crawlers honor. This inline script catches the localStorage / navigator fallback for human returning visitors.

This is the **only** place where localStorage/navigator influence the locale. After this redirect (or after the page passes the check without redirecting), the URL is canonical for the lifetime of the visit.

**Consequences:**
- Returning ES visitors who hit `/` get a single `location.replace` to `/es/` (no flash because the bundle hasn't started loading yet).
- Legacy `?language=es` links → `/es/` (one redirect).
- The inline script is injected via vite-ssg's HTML transform (a small post-prerender plugin step).
- No effect on crawler-served HTML — crawlers don't execute this script; they see the canonical text for the URL they fetched, which is exactly what we want.

### AD-6 — Sanitizer for HTML in JSON-LD text fields
**Status:** proposed (mirrors MR ad-003).
**Context:** Experience bullets contain `<strong>` for emphasis. Schema.org `description` / `disambiguatingDescription` accept plain text. Some fields (e.g., FAQ `Answer.text` in future) accept limited HTML.
**Decision:** `src/seo/json-ld/sanitize.js` exports `stripHtml(html)` (full strip → plain text) and `allowlistHtml(html, allowlist)` (whitelisted tags only). Default allowlist for the rare HTML-bearing field: `['a', 'br', 'em', 'p', 'strong', 'ul', 'ol', 'li']`. **NEVER** allows `<script>`, event handlers, or inline styles.
**Consequences:**
- Single source of truth for sanitization.
- New schemas with text fields reuse the same helper.

### AD-7 — JSON-LD validation gate in `precheck.mjs`
**Status:** proposed.
**Context:** Schema.org markup is easy to break (capitalization, required fields, type mismatches). The MR session showed value in a CI gate.
**Decision:** Add `scripts/check-json-ld.mjs`:
1. Run `buildSiteJsonLd({ locale: 'en' })` and `buildSiteJsonLd({ locale: 'es' })`.
2. Validate against `https://validator.schema.org/` via its public API (or, offline: run `schema-dts` type-checking via TS compiler in a one-shot).
3. Assert every `@id` resolves within the graph.
4. Assert every `image`/`logo` URL is absolute + HTTPS.
5. Assert required-by-Google fields are present for each emitted type (e.g., Person needs `name`; ProfilePage needs `mainEntity`).
6. Wire into `scripts/precheck.mjs`.

---

## 4. Phased plan

Each phase ends with a working `npm run dev` AND `npm run build` AND a passing `npm run precheck`. Same discipline as the Vue migration phases.

### Phase 1 — Technical SEO foundations
**Goal:** `robots.txt` + `sitemap.xml` + canonical + hreflang in place. No prerender yet — runtime-only.
**Files added:**
- `public/robots.txt` — allow all, points to sitemap, blocks `/api/` (future).
- `public/sitemap.xml` — generated at build time by `scripts/generate-sitemap.mjs`. Lists `/` (en) and `/es/` (es), each with `<xhtml:link rel="alternate" hreflang="…">`, `<lastmod>` from `package.json` build time, `<changefreq>monthly</changefreq>`, `<priority>1.0</priority>`.
- `scripts/generate-sitemap.mjs` — small Node script; reads route map from `src/seo/routes.js`; emits `public/sitemap.xml`. Wired as `prebuild`.
**Files modified:**
- `src/composables/use-seo-head.js` — emit `<link rel="canonical">`, `<link rel="alternate" hreflang="…">` (en, es, x-default), `<meta name="robots" content="index,follow,max-image-preview:large">`, `<meta property="og:locale:alternate">`, fix `og:image` to absolute URL, add `og:image:width` + `og:image:height`.
- `index.html` — drop the placeholder `<title>I'm Kyo</title>`; the static title becomes the canonical EN title; `<html lang="en">` stays as the default.
- `src/data/data.js` — `SITE_URL` becomes the apex `https://kyo.wtf/` (with the GH-Pages URL as a fallback constant for asset prefixes).
**Effort:** 0.5 day.

### Phase 2 — Static prerender via `vite-ssg` (THE LOAD-BEARING PHASE)
**Goal:** Built `/dist/index.html` and `/dist/es/index.html` contain the fully-rendered DOM + meta + (once Phase 4 lands) JSON-LD. Client hydration matches the prerendered DOM on first paint. No hydration warnings in dev mode.

The audit (v2) confirmed the codebase is **already 95% SSG-ready** — only one unguarded line and three module-eval defaults need adjusting. The bulk of this phase is the new entry/router files and the vite-ssg wiring.

#### 2.1 Files added

```
src/
├── main.js                 # CLIENT entry (slimmed — see 2.3)
├── main.ssg.js             # vite-ssg entry — exports the ViteSSG instance
├── router.js               # vue-router with two routes
└── i18n/
    └── locale-from-route.js  # pure: pathname → 'en' | 'es'
public/
└── _pre-hydration-redirect.js  # the AD-10 inline script (transformed in)
scripts/
└── inject-pre-hydration-redirect.mjs  # vite-ssg HTML transform plugin
```

**`src/main.ssg.js`** — the vite-ssg-managed entry:

```js
/*
 * Copyright (c) 2026 Cristian D. Moreno — @Kyonax
 * Distributed under the terms of GPL-2.0-only — see LICENSE.
 */
import { ViteSSG } from 'vite-ssg';
import { createHead } from '@unhead/vue';

import App from './App.vue';
import { i18n } from '@i18n';
import { localeFromRoute } from '@i18n/locale-from-route';
import { ROUTES } from './router';
import '@scss/main.scss';

export const createApp = ViteSSG(
  App,
  { routes: ROUTES, base: import.meta.env.BASE_URL },
  ({ app, router, isClient }) => {
    const head = createHead();
    app.use(i18n);
    app.use(head);

    // AD-9: URL is authoritative. Set locale BEFORE the first render.
    router.beforeEach((to, _from, next) => {
      const next_locale = localeFromRoute(to.path);
      if (i18n.global.locale.value !== next_locale) {
        i18n.global.locale.value = next_locale;
      }
      if (isClient && typeof document !== 'undefined') {
        document.documentElement.lang = next_locale;
      }
      next();
    });
  },
);
```

**`src/router.js`** — minimal route table; vite-ssg reads `ROUTES` to know what to prerender:

```js
import App from './App.vue';

export const ROUTES = [
  { path: '/',    name: 'home-en', component: App, meta: { locale: 'en' } },
  { path: '/es/', name: 'home-es', component: App, meta: { locale: 'es' } },
];
```

**`src/i18n/locale-from-route.js`** — pure function, used on both sides:

```js
import { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES } from '@data/data';

export const localeFromRoute = (pathname) => {
  if (!pathname) return DEFAULT_LANGUAGE;
  if (pathname === '/es' || pathname.startsWith('/es/')) return 'es';
  return SUPPORTED_LANGUAGES.includes(DEFAULT_LANGUAGE) ? DEFAULT_LANGUAGE : 'en';
};
```
(No base-path stripping needed on Hostinger — site lives at apex `/`.)

#### 2.2 Files modified

**`package.json`:**
```json
{
  "scripts": {
    "build": "vite-ssg build",
    "build:csr": "vite build"
  },
  "devDependencies": {
    "vite-ssg": "^0.24",
    "vue-router": "^4.4"
  }
}
```
Keep `"build:csr"` as the escape hatch for debugging.

**`src/main.js`** — slim down to client-only mount delegation. With `vite-ssg`, the framework handles `createApp` + `mount`. We just re-export the SSG factory:

```js
// src/main.js
import { createApp } from './main.ssg';
export { createApp };  // vite-ssg picks this up for hydration
```

(`vite-ssg` builds two bundles internally — Node-side for prerender, browser-side for hydration. Both share the same `createApp` factory.)

**`src/composables/use-language.js`:**
- Replace `_update_url(code)` with a `router.push()` call.
- Drop the `popstate` listener — vue-router handles back/forward.
- Drop the explicit `_update_html_lang()` — the router guard from §2.1 already does this on every transition.
- Keep `_persist()` (localStorage write) — preserves preference for AD-10 redirect on next visit.

**`src/i18n/detect-locale.js`:**
- Becomes a one-line re-export of `localeFromRoute(window.location.pathname)` for any consumer still calling `detectInitialLocale()`.
- The old URL-query / localStorage / navigator chain MOVES into `public/_pre-hydration-redirect.js` (AD-10). At runtime after hydration, those signals are no longer consulted.

**`vite.config.js`** — ensure:
- `vite-ssg`'s implicit plugin loads first.
- Existing plugins (`vite-plugin-html`, `beasties`, the LCP preload injector) still apply. Order matters: LCP injector runs at `transformIndexHtml` post-stage; that hook fires AFTER vite-ssg prerenders, so the existing logic works unchanged.
- Add the **AD-10 redirect injector** as a tiny `vite-ssg` `onPageRendered` hook (or as a post-build `transformIndexHtml` plugin if not exposed). It prepends the redirect snippet from `public/_pre-hydration-redirect.js` (minified) into each `<head>` immediately after `<meta name="viewport">`.

**`src/main.js:29` guard** — replaced by the router guard in `main.ssg.js`, which already checks `isClient`. The unguarded `document.documentElement.lang = …` line is deleted.

**`now-projects-section.vue` — hydration safety fix:**
```js
// Before (module load):
const _now_ms = ref(Date.now());

// After:
const _now_ms = ref(0);  // server + first hydration: 0 (placeholder)
// real value populated inside onMounted's _start_tick()
```
Plus a template guard: `v-if="_now_ms"` on the segment chips, or render `--d · --h · --m · --s` when `_now_ms === 0`. (Pick whichever reads better — see Phase 2.4 review.)

**`site-footer.vue` — hydration safety fix:**
```js
// Before (module load):
const resolved_tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

// After:
const resolved_tz = ref('—');
onMounted(() => {
  try {
    resolved_tz.value = Intl.DateTimeFormat().resolvedOptions().timeZone || '—';
  } catch { /* keep '—' */ }
});
```

#### 2.3 Build pipeline

```
npm run build
  └─ predev/prebuild (convert-images + precheck)
  └─ vite-ssg build
      ├─ Vite client build (the JS/CSS bundles)
      ├─ Node-side ViteSSG.render('/')   → dist/index.html
      ├─ Node-side ViteSSG.render('/es/') → dist/es/index.html
      ├─ Per-HTML transforms (in order):
      │     1. AD-10 inline redirect script injection
      │     2. LCP preload injector (existing plugin)
      │     3. Beasties critical CSS extraction (existing plugin)
      │     4. (Phase 4) JSON-LD `@graph` script injection (via @unhead/vue, already in DOM)
      └─ Done.
```

`dist/` now contains:
```
dist/
├── index.html          # EN canonical
├── es/
│   └── index.html      # ES canonical
├── assets/             # hashed JS/CSS/images
├── favicon.{svg,png}
├── robots.txt          # Phase 1
└── sitemap.xml         # Phase 1
```

#### 2.4 Validation gate (added to `scripts/seo-audit.mjs`, Phase 7)

After build, assert:
- `dist/index.html` contains `<html lang="en">` AND `<link rel="canonical" href="https://kyo.wtf/">` AND `<link rel="alternate" hreflang="en" href="https://kyo.wtf/">` AND `<link rel="alternate" hreflang="es" href="https://kyo.wtf/es/">` AND `<link rel="alternate" hreflang="x-default" href="https://kyo.wtf/">`.
- `dist/es/index.html` contains `<html lang="es">` AND `<link rel="canonical" href="https://kyo.wtf/es/">` AND the same three hreflang entries (with self-reference being `es`).
- Both contain the AD-10 redirect inline script in `<head>` BEFORE the module script.
- Both contain the rendered hero text (curl + `grep` for `CRISTIAN D. MORENO`).
- Both contain `<meta name="description" content="…">` with locale-correct copy.
- Both contain exactly one `<script type="application/ld+json">` (Phase 4).
- No hydration mismatch logs when `npm run preview` + Playwright headless visit.

#### 2.5 Risks + mitigations (audit-informed)

| Risk | Severity | Mitigation |
|---|---|---|
| `vite-ssg` ↔ `@unhead/vue` version mismatch | medium | Pin both; smoke-test the head population in a throwaway branch first |
| `is_desktop` v-if branch swap causes a single-frame flicker on desktop | low | Document; accepted (alternative is UA sniffing which is worse) |
| Worker import `?worker` at module load | none | Already inside `use-project-countdowns.js`, instantiation deferred to `onMounted`. Confirmed by audit |
| `setInterval` ticking the countdown during SSR | none | Already inside `onMounted`. Confirmed by audit |
| `_now_ms = Date.now()` at module load | medium | Fix as above — initialize to `0` |
| `resolved_tz` reads Node's TZ during prerender | medium | Fix as above — move into `onMounted` |
| GH Pages serves `/es/` without `index.html` resolution | medium | Verify; GH Pages does resolve `/es/` → `/es/index.html` natively. If a custom domain ever swaps in nginx/Caddy, mirror this rule |
| `<base>` URL collision (GH Pages base path `/kyo-web-online/`) | medium | `localeFromRoute()` strips the base; vite-ssg respects `import.meta.env.BASE_URL`; sitemap + canonical use the abs URL from `SITE_URL` |
| Inline AD-10 redirect adds bytes | low | ~600 bytes minified, gzip ~350 bytes. Negligible. Below CWV thresholds. |

**Effort:** 1.5 days. Includes a half-day for dev-mode hydration testing across mobile/tablet/desktop and verifying no `[Vue warn]: Hydration … mismatch` warnings.

### Phase 3 — On-page SEO polish
**Goal:** Title, description, headings, alt text, internal links all aligned with §3 (on-page-seo.md).
**Files modified:**
- `src/data/data.js` — replace the Spanish-only `APP_DESCRIPTION` / `SEO.description` with locale-keyed objects sourced from i18n. The runtime keeps a fallback const for the case where i18n hasn't loaded.
- `src/data/snippets.js` — add three new keys: `kyo-web.landing.meta.title.{en,es}` (under 60 chars; primary keyword first), `kyo-web.landing.meta.description.{en,es}` (150-160 chars, action-oriented), `kyo-web.landing.meta.og-title.{en,es}` (used for OG + Twitter; can be slightly longer, ~70 chars).
- `src/i18n/raw-html-keys.js` — these new keys are plain text; do NOT add to the allowlist.
- `src/composables/use-seo-head.js` — pull from i18n instead of `SEO` constants. Keep `SEO` as a fallback table for boot-time / SSR-pre-i18n cases.
- `src/views/components/sections/hero.vue` — verify the single `<h1>` is the name. Already true; document.
**Concrete proposed copy:**
- `meta.title.en`: `Cristian D. Moreno — Frontend & Full-Stack Engineer | Kyonax`  *(58 chars)*
- `meta.title.es`: `Cristian D. Moreno — Ingeniero Frontend & Full-Stack | Kyonax`  *(63 chars)*
- `meta.description.en`: `8 years building scalable, performant web apps. Currently Frontend Engineer at AgileEngine for Madison Reed. Founder of Zerønet Labs. Available for remote work.`  *(157 chars)*
- `meta.description.es`: `8 años creando aplicaciones web escalables y de alto rendimiento. Actualmente Frontend Engineer en AgileEngine para Madison Reed. Fundador de Zerønet Labs.`  *(154 chars)*
**Effort:** 0.5 day.

### Phase 4 — JSON-LD architecture (THE CORE)

This is the meaty part. Subsections lay out the schema design before the file plan.

#### 4.1 Entity model

```
WebSite
  └── publisher → Person  (the canonical Person entity)

Person  @id https://kyo.wtf/#cristian
  ├── name, alternateName ("Kyonax"), givenName, familyName, jobTitle
  ├── description (CV-derived, plain text, locale-specific)
  ├── image (portrait, absolute URL)
  ├── url (https://kyo.wtf/  or  /es/)
  ├── sameAs[] (GitHub, ORCID, X, LinkedIn, …)
  ├── email
  ├── address → PostalAddress (Bogotá, Colombia)
  ├── nationality → Country (Colombia)
  ├── knowsLanguage[] (English, Spanish)
  ├── knowsAbout[] (skills as text tokens — see 4.4)
  ├── hasOccupation[] → Occupation (current + most recent)
  ├── worksFor → Organization (AgileEngine current contract)
  ├── alumniOf[] → Organization[] (past employers as Org references)
  ├── memberOf[] → Organization (Cyber Code Syndicate)
  ├── subjectOf[] → CreativeWork[] (featured projects)
  └── workExample[] → CreativeWork[] (now-shipping projects)

Organization  @id https://kyo.wtf/#zeronet
  ├── name "Zerønet Labs"
  ├── founder → Person  (cross-ref @id)
  ├── url
  └── logo (absolute URL)

[ + one Organization per current/past employer ]

ProfilePage  @id https://kyo.wtf/#profile-page
  ├── mainEntity → Person  (cross-ref @id)
  ├── dateCreated
  ├── dateModified  (build time)
  └── inLanguage (en or es)

BreadcrumbList
  └── itemListElement: position 1 → Home
```

#### 4.2 Person entity — full shape (EN locale, illustrative)

```jsonc
{
  "@type": "Person",
  "@id": "https://kyo.wtf/#cristian",
  "name": "Cristian D. Moreno",
  "alternateName": ["Kyonax", "@kyonax_on_tech", "京"],
  "givenName": "Cristian",
  "additionalName": "D.",
  "familyName": "Moreno",
  "jobTitle": "Frontend Engineer",
  "description": "8 years building scalable, performant web apps...",
  "image": "https://kyo.wtf/assets/kyonax_portrait-900.jpg",
  "url": "https://kyo.wtf/",
  "email": "mailto:support@kyo.wtf",
  "address": {
    "@type": "PostalAddress",
    "addressLocality": "Bogotá",
    "addressRegion": "Cundinamarca",
    "addressCountry": "CO"
  },
  "nationality": { "@type": "Country", "name": "Colombia" },
  "knowsLanguage": ["en", "es"],
  "identifier": [
    {
      "@type": "PropertyValue",
      "propertyID": "ORCID",
      "value": "0009-0006-4459-5538",
      "url": "https://orcid.org/0009-0006-4459-5538"
    }
  ],
  "sameAs": [
    "https://github.com/Kyonax",
    "https://orcid.org/0009-0006-4459-5538",
    "https://x.com/kyonax_on_tech",
    "https://www.linkedin.com/in/kyonax/",
    "https://github.com/ccs-devhub"
  ],
  "knowsAbout": [
    "Vue.js", "TypeScript", "Node.js", "Next.js", "React",
    "Web Performance Optimization", "Web Accessibility (WCAG)",
    "Frontend Architecture", "SCSS/Sass", "Symfony", "PostgreSQL",
    "MongoDB", "Docker", "GitHub Actions", "AI-assisted Development",
    "Claude Code", "Prompt Engineering"
  ],
  "hasOccupation": [
    {
      "@type": "Occupation",
      "name": "Frontend Engineer",
      "occupationLocation": { "@type": "Country", "name": "Colombia" },
      "skills": "Vue.js, TypeScript, Web Performance, Accessibility, Frontend Architecture"
    }
  ],
  "worksFor": { "@id": "https://kyo.wtf/#agile-engine" },
  "alumniOf": [
    { "@id": "https://kyo.wtf/#zeronet" },
    { "@id": "https://kyo.wtf/#softtek" },
    { "@id": "https://kyo.wtf/#cr-senior-fullstack-employer" }
  ],
  "memberOf": [{ "@id": "https://kyo.wtf/#ccs" }],
  "subjectOf": [
    { "@id": "https://kyo.wtf/#project-zeronet-platform" },
    { "@id": "https://kyo.wtf/#project-cyber-code-syndicate" },
    { "@id": "https://kyo.wtf/#project-veyra" }
  ]
}
```

#### 4.3 WorkExperience as `hasOccupation` + per-employer `Organization`

Schema.org does not have a first-class `WorkExperience` type. Two complementary representations are emitted:

1. **`Person.hasOccupation[]`** — one `Occupation` per role currently or recently held. Carries `name` (role title), `occupationLocation`, `skills` (CSV string), `description`, `startDate`, `endDate` (omitted if current).
2. **One `Organization` per employer** — each with stable `@id`, `name`, `url`, optional `logo`. Cross-referenced from `Person.worksFor` (current) / `Person.alumniOf[]` (past).

Mapping from the `experience.vue` `ENTRIES` array:

| entry id | Organization `@id` | Person ref |
|---|---|---|
| agile-engine | `https://kyo.wtf/#agile-engine` | `worksFor` |
| zeronet | `https://kyo.wtf/#zeronet` | `alumniOf` (and founder-of via `Organization.founder`) |
| softtek | `https://kyo.wtf/#softtek` | `alumniOf` |
| cr-senior-fullstack | `https://kyo.wtf/#cr-senior-fullstack-employer` | `alumniOf` |
| cr-web-dev | `https://kyo.wtf/#cr-web-dev-employer` | `alumniOf` |
| cr-growth | `https://kyo.wtf/#cr-growth-employer` | `alumniOf` |

The `bullets` and `tools` strings from i18n become `Occupation.description` (plain text via `stripHtml`) and `Occupation.skills` (CSV of tokens, deduped, mapped through `TOKEN_ALIASES`).

**Optional richer alternative** (deferred unless needed): emit an `EmployeeRole` for each entry under a custom `additionalType` chain. The simpler `hasOccupation[]` shape is the Google-recommended path and is what we ship in Phase 4.

#### 4.4 Skills as `knowsAbout` + `DefinedTerm`-set

Schema.org has no `Skill` type. Two paths:

1. **`Person.knowsAbout[]`** — primary signal. Flat array of strings sourced from `TECHNOLOGIES` (canonical display name per locale).
2. **`DefinedTermSet`** (optional, defers to v2) — a richer representation where each skill is a `DefinedTerm` with `name`, `inDefinedTermSet`, `identifier`. Useful only if we add a `/skills/` sub-page. For the single-page landing, `knowsAbout[]` is sufficient and Google-validated.

Implementation: `buildPersonJsonLd(locale)` reads `TECHNOLOGIES` and `CATEGORIES` from `@data/data`, picks the locale-specific `name`, flattens, dedupes, returns the array.

#### 4.5 Featured projects as `CreativeWork`

For each entry in `PROJECTS` where `featured === true` (or where `images.length > 0` for the lightbox-capable now-shipping cards), emit a `CreativeWork`:

```jsonc
{
  "@type": "CreativeWork",
  "@id": "https://kyo.wtf/#project-zeronet-platform",
  "name": "ZERONET LABS",
  "url": "https://github.com/zeronet-labs",
  "creator": { "@id": "https://kyo.wtf/#cristian" },
  "creativeWorkStatus": "Updating",
  "version": "v0.4.0",
  "image": "https://kyo.wtf/assets/zeronet-labs-1.jpg",
  "inLanguage": "en"
}
```

These are cross-referenced from `Person.subjectOf[]`. Live URLs (`url`) preserve outbound link equity to GitHub repos but the schema makes Cristian's authorship explicit.

#### 4.6 WebSite entity (sitewide)

```jsonc
{
  "@type": "WebSite",
  "@id": "https://kyo.wtf/#website",
  "url": "https://kyo.wtf/",
  "name": "Cristian D. Moreno — Portfolio",
  "alternateName": "Kyonax",
  "publisher": { "@id": "https://kyo.wtf/#cristian" },
  "inLanguage": ["en", "es"]
}
```

#### 4.7 ProfilePage wrapper

```jsonc
{
  "@type": "ProfilePage",
  "@id": "https://kyo.wtf/#profile-page",
  "mainEntity": { "@id": "https://kyo.wtf/#cristian" },
  "url": "https://kyo.wtf/",
  "inLanguage": "en",
  "dateModified": "2026-05-14",
  "primaryImageOfPage": "https://kyo.wtf/assets/kyonax_portrait-900.jpg"
}
```

#### 4.8 Files added

```
src/seo/json-ld/
├── index.js              # buildSiteJsonLd({ locale, route }) → @graph
├── website.js
├── person.js
├── organization.js       # buildOrganizationJsonLd(id, locale)
├── profile-page.js
├── work-experience.js    # maps ENTRIES → hasOccupation[] + organization @graph entries
├── creative-work.js      # maps featured PROJECTS → CreativeWork[]
├── breadcrumb-list.js
├── sanitize.js           # stripHtml, allowlistHtml
└── identifiers.js        # @id URI builders (single source of truth)

src/seo/meta/
├── index.js              # buildMetaTags({ locale, route, content })
└── og-image.js           # resolveAbsoluteOgImage()

src/seo/
└── routes.js             # ROUTE_MAP: { '/': 'en', '/es/': 'es' }

src/composables/
└── use-structured-data.js  # useStructuredData() — injects @graph via @unhead/vue
```

#### 4.9 Composable

```js
// src/composables/use-structured-data.js
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useHead } from '@unhead/vue';
import { useRoute } from 'vue-router';

import { buildSiteJsonLd } from '@/seo/json-ld';

export const useStructuredData = () => {
  const { locale } = useI18n();
  const route = useRoute();

  const ldJson = computed(() =>
    JSON.stringify(buildSiteJsonLd({
      locale: locale.value,
      route: route.path,
    })),
  );

  useHead({
    script: [{
      type: 'application/ld+json',
      key: 'kyo-site-jsonld',  // dedupe key for @unhead
      children: ldJson,
    }],
  });
};
```

Called once from `App.vue` next to `useSeoHead()`.

#### 4.10 Validation

`scripts/check-json-ld.mjs` runs three assertions:

1. **Spec validation** — pipe each locale's `@graph` through `schema-dts` types (TS one-shot) OR POST to `https://validator.schema.org` (offline-fallback friendly).
2. **`@id` integrity** — every `@id` referenced via `{ "@id": "…" }` exists as a top-level entity within the graph.
3. **Required-field gates** — Person needs `name`; Organization needs `name` + `url`; ProfilePage needs `mainEntity`; CreativeWork needs `name`; every `image` URL is absolute + HTTPS.

Wire into `scripts/precheck.mjs`. Gate CI.

**Effort:** 2 days (1 for builders, 0.5 for the prerender wiring, 0.5 for validation + tests).

### Phase 5 — International SEO (mostly absorbed by Phase 2)
**Goal:** Verify what Phase 2 produced, polish the hreflang surface, and lock in the language-toggle UX.
**Files modified:**
- `src/widgets/language-toggle.vue` — when a user picks Spanish, call `setLanguage('es')` which now does `router.push('/es/')` (in-session SPA nav, no reload); URL becomes `/es/`; `<html lang>` becomes `es`; `useSeoHead`'s canonical / og:locale switch reactively; localStorage persists `es` for next visit.
- `public/_pre-hydration-redirect.js` — already injected in Phase 2; verify the legacy `?language=es` → `/es/` redirect logic works.
- `scripts/generate-sitemap.mjs` — confirm both URLs ship with `<xhtml:link rel="alternate" hreflang="…">` siblings inside the `<url>` element (not just `<link>` tags in HTML).
**Pending decision:** `hreflang="es"` (locale-neutral) vs `hreflang="es-CO"`/`hreflang="es-419"` (region-coded). Default proposal: `es` + `x-default`. The site doesn't have region-specific content, so locale-neutral signals correctly. Confirm.
**Effort:** 0.25 day (most of the work is done in Phase 2).

### Phase 6 — Mobile + Core Web Vitals verification
**Goal:** Confirm the work already done (recent mobile overhauls) holds under Lighthouse mobile.
**Action:** Lighthouse mobile run on prerendered build. Document scores in §10. If LCP regresses from the new prerender (extra JSON-LD bytes, etc.), investigate. Target: SEO 100, Performance ≥ 90 mobile.
**Effort:** 0.25 day.

### Phase 7 — CI + monitoring
**Goal:** Block regressions.
**Files added:**
- `scripts/seo-audit.mjs` — post-build: read `dist/index.html` + `dist/es/index.html`, assert each contains: a non-empty `<title>`, `<meta name="description">`, `<link rel="canonical">`, both `hreflang` entries, exactly one `<script type="application/ld+json">`, OG image as absolute URL.
- `scripts/check-json-ld.mjs` — see §4.10.
- `.github/workflows/ci.yml` — add Lighthouse CI step (mobile + desktop preset) on PRs; budget: SEO ≥ 95, perf ≥ 85.
**Files modified:**
- `scripts/precheck.mjs` — add `check-json-ld` + `seo-audit` to the composite gate.
- Update `SCRIPTS_AUTOMATION.md` and the session file §3.6 with the two new gates.
**Effort:** 0.5 day.

### Phase 8 — Hostinger deployment + GA consent (NEW v3)
**Goal:** Production-ready hosting on `https://kyo.wtf/` + Consent-Mode-v2-compliant analytics + privacy policy page.

#### 8.1 Hostinger setup (one-time, MANUAL — deferred until DNS is live)
- Register / transfer `kyo.wtf` to point at Hostinger nameservers (`ns1.dns-parking.com`, `ns2.dns-parking.com`). Wait 1-24h for DNS propagation. Let's Encrypt SSL provisions automatically after DNS resolves.
- hPanel → SSL → enable "Force HTTPS" toggle.
- hPanel → Websites → kyo.wtf → Advanced → **Git** → Connect Repository:
  - Repository URL: `https://github.com/Kyonax/kyo-web-online.git`
  - Branch: `deploy`
  - Install path: `/public_html/`
  - Auto-deploy: ON. If hPanel offers a webhook URL, copy it and add it as a GitHub repo webhook (Settings → Webhooks → Add webhook → paste URL, content-type `application/json`, trigger on `push`). Otherwise Hostinger polls the branch on its own schedule (typically every few minutes).
- Verify a first manual pull from hPanel ("Deploy" button) once the `deploy` branch has at least one commit. The contents of `/public_html/` should match `dist/`.

#### 8.2 Files added
- **`public/.htaccess`** — full content in §14.2. Vite copies it verbatim into `dist/` on every build.
- **`public/og-banner.jpg`** — 1200×630 JPG. Single shared OG image (decision §9.6).
- **`public/privacy/index.html`** — one-page privacy notice (data collected, retention, contact). Prerendered at build time; included in sitemap.
- **`src/components/cookie-consent.vue`** — AD-12's banner component. Slots into `App.vue` after `<main>`.
- **`.github/workflows/deploy.yml`** — full content in §14.3. Builds on push to `main`, force-pushes `dist/` to the `deploy` branch as a single commit.

#### 8.3 Files modified
- **`index.html`** — replace the existing eager `gtag.js` block with AD-12's three-step pattern (consent defaults FIRST, then `gtag.js` async). Note: AD-12 says do NOT remove gtag.js — keep it loading, just gated by consent.
- **`src/data/data.js`** — drop the `FAVICON.grunt.developerURL` reference to GH Pages; switch to `https://kyo.wtf/`. Update `SITE_URL`. Update the favicon Grunt config's `developerURL`, `url`, `start_url` to apex.
- **`package.json`** — `"homepage": "https://kyo.wtf/"` (was the GitHub repo URL — keep that as `"repository"`).
- **`README.org`** — replace any GH Pages URLs with `https://kyo.wtf/`.

#### 8.4 Validation (gate before flipping DNS)
1. Local: `npm run build` → `npx serve dist/` (or `npm run preview`) → manually verify both `/` and `/es/` render correctly.
2. Push to a `staging` branch → CI deploys to a Hostinger staging subdomain → manual smoke-test.
3. Flip DNS for `kyo.wtf` → live.
4. Run Google Search Console: submit `https://kyo.wtf/sitemap.xml`. Same for Bing Webmaster Tools.
5. Run Google Rich Results Test on `https://kyo.wtf/` + `https://kyo.wtf/es/`.
6. Run Lighthouse on production: target SEO 100, perf ≥ 85 mobile.
7. After 1-2 weeks of clean HTTPS: add HSTS line to `.htaccess` (commented in the §15.2 template; uncomment when ready).

**Effort:** 1 day (0.5 Hostinger config, 0.25 GA consent + privacy page, 0.25 CI workflow + verification).

---

## 5. Risk register

| Risk | Likelihood | Severity | Mitigation |
|---|---|---|---|
| `vite-ssg` conflicts with `@unhead/vue` version | medium | medium | Pin both; sample-app test before adopting |
| Existing `IntersectionObserver` / matchMedia / worker code breaks during SSR | high | medium | Guard each with `typeof window !== 'undefined'` or move into `onMounted` |
| GH Pages serves `/es/index.html` correctly only with trailing slash | medium | low | Verify; emit both `/es/` and `/es/index.html` in sitemap if needed |
| JSON-LD bloat hurts LCP | low | low | The full `@graph` is ~5-8 KB minified; trivial compared to JS bundle |
| Schema drift between EN and ES (e.g., role title rename in one locale only) | medium | low | The validation gate (§4.10) catches missing required fields; copy review on each PR |
| Privacy compliance (gtag.js no consent) | medium | medium | Out of scope for SEO; flagged as follow-up |
| `hreflang` self-canonical mismatch | medium | medium | Sitemap + meta both list both URLs; the validation gate asserts both are present |
| Locale toggle in dev (no router yet) | low | low | Phase 2 lands the router before Phase 5 wires the locale switch |

---

## 6. Mapping to the MR JSON-LD session patterns

For traceability — each MR pattern's local analog:

| MR pattern | MR file (Madison Reed) | Local analog | Local file |
|---|---|---|---|
| ad-002 route-handler-vs-CMS split | route-handler vs CMS additionalScripts | N/A — single source (build-time prerender) | — |
| ad-003 FAQ HTML allowlist | `mr_modules/cms/lib/jsonLd/sanitize.js` | `stripHtml` + `allowlistHtml` | `src/seo/json-ld/sanitize.js` |
| ad-004 schema-builders-in-jsonld-subdir | `mr_modules/cms/lib/jsonLd/*.js` | per-schema builder per file | `src/seo/json-ld/*.js` |
| ad-005 unified additionalScripts pipeline | `content.renderOptions.additionalScripts[]` | single `<script type="application/ld+json">` emitting `@graph` | `useStructuredData()` in App.vue |
| ad-006 `pushJsonLdToContent` helper | `mr_modules/cms/lib/jsonLd/index.js` | `buildSiteJsonLd({ locale })` | `src/seo/json-ld/index.js` |
| dp-001 builder utility design | per-builder pure-function pattern | same | `src/seo/json-ld/*.js` |
| dp-004 idempotent push | dedup via `@id` | dedup via single emission + `@unhead` `key` | `useStructuredData()` |
| rr-005 BROKEN-IN-CMS detection methodology | CMS state audit before any change | curl-based audit in Phase 0 | `scripts/seo-audit.mjs` |

---

## 7. Effort estimate

| Phase | Item | Days |
|---|---|---|
| 0 | Audit + baseline capture | 0.25 |
| 1 | Technical SEO foundations | 0.5 |
| 2 | Static prerender via vite-ssg | 1.5 |
| 3 | On-page SEO polish | 0.5 |
| 4 | JSON-LD architecture | 2.0 |
| 5 | International SEO | 0.5 |
| 6 | Mobile + CWV verification | 0.25 |
| 7 | CI + monitoring | 0.5 |
| 8 | Hostinger deployment + GA consent | 1.0 |
| | **Total** | **7.0** |

Comparable in scope to a Phase 7 + Phase 8 polish round of the original Vue migration. Phase 2 (prerender) and Phase 4 (JSON-LD) are the load-bearing work. Phase 1 / 3 / 5 are mechanical once those are in place.

---

## 8. Testing checklist

Run after each phase; record results in §10.

- [ ] `npm run build` exits 0, no warnings.
- [ ] `npm run precheck` green (including the new `check-json-ld` and `seo-audit` gates from Phase 7).
- [ ] `curl -sS file://./dist/index.html | grep -c 'application/ld+json'` returns `1`.
- [ ] `curl -sS file://./dist/es/index.html` contains the same.
- [ ] `curl -sS file://./dist/index.html | grep '<title>'` shows the EN title, not `I'm Kyo`.
- [ ] `curl -sS file://./dist/es/index.html | grep '<html'` shows `lang="es"`.
- [ ] Built HTML contains the rendered hero section text (curl + `grep -o 'CRISTIAN D. MORENO'`).
- [ ] Schema.org validator passes for both locales.
- [ ] Google Rich Results Test shows the Person + ProfilePage entities.
- [ ] Twitter Card Validator shows correct preview for both URLs.
- [ ] OpenGraph.xyz preview shows correct preview for both URLs.
- [ ] Lighthouse mobile SEO ≥ 95; desktop SEO = 100.
- [ ] Both locale URLs in `sitemap.xml`.
- [ ] `robots.txt` references the sitemap.
- [ ] Locale toggle navigates between `/` and `/es/` without full page reload (history.pushState only).
- [ ] Legacy `?language=es` URL redirects to `/es/`.
- [ ] Hard refresh on `/es/` (no JS) shows ES title + ES meta description.

---

## 9. Resolved decisions (v3)

All inputs are confirmed; the plan below reflects them.

| # | Decision | Resolution | Implication |
|---|---|---|---|
| 1 | Host + canonical apex | **Hostinger shared hosting, apex `https://kyo.wtf/`** — GH Pages deprecated. | `import.meta.env.BASE_URL = '/'` (no `/kyo-web-online/` prefix). Every URL in JSON-LD / canonical / hreflang / sitemap / OG bakes in `https://kyo.wtf/`. **Deploy via GitHub Actions → build-branch (`deploy`) → Hostinger's native Git integration pulls into `/public_html/`** (AD-11 — manual Hostinger pairing deferred; CI side is in scope). |
| 2 | SSG tool | **`vite-ssg`** (confirmed). | AD-1 stands; Phase 2 unchanged in shape. |
| 3 | `hreflang` granularity | **`hreflang="es"`** (locale-neutral, suits LATAM + Spain). | Sitemap + per-page `<link rel="alternate">` use the bare locale codes. No region suffix. |
| 4 | `<meta name="keywords">` | **Keep.** | Ignored by Google, weakly weighted by Bing, harmless. The composable continues to emit it. |
| 5 | GA consent banner | **Implement** (now in scope). | New AD-12 (Google Consent Mode v2). New Phase 8 covers the implementation. GA bootstrap moves from raw `<script async>` in `index.html` into a consent-gated path. |
| 6 | OG image | **Single shared 1200×630 JPG.** | The portrait + brand mark are the banner's payload — no locale-specific copy. Lives at `public/og-banner.jpg`; absolute URL `https://kyo.wtf/og-banner.jpg`; `og:image:width=1200` + `og:image:height=630` + `og:image:type=image/jpeg` + `og:image:alt` (localized). Sized to satisfy both Facebook (1200×630 recommended) and Twitter `summary_large_image` (works at 2:1; this is ~1.9:1). |

---

## 10. Baseline + measured results

Populated as each phase closes.

### 10.1 Baseline (pre-Phase-1)

| Metric | Value | Captured |
|---|---|---|
| `dist/index.html` byte count | TBD | |
| `<script type="application/ld+json">` blocks in built HTML | 0 | |
| Lighthouse SEO (mobile) | TBD | |
| Lighthouse SEO (desktop) | TBD | |
| Lighthouse Performance (mobile) | TBD | |
| GSC: pages indexed | TBD | |
| GSC: avg. position for `kyonax` | TBD | |
| GSC: avg. position for `cristian d moreno developer` | TBD | |

### 10.2 Post-Phase-2 (prerender lands)

[populated after Phase 2]

### 10.3 Post-Phase-4 (JSON-LD lands)

[populated after Phase 4]

### 10.4 Post-Phase-7 (CI gates active)

[populated after Phase 7]

---

## 11. Out of scope

- Backlink strategy / off-page SEO.
- Content marketing (blog posts).
- A `/blog/` or `/articles/` sub-route (would require `Article` schema and would be Phase 9+).
- E-A-T review schemas (no reviews on the portfolio).
- Local SEO beyond `PostalAddress` on the Person entity (no LocalBusiness — this is a personal site, not a business listing).
- LLM-specific markup (e.g., `llms.txt`) — track for follow-up; can be a 1-hour drop-in after the rest lands.

**(v3 — moved INTO scope after §9 decisions):**
- ~~GA consent banner~~ — now Phase 8 + AD-12 (Google Consent Mode v2).
- ~~Deployment automation~~ — now Phase 8 + AD-11 (Hostinger FTPS via GitHub Actions).

---

## 12. Hydration safety quick reference

The audit confirmed every existing browser-API site is already guarded. This table is the **floor** — every NEW file added under SSG must comply.

| Pattern | Verdict | Reference |
|---|---|---|
| `window.foo` at module load | BANNED — guard with `typeof window !== 'undefined'` or move into `onMounted` | `src/i18n/detect-locale.js` (correct) |
| `document.foo` at module load | BANNED — same | `src/main.js:29` (NEEDS FIX — Phase 2) |
| `navigator.foo` at module load | BANNED — same | `src/i18n/detect-locale.js` (correct) |
| `localStorage` / `sessionStorage` | BANNED at module load. After `onMounted`, OK | `src/i18n/detect-locale.js` (correct) |
| `Intl.DateTimeFormat()` at module load | ALLOWED — standard JS, present in Node | `now-projects-section.vue:_deadline_fmt` (correct) |
| `Intl.DateTimeFormat().resolvedOptions().timeZone` at module load | BANNED in SSG — leaks the build server's TZ. Move to `onMounted` | `site-footer.vue:resolved_tz` (NEEDS FIX — Phase 2) |
| `Date.now()` at module load (when surfaced in render output) | AVOID — leaks build timestamp. Initialize to `0` / null, populate in `onMounted` | `now-projects-section.vue:_now_ms` (NEEDS FIX — Phase 2) |
| `matchMedia(...).matches` at module load | ALLOWED if behind `typeof window` guard AND the initial value matches mobile-first default | `hero.vue:is_desktop` (correct — `?? false`) |
| `IntersectionObserver`, `ResizeObserver`, `MutationObserver` | onMounted only | every existing site (correct) |
| `new Worker(...)` | onMounted only (Vite `?worker` import at module top is fine; the `new` call must be deferred) | `use-project-countdowns.js` (correct) |
| `setInterval` / `setTimeout` in setup | onMounted only | every existing site (correct) |
| `addEventListener` on `window` / `document` | onMounted (and `removeEventListener` in `onBeforeUnmount`) | every existing site (correct) |
| `import.meta.env.SSR` | USE this constant to branch SSG-only code paths. Vite tree-shakes the dead branch at build | n/a (new pattern) |
| Top-level `Vite ?url` / `?raw` / `?worker` imports | ALLOWED — Vite resolves at build, both SSR + client see the same hashed URL | every existing site (correct) |
| Reactive refs initialized from runtime browser state | INITIALIZE to a server-safe default (empty string, `null`, `0`); populate in `onMounted` | `site-footer.vue:host/path/nav_language/viewport` (correct) |

**Optional lint rule (Phase 7):** add an `eslint-plugin-vue` custom check that flags top-level `window`/`document`/`navigator`/`localStorage`/`sessionStorage`/`Date.now()`/`new Worker()` access in `.vue` and `.js` files. Most projects don't bother; this codebase is small enough that the audit + this table is sufficient discipline.

---

## 13. Locale boot model (visual)

```
                  ┌────────────────────────────────────────────────────┐
                  │  CRAWLER / DIRECT VISITOR  hits  https://kyo.wtf/  │
                  └────────────────────────────────────────────────────┘
                                       │
                                       ▼
                        ┌────────────────────────────┐
                        │ Server returns prerendered │
                        │ dist/index.html  (lang=en) │
                        │ - <title> EN               │
                        │ - <meta> EN                │
                        │ - JSON-LD @graph (inLanguage=en) │
                        │ - Rendered hero/skills/exp │
                        │ - <link rel=canonical /> + hreflang trio │
                        │ - AD-10 redirect script   │
                        └────────────────────────────┘
                                       │
                                       ▼ (browser parses HTML, runs inline script SYNCHRONOUSLY)
                  ┌────────────────────────────────────────────────────┐
                  │   AD-10 INLINE SCRIPT  (executes before bundle)    │
                  │  pathname === '/' ?                                │
                  │   ├── ?language=es     → location.replace('/es/')  │
                  │   ├── localStorage=es  → location.replace('/es/')  │
                  │   ├── navigator.lang=es → location.replace('/es/') │
                  │   └── else: stay on '/'                            │
                  └────────────────────────────────────────────────────┘
                                       │ (no redirect → continue)
                                       ▼
                        ┌────────────────────────────┐
                        │  Main bundle loads + parses │
                        │  vite-ssg createApp(...)    │
                        │  router.beforeEach() fires: │
                        │    locale = localeFromRoute(to.path) = 'en'│
                        │    document.documentElement.lang = 'en'    │
                        │  Vue 3 HYDRATES the existing DOM           │
                        │  (no mismatch because i18n was set first)  │
                        └────────────────────────────┘
                                       │
                                       ▼ (hydration done)
                        ┌────────────────────────────┐
                        │  Listeners attach.           │
                        │  onMounted fires:            │
                        │    - matchMedia(is_desktop)  │
                        │    - footer manifest hydrate │
                        │    - countdown tick start    │
                        │    - hud-nav scroll obs      │
                        │  User can now interact.      │
                        └────────────────────────────┘
                                       │
                                       ▼ (user clicks ES toggle)
                        ┌────────────────────────────┐
                        │  setLanguage('es')           │
                        │    router.push('/es/')       │
                        │    router.beforeEach guard:  │
                        │      i18n.locale = 'es'      │
                        │      document.lang = 'es'    │
                        │    Vue re-renders            │
                        │    localStorage.setItem('kyo:lang','es') │
                        │  URL is now /es/, content ES │
                        │  (no full reload)            │
                        └────────────────────────────┘
```

Returning visitor on next session who hits `/` again: the AD-10 inline script sees `localStorage='es'` and bounces to `/es/` before the bundle loads → they get the prerendered Spanish HTML, no flash.

---

## 14. Hostinger deployment runbook (NEW v3)

The operational appendix for AD-11 + Phase 8. Self-contained — anyone with FTP credentials can rebuild the deployment from these contents.

### 14.1 One-time Hostinger setup (MANUAL — deferred)

These are the manual hPanel clicks needed to pair Hostinger ↔ GitHub. Do them once, after the `deploy` branch exists and DNS resolves.

1. **DNS first.** At the domain registrar, set nameservers to `ns1.dns-parking.com` + `ns2.dns-parking.com`. Wait for propagation (1-24h).
2. **SSL.** hPanel → Hosting → `kyo.wtf` → **Domains → Manage** → ensure SSL is "Active" (Let's Encrypt auto-issues 5-30 min after DNS resolves).
3. **Force HTTPS.** hPanel → **SSL** → Force HTTPS toggle ON. Belt-and-suspenders with the `.htaccess` rule.
4. **Git pairing.** hPanel → Websites → kyo.wtf → **Advanced** → **Git** → Connect Repository:
   - Repository URL: `https://github.com/Kyonax/kyo-web-online.git`
   - Branch: `deploy`
   - Install path: `/public_html/`
   - For a public repo (this one): no auth needed. For a private repo: hPanel shows an SSH public key — copy it into GitHub repo Settings → Deploy keys.
5. **Webhook (optional but recommended).** If hPanel exposes a webhook URL for this Git connection: copy it. Then GitHub repo → Settings → Webhooks → Add webhook → paste URL, content type `application/json`, trigger on `push`. Now `deploy`-branch pushes deploy in seconds. Without a webhook, Hostinger polls the branch every few minutes.
6. **First manual deploy.** Push at least one commit to `deploy` (the GH Actions workflow does this on the next `main` push). Then hPanel → Git → click "Deploy". `/public_html/` should now mirror `dist/`.
7. **Verify.** `curl -I https://kyo.wtf/` → 200, `Content-Type: text/html`. `curl -I https://kyo.wtf/sitemap.xml` → 200, `Content-Type: application/xml`. `curl -I https://kyo.wtf/.git/HEAD` → 403 (the `.htaccess` deny rule).
8. **No FTP credentials needed.** Skip the FTP-account creation step.

### 14.2 `public/.htaccess` (full content — committed)

```apache
# Copyright (c) 2026 Cristian D. Moreno — @Kyonax
# Distributed under the terms of GPL-2.0-only — see LICENSE.
#
# Apache/LiteSpeed config for kyo.wtf on Hostinger shared hosting.
# Lives at document root /public_html/.htaccess (copied verbatim from public/).

# === HTTPS + apex canonicalization ==========================================
RewriteEngine On
RewriteCond %{HTTPS} off [OR]
RewriteCond %{HTTP_HOST} ^www\.kyo\.wtf$ [NC]
RewriteRule ^(.*)$ https://kyo.wtf/$1 [R=301,L]

# === Legacy ?language= -> /es/ or / (server-side 301 for crawler accuracy) ==
RewriteCond %{QUERY_STRING} (^|&)language=es(&|$) [NC]
RewriteRule ^$ /es/? [R=301,L]
RewriteCond %{QUERY_STRING} (^|&)language=en(&|$) [NC]
RewriteRule ^(es/?)?$ /? [R=301,L]

# === Trailing-slash consistency =============================================
RewriteRule ^es$ /es/ [R=301,L]

# === MIME types (LiteSpeed lacks AVIF by default) ==========================
<IfModule mod_mime.c>
  AddType image/avif                       avif avifs
  AddType image/webp                       webp
  AddType image/svg+xml                    svg svgz
  AddType application/manifest+json        webmanifest
  AddType application/xml                  xml
  AddType font/woff2                       woff2
</IfModule>

# === Cache-Control ==========================================================
<IfModule mod_headers.c>
  # Hashed build assets: 1 year, immutable (Vite emits content-hashed filenames)
  <FilesMatch "-[A-Za-z0-9_-]{8}\.(js|css|woff2|avif|webp|jpg|jpeg|png|svg|gif|ico)$">
    Header set Cache-Control "public, max-age=31536000, immutable"
  </FilesMatch>
  # Non-hashed images at apex (og-banner, favicons): 30 days
  <FilesMatch "^(og-banner|favicon)\.(jpg|jpeg|png|svg|ico)$">
    Header set Cache-Control "public, max-age=2592000"
  </FilesMatch>
  # HTML, XML, JSON, manifests: short cache, must-revalidate
  <FilesMatch "\.(html|xml|json|webmanifest|txt)$">
    Header set Cache-Control "public, max-age=300, must-revalidate"
  </FilesMatch>

  # === Security headers =====================================================
  Header always set X-Content-Type-Options "nosniff"
  Header always set X-Frame-Options "SAMEORIGIN"
  Header always set Referrer-Policy "strict-origin-when-cross-origin"
  Header always set Permissions-Policy "geolocation=(), microphone=(), camera=(), interest-cohort=()"

  # HSTS — enable AFTER 1-2 weeks of clean HTTPS. Sticky in browsers.
  # Header always set Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"

  # Content-Security-Policy — tune to actual third parties.
  # The list below covers GA + Google Tag Manager + the existing fonts/images.
  # Header always set Content-Security-Policy "default-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline' https://www.googletagmanager.com https://www.google-analytics.com; font-src 'self' data:; connect-src 'self' https://www.google-analytics.com; frame-ancestors 'self';"
</IfModule>

# === Compression (LiteSpeed serves gzip + brotli by default; mod_deflate is fallback)
<IfModule mod_deflate.c>
  AddOutputFilterByType DEFLATE text/html text/css text/xml text/plain \
    application/javascript application/json application/xml \
    image/svg+xml font/woff2
</IfModule>

# === Default index =========================================================
DirectoryIndex index.html

# === Error pages ===========================================================
ErrorDocument 404 /index.html

# === Block public access to .git/ (Hostinger Git deploy clones into /public_html/)
RedirectMatch 403 ^/\.git(/.*)?$
# Defensive duplicate (some LiteSpeed builds skip RedirectMatch under specific configs):
<IfModule mod_rewrite.c>
  RewriteRule "(^|/)\.git" - [F,L]
</IfModule>

# Also block other dotfiles that might leak from the cloned branch (.gitignore, .gitattributes, etc.)
<FilesMatch "^\.">
  Require all denied
</FilesMatch>
```

**Notes:**
- The `404 → /index.html` line is a fallback so any unhandled path (e.g. a bookmark from a future SPA route) lands on the homepage instead of an Apache default 404. With only `/` and `/es/` prerendered, this also catches `kyo.wtf/foo` gracefully. Replace with a dedicated `/404.html` if/when one exists.
- The hashed-asset regex `-[A-Za-z0-9_-]{8}\.(js|css|...)$` matches Vite's default filename pattern (`name-HASH.ext`). Verify after first build that hashes are 8+ chars; adjust if Vite's config changes.
- HSTS + CSP are intentionally commented out — enable in a follow-up PR after live verification.

### 14.3 `.github/workflows/deploy.yml` (build-branch pattern)

```yaml
# Copyright (c) 2026 Cristian D. Moreno — @Kyonax
# Distributed under the terms of GPL-2.0-only — see LICENSE.
name: Build and push to deploy branch

on:
  push:
    branches: [main]
  workflow_dispatch:

concurrency:
  group: deploy-${{ github.ref }}
  cancel-in-progress: false

jobs:
  build-and-push:
    runs-on: ubuntu-latest
    timeout-minutes: 15
    permissions:
      contents: write   # required to force-push the deploy branch
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run precheck gate
        run: npm run precheck

      - name: Build site
        run: npm run build

      - name: Push dist/ to deploy branch
        uses: JamesIves/github-pages-deploy-action@v4
        with:
          folder: dist
          branch: deploy
          single-commit: true
          commit-message: "Build ${{ github.sha }}"
          git-config-name: github-actions[bot]
          git-config-email: 41898282+github-actions[bot]@users.noreply.github.com
```

**Behavior:**
- Push to `main` → builds → force-pushes `dist/` to `deploy` as a single commit. `deploy` branch always holds exactly one commit = the latest build.
- `concurrency` group prevents two deploys from racing (a later push cancels nothing — it just queues behind, so deploys are serial).
- `permissions: contents: write` is the minimum scope the auto-provisioned `GITHUB_TOKEN` needs to push to the same repo. No extra secrets.
- `npm run precheck` runs first — any precheck / lint / type / i18n / json-ld / seo-audit failure blocks the push to `deploy`. Production never receives a broken build.
- `single-commit: true` keeps `deploy`'s git history flat. Repo footprint stays small over time.

**Hostinger picks up the change:** if the GitHub webhook is wired into hPanel (§14.1 step 5), Hostinger pulls within seconds. Without webhook, polling latency is a few minutes. Either way the manual "Deploy" button in hPanel is always available as the forcible-pull lever.

### 14.4 Branch protection for `deploy`

GitHub repo → Settings → Branches → Add classic rule:
- Branch name pattern: `deploy`
- "Restrict who can push to matching branches" → allow only `github-actions[bot]`.
- "Allow force pushes" → Specific actors → `github-actions[bot]` (the workflow needs this; humans don't).
- Disable PR review requirements for this branch.

This keeps anyone (including the repo owner) from accidentally hand-editing the deploy branch — every change must come through CI.

### 14.5 Manual deploy (fallback paths)

**A — local build → push to `deploy` by hand.** If GitHub Actions is unavailable:
```sh
npm ci
npm run build
cd dist
git init -b deploy
git add -A
git commit -m "Manual build $(date -u +%FT%TZ)"
git remote add origin git@github.com:Kyonax/kyo-web-online.git
git push --force origin deploy
```
Then hPanel → Git → "Deploy" to pull.

**B — File Manager upload.** If git is unavailable on Hostinger's side too:
1. Locally: `npm run build`.
2. hPanel → Files → File Manager → navigate to `/public_html/`.
3. Drag-and-drop the **contents** of `dist/` (not the folder itself). Overwrite when prompted.

**C — FileZilla over FTPS.** Same as B but via FTP client; only available if an FTP account exists in hPanel.

### 14.6 Rollback

Four options, in order of preference:

1. **`git revert <bad-commit>` on `main`** + push. CI rebuilds + force-pushes the previous state to `deploy` → Hostinger pulls. Cleanest; full audit trail.
2. **Manual workflow re-run.** GitHub Actions tab → pick a previous successful run → "Re-run all jobs" with the older commit's tree. Force-pushes that older build to `deploy`.
3. **Force-push `deploy` to a previous SHA directly:**
   ```sh
   git fetch origin deploy
   git push --force origin <previous-deploy-sha>:deploy
   ```
   Useful if `main` itself is fine but the build went bad on something like a missing asset.
4. **Hostinger hPanel → Git → Deploy older commit.** hPanel keeps the last N deploys; you can pick one to redeploy without going through GitHub.

`.htaccess` rollback follows the same flow — the file is under version control, ships with every build, and `git revert` of the `.htaccess` change redeploys the previous config.

---

## 15. References

- Schema.org Person: https://schema.org/Person
- Schema.org Organization: https://schema.org/Organization
- Schema.org ProfilePage: https://schema.org/ProfilePage
- Schema.org Occupation: https://schema.org/Occupation
- Schema.org CreativeWork: https://schema.org/CreativeWork
- Schema.org BreadcrumbList: https://schema.org/BreadcrumbList
- Google: Person markup guide — https://developers.google.com/search/docs/appearance/structured-data/person
- Google: Profile pages markup — https://developers.google.com/search/docs/appearance/structured-data/profile-page
- Google: Hreflang — https://developers.google.com/search/docs/specialty/international/localized-versions
- vite-ssg — https://github.com/antfu-collective/vite-ssg
- `@unhead/vue` — https://unhead.unjs.io/integrations/vue
- MR session — `~/Documents/github-kyonax/dot-files/.config/doom-mac/gptel-directives/sessions/mr-seo-structured-data-architecture.md`
- Local skill — `~/.claude/skills/seo-web-quality/` (rules/technical-seo.md, on-page-seo.md, structured-data.md, mobile-seo.md, international-seo.md, audit-checklist.md)
- Hostinger — Document root: https://www.hostinger.com/tutorials/how-to-upload-your-website
- Hostinger — `.htaccess` / DirectoryIndex: https://www.hostinger.com/tutorials/change-index-page-in-htaccess-with-directoryindex
- Hostinger — FTP accounts: hPanel → Files → FTP Accounts
- Hostinger — Free SSL: https://www.hostinger.com/free-ssl-certificate
- Hostinger — Point a domain: https://www.hostinger.com/support/1863967-how-to-point-a-domain-to-hostinger/
- Hostinger — Git deploy: https://www.hostinger.com/support/1583302-how-to-deploy-a-git-repository-in-hostinger/
- Google Consent Mode v2: https://developers.google.com/tag-platform/security/guides/consent
- JamesIves/github-pages-deploy-action: https://github.com/marketplace/actions/deploy-to-github-pages
- LiteSpeed compression: https://docs.litespeedtech.com/lsws/cp/cpanel/compression/
- AVIF MIME on Apache/LiteSpeed: https://shortpixel.com/blog/avif-mime-type-delivery-apache-nginx/
