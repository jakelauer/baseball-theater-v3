#!/usr/bin/env bash
# Grader for BACKLOG story S64 — the Live pitch theater body: the base diamond, the
# pitcher and batter cards with lines through the current at-bat, the reused zone and
# trajectory, the newest-first pitch sequence, selection, and the one pitch-list, card
# and speed-format implementations. A commit-time proof of this story (S84).
# Contract: docs/v3/BACKLOG.md#verify-script-contract
# No network. No writes outside /tmp. Does its own checking (never `pnpm verify`).

set -uo pipefail
cd "$(dirname "$0")/.."

# shellcheck source=lib/checks.sh
source "$(dirname "$0")/lib/checks.sh"

check 1 "on game-823823-live, BaseDiamond marks exactly the occupied bases (RTL)"
check 2 "MatchupCards shows each player's hand and pitcherLine / batterLine totals through the current at-bat; pitcherLine and batterLine are packages/domain functions tested with an early and a late at-bat"
check 3 "zone and trajectory reuse StrikeZoneChart / PitchTrajectoryView: the Live room renders both, and no new zone component exists under web/src/"
check 4 "PitchSequence lists pitches newest-first with the newest expanded (spin, break, release, zone, result) and the rest collapsed; at medium / desktop the detail is the four-column grid and the status sits beside the zone (RTL via variant)"
check 5 "selecting a pitch row or a zone dot selects that pitch; pitch rows are buttons with arrow-key movement (test)"
check 6 "headshots, if any, are <img> with alt under components/pitch/, never /logos/; no win-probability panel renders"
check 7 "a render-count baseline (S54 helper) is recorded for one cache update of the Live panel"
check 8 "files this story adds or edits have no team-logo <img> or /logos/ reference and no useMediaQuery / hiddenFrom / visibleFrom outside web/src/layout/"
check 9 "PitchTrajectoryView.tsx converts chart units to SVG pixels in exactly one function"
check 10 "PitchSequence is the one pitch-list component and MatchupCards the one card component; pitch speed is formatted by one function, speedLabel (no other startSpeed / endSpeed .toFixed)"
check 11 "design match: e2e/design/S64.spec.ts names live-mobile, live-medium, live-desktop; docs/v3/design-checks/S64/ holds them at 390/768/1200"
check 12 "backlog Status is done (story heading and Story status table)"

BASE=4f6eb33
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
WT="src/components/game/LiveRoom.test.tsx"
DT="src/live.test.ts"

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

# --- Checks 1, 2, 4, 5, 7: the Live room (RTL) ----------------------------------------------
grep -qF 'game-823823-live.json' "web/$WT" 2>/dev/null || bad 1 "web/$WT does not render fixtures/game-823823-live.json"
run_vitest 1 web "$WT" -t "diamond"
run_vitest 2 web "$WT" -t "cards"
run_vitest 4 web "$WT" -t "sequence"
run_vitest 5 web "$WT" -t "select"
run_vitest 7 web "$WT" -t "render count"
grep -qE 'createRenderCounter' "web/$WT" 2>/dev/null || bad 7 "web/$WT does not use createRenderCounter (S54)"

# --- Check 2: the line functions -----------------------------------------------------------
for f in pitcherLine batterLine; do
  grep -rqE "export function $f\(" packages/domain/src || bad 2 "packages/domain exports no $f"
  grep -qE "describe\(\"$f" "packages/domain/$DT" 2>/dev/null || bad 2 "packages/domain/$DT has no describe(\"${f}…\")"
done
grep -qiE 'early' "packages/domain/$DT" 2>/dev/null && grep -qiE 'late' "packages/domain/$DT" 2>/dev/null || bad 2 "packages/domain/$DT does not test an early and a late at-bat"
run_vitest 2 packages/domain "$DT" -t "Line"

# --- Check 3: zone and trajectory reused ----------------------------------------------------
LR="web/src/components/game/LiveRoom.tsx"
for c in StrikeZoneChart PitchTrajectoryView; do
  grep -qw "$c" "$LR" 2>/dev/null || bad 3 "$LR does not render $c"
done
zones="$(grep -rlE 'export function [A-Za-z]*(Zone|Trajectory)[A-Za-z]*\(' web/src --include='*.tsx' | grep -v '\.test\.' | sort | tr '\n' ' ')"
[ "$zones" = "web/src/components/pitch/PitchTrajectoryView.tsx web/src/components/pitch/StrikeZoneChart.tsx " ] || bad 3 "zone / trajectory components under web/src/: $zones"

# --- Check 6: headshots and win probability --------------------------------------------------
for f in $(story_changed_files S64 "$BASE" web/src); do
  [ -f "$f" ] || continue
  case "$f" in *.test.*) continue ;; esac
  if grep -qE '<img' "$f"; then
    case "$f" in
      web/src/components/pitch/*) grep -qE '<img[^>]*alt=' "$f" || bad 6 "$f has an <img> without alt" ;;
      *) bad 6 "$f has an <img> outside components/pitch/" ;;
    esac
  fi
  grep -qiE 'win ?probability' "$f" && bad 6 "$f renders a win-probability panel"
done

# --- Check 8: no logos, no viewport ---------------------------------------------------------
for f in $(story_changed_files S64 "$BASE" web/src); do
  [ -f "$f" ] || continue
  grep -nE 'mlbstatic|/logos/' "$f" >/dev/null && bad 8 "$f references a team logo"
  case "$f" in
    web/src/layout/*) ;;
    *) grep -nwE 'useMediaQuery|hiddenFrom|visibleFrom' "$f" >/dev/null && bad 8 "$f reads the viewport" ;;
  esac
done

# --- Check 9: one scaling function ----------------------------------------------------------
PT="web/src/components/pitch/PitchTrajectoryView.tsx"
n="$(grep -cE 'vb\.maxX - vb\.minX' "$PT")"
[ "$n" = "1" ] || bad 9 "$PT scales chart units in $n places, want 1"

# --- Check 10: one pitch list, one card component, one speed format ----------------------------
for c in PitchSequence MatchupCards; do
  defs="$(grep -rlE "export function $c\(" web/src --include='*.tsx' | tr '\n' ' ')"
  [ "$defs" = "web/src/components/pitch/$c.tsx " ] || bad 10 "$c is defined in: ${defs:-nowhere} (want web/src/components/pitch/$c.tsx)"
done
others="$(grep -rlE 'export function [A-Za-z]*(PitchList|PitchRow|PlayerCard|PitcherCard|BatterCard)[A-Za-z]*\(' web/src --include='*.tsx' | tr '\n' ' ')"
[ -z "$others" ] || bad 10 "a second pitch-row or card component: $others"
grep -qE '^export function speedLabel\(' web/src/components/pitch/utils.ts || bad 10 "web/src/components/pitch/utils.ts exports no speedLabel"
speeds="$(grep -rlE '(start|end)Speed\.toFixed' web/src --include='*.ts' --include='*.tsx' | grep -v '\.test\.' | tr '\n' ' ')"
[ -z "$speeds" ] || bad 10 "a speed formatted outside speedLabel: $speeds"

# --- Check 11: design match captures ---------------------------------------------------------
S="e2e/design/S64.spec.ts"
for fw in live-mobile:390 live-medium:768 live-desktop:1200; do
  name="${fw%%:*}"; w="${fw##*:}"; png="docs/v3/design-checks/S64/$name.png"
  grep -qF "\"$name\"" "$S" 2>/dev/null || bad 11 "$S does not name $name"
  if [ -f "$png" ]; then
    [ "$(png_width "$png")" = "$w" ] || bad 11 "$png is $(png_width "$png")px wide, want $w"
  else
    bad 11 "$png missing"
  fi
done

# --- Check 12: backlog Status is done -------------------------------------------------------
grep -qE '^\| [0-9]+ \| \[S64\].*\| `done` \|$' docs/v3/BACKLOG.md ||
  bad 12 "S64 row in the Story status table is not \`done\`"
awk '/^### S64 —/{f=1;next} /^### S[0-9]/{f=0} f' docs/v3/BACKLOG.md \
  | grep -qE '^\*\*Status:\*\* `done`$' ||
  bad 12 "S64 story heading Status is not \`done\`"

report "verify-S64"
exit $?
