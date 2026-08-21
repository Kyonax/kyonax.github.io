# Project Cards — Color, Symbols & State Reference

How the landing project cards look and behave, per status.

Two surfaces, two selectors — do not collapse them:

| Surface | Selector | Cap | What it is |
|---|---|---|---|
| NOW cards | `SHOWCASE_KEYS` / `getShowcaseMap()` | `SHOWCASE_LIMIT` (3) | Detailed countdown cards. No pager. Order is a dependency: org2html first, then kyo-blog, then reckit. |
| FEATURED chips | `FEATURED_KEYS` / `getFeaturedKeys()` | `FEATURED_MAX` (9) | Compact status + name + version. Required. Current roster: org2html, reckit, nano-core. |

A future NOW backend payload is capped at 3. Featured is a separate flag, not a leftover of the old carousel. Do not delete the featured row in a later redesign.

Source of truth: `src/data/projects.js` and
`src/views/components/sections/now-projects-section.vue`.

---

## 1. How color works

Every card's color comes from **one variable**: `--state-color`. The template
resolves a project's `status` → a palette **color family** and writes it inline
on the card root:

```
--state-color: var(--clr-{family}-100);   /* e.g. var(--clr-accent-100) */
```

Every colored part of the card then reads `var(--state-color, var(--clr-primary-100))`
— so one property themes the whole card. Nothing hardcodes a color.

| Status | Family | Color | Reads as |
|---|---|---|---|
| `WORKING_ON` | accent | magenta `#ee3ec5` | live client work, "now" |
| `DONE` | success | green `#6cb42a` | delivered / finished |
| `LIVE` | success | green `#6cb42a` | shipped & running |
| `IN_PROGRESS` | primary | yellow `#f9cd26` | actively building |
| `UPDATING` | primary | yellow `#f9cd26` | being revised |
| `ON_HOLD` | warning | orange `#f98b26` | paused |
| `ON_TODO` | secondary | blue `#265ef9` | queued |
| `RELEASE` | secondary | blue `#265ef9` | release pending |
| `DEPRECATED` | error | red `#d1263d` | retired |

**Colored parts:** the status word, the status indicator, the card border (on
hover/proximity), the element-flare glow, and every countdown time segment.

**Ended override:** an `.is-ended` card sets `--state-color: var(--clr-warning-100)`,
recoloring the entire card to orange in one line — no per-element changes.

---

## 2. How symbols work

The header status **indicator changes shape by state** (not just color). Three
branches:

| Status | Indicator | What it is |
|---|---|---|
| `DONE` | ✓ check glyph (``) | Nerd-Font `icon-glyph` |
| `WORKING_ON` / `IN_PROGRESS` | animated 3×3 dot-matrix | `<UiStateGrid>` — cells pulse in a staggered ripple |
| everything else | 8px filled square + glow | `.state-square` |

`.state-square`: `8px`, `background: var(--state-color)`, plus a matching
`box-shadow: 0 0 6px` glow at 60% of the state color.

Other card glyphs (all Nerd-Font, `aria-hidden`, from `data-text`):

| Const | Codepoint | Use |
|---|---|---|
| `GLYPH_REPO` | `` | GitHub repo link |
| `GLYPH_LINK` | `` | external-link marker beside repo |
| `GLYPH_FEATURED` | `` | star, FEATURED section head |
| `GLYPH_FEATURED` | `` | star, FEATURED section head |
| `GLYPH_PREV` / `GLYPH_NEXT` | `` / `` | modal media chevrons |

---

## 3. What the card should have (anatomy, top → bottom)

Flat `--clr-neutral-500` background, `1px` hairline border, `element-flare` edge,
`isolation: isolate` + `contain: layout paint`.

1. **Header** — `__status` (indicator + status word, colored `--state-color`,
   700 weight) on the left; `__index-num` (`#01`, neutral-300) right-aligned.
2. **Name block** — Geomanist name (`__name`, neutral-100) + a `.kyo-chip`
   version badge (`v0.3.0`, yellow pill).
3. **Milestone** — a mono `// milestone label` line (neutral-300).
4. **Description** *(optional)* — short blurb (neutral-300); full text mirrored
   into `.sr-only` for a11y/SEO.
5. **Countdown panel** — hairline box of mono time `__segment` tiles
   (`0d 00h 00m 00s`), each state-colored on a 10% state-tint bg, with a head
   label + a `AMERICA/BOGOTA` timezone stamp.
6. **Link row** — dashed top border; repo glyph + name + small external glyph.
   Cards with no URL show a dashed `__no-link` note so footers stay level.

**Countdown has four temporal branches:**

| Branch | When | Head | Segments |
|---|---|---|---|
| Count-up | `WORKING_ON` (live) | `STARTED IN` + start date | tick **up** every second |
| Count-down | not ended, has deadline | `ENDS IN` + deadline date | remaining to next deadline |
| Ended | deadline passed | `ENDED IN` | frozen |
| Completed | fallback | `ENDED IN` | frozen from `ended` timestamp |

---

## 4. How it should look per state

| State (root class) | Border | Motion | Notes |
|---|---|---|---|
| **Interactive** (`.has-modal`) | tints toward `--state-color` as cursor nears (`--prox`) | lifts up to `-4px`; flare fades to 0.06 | hover snaps to full lift + state-color border |
| **Link-only / inert** (`.is-static`) | stays hairline | none | no lift, no border change, no flare |
| **Ended** (`.is-ended`) | orange (warning) | as above | whole card recolored orange; countdown frozen |
NOW is three detailed cards. No ghost slots, no section pager. Modal
media may still page when a project has more than one image.

**FEATURED chips** (`__featured-item`) are a required second surface.
They reuse the same grammar (proximity border, flare, `is-static`) but
pin the flare to **primary yellow** (not `--state-color`) and show only:
mono status head · Geomanist name · mono version. Their `.state-square`
/ version color still follow `--state-color`. Whole-chip click is a
stretched `<a>` overlay (WCAG 2.5.3). Static chips (`!url`) get the
explicit no-link note.

---

*Concise reference. For the full visual system see `docs/styling.md` (§7, §11.5,
§16). Token values are canonical in `src/scss/abstracts/_variables.scss`.*
