#!/usr/bin/env bash
# Grader for BACKLOG story S12 — live HTTP MlbStatsClient + domain mappers.
# Contract: docs/v3/BACKLOG.md#verify-script-contract
# No network. No writes outside /tmp. Does its own checking (never `pnpm verify`).

set -uo pipefail
cd "$(dirname "$0")/.."

# shellcheck source=lib/checks.sh
source "$(dirname "$0")/lib/checks.sh"

# Every check this grader performs, declared so a pass is reported too.
check 1 "HttpMlbStatsClient under adapters, assignable to MlbStatsClient"
check 2 "talks to statsapi.mlb.com via fetch/https (read source, no calls)"
check 3 "highlights provenance is stated in Scope files"
check 4 "pure mapper modules (no I/O) → ScheduleDay / GameSnapshot"
check 5 "named unit test maps the recorded live fixture to domain"
check 6 "fixtures stay the default; live client is opt-in"
check 7 "existing API tests still pass offline"
check 8 "backlog status"

ADAPTERS="functions/src/adapters"
MAPPERS="functions/src/mappers"

# --- Check 1: HttpMlbStatsClient under adapters, assignable to MlbStatsClient --
client=$(grep -rl "class HttpMlbStatsClient" "$ADAPTERS" 2>/dev/null | head -1)
if [ -z "$client" ]; then
  bad 1 "no HttpMlbStatsClient found under $ADAPTERS"
else
  grep -q "implements MlbStatsClient" "$client" ||
    bad 1 "$client does not declare 'implements MlbStatsClient'"
  grep -qE "\bfetchSchedule\s*\(" "$client" || bad 1 "$client has no fetchSchedule"
  grep -qE "\bfetchGame\s*\(" "$client" || bad 1 "$client has no fetchGame"
  if ! pnpm --filter @bt/functions exec tsc -p tsconfig.json --noEmit >/tmp/s12-tsc.log 2>&1; then
    bad 1 "functions typecheck failed — HttpMlbStatsClient is not assignable to MlbStatsClient"
    tail -15 /tmp/s12-tsc.log | sed 's/^/        /'
  fi
fi

# --- Check 2: talks to statsapi.mlb.com via fetch/https (read source, no calls) -
if [ -n "$client" ]; then
  if ! grep -rqE "https://statsapi\.mlb\.com" "$ADAPTERS" 2>/dev/null; then
    bad 2 "no https://statsapi.mlb.com base URL under $ADAPTERS"
  fi
  if ! grep -rqE "\bfetch\(|node:https|from \"https\"" "$ADAPTERS" 2>/dev/null; then
    bad 2 "no fetch/https call path under $ADAPTERS"
  fi
fi

# --- Check 3: highlights provenance is stated in Scope files -------------------
if ! grep -rqiE "highlights (come|are sourced) from the (content endpoint|live hydrate)" \
      functions/src packages/mlb-api/src 2>/dev/null; then
  bad 3 "no sentence stating whether highlights come from the content endpoint or the live hydrate"
fi

# --- Check 4: pure mapper modules (no I/O) → ScheduleDay / GameSnapshot --------
if [ ! -d "$MAPPERS" ]; then
  bad 4 "$MAPPERS missing"
else
  mapper_count=$(find "$MAPPERS" -name '*.ts' ! -name '*.test.ts' | wc -l | tr -d ' ')
  [ "$mapper_count" -ge 2 ] ||
    bad 4 "expected >=2 mapper modules in $MAPPERS, found $mapper_count"
  io_hits=$(grep -rnE "\bfetch\(|node:fs|node:https|from \"fs\"|from \"https\"" \
    --include='*.ts' "$MAPPERS" | grep -v '\.test\.ts:' || true)
  if [ -n "$io_hits" ]; then
    bad 4 "mapper modules must be pure — found I/O:"
    echo "$io_hits" | sed 's/^/        /'
  fi
  grep -rq "ScheduleDay" "$MAPPERS" || bad 4 "no mapper produces ScheduleDay"
  grep -rq "GameSnapshot" "$MAPPERS" || bad 4 "no mapper produces GameSnapshot"
  grep -rqE "\bplays\b" "$MAPPERS" || bad 4 "no mapper carries plays onto GameSnapshot"
fi

# --- Check 5: named unit test maps the recorded live fixture to domain ---------
TEST="$MAPPERS/live.test.ts"
if [ ! -f "$TEST" ]; then
  bad 5 "$TEST missing"
else
  grep -q "live-823823.json" "$TEST" || bad 5 "$TEST does not read fixtures/raw/live-823823.json"
  for token in 823823 CHC MIA; do
    grep -q "$token" "$TEST" || bad 5 "$TEST does not assert '$token'"
  done
  grep -qE "pX|coordinates" "$TEST" || bad 5 "$TEST does not assert pitch coordinates"
  if ! pnpm --filter @bt/functions exec vitest run src/mappers/live.test.ts >/tmp/s12-vitest.log 2>&1; then
    bad 5 "vitest run src/mappers/live.test.ts failed (see /tmp/s12-vitest.log)"
    tail -20 /tmp/s12-vitest.log | sed 's/^/        /'
  fi
fi

# --- Check 6: fixtures stay the default; live client is opt-in ----------------
LS=functions/src/local-server.ts
if ! grep -q "new FixtureMlbStatsClient(" "$LS"; then
  bad 6 "$LS no longer constructs FixtureMlbStatsClient"
fi
if ! grep -q "BT_USE_LIVE_MLB" "$LS"; then
  bad 6 "$LS does not gate HttpMlbStatsClient behind BT_USE_LIVE_MLB"
fi

# --- Check 7: existing API tests still pass offline ---------------------------
if ! pnpm --filter @bt/functions exec vitest run src/handlers/api.test.ts >/tmp/s12-api.log 2>&1; then
  bad 7 "vitest run src/handlers/api.test.ts failed (see /tmp/s12-api.log)"
  tail -20 /tmp/s12-api.log | sed 's/^/        /'
fi

# --- Check 8: backlog status ---------------------------------------------------
B=docs/v3/BACKLOG.md
if ! awk '/^### S12 /,/^### S13 /' "$B" | grep -q '^\*\*Status:\*\* `done`'; then
  bad 8 "S12 story heading Status is not \`done\` in $B"
fi
if ! grep -qE '^\| *[0-9]+ *\| *\[S12\].*\| *`done` *\|' "$B"; then
  bad 8 "S12 row in the Story status table is not \`done\` in $B"
fi

report "verify-S12"
exit $?
