#!/usr/bin/env bash
# Grader for BACKLOG story S41 — the Plays room to the ratified design: the boxed
# linescore, the inning sidebar with Runs, the latest inning with at-bats by default, top
# and bottom halves of at-bat accordions, scoring plays with the score after each, and
# an expanded at-bat built from S64's cards, zone and pitch sequence. A commit-time
# proof of this story (S84).
# Contract: docs/v3/BACKLOG.md#verify-script-contract
# No network. No writes outside /tmp. Does its own checking (never `pnpm verify`).

set -uo pipefail
cd "$(dirname "$0")/.."

# shellcheck source=lib/checks.sh
source "$(dirname "$0")/lib/checks.sh"

check 1 "the plays tab for 823823 shows the boxed linescore and an inning sidebar listing 1–9 in order plus Runs (RTL)"
check 2 "with no inning chosen, the highest inning with at-bats is selected; defaultPlaysInning is unit-tested including a last inning with no at-bats"
check 3 "the selected inning shows its top and bottom halves as labeled groups of at-bat rows; choosing 8 in the sidebar shows inning 8 (RTL)"
check 4 "expanding an at-bat shows the strike zone and one pitch row per pitch, from the existing pitch components (RTL)"
check 5 "Runs lists the nine scoring plays of 823823 in game order with inning, batter, result and score, Conforto 1–0 first and Stowers 6–5 last (RTL); AtBat.result carries awayScore / homeScore from the mapper into plays-823823.json"
check 6 "one exported helper colors a pitch by outcome with the pitch tokens, unit-tested; no component reads ballColor"
check 7 "the test files exit 0 run alone, and the domain and fixture tests exit 0 in their packages"
check 8 "Plays files this story adds or edits have no team logo and no useMediaQuery / hiddenFrom / visibleFrom"
check 9 "an expanded at-bat shows MatchupCards with lines through that at-bat, not the game (RTL)"
check 10 "the expanded at-bat reuses PitchSequence and MatchupCards; no second pitch-row or card component exists under web/src/"
check 11 "the default view expands the selected inning's last at-bat, and Runs rows expand the same way (RTL)"
check 12 "defaultPlaysInning and scoringPlays are packages/domain functions with tests (a 10-inning game lists inning 10); the color helper maps pitchOutcome"
check 13 "design match: e2e/design/S41.spec.ts names plays-mobile, plays-medium, plays-desktop, plays-scoring-mobile; docs/v3/design-checks/S41/ holds them at 390/768/1200/390"
check 14 "backlog Status is done (story heading and Story status table)"

BASE=e8eff3c
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
WT="src/components/pitch/PlaysPanel.test.tsx"
DT="src/plays-room.test.ts"

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

png_width() {
  node -e 'const b=require("fs").readFileSync(process.argv[1]);process.stdout.write(String(b.readUInt32BE(16)))' "$1"
}

# --- Checks 1, 3, 4, 5, 9, 11: the Plays room (RTL) -------------------------------------------
grep -qF 'plays-823823.json' "web/$WT" 2>/dev/null || bad 1 "web/$WT does not render fixtures/plays-823823.json"
run_vitest 1 web "$WT" -t "sidebar"
run_vitest 3 web "$WT" -t "halves"
run_vitest 4 web "$WT" -t "expand"
run_vitest 5 web "$WT" -t "runs"
run_vitest 9 web "$WT" -t "cards"
run_vitest 11 web "$WT" -t "default"
grep -qF 'Conforto' "web/$WT" 2>/dev/null && grep -qF 'Stowers' "web/$WT" 2>/dev/null || bad 5 "web/$WT does not assert both ends of the scoring plays"

# --- Checks 2, 12: the domain helpers ----------------------------------------------------------
for f in defaultPlaysInning scoringPlays; do
  grep -rqE "export function $f\(" packages/domain/src || bad 12 "packages/domain exports no $f"
  grep -qE "describe\(\"$f" "packages/domain/$DT" 2>/dev/null || bad 12 "packages/domain/$DT has no describe(\"${f}…\")"
done
run_vitest 2 packages/domain "$DT" -t "defaultPlaysInning"
run_vitest 12 packages/domain "$DT" -t "scoringPlays"

# --- Check 5: scores on the play result --------------------------------------------------------
grep -qE 'awayScore: (number \| null|play\.result\.awayScore)' packages/domain/src/plays.ts || bad 5 "AtBat.result has no nullable awayScore"
grep -qE 'awayScore' functions/src/mappers/live.ts || bad 5 "functions/src/mappers/live.ts does not map awayScore"
n="$(grep -o '"homeScore"' fixtures/plays-823823.json | wc -l | tr -d ' ')"
[ "$n" -ge 85 ] || bad 5 "fixtures/plays-823823.json carries homeScore on $n at-bats, want all 85"
run_vitest 5 functions src/services/fixture-823823.test.ts

# --- Check 6: one pitch color helper ------------------------------------------------------------
grep -qE '^export function pitchDotColor\(' web/src/components/pitch/utils.ts || bad 6 "web/src/components/pitch/utils.ts exports no pitchDotColor"
grep -qE 'pitchOutcome\(' web/src/components/pitch/utils.ts || bad 12 "pitchDotColor does not map pitchOutcome"
run_vitest 6 web src/components/pitch/utils.test.ts -t "colors a pitch"
readers="$(grep -rlE 'ballColor' web/src/components --include='*.tsx' | grep -v '\.test\.' | tr '\n' ' ')"
[ -z "$readers" ] || bad 6 "components read ballColor: $readers"

# --- Check 7: each test file alone --------------------------------------------------------------
run_vitest 7 web "$WT"
run_vitest 7 packages/domain "$DT"

# --- Check 8: no logos, no viewport -------------------------------------------------------------
for f in $(story_changed_files S41 "$BASE" web/src); do
  [ -f "$f" ] || continue
  grep -nE '<img[^>]*logo|mlbstatic|/logos/' "$f" >/dev/null && bad 8 "$f references a team logo"
  case "$f" in
    web/src/layout/*) ;;
    *) grep -nwE 'useMediaQuery|hiddenFrom|visibleFrom' "$f" >/dev/null && bad 8 "$f reads the viewport" ;;
  esac
done

# --- Check 10: one pitch list, one card component -----------------------------------------------
for c in PitchSequence MatchupCards; do
  defs="$(grep -rlE "export function $c\(" web/src --include='*.tsx' | tr '\n' ' ')"
  [ "$defs" = "web/src/components/pitch/$c.tsx " ] || bad 10 "$c is defined in: ${defs:-nowhere}"
  grep -qw "$c" web/src/components/pitch/AtBatViewer.tsx 2>/dev/null || bad 10 "the expanded at-bat (AtBatViewer.tsx) does not render $c"
done
others="$(grep -rlE 'export function [A-Za-z]*(PitchList|PitchRow|PlayerCard|PitcherCard|BatterCard)[A-Za-z]*\(' web/src --include='*.tsx' | tr '\n' ' ')"
[ -z "$others" ] || bad 10 "a second pitch-row or card component: $others"
rows="$(grep -lE 'pitches\.map\(' web/src/components/pitch/*.tsx web/src/components/game/*.tsx | grep -v '\.test\.' | grep -vE '/(PitchSequence|StrikeZoneChart)\.tsx$' | tr '\n' ' ')"
[ -z "$rows" ] || bad 10 "pitch rows drawn outside PitchSequence: $rows"

# --- Check 13: design match captures ------------------------------------------------------------
S="e2e/design/S41.spec.ts"
for fw in plays-mobile:390 plays-medium:768 plays-desktop:1200 plays-scoring-mobile:390; do
  name="${fw%%:*}"; w="${fw##*:}"; png="docs/v3/design-checks/S41/$name.png"
  grep -qF "\"$name\"" "$S" 2>/dev/null || bad 13 "$S does not name $name"
  if [ -f "$png" ]; then
    [ "$(png_width "$png")" = "$w" ] || bad 13 "$png is $(png_width "$png")px wide, want $w"
  else
    bad 13 "$png missing"
  fi
done

# --- Check 14: backlog Status is done -----------------------------------------------------------
grep -qE '^\| [0-9]+ \| \[S41\].*\| `done` \|$' docs/v3/BACKLOG.md ||
  bad 14 "S41 row in the Story status table is not \`done\`"
awk '/^### S41 —/{f=1;next} /^### S[0-9]/{f=0} f' docs/v3/BACKLOG.md \
  | grep -qE '^\*\*Status:\*\* `done`$' ||
  bad 14 "S41 story heading Status is not \`done\`"

report "verify-S41"
exit $?
