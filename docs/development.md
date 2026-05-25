# Development notes

## Expected console noise (browser extensions, not project bugs)

When developing locally or browsing the production site, the following console
output may appear depending on which browser extensions are installed. These
originate from extension content scripts injected by the browser — they do
**not** come from project code and **cannot** be silenced from the page side.

### MetaMask (and other wallets using Agoric SES `lockdown`)

```
SES Removing unpermitted intrinsics                          lockdown-install.js:1:203656
  Removing intrinsics.%MapPrototype%.getOrInsert
  Removing intrinsics.%MapPrototype%.getOrInsertComputed
  Removing intrinsics.%WeakMapPrototype%.getOrInsert
  Removing intrinsics.%WeakMapPrototype%.getOrInsertComputed
  Removing intrinsics.%DatePrototype%.toTemporalInstant

TypeError: can't access property "catch", n() is undefined   index.js:1:1108
```

- `lockdown-install.js` is Agoric's SES shim, shipped verbatim by MetaMask. It
  hardens the JavaScript intrinsics on every page MetaMask is enabled on. The
  "Removing intrinsics" lines are informational, not errors — SES is stripping
  modern proposal-stage methods (`Map.prototype.getOrInsert`, etc.) that violate
  its frozen-realm invariants.
- The follow-up `TypeError: ... n() is undefined` at `index.js:1:1108` is the
  MetaMask content-script entry failing on pages that don't expose a wallet
  provider. Harmless on a non-Web3 site.

### How to confirm a console message is extension-sourced

1. Open devtools → **Network** tab → reload the page.
2. Search for the filename (e.g. `lockdown-install.js`). If it does **not**
   appear in the Network log, it isn't being fetched by the page — extension
   content scripts are injected by the browser and bypass the page's network
   layer.
3. Click the source link on the right of the console message. If the URL bar
   shows `moz-extension://...` (Firefox) or `chrome-extension://...` (Chrome),
   the source is an extension, not the project.

### Silencing the noise per-profile

- **Firefox:** devtools → Console → gear icon → **Persist Logs off** and use
  the filter input (e.g. `-SES -lockdown`) to hide the lines. Negative-match
  filters survive reloads within the session.
- **Chromium:** devtools → Console → filter input supports `-url:` exclusions
  (e.g. `-url:chrome-extension://`). Persists across reloads for the profile.
- **Recruiter-demo workflow:** use a clean browser profile with no wallet /
  ad-block extensions when screen-sharing the portfolio. This is the cleanest
  signal-to-noise on a recruiter call.

### Verification checklist before assuming "extension noise"

Project-sourced errors look similar at a glance. Always verify before
dismissing:

- [ ] Network tab does not list the file.
- [ ] Source link opens a `moz-extension://` or `chrome-extension://` URL.
- [ ] The error reproduces in a private window with **no extensions enabled**?
      If yes, it's project-sourced — investigate normally.
