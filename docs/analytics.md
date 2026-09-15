# Analytics

How <https://kyonax.com> counts its visitors. The site uses **Umami Cloud**.
Umami sets no cookies, so the site has no consent banner. It replaced Google
Analytics 4 (Consent Mode v2 behind a cookie banner) in September 2026.

## Why Umami Cloud now

- **Cookieless, so no banner.** Umami identifies no one across sites and
  stores no cookie, so the site has nothing to ask consent for. The banner went
  away, and with it its component, its copy in two languages, its focus
  handling and the `kyo:consent` key.
- **Free at this size.** The Hobby plan costs nothing: 100K events a month
  (each pageview and each custom event counts as one), six months of data
  retention. Its website cap never comes into play, because kyonax.com is one
  website and the blog is served from the same origin. Check usage under
  Settings → Usage in the dashboard.
- **Region.** The account's data lives in Umami's US region (Umami Cloud runs
  in the US and the EU).
- **No servers to run.** A self-hosted Umami needs a database, a container, a
  tunnel and backups. The Cloud tracker is the same script as the self-hosted
  one, so moving later means changing a URL, not rewriting anything (see the
  last section).

## What is tracked

**Pageviews, automatically.** The tracker also records client-side route
changes (it hooks `history.pushState`), so the site never calls
`umami.track()` for a page. A manual call would count every page twice.

Umami records the page path, the referrer, the browser, the OS, the device type
and a country derived from the IP address. It does not store the IP address.

The tracker tag, as `use-analytics.js` builds it:

| Attribute | Value | Why |
|---|---|---|
| `src` | `https://cloud.umami.is/script.js` | Umami Cloud's tracker. |
| `data-website-id` | `986ec25b-3715-4d9e-8e63-f168650bfac7` | The one website on the account. A public identifier, not a secret (see `.github/SECURITY.md`). |
| `data-do-not-track` | `true` | A browser that sends Do Not Track is not counted. |
| `data-exclude-search` | `true` | Query strings are dropped from recorded URLs. This also drops `utm_*` campaign tags, so remove it if campaign reports are ever wanted. |
| `data-domains` | `kyonax.com,www.kyonax.com` | Only the production hosts report. Local builds, the e2e server and the Lighthouse runs, all on `localhost` or `127.0.0.1`, never reach the dashboard. |

**Events, declared by attribute, never by code.** An element that carries
`data-umami-event="<name>"` sends that event when it is clicked. Each
`data-umami-event-<prop>="<value>"` on the same element becomes a property of
the event.

| Event | Element | Properties |
|---|---|---|
| `cv-download` | The CV link in `src/widgets/hud-nav.vue` | `data-umami-event-lang` |
| `language-toggle` | The language choice in `src/widgets/language-toggle.vue` | `data-umami-event-to` |
| `youtube-play` | The play button of `src/components/ui/youtube-facade.vue` | `data-umami-event-id` |
| `outbound` | The profile links in `site-footer.vue` and `blog-footer.vue` | `data-umami-event-url` |
| `org2html-github` | Every link to the org2html repository | none |
| `share` | Every destination in the nav's share popup, `src/widgets/share-sheet.vue` (blog pages only) | `data-umami-event-to`: `x`, `bluesky`, `mastodon`, `linkedin`, `hackernews`, `reddit`, `copy`, `native` |
| `code-wrap` | The WRAP toggle on an article's code blocks, added by `src/composables/article-enhance.js` | none |
| `support` | The article support link (planned) | none |

Event names stay under 50 characters and property values are strings. To add
an event, put the attribute on the element. No code change is needed.

One trap: on a same-tab `<a>`, the tracker cancels the click, sends the event,
then re-navigates with `location.href`. That drops a `download` attribute and
turns a client-side route push into a full page load. It leaves
`target="_blank"` links and `<button>`s alone. That is why the CV link in
`hud-nav.vue` is a `_blank` link; the language choice is already a button.

## Where it lives in the code

- **`src/data/data.js`**: the `ANALYTICS` export (`provider: 'umami'`,
  `host: 'https://cloud.umami.is'`, `websiteId`, `domains`). It is not an
  environment variable: the repo has none, and the id is public. An empty
  `websiteId` loads nothing.
- **`src/composables/use-analytics.js`**: client-only, called once from
  `App.vue`. After mount it appends the tracker `<script>` with
  `document.createElement` and `append`, never `innerHTML` or
  `document.write`. It runs once per page load (`window.__umami_loaded`), so a
  client-side route change does not add a second tag. It appends nothing when
  `localStorage['umami.disabled']` is set, or when storage is blocked and the
  flag cannot be read.
- **The opt-out toggle on the privacy page** (`/privacy`, `/es/privacy`):
  `src/components/analytics-opt-out.vue`, mounted by `src/views/privacy.vue`,
  sets or clears `umami.disabled`. It renders only after mount, so the
  prerendered HTML and the hydrated page agree, and it stays hidden when
  storage is blocked.
- **`umami.disabled`** is also the key the Umami tracker itself honours. To
  keep your own visits out of the numbers, run
  `localStorage.setItem('umami.disabled', 1)` in the browser's console on the
  site, once per browser.
- **Not analytics:** the YouTube facade's click-to-play prompt stores its own
  answer under `kyo:yt-consent`. The old `kyo:consent` key is retired, and
  nothing reads or writes it.
- **CSP:** `public/.htaccess` sets no `script-src`, so the tracker needs no
  allowance. If a `script-src` is ever added, it must list
  `https://cloud.umami.is`.

## How to test

`tests/e2e/analytics.spec.js` runs against the built site like every other
browser spec:

```sh
npm run build
npm run test:e2e -- tests/e2e/analytics.spec.js
```

It is hermetic. `cloud.umami.is/script.js` is answered with an empty script,
and every other request to an Umami or Google host is aborted. No run sends a
pageview to the dashboard or reaches Google, and the spec passes offline. It
covers one page of every kind in both languages (landing, archive, article,
resume, privacy) and asserts:

1. no cookie banner, and no request to Google, on any page;
2. no request to Google even when an old visit left `kyo:consent=granted`
   behind;
3. exactly one Umami tracker after hydration, with the site's website id and
   `data-do-not-track="true"`, still one after a client-side language switch;
4. no tracker and no request to Umami once `umami.disabled` is set, checked
   against a control load without the flag;
5. nothing writes `kyo:consent`, and the landing sets no cookie.

It was written to fail on the Google Analytics build (the banner on every page,
gtag.js loaded for returning visitors, no tracker to count) and to pass on the
Umami build.

To check production by hand, open DevTools → Network and filter on `umami`.
You should see one `script.js`, then one request to Umami's `/api/send` for
each pageview. With `umami.disabled` set you should see neither. The
dashboard's Realtime view shows the visit.

## The migration to self-hosted Umami

**Documented, not built.** Do this when the Hobby limits start to matter (100K
events a month, six months of history) or when owning the raw data is worth
running a database.

**Target.** The `umami` Docker image with a Postgres container, on the
nano-vps, published through the existing Cloudflare tunnel at
<https://stats.kyonax.tech>. The VPS has no Postgres today, and Plan B on it is
held.

1. **Provision.** Start a Postgres container with a persistent volume and a
   backup job. Start the `umami` container with `DATABASE_URL` pointing at it
   and its own `APP_SECRET`. Publish no port on the host: only the tunnel
   reaches it.
2. **Expose.** Add `stats.kyonax.tech` as a public hostname on the tunnel,
   routed to the Umami container's port 3000. Log in and change the default
   admin login at once.
3. **Create the website.** Add `kyonax.com`. The self-hosted instance issues a
   new website id (a UUID). Write it down, because the exported rows still
   carry the Cloud id.
4. **Export the Cloud data first.** In the Cloud dashboard, go to Settings →
   Data → Export. The export is gzipped CSV (pageviews, events, sessions, event
   data), one website at a time. The API at <https://api.umami.is/v1>, with a
   key from Settings → API keys, is the scripted alternative. Hobby keeps six
   months, so anything older is already gone. Export on a schedule before the
   move if the history matters.
5. **Import into Postgres.** Umami documents no Cloud → self-hosted import (its
   import service only goes into Cloud, on Pro). Load the CSVs into the
   matching tables (`session`, `website_event`, `event_data`) with `COPY`,
   rewriting the website id to the new one. Rehearse on a scratch database
   first.
6. **Switch `src`.** Point `ANALYTICS.host` in `src/data/data.js` at
   `https://stats.kyonax.tech`. The tracker's `src` already follows the host;
   add a `data-host-url` attribute that follows it too. Replace the website id
   (here, in `.github/SECURITY.md` and in the spec, which pins both the id and
   the `cloud.umami.is` host). Update the CSP note above.
7. **Verify, then retire Cloud.** Run the e2e spec, watch the Network panel and
   the self-hosted Realtime view on production. Export from Cloud one last time
   to catch the tail, then delete the Cloud website.

### Getting past ad blockers

Many blockers drop requests to `cloud.umami.is`, and they would drop a known
stats host too. The fix is to serve the tracker and its collect endpoint as
first-party paths under kyonax.com, with `data-host-url` pointing at
kyonax.com. Hostinger's shared hosting runs LiteSpeed without `mod_proxy`, so
an `.htaccess` proxy rule is not an option. That leaves two routes:

- **A PHP passthrough.** One small script streams `script.js` (cached), and
  another forwards the collect `POST` to Umami. It must pass the visitor's IP
  and User-Agent along, or every visit geolocates to the server and reads as
  the same browser.
- **A Cloudflare route in front of the domain.** A Worker bound to a path on
  kyonax.com does the same forwarding. This needs the domain's traffic proxied
  through Cloudflare.

A self-hosted instance can also rename its script and endpoint with the
`TRACKER_SCRIPT_NAME` and `COLLECT_API_ENDPOINT` environment variables. Do Not
Track and `umami.disabled` keep working through any of these. None of it is
built now.
