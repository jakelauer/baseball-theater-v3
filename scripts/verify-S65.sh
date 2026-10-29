#!/usr/bin/env bash
# Grader for BACKLOG story S65 — scoreboard data: ScheduleGameSummary gains startTime,
# team records, probable pitchers, decisions and the live count with runners; the
# 2026-09-05 schedule fixture derived offline; an in-progress and a scheduled summary
# folded from the replay; formatGameTime in the viewer's zone. A commit-time proof (S84).
# Contract: docs/v3/BACKLOG.md#verify-script-contract
# No network. No writes outside /tmp. Does its own checking (never `pnpm verify`).

set -uo pipefail
cd "$(dirname "$0")/.."

# shellcheck source=lib/checks.sh
source "$(dirname "$0")/lib/checks.sh"

check 1 "ScheduleGameSummary gains startTime, teams.{away,home}.record { wins, losses }, probablePitchers, decisions { winner, loser, save } and live { runners, batterId, pitcherId, balls, strikes, outs } | null; spec and web types carry them; api:breaking exits 0"
check 2 "fixtures/schedule-2026-09-05.json is derived offline from fixtures/raw/ through the mappers, and a test regenerates it and compares"
check 3 "an in-progress and a scheduled summary are derived offline via the replay fold at named timecodes (test asserts runners and probables)"
check 4 "formatGameTime(iso, timeZone) in packages/domain renders the viewer's zone with its label (test with two zones)"
check 5 "an in-process GET /api/v1/schedule?date=2026-09-05 returns the new fields (functions test)"
check 6 "backlog Status is done (story heading and Story status table)"

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
SCHED="fixtures/schedule-2026-09-05.json"
FT="src/services/schedule-fixture.test.ts"

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

# --- Check 1: the summary shape ---------------------------------------------------------------------
T="packages/domain/src/types.ts"
summary="$(awk '/^export type ScheduleGameSummary = \{/,/^\};/' "$T")"
for k in startTime probablePitchers decisions live; do
  echo "$summary" | grep -qE "^\s+$k\??:" || bad 1 "ScheduleGameSummary has no $k"
done
echo "$summary" | grep -qE '^\s+live\??: ScheduleLive \| null;' || bad 1 "ScheduleGameSummary.live is not 'ScheduleLive | null'"
grep -qE '^export type ScheduleLive = GameLive & \{' "$T" || bad 1 "ScheduleLive does not extend S63's GameLive (runners, batterId, pitcherId)"
awk '/^export type ScheduleLive = /,/^\};/' "$T" | tr -d '\n\t ' | grep -qE 'balls:number\|null;strikes:number\|null;outs:number\|null;' || bad 1 "ScheduleLive lacks balls / strikes / outs"
awk '/^export type TeamRecord = \{/,/^\};/' "$T" | tr -d '\n\t ' | grep -qE 'wins:number;losses:number;' || bad 1 "TeamRecord is not { wins, losses }"
awk '/^export type GameDecisions = \{/,/^\};/' "$T" | tr -d '\n\t ' | grep -qE 'winner:.*loser:.*save:' || bad 1 "GameDecisions is not { winner, loser, save }"
for k in '"startTime"' '"probablePitchers"' '"decisions"' '"record"'; do
  grep -qF "$k" openapi/bt-api.v1.json || bad 1 "openapi/bt-api.v1.json does not document $k"
done
grep -qF 'probablePitchers' web/src/api/generated/bt-api.v1.ts || bad 1 "the web types are not regenerated"
pnpm -s api:breaking >"$TMP/b.log" 2>&1 || { bad 1 "pnpm api:breaking failed:"; tail -8 "$TMP/b.log" | sed 's/^/        /'; }

# --- Check 2: the schedule fixture ---------------------------------------------------------------
if [ -f "$SCHED" ]; then
  node -e '
    const d = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8")); const errs = [];
    const g = d.games?.find((x) => x.gamePk === 823823);
    if (!g) errs.push("no 823823");
    else {
      if (!/^2026-09-05T\d{2}:\d{2}:\d{2}Z$/.test(g.startTime ?? "")) errs.push("startTime is not an ISO instant: " + g.startTime);
      if (g.teams?.away?.record?.wins !== 81 || g.teams?.away?.record?.losses !== 62) errs.push("CHC record is not 81-62");
      if (!g.decisions?.winner?.fullName) errs.push("no winning pitcher");
      if (!g.probablePitchers?.away?.fullName) errs.push("no away probable");
      if (g.live !== null) errs.push("a final game has a live moment");
    }
    if (errs.length) { console.log(errs.join("; ")); process.exit(1); }' "$SCHED" >"$TMP/c2.log" 2>&1 || bad 2 "$SCHED: $(cat "$TMP/c2.log")"
else
  bad 2 "$SCHED missing"
fi
grep -qE 'recordNormalized|fetchSchedule' "functions/$FT" 2>/dev/null || bad 2 "functions/$FT does not derive the schedule through the mappers"
run_vitest 2 functions "$FT" -t "regenerates"

# --- Check 3: folded summaries ----------------------------------------------------------------------
if [ -f "functions/$FT" ]; then
  n="$(grep -oE '"[0-9]{8}_[0-9]{6}"' "functions/$FT" functions/src/services/live-fixture.ts 2>/dev/null | sort -u | wc -l | tr -d ' ')"
  [ "${n:-0}" -ge 2 ] || bad 3 "fewer than two named timecodes for the folded summaries"
  grep -qE 'runners' "functions/$FT" || bad 3 "functions/$FT never asserts runners"
  grep -qE 'probablePitchers' "functions/$FT" || bad 3 "functions/$FT never asserts probables"
fi
run_vitest 3 functions "$FT" -t "fold"

# --- Check 4: formatGameTime -------------------------------------------------------------------------
grep -rqE 'export function formatGameTime\(' packages/domain/src || bad 4 "packages/domain exports no formatGameTime"
DT="$(grep -rlE 'formatGameTime' packages/domain/src --include='*.test.ts' 2>/dev/null | head -1)"
if [ -z "$DT" ]; then
  bad 4 "no packages/domain test exercises formatGameTime"
else
  z="$(grep -oE '"(America|Europe|Asia|Pacific|Australia|UTC)[A-Za-z_/]*"' "$DT" | sort -u | wc -l | tr -d ' ')"
  [ "${z:-0}" -ge 2 ] || bad 4 "$DT tests fewer than two time zones"
  run_vitest 4 packages/domain "${DT#packages/domain/}" -t "formatGameTime"
fi

# --- Check 5: the route -----------------------------------------------------------------------------
grep -qF '/api/v1/schedule?date=2026-09-05' "functions/$FT" 2>/dev/null || bad 5 "functions/$FT never requests /api/v1/schedule?date=2026-09-05"
run_vitest 5 functions "$FT" -t "GET /api/v1/schedule"

# --- Check 6: backlog Status is done --------------------------------------------------------------
grep -qE '^\| [0-9]+ \| \[S65\].*\| `done` \|$' docs/v3/BACKLOG.md ||
  bad 6 "S65 row in the Story status table is not \`done\`"
awk '/^### S65 —/{f=1;next} /^### S[0-9]/{f=0} f' docs/v3/BACKLOG.md \
  | grep -qE '^\*\*Status:\*\* `done`$' ||
  bad 6 "S65 story heading Status is not \`done\`"

report "verify-S65"
exit $?
