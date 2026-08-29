#!/usr/bin/env bash
# Rebuild the bundled Space Mono Latin faces in web/public/fonts/.
#
# The files are committed release assets, not part of the normal build. Source is pinned to the
# exact upstream revision recorded by Google Fonts so an unchanged public URL can never acquire
# different bytes behind the service worker's permanent font cache.
#
#   uv run --with 'fonttools[woff]' scripts/build-space-mono.sh
set -euo pipefail

REVISION="ade3d1533e06b2b1462ffcde8e08b129627ca360"
VERSION="ade3d15"
OUT="$(cd "$(dirname "$0")/.." && pwd)/web/public/fonts"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

command -v pyftsubset >/dev/null || { echo "pyftsubset not found — use uv run --with 'fonttools[woff]'" >&2; exit 1; }

# Same Latin coverage as the primary UI face. Space Mono carries no Hangul; those characters fall
# through to the platform monospace stack instead of paying for glyphs this family does not have.
RANGE='U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD'

mkdir -p "$OUT"
fetch_and_subset() { # <weight> <upstream file>
  local weight="$1" file="$2"
  echo "→ $file"
  curl -fsSL -o "$WORK/$file" \
    "https://raw.githubusercontent.com/google/fonts/$REVISION/ofl/spacemono/$file"
  pyftsubset "$WORK/$file" --unicodes="$RANGE" --flavor=woff2 --layout-features='*' \
    --output-file="$OUT/space-mono-$VERSION-$weight-latin.woff2"
}

fetch_and_subset 400 SpaceMono-Regular.ttf
fetch_and_subset 700 SpaceMono-Bold.ttf

curl -fsSL -o "$OUT/LICENSE-SpaceMono.txt" \
  "https://raw.githubusercontent.com/google/fonts/$REVISION/ofl/spacemono/OFL.txt"

ls -lh "$OUT"/space-mono-*.woff2
