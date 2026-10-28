#!/usr/bin/env bash
# Grader for BACKLOG story S60 — app shell to the ratified frames + one layout host.
# Contract: docs/v3/BACKLOG.md#verify-script-contract
# No network. No writes outside /tmp. Does its own checking (never `pnpm verify`).

set -uo pipefail
cd "$(dirname "$0")/.."

# shellcheck source=lib/checks.sh
source "$(dirname "$0")/lib/checks.sh"

check 1 "only web/src/layout/ reads the viewport and passes variant mobile|medium|desktop to pages (RTL at three widths); no useMediaQuery/hiddenFrom/visibleFrom elsewhere"
check 2 "mobile/medium: header with burger, wordmark, account control; burger opens the nav drawer, which closes on navigate. Desktop: 240px rail, exactly one aria-current by path prefix (/game/:pk -> Scoreboard), no burger (RTL)"
check 3 "game routes render the game top bar instead of the app header and keep the rail on desktop; room tabs span the full width (medium, Live)"
check 4 "FooterMeta renders Fetched {age} · baseball.theater from fetchedAgo in packages/domain (0s, 59s, 61s, 2h); never 'Scores hidden in settings'"
check 5 "NoticeSlot renders NoticeBanner (message, Reload, ✕) under the header; ✕ dismisses; message-only banner renders; the only notice component"
check 6 "one ViewState (loading keeps the title / empty / error + Retry) replaces components/game/RoomState.tsx; rooms and pages import it"
check 7 "favicon is the flag mark SVG; version line v3.0.{build} ({7-char commit}) injected by vite.config.ts from GITHUB_RUN_NUMBER (dev outside Actions), nothing written to package.json; format pinned by a test; no 'local fixtures' text in web/src"
check 8 "signed out: no Settings nav item, header shows 'Sign in' calling useSession().signIn(); signed in, the account control leads to Settings (RTL)"
check 9 "LiveIndicator is one component used by the game top bar; its blink stops under prefers-reduced-motion (test)"
check 10 "files this story adds or edits have no team-logo <img> or /logos/, and no useMediaQuery/hiddenFrom/visibleFrom outside web/src/layout/"
check 11 "backlog Status is done (story heading and Story status table)"

BASE=fb9c3bd
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

# run_vitest <check> <dir> <test file> [vitest args…] — run one test file alone; record a failure against <check>.
run_vitest() {
  local id="$1" dir="$2" file="$3"
  shift 3
  if [ ! -f "$dir/$file" ]; then
    bad "$id" "$dir/$file missing"
  elif ! (cd "$dir" && pnpm exec vitest run "$file" "$@" --reporter=json --outputFile="$TMP/r.json" >"$TMP/r.log" 2>&1); then
    bad "$id" "$dir/$file $* failed:"; tail -15 "$TMP/r.log" | sed 's/^/        /'
  elif ! node -e 'process.exit(require(process.argv[1]).numPassedTests > 0 ? 0 : 1)' "$TMP/r.json"; then
    bad "$id" "$dir/$file $* ran no passing test"
  fi
}

SHELL_TEST="src/layout/AppShellLayout.test.tsx"

# --- Check 1: one viewport host passes variant -------------------------------------------
for t in "mobile" "medium" "desktop" "variant"; do
  grep -qF "$t" "web/$SHELL_TEST" 2>/dev/null || bad 1 "$SHELL_TEST never mentions \"$t\""
done
# git grep -E has no \b here; -w gives the word match.
hits="$(git grep -nwE 'useMediaQuery|hiddenFrom|visibleFrom' -- web/src ':!web/src/layout/' || true)"
[ -n "$hits" ] && { bad 1 "breakpoint helpers outside web/src/layout/:"; echo "$hits" | sed 's/^/        /'; }
grep -q 'function SettingsRoute' web/src/routes.tsx && bad 1 "routes.tsx still has the SettingsRoute stopgap"
grep -q 'useLayoutVariant' web/src/routes.tsx && bad 1 "routes.tsx still reads the viewport"
run_vitest 1 web "$SHELL_TEST" -t "variant"

# --- Check 2: header, drawer, rail -------------------------------------------------------
for t in "burger" "drawer" "aria-current" "rail"; do
  grep -qiF "$t" "web/$SHELL_TEST" 2>/dev/null || bad 2 "$SHELL_TEST never mentions \"$t\""
done
grep -qE '240' web/src/layout/*.tsx 2>/dev/null || bad 2 "no 240px rail width in web/src/layout/"
run_vitest 2 web "$SHELL_TEST" -t "header|drawer|rail"

# --- Check 3: game routes + full-width room tabs -----------------------------------------
run_vitest 3 web "$SHELL_TEST" -t "game route"
grep -qF "full width" web/src/pages/GamePage.test.tsx || bad 3 "GamePage.test.tsx has no 'full width' test"
run_vitest 3 web "src/pages/GamePage.test.tsx" -t "full width"

# --- Check 4: FooterMeta + fetchedAgo ----------------------------------------------------
grep -qE 'export function fetchedAgo' packages/domain/src/*.ts || bad 4 "packages/domain exports no fetchedAgo"
grep -qE 'fetchedAgo' packages/domain/src/index.ts || grep -qE "export \* from \"\./fetched-ago" packages/domain/src/index.ts || bad 4 "fetchedAgo is not exported from @bt/domain"
F="$(grep -lE 'export function fetchedAgo' packages/domain/src/*.ts 2>/dev/null | head -1)"
if [ -n "$F" ]; then
  T="${F%.ts}.test.ts"
  for s in "0" "59" "61" "2 \\* 60 \\* 60|7200|2h"; do
    grep -qE "$s" "$T" 2>/dev/null || bad 4 "$T has no case matching $s"
  done
  run_vitest 4 packages/domain "src/$(basename "$T")"
fi
FM="web/src/layout/FooterMeta.tsx"
[ -f "$FM" ] || bad 4 "$FM missing"
grep -qE 'fetchedAgo' "$FM" 2>/dev/null || bad 4 "$FM does not call fetchedAgo"
grep -qF 'baseball.theater' "$FM" 2>/dev/null || bad 4 "$FM does not render baseball.theater"
hits="$(git grep -nF 'Scores hidden in settings' -- web/src || true)"
[ -n "$hits" ] && { bad 4 "web/src says 'Scores hidden in settings':"; echo "$hits" | sed 's/^/        /'; }
run_vitest 4 web "src/layout/FooterMeta.test.tsx"

# --- Check 5: NoticeSlot / NoticeBanner --------------------------------------------------
[ -f web/src/layout/NoticeSlot.tsx ] || bad 5 "web/src/layout/NoticeSlot.tsx missing"
grep -qE 'NoticeBanner' web/src/layout/NoticeSlot.tsx 2>/dev/null || bad 5 "NoticeSlot does not render NoticeBanner"
grep -qE 'NoticeSlot' web/src/layout/AppShellLayout.tsx || bad 5 "the shell does not render NoticeSlot"
n="$(git grep -lE 'export function [A-Za-z]*(Notice|Banner)[A-Za-z]*\(' -- web/src | grep -v '\.test\.' | wc -l | tr -d ' ')"
[ "$n" = "1" ] || bad 5 "expected one file exporting notice components, found $n"
run_vitest 5 web "src/layout/NoticeSlot.test.tsx"

# --- Check 6: one ViewState --------------------------------------------------------------
[ -f web/src/components/game/RoomState.tsx ] && bad 6 "components/game/RoomState.tsx still exists"
git grep -qE 'RoomLoading|RoomEmpty|RoomError' -- web/src && bad 6 "web/src still references RoomLoading/RoomEmpty/RoomError"
VS="$(git ls-files --cached --others --exclude-standard web/src | grep -E '/ViewState\.tsx$' || true)"
[ "$(echo "$VS" | grep -c . )" = "1" ] || bad 6 "expected exactly one ViewState.tsx, found: ${VS:-none}"
for p in web/src/pages/GamePage.tsx web/src/pages/ScoreboardPage.tsx; do
  grep -qE 'import .*ViewState' "$p" || bad 6 "$p does not import ViewState"
done
n="$(git grep -lE '<Loader([^A-Za-z]|$)' -- web/src | grep -v '\.test\.' | wc -l | tr -d ' ')"
[ "$n" = "1" ] || bad 6 "expected <Loader in one file (ViewState), found $n"
VT="${VS%.tsx}.test.tsx"
[ -n "$VS" ] && run_vitest 6 web "${VT#web/}"

# --- Check 7: favicon + version line -----------------------------------------------------
[ -f web/public/favicon.svg ] || bad 7 "web/public/favicon.svg missing"
grep -qE '<svg' web/public/favicon.svg 2>/dev/null || bad 7 "favicon.svg is not an SVG"
grep -qE 'rel="icon"[^>]*favicon\.svg|favicon\.svg[^>]*rel="icon"' web/index.html || bad 7 "index.html does not link favicon.svg as the icon"
grep -qF 'GITHUB_RUN_NUMBER' web/vite.config.ts || bad 7 "vite.config.ts does not read GITHUB_RUN_NUMBER"
grep -qE '"dev"' web/vite.config.ts || bad 7 "vite.config.ts has no dev fallback for the build number"
grep -qE 'writeFileSync|writeFile\(' web/vite.config.ts && bad 7 "vite.config.ts writes a file"
git diff --quiet "$BASE" -- web/package.json package.json || bad 7 "package.json changed"
grep -rqF 'v3.0.' web/src/layout/version.ts 2>/dev/null || bad 7 "web/src/layout/version.ts has no v3.0. format"
hits="$(git grep -niF 'local fixtures' -- web/src || true)"
[ -n "$hits" ] && { bad 7 "web/src still says 'local fixtures':"; echo "$hits" | sed 's/^/        /'; }
run_vitest 7 web "src/layout/version.test.ts"

# --- Check 8: signed-out shell ------------------------------------------------------------
grep -qF "Sign in" "web/$SHELL_TEST" 2>/dev/null || bad 8 "$SHELL_TEST never mentions \"Sign in\""
run_vitest 8 web "$SHELL_TEST" -t "signed"
run_vitest 8 web "src/routes.test.tsx"

# --- Check 9: LiveIndicator --------------------------------------------------------------
LI="$(git ls-files --cached --others --exclude-standard web/src | grep -E '/LiveIndicator\.tsx$' || true)"
[ "$(echo "$LI" | grep -c . )" = "1" ] || bad 9 "expected exactly one LiveIndicator.tsx, found: ${LI:-none}"
grep -qE 'LiveIndicator' web/src/components/game/GameTopBar.tsx || bad 9 "GameTopBar does not use LiveIndicator"
grep -qF 'LIVE' web/src/components/game/GameTopBar.tsx && bad 9 "GameTopBar still draws its own LIVE label"
if [ -n "$LI" ]; then
  LT="${LI%.tsx}.test.tsx"
  grep -qiE 'reduced' "$LT" 2>/dev/null || bad 9 "$LT has no reduced-motion test"
  run_vitest 9 web "${LT#web/}"
fi

# --- Check 10: no logos, breakpoints only in layout --------------------------------------
files="$( { git diff --name-only "$BASE" -- web/src; git ls-files --others --exclude-standard web/src; } | sort -u)"
for f in $files; do
  [ -f "$f" ] || continue
  grep -nE '/logos/|<img[^>]*logo' "$f" >/dev/null && bad 10 "$f references a team logo"
  case "$f" in
    web/src/layout/*) ;;
    *) grep -nE '\b(useMediaQuery|hiddenFrom|visibleFrom)\b' "$f" >/dev/null && bad 10 "$f uses a breakpoint helper outside web/src/layout/" ;;
  esac
done

# --- Check 11: backlog Status is done ----------------------------------------------------
grep -qE '^\| [0-9]+ \| \[S60\].*\| `done` \|$' docs/v3/BACKLOG.md ||
  bad 11 "S60 row in the Story status table is not \`done\`"
awk '/^### S60 —/{f=1;next} /^### S[0-9]/{f=0} f' docs/v3/BACKLOG.md \
  | grep -qE '^\*\*Status:\*\* `done`$' ||
  bad 11 "S60 story heading Status is not \`done\`"

report "verify-S60"
exit $?
