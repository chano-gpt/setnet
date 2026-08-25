#!/usr/bin/env bash
# Rebuild the bundled IBM Plex Sans KR Hangul subsets in web/public/fonts/.
#
# NOT part of the build, for the same reason as scripts/build-nerd-font.sh: this needs Python +
# fonttools + brotli, and requiring those to build setnet would be a worse trade than the megabyte
# in git. The .woff2 files are committed — a webfont is a release artifact, not a build step.
#
# WHY IT IS A SEPARATE FACE FROM THE LATIN ONE. IBM Plex Sans (Latin) is a variable font: one 45 KB
# file answers every weight, and it is small enough to precache. Plex Sans KR has no variable
# version upstream (google/fonts ships seven static weights), and Hangul is ~11k syllables, so each
# weight is its own ~375 KB file. Those two facts force opposite caching rules, which is why the
# Latin face is in the precache and these are not — see web/src/index.css and web/vite.config.ts.
#
# WHY ONLY TWO WEIGHTS. Korean in setnet is workspace labels, tab labels, pane titles and the
# composer draft: regular text and semibold labels. Every additional weight is another ~375 KB for
# a register the UI does not use. Adding one means adding a @font-face AND a FONT_URLS entry AND a
# fonts.test.ts expectation — the test is what stops a weight landing in only one of the three.
#
# WHY THE RANGE EXCLUDES LATIN. Plex Sans (Latin) is listed first in --font-sans and covers it. If
# these faces carried Latin too, the browser would still take it from the first available face, but
# the bytes would be paid for twice.
#
#   pip install 'fonttools[woff]'      # or: uv run --with 'fonttools[woff]' …
#   scripts/build-plex-kr.sh [version]
set -euo pipefail

VERSION="${1:-1.001}"
OUT="$(cd "$(dirname "$0")/.." && pwd)/web/public/fonts"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

command -v pyftsubset >/dev/null || { echo "pyftsubset not found — pip install 'fonttools[woff]'" >&2; exit 1; }

# Hangul syllables, plus conjoining and compatibility jamo so a decomposed or standalone jamo (an
# IME mid-composition, a lone ㄱ in a label) renders in the same face rather than falling through.
RANGE='U+1100-11FF,U+3130-318F,U+A960-A97F,U+AC00-D7A3,U+D7B0-D7FF'

mkdir -p "$OUT"
fetch_and_subset() { # <weight> <upstream file>
  local weight="$1" file="$2"
  echo "→ $file"
  curl -fsSL -o "$WORK/$file" \
    "https://github.com/google/fonts/raw/main/ofl/ibmplexsanskr/$file"
  pyftsubset "$WORK/$file" --unicodes="$RANGE" --flavor=woff2 --layout-features='' \
    --no-hinting --desubroutinize --output-file="$OUT/plex-kr-$VERSION-$weight-hangul.woff2"
}

fetch_and_subset 400 IBMPlexSansKR-Regular.ttf
fetch_and_subset 600 IBMPlexSansKR-SemiBold.ttf

curl -fsSL -o "$OUT/LICENSE-IBMPlexSans.txt" \
  "https://raw.githubusercontent.com/google/fonts/main/ofl/ibmplexsanskr/OFL.txt"

ls -lh "$OUT"/plex-kr-*.woff2
