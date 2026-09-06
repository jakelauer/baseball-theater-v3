#!/usr/bin/env bash
# Grader for BACKLOG story S11 — MLB upstream payload types for carried loop.
# Contract: docs/v3/BACKLOG.md#verify-script-contract
# No network. No writes outside /tmp. Does its own checking (never `pnpm verify`).

set -uo pipefail
cd "$(dirname "$0")/.."

fail=0
bad() {
  echo "FAIL check $1: $2"
  fail=1
}

TREE="packages/mlb-api"
SRC="$TREE/src"

# --- Check 1: workspace package with >=2 concern-split modules -----------------
if [ ! -f "$TREE/package.json" ]; then
  bad 1 "$TREE/package.json missing (not a workspace package)"
elif ! grep -q '"name": *"@bt/mlb-api"' "$TREE/package.json"; then
  bad 1 "$TREE/package.json does not declare name @bt/mlb-api"
fi
if ! grep -qE '^\s*-\s*"?packages/\*"?' pnpm-workspace.yaml; then
  bad 1 "pnpm-workspace.yaml does not glob packages/*"
fi
modules=0
if [ -d "$SRC" ]; then
  modules=$(find "$SRC" -name '*.ts' ! -name '*.test.ts' ! -name 'index.ts' | wc -l | tr -d ' ')
fi
if [ "$modules" -lt 2 ]; then
  bad 1 "expected >=2 non-test, non-index TypeScript modules in $SRC, found $modules"
fi

# --- Check 2: named exported types cover schedule / live feed / content --------
# Each required type must be exported by name, and the tree must carry the
# upstream field names the product actually binds to.
for t in ScheduleResponse ScheduleDate ScheduleGame ScheduleGameTeam GameStatus \
         LiveFeedResponse LiveGameData LiveData LiveGamePlay LiveGamePlayEvent \
         LiveLinescore Venue GameContentResponse ContentHighlightItem PlaybackUrl; do
  if ! grep -rqE "export (interface|type) $t\b" "$SRC" 2>/dev/null; then
    bad 2 "no exported named type '$t' in $SRC"
  fi
done
for f in gamePk abbreviation detailedState abstractGameState venue linescore \
         playEvents pitchData blurb; do
  if ! grep -rqE "\b$f\b" "$SRC" 2>/dev/null; then
    bad 2 "upstream field '$f' is not modelled anywhere in $SRC"
  fi
done

# --- Check 3: no `any` on carried files ---------------------------------------
if [ -d "$SRC" ]; then
  hits=$(grep -rnE ':\s*any\b|as any\b|any\[\]' "$SRC" || true)
  if [ -n "$hits" ]; then
    bad 3 "found 'any' in $SRC:"
    echo "$hits" | sed 's/^/        /'
  fi
fi

# --- Check 4: named play-event type, referenced as an array (not inline) -------
if ! grep -rqE "export (interface|type) (\w*PlayEvent\w*|LiveGamePlayEvent)\b" "$SRC" 2>/dev/null; then
  bad 4 "no exported named play-event type in $SRC"
fi
if ! grep -rqE "playEvents\??:\s*(readonly\s+)?\w*PlayEvent\w*\[\]" "$SRC" 2>/dev/null; then
  bad 4 "no play type references a named play-event type as an array (inline object arrays are not allowed)"
fi

# --- Check 5: the three recorded raw payloads, unmodified ---------------------
expect_sha() {
  local file="fixtures/raw/$1" want="$2"
  if [ ! -f "$file" ]; then
    bad 5 "$file missing"
    return
  fi
  local got
  got=$(shasum -a 256 "$file" | awk '{print $1}')
  if [ "$got" != "$want" ]; then
    bad 5 "$file modified (sha256 $got, expected $want)"
  fi
}
expect_sha schedule-2026-09-05.json ace8f70d562a86995dbcdbe254e5ccf865908ebab4e6f11cc0e0cc8149d6c7f0
expect_sha live-823823.json         c327e10e9d6639b394a86ff33fc95c3409c8f59ca1a4dd1b41ac005413076272
expect_sha content-823823.json      301be763ed1e88f89d9ee6400cb8a60f479b37bf983a9d91ed986be3f9629ee6

# --- Check 6: a story-scoped Vitest file parses all three with zod/valibot -----
TEST="$SRC/parse.test.ts"
if [ ! -f "$TEST" ]; then
  bad 6 "$TEST missing"
else
  for fx in schedule-2026-09-05.json live-823823.json content-823823.json; do
    grep -q "$fx" "$TEST" || bad 6 "$TEST does not parse fixtures/raw/$fx"
  done
  if ! grep -rqE "from \"(zod|valibot)\"" "$SRC" 2>/dev/null; then
    bad 6 "neither zod nor valibot appears in the parse path under $SRC"
  fi
  if ! pnpm --filter @bt/mlb-api exec vitest run src/parse.test.ts >/tmp/s11-vitest.log 2>&1; then
    bad 6 "vitest run src/parse.test.ts failed (see /tmp/s11-vitest.log)"
    tail -20 /tmp/s11-vitest.log | sed 's/^/        /'
  fi
fi

# --- Check 7: GameSnapshot stays a BT domain type -----------------------------
if ! grep -qE "export type GameSnapshot\b" packages/domain/src/types.ts; then
  bad 7 "GameSnapshot is no longer defined in packages/domain/src/types.ts"
fi
if [ -d "$SRC" ] && grep -rq "GameSnapshot" "$SRC" 2>/dev/null; then
  bad 7 "$SRC references GameSnapshot — upstream types must stay separate from BT product domain"
fi

# --- Check 8: backlog status ---------------------------------------------------
B=docs/v3/BACKLOG.md
if ! awk '/^### S11 /,/^### S12 /' "$B" | grep -q '^\*\*Status:\*\* `done`'; then
  bad 8 "S11 story heading Status is not \`done\` in $B"
fi
if ! grep -qE '^\| *[0-9]+ *\| *\[S11\].*\| *`done` *\|' "$B"; then
  bad 8 "S11 row in the Story status table is not \`done\` in $B"
fi

if [ "$fail" -eq 0 ]; then
  echo "verify-S11: PASS"
else
  echo "verify-S11: FAIL"
fi
exit "$fail"
