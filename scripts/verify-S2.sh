#!/usr/bin/env bash
# Grader for BACKLOG story S2 — the Box room: boxscore and per-inning linescore derived
# offline for 823823, the boxed-inning Linescore, team switcher, one batting table and
# Game info, built to the ratified game-rooms Box frames. A commit-time proof (S84).
# Contract: docs/v3/BACKLOG.md#verify-script-contract
# No network. No writes outside /tmp. Does its own checking (never `pnpm verify`).

set -uo pipefail
cd "$(dirname "$0")/.."

# shellcheck source=lib/checks.sh
source "$(dirname "$0")/lib/checks.sh"

check 1 "fixtures/game-823823.json and plays-823823.json exist and a functions test regenerates both offline from fixtures/raw/ through the mappers and asserts they equal the committed files"
check 2 "the game payload has boxscore.teams.{away,home}.batting (>= 1 entry each, with id or name) and boxscore.info with Venue; spec and web types carry boxscore; api:breaking passes"
check 3 "linescore.innings has 9 entries for 823823 with away/home runs summing to R; R H E are CHC 6 13 0, MIA 5 6 0"
check 4 "an in-process GET /api/v1/games/823823 returns 200 with boxscore and linescore.innings (functions test)"
check 5 "the Box tab for 823823 shows, inside its panel: 9 boxed inning cells and R H E, a CHC/MIA switcher, one batting table at a time, Game info with Venue loanDepot park (RTL)"
check 6 "that web test file exits 0 run alone via pnpm --filter @bt/web exec vitest run"
check 7 "files this story adds or edits under web/src have no team-logo image URL (mlbstatic, /logos/) and no <img used as a team mark"
check 8 "those box UI files do not call useMediaQuery or use hiddenFrom/visibleFrom"
check 9 "one exported Linescore component under web/src/, which the Box room imports rather than inlining its own"
check 10 "a batting row shows name, position and AB R H RBI BB SO AVG for an 823823 batter (RTL)"
check 11 "the team switcher marks each team with TeamSwatch"
check 12 "linescoreCells(linescore, scheduledInnings) in packages/domain pads unplayed innings and its R total equals the sum (unit test: 9 played, 8 1/2 played, extra innings)"
check 13 "a game with no boxscore shows the ViewState empty state 'No box score yet.' (test)"
check 14 "at medium and desktop the Box room renders the same modules via the host variant (RTL)"
check 15 "design match: e2e/design/S2.spec.ts names box-mobile, box-medium, box-desktop and room-empty-mobile; docs/v3/design-checks/S2/ holds those captures at 390/768/1200/390"
check 16 "backlog Status is done (story heading and Story status table)"

BASE=23368f3
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
FT="src/services/fixture-823823.test.ts"
WT="src/components/game/BoxRoom.test.tsx"
GAME="fixtures/game-823823.json"

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

# --- Check 1: offline fixtures -------------------------------------------------------------------
for f in "$GAME" fixtures/plays-823823.json; do [ -f "$f" ] || bad 1 "$f missing"; done
grep -qF "fixtures/raw" "functions/$FT" 2>/dev/null || grep -qF '"raw"' "functions/$FT" 2>/dev/null || bad 1 "functions/$FT does not read fixtures/raw/"
grep -qE 'recordNormalized|mapLiveFeed|HttpMlbStatsClient' "functions/$FT" 2>/dev/null || bad 1 "functions/$FT does not go through the mappers"
run_vitest 1 functions "$FT" -t "regenerates"

# --- Check 2: boxscore in the payload, spec and types ---------------------------------------------
if [ -f "$GAME" ]; then
  node -e '
    const g = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8")); const b = g.boxscore ?? {}; const errs = [];
    for (const side of ["away", "home"]) {
      const bat = b.teams?.[side]?.batting;
      if (!Array.isArray(bat) || bat.length < 1) errs.push(side + " batting is not a non-empty array");
      else if (!bat.every((p) => typeof p.id === "number" || typeof p.name === "string" || typeof p.fullName === "string")) errs.push(side + " batting has an entry with no id or name");
    }
    if (!Array.isArray(b.info) || !b.info.some((l) => l.label === "Venue" && typeof l.value === "string")) errs.push("boxscore.info has no Venue line");
    if (errs.length) { console.log(errs.join("; ")); process.exit(1); }' "$GAME" >"$TMP/c2.log" 2>&1 || bad 2 "$GAME: $(cat "$TMP/c2.log")"
fi
grep -qF '"boxscore"' openapi/bt-api.v1.json || bad 2 "openapi/bt-api.v1.json does not document boxscore"
grep -qF 'boxscore' web/src/api/generated/bt-api.v1.ts || bad 2 "the generated web types do not carry boxscore"
pnpm -s api:breaking >"$TMP/b.log" 2>&1 || { bad 2 "pnpm api:breaking failed:"; tail -8 "$TMP/b.log" | sed 's/^/        /'; }

# --- Check 3: innings ------------------------------------------------------------------------------
if [ -f "$GAME" ]; then
  node -e '
    const g = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8")); const l = g.linescore ?? {}; const errs = [];
    const inn = l.innings ?? [];
    if (inn.length !== 9) errs.push("innings has " + inn.length + " entries, want 9");
    for (const side of ["away", "home"]) {
      const sum = inn.reduce((s, i) => s + (i[side]?.runs ?? 0), 0);
      if (sum !== l.teams?.[side]?.runs) errs.push(side + " innings sum " + sum + " != R " + l.teams?.[side]?.runs);
    }
    const rhe = (t) => [t?.runs, t?.hits, t?.errors].join(" ");
    if (g.teams?.away?.abbreviation !== "CHC" || rhe(l.teams?.away) !== "6 13 0") errs.push("away is not CHC 6 13 0: " + g.teams?.away?.abbreviation + " " + rhe(l.teams?.away));
    if (g.teams?.home?.abbreviation !== "MIA" || rhe(l.teams?.home) !== "5 6 0") errs.push("home is not MIA 5 6 0: " + g.teams?.home?.abbreviation + " " + rhe(l.teams?.home));
    if (errs.length) { console.log(errs.join("; ")); process.exit(1); }' "$GAME" >"$TMP/c3.log" 2>&1 || bad 3 "$GAME: $(cat "$TMP/c3.log")"
else
  bad 3 "$GAME missing"
fi

# --- Check 4: the route ----------------------------------------------------------------------------
grep -qF "/api/v1/games/823823" "functions/$FT" 2>/dev/null || bad 4 "functions/$FT never requests /api/v1/games/823823"
run_vitest 4 functions "$FT" -t "GET /api/v1/games/823823"

# --- Checks 5, 10, 13, 14: the Box room (RTL) ----------------------------------------------------
run_vitest 5 web "$WT" -t "box panel"
run_vitest 10 web "$WT" -t "batting row"
run_vitest 13 web "$WT" -t "no box score"
run_vitest 14 web "$WT" -t "variant"

# --- Check 6: the web file alone -----------------------------------------------------------------
if [ -f "web/$WT" ]; then
  pnpm --filter @bt/web exec vitest run "$WT" >"$TMP/w.log" 2>&1 || { bad 6 "pnpm --filter @bt/web exec vitest run $WT failed:"; tail -10 "$TMP/w.log" | sed 's/^/        /'; }
else
  bad 6 "web/$WT missing"
fi

# --- Checks 7, 8: no logos, no viewport (this story's own web files) --------------------------------
for f in $(story_changed_files S2 "$BASE" web/src); do
  [ -f "$f" ] || continue
  case "$f" in web/src/api/generated/*) continue ;; esac
  grep -nE 'mlbstatic|/logos/' "$f" >/dev/null && bad 7 "$f references a team-logo image URL"
  grep -nE '<img' "$f" >/dev/null && bad 7 "$f uses <img"
  case "$f" in
    web/src/layout/*) ;;
    *) grep -nwE 'useMediaQuery|hiddenFrom|visibleFrom' "$f" >/dev/null && bad 8 "$f reads the viewport" ;;
  esac
done

# --- Check 9: one Linescore component ------------------------------------------------------------
defs="$(grep -rlE 'export function Linescore\b' web/src --include='*.tsx' 2>/dev/null | grep -v '\.test\.' || true)"
n="$(printf '%s' "$defs" | grep -c . || true)"
[ "$n" = "1" ] || bad 9 "want exactly one file exporting function Linescore under web/src/, found $n: $(echo $defs)"
BOX="web/src/components/game/BoxRoom.tsx"
if [ -f "$BOX" ]; then
  grep -qE 'import \{[^}]*\bLinescore\b' "$BOX" || bad 9 "$BOX does not import Linescore"
  grep -qE 'linescoreCells|innings\.map' "$BOX" && bad 9 "$BOX inlines its own linescore"
else
  bad 9 "$BOX missing"
fi

# --- Check 11: TeamSwatch on the switcher ---------------------------------------------------------
[ -f "$BOX" ] && { grep -qw TeamSwatch "$BOX" || bad 11 "$BOX does not use TeamSwatch"; }
run_vitest 11 web "$WT" -t "swatch"

# --- Check 12: linescoreCells ---------------------------------------------------------------------
grep -rqE 'export function linescoreCells\(' packages/domain/src || bad 12 "packages/domain exports no linescoreCells"
DT="$(grep -rlE 'linescoreCells' packages/domain/src --include='*.test.ts' 2>/dev/null | head -1)"
if [ -z "$DT" ]; then
  bad 12 "no packages/domain test exercises linescoreCells"
else
  for k in "9 played" "8½ played" "extra innings"; do grep -qF "$k" "$DT" || bad 12 "$DT has no '$k' case"; done
  run_vitest 12 packages/domain "${DT#packages/domain/}" -t "linescoreCells"
fi

# --- Check 15: design match captures --------------------------------------------------------------
S="e2e/design/S2.spec.ts"
for fw in box-mobile:390 box-medium:768 box-desktop:1200 room-empty-mobile:390; do
  name="${fw%%:*}"; w="${fw##*:}"; png="docs/v3/design-checks/S2/$name.png"
  grep -qF "\"$name\"" "$S" 2>/dev/null || bad 15 "$S does not name $name"
  if [ -f "$png" ]; then
    [ "$(png_width "$png")" = "$w" ] || bad 15 "$png is $(png_width "$png")px wide, want $w"
  else
    bad 15 "$png missing"
  fi
done

# --- Check 16: backlog Status is done -------------------------------------------------------------
grep -qE '^\| [0-9]+ \| \[S2\].*\| `done` \|$' docs/v3/BACKLOG.md ||
  bad 16 "S2 row in the Story status table is not \`done\`"
awk '/^### S2 —/{f=1;next} /^### S[0-9]/{f=0} f' docs/v3/BACKLOG.md \
  | grep -qE '^\*\*Status:\*\* `done`$' ||
  bad 16 "S2 story heading Status is not \`done\`"

report "verify-S2"
exit $?
