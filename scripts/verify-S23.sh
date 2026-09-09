#!/usr/bin/env bash
# Grader for BACKLOG story S23 — full-fidelity upstream types for the recorded fixtures.
# Contract: docs/v3/BACKLOG.md#verify-script-contract
# No network. No writes outside /tmp. Does its own checking (never `pnpm verify`).

set -uo pipefail
cd "$(dirname "$0")/.."

fail=0
bad() {
  echo "FAIL check $1: $2"
  fail=1
}

SRC="packages/mlb-api/src"
COV="$SRC/coverage.ts"
COV_TEST="$SRC/coverage.test.ts"
IGNORE="$SRC/coverage-ignore.ts"
DEDUP_TEST="$SRC/shape-dedup.test.ts"

# Non-test type/impl sources — the surface every grep below is scoped to.
srcs() { find "$SRC" -maxdepth 1 -name '*.ts' ! -name '*.test.ts'; }

# --- Check 1: coverage helper with leafPaths + uncoveredPaths -----------------
if [ ! -f "$COV" ]; then
  bad 1 "$COV missing (coverage helper)"
else
  grep -qE "export function leafPaths|export const leafPaths" "$COV" ||
    bad 1 "$COV does not export leafPaths"
  grep -qE "export function uncoveredPaths|export const uncoveredPaths" "$COV" ||
    bad 1 "$COV does not export uncoveredPaths"
  # array indices normalized to `[]`
  grep -q '\[\]' "$COV" || bad 1 "$COV never renders an array index as []"
fi

# --- Check 2: coverage test + reasoned allowlist ------------------------------
if [ ! -f "$COV_TEST" ]; then
  bad 2 "$COV_TEST missing (strict coverage layer)"
else
  grep -q "uncoveredPaths" "$COV_TEST" ||
    bad 2 "$COV_TEST does not use uncoveredPaths"
  grep -qE "coverage-ignore" "$COV_TEST" ||
    bad 2 "$COV_TEST does not consult the coverage-ignore allowlist"
fi
if [ ! -f "$IGNORE" ]; then
  bad 2 "$IGNORE missing (allowlist)"
else
  # Allowlist entries are quoted path strings, one per line; each needs a reason.
  entries=$(grep -cE '^[[:space:]]*"[^"]+",' "$IGNORE")
  reasons=$(grep -cE '^[[:space:]]*"[^"]+",[[:space:]]*//[[:space:]]*reason:' "$IGNORE")
  if [ "$entries" -ne "$reasons" ]; then
    bad 2 "$IGNORE has $entries entries but only $reasons carry a '// reason:' comment"
    grep -nE '^[[:space:]]*"[^"]+",' "$IGNORE" |
      grep -vE '//[[:space:]]*reason:' | sed 's/^/        /'
  fi
fi

# --- Check 3: every single-response raw fixture is covered ---------------------
if [ -f "$COV_TEST" ]; then
  for fx in schedule-2026-09-05.json live-823823.json content-823823.json live-823823-base.json; do
    grep -q "$fx" "$COV_TEST" || bad 3 "$COV_TEST does not cover fixtures/raw/$fx"
  done
  # timestamps is a bare string array: a parser or an explicit skip, either is fine.
  grep -qE "timestamps-823823\.json" "$COV_TEST" ||
    bad 3 "$COV_TEST neither parses nor explicitly skips timestamps-823823.json"
  # diffpatch is a derived replay envelope — S22 types it, S23 must not claim it.
  grep -q "diffpatch-823823.json" "$COV_TEST" &&
    bad 3 "$COV_TEST covers diffpatch-823823.json, which belongs to S22"
fi

# --- Check 4: allowlist ceiling (<= 25 entries) --------------------------------
if [ -f "$IGNORE" ]; then
  total=$(grep -cE '^[[:space:]]*"[^"]+",' "$IGNORE")
  [ "$total" -le 25 ] ||
    bad 4 "allowlist holds $total entries; the ceiling is 25"
fi

# --- Check 5: liveData.boxscore fully modeled ---------------------------------
for t in LiveBoxscorePlayer LiveBoxscorePlayerStats LiveBoxscoreTeamStats \
         LiveBoxscoreInfoLabel LiveBoxscoreTeam; do
  grep -rqE "export (interface|type) $t\b" $(srcs) 2>/dev/null ||
    bad 5 "no exported type named $t under $SRC"
done
for f in person position status stats seasonStats gameStatus jerseyNumber battingOrder; do
  grep -rqE "\b$f\b" "$SRC/live.ts" 2>/dev/null ||
    bad 5 "boxscore field '$f' is not modeled in $SRC/live.ts"
done
for f in battingOrder info note teamStats; do
  grep -qE "\b$f\b" "$SRC/parse.ts" ||
    bad 5 "$SRC/parse.ts does not parse team-level boxscore '$f'"
done
grep -qE "LiveBoxscorePlayer|boxscorePlayerSchema" "$SRC/parse.ts" ||
  bad 5 "$SRC/parse.ts does not reference the boxscore player types"

# --- Check 6: gameData branches + liveData leaders/decisions -------------------
for f in flags review gameInfo weather moundVisits probablePitchers \
         officialScorer officialVenue alerts; do
  grep -qE "^[[:space:]]*$f\??:" "$SRC/live.ts" ||
    bad 6 "gameData branch '$f' is not a modeled field in $SRC/live.ts"
done
for t in LiveGameFlags LiveGameReview LiveGameInfoDetail LiveWeather LiveMoundVisits \
         LiveLeaders LiveDecisions; do
  grep -rqE "export (interface|type) $t\b" $(srcs) 2>/dev/null ||
    bad 6 "no exported type named $t under $SRC"
done
grep -qE "^[[:space:]]*leaders\??:" "$SRC/live.ts" ||
  bad 6 "liveData.leaders is not a modeled field in $SRC/live.ts"

# --- Check 7: no `any`; id-keyed escape hatches capped at 6 --------------------
any_hits=$(grep -nE ':[[:space:]]*any\b|as any\b|\bany\[\]' $(srcs) || true)
if [ -n "$any_hits" ]; then
  bad 7 "found 'any' in non-test sources:"
  echo "$any_hits" | sed 's/^/        /'
fi
loose=$(grep -oE 'z\.record\(|z\.unknown\(\)|Record<string,' $(srcs) | wc -l | tr -d ' ')
[ "$loose" -le 6 ] ||
  bad 7 "found $loose z.record/z.unknown/Record<string, occurrences; only 6 are allowed (genuine id-keyed maps)"

# --- Check 8: composition, not repetition -------------------------------------
inline=$(awk '
  /^export (interface|type) [A-Za-z0-9_]+/ { inblock = 1 }
  inblock && /\/\/[[:space:]]*design-exception:/ { exempt++; next }
  inblock && /[?]?:[[:space:]]*(Array<)?\{/ { print FILENAME ":" FNR ": " $0 }
  inblock && /^\}/ { inblock = 0 }
  # `Record<...>` and index signatures are excepted by the story.
' $(srcs) | grep -vE 'Record<|\[[a-zA-Z]+:[[:space:]]*string\]' || true)
if [ -n "$inline" ]; then
  bad 8 "inline object-literal field types inside exported types (name them):"
  echo "$inline" | sed 's/^/        /'
fi
exceptions=$(grep -c '// design-exception:' $(srcs) | awk -F: '{s+=$NF} END {print s+0}')
[ "$exceptions" -le 4 ] ||
  bad 8 "$exceptions '// design-exception:' markers; at most 4 are allowed"
long=$(grep -ohE 'export (interface|type) [A-Za-z0-9_]+' $(srcs) |
  awk '{ if (length($3) > 40) print $3 }')
if [ -n "$long" ]; then
  bad 8 "exported type names longer than 40 characters:"
  echo "$long" | sed 's/^/        /'
fi
[ -f "$DEDUP_TEST" ] || bad 8 "$DEDUP_TEST missing (near-duplicate interface guard)"

# --- Check 9: the package's own suite is green --------------------------------
if ! pnpm --filter @bt/mlb-api exec vitest run >/tmp/s23-vitest.log 2>&1; then
  bad 9 "pnpm --filter @bt/mlb-api exec vitest run failed"
  tail -25 /tmp/s23-vitest.log | sed 's/^/        /'
fi

# --- Check 10: backlog Status is done -----------------------------------------
grep -qE '^\| 4 \| \[S23\].*\| `done` \|$' docs/v3/BACKLOG.md ||
  bad 10 "S23 row in the Story status table is not \`done\`"
awk '/^### S23 —/,/^### S13 —/' docs/v3/BACKLOG.md | grep -qE '^\*\*Status:\*\* `done`$' ||
  bad 10 "S23 story heading Status is not \`done\`"

if [ "$fail" -eq 0 ]; then
  echo "verify-S23: all checks passed"
fi
exit "$fail"
