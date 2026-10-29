#!/usr/bin/env bash
# Grader for BACKLOG story S63 — live room data: GameSnapshot.live (runners, batter,
# pitcher), pitch breaks in inches, a mid-game 823823 fixture folded offline from the
# recorded diffpatch walk, and baseRunners / zoneLabel / breakInches in packages/domain.
# A commit-time proof of this story (S84).
# Contract: docs/v3/BACKLOG.md#verify-script-contract
# No network. No writes outside /tmp. Does its own checking (never `pnpm verify`).

set -uo pipefail
cd "$(dirname "$0")/.."

# shellcheck source=lib/checks.sh
source "$(dirname "$0")/lib/checks.sh"

check 1 "GameSnapshot gains live { runners { first, second, third }, batterId, pitcherId } | null and PitchBreaks gains breakHorizontal / breakVertical; the spec and web types carry them; api:breaking exits 0"
check 2 "fixtures/game-823823-live.json is folded offline by the @bt/mlb-api replay over fixtures/raw/diffpatch-823823.json at a named mid-game timecode — in progress, plays through that moment, the current at-bat unfinished — and a functions test regenerates it and compares"
check 3 "baseRunners, zoneLabel and breakInches are packages/domain functions with tests"
check 4 "the AC 2-3 test files exit 0 when run alone"
check 5 "backlog Status is done (story heading and Story status table)"

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
LIVE="fixtures/game-823823-live.json"
FT="src/services/live-fixture.test.ts"
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

# --- Check 1: the shapes ------------------------------------------------------------------------------
T="packages/domain/src/types.ts"
awk '/^export type GameSnapshot = \{/,/^\};/' "$T" | grep -qE '^\s+live\??: GameLive \| null;' || bad 1 "$T: GameSnapshot has no 'live: GameLive | null'"
awk '/^export type GameLive = \{/,/^\};/' "$T" | tr -d '\n\t ' | grep -qE 'runners:\{first:number\|null;second:number\|null;third:number\|null;?\};batterId:number\|null;pitcherId:number\|null;' ||
  bad 1 "$T: GameLive is not { runners { first, second, third }, batterId, pitcherId }"
awk '/^export type PitchBreaks = \{/,/^\};/' packages/domain/src/plays.ts | grep -qE 'breakHorizontal' &&
  awk '/^export type PitchBreaks = \{/,/^\};/' packages/domain/src/plays.ts | grep -qE 'breakVertical' || bad 1 "PitchBreaks lacks breakHorizontal / breakVertical"
for k in '"live"' '"breakHorizontal"' '"breakVertical"' '"pitcherId"'; do
  grep -qF "$k" openapi/bt-api.v1.json || bad 1 "openapi/bt-api.v1.json does not document $k"
done
grep -qF 'breakHorizontal' web/src/api/generated/bt-api.v1.ts || bad 1 "the web types are not regenerated"
pnpm -s api:breaking >"$TMP/b.log" 2>&1 || { bad 1 "pnpm api:breaking failed:"; tail -8 "$TMP/b.log" | sed 's/^/        /'; }

# --- Check 2: the folded fixture --------------------------------------------------------------------
if [ -f "$LIVE" ]; then
  node -e '
    const g = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8")); const errs = [];
    if (g.status?.codedGameState !== "I") errs.push("status is " + g.status?.codedGameState + ", not in progress (I)");
    if (!g.live || typeof g.live.batterId !== "number" || typeof g.live.pitcherId !== "number") errs.push("no live batter / pitcher");
    if (!g.live || !["first", "second", "third"].some((b) => typeof g.live.runners?.[b] === "number")) errs.push("no runner on base");
    if (!Array.isArray(g.plays) || g.plays.length < 2) errs.push("no plays through the moment");
    const last = g.plays?.at(-1);
    if (last && last.about?.isComplete !== false) errs.push("the last play (the current at-bat) is not in progress");
    if (last && !(last.pitches?.length > 0)) errs.push("the current at-bat has no pitches yet");
    if (!g.plays?.some((p) => p.pitches?.some((x) => typeof x.pitchData?.breaks?.breakHorizontal === "number"))) errs.push("no pitch carries breakHorizontal");
    if (errs.length) { console.log(errs.join("; ")); process.exit(1); }' "$LIVE" >"$TMP/c2.log" 2>&1 || bad 2 "$LIVE: $(cat "$TMP/c2.log")"
else
  bad 2 "$LIVE missing"
fi
if [ -f "functions/$FT" ]; then
  grep -qE 'reconstructReplay|liveFixtureAt' "functions/$FT" || bad 2 "functions/$FT does not fold the replay"
  grep -qF 'diffpatch-823823.json' "functions/$FT" functions/src/services/live-fixture.ts 2>/dev/null || bad 2 "the fold does not read fixtures/raw/diffpatch-823823.json"
  grep -qE '"[0-9]{8}_[0-9]{6}"' "functions/$FT" functions/src/services/live-fixture.ts 2>/dev/null || bad 2 "no named mid-game timecode"
  grep -rqE 'reconstructReplay' functions/src/services/live-fixture.ts 2>/dev/null || bad 2 "functions/src/services/live-fixture.ts does not use @bt/mlb-api's reconstructReplay"
fi
run_vitest 2 functions "$FT" -t "regenerates"

# --- Check 3: domain functions ----------------------------------------------------------------------
for f in baseRunners zoneLabel breakInches; do
  grep -rqE "export function $f\(" packages/domain/src || bad 3 "packages/domain exports no $f"
  grep -qE "describe\(\"$f" "packages/domain/$DT" 2>/dev/null || bad 3 "packages/domain/$DT has no describe(\"${f}…\")"
done

# --- Check 4: the test files alone ------------------------------------------------------------------
run_vitest 4 functions "$FT"
run_vitest 4 packages/domain "$DT"

# --- Check 5: backlog Status is done ----------------------------------------------------------------
grep -qE '^\| [0-9]+ \| \[S63\].*\| `done` \|$' docs/v3/BACKLOG.md ||
  bad 5 "S63 row in the Story status table is not \`done\`"
awk '/^### S63 —/{f=1;next} /^### S[0-9]/{f=0} f' docs/v3/BACKLOG.md \
  | grep -qE '^\*\*Status:\*\* `done`$' ||
  bad 5 "S63 story heading Status is not \`done\`"

report "verify-S63"
exit $?
