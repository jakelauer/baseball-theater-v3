#!/usr/bin/env bash
# Grader for BACKLOG story S21 — project ingested MLB into durable BT store shapes.
# Contract: docs/v3/BACKLOG.md#verify-script-contract
# No network. No writes outside /tmp. Does its own checking (never `pnpm verify`).

set -uo pipefail
cd "$(dirname "$0")/.."

fail=0
bad() {
  echo "FAIL check $1: $2"
  fail=1
}

STORE="packages/domain/src/store.ts"
PROJECT="packages/domain/src/projections.ts"
INGEST="functions/src/services/ingest.ts"
MEMORY="functions/src/adapters/memory/repos.ts"
STORY_TEST="functions/src/services/projection.test.ts"

# The five documents this story projects — no more, no less.
DOCS="GameHeaderDoc GameLinescoreDoc GamePlaysDoc GameBoxscoreDoc GameMediaDoc"

# --- Check 1: pure projection module over named BT store types -----------------
if [ ! -f "$STORE" ]; then
  bad 1 "$STORE missing (named BT store document types)"
else
  for t in $DOCS; do
    grep -qE "export type $t\b|export interface $t\b" "$STORE" ||
      bad 1 "$STORE does not export a store type named $t"
  done
fi
if [ ! -f "$PROJECT" ]; then
  bad 1 "$PROJECT missing (projection module)"
else
  grep -qE "export function project[A-Za-z]*\(" "$PROJECT" ||
    bad 1 "$PROJECT exports no project* function"
  io=$(grep -nE "\bfetch\(|node:fs|node:https|from \"fs\"|from \"https\"" "$PROJECT" || true)
  if [ -n "$io" ]; then
    bad 1 "$PROJECT must be pure — found I/O:"
    echo "$io" | sed 's/^/        /'
  fi
  # Boxscore rows must be produced, not stubbed empty.
  grep -q "batting" "$PROJECT" || bad 1 "$PROJECT never builds a batting table"
  grep -q "pitching" "$PROJECT" || bad 1 "$PROJECT never builds a pitching table"
fi

# --- Check 2: a repository persists projections, and ingest projects -----------
if [ ! -f "$INGEST" ]; then
  bad 2 "$INGEST missing"
else
  grep -qE "\bproject[A-Za-z]*\b" "$INGEST" ||
    bad 2 "$INGEST neither imports nor calls a project* function"
  grep -qE "projections[^)]*\.upsert\(|\.upsert\(project" "$INGEST" ||
    bad 2 "$INGEST does not upsert a projection through a repository"
fi
repo=$(grep -rlE "interface GameProjectionRepository" functions/src 2>/dev/null | head -1)
if [ -z "$repo" ]; then
  bad 2 "no GameProjectionRepository interface under functions/src"
else
  grep -qE "\bupsert\s*\(" "$repo" ||
    bad 2 "$repo has no upsert"
fi
grep -q "GameProjectionRepository" "$MEMORY" ||
  bad 2 "$MEMORY has no memory adapter for GameProjectionRepository"

# --- Check 3: fixture → projections, on the paths the UI will bind to ----------
if [ ! -f "$STORY_TEST" ]; then
  bad 3 "$STORY_TEST missing (raw fixture → projections)"
else
  for token in abbreviation batting pitching; do
    grep -q "$token" "$STORY_TEST" ||
      bad 3 "$STORY_TEST never asserts on '$token'"
  done
  if ! pnpm --filter @bt/functions exec vitest run src/services/projection.test.ts \
      >/tmp/s21-vitest.log 2>&1; then
    bad 3 "$STORY_TEST does not pass in isolation"
    tail -25 /tmp/s21-vitest.log | sed 's/^/        /'
  fi
fi

# --- Check 4: the store shapes are written down --------------------------------
doc=""
for candidate in docs/v3/ARCHITECTURE.md docs/v3/STORE-SHAPES.md; do
  [ -f "$candidate" ] && grep -qE "^#+ .*BT store shapes" "$candidate" && doc="$candidate"
done
if [ -z "$doc" ]; then
  bad 4 "no 'BT store shapes' heading in docs/v3/ARCHITECTURE.md or docs/v3/STORE-SHAPES.md"
else
  for t in $DOCS; do
    grep -q "$t" "$doc" || bad 4 "$doc does not list $t"
  done
fi

# --- Check 5: existing ingest/API behavior still holds -------------------------
if ! pnpm --filter @bt/functions exec vitest run src/services/ingest.test.ts \
    src/handlers/api.test.ts >/tmp/s21-regress.log 2>&1; then
  bad 5 "ingest/API tests fail"
  tail -20 /tmp/s21-regress.log | sed 's/^/        /'
fi

# --- Check 6: backlog Status is done ------------------------------------------
grep -qE '^\| 5 \| \[S21\].*\| `done` \|$' docs/v3/BACKLOG.md ||
  bad 6 "S21 row in the Story status table is not \`done\`"
awk '/^### S21 —/,/^### S16 —/' docs/v3/BACKLOG.md | grep -qE '^\*\*Status:\*\* `done`$' ||
  bad 6 "S21 story heading Status is not \`done\`"

if [ "$fail" -eq 0 ]; then
  echo "verify-S21: all checks passed"
fi
exit "$fail"
