#!/usr/bin/env bash
# Grader for BACKLOG story S22 — post-game diffPatch capture + replay store.
# Contract: docs/v3/BACKLOG.md#verify-script-contract
# No network. No writes outside /tmp. Does its own checking (never `pnpm verify`).

set -uo pipefail
cd "$(dirname "$0")/.."

# shellcheck source=lib/checks.sh
source "$(dirname "$0")/lib/checks.sh"

check 1 "port declares fetchGameTimestamps + fetchGameDiffPatch; FixtureMlbStatsClient implements both"
check 2 "named DiffPatch / JsonPatchOp / ReplayPatchEntry types in packages/mlb-api, no any, parser exercised"
check 3 "a pure module reconstructs feed state per timecode from base + ReplayPatchEntry[]"
check 4 "reconstruction test: retained < 553, final GameSnapshot runs match, plays non-decreasing"
check 5 "capture entrypoint under functions/ persists one replay artifact that round-trips"
check 6 "local-server default wiring still FixtureMlbStatsClient; capture is not part of pnpm dev"
check 7 "README documents capture-replay: post-final, never network in verify/CI"
check 8 "web/ is untouched by this story"
check 9 "diffpatch-823823.json is registered in coverage.test.ts with its parser"
check 10 "backlog Status is done"

PORT="packages/ports/src/mlb.ts"
MLBAPI="packages/mlb-api/src"
FIXTURE="functions/src/adapters/fixtures/mlb.ts"
SERVER="functions/src/local-server.ts"
COV_TEST="$MLBAPI/coverage.test.ts"

# --- Check 1: the two port methods + fixture impl ----------------------------
if [ ! -f "$PORT" ]; then
  bad 1 "$PORT missing"
else
  grep -qE '\bfetchGameTimestamps\b' "$PORT" ||
    bad 1 "$PORT does not declare fetchGameTimestamps"
  grep -qE '\bfetchGameDiffPatch\b' "$PORT" ||
    bad 1 "$PORT does not declare fetchGameDiffPatch"
fi
if [ ! -f "$FIXTURE" ]; then
  bad 1 "$FIXTURE missing"
else
  grep -qE '\bfetchGameTimestamps\b' "$FIXTURE" ||
    bad 1 "$FIXTURE does not implement fetchGameTimestamps"
  grep -qE '\bfetchGameDiffPatch\b' "$FIXTURE" ||
    bad 1 "$FIXTURE does not implement fetchGameDiffPatch"
  grep -qE 'diffpatch-|timestamps-' "$FIXTURE" ||
    bad 1 "$FIXTURE does not read the committed fixtures/raw payloads"
fi

# --- Check 2: named types + no any + a parser exercised by a test ------------
REPLAY_SRC=$(grep -rlE 'export (interface|type) ReplayPatchEntry\b' "$MLBAPI" \
  --include='*.ts' 2>/dev/null | grep -v '\.test\.ts' | head -1)
if [ -z "$REPLAY_SRC" ]; then
  bad 2 "no exported ReplayPatchEntry type under $MLBAPI"
else
  for t in JsonPatchOp ReplayPatchEntry; do
    grep -rqE "export (interface|type) $t\b" "$MLBAPI" ||
      bad 2 "no exported named type '$t' under $MLBAPI"
  done
  grep -rqE "export (interface|type) \w*DiffPatch\w*\b" "$MLBAPI" ||
    bad 2 "no exported type whose name contains 'DiffPatch' under $MLBAPI"
  for f in startTimecode endTimecode rebased; do
    grep -q "$f" "$REPLAY_SRC" || bad 2 "$REPLAY_SRC does not model '$f'"
  done
  grep -qE '\bfrom\b' "$REPLAY_SRC" || bad 2 "$REPLAY_SRC JsonPatchOp does not model 'from'"
fi
anyhits=$(grep -rnE ':\s*any\b|as any\b|\bany\[\]' "$MLBAPI"/replay*.ts 2>/dev/null || true)
[ -n "$anyhits" ] && { bad 2 "'any' in the replay module(s):"; echo "$anyhits" | sed 's/^/        /'; }

PARSE_TEST=$(grep -rlE 'parse\w*(DiffPatch|Replay|Patch)\w*\(' "$MLBAPI" \
  --include='*.test.ts' 2>/dev/null | head -1)
if [ -z "$PARSE_TEST" ]; then
  bad 2 "no *.test.ts under $MLBAPI exercises a diffPatch/replay parse helper"
elif ! pnpm --filter @bt/mlb-api exec vitest run "${PARSE_TEST#packages/mlb-api/}" \
      >/tmp/s22-parse.log 2>&1; then
  bad 2 "$PARSE_TEST does not pass in isolation"
  tail -25 /tmp/s22-parse.log | sed 's/^/        /'
fi

# --- Check 3: a pure reconstruction module ----------------------------------
RECON_SRC=$(grep -rlE 'export function \w*econstruct\w*|export function \w*[Rr]eplay\w*\(' "$MLBAPI" \
  --include='*.ts' 2>/dev/null | grep -v '\.test\.ts' | head -1)
if [ -z "$RECON_SRC" ]; then
  bad 3 "no exported reconstruction builder under $MLBAPI"
else
  impure=$(grep -nE '\bfetch\(|node-fetch|undici|from "node:fs"|require\("node:fs"\)|https?://[a-z]' "$RECON_SRC" || true)
  [ -n "$impure" ] && { bad 3 "$RECON_SRC is not pure:"; echo "$impure" | sed 's/^/        /'; }
  for kind in '"add"' '"remove"' '"replace"' '"copy"' '"move"'; do
    grep -q "$kind" "$RECON_SRC" || bad 3 "$RECON_SRC does not handle $kind"
  done
  grep -qE 'timecode' "$RECON_SRC" || bad 3 "$RECON_SRC does not expose retained timecodes"
fi

# --- Checks 4-5: the story-scoped tests under functions/ --------------------
# Discovery must be a call site (`reconstructReplay(`), not a bare substring —
# `live-823823-base` also turns up in unrelated fixtures (S15's scan-drift.test.ts
# routes that filename to its parser) and matched first, which broke this check
# without any product regression. Found + fixed 2026-09-11.
RECON_TEST=$(grep -rlE 'reconstructReplay\(' functions/src \
  --include='*.test.ts' 2>/dev/null | head -1)
CAPTURE_TEST=$(grep -rlE 'captureReplay|capture-replay|CaptureReplay' functions/src \
  --include='*.test.ts' 2>/dev/null | head -1)
if [ -z "$RECON_TEST" ]; then
  bad 4 "no reconstruction test under functions/src"
else
  net=$(grep -nE '\bfetch\(|undici|node-fetch|https?://' "$RECON_TEST" | grep -vE 'localhost|127\.0\.0\.1' || true)
  [ -n "$net" ] && { bad 4 "$RECON_TEST reaches the network:"; echo "$net" | sed 's/^/        /'; }
  grep -qE 'mapLiveFeed' "$RECON_TEST" || bad 4 "$RECON_TEST does not run the final state through mapLiveFeed"
  grep -qE 'non-decreasing|nonDecreasing|toBeGreaterThanOrEqual' "$RECON_TEST" ||
    bad 4 "$RECON_TEST does not assert allPlays is non-decreasing"
  if ! pnpm --filter @bt/functions exec vitest run "${RECON_TEST#functions/}" \
        >/tmp/s22-recon.log 2>&1; then
    bad 4 "$RECON_TEST does not pass in isolation"
    tail -25 /tmp/s22-recon.log | sed 's/^/        /'
  fi
fi
if [ -z "$CAPTURE_TEST" ]; then
  bad 5 "no capture test under functions/src"
else
  grep -qE 'FixtureMlbStatsClient' "$CAPTURE_TEST" ||
    bad 5 "$CAPTURE_TEST does not run capture against FixtureMlbStatsClient"
  grep -qE 'InMemory|memory' "$CAPTURE_TEST" ||
    bad 5 "$CAPTURE_TEST does not use a memory repository"
  if ! pnpm --filter @bt/functions exec vitest run "${CAPTURE_TEST#functions/}" \
        >/tmp/s22-capture.log 2>&1; then
    bad 5 "$CAPTURE_TEST does not pass in isolation"
    tail -25 /tmp/s22-capture.log | sed 's/^/        /'
  fi
fi
grep -qE '"capture-replay"\s*:' functions/package.json ||
  bad 5 "functions/package.json has no capture-replay script"
if grep -rqE 'captureReplay|capture-replay' scripts/ --include='*.ts' --include='*.js' 2>/dev/null; then
  bad 5 "the capture entrypoint lives under scripts/ — it must be under functions/"
fi

# --- Check 6: local-server default wiring unchanged ------------------------
if [ ! -f "$SERVER" ]; then
  bad 6 "$SERVER missing"
else
  grep -qE 'BT_USE_LIVE_MLB|createMlbClient' "$SERVER" ||
    bad 6 "$SERVER no longer selects the fixture client by default"
  grep -qE 'FixtureMlbStatsClient' "$SERVER" ||
    bad 6 "$SERVER no longer references FixtureMlbStatsClient"
  grep -qi 'captureReplay\|capture-replay' "$SERVER" &&
    bad 6 "$SERVER wires capture-replay into the dev server"
fi

# --- Check 7: README ------------------------------------------------------
if [ ! -f README.md ]; then
  bad 7 "README.md missing"
else
  grep -qE 'capture-replay' README.md || bad 7 "README.md does not mention capture-replay"
  grep -qiE 'final|post-game|post game' README.md ||
    bad 7 "README.md does not say capture runs after a game is final"
  grep -qiE 'never.*network|no network|offline' README.md ||
    bad 7 "README.md does not state verify/CI never runs it with network"
fi

# --- Check 8: web/ untouched --------------------------------------------
if git rev-parse --verify -q origin/main >/dev/null; then
  base=$(git merge-base origin/main HEAD)
  webdiff=$(git diff --name-only "$base" HEAD -- web/; git status --porcelain -- web/)
  [ -n "$webdiff" ] && { bad 8 "web/ changed on this branch:"; echo "$webdiff" | sed 's/^/        /'; }
else
  echo "check 8: origin/main unavailable — skipping web/ diff guard" >&2
fi

# --- Check 9: coverage.test.ts registration --------------------------------
if [ ! -f "$COV_TEST" ]; then
  bad 9 "$COV_TEST missing"
else
  grep -q 'diffpatch-823823.json' "$COV_TEST" ||
    bad 9 "$COV_TEST does not register diffpatch-823823.json"
  grep -qE 'parse\w*(DiffPatch|Replay|Patch)\w*' "$COV_TEST" ||
    bad 9 "$COV_TEST registers the fixture without a replay parser"
  if ! pnpm --filter @bt/mlb-api exec vitest run src/coverage.test.ts \
        >/tmp/s22-cov.log 2>&1; then
    bad 9 "$COV_TEST does not pass (diffpatch field coverage incomplete)"
    tail -25 /tmp/s22-cov.log | sed 's/^/        /'
  fi
fi

# --- Check 10: backlog Status is done ------------------------------------
grep -qE '^\| 10 \| \[S22\].*\| `done` \|$' docs/v3/BACKLOG.md ||
  bad 10 "S22 row in the Story status table is not \`done\`"
awk '/^### S22 —/{f=1;next} /^### S[0-9]/{f=0} f' docs/v3/BACKLOG.md \
  | grep -qE '^\*\*Status:\*\* `done`$' ||
  bad 10 "S22 story heading Status is not \`done\`"

report "verify-S22"
exit $?
