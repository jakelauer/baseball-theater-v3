#!/usr/bin/env bash
# Grader for BACKLOG story S3 — the Live room's compact status: score, ball / strike /
# out pips and the inning (inningLabel in packages/domain), as a row on mobile and a
# card at medium / desktop. A commit-time proof of this story (S84).
# Contract: docs/v3/BACKLOG.md#verify-script-contract
# No network. No writes outside /tmp. Does its own checking (never `pnpm verify`).

set -uo pipefail
cd "$(dirname "$0")/.."

# shellcheck source=lib/checks.sh
source "$(dirname "$0")/lib/checks.sh"

check 1 "the Live tab for 745001 shows, inside its panel: inning 6, top (Top 6th), 1 out, 2 balls, 1 strike (RTL)"
check 2 "balls, strikes and outs are labeled pip groups (accessible names with Balls / Strikes / Outs) whose filled pips equal the value (RTL)"
check 3 "one live status element shows NYY 4 and BOS 3; the panel has no linescore (no inning cells, no R / H / E headers) (RTL)"
check 4 "that web test file exits 0 run alone via pnpm --filter @bt/web exec vitest run"
check 5 "GamePage.tsx or a Live child it renders references linescore balls and strikes"
check 6 "Live UI files this story adds or edits have no team-logo <img / mlbstatic, and no useMediaQuery / hiddenFrom / visibleFrom"
check 7 "the inning text comes from inningLabel in packages/domain, unit-tested for top, bottom, middle and end"
check 8 "at medium and desktop the status renders as the status card (score, pips, inning) via the host variant (RTL)"
check 9 "design match: e2e/design/S3.spec.ts names live-mobile, live-medium, live-desktop; docs/v3/design-checks/S3/ holds them at 390/768/1200"
check 10 "backlog Status is done (story heading and Story status table)"

BASE=9dd19b3
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
WT="src/components/game/LiveStatus.test.tsx"

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

# --- Checks 1-3, 8: the Live status (RTL) ------------------------------------------------------
run_vitest 1 web "$WT" -t "live panel"
run_vitest 2 web "$WT" -t "pips"
run_vitest 3 web "$WT" -t "score"
run_vitest 8 web "$WT" -t "variant"

# --- Check 4: the web file alone ---------------------------------------------------------------
if [ -f "web/$WT" ]; then
  pnpm --filter @bt/web exec vitest run "$WT" >"$TMP/w.log" 2>&1 || { bad 4 "pnpm --filter @bt/web exec vitest run $WT failed:"; tail -10 "$TMP/w.log" | sed 's/^/        /'; }
else
  bad 4 "web/$WT missing"
fi

# --- Check 5: balls and strikes are read -------------------------------------------------------
live_files="web/src/pages/GamePage.tsx $(ls web/src/components/game/Live*.tsx 2>/dev/null | grep -v '\.test\.' | tr '\n' ' ')"
for k in balls strikes; do
  grep -qE "linescore\??\.$k\b" $live_files || bad 5 "neither GamePage.tsx nor a Live component reads linescore.$k"
done

# --- Check 6: no logos, no viewport (this story's own web files) ---------------------------------
for f in $(story_changed_files S3 "$BASE" web/src); do
  [ -f "$f" ] || continue
  grep -nE 'mlbstatic|/logos/|<img' "$f" >/dev/null && bad 6 "$f references a team logo or <img"
  case "$f" in
    web/src/layout/*) ;;
    *) grep -nwE 'useMediaQuery|hiddenFrom|visibleFrom' "$f" >/dev/null && bad 6 "$f reads the viewport" ;;
  esac
done

# --- Check 7: inningLabel -----------------------------------------------------------------------
grep -rqE 'export function inningLabel\(' packages/domain/src || bad 7 "packages/domain exports no inningLabel"
grep -qw inningLabel web/src/components/game/LiveStatus.tsx 2>/dev/null || bad 7 "LiveStatus.tsx does not render inningLabel"
grep -qE '(Top|Bot|Bottom) [0-9]+(st|nd|rd|th)' web/src/components/game/LiveStatus.tsx 2>/dev/null && bad 7 "LiveStatus.tsx spells an inning itself"
DT="$(grep -rlE 'inningLabel' packages/domain/src --include='*.test.ts' 2>/dev/null | head -1)"
if [ -z "$DT" ]; then
  bad 7 "no packages/domain test exercises inningLabel"
else
  for k in top bottom middle end; do grep -qiE "inningLabel: $k" "$DT" || bad 7 "$DT has no 'inningLabel: $k' case"; done
  run_vitest 7 packages/domain "${DT#packages/domain/}" -t "inningLabel"
fi

# --- Check 9: design match captures --------------------------------------------------------------
S="e2e/design/S3.spec.ts"
for fw in live-mobile:390 live-medium:768 live-desktop:1200; do
  name="${fw%%:*}"; w="${fw##*:}"; png="docs/v3/design-checks/S3/$name.png"
  grep -qF "\"$name\"" "$S" 2>/dev/null || bad 9 "$S does not name $name"
  if [ -f "$png" ]; then
    [ "$(png_width "$png")" = "$w" ] || bad 9 "$png is $(png_width "$png")px wide, want $w"
  else
    bad 9 "$png missing"
  fi
done

# --- Check 10: backlog Status is done -------------------------------------------------------------
grep -qE '^\| [0-9]+ \| \[S3\].*\| `done` \|$' docs/v3/BACKLOG.md ||
  bad 10 "S3 row in the Story status table is not \`done\`"
awk '/^### S3 —/{f=1;next} /^### S[0-9]/{f=0} f' docs/v3/BACKLOG.md \
  | grep -qE '^\*\*Status:\*\* `done`$' ||
  bad 10 "S3 story heading Status is not \`done\`"

report "verify-S3"
exit $?
