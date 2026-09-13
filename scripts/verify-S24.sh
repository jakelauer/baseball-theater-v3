#!/usr/bin/env bash
# Grader for BACKLOG story S24 — brand theme tokens + system color mode.
# Contract: docs/v3/BACKLOG.md#verify-script-contract
# No network. No writes outside /tmp. Does its own checking (never `pnpm verify`).

set -uo pipefail
cd "$(dirname "$0")/.."

# shellcheck source=lib/checks.sh
source "$(dirname "$0")/lib/checks.sh"

check 1 "styles.css defines the five brand tokens with the right hex values"
check 2 "styles.css drops the night-park vars and the body radial-gradient"
check 3 "theme sets defaultColorScheme=auto and drops primaryColor teal"
check 4 "theme anchors Mantine primary on #CE0F0F"
check 5 "theme does not set Fraunces headings; body font includes IBM Plex Sans"
check 6 "index.html drops Fraunces and sets a valid theme-color"
check 7 "pages/ and layout/ contain no brand-hex paint chips"
check 8 "backlog Status is done"

CSS="web/src/styles.css"
APP="web/src/App.tsx"
HTML="web/index.html"

THEME_SRC="$APP"
if [ -f "$APP" ] && grep -qE 'from "\./theme' "$APP"; then
  found=$(grep -rlE 'createTheme\(' web/src --include='*.ts' --include='*.tsx' 2>/dev/null | head -1)
  [ -n "$found" ] && THEME_SRC="$found"
fi

# --- Check 1: the five tokens, exact hex ------------------------------------
if [ ! -f "$CSS" ]; then
  bad 1 "$CSS missing"
else
  # bash 3.2 (macOS default) has no associative arrays — parallel lists instead.
  TOKEN_NAMES="--bt-primary --bt-dark --bt-light --bt-accent --bt-accent-2"
  TOKEN_VALS="#CE0F0F #211819 #FFF2D3 #F5AD1D #72D991"
  set -- $TOKEN_VALS
  for name in $TOKEN_NAMES; do
    want="$1"; shift
    grep -qiE "^\s*${name}:\s*${want};" "$CSS" ||
      bad 1 "$CSS does not define $name: $want"
  done
fi

# --- Check 2: the old scaffold is gone --------------------------------------
if [ -f "$CSS" ]; then
  grep -qE -- '--bt-field|--bt-clay|--bt-chalk' "$CSS" &&
    bad 2 "$CSS still defines a night-park token (--bt-field/--bt-clay/--bt-chalk)"
  grep -qE 'radial-gradient' "$CSS" &&
    bad 2 "$CSS still has a radial-gradient (VISUAL-DESIGN: flat grounds, no page gradients)"
fi

# --- Check 3: color scheme + no teal -----------------------------------------
if [ ! -f "$APP" ]; then
  bad 3 "$APP missing"
else
  grep -qE 'defaultColorScheme\s*=\s*"auto"' "$APP" ||
    bad 3 "$APP does not set defaultColorScheme=\"auto\""
  grep -qE 'primaryColor:\s*"teal"|primaryColor:\s*.teal.' "$THEME_SRC" 2>/dev/null &&
    bad 3 "$THEME_SRC still sets primaryColor to teal"
fi

# --- Check 4: primary anchored on the brand hex ------------------------------
grep -qiE '#ce0f0f' "$THEME_SRC" 2>/dev/null ||
  bad 4 "$THEME_SRC does not reference #CE0F0F (no anchored primary scale)"

# --- Check 5: fonts ----------------------------------------------------------
if [ -f "$THEME_SRC" ]; then
  awk '/headings\s*:/{f=1} f{print} f&&/}/{exit}' "$THEME_SRC" | grep -qi 'fraunces' &&
    bad 5 "$THEME_SRC still sets headings fontFamily to Fraunces"
  grep -qi 'IBM Plex Sans' "$THEME_SRC" ||
    bad 5 "$THEME_SRC body fontFamily does not include IBM Plex Sans"
fi

# --- Check 6: index.html -----------------------------------------------------
if [ ! -f "$HTML" ]; then
  bad 6 "$HTML missing"
else
  grep -qi 'fraunces' "$HTML" && bad 6 "$HTML still loads Fraunces"
  grep -qE 'theme-color"\s+content="#(211819|FFF2D3)"' "$HTML" ||
    bad 6 "$HTML theme-color is not #211819 or #FFF2D3"
fi

# --- Check 7: no paint chips in pages/layout ---------------------------------
hexhits=$(grep -rniE '#CE0F0F|#211819|#FFF2D3|#F5AD1D|#72D991|#0b1f17|#c45c26' \
  web/src/pages web/src/layout 2>/dev/null || true)
[ -n "$hexhits" ] && { bad 7 "brand hex found in pages/ or layout/:"; echo "$hexhits" | sed 's/^/        /'; }

# --- Check 8: backlog Status is done -----------------------------------------
grep -qE '^\| 14 \| \[S24\].*\| `done` \|$' docs/v3/BACKLOG.md ||
  bad 8 "S24 row in the Story status table is not \`done\`"
awk '/^### S24 —/{f=1;next} /^### S[0-9]/{f=0} f' docs/v3/BACKLOG.md \
  | grep -qE '^\*\*Status:\*\* `done`$' ||
  bad 8 "S24 story heading Status is not \`done\`"

report "verify-S24"
exit $?
