#!/usr/bin/env bash
# Grader for BACKLOG story S16 — ADR-002 active-window ingest cadence loop.
# Contract: docs/v3/BACKLOG.md#verify-script-contract
# No network. No writes outside /tmp. Does its own checking (never `pnpm verify`).

set -uo pipefail
cd "$(dirname "$0")/.."

# shellcheck source=lib/checks.sh
source "$(dirname "$0")/lib/checks.sh"

check 1 "lead, trail and interval live in one module exporting DEFAULT_CADENCE, documented"
check 2 "tickIngest selects the active window, fetches, projects and upserts as windowMode active"
check 3 "injected clock + fake client: in-window projected, far out-of-window never fetched"
check 4 "tickIngest is exported and any pnpm dev interval is env-gated"
check 5 "web/ never imports HttpMlbStatsClient or statsapi.mlb.com"
check 6 "backlog Status is done"

WINDOW="packages/domain/src/window.ts"
SERVER="functions/src/local-server.ts"

# The module that defines tickIngest, and its colocated test.
TICK_SRC=$(grep -rlE 'export (async )?function tickIngest' functions/src --include='*.ts' \
  2>/dev/null | grep -v '\.test\.ts' | head -1)
TICK_TEST=$(grep -rlE '\btickIngest\b' functions/src --include='*.test.ts' 2>/dev/null | head -1)

# --- Check 1: one cadence module, with an interval ----------------------------
if [ ! -f "$WINDOW" ]; then
  bad 1 "$WINDOW missing"
else
  grep -qE 'export const DEFAULT_CADENCE' "$WINDOW" ||
    bad 1 "$WINDOW does not export DEFAULT_CADENCE"
  for f in leadHours trailHours; do
    grep -qE "\b$f\b" "$WINDOW" || bad 1 "$WINDOW does not define $f"
  done
  grep -qE '\b(intervalMs|interval)\b' "$WINDOW" ||
    bad 1 "$WINDOW carries no interval / intervalMs field (AC1)"
  # Defaults must be documented in that file, not bare magic numbers.
  grep -qE '^\s*(/\*\*|\*|//).*(interval|poll|cadence)' "$WINDOW" ||
    bad 1 "$WINDOW does not document the interval default (comment or named constant)"
  # One module: no second definition of the cadence knobs elsewhere.
  dupes=$(grep -rlE 'leadHours\s*:' packages/domain/src functions/src --include='*.ts' \
    2>/dev/null | grep -v '\.test\.ts' | grep -v "$WINDOW" || true)
  if [ -n "$dupes" ]; then
    bad 1 "cadence params are defined outside $WINDOW:"
    echo "$dupes" | sed 's/^/        /'
  fi
fi

# --- Check 2: what tickIngest actually does -----------------------------------
if [ -z "$TICK_SRC" ]; then
  bad 2 "no exported tickIngest under functions/src"
else
  # Signature spans lines under prettier's printWidth, so read the whole block.
  sig=$(awk '/export (async )?function tickIngest\(/,/\)\s*:/' "$TICK_SRC")
  grep -qE 'deps|IngestDeps' <<<"$sig" ||
    bad 2 "$TICK_SRC: tickIngest takes no deps argument"
  grep -qE '\bDate\b|\bnow\b' <<<"$sig" ||
    bad 2 "$TICK_SRC: tickIngest takes no injected clock (a now: Date parameter)"
  grep -qE 'CadenceParams|DEFAULT_CADENCE' <<<"$sig" ||
    bad 2 "$TICK_SRC: tickIngest does not accept the cadence params"
  grep -q 'isGameInActiveWindow' "$TICK_SRC" ||
    bad 2 "$TICK_SRC does not select games with isGameInActiveWindow"
  grep -qE 'fetchGame|mlb\.' "$TICK_SRC" ||
    bad 2 "$TICK_SRC never fetches through the MlbStatsClient"
  grep -qE 'projectGame|projections\.upsert' "$TICK_SRC" ||
    bad 2 "$TICK_SRC does not run the S21 projection / upsert projections"
  grep -q 'fetchedAt' "$TICK_SRC" || bad 2 "$TICK_SRC does not stamp fetchedAt"
  grep -qE '"active"' "$TICK_SRC" ||
    bad 2 "$TICK_SRC does not write windowMode \"active\""
fi

# --- Check 3: the cadence test ------------------------------------------------
if [ -z "$TICK_TEST" ]; then
  bad 3 "no *.test.ts under functions/src exercising tickIngest"
else
  net=$(grep -nE '\bfetch\(|undici|node-fetch|https?://' "$TICK_TEST" \
    | grep -vE 'localhost|127\.0\.0\.1' || true)
  [ -n "$net" ] && { bad 3 "$TICK_TEST reaches the network:"; echo "$net" | sed 's/^/        /'; }
  # Injected clock, not the wall clock.
  grep -qE 'now\s*[:=]|new Date\(' "$TICK_TEST" ||
    bad 3 "$TICK_TEST does not inject a clock"
  # The negative assert is the point of the story: out-of-window is never fetched.
  grep -qE 'toBe\(0\)|toHaveLength\(0\)|not\.toContain|toEqual\(\[\]\)' "$TICK_TEST" ||
    bad 3 "$TICK_TEST has no zero-call assert for the out-of-window game"
  grep -qE 'projections|projectGame|upsert' "$TICK_TEST" ||
    bad 3 "$TICK_TEST never asserts a projection was upserted"

  if ! pnpm --filter @bt/functions exec vitest run "${TICK_TEST#functions/}" \
        >/tmp/s16-tick.log 2>&1; then
    bad 3 "$TICK_TEST does not pass in isolation"
    tail -25 /tmp/s16-tick.log | sed 's/^/        /'
  fi
fi

# --- Check 4: exported, and any dev interval is env-gated ---------------------
if [ -n "$TICK_SRC" ]; then
  grep -qE 'export (async )?function tickIngest' "$TICK_SRC" ||
    bad 4 "tickIngest is not exported from $TICK_SRC"
fi
if [ ! -f "$SERVER" ]; then
  bad 4 "$SERVER missing"
else
  grep -q 'tickIngest' "$SERVER" || bad 4 "$SERVER never references tickIngest"
  grep -qE 'process\.env\.BT_[A-Z_]+' "$SERVER" ||
    bad 4 "$SERVER starts the loop without an env gate"
  # If an interval is armed, it must sit behind an env check, not run unconditionally.
  if grep -qE 'setInterval' "$SERVER"; then
    awk '/process\.env\.BT_[A-Z_]+/{gate=NR} /setInterval/{if (gate=="" ) exit 1}' "$SERVER" ||
      bad 4 "$SERVER calls setInterval with no preceding env gate"
  fi
fi

# --- Check 5: web/ stays off MLB ----------------------------------------------
webhits=$(grep -rnE 'HttpMlbStatsClient|statsapi\.mlb\.com' web/src web/index.html \
  2>/dev/null || true)
if [ -n "$webhits" ]; then
  bad 5 "web/ reaches MLB directly (ADR-002 cost path):"
  echo "$webhits" | sed 's/^/        /'
fi

# --- Check 6: backlog Status is done ------------------------------------------
grep -qE '^\| 8 \| \[S16\].*\| `done` \|$' docs/v3/BACKLOG.md ||
  bad 6 "S16 row in the Story status table is not \`done\`"
awk '/^### S16 —/,/^### S17 —/' docs/v3/BACKLOG.md | grep -qE '^\*\*Status:\*\* `done`$' ||
  bad 6 "S16 story heading Status is not \`done\`"

report "verify-S16"
exit $?
