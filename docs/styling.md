# Kyo Web — Complete Styling Reference

A single-file, exhaustive map of the visual system for `kyo-web-online`
(Cristian D. Moreno — Kyonax personal site). Covers the design-token
foundation, global utilities, mixins, animations, every UI primitive, all
navigation chrome, **every modal / pop-up / overlay**, and each landing
section. Values are transcribed from source so this doc doubles as a spec.

> **Aesthetic in one line:** dark cyberpunk "HUD" — near-black OKLCH
> background, a single neon-yellow brand accent (`#f9cd26`), monospace +
> geometric display type, hairline borders, corner brackets, scanlines,
> Japanese-kanji watermarks, and GPU-composited neon glows/flares.

---

## 1. Architecture & Loading Order

SCSS lives in `src/scss/`, authored with the **modern Sass module system**
(`@use` / `@forward`, no `@import`). Components use scoped
`<style lang="scss">` blocks.

```
src/scss/
├── main.scss                  ← single global entry (loaded once via src/main.js)
├── abstracts/
│   ├── _index.scss            ← @forward variables + mixins (emits ZERO css)
│   ├── _variables.scss        ← $colors, $typo-scale, $breakpoints maps
│   ├── _theme.scss            ← emits :root tokens + global utility classes
│   └── _mixins.scss           ← font-face, media queries, glow, chip, skeleton…
└── base/
    ├── _index.scss            ← @use global + typography
    ├── _global.scss           ← reset, scrollbars, focus, sr-only, reduced-motion
    └── _typography.scss       ← @font-face registrations + body baseline
```

**Two-tier injection model** (from `vite.config.js`):

- `css.preprocessorOptions.scss.additionalData: '@use "abstracts" as *;\n'`
  auto-prepends the **declarations-only** abstracts module to every `.scss`
  file *and every* `<style lang="scss">` block. This makes `$colors`,
  mixins, and `min-media-query()` available everywhere with zero imports.
- `_theme.scss` is deliberately **NOT** forwarded by `abstracts/_index.scss`.
  It emits actual CSS (`:root {…}`, `.cyberpunk-glow`, `.element-flare`,
  `@keyframes`), so it is loaded exactly **once** through `main.scss`.
  Forwarding it would duplicate those rules into every SFC's compiled output.

**Aliases:** `@scss → src/scss`, `@fonts → src/fonts`.

`main.scss` load order:
```scss
@use "abstracts/variables";
@use "abstracts/mixins";
@use "abstracts/theme";   // the only abstracts module that emits CSS
@use "base";
```

---

## 2. Design Tokens

All tokens are emitted as CSS custom properties on `:root` by a Sass `@each`
loop in `_theme.scss`. Colors are authored in **OKLCH** for perceptual
uniformity and verified contrast.

### 2.1 Color palette (`--clr-{family}-{shade}`)

8 families × 5–7 shades = ~50 tokens. The canonical brand color is
`--clr-primary-100` (`#f9cd26`), the page background is `--clr-neutral-500`.

| Family | Role | Key shades |
|---|---|---|
| **primary** | Neon-yellow brand accent | `100 = #f9cd26` (brand), `50` light, `200–500` progressively darker/desaturated |
| **secondary** | Electric blue | `100 = #265ef9` |
| **neutral** | Backgrounds + text ramp | `50` body text (L≈76%, AA), `100` headings/emphasis (L=98.5%, AAA), `200` secondary text, `300` muted text, `400` dark card surface (zinc-700, **not** a text token), `500` page background (L=14.5%), `900` pure black (modal/lightbox overlays) |
| **border** | Semi-transparent white hairlines | `100` default border (`oklch(100% 0 0 / 0.2)`); `50–600` alpha-white ramp all at `/0.2` |
| **success** | Green | `100 = #6cb42a` (used for ORCID badge, "available" status, live dot) |
| **warning** | Orange | `100 = #f98b26` (ended-project state) |
| **error** | Red | `100 = #d1263d` |
| **accent** | Magenta neon (341°) | `100 = #ee3ec5` — the `WORKING_ON` "live now" project highlight |

**Non-palette color tokens** (literal, in `_theme.scss`):
```
--clr-orcid-bg: #a6ce39;   --clr-orcid-fg: #ffffff;
--clr-youtube-red: #ff0000;  --clr-linkedin-blue: #0077b5;
```

Text colors are chosen for WCAG AA: several shades were bumped after contrast
audits (comments in `_variables.scss` document the history — e.g. neutral-50
raised to L=76% for a comfortable AA margin, neutral-300 raised off Tailwind
zinc-500 which failed at ~3.2:1).

### 2.2 Typography scale (`--fs-{100…800}`)

Responsive scale with **three breakpoint tiers** — `small` emits at `:root`,
`medium` re-emits at `min-md`, `large` re-emits at `min-lg`. Root `font-size`
is **12px**, so `rem` math is `value × 12px`.

| Token | small (mobile) | medium (≥1024) | large (≥1200) | Typical use |
|---|---|---|---|---|
| `--fs-100` | 0.95rem (11.4px) | 0.875rem | 0.875rem | captions, HUD chrome, tz labels |
| `--fs-200` | 1.05rem | 1rem | 1.125rem | small labels, chips, specs |
| `--fs-300` | 1.15rem | 1.125rem | 1.25rem | body baseline |
| `--fs-400` | 1.25rem | 1.25rem | 1.5rem | prose / lead |
| `--fs-500` | 1.625rem | 1.75rem | 2rem | sub-headings, modal titles |
| `--fs-600` | 2rem | 2.25rem | 3rem | stat numbers |
| `--fs-700` | 2.375rem | 3rem | 4.5rem | section titles |
| `--fs-800` | 3.125rem | 4rem | 6rem | hero title (lg) |

### 2.3 Breakpoints (mobile-first)

Consumed via `min-media-query($key)` / `max-media-query($key)` mixins.

| Key | Value | px | Target |
|---|---|---|---|
| `sm` | 48em | 768 | landscape phones |
| `md` | 64em | 1024 | tablets |
| `lg` | 75em | 1200 | desktops |
| `xl` | 100em | 1600 | wide displays |

Additional ad-hoc raw media queries appear in components: `max-width: 882px`
(hide scrollbars on touch), `558px`, `414px`, `374px` (progressive hero /
brand-signature text swaps).

### 2.4 Motion token

```
--ease-standard: cubic-bezier(0.4, 0, 0.2, 1);   /* Material standard easing */
```
Used for all "expensive-feel" UI transitions (nav underline, cyber-outline
corner sweep, FAQ chevron). Retunable in one place.

---

## 3. Fonts

Registered in `base/_typography.scss` via the `font-face` mixin (WOFF2-only
`src`, `font-display: swap`, `unicode-range` trimming). In production the LCP
portrait and the primary fonts are `<link rel=preload>`-injected post-hash.

| Family | Weights | Role |
|---|---|---|
| **SpaceMono** | 400, 700 | Primary monospace — cyberpunk display, all HUD/labels/chrome/code |
| **Geomanist** | 400, 700 (900 used) | Geometric sans — headlines, prose body, stat numbers, brand wordmark |
| **SymbolsNerdFontMono** | 400 | Icon glyph font (Nerd Font PUA range `U+E000–F8FF`) |

Body baseline (`base/_typography.scss`):
```scss
body {
  font-family: "SpaceMono", "Roboto Mono", "Courier New", Courier, monospace;
  font-size: var(--fs-300);
  line-height: 1.6;          /* unitless — scales with inherited size */
  letter-spacing: -0.03rem;
}
```

---

## 4. Global Base Styles (`base/_global.scss`)

- **Box model:** `*, *::before, *::after { box-sizing: border-box }`.
- **Smooth scroll:** `html { scroll-behavior: smooth; scroll-padding-top: 4.5rem }`
  (offsets the sticky nav on anchor jumps).
- **Custom scrollbars:** thin, thumb = `--clr-neutral-50` on transparent track,
  10px radius, 8px wide (`::-webkit-scrollbar`); hover brightens to
  `neutral-100`. **Hidden entirely below 882px** (touch devices).
- **Body:** `background: --clr-neutral-500; color: --clr-neutral-50; margin: 0`.
- **Focus ring:** global `:focus-visible { outline: 2px solid --clr-primary-100;
  outline-offset: 2px }`. Scroll containers use inset offset (`-2px`) so the
  ring isn't clipped by overflow.
- **`.sr-only`:** standard visually-hidden clip pattern for screen-reader text.
- **Text selection** (`_theme.scss`): `::selection` / `::-moz-selection`
  paint brand-yellow background with neutral-500 text.
- **Reduced motion:** global `@media (prefers-reduced-motion: reduce)` collapses
  all `animation-duration`/`transition-duration` to `0.01ms`, iteration count
  to 1, and forces `scroll-behavior: auto`. Individual components layer
  additional reduced-motion rules (skeleton freeze, flare hide, etc.).

---

## 5. Mixins (`abstracts/_mixins.scss`)

| Mixin | Purpose |
|---|---|
| `font-face($name,$path,$weight,$style,$range)` | WOFF2 `@font-face` with `font-display:swap` + `unicode-range` presets (`"latin"` default, `"icons"` for Nerd Font PUA, `"all"`, or custom) |
| `min-media-query($key)` / `max-media-query($key)` | Reads `$breakpoints` map → `@media (min/max-width)` wrappers |
| `cyberpunk-glow($color,$blur,$spread,$animated,$speed)` | GPU-composited neon halo. Static `filter: drop-shadow` on host + an opacity-pulsed `::after` (`box-shadow`, `animation: kyo-glow-pulse … alternate`). Rewritten from legacy `box-shadow` animation to avoid Safari per-frame CPU rasterization |
| `kyo-chip` | SpaceMono cap-tracked pill: `1px solid currentColor` border + 8% `currentColor` tint bg. Used by the `.kyo-chip` class **and** by pseudo-elements (FAQ number, experience bullet counter) that can't carry a class |
| `tech-stack-item` / `tech-stack-icon` / `tech-stack-abbr` | Shared chip + corner-cropped square abbreviation used by both project-modal and experience-modal stack lists (extracted from two byte-identical copies) |
| `media-skeleton($z-index)` | Sonar-ripple loading placeholder (see §7) |

---

## 6. Animations & Keyframes

Emitted once, globally, in `_theme.scss` (plus a few section-local ones).

| `@keyframes` | Motion | Where |
|---|---|---|
| `media-skeleton-ripple` | translate+scale sonar rings, opacity 0→0.55→0 | image skeletons |
| `kyo-glow-pulse` | opacity 0.55↔1 | `cyberpunk-glow` breathing layer |
| `state-grid-pulse` | opacity 0.18↔1 | 3×3 loader cells (staggered delays) |
| `flare-breathe` | 4-point `background-position` drift | `.element-flare` gradient border |
| `hero-bounce` | translateY 0↔4px | hero scroll-hint arrow |
| `hero-visual-scan` | translateY -100%→100% | portrait scanline sweep (12s linear) |
| `modal-loading-fade-in` | opacity 0→1 (120ms) | modal placeholder shell |
| `page-fwd` / `page-bck` (Vue transition) | opacity + translateX ±24px | projects pager |
| `ui-modal` (Vue transition) | opacity + dialog translateY 8px | every modal |
| `kyo-ct` (Vue transition) | opacity | cursor tooltips |

All motion respects `prefers-reduced-motion` via the global collapse plus
per-component overrides.

---

## 7. Global Utility Classes (`_theme.scss`)

These are DOM-agnostic building blocks emitted once globally.

### 7.1 Icon rendering

- **`.icon-glyph`** — Nerd Font glyph host. `font-family: SymbolsNerdFontMono,
  SpaceMono, monospace`, `width/height: 1em`, inline-flex centered,
  `translateY(-0.18em)` to correct descender padding. Sizes: `--lg` (1.5rem),
  `--xl` (2rem) via `--icon-glyph-size`. Glyphs are supplied through
  `data-text` + `content: attr(data-text)` so they're exempt from WCAG 1.4.3.
- **`.ccs-glyph`** — the `▣` (U+25A3) block char, scaled 1.75em; only safe in
  `aria-hidden` contexts.
- **`.icon-mask`** — decorative icon drawn as a CSS `mask` of an inline SVG
  data-URI, colored by `background-color: currentColor`. Variant
  `.icon-mask--external` = Lucide external-link. Safe inside `<a>` without
  aria-label (reads as image, not text).
- **`[aria-hidden="true"][data-text]::before { content: attr(data-text) }`** —
  universal opt-in for rendering decorative text via CSS instead of DOM nodes.

### 7.2 HUD chrome

- **`.hud-deco`** — absolutely-positioned corner/watermark labels (SpaceMono,
  uppercase, `--clr-neutral-100` @ 0.32 opacity, `letter-spacing:0.18em`,
  `pointer-events:none`, `z-index:0`). Variants `--tl/--tr/--bl/--br` pin to
  1.25rem insets; `--watermark` is a giant Geomanist 900 kanji (8rem→12rem)
  at 0.04 opacity. Text via `data-text`. Rendered by the `<UiHudDeco>` component.

### 7.3 Structural shells

- **`.kyo-section`** — shared landing-section container: `position:relative`,
  `padding: 5rem 1.5rem` (→ `6rem 2rem` at md), `max-width:1280px`,
  `margin:0 auto`, `overflow:hidden`.
- **`.kyo-chip`** — the class form of the `kyo-chip` mixin; defaults to
  primary-yellow, override `color` for state-themed chips.

### 7.4 Rich-text prose (`.kyo-prose`)

> Document pages (`/resume`, `/privacy`) apply the measure at the **container**
> through `document-page.vue` — see §17.



Single source for `v-html` body content:
```
font-family: Geomanist; line-height: 1.55; letter-spacing: 0.02em;
word-spacing: 0.05em; color: --clr-neutral-50;
```
- `strong` → SpaceMono 700, `--clr-neutral-100`
- `code` (and standalone `.kyo-code`) → SpaceMono 0.88em, primary-yellow text,
  border + 35% border-tint bg, 3px radius (mirrors Org-mode `~code~`)
- `a` → SpaceMono 700, neutral-100, 1px underline w/ 0.2em offset;
  hover/focus → primary-yellow
- Nested `a code` / `strong code` drop their chrome so parent emphasis wins.

**`.kyo-prose` governs type treatment only — it does NOT cap width.** Line
length is a separate, opt-in decision carried by one token:

```
--kyo-measure: 68ch;    /* :root, _theme.scss */
```

`ch` resolves against the *consuming element's own* font-size, so the single
value serves the 15px body and the 18px modal prose alike — 68ch is ~72
rendered characters in Geomanist either way (measured: `1ch` = 9.95px at 18px,
average glyph = 9.42px, so `ch` runs ~6% conservative). Two rules follow from
that:

1. **Declare `max-width` on the same element that declares `font-size`.**
   Putting the cap on a wrapper that inherits a smaller size silently computes
   a shorter measure — `.experience-modal__bullets` lost ~12 characters that
   way until the `ul` was given `--fs-400` explicitly.
2. **Chrome spans, prose stops.** Panel borders, section-title bars and
   dashed rules keep the full container width; only the text is capped. Where
   the capped element carries horizontal padding, add it back
   (`calc(var(--kyo-measure) + 2.8rem)`) so the *text* lands at the measure.
3. **The container has to come down to meet the measure.** Capping prose inside
   a shell that was sized for something else does not finish the job — it just
   moves the problem. The 1040px `lg` modal left a **324px / 32% void** beside
   every paragraph, and the fix was to size the shell *from* the measure (see
   §10.1 `--prose`), not to cap and walk away.
4. **A shell derived from the measure must step with the type scale.** `--fs-400`
   is 1.25rem below `lg` and 1.5rem above, so 68ch is 565px then 677px. A single
   fixed shell width satisfies exactly one of those tiers; the other strands the
   difference. This is the same bug as rule 1, one breakpoint up.

Current consumers: `.faq__answer`, `.project-modal__description`,
`.experience-modal__description`, `.experience-modal__bullets`. Deliberately
**not** capped: short single-line leads (`.t-proof__lead`,
`.contact-section__lead`), already-narrow surfaces (`.t-proof__quote` at 46
chars, `.experience-section__description` at 62), and the resume page, which
keeps its own 58rem printed-CV sheet geometry.

### 7.5 State grid loader (`.state-grid`)

3×3 grid of 2px cells, `gap:1px`. Each cell pulses opacity 0.18↔1 via
`state-grid-pulse` with **staggered `animation-delay`** (0–400ms) producing a
radial ripple. Color from `--state-color` (defaults primary). Animation is
opacity-only (compositor-thread) so 54+ cells stay cheap. Stamped by
`<UiStateGrid>` (`components/ui/state-grid.vue`).

### 7.6 Element flare (`.element-flare`)

Animated gradient-border glow on a `::before` pseudo (inset border,
`filter: blur(4px)`, `z-index:-1`, `animation: flare-breathe 24s`). Tunable via
`--element-flare-{spread,color,opacity,blur,speed,delay}`. **Play-state is
paused by default** and only runs when the ancestor section carries
`[data-in-viewport="true"]` (set by an IntersectionObserver) — off-screen
flares cost zero paint. `.is-static` variant hides on hover; reduced-motion
kills the pseudo entirely. Used by project cards, featured chips, skill tiles,
experience cards, FAQ items, contact criteria/form, and buttons with `flareDelay`.

### 7.7 Cyberpunk glow (`.cyberpunk-glow`)

Utility wrapper around the `cyberpunk-glow` mixin; parametric via
`--cyberpunk-glow-{color,blur,spread,speed}`.

### 7.8 Media skeleton (`media-skeleton` mixin)

Loading placeholder for any `<img>`/`<picture>`: absolutely-fills the frame,
dark plate bg, and **two radial-gradient ring pseudos** (`::before`/`::after`,
the latter offset by half a cycle) that pulse outward via
`media-skeleton-ripple` — a sonar effect where a new wave is always rising.
Transform+opacity only (GPU). Fades out when a parent gains `is-loaded`.
Reduced-motion freezes the rings at scale(3)/0.25 opacity. Consumers:
`ui/image.vue`, `image-viewer.vue`, `modal-loading.vue`, project-modal
carousel, `youtube-facade.vue`.

### 7.9 Cursor tooltip (`.kyo-cursor-tooltip`)

Cursor-following tooltip, `<Teleport to="body">`-rendered (so it must be
global, not scoped). `position:fixed; z-index:9999; pointer-events:none`,
neutral-500 bg, 1px border, SpaceMono `--fs-100`, 4px radius,
`transform: translate(10px,16px)` offset from the JS-set clientX/Y. Enters/
leaves via the `kyo-ct` opacity transition. Drives the hero CCS/ORCID/ZeroNet
hover captions and the experience ZeroNet link caption.

---

## 8. UI Primitives (`src/components/ui/`)

### 8.1 Button (`ui/button.vue`)

Base `.ui-button`: inline-flex centered, Geomanist, `letter-spacing:0.04em`,
`gap:0.4rem`, transitions on bg/border/color. `:disabled` → 0.5 opacity,
not-allowed. Sizes `sm/md/lg` map padding + `--fs-200/300/400`.

Variants (`variant` prop, default `secondary`):

| Variant | Look | Hover/focus |
|---|---|---|
| `primary` | neutral-500 bg, primary text, hairline border, 700 | fills primary bg, neutral-500 text |
| `secondary` | transparent, neutral-200 text, hairline border | text + border → primary |
| `ghost` | transparent, neutral-50 text, no border | text → primary |
| `cyber` | SpaceMono uppercase, primary text/border, **chamfered corners** via `clip-path` polygon (14px notches top-right + bottom-left), lifts `translateY(-2px)` on hover | bg → 12% primary tint, text → neutral-50; focus adds inset 2px ring |
| `cyber-outline` | transparent, hairline border, SpaceMono uppercase; **animated corner brackets** (`::before`/`::after` 14px L-shapes) that expand to full size on hover via `--ease-standard` | brackets sweep to `100%+2px`; 5% primary bg tint |

The `flareDelay` prop attaches `.element-flare` with a custom delay.

### 8.2 Link (`ui/link.vue`)

Anchor twin of Button. Same size scale. Variants: `primary`, `secondary`,
`ghost`, **`card`** (full-width block, 1rem pad, hairline border → primary on
hover), `cyber`, `cyber-outline`.
The `cyber` link differs from the button: chamfer is drawn as **two stacked
`clip-path` layers** (`::before` = brand outline fill, `::after` = inset
`--cyber-fill`) so the notched edges keep their border (fixes the borderless-cut
bug a single clipped border produced). Handles `external` (`target=_blank
rel=noopener`) and `download`.

### 8.3 Card (`ui/card.vue`)

`.ui-card`: neutral-500 bg, hairline border, border-color transition. Padding
scale `none/sm/md/lg`. `interactive` variant → pointer cursor + border→primary
on `hover`/`focus-within`. Renders as any tag via `as` prop.

### 8.4 Section headings

- **`ui/section-heading.vue`** (`.ui-section-heading`) — `global` variant:
  Geomanist 700 uppercase `--fs-500` primary; `hud` variant: SpaceMono
  `--fs-200` neutral-300 inside a hairline box.
- **`ui/section-header.vue`** (`.ui-section-header`) — the big section masthead
  used by most sections: a mono **`__index`** tag (e.g. `// 02`, primary,
  `letter-spacing:0.12em`), a Geomanist `__title` (`--fs-700`, neutral-100,
  `line-height:1`), and a Geomanist `__subtitle` (`--fs-400`, neutral-50,
  `max-width:60ch → 90ch`). 3rem bottom margin, hairline bottom border.

### 8.5 Rating stars (`ui/rating-stars.vue`)

`.ui-rating-stars` inline-flex of `0.72rem` primary-yellow star polygons drawn
with `clip-path`. Empty pips are 22% neutral-100 tint. `role=img` + aria-label.

### 8.6 Icons

- **`brand-icon.vue`** (`.brand-icon`) — `<svg><use href="#brand-…">` from the
  sprite. `1em` square, `fill: currentColor`, `translateY(-0.08em)`. Sizes
  `--lg`(1.5rem)/`--xl`(2rem).
- **`app-icon.vue`** (`.app-icon`) — same, but `fill:none; stroke:currentColor`
  (line icons), `translateY(-0.06em)`.
- **`icon-sprite.vue`** — the inline `<svg>` symbol sprite mounted once at app root.

### 8.7 Image (`ui/image.vue` + `blast-image.vue`)

- **`blast-image.vue`** — the responsive `<picture>` engine: emits AVIF + WebP
  + raster `srcset`/`sizes` from a build-time manifest, sets intrinsic
  `width`/`height` (CLS-safe), `loading`/`fetchpriority` from `eager`. Pins the
  resolved `currentSrc` so re-mounts don't re-fetch.
- **`ui/image.vue`** (`.ui-image`) — framed wrapper. `__frame` establishes an
  isolated stacking context (`isolation:isolate`), `aspect-ratio` from
  `--image-aspect` (stored space-less to survive SSG minification), responsive
  `width` from `--image-size-{sm,md,lg,xl}`. The `<img>` fades opacity 0→1 on
  `is-loaded`, honoring `object-fit`/`object-position`/`scale` custom props.
  A `media-skeleton` sits beneath and fades out on load. `--framed` adds a
  hairline padded border.

---

## 9. Navigation Chrome

### 9.1 HUD Nav (`widgets/hud-nav.vue`)

Sticky top banner (`position:sticky; top:0; z-index:50`), SpaceMono, initially
transparent. A `::before` pseudo holds a `backdrop-filter: blur(12px)` that
fades in only when `--scrolled` (window.scrollY > 24); scrolled state also adds
a 92%-neutral bg + hairline bottom border.

- **`__skip-link`** — fixed, translated off-screen (`translateY(-150%)`), slides
  in on focus; primary-yellow bg, neutral-500 text.
- **`__bar`** — 3-col grid `auto 1fr auto`, `max-width: 1280px+4rem`.
- **`__brand`** — Geomanist 900 wordmark; hover → primary + text glow.
- **`__links`** — desktop-only inline nav (`display:none` < md). Each `__link`
  has an animated underline `::after` that `scaleX(0)→0.55` on hover and
  `scaleX(1)` when `.is-active` (active section tracked by a rAF-throttled
  scroll spy using a "last section past 50% viewport" algorithm).
- **`__actions`** — language toggle + a hairline `__separator` + desktop social
  icons (GitHub/LinkedIn, hairline hover→primary) + the mobile menu toggle.
- **`__menu-toggle`** — 44×44 hairline button, `display:none` ≥ md.
- **Mobile drawer** (`--open` + `max-md`): links become a full-width absolute
  dropdown below the bar with `blur(12px)` bg, stacked rows with hairline
  dividers, active row tinted `primary-300 @ 20%`. While open, the nav marks
  `main` + `.site-footer` **`inert`** so focus can't leak, and a capture-phase
  `pointerdown` outside closes it (Escape also closes on desktop).

### 9.2 Language toggle (`widgets/language-toggle.vue`)

A `primary`-variant `UiButton` trigger + a CSS-triangle `__chevron` that rotates
180° when `.is-open`. The `__list` is an absolute dropdown (`top:100%+0.25rem`,
right-aligned, `min-width:9rem`, neutral-500 bg, hairline border, `z-index:10`)
of `menuitemradio` buttons; hover → neutral-100 text on 8% tint, active locale
is 700 weight. Full keyboard menu semantics (Arrow/Home/End/Escape/Tab) and
click-outside close.

---

## 10. Modals, Pop-ups & Overlays

This is the interaction-heavy layer. There is **one base modal primitive**
that every dialog composes, plus several bespoke overlays.

### 10.1 Base Modal — `ui/modal.vue` (`.ui-modal`)

The foundation for the project modal, experience modal, and image viewer.

**Behavior (script):**
- **Body-scroll lock** via a ref-counted `ModalLockRegistry` — nested modals
  (image viewer opened over a project modal) keep `body { overflow:hidden }`
  until the *last* one closes.
- **Focus management** — on open, saves `document.activeElement`, focuses the
  dialog; on close, restores focus. A `Tab`/`Shift+Tab` **focus trap** cycles
  within the dialog's focusable set. `Escape` emits `close` (stops propagation).
- Rendered inside a `<Transition name="ui-modal">`.

**Structure & style:**
- **`__backdrop`** — `position:fixed; inset:0; z-index:200`, flex-centered,
  1rem pad (0.5rem < md). Background = **35% neutral-500 tint** +
  `backdrop-filter: blur(8px)`. `@click.self` closes. `transform:translateZ(0)`
  + `will-change:transform` promote it to its own layer.
- **`__dialog`** — neutral-500 bg, hairline border, flex column, `overflow:hidden`,
  `isolation:isolate`, `max-width:95dvw`, `max-height:95dvh`. Size modifiers:
  `--sm` 480 · `--md` 760 · **`--prose` 645 → 760 at `lg`** · `--lg` 1040 (all
  `min(95dvw, …px)`) · `--full` 95dvw. `--chromeless` drops chrome and sizes to
  content (used by the image viewer, whose `size="lg"` is therefore inert).

  **`--prose` is the text-led size, and both its numbers are derived rather than
  chosen:**
  ```
  widest measure-derived block = --kyo-measure (68ch at --fs-400)
                               + the bullets' counter gutter (3rem / 3.5rem)
  shell                        = that + 3rem of __body padding
                               = 645px below `lg`, 760px at `lg` and up
  ```
  It steps at `lg` because `--fs-400` does (1.25rem → 1.5rem), which moves 68ch
  from 565px to 677px. **Measured result: 72 characters per line and a 6–7%
  trailing void at every viewport ≥768px, in both locales.**

  *Why this exists.* The experience and project modals used to be `--lg`. Capping
  their prose at the measure without moving the shell left the section-title
  bars, stack grid, carousel and CTA at the full 1002px while the text stopped at
  678px — a **324px / 32% void** down the right of every paragraph. Holding a
  single `--prose` width across the type scale reproduced the same fault at
  22% in the 1024–1199 band. Both are the same lesson: *a measure is a property
  of the container, not a decoration applied inside it.*

  Narrowing the modal costs no image fidelity — the carousel is a preview and the
  `--chromeless` lightbox behind it is unaffected, still filling 1380px at a
  1440px viewport.
- **`__header`** — flex row, 1.5rem pad, hairline bottom border. `__title` =
  Geomanist 700 `--fs-500` **primary**; `__subtitle` = SpaceMono `--fs-200`
  neutral-300 (supports `v-html` with `strong` → neutral-100).
- **`__close`** — 38×38 hairline square button with the `` close glyph;
  hover/focus → primary border+text. `--floating` variant (chromeless mode):
  absolute top-right, 40×40, translucent blurred bg.
- **`__body`** — scrollable (`overflow-y:auto; overscroll-behavior:contain`),
  1.25rem pad, with a **custom primary-tinted gradient scrollbar** (5px, thumb
  = vertical primary gradient with a primary border, brightening on hover).
  `--tight` variant (chromeless) shrinks to an inline-flex centered box.
- **`__footer`** — 1rem pad, hairline top border (only if a `footer` slot exists).

**Transition (`ui-modal`):** backdrop fades opacity over 0.25s; the dialog
additionally `translateY(8px)`→0 with opacity.

### 10.2 Modal loading placeholder — `ui/modal-loading.vue`

Eager-bundled fallback for the lazy modal chunks, so a click paints instantly
on cold cache. `.modal-loading` = fixed full-screen flex-center, fades in over
120ms (`modal-loading-fade-in`). `__backdrop` = 78% neutral tint + `blur(8px)`.
`__frame` = `min(85dvw,900px)` 16:10 box, hairline border, faint primary tint,
housing a `media-skeleton` (`__skeleton`, z-index 2). An `sr-only`
`aria-live="polite"` announces "loading". Swapped out when the real chunk lands.

### 10.3 Image Viewer / Lightbox — `ui/image-viewer.vue`

A **chromeless** `UiModal` (`size="lg"`, `chromeless`) — so it reuses the
backdrop, focus trap, scroll lock, and the floating close button. Opens for the
hero portrait and every project-carousel image; can also host a YouTube facade.

- **`.image-viewer`** — inline-flex, `overflow:hidden`. Non-video branch sets
  `touch-action:none` so its **own pinch/double-tap/drag-pan zoom**
  (`use-image-zoom`) owns all touch input. Default canvas is generous
  (`min(85dvw,960px)`, 16:10, `max-height:85dvh`) so the skeleton reads as
  "modal-sized"; once `is-loaded`, constraints drop (`width:auto`,
  `aspect-ratio:auto`) so the real image owns its box.
- **`--video`** variant — 16:9, black (`--clr-neutral-900`) bg,
  `min(95dvw, 90dvh*16/9)`.
- **`__picture` / `__img`** — `max-width:95dvw; max-height:90dvh`, fade opacity
  0→1 over 0.4s on `is-loaded`.
- **`__skeleton`** — `media-skeleton`, fades out on load.
- **`__name`** — bottom-right filename chip (e.g. `// IMG :: NAME.JPG`),
  SpaceMono `--fs-100`, translucent blurred bg, `pointer-events:none`. **Fades
  out while `is-zoomed`** so it never overlaps the panned region.

### 10.4 Project Modal — inside `now-projects-section.vue` (`.project-modal`)

`UiModal` `size="lg"`, title = project name, subtitle = `// version`. Grid
layout, `gap:1.5rem`, Geomanist. Arrow-key handler drives the carousel.

- **`__carousel-frame`** — 16:9, **primary border**, `overflow:hidden`,
  `isolation:isolate`. Holds stacked absolute `__carousel-image` layers that
  cross-fade (`opacity` 0↔1, `is-active`). Image branch is a **zoom-in button**
  (`--btn`, `cursor:zoom-in`) that opens the lightbox; YouTube branch is a
  `<YoutubeFacade>`. Each image has its own `media-skeleton` + `is-loaded`
  fade. A `__carousel-counter` (`01 / 04`) sits bottom-right with a primary
  border + translucent bg.
- **`__carousel-controls`** — prev/next `__carousel-nav` (2.5rem primary-border
  squares that lift on hover) flanking centered `__carousel-dot`s (0.6rem
  primary-outlined squares; active = filled + `scale(1.15)`).
- **`__section-title`** — SpaceMono uppercase `--fs-200` primary, 2px primary
  left-border, 4% primary bg (section label treatment).
- **`__description`** — `.kyo-prose`, `--fs-400`.
- **`__stack`** — auto-fit grid of `tech-stack-item` chips (brand-icon or
  2-letter corner-bracketed `tech-stack-abbr`).
- **`__repo-cta`** — primary-outlined uppercase pill with repo + external glyphs,
  lifts `translateY(-2px)` on hover.

### 10.5 Experience Modal — inside `experience.vue` (`.experience-modal`)

`UiModal` `size="lg"`, title = role, subtitle = specs (`subtitle-html`).
Geomanist, neutral-200.

- **`__description`** — `.kyo-prose` `--fs-400`.
- **`__section-title`** — same primary left-border label treatment as project
  modal.
- **`__bullets`** — a `.kyo-prose` list with `list-style:none` and a
  **CSS counter** (`counter-reset: kyo-bullet`). Each `li` gets a
  `decimal-leading-zero` counter rendered through a `::before` styled with the
  `kyo-chip` mixin (primary `01`, `02`… badges), 3rem left pad, dashed bottom
  dividers.
- **`__stack`** — `tech-stack-item`/`icon`/`abbr` grid (auto-fit,
  `minmax(140px,1fr)`).

### 10.6 YouTube Facade + nested consent dialog — `ui/youtube-facade.vue`

A "click-to-load" YouTube embed. Until activated it renders a static poster
(`<picture>` AVIF/WebP/fallback + `media-skeleton`) with:
- **`__play`** — centered 3.5rem circle, translucent black + `blur(6px)`,
  primary border, SVG play triangle; scales up on button hover/focus.
- **`__attribution`** — bottom-left chip: YouTube brand-icon (`--clr-youtube-red`)
  + source label + optional channel, translucent black + blur.

On click, if consent isn't granted it opens an **in-facade consent modal**
(`__consent`, `role=dialog aria-modal=true`, `position:absolute; inset:0;
z-index:4`, 80% black + `blur(6px)`) containing a `__consent-card`
(neutral-500, primary border) with title, body, and Decline/Accept buttons
(SpaceMono uppercase; accept is primary-tinted). Escape or Decline dismisses;
Accept persists `kyo:consent=granted`, updates gtag, and mounts the
`youtube-nocookie.com` iframe. Focus moves to Decline on open, to the iframe on
mount.

### 10.7 Cookie consent banner — `components/cookie-consent.vue`

A **non-modal** pop-up (`role=dialog aria-modal=false`), bottom-anchored toast:
`position:fixed; bottom/left/right:1rem; z-index:900; max-width:520px`,
margin-left:auto (right-aligned on desktop). 88% neutral bg + `blur(8px)`,
hairline border, drop shadow, SpaceMono. `__copy` + a primary privacy `__link`,
and a right-aligned `__actions` row of two `__btn`s: `--ghost` (Decline,
autofocused) and `--primary` (Accept, filled yellow). Both flip to filled-yellow
on hover/focus; focus adds a neutral outline. Escape declines. Only shown when
no prior decision is stored; gtag is injected lazily on the user's choice.

### 10.8 Cursor tooltips (teleported pop-ups)

See §7.9 (`.kyo-cursor-tooltip`). Hover captions that follow the pointer,
teleported to `<body>`, used on the hero's CCS/ORCID tags and the ZeroNet
prose link (hero + experience).

**Overlay z-index ladder:** cursor tooltip `9999` > skip-link `1000` > cookie
banner `900` > modal backdrop `200` > mobile drawer chrome `100` (within nav) >
sticky nav `50` > hero content `1–2` > hud-deco `0` > flares/glows `-1/-2`.

---

## 11. Landing Sections

### 11.1 Hero (`sections/hero.vue`)

Full-width intro, `overflow:hidden`. Background = subtle radial primary glow
(`ellipse at 80% 35%, 4% primary → transparent`) over neutral-500, plus a
**scanline `::before`** (`repeating-linear-gradient` 3–4px, `mix-blend:overlay`,
0.4 opacity). Two `<UiHudDeco>` corners.

- **`__inner`** — 1-col grid → `minmax(0,1.6fr) minmax(0,0.85fr)` at md (content
  left, portrait right, both pinned to row 1). Two `<HeroVisual>` instances
  toggle via `v-show` for correct mobile-first tab order.
- **`__tag-row`** — the CCS tag (state-grid + hairline chip) and the ORCID badge
  (green `--clr-success-100` border/text with brand-icon). Both suppress default
  hover color changes but keep a focus-visible ring.
- **`__title`** — Geomanist 700, fluid `4.5rem → 5rem → --fs-800`; `__name`
  block; `__alias` "A.K.A. KYONAX 京" in primary, with the kanji `<sup>` neutral.
- **`__role`** — SpaceMono uppercase primary.
- **`__summary`** — `.kyo-prose`-like block (`v-html` with prose-link directive),
  `--fs-400`, `strong` → SpaceMono neutral-100, links underlined → primary.
- **`__stats`** — 2-col → 4-col grid of hairline stat boxes (`contain:layout
  paint`): mono uppercase `dt`, big Geomanist 700 `dd` (`--fs-600`), with a
  small superscript `__stat-suffix` (YEARS/AÑOS).
- **`__meta`** — location (map-marker app-icon, city text swaps to short form
  ≤414px) + a green `__meta-dot` + "available" status in success green. The dot
  is a **radar ping**, not a glow: a `::after` disc inherits the dot's fill and
  runs `hero-radar` (2s, `scale(0.27)→scale(1)` on a **22px** box, opacity
  `0 → 1 → 0`, the whole sweep front-loaded into the first 35% with a rest beat
  after).

  **The disc is a HARD-EDGED flat fill in `--clr-success-500`** — the family's
  darkest shade — not a gradient, not a blur, and not a translucent bright green.
  The shade is derived, not picked: the reference halo sits 19% of the way from the
  page background to the dot, which in OKLCH lightness is **L = 25.1%**, and
  `--clr-success-500` is **L = 26.1%** (every other success shade is ≥11 points
  off). Because the token already *is* the shadow colour, the disc renders at full
  opacity and keeps a crisp edge.

  **The stacking context belongs on `.hero__meta`, NOT on the dot.** `z-index: -1`
  only descends to the bottom of its own stacking context — isolating the *dot*
  put the halo behind the dot but still **on top of the flag and the status label**,
  which are earlier siblings in the same row. Verified by inflating the disc until
  it must overlap: with the row isolated the flag pixel stays `[0,50,140]` (its blue
  stripe); with the dot isolated it reads `[0,46,0]` — covered.

  **The halo geometry is matched to a reference image, not chosen.** Running a
  radial luminance profile on both the reference crop and the live dot gives:

  | | halo ⌀ / dot ⌀ | halo peak brightness |
  |---|---|---|
  | reference | 2.60× | 19% of the dot |
  | **live** | 2.2–2.6× | **18% of the dot** |

  (The ratio reads lower at low opacity only because the faint outer edge falls
  under the 6% detection threshold — the box is fixed at 22px.)
  Transform + opacity only, so it composites off the main thread. Base
  `opacity: 0` on the pseudo is load-bearing — under `prefers-reduced-motion` the
  global reduce block collapses the animation to one 0.01ms pass and the ring
  resolves to nothing, leaving a plain dot.

  **Three details are what make it read as smooth**, and each replaced a defect
  in the first cut (which the owner reported as "not smooth"):
  1. **`z-index: -1` + `isolation: isolate` on the dot** — the disc passes
     *behind* the core. The first cut painted a 0.5-alpha green disc *over* a
     solid green dot, so the core visibly brightened and dimmed once per cycle.
     That flicker, not the sweep, was the most obvious fault.
  2. **`inset: -7px` and scale `0.3 → 1`, not `0 → 3.4`.** Same visual envelope,
     but the layer rasterises at its *largest* size and is scaled **down**.
     Magnifying a 6px raster 3.4× stair-steps the circle edge.
  3. **Opacity starts and ends at 0.** The first cut snapped `0 → 0.5` at the
     loop boundary and then held dead from 70–100%, which read as a blink
     followed by a pause rather than a continuous sweep.

  4. **The sweep is front-loaded and the travel is large enough to see.** This is
     the one that actually fixed "it looks like a bad frame rate", and it is not
     a frame-rate problem at all — the compositor was measured at a steady
     **59.9 presented fps with zero frames over 32 ms** in every version. The
     fault was *pixels per frame*: a 6px dot spread over a 2.4s linear cycle moved
     the ring edge **0.097 px/frame**, so it crossed a pixel boundary roughly once
     every ten frames. Widening the box to 30px and packing the sweep into the
     first 35% of a 2s cycle raises that to **~0.63 px/frame over the first 160 ms**.

  Measured on real presented frames (CDP screencast, green-channel energy per
  frame, scored **only inside the visible sweep** — a rest beat is stillness by
  design and must not be counted as jank):

  | version | p50 change/frame | near-static in sweep | longest frozen run |
  |---|---|---|---|
  | first cut (ease-out, on top of dot) | 54 | 22% | 47 frames |
  | second cut (linear 2.4s) | 54 | 18% | **71 frames ≈ 1.2 s** |
  | **current** | **690** | **3%** | **4 frames ≈ 67 ms** |

  5. **A hard disc does not step, provided rule 4 holds.** The concern that a
     crisp edge would quantize (see the gradient note below) did not materialise
     once the sweep was front-loaded: measured **p50 4.28% change/frame, 2%
     near-static, longest stall 3 frames** — the best of any cut. Front-loading,
     not edge softness, is what carries perceived motion.
  6. **(superseded) The soft edge was tried and dropped.** Shrinking the box from
     30px to 22px cuts the radius travel, which by rule 4 should have made the
     stepping worse. It did the opposite: a gradient's entire falloff shifts as it
     scales, so every pixel under it changes value, where a hard edge changes only
     *at* the edge. Measured per-frame change **normalised to the halo's own
     amplitude** — absolute deltas are NOT comparable across brightness levels, and
     an un-normalised reading here shows a false regression:

     | | p50 change/frame | near-static | longest stall |
     |---|---|---|---|
     | hard disc, 30px | 2.76% | 6% | 15 frames |
     | **soft gradient, 22px** | **6.67%** | **4%** | **4 frames** |

  **`cost.mjs` cannot see any of this** — it samples `requestAnimationFrame` on the
  main thread, and a composited animation runs on the compositor thread. It
  reported a clean p50 = p95 = 16.7 ms for every version above, including the
  worst one. For a composited animation, measure *presented frames*.

  Cost, as 4 alternating paired on/off windows: mean **+13 ms per 15 s = 0.088% of
  one core**, differences spanning both signs (−39, +7, +33, +51 ms) —
  *indistinguishable from noise*; a single pair cannot resolve it. Style recalcs
  per minute are unchanged, which is the guarantee that matters: a composited
  transform/opacity animation must not force style recalculation.
- **`__ctas`** — a `cyber` CV download link + a `cyber-outline` contact link
  (shrink at ≤374px).
- **`__scroll-hint`** — desktop-only bouncing down-arrow (`hero-bounce`),
  hidden < md.

### 11.2 Hero Visual (`sections/hero-visual.vue`)

The portrait frame — a `<button>` (`cursor:zoom-in`) opening the lightbox.
`__frame`: 0.5rem pad, hairline border → primary on hover, with **corner
brackets** (`::before`/`::after` 16px L-shapes offset -5px) that also turn
primary on hover. `__inner`: a `mix-blend:screen` primary gradient band that
sweeps top→bottom forever (`hero-visual-scan`, 12s). `__meta`: decorative
`FRAME // …-001` and `@KYONAX_ON_TECH` labels rendered via CSS `content:`. On
tablet/mobile the frame becomes a square (`aspect-ratio:1/1 !important`).

### 11.3 Testimonials (`sections/testimonials-proof.vue`, `.t-proof`)

No HUD decorations — the `// PROOF :: VERIFIED` corner, the `// 推薦状`
bottom-left tag and the `信頼` watermark were all removed, and the lead runs
the full section width (no measure cap) so it stays on one line in both
locales; the ES string is 65 characters and used to wrap under the old
`max-width: 60ch`.

Three equal cards per page. `__top`: lead (`.kyo-prose`) + prev/next
`__arrow`s (2.5rem hairline squares → primary). `__grid`: 1-col → 3-col at lg,
paged with `v-show`. Each `__item` stacks a `__card` + an out-of-card source
badge.
- **`__card`** — hairline box, `min-height:17rem`, flex column; presentational
  only (no hover lift). `__stars` (rating-stars), `__quote` = italic
  `.kyo-prose` clamped to 6 lines with CSS `“ ”` quote pseudos, `__author` row
  (avatar via BlastImage or an initials fallback square, name, mono role, and a
  faded country `__flag`).
- **`__meta-row`** — source badge (`__source`: mono chip, translucent black +
  blur, LinkedIn icon tinted `--clr-linkedin-blue`) + uppercase mono `__date`.
  `order:-1` on mobile (badge on top), normal at lg.
- **`__foot`** — dynamic count + section-level recs link (`__recs-link`, mono
  uppercase with a `↗` `::after`, underline → primary) + page `__dot`s (27px
  hit target, 0.6rem primary pip via `::before`, active filled + scale 1.25).

### 11.4 Experience timeline (`sections/experience.vue`)

Vertical timeline (`ol.__timeline`). Each `__node` is a 2-col grid (rail +
card). **`__rail`**: a `__dot` (primary-outlined circle with glow;
`--primary` tone = filled + stronger glow) and a gradient `__line`
(primary→border) connecting nodes.
- **`__card`** — `.element-flare`, hairline border, a diagonal
  primary→neutral gradient bg whose intensity scales with a `--prox` proximity
  variable (from `use-proximity-hover`). Hovers/`:has(:focus-visible)` brighten
  the border, translate `translateX(4px)`, and ramp flare opacity to 0.30.
  `--neutral` vs `--primary` tone variants tune bg/border. A full-card
  `__card-btn` overlay opens the modal.
- Content: `__role` (Geomanist 700, colors toward primary with proximity),
  mono `__specs`, `.kyo-prose` `__description` **clamped to 7–8 lines**
  (`-webkit-line-clamp`), and a `__view-more` chevron that nudges right on hover.

### 11.5 Now / Projects (`sections/now-projects-section.vue`)

The most complex section — a paged "NOW" card grid + a "FEATURED" chip grid,
plus the project modal (§10.4) and image viewer.

- **`.state-square`** — 8px status square with a color-matched glow, colored by
  `--state-color`.
- **`__cards`** — 1 → 2 (sm) → 3 (lg) col grid, paged (`Transition
  page-fwd/bck` slide). Cards `--ghost`-padded to keep a full grid (dashed,
  25% opacity, `min-height:310px`).
- **`__card`** — `.element-flare`, hairline box, `contain:layout paint`,
  `isolation:isolate`. `--state-color` drives border/flare/segment/label color;
  proximity `--prox` and hover lift `translateY(-4px)` + border→state color.
  `.is-ended` overrides `--state-color` to warning-orange; `.is-static`
  disables interaction. A full-card `__card-hit-area` button (modal) or `<a>`
  (link-only) overlay carries the accessible name.
- **Card internals:** `__card-header` (status w/ state-grid or glyph +
  right-aligned `#NN` index), `__name-block` (Geomanist name + `.kyo-chip`
  version), mono `__milestone` (`// LABEL`), and a **`__countdown`** panel —
  a hairline box of mono `__segment`s (`0d 00h 00m 00s`, state-colored, 10%
  state-tint bg) with head label + Bogotá `__countdown-tz`. Live `WORKING_ON`
  projects count *up* from `started`; others count *down* to the next deadline;
  ended/completed render frozen `--ended` segments.
- **`__link`** — dashed-top-bordered repo link with repo + small external glyph;
  `.is-corner` raises z-index above the hit-area.
- **`__pagination`** — prev/next `__pagination-nav` (2.5rem primary squares that
  lift) + centered `__pagination-dot`s (2.25rem hit target, 0.6rem primary pip
  via `::before`, active filled + scale 1.25). Touch **swipe paging** is wired
  (50px threshold, horizontal-dominant only).
- **`__featured`** — hairline-topped region; `__featured-grid` 1 → 3 col of
  `__featured-item` chips (`.element-flare`, proximity border/lift, stretched-
  link `__featured-hit` overlay), each with mono status head + Geomanist name +
  mono version.

### 11.6 Skills (`sections/skills.vue`)

Four `__category` cards (frontend/backend/devops/ai), 1 → 2 → 3 col.
Each card: hairline box on 70% neutral bg, hover → primary border. `__category-
header`: 3-col grid (glyph · label · `NN` count), dashed bottom border; the
glyph turns primary on card hover. `__grid`: 3/4/3-col responsive grid of
`__item`s.
- **`__item`** — `.element-flare` tile (`grid-template-rows` for icon + name),
  proximity-driven color/border/lift (`--prox`), hover → primary. Icon is a
  brand-icon (`--xl`), a Nerd-Font `icon-glyph --xl`, or a 2-letter
  corner-bracketed `__item-abbr` (mirrors `tech-stack-abbr`). `__item-name`:
  mono, min-height reserved for two lines to keep the grid even.

### 11.7 FAQ (`sections/faq.vue`)

Accordion list. `__item`: `.element-flare` hairline box (`contain:layout
paint`); hover brightens border, `--open` sets primary border + 0.12 flare and
rotates the chevron 90°.
- **`__summary`** — full-width button, 3-col grid (`__num` `.kyo-chip` · question
  · chevron). `__num` gains an 18%-primary bg when open.
- **`__question`** — Geomanist 700, `--fs-300 → 400`.
- **`__chevron`** — primary Nerd-Font glyph, rotates on open (`--ease-standard`).
- **`__panel`** — the height animation uses **`grid-template-rows: 0fr → 1fr`**
  (no JS measuring) over 0.35s; `__panel-inner` clips overflow; `__answer` is
  `.kyo-prose` with a dashed top divider. Reduced-motion disables the row
  transition.

### 11.8 Contact (`sections/contact-section.vue`)

Two-column (availability | form) grid, 1-col below sm; the form spans full
width (max 600px) when not actively looking.
- **Availability column:** `__status-headline` (`.kyo-chip`), bold
  `__status-statement`, an `ol.__criteria` of `.element-flare` items (proximity
  border, `.kyo-chip` `__criteria-num`, primary title + neutral body), a
  primary-left-bordered `__philosophy` blockquote, and a `cyber` WhatsApp CTA.
- **Form column** (`__form-wrap`, `.element-flare` panel): stacked `__field`s.
  `__label` = mono uppercase primary. `__input`/`__textarea` = 90% neutral bg,
  hairline border → primary on focus, Geomanist, placeholder = 70% neutral;
  textarea `resize:vertical`. **`__service-chips`** = mono uppercase toggle
  buttons (hairline → primary on hover; `.is-selected` = filled primary bg with
  `aria-pressed`). `__actions`: a `cyber` submit (disabled until valid) + an
  optional `cyber-outline` WhatsApp link. A visually-hidden `aria-live` region
  announces selection + submit handoff. Reduced-motion disables chip/input
  transitions.

### 11.9 Footer + Brand Signature

**`sections/site-footer.vue`** (`.site-footer`) — `overflow:hidden`, top-fading
1%-primary gradient bg, SpaceMono. Renders `<KyonaxBrandSignature>` then an
`__info` 2-col grid:
- **`__socials`** (`// LINKS`) — inline social list (primary links @ 0.75
  opacity → 1 on hover, dot separators) + a legal/privacy list.
- **`__manifest`** (`RUNTIME \\`, right-aligned, `aria-hidden`) — a live
  `dl` of runtime facts (HOST, PATH, LOCALE, LANG, VIEWPORT, TZ) in faded
  primary mono, values ellipsized.

**`components/brand/kyonax-brand-signature.vue`** (`.kyonax-sig`) — the reusable
brand block. `writing-mode: vertical-rl` margin kanji (信号 / 接続, md+ only). A
`__block` framed by four 5px primary **corner anchor dots**. Four rows:
1. **top strip** — 3-slot grid (HUD-L · 京 kanji · HUD-R), text swaps full↔short
   at sm.
2. **wordmark** — inline `LOGO_KYONAX.svg` (`v-html`, colored primary,
   full-width).
3. **identity** — `CRISTIAN D. MORENO` · `VILLAVICENCIO/COL © YEAR`
   (city → `V/CIO` at ≤414px; font `--fs-500 → --fs-200` at sm).
4. **legal strip** — `GPL-2.0` · `EXPERT IN` (absolute lead) over PERFORMANCE ·
   ARCHITECTURE · AI pillars (→ ARCH · AI at ≤414px) · credit (full → `KYONAX`).

All text at low opacity (0.45–0.95) in faded primary — the "signal transmission"
motif.

---

## 12. Responsive Strategy

Mobile-first. Layouts collapse to single column on phones and expand at
`sm`(768) / `md`(1024) / `lg`(1200). Notable device-specific behaviors:

- Scrollbars hidden below **882px** (touch).
- Hero/brand-signature progressive text swaps at **558 / 414 / 374px** (name
  alignment, city short form, pillar abbreviations, CTA shrink).
- HeroVisual switches to a square frame below `lg`.
- Nav collapses to a blurred `inert`-guarded drawer below `md`.
- Projects show 3 cards/page on mobile, 6 on desktop; featured + skill grids
  reflow 1→2→3.
- Modals use `dvw`/`dvh` units and reduce padding below `md`.

---

## 13. Accessibility Patterns Baked Into the Styling

- **Focus-visible everywhere** — 2px primary outline (inset on clipped scroll
  containers), plus bespoke rings on cyber buttons/links and interactive tiles.
- **Decorative text via CSS `content:` / `data-text`** — HUD chrome, watermarks,
  filenames, meta labels, index numbers never enter the DOM as low-contrast
  text nodes, so WCAG 1.4.3 doesn't apply.
- **Icon-as-image tricks** — `icon-mask` (CSS mask) and empty stretched-link/
  hit-area overlays keep accessible names clean and pass WCAG 2.5.3.
- **Touch targets** — pager/carousel dots use 2.25rem (27px) hit areas around
  0.6rem visible pips; mobile nav/lang buttons are ≥44px.
- **Focus trap + scroll lock + focus restore** in the base modal; `inert` on
  page chrome behind the mobile drawer and on inactive carousel slides.
- **Contrast-verified OKLCH text ramp** (documented bumps in `_variables.scss`).
- **`prefers-reduced-motion`** — global duration collapse + per-component
  freezes (skeletons, flares, FAQ panel, contact inputs).

---

## 14. Performance Patterns Baked Into the Styling

- **Compositor-only animation** — flares, glows, skeletons, state-grid, scan
  lines, and modal transitions animate only `transform`/`opacity`; `box-shadow`
  glow was rewritten to `filter: drop-shadow` + opacity pulse to dodge Safari
  per-frame CPU rasterization.
- **`transform: translateZ(0)` + `will-change`** promote every `backdrop-filter`
  surface (nav, modals, tooltips, badges, cookie banner) to its own GPU layer.
- **`contain: layout paint`** + **`isolation: isolate`** on cards, tiles,
  countdowns, stat boxes, and image frames to scope reflow/repaint and stacking.
- **Viewport-gated flares** — `.element-flare` runs only under
  `[data-in-viewport="true"]`; off-screen sections cost zero paint.
- **Single shared keyframes** — one `kyo-glow-pulse` / `media-skeleton-ripple`
  emitted globally instead of per-call-site duplicates.
- **Image CLS safety** — intrinsic `width`/`height`, `aspect-ratio` frames,
  and skeletons reserve space; space-less `aspect-ratio` values survive SSG
  HTML minification without hydration mismatch.
- **Lazy modal chunks** with an eager `ModalLoading` fallback so the first
  click paints instantly on cold cache.

---

## 15. Deep Dive — How the Footer Was Built

The footer is intentionally split into **two components** so the brand block
can be dropped into any other KYONAX product untouched:

```
<SiteFooter>                         ← site-specific shell (this repo only)
  └── <KyonaxBrandSignature/>        ← reusable, self-contained brand block
  └── .site-footer__info             ← LINKS column + RUNTIME \\ manifest column
```

- **`src/views/components/sections/site-footer.vue`** — the `contentinfo`
  landmark, the live "runtime manifest" (browser/session facts), and the socials
  + legal links. Everything here is specific to *this* site.
- **`src/components/brand/kyonax-brand-signature.vue`** — the canonical brand
  signature (HUD strip + 京 stamp + KYONAX wordmark + identity + legal strip +
  corner dots + vertical kanji). No required props, no global side-effects,
  styles scoped entirely to `.kyonax-sig`.

### 15.1 `site-footer.vue` — the runtime shell

#### 15.1.1 SSR-safe reactive state

Every runtime value starts **empty** and is filled only in `onMounted`. This is
deliberate: the component is prerendered by vite-ssg, and any value read from
`window` / `navigator` / `Intl` at setup time would differ between the server
render and the client, producing a hydration mismatch. Empty-on-both-sides keeps
the SSR and CSR trees byte-identical, then the client "fills in" post-hydration.

```js
const host         = ref('');
const path         = ref('');
const nav_language = ref('');
const viewport     = ref({ w: 0, h: 0 });
const resolved_tz  = ref('—');

onMounted(() => {
  host.value         = window.location.host     || '—';
  path.value         = window.location.pathname || '/';
  nav_language.value = navigator.language        || '—';
  try {
    resolved_tz.value = Intl.DateTimeFormat().resolvedOptions().timeZone || '—';
  } catch { /* Intl unavailable in some embedded WebViews */ }
  onResize();
  window.addEventListener('resize', onResize, { passive: true });
});
```

Note the `try/catch` around `Intl` (some embedded WebViews throw), the `|| '—'`
fallbacks (so an empty value still renders a placeholder glyph), and the
`{ passive: true }` scroll/resize listener (never blocks the compositor).

#### 15.1.2 rAF-throttled resize

The live `VIEWPORT` value updates on resize, but the handler is throttled to one
write per animation frame so a drag-resize doesn't thrash reactivity:

```js
let _resize_frame = 0;
const onResize = () => {
  if (_resize_frame) {
    return;                       // a frame is already queued — coalesce
  }
  _resize_frame = requestAnimationFrame(() => {
    _resize_frame = 0;
    viewport.value = { w: window.innerWidth, h: window.innerHeight };
  });
};
```

`onBeforeUnmount` tears down the listener and cancels any pending frame.

#### 15.1.3 The manifest as data

The RUNTIME column is a `computed` array so the template stays a dumb `v-for`
loop — labels and values live together, formatting is centralized:

```js
const manifest = computed(() => [
  { key: 'host',     label: 'HOST',     value: host.value || '—' },
  { key: 'path',     label: 'PATH',     value: path.value || '—' },
  { key: 'locale',   label: 'LOCALE',   value: locale.value.toUpperCase() },
  { key: 'lang',     label: 'LANG',     value: nav_language.value || '—' },
  { key: 'viewport', label: 'VIEWPORT', value: viewport.value.w ? `${viewport.value.w}×${viewport.value.h}` : '—' },
  { key: 'tz',       label: 'TZ',       value: resolved_tz.value },
]);
```

`SOCIALS` is likewise a static data array (id/url/label/aria), and
`privacy_href` is a `computed` that swaps `/privacy` ↔ `/es/privacy` on locale.

#### 15.1.4 Template — landmark + two-column info

```html
<footer
  ref="footer_ref"
  class="site-footer"
  role="contentinfo"
  :aria-label="t('kyo-web.landing.footer.tag')"
>
  <KyonaxBrandSignature />

  <div class="site-footer__info">
    <nav class="site-footer__socials" :aria-label="t('kyo-web.landing.nav.contact')">
      <span class="site-footer__col-tag" aria-hidden="true">// LINKS</span>
      <ul role="list" class="site-footer__socials-list"> … </ul>
      <ul role="list" class="site-footer__legal-list"> … </ul>
    </nav>

    <div class="site-footer__manifest" aria-hidden="true">
      <span class="site-footer__col-tag site-footer__col-tag--right">RUNTIME \\</span>
      <dl class="site-footer__manifest-list"> … </dl>
    </div>
  </div>
</footer>
```

Key decisions:
- `role="contentinfo"` + `aria-label` make it a first-class landmark.
- The socials block is a real `<nav>` with its own label; links are a semantic
  list.
- The **entire RUNTIME manifest is `aria-hidden="true"`** — it's decorative HUD
  chrome (browser diagnostics), not content a screen reader should announce, and
  the `RUNTIME \\` tag would read as noise.
- The manifest uses a **description list** (`dl`/`dt`/`dd`) because it's
  genuinely key→value data.

#### 15.1.5 The glued dot-separator trick

The socials render as `GITHUB · LINKEDIN · X · …`, with a `·` **between** items
only. The markup deliberately has *no whitespace* between the closing `</a>` and
the separator `<span>` so no stray space renders, and the separator is
suppressed after the last item:

```html
<li v-for="(s, i) in SOCIALS" :key="s.id" class="site-footer__social-item">
  <a
    :href="s.url"
    class="site-footer__social-link"
    target="_blank"
    rel="noopener noreferrer"
    :aria-label="s.aria"
  >{{ s.label }}</a><span
    v-if="i < SOCIALS.length - 1"
    class="site-footer__social-dot"
    aria-hidden="true"
  >·</span>
</li>
```

The `>{{ s.label }}</a><span` all-on-one-line pattern is intentional — matching
the project's [[reference_hydration_whitespace]] rule that whitespace between
static text and interpolation must not be mixed across lines under SSG minify.

#### 15.1.6 Styles — gradient plate + responsive two-column grid

The footer sits on a subtle top-fading primary tint over the page background,
uses SpaceMono throughout, and steps its padding up at `sm`/`lg`:

```scss
.site-footer {
  position: relative;
  overflow: hidden;
  padding: 2.5rem 1rem 2.5rem;
  margin-top: 2rem;
  background: linear-gradient(
    to bottom,
    transparent 0%,
    color-mix(in srgb, var(--clr-primary-100) 1%, var(--clr-neutral-500)) 100%
  );
  font-family: "SpaceMono", monospace;

  @include min-media-query(sm) { padding: 2.5rem 1.5rem 2.5rem; }
  @include min-media-query(lg) { padding: 2.5rem 2.5rem 2.5rem; }
}
```

The INFO container is a 2-col grid (`1fr 1fr`) that collapses to a single column
below `sm`. The manifest column is right-aligned so LINKS and RUNTIME read as
two opposing HUD panels:

```scss
&__info {
  max-width: 1100px;
  margin: 1.25rem auto 0;
  padding: 0 0.6rem;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0;

  @include max-media-query(sm) {
    grid-template-columns: 1fr;
    gap: 1.25rem;
  }
}

&__socials  { padding: 0 0.5rem 0 0; min-width: 0; }
&__manifest { padding: 0 0 0 0.5rem; min-width: 0; text-align: right; }
```

Both column headers share `.site-footer__col-tag` (primary, 0.7 opacity,
`letter-spacing:0.14em`); the manifest's `--right` modifier just flips
`text-align`.

The manifest itself is a two-column auto grid, right-justified, with each value
truncated so long timezones / paths never break the layout:

```scss
&__manifest-list {
  display: grid;
  grid-template-columns: auto auto;
  gap: 0.1rem 0.85rem;
  justify-content: flex-end;
}

&__manifest-key {           /* HOST / PATH / LOCALE … */
  color: var(--clr-primary-100);
  opacity: 0.65;
  font-weight: 700;
  min-width: 3.75rem;       /* keeps the value column aligned */
  flex-shrink: 0;
}

&__manifest-val {           /* the live value */
  opacity: 0.45;
  word-break: break-all;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;      /* single-line, clipped with … */
}
```

The socials list is a wrapping flexbox baseline-aligned so links + `·` dots sit
on one type line; every interactive element fades opacity `0.75 → 1` (links) or
`0.55 → 1` (legal) on hover/focus — no layout shift, pure opacity.

### 15.2 `kyonax-brand-signature.vue` — the reusable brand block

Self-contained by design: it imports its own SVG wordmark, pulls translatable
strings from `kyo-web.landing.footer.*`, computes the year at runtime, and scopes
every rule to `.kyonax-sig`.

```js
import logoKyonaxSvg from '@assets/app/LOGO_KYONAX.svg?raw';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
const current_year = new Date().getFullYear();   // © auto-updates
```

The `?raw` query inlines the SVG source as a string so it can be injected with
`v-html` and colored via `currentColor` (`color: var(--clr-primary-100)`),
rather than loaded as an opaque `<img>`.

#### 15.2.1 The four-row block + corner-dot frame

The block is an implied rectangle: no border, just **four absolutely-positioned
5px dots** at the corners suggesting a frame (a recurring cyberpunk-HUD motif).
Inside, four rows stack tight:

```html
<div class="kyonax-sig__block">
  <span class="kyonax-sig__anchor kyonax-sig__anchor--tl" aria-hidden="true" />
  <span class="kyonax-sig__anchor kyonax-sig__anchor--tr" aria-hidden="true" />
  <span class="kyonax-sig__anchor kyonax-sig__anchor--bl" aria-hidden="true" />
  <span class="kyonax-sig__anchor kyonax-sig__anchor--br" aria-hidden="true" />

  <div class="kyonax-sig__strip kyonax-sig__strip--top"> … </div>       <!-- HUD-L · 京 · HUD-R -->
  <div class="kyonax-sig__wordmark-row"> … </div>                       <!-- KYONAX svg -->
  <div class="kyonax-sig__identity-row"> … </div>                       <!-- NAME · LOC/YEAR -->
  <div class="kyonax-sig__strip kyonax-sig__strip--bottom"> … </div>    <!-- GPL · pillars · credit -->
</div>
```

```scss
&__block {
  position: relative;          /* anchor context for the dots + strips */
  max-width: 1100px;
  margin: 0 auto;
  padding: 1.25rem 0.6rem;
}

&__anchor {
  position: absolute;
  width: 5px; height: 5px;
  background: var(--clr-primary-100);
  border-radius: 50%;
  opacity: 0.55;
  pointer-events: none;

  &--tl { top: 0; left: 0; }   &--tr { top: 0; right: 0; }
  &--bl { bottom: 0; left: 0; } &--br { bottom: 0; right: 0; }
}
```

#### 15.2.2 The 3-slot strip technique

Both the top HUD strip and the bottom legal strip share one layout: a
`1fr auto 1fr` grid where the three children are pinned start / center / end via
`nth-child`. This guarantees the center element (京 / the PERFORMANCE pillars)
stays optically centered regardless of how wide the side labels are:

```scss
&__strip {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 0.5rem;

  & > :nth-child(1) { justify-self: start; }
  & > :nth-child(2) { justify-self: center; }
  & > :nth-child(3) { justify-self: end; }
}
```

#### 15.2.3 The absolute "EXPERT IN" lead label

The bottom strip's center reads `EXPERT IN` stacked *above* the
`PERFORMANCE · ARCHITECTURE · AI` pillars. Rather than a second grid row, the
lead is absolutely positioned above its `position: relative` parent — so it
floats over the pillars without affecting the strip's baseline grid, and it
simply `display: none`s on small screens:

```scss
&__transmission { position: relative; text-align: center; }

&__tagline-lead {
  position: absolute;
  bottom: 100%;                       /* sit above the pillars */
  left: 50%;
  transform: translate(-50%, 0.35rem);
  white-space: nowrap;

  @include max-media-query(sm) { display: none; }
}
```

#### 15.2.4 Dual full / short content swaps

Instead of JavaScript, every label that needs to shorten on narrow screens ships
**both strings** and toggles them with `display`. This keeps it SSR-pure (no
`window.matchMedia` at render) and lets each breakpoint pick its own copy:

```html
<span class="kyonax-sig__hud-label-full">// SENIOR :: FULL-STACK ENGINEER</span>
<span class="kyonax-sig__hud-label-short">// SR. FULL-STACK</span>
```

```scss
&__hud-label-full  { @include max-media-query(sm) { display: none; } }
&__hud-label-short { display: none;
                     @include max-media-query(sm) { display: inline; } }
```

The same full/short pattern drives the credit (`made-by` → `KYONAX`), the pillars
(`…ARCHITECTURE · AI` → `ARCH · AI` at ≤414px), and the identity city
(`VILLAVICENCIO` → `V/CIO` at ≤414px, mirroring `hero.vue`).

#### 15.2.5 Vertical margin kanji

On `md`+ only, two vertical labels (信号 "signal" / 接続 "connection") flank the
block using `writing-mode: vertical-rl`, one flipped 180°:

```scss
&__margin {
  display: none;                      /* hidden on phones */

  @include min-media-query(md) {
    display: block;
    position: absolute;
    top: 50%;
    writing-mode: vertical-rl;
    opacity: 0.35;
    color: var(--clr-primary-100);
    pointer-events: none;
  }

  &--left  { left: 0.5rem;  transform: translateY(-50%) rotate(180deg); }
  &--right { right: 0.5rem; transform: translateY(-50%); }
}
```

### 15.3 How the two compose

`site-footer.vue` renders `<KyonaxBrandSignature/>` first, then the `__info`
container with `margin: 1.25rem auto 0` — a small deliberate gap so the brand
block and the LINKS/RUNTIME row read as one stacked unit inside the shared
`max-width: 1100px` measure. The brand block carries all identity/legal chrome;
the shell adds only what is unique to this site (live runtime facts + social
links). Because the signature is fully scoped and prop-free, dropping it into
another KYONAX project needs nothing but the import and the `kyo-web.landing.
footer.*` i18n keys.

**Build recap:** SSR-safe empty state hydrated in `onMounted` → rAF-throttled
live values → data-driven `v-for` manifest/socials → semantic `contentinfo`
landmark with an `aria-hidden` decorative manifest → a reusable, self-scoped
brand block built from a corner-dot implied frame, two `1fr auto 1fr` HUD strips,
an absolutely-floated lead label, CSS-only responsive copy swaps, and
`writing-mode` margin kanji.

---

## 16. Deep Dive — How the Project Cards Work

The Projects section (`sections/now-projects-section.vue`) renders **two card
systems**:

1. **NOW cards** (`.now-projects-section__card`) — the big paged grid of active
   work, each a self-contained status panel with a live countdown.
2. **FEATURED chips** (`.now-projects-section__featured-item`) — a compact grid
   of shipped/live projects below the pager.

Everything about a NOW card's *appearance* is driven by one piece of data — its
**status** — funneled through a single CSS custom property, `--state-color`.
Understanding that funnel explains the whole visual system.

### 16.1 The status taxonomy (the source of every card's color)

Status lives in the data layer (`src/data/projects.js`). Each status maps to a
palette **color family** and an i18n **label key**:

```js
export const PROJECT_STATUS = {
  WORKING_ON:  { color: 'accent',    labelKey: '…status.working-on'  }, // magenta — "live now"
  DONE:        { color: 'success',   labelKey: '…status.done'        }, // green
  IN_PROGRESS: { color: 'primary',   labelKey: '…status.in-progress' }, // yellow
  ON_HOLD:     { color: 'warning',   labelKey: '…status.on-hold'     }, // orange
  ON_TODO:     { color: 'secondary', labelKey: '…status.on-todo'     }, // blue
  LIVE:        { color: 'success',   labelKey: '…status.live'        },
  DEPRECATED:  { color: 'error',     labelKey: '…status.deprecated'  }, // red
  UPDATING:    { color: 'primary',   labelKey: '…status.updating'    },
  RELEASE:     { color: 'secondary', labelKey: '…status.release'     },
};

// Sort order for the NOW grid (lower = shown first)
export const NOW_STATUS_PRIORITY = {
  WORKING_ON: 0, IN_PROGRESS: 1, ON_HOLD: 2, ON_TODO: 3, DONE: 4,
};

export const DEFAULT_NOW_STATUS      = 'IN_PROGRESS';
export const DEFAULT_FEATURED_STATUS = 'LIVE';
```

`_status_color(status)` resolves `PROJECT_STATUS[status].color` (falling back to
`'primary'`), and the template writes it into an **inline CSS variable** on the
card root:

```html
:style="{
  '--state-color': `var(--clr-${card.status_color}-100)`,   // e.g. var(--clr-accent-100)
  '--element-flare-delay': `${idx * 0.6}s`,                 // stagger the border glow
}"
```

So a `WORKING_ON` card gets `--state-color: var(--clr-accent-100)` (magenta), a
`DONE` card green, an `ON_HOLD` card orange, and so on. Nothing downstream
hard-codes a color — they all read `var(--state-color, var(--clr-primary-100))`.

### 16.2 The card data model (`buildNowCard`)

Each card is a plain object built once from the project entry. Every field maps
to a visual concern:

| Field | Purpose / what it drives |
|---|---|
| `name`, `version` | the `__name` heading + `.kyo-chip` version badge |
| `status_id` | selects the header indicator (glyph / grid / square) |
| `status_color` | → `--state-color` (border, flare, segments, labels) |
| `status_label` | localized status text in the header |
| `has_modal` | card opens the project modal → adds `.has-modal`, a `<button>` hit-area, proximity hover |
| `has_link` | card/section has a repo URL → renders the `__link` row / `<a>` hit-area |
| `label`, `show_description`, `description` | the `// MILESTONE` line + optional blurb |
| `is_working_on`, `started_ms`, `started_text` | count-**up** countdown branch |
| `countdown`, `deadline_text` | count-**down** countdown branch |
| `ended`, `ended_segs`, `completed_segs` | frozen "ended" countdown branch + `.is-ended` |
| `media_urls`, `stack` | feed the project modal (carousel + tech list) |

The visible cards are sorted (`_sorted_now_cards`) by: DONE last → WORKING_ON
first → ended after live → then `NOW_STATUS_PRIORITY` → then nearest deadline.

### 16.3 The three root state classes

`_card_root_class(card)` toggles exactly three modifiers:

```js
{
  'is-ended':  card.ended,                          // finished → recolor to warning
  'has-modal': card.has_modal,                      // interactive → proximity + lift
  'is-static': !card.has_modal && !card.has_link,   // inert → no hover affordance
}
```

Plus `.element-flare` (always) and, for empty grid slots, `--ghost`.

### 16.4 The card base + state cascade (annotated CSS)

```scss
&__card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1.5rem 1.5rem 0.75rem;
  background: var(--clr-neutral-500);
  border: 1px solid var(--clr-border-100);
  cursor: pointer;
  isolation: isolate;            /* own stacking context for the flare + hit-area */
  contain: layout paint;         /* scope reflow/repaint to the card */
  --element-flare-spread: 2px;
  --element-flare-color: var(--state-color, var(--clr-primary-100));  /* glow = status color */
  --element-flare-opacity: 0;    /* invisible until proximity/hover ramps it up */
  transition: transform 0.25s ease;

  /* INTERACTIVE (opens a modal): proximity-driven lift + border tint.
     --prox is a 0→1 value written by use-proximity-hover as the pointer
     nears the card, so the effect eases in BEFORE the cursor arrives. */
  &.has-modal {
    transform: translateY(calc(-4px * var(--prox, 0)));
    border-color: color-mix(in srgb,
      var(--state-color, var(--clr-primary-100)) calc(var(--prox, 0) * 100%),
      var(--clr-border-100));
    --element-flare-opacity: calc(var(--prox, 0) * 0.06);
  }

  /* INERT (no modal, no link): kill the pointer affordance entirely. */
  &.is-static {
    cursor: default;
    &:hover, &:focus-visible { transform: none; }
  }

  /* Direct hover/focus: snap to full lift + status border + flare. */
  &:hover, &:focus-visible {
    border-color: var(--state-color, var(--clr-primary-100));
    transform: translateY(-4px);
    --element-flare-opacity: 0.06;
  }

  /* GHOST: an empty slot that pads the grid to a full row. */
  &--ghost {
    pointer-events: none;
    cursor: default;
    border-style: dashed;
    background: color-mix(in srgb, var(--clr-neutral-500) 40%, transparent);
    opacity: 0.25;
    min-height: 310.34px;        /* matches a real card's typical height → no reflow */
  }

  /* NON-MODAL cards (link-only or inert) must NOT lift — undo the generic
     hover rule so only modal cards get the affordance. */
  &:not(.has-modal) {
    &:hover, &:focus-visible {
      border-color: var(--clr-border-100);
      transform: none;
      --element-flare-opacity: 0;
    }
  }

  /* ENDED: override the token itself so EVERY descendant (flare, border,
     segments, labels) recolors to warning-orange via the cascade — one line. */
  &.is-ended { --state-color: var(--clr-warning-100); }
}
```

The purposeful bits:
- **`--prox` proximity easing** — `use-proximity-hover` sets a per-card `--prox`
  from ~0 (far) to 1 (hovered) based on pointer distance, so lift + border tint
  + flare fade *in* as the cursor approaches, then hover snaps to the final
  state. Only `.has-modal` cards subscribe.
  **On touch there is no cursor, so the middle of the viewport becomes the
  pointer.** Passing `{ mobileFocus: true }` switches the composable to a
  scroll-driven path: rects are cached in *document* space (so a scroll frame
  is pure arithmetic, no `getBoundingClientRect`), an IntersectionObserver
  gates the work to the on-screen section and clears `--prox` when it leaves,
  and the falloff band tightens to 90px so exactly the centred card lights.
  The distance model is identical to the pointer path — a virtual pointer at
  the viewport centre. Opted in by the experience cards and the project +
  featured cards; skills chips stay desktop-only. Reduced motion still bails
  out of both paths before any listener is bound.
- **`isolation` + `contain`** — each card is its own paint/stacking island so
  the flare pseudo and the absolute hit-area never leak, and hover repaints stay
  local.
- **`.is-ended { --state-color: … }`** — the single most economical line in the
  file: recoloring one variable repaints the entire card warning-orange because
  every child reads that token.

### 16.5 Card anatomy — the interactive overlay

Cards are always a plain `<div>`; the click target is a **child overlay** so the
outer element never carries interactive semantics (no nested-interactive
violations, and WCAG 2.5.3 passes trivially because the overlay has no visible
text — `aria-label` is the whole accessible name):

```html
<button v-if="card.has_modal" class="…__card-hit-area" :aria-label="_card_hit_label(card)" @click="open_modal(card.key)" />
<a v-else-if="card.has_link" :href="card.url" target="_blank" rel="noopener noreferrer" class="…__card-hit-area" :aria-label="card.name" />
```

```scss
&__card-hit-area {
  position: absolute;
  inset: 0;
  z-index: 1;            /* covers the card… */
  background: transparent;
  border: 0;
  cursor: pointer;
  &:focus-visible { outline: 2px solid var(--clr-primary-100); outline-offset: 2px; }
}
```

The visible repo link (`.is-corner`) sits at `z-index: 2`, **above** the
hit-area, so it stays independently clickable while the rest of the card opens
the modal.

### 16.6 Header — the status indicator state machine

The header shows a status glyph that *changes shape by state*, plus a right-
aligned index number:

```html
<span class="…__status">
  <span   v-if="card.status_id === 'DONE'" class="icon-glyph" :data-text="GLYPH_ENDED" aria-hidden="true" />
  <UiStateGrid v-else-if="card.status_id === 'WORKING_ON' || card.status_id === 'IN_PROGRESS'" />
  <span   v-else class="state-square" aria-hidden="true" />
  {{ card.status_label }}
</span>
<span class="…__index-num" :data-text="`#${String(page_idx * PAGE_SIZE + idx + 1).padStart(2, '0')}`" aria-hidden="true" />
```

| State | Indicator | Meaning |
|---|---|---|
| `DONE` | ✓ check glyph () | finished / delivered |
| `WORKING_ON` / `IN_PROGRESS` | animated **3×3 state-grid** (pulsing ripple) | actively moving |
| everything else (`ON_HOLD`, `ON_TODO`…) | static **`.state-square`** | queued / paused |

`.state-square` is an 8px block colored by `--state-color` with a matching glow:

```scss
.state-square {
  width: 8px; height: 8px;
  background: var(--state-color, var(--clr-primary-100));
  box-shadow: 0 0 6px color-mix(in srgb, var(--state-color, var(--clr-primary-100)) 60%, transparent);
}
```

The whole `__status` label is colored `var(--state-color)` and `font-weight:700`,
so the status word itself is always the card's theme color.

### 16.7 The countdown panel — a four-branch state machine

The `__countdown` box is the heart of the card. Which branch renders depends on
the card's temporal state; all four share the same segmented look:

| Branch | Condition | Header | Segments |
|---|---|---|---|
| **Count-up** | `is_working_on` (live client work) | `STARTED IN` + start date | elapsed `Nd HHh MMm SSs`, ticking up every second |
| **Count-down** | `!ended && countdown` | `ENDS IN` + deadline date | remaining time to the next future deadline |
| **Ended (deadline passed)** | `ended` | `ENDED IN` | frozen `ended_segs`, styled `--ended` |
| **Completed (fallback)** | else | `ENDED IN` | frozen `completed_segs` from the project's `ended` timestamp |

```html
<div v-if="card.is_working_on" class="…__countdown">
  <div class="…__countdown-head">
    <span class="…__countdown-label">{{ t('…started-in-prefix') }}</span>
    <span v-if="card.started_text" class="…__countdown-date">{{ card.started_text }}</span>
  </div>
  <div class="…__countdown-segments">
    <span v-for="seg in elapsed_segments(card.started_ms)" :key="seg" class="…__segment">{{ seg }}</span>
  </div>
  <span class="…__countdown-tz">{{ t('…timezone-label') }}</span>
</div>
<div v-else-if="!card.ended && card.countdown" class="…__countdown"> … ENDS IN … </div>
<div v-else-if="card.ended"                    class="…__countdown"> … ENDED IN (--ended) … </div>
<div v-else                                     class="…__countdown"> … completed (--ended) … </div>
```

The live count-up is driven by a shared 1 Hz `setInterval` that only ticks a
reactive `_tick` ref (paused via `visibilitychange` when the tab is hidden). The
`void _tick.value` read inside `elapsed_segments()` scopes re-renders to just the
segment spans, not the whole card list. The wall-clock is stored in a
**non-reactive** `_now_ms_raw` and starts at `0` on both SSR and first CSR paint
so the prerendered HTML matches hydration; `onMounted` then flips it to the real
clock.

Each segment is a status-colored mono tile — one visual, both live and frozen:

```scss
&__segment {
  font-family: "SpaceMono", monospace;
  font-size: var(--fs-300);
  font-weight: 700;
  padding: 0.4rem 0.6rem;
  min-width: 2.5rem;
  text-align: center;
  background: color-mix(in srgb, var(--state-color, var(--clr-primary-100)) 10%, var(--clr-neutral-500));
  border: 1px solid var(--state-color, var(--clr-primary-100));
  color: var(--state-color, var(--clr-primary-100));

  &--ended { /* same treatment — inherits warning-orange via .is-ended */ }
}
```

`--ended` exists mainly as a semantic hook; because `.is-ended` already
overrides `--state-color` to warning, the ended segments turn orange *through the
same tokens* as the live ones — no separate color declarations needed.

The `__countdown-label` and `__countdown-date` are `var(--state-color)` mono
text; the `__countdown-tz` is a faint neutral-300 "AMERICA/BOGOTA" stamp.

### 16.8 The rest of the card body

- **`__name-block`** — baseline-aligned flex-wrap of the Geomanist `__name`
  (`--fs-500`, neutral-100) + a `.kyo-chip` `__version` badge (the status-neutral
  yellow pill).
- **`__milestone`** — a mono `// LABEL` line in neutral-300 (the roadmap
  headline).
- **`__card-description`** — optional short blurb (neutral-300), only shown when
  the card has its own milestone label (`show_description`). A full description
  is *also* mirrored into an `.sr-only` block so screen readers and SEO get the
  rich text even though the visible card stays compact.
- **`__link`** — the visible repo affordance, separated by a dashed top border,
  with a repo glyph, `__link-text`, and a small external-link glyph
  (`__link-external`, `--icon-glyph-size: 0.85em`). `.is-corner` raises it above
  the hit-area and turns it primary on hover.
- **`__no-link`** — for cards with no URL, a dashed-topped neutral-300 "no link"
  note keeps the footer height consistent with linked cards.

### 16.9 The pager, ghosts, and page transition

- **Grid** — `__cards` is `1fr → repeat(2) (sm) → repeat(3) (lg)`. Mobile shows
  3 cards/page, desktop 6 (`PAGE_SIZE`).
- **Ghost padding** — `padded_main_cards` fills the last page with `null`s so a
  short final page still renders a full grid; each becomes a `--ghost` card
  (dashed, 25% opacity, fixed `min-height`) that is `aria-hidden` and
  non-interactive. This keeps the grid rectangular without layout jumps.
- **Page transition** — the `<ul>` is `:key="page_idx"` inside a
  `<Transition :name="page-fwd|page-bck" mode="out-in">`, so turning the page
  slides the outgoing grid out and the incoming grid in *from the direction of
  travel*:

  ```scss
  .page-fwd-enter-from  { opacity: 0; transform: translateX(24px); }
  .page-fwd-leave-to    { opacity: 0; transform: translateX(-24px); }
  .page-bck-enter-from  { opacity: 0; transform: translateX(-24px); }
  .page-bck-leave-to    { opacity: 0; transform: translateX(24px); }
  ```

- **Controls** — `__pagination-nav` prev/next (2.5rem primary-bordered squares
  that lift `-2px` on hover) flank centered `__pagination-dot`s (2.25rem/27px hit
  target around a 0.6rem primary pip via `::before`; active = filled + scale
  1.25). Touch users also get **swipe paging** (`on_swipe_start`/`on_swipe_end`,
  50px horizontal-dominant threshold, never hijacks vertical scroll).

### 16.10 FEATURED chips — the compact sibling

Below the pager, `__featured-grid` (1 → 3 col) holds `__featured-item` chips —
a stripped-down card:

```scss
&__featured-item {
  position: relative;
  display: grid;
  gap: 0.75rem;
  padding: 1.25rem;
  border: 1px solid var(--clr-border-100);
  border-color: color-mix(in srgb, var(--clr-primary-100) calc(var(--prox, 0) * 100%), var(--clr-border-100));
  transform: translateY(calc(-2px * var(--prox, 0)));   /* same proximity lift, gentler */
  isolation: isolate;
  contain: layout paint;
  --element-flare-color: var(--clr-primary-100);
  --element-flare-opacity: calc(var(--prox, 0) * 0.06);

  &.is-static { cursor: default; &:hover, &:focus-visible { transform: none; border-color: var(--clr-border-100); } }
  &:hover, &:focus-visible { border-color: var(--clr-primary-100); transform: translateY(-2px); --element-flare-opacity: 0.06; }
}
```

It reuses the proximity + flare + `is-static` grammar of the big cards, but pins
the flare to primary-yellow (not `--state-color`) and shows only a mono status
head, a Geomanist name + version, and a stretched-link `__featured-hit` overlay
(same empty-anchor accessibility pattern as the NOW cards). Featured status still
sets `--state-color` for the `.state-square` and version color.

### 16.11 Purpose recap — why it's built this way

- **One token, whole-card theming** — `--state-color` means a project's status
  colors its border, glow, status word, countdown label, and every time segment
  with zero per-element color logic; `.is-ended` reskins the entire card by
  flipping that one variable.
- **Proximity + flare = "alive" chrome** — `--prox` and the viewport-gated
  `.element-flare` make interactive cards breathe and lean toward the cursor
  while staying compositor-cheap and off entirely when off-screen.
- **State-shaped affordances** — the header indicator morphs (check / pulsing
  grid / static square) and the countdown swaps among four branches, so a glance
  tells you whether a project is done, live, waiting, counting down, or counting
  up.
- **Accessible by construction** — plain-`div` cards with empty overlay
  hit-areas, `sr-only` full descriptions, `aria-hidden` decorative HUD numbers,
  and ghost padding that never confuses the reading order.

---

## 17. Document Pages (`/resume`, `/privacy`) — the shared shell

The two secondary routes are not landing sections; they are **documents**, and
they render through one shell: `views/components/document-page.vue`.

Before this existed, `resume.vue` held the whole page vocabulary in its own
scoped block and the privacy policy was two standalone files in `public/` with
a hardcoded palette (`#0a0a0a` / `#ffd400`), `system-ui` type and no navigation
— a second, unmanaged design system. Both pages are now routes built from the
same parts.

### 17.1 What the shell owns

| Piece | Notes |
|---|---|
| `.doc` | page padding `3.5rem 1.25rem 4rem` |
| `.doc__sheet--sheet` | **58rem** — the printed-CV sheet. Signed as is |
| `.doc__sheet--prose` | `font-size: --fs-300` + `max-width: --kyo-measure` |
| `.doc__crumbs` | breadcrumb trail, always flush left |
| `.doc__head--center` / `--left` | masthead alignment |
| `.doc__signoff` | replaces the site footer (document routes render none) |
| delegated `[data-tip]` | one cursor tooltip for the whole sheet |

Body vocabulary, opt-in by class, applied through `:deep()` because slot content
carries the **consumer's** scope id, not the shell's:
`.doc-block` · `.doc-block__title` · `.doc-sub` · `.doc-prose` · `.doc-list` ·
`.doc-rich` (styles bare `p`/`ul`/`li` for HTML that arrives from an i18n
string and therefore cannot carry classes).

Page-specific furniture stays with its page: the CV's masthead, contact row,
entry heads and tech line live in `resume.vue`; the policy's eyebrow and title
live in `privacy.vue`.

### 17.2 The two width modes

`prose` declares `font-size` and `max-width` **on the same element** — the rule
from §7.4, because `ch` resolves against that element's own computed size. The
payoff is that the shell steps with the type scale for free: `--fs-300` goes
`1.15rem → 1.125rem → 1.25rem`, so the sheet measures 574px / 562px / 624px
without a single hardcoded breakpoint width. Contrast `ui/modal.vue`, which
needs literal `645px` / `760px` because it adds gutters and body padding in
`rem` on top of the measure.

`sheet` is the CV's 58rem and is **not** re-measured — owner ruling
2026-08-19: `--kyo-measure` governs landing surfaces, the printed-CV sheet
stays as signed. Measured longest line (chromium, longest-line method):
FAQ **86ch** · privacy **91ch** · resume **103ch** — resume unchanged.

### 17.3 Alignment

The CV centres its masthead like the printed document (`align="center"`). The
privacy policy is not a CV and reads **flush left throughout, title included**
(`align="left"`). Both keep the breadcrumb flush left regardless, so the trail
reads as chrome rather than as part of the document.

### 17.4 Nav modes

`widgets/hud-nav.vue` has three modes, resolved by `usePageKind()`:

| Mode | Section links | Skip link | Mobile drawer | CV download | Lang + socials |
|---|---|---|---|---|---|
| `landing` | yes | yes | yes | no | yes |
| `resume` | no | no | no | **yes** | yes |
| `privacy` | no | no | no | no | yes |

The CV button is icon-only, so its meaning depends entirely on being on the CV
page — which is why the privacy mode drops it.

### 17.5 Bundle shape

Both views are **async**. `resume.vue` used to be a static import in `App.vue`,
so its 463 B (gzip) of scoped CSS shipped inside the main bundle and downloaded
on the landing page, which renders none of it. Splitting them moved main CSS
**11.96 → 11.46 KB / 12**. Chunks: `document-page` 1.95 KB · `resume` 2.29 KB ·
`privacy` 969 B (JS+CSS gzip).

`<Suspense>` around each view is load-bearing: it is what makes `vite-ssg`
await the chunk during prerender, so the full document still ships in the HTML
for crawlers. Chunk CSS is emitted as a real blocking `<link>` per prerendered
page, so there is no FOUC.

**Caveat:** the policy copy lives in `snippets.js`, which is eagerly bundled, so
it costs **2,162 B gzip in the main JS bundle** (measured by build A/B) rather
than in the privacy chunk.

---

*Generated from source inspection of `src/scss/**` and all
`src/**/*.vue` `<style>` blocks. Token values are transcribed verbatim; when in
doubt, `src/scss/abstracts/_variables.scss` and `_theme.scss` are the source of
truth.*
