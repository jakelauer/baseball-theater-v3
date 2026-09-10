#!/usr/bin/env bash
# Grader for BACKLOG story S17 — out-of-window refresh-on-read + single-flight.
# Contract: docs/v3/BACKLOG.md#verify-script-contract
# No network. No writes outside /tmp. Does its own checking (never `pnpm verify`).

set -uo pipefail
cd "$(dirname "$0")/.."

# shellcheck source=lib/checks.sh
source "$(dirname "$0")/lib/checks.sh"

check 1 "cache-mode read path refreshes once when missing or stale per a documented TTL constant"
check 2 "N parallel reads for one key collapse to exactly 1 upstream call (single in-flight)"
check 3 "a refresh inside a documented cooldown constant does not re-hit upstream"
check 4 "src/handlers/api.test.ts still passes (offline fixture path)"
check 5 "backlog Status is done"

INGEST="functions/src/services/ingest.ts"

# The module that exports the TTL constant, and the story-scoped test.
TTL_SRC=$(grep -rlE 'export const CACHE_TTL_MS' functions/src packages/domain/src \
  --include='*.ts' 2>/dev/null | grep -v '\.test\.ts' | head -1)
STORY_TEST=$(grep -rlE '\b(single.?flight|CACHE_TTL_MS|REFRESH_COOLDOWN_MS)\b' \
  functions/src --include='*.test.ts' 2>/dev/null | head -1)

# --- Check 1: staleness trigger on the cache-mode read path -------------------
if [ -z "$TTL_SRC" ]; then
  bad 1 "no module exports a CACHE_TTL_MS constant"
else
  grep -qE '^\s*(/\*\*|\*|//).*(stale|ttl|fresh|cache)' "$TTL_SRC" ||
    bad 1 "$TTL_SRC does not document the TTL default"
  # Exactly one module owns the constant.
  dupes=$(grep -rlE 'export const CACHE_TTL_MS' functions/src packages/domain/src \
    --include='*.ts' 2>/dev/null | grep -v '\.test\.ts' | grep -v "$TTL_SRC" || true)
  [ -n "$dupes" ] && { bad 1 "CACHE_TTL_MS is exported from more than one module:"; echo "$dupes" | sed 's/^/        /'; }
fi
if [ ! -f "$INGEST" ]; then
  bad 1 "$INGEST missing"
else
  grep -qE 'CACHE_TTL_MS|isStale|stale' "$INGEST" ||
    bad 1 "$INGEST read path never consults the TTL / staleness helper"
  grep -qE '"cache"' "$INGEST" ||
    bad 1 "$INGEST staleness branch is not gated on windowMode \"cache\""
fi

# --- Checks 1-3: the story-scoped test ---------------------------------------
if [ -z "$STORY_TEST" ]; then
  bad 1 "no *.test.ts under functions/src exercises the refresh coordinator"
  bad 2 "no *.test.ts under functions/src exercises single-flight"
  bad 3 "no *.test.ts under functions/src exercises the cooldown"
else
  net=$(grep -nE '\bfetch\(|undici|node-fetch|https?://' "$STORY_TEST" \
    | grep -vE 'localhost|127\.0\.0\.1' || true)
  [ -n "$net" ] && { bad 1 "$STORY_TEST reaches the network:"; echo "$net" | sed 's/^/        /'; }

  # Single-flight: a parallel-reads assertion collapsing to one call.
  grep -qE 'Promise\.all|Promise\.allSettled' "$STORY_TEST" ||
    bad 2 "$STORY_TEST does not fire parallel reads"
  grep -qE 'toBe\(1\)|toHaveBeenCalledTimes\(1\)|toEqual\(1\)' "$STORY_TEST" ||
    bad 2 "$STORY_TEST has no exactly-one-upstream-call assert"

  # Cooldown: a named constant, documented, and a no-second-hit assert.
  COOLDOWN_SRC=$(grep -rlE 'export const REFRESH_COOLDOWN_MS' functions/src packages/domain/src \
    --include='*.ts' 2>/dev/null | grep -v '\.test\.ts' | head -1)
  if [ -z "$COOLDOWN_SRC" ]; then
    bad 3 "no module exports a REFRESH_COOLDOWN_MS constant"
  else
    grep -qE '^\s*(/\*\*|\*|//).*(cooldown|rate|throttle|egress)' "$COOLDOWN_SRC" ||
      bad 3 "$COOLDOWN_SRC does not document the cooldown default"
  fi
  grep -qE 'cooldown|COOLDOWN' "$STORY_TEST" ||
    bad 3 "$STORY_TEST never exercises the cooldown"

  if ! pnpm --filter @bt/functions exec vitest run "${STORY_TEST#functions/}" \
        >/tmp/s17-story.log 2>&1; then
    bad 1 "$STORY_TEST does not pass in isolation"
    bad 2 "$STORY_TEST does not pass in isolation"
    bad 3 "$STORY_TEST does not pass in isolation"
    tail -30 /tmp/s17-story.log | sed 's/^/        /'
  fi
fi

# --- Check 4: the api.test.ts regression ------------------------------------
if ! pnpm --filter @bt/functions exec vitest run src/handlers/api.test.ts \
      >/tmp/s17-api.log 2>&1; then
  bad 4 "src/handlers/api.test.ts does not pass"
  tail -30 /tmp/s17-api.log | sed 's/^/        /'
fi

# --- Check 5: backlog Status is done ---------------------------------------
grep -qE '^\| 9 \| \[S17\].*\| `done` \|$' docs/v3/BACKLOG.md ||
  bad 5 "S17 row in the Story status table is not \`done\`"
awk '/^### S17 —/,/^### S18 —/' docs/v3/BACKLOG.md | grep -qE '^\*\*Status:\*\* `done`$' ||
  bad 5 "S17 story heading Status is not \`done\`"

report "verify-S17"
exit $?
