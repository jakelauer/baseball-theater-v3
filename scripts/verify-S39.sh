#!/usr/bin/env bash
# Grader for BACKLOG story S39 — theme to the ratified palette + dark-only lock.
# Contract: docs/v3/BACKLOG.md#verify-script-contract
# No network. No writes outside /tmp. Does its own checking (never `pnpm verify`).

set -uo pipefail
cd "$(dirname "$0")/.."

# shellcheck source=lib/checks.sh
source "$(dirname "$0")/lib/checks.sh"

check 1 "styles.css sets --bt-dark #10100F, drops #211819, defines Raised / Raised current / Primary Light"
check 2 "theme exposes pitch ball / strike / in-play roles with the ratified hex values"
check 3 "App.tsx locks the color scheme to dark and drops defaultColorScheme=auto"
check 4 "a web Vitest test asserts the #10100F page ground and dark color scheme"
check 5 "index.html sets theme-color #10100F"
check 6 "pages/ and layout/ contain no ratified-palette hex"
check 7 "the S39 theme test passes on its own"
check 8 "backlog Status is done"

CSS="web/src/styles.css"
APP="web/src/App.tsx"
HTML="web/index.html"
TEST="web/src/App.test.tsx"

# Theme sources: styles.css plus whichever file holds createTheme().
THEME_FILES="$CSS $APP"
extra=$(grep -rlE 'createTheme\(' web/src --include='*.ts' --include='*.tsx' 2>/dev/null | grep -v '\.test\.' || true)
[ -n "$extra" ] && THEME_FILES="$THEME_FILES $extra"

# --- Check 1: base surface + brand-text tokens --------------------------------
if [ ! -f "$CSS" ]; then
  bad 1 "$CSS missing"
else
  grep -qiE -- '--bt-dark:\s*#10100f' "$CSS" || bad 1 "$CSS does not set --bt-dark: #10100F"
  grep -qi '#211819' "$CSS" && bad 1 "$CSS still contains #211819"
  for hex in 1c1a19 272422 ff5247; do
    grep -qiE -- "--[a-z0-9-]+:\s*#$hex" "$CSS" || bad 1 "$CSS defines no custom property with #$hex"
  done
fi

# --- Check 2: pitch-outcome roles ----------------------------------------------
# shellcheck disable=SC2086
pitch_lines=$(cat $THEME_FILES 2>/dev/null | grep -iE 'pitch' || true)
echo "$pitch_lines" | grep -iE 'ball' | grep -qi '#72d991' || bad 2 "no pitch ball role set to #72D991"
echo "$pitch_lines" | grep -iE 'strike' | grep -qi '#ff5247' || bad 2 "no pitch strike role set to #FF5247"
echo "$pitch_lines" | grep -iE 'in-play|inplay' | grep -qi '#4a90d9' || bad 2 "no pitch in-play role set to #4A90D9"

# --- Check 3: dark-only lock ---------------------------------------------------
if [ ! -f "$APP" ]; then
  bad 3 "$APP missing"
else
  grep -qE 'defaultColorScheme\s*=\s*"auto"' "$APP" && bad 3 "$APP still sets defaultColorScheme=\"auto\""
  if ! grep -qE 'forceColorScheme\s*=\s*"dark"' "$APP"; then
    grep -qE 'defaultColorScheme\s*=\s*"dark"' "$APP" || bad 3 "$APP sets neither forceColorScheme=\"dark\" nor defaultColorScheme=\"dark\""
    grep -rqE 'setColorScheme|useMantineColorScheme' web/src --include='*.tsx' --include='*.ts' &&
      bad 3 "defaultColorScheme=\"dark\" used but a color-scheme toggle exists in web/src"
  fi
fi

# --- Check 4: test asserts page ground + scheme --------------------------------
if [ ! -f "$TEST" ]; then
  bad 4 "$TEST missing"
else
  grep -qE '<App\b|MantineProvider' "$TEST" || bad 4 "$TEST renders neither App nor a MantineProvider tree"
  grep -qi '#10100f' "$TEST" || bad 4 "$TEST does not assert #10100F"
  grep -q 'data-mantine-color-scheme' "$TEST" || bad 4 "$TEST does not assert data-mantine-color-scheme"
fi

# --- Check 5: browser chrome ---------------------------------------------------
if [ ! -f "$HTML" ]; then
  bad 5 "$HTML missing"
else
  grep -qiE 'name="theme-color"\s+content="#10100F"' "$HTML" || bad 5 "$HTML theme-color is not #10100F"
fi

# --- Check 6: tokens only in pages/layout ---------------------------------------
hexhits=$(grep -rniE '#10100F|#1C1A19|#272422|#FF5247|#4A90D9' web/src/pages web/src/layout 2>/dev/null || true)
[ -n "$hexhits" ] && { bad 6 "ratified-palette hex found in pages/ or layout/:"; echo "$hexhits" | sed 's/^/        /'; }

# --- Check 7: the test passes alone --------------------------------------------
if [ -f "$TEST" ]; then
  out=$(pnpm --filter @bt/web exec vitest run src/App.test.tsx 2>&1)
  rc=$?
  [ $rc -eq 0 ] || { bad 7 "vitest exited $rc"; echo "$out" | tail -20 | sed 's/^/        /'; }
else
  bad 7 "$TEST missing"
fi

# --- Check 8: backlog Status is done -------------------------------------------
grep -qE '^\| [0-9]+ \| \[S39\].*\| `done` \|$' docs/v3/BACKLOG.md ||
  bad 8 "S39 row in the Story status table is not \`done\`"
awk '/^### S39 —/{f=1;next} /^### S[0-9]/{f=0} f' docs/v3/BACKLOG.md \
  | grep -qE '^\*\*Status:\*\* `done`$' ||
  bad 8 "S39 story heading Status is not \`done\`"

report "verify-S39"
exit $?
