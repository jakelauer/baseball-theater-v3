#!/usr/bin/env bash
# Grader for BACKLOG story S13 — expand MLB client: content, standings, players.
# Contract: docs/v3/BACKLOG.md#verify-script-contract
# No network. No writes outside /tmp. Does its own checking (never `pnpm verify`).

set -uo pipefail
cd "$(dirname "$0")/.."

# shellcheck source=lib/checks.sh
source "$(dirname "$0")/lib/checks.sh"

# Every check this grader performs, declared so a pass is reported too.
check 1 "the port declares all three new methods"
check 2 "FixtureMlbStatsClient implements all three from fixtures/"
check 3 "named upstream types in the S11 tree, no \`any\`, coverage-gated"
check 4 "a mapper unit test per endpoint, fixtures only, green in isolation"
check 5 "the S11-tree suite stays green with the new types"
check 6 "backlog Status is done"

PORTS="packages/ports/src"
SRC="packages/mlb-api/src"
COV_TEST="$SRC/coverage.test.ts"
IGNORE="$SRC/coverage-ignore.ts"
FIXCLIENT="functions/src/adapters/fixtures/mlb.ts"
MAPPERS="functions/src/mappers"

# Non-test type/impl sources in the S11 tree — the surface greps are scoped to.
srcs() { find "$SRC" -maxdepth 1 -name '*.ts' ! -name '*.test.ts'; }

# --- Check 1: the port declares all three new methods -------------------------
for m in fetchGameContent fetchStandings fetchPlayers; do
  grep -rqE "^[[:space:]]*$m\(" "$PORTS" ||
    bad 1 "no port under $PORTS declares $m("
done
grep -rqE "fetchGameContent\([[:space:]]*gamePk" "$PORTS" ||
  bad 1 "fetchGameContent does not take a gamePk parameter"
grep -rqE "fetchStandings\([[:space:]]*date" "$PORTS" ||
  bad 1 "fetchStandings does not take a date parameter"
grep -rqE "fetchPlayers\([[:space:]]*ids" "$PORTS" ||
  bad 1 "fetchPlayers does not take an ids parameter"

# --- Check 2: FixtureMlbStatsClient implements all three from fixtures/ --------
if [ ! -f "$FIXCLIENT" ]; then
  bad 2 "$FIXCLIENT missing"
else
  for m in fetchGameContent fetchStandings fetchPlayers; do
    grep -qE "^[[:space:]]*async $m\(" "$FIXCLIENT" ||
      bad 2 "$FIXCLIENT does not implement $m("
  done
  # Fixture-backed, not invented in code: each new method reads a committed file.
  grep -qE "readJson|readFile" "$FIXCLIENT" ||
    bad 2 "$FIXCLIENT no longer reads committed JSON"
  grep -qiE "standings" "$FIXCLIENT" ||
    bad 2 "$FIXCLIENT never references a standings fixture"
  grep -qiE "players|people" "$FIXCLIENT" ||
    bad 2 "$FIXCLIENT never references a players fixture"
fi
for f in fixtures/standings-*.json fixtures/players-*.json; do
  compgen -G "$f" >/dev/null || bad 2 "no committed fixture matching $f"
done

# --- Check 3: named upstream types in the S11 tree, no `any`, coverage-gated ---
for t in StandingsResponse StandingsRecordEntry PeopleResponse; do
  grep -rqE "export (interface|type) $t\b" $(srcs) 2>/dev/null ||
    bad 3 "no exported type named $t under $SRC"
done
# Standings/people must be their own purpose-split modules, not bolted onto live.ts.
[ -f "$SRC/standings.ts" ] || bad 3 "$SRC/standings.ts missing (purpose-split module)"
[ -f "$SRC/people.ts" ] || bad 3 "$SRC/people.ts missing (purpose-split module)"
any_hits=$(grep -nE ':[[:space:]]*any\b|as any\b|\bany\[\]' $(srcs) || true)
if [ -n "$any_hits" ]; then
  bad 3 "found 'any' in non-test sources:"
  echo "$any_hits" | sed 's/^/        /'
fi
if [ -f "$COV_TEST" ]; then
  grep -qE "standings-[^\"]*\.json" "$COV_TEST" ||
    bad 3 "$COV_TEST does not cover a raw standings fixture"
  grep -qE "(people|players)-[^\"]*\.json" "$COV_TEST" ||
    bad 3 "$COV_TEST does not cover a raw people/players fixture"
  grep -q "content-823823.json" "$COV_TEST" ||
    bad 3 "$COV_TEST no longer covers the content fixture"
else
  bad 3 "$COV_TEST missing"
fi
if [ -f "$IGNORE" ]; then
  total=$(grep -cE '^[[:space:]]*"[^"]+",' "$IGNORE")
  [ "$total" -le 25 ] ||
    bad 3 "allowlist holds $total entries; the S23 ceiling is 25"
  reasons=$(grep -cE '^[[:space:]]*"[^"]+",[[:space:]]*//[[:space:]]*reason:' "$IGNORE")
  [ "$total" -eq "$reasons" ] ||
    bad 3 "$IGNORE has $total entries but only $reasons carry a '// reason:' comment"
fi

# --- Check 4: a mapper unit test per endpoint, fixtures only, green in isolation
for m in content standings players; do
  [ -f "$MAPPERS/$m.ts" ] || bad 4 "$MAPPERS/$m.ts missing (mapper)"
  [ -f "$MAPPERS/$m.test.ts" ] || bad 4 "$MAPPERS/$m.test.ts missing (mapper unit test)"
done
# No network in the mapper tests.
net=$(grep -nE '\bfetch\(|undici|node-fetch|https?://(?!localhost)' \
  "$MAPPERS"/content.test.ts "$MAPPERS"/standings.test.ts "$MAPPERS"/players.test.ts \
  2>/dev/null | grep -vE 'localhost|127\.0\.0\.1' || true)
if [ -n "$net" ]; then
  bad 4 "mapper tests reference the network:"
  echo "$net" | sed 's/^/        /'
fi
if [ -f "$MAPPERS/content.test.ts" ] &&
   [ -f "$MAPPERS/standings.test.ts" ] &&
   [ -f "$MAPPERS/players.test.ts" ]; then
  if ! pnpm --filter @bt/functions exec vitest run \
        src/mappers/content.test.ts src/mappers/standings.test.ts src/mappers/players.test.ts \
        >/tmp/s13-mappers.log 2>&1; then
    bad 4 "the three mapper test files do not pass in isolation"
    tail -25 /tmp/s13-mappers.log | sed 's/^/        /'
  fi
fi

# --- Check 5: the S11-tree suite stays green with the new types ----------------
if ! pnpm --filter @bt/mlb-api exec vitest run >/tmp/s13-mlbapi.log 2>&1; then
  bad 5 "pnpm --filter @bt/mlb-api exec vitest run failed"
  tail -25 /tmp/s13-mlbapi.log | sed 's/^/        /'
fi

# --- Check 6: backlog Status is done ------------------------------------------
grep -qE '^\| 6 \| \[S13\].*\| `done` \|$' docs/v3/BACKLOG.md ||
  bad 6 "S13 row in the Story status table is not \`done\`"
awk '/^### S13 —/,/^### S14 —/' docs/v3/BACKLOG.md | grep -qE '^\*\*Status:\*\* `done`$' ||
  bad 6 "S13 story heading Status is not \`done\`"

report "verify-S13"
exit $?
