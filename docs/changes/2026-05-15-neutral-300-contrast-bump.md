# Rollback note — `--clr-neutral-300` contrast bump

**Date:** 2026-05-15
**Reason:** WCAG 2.2 Level AA — 1.4.3 (Contrast Minimum) failed on semantic text using `--clr-neutral-300` on the page's `#000` background. The old value sat at 4.48:1 contrast, just below the 4.5:1 bar.

## The single change

**File:** `src/scss/abstracts/_variables.scss` (line 60, inside the `neutral` map)

**Before:**
```scss
300: hsl(0, 0%, 45%),
```

**After:**
```scss
300: hsl(0, 0%, 48%),
```

## Math

| Value | sRGB | Relative luminance | Contrast on `#000` | WCAG 1.4.3 |
|---|---|---|---|---|
| `hsl(0, 0%, 45%)` (old) | `#737373` | 0.174 | **4.48:1** | ✗ fails (< 4.5:1) |
| `hsl(0, 0%, 48%)` (new) | `#7a7a7a` | 0.197 | **4.92:1** | ✓ passes (margin: 0.42) |

Visual delta: 3 percentage points of HSL lightness on mid-gray. Indistinguishable to the eye without a color sampler.

## Consumers affected (cascade scope)

All 16 SCSS rules that reference `var(--clr-neutral-300)` inherit the new value automatically. No template / consumer changes required. Key affected elements:

- `hero.vue` — `.hero__meta-label` (the originally flagged element)
- `now-projects-section.vue` — `.__milestone`, `.__countdown-tz`, `.__no-link`, `.__index-num` (decorative, no impact), `.__featured-*` variants
- `experience.vue` — muted specs / dates line
- `skills.vue` — level chips / muted notes
- `site-footer.vue` — signature manifest values
- `modal.vue` — subtitle muted color
- `section-heading.vue` — subtitle color
- `youtube-facade.vue` — attribution chip text
- `hero-visual.vue` — `__meta` (decorative, CSS-content; visually inherits)

The `.hud-deco` decorations still use the token, but their text lives in `content: attr(data-text)` (not in the DOM) so the contrast bump has no perceptible impact — they remain at the same low-opacity `0.32` painted hue.

## How to revert

If the brightness bump turns out to be perceptible or unwanted aesthetically:

```bash
git diff src/scss/abstracts/_variables.scss
```

or hand-edit `src/scss/abstracts/_variables.scss` line 60 back to:
```scss
300: hsl(0, 0%, 45%),
```

Run `PATH=/opt/homebrew/opt/node/bin:$PATH npm run build` after either path to regenerate `dist/`.

## Verification commands

```sh
PATH=/opt/homebrew/opt/node/bin:$PATH node scripts/precheck.mjs   # 8/8 gates must stay green
PATH=/opt/homebrew/opt/node/bin:$PATH npm run build               # both prerendered locales must pass seo-audit
```

## Why not introduce a new semantic token instead?

Option B (token bump) was chosen over Option C (introduce `--clr-text-muted`) because:
- Single SCSS value edit vs ~12 SCSS-rule consumer edits.
- Token hierarchy stays intact (300 still dimmer than 200, brighter than 400).
- The "muted label" design intent doesn't change — only the underlying numeric value.
- Easier to revert (one line) if the visual feels off.
