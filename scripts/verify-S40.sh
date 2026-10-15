#!/usr/bin/env bash
# Grader for BACKLOG story S40 — game view chrome: top bar, phase-aware tabs, room states.
# Contract: docs/v3/BACKLOG.md#verify-script-contract
# No network. No writes outside /tmp. Does its own checking (never `pnpm verify`).

set -uo pipefail
cd "$(dirname "$0")/.."

# shellcheck source=lib/checks.sh
source "$(dirname "$0")/lib/checks.sh"

check 1 "GamePage test asserts the top bar: back link /games/2024-07-04, NYM @ WSH, the date"
check 2 "top bar shows no score, venue or status; GamePage/top bar never read linescore or .runs"
check 3 "phase-aware tabs asserted for final 744834, live 745001 (LIVE indicator) and a Preview copy"
check 4 "a hidden tab (/game/744834/live) falls back to the Videos room"
check 5 "room states: loader, error with Retry that refetches; error copy uses Primary, not raw red"
check 6 "the S40 test files pass, each run alone"
check 7 "game chrome files: no team logos, no useMediaQuery / hiddenFrom / visibleFrom"
check 8 "backlog Status is done"

PAGE="web/src/pages/GamePage.tsx"
PAGE_TEST="web/src/pages/GamePage.test.tsx"
GAME_DIR="web/src/components/game"
PHASE_TEST="$GAME_DIR/gamePhase.test.ts"

# Chrome sources: the page plus every non-test file under components/game/.
CHROME="$PAGE"
if [ -d "$GAME_DIR" ]; then
  more=$(find "$GAME_DIR" -type f \( -name '*.ts' -o -name '*.tsx' \) ! -name '*.test.*' | sort)
  [ -n "$more" ] && CHROME="$CHROME $more"
fi
TOPBAR=$(grep -lE 'game-topbar|Game top bar' $CHROME 2>/dev/null | grep -v "$PAGE" || true)

has() { grep -qE -- "$1" "$PAGE_TEST" 2>/dev/null; }

# --- Check 1: top bar contents --------------------------------------------------
if [ ! -f "$PAGE_TEST" ]; then
  bad 1 "$PAGE_TEST missing"
else
  has '<GamePage' || bad 1 "$PAGE_TEST does not render GamePage"
  has '744834' || bad 1 "$PAGE_TEST does not use fixture 744834"
  has 'game-topbar|[Gg]ame top bar' || bad 1 "$PAGE_TEST does not locate the top bar by test id or name"
  has '/games/2024-07-04' || bad 1 "$PAGE_TEST does not assert the back link href /games/2024-07-04"
  has 'NYM @ WSH' || bad 1 "$PAGE_TEST does not assert NYM @ WSH"
  has 'Jul 4, 2024|2024-07-04' || bad 1 "$PAGE_TEST does not assert the fixture's date"
fi
[ -n "$TOPBAR" ] || bad 1 "no top-bar component under $GAME_DIR identifies itself as the game top bar"

# --- Check 2: no score / venue / status in the header ---------------------------
if [ -f "$PAGE_TEST" ]; then
  has 'Nationals Park' || bad 2 "$PAGE_TEST does not assert the venue is absent"
  has 'Final' || bad 2 "$PAGE_TEST does not assert the status text is absent"
  has '0 – 1|0-1|0 . 1' || bad 2 "$PAGE_TEST does not assert the score is absent"
fi
for f in $PAGE $TOPBAR; do
  [ -f "$f" ] || continue
  grep -nE 'linescore|\.runs\b' "$f" >/dev/null && bad 2 "$f reads linescore / .runs"
done

# --- Check 3: phase-aware tabs ---------------------------------------------------
TAB_TESTS="$PAGE_TEST $PHASE_TEST"
# shellcheck disable=SC2086
tabtxt=$(cat $TAB_TESTS 2>/dev/null || true)
echo "$tabtxt" | grep -q '745001' || bad 3 "no test uses the live fixture 745001"
echo "$tabtxt" | grep -q '"Preview"' || bad 3 "no test overrides abstractGameState to \"Preview\""
echo "$tabtxt" | grep -q 'LIVE' || bad 3 "no test asserts the LIVE indicator"
echo "$tabtxt" | grep -qE 'role.*tab|"tab"' || bad 3 "no test asserts tabs by role"
for t in Videos Live Plays Box Recap; do
  echo "$tabtxt" | grep -q "$t" || bad 3 "no test names the $t tab"
done

# --- Check 4: hidden tab falls back to Videos ------------------------------------
if [ -f "$PAGE_TEST" ]; then
  has '/game/744834/live' || bad 4 "$PAGE_TEST does not navigate to /game/744834/live"
  has 'aria-selected|toHaveAttribute\("aria-selected"' || bad 4 "$PAGE_TEST does not assert the Videos tab is selected"
else
  bad 4 "$PAGE_TEST missing"
fi

# --- Check 5: room states ---------------------------------------------------------
if [ -f "$PAGE_TEST" ]; then
  has 'Retry' || bad 5 "$PAGE_TEST does not click Retry"
  has 'toHaveBeenCalledTimes\(2\)' || bad 5 "$PAGE_TEST does not assert a second fetch"
  has '[Ll]oad' || bad 5 "$PAGE_TEST does not assert the loader"
else
  bad 5 "$PAGE_TEST missing"
fi
# shellcheck disable=SC2086
grep -nE '(c|color)="red"' $CHROME 2>/dev/null && bad 5 "game chrome uses raw Mantine red"
# shellcheck disable=SC2086
grep -qE 'primary-light|"primary"' $CHROME 2>/dev/null || bad 5 "game chrome never uses the Primary / Primary Light role"

# --- Check 6: test files pass alone ----------------------------------------------
for t in "$PAGE_TEST" "$PHASE_TEST"; do
  if [ ! -f "$t" ]; then
    bad 6 "$t missing"
    continue
  fi
  out=$(pnpm --filter @bt/web exec vitest run "${t#web/}" 2>&1)
  rc=$?
  [ $rc -eq 0 ] || { bad 6 "$t: vitest exited $rc"; echo "$out" | tail -20 | sed 's/^/        /'; }
done

# --- Check 7: no logos, no layout-by-media-query ----------------------------------
# shellcheck disable=SC2086
hits=$(grep -nE '<img|mlbstatic|/logos/|useMediaQuery|hiddenFrom|visibleFrom' $CHROME 2>/dev/null || true)
[ -n "$hits" ] && { bad 7 "game chrome has logos or media-query layout:"; echo "$hits" | sed 's/^/        /'; }

# --- Check 8: backlog Status is done -----------------------------------------------
grep -qE '^\| [0-9]+ \| \[S40\].*\| `done` \|$' docs/v3/BACKLOG.md ||
  bad 8 "S40 row in the Story status table is not \`done\`"
awk '/^### S40 —/{f=1;next} /^### S[0-9]/{f=0} f' docs/v3/BACKLOG.md \
  | grep -qE '^\*\*Status:\*\* `done`$' ||
  bad 8 "S40 story heading Status is not \`done\`"

report "verify-S40"
exit $?
