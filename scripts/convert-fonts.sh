#!/usr/bin/env bash
#
# Copyright (c) 2026 Cristian D. Moreno — @Kyonax
# Mozilla Public License 2.0 — see LICENSE.
#
# convert-fonts.sh — TTF → WOFF2 conversion + optional unicode-range subsetting.
#
# Requires:
#   - python3 + pip install fonttools brotli
#   - or: woff2_compress + pyftsubset on PATH
#
# Usage:
#   ./scripts/convert-fonts.sh                                 # auto-detect input dir
#   ./scripts/convert-fonts.sh src/fonts                       # explicit input
#   ./scripts/convert-fonts.sh --subset                        # apply Latin Extended subset
#   ./scripts/convert-fonts.sh --symbols-glyphs=FILE           # use FILE as Symbols Nerd glyph list
#   ./scripts/convert-fonts.sh --latin-subset=FILE             # use FILE as Latin glyph list (non-Symbols fonts)
#   ./scripts/convert-fonts.sh --only=PATTERN                  # process only fonts whose path matches PATTERN
#
# Examples:
#   ./scripts/convert-fonts.sh --subset --symbols-glyphs=scripts/_nerd-font-glyphs.txt --only=Symbols
#   ./scripts/convert-fonts.sh --subset --latin-subset=scripts/_latin-corpus.txt --only=Geomanist
#   ./scripts/convert-fonts.sh --subset --latin-subset=scripts/_latin-corpus.txt --only=SpaceMono

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
INPUT="${REPO_ROOT}/src/fonts"
[[ -d "$INPUT" ]] || INPUT="${REPO_ROOT}/../kyo-web-online-old/src/app/fonts"

SUBSET=false
SYMBOLS_LIST=""
LATIN_LIST=""
ONLY_PATTERN=""
for arg in "$@"; do
  case "$arg" in
    --subset)               SUBSET=true ;;
    --symbols-glyphs=*)     SYMBOLS_LIST="${arg#*=}" ;;
    --latin-subset=*)       LATIN_LIST="${arg#*=}" ;;
    --only=*)               ONLY_PATTERN="${arg#*=}" ;;
    /*|src/*|../*)          INPUT="$arg" ;;
  esac
done

if [[ ! -d "$INPUT" ]]; then
  echo "✘ font input dir not found: $INPUT" >&2
  exit 1
fi

# Latin Extended unicode range — covers most Western European text + the
# special chars used in the project (©, ™, etc.). Override per font if needed.
LATIN_EXT="U+0020-024F,U+2000-206F,U+2122,U+00A9,U+00AE"

command -v pyftsubset >/dev/null 2>&1 || { echo "✘ pyftsubset not found. Install: pip install fonttools brotli" >&2; exit 1; }

mkdir -p "${REPO_ROOT}/src/fonts"

count=0
while IFS= read -r -d '' ttf; do
  name="$(basename "$ttf" .ttf)"
  rel="${ttf#$INPUT/}"
  if [[ -n "$ONLY_PATTERN" && "$rel" != *"$ONLY_PATTERN"* ]]; then
    continue
  fi
  rel_dir="$(dirname "$rel")"
  out_dir="${REPO_ROOT}/src/fonts/$rel_dir"
  mkdir -p "$out_dir"

  woff2_out="${out_dir}/${name}.woff2"

  if [[ "$SUBSET" == "true" ]]; then
    # Symbols-Nerd-Font gets its own glyph list (icon-only payload).
    # Flags: drop OT layout features (no shaping needed for icons),
    # drop hinting (icons render fine without it), keep .notdef outline
    # so unmapped glyphs render a visible tofu instead of zero-width.
    if [[ "$name" == *Symbols* && -n "$SYMBOLS_LIST" ]]; then
      pyftsubset "$ttf" \
        --output-file="$woff2_out" \
        --flavor=woff2 \
        --unicodes-file="$SYMBOLS_LIST" \
        --layout-features-='*' \
        --no-hinting \
        --notdef-outline \
        --symbol-cmap --legacy-cmap
    elif [[ -n "$LATIN_LIST" ]]; then
      pyftsubset "$ttf" \
        --output-file="$woff2_out" \
        --flavor=woff2 \
        --unicodes-file="$LATIN_LIST" \
        --layout-features='kern,liga,clig,calt'
    else
      pyftsubset "$ttf" \
        --output-file="$woff2_out" \
        --flavor=woff2 \
        --unicodes="$LATIN_EXT" \
        --layout-features='kern,liga,clig,calt'
    fi
  else
    pyftsubset "$ttf" \
      --output-file="$woff2_out" \
      --flavor=woff2 \
      --no-subset-tables+=GSUB,GPOS,GDEF
  fi

  before=$(stat -c%s "$ttf" 2>/dev/null || stat -f%z "$ttf")
  after=$(stat -c%s "$woff2_out" 2>/dev/null || stat -f%z "$woff2_out")
  pct=$(( (before - after) * 100 / before ))
  printf "  ✓ %-50s %6d → %6d B  (-%d%%)\n" "$rel" "$before" "$after" "$pct"
  count=$((count + 1))
done < <(find "$INPUT" -type f -name '*.ttf' -print0)

echo ""
echo "Converted $count fonts."
echo "Update _mixins.scss font-face mixin to point at .woff2 (see SASS_THEMING_MIGRATION.md §6 Step 2.5)."
