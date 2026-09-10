#!/usr/bin/env bash
# Grader for BACKLOG story S15 — MLB API capability drift scanner.
# Contract: docs/v3/BACKLOG.md#verify-script-contract
# No network. No writes outside /tmp. Does its own checking (never `pnpm verify`).

set -uo pipefail
cd "$(dirname "$0")/.."

# shellcheck source=lib/checks.sh
source "$(dirname "$0")/lib/checks.sh"

check 1 "root package.json has mlb:scan-drift; entrypoint under functions/ or packages/, not scripts/"
check 2 "default invocation is offline (raw fixtures); live path gated on BT_USE_LIVE_MLB"
check 3 "a Vitest file: injected unknown path is reported; clean input reports nothing and exits 0"
check 4 "two of LOOP.md / CLAUDE.md / README.md document the command and the dev update flow"
check 5 "scan runs green on committed fixtures from a named script; CI stays offline; .github/ untouched"
check 6 "CLAUDE.md monorepo table lists packages/mlb-api"
check 7 "packages/mlb-api/src/replay.ts is in the coverage include list and its comment is corrected"
check 8 "backlog Status is done"

# --- Check 1: the root script + entrypoint location --------------------------
if ! grep -qE '"mlb:scan-drift"\s*:' package.json; then
  bad 1 "root package.json has no mlb:scan-drift script"
fi
SCAN_ENTRY=$(grep -rlE 'scanRawDir|scan-drift|scanDrift' functions/src packages/*/src \
  --include='*.ts' 2>/dev/null | grep -v '\.test\.ts' | head -1)
if [ -z "$SCAN_ENTRY" ]; then
  bad 1 "no scanner module under functions/src or packages/*/src"
fi
if grep -rqE 'scanRawDir|scanDrift' scripts/ --include='*.ts' --include='*.js' 2>/dev/null; then
  bad 1 "scanner entrypoint lives under scripts/ — must be under functions/ or packages/"
fi

# --- Checks 2-3: the scanner module + its test -------------------------------
SCAN_SRC=$(grep -rlE 'export (async )?function scanRawDir|export (async )?function scanDrift' \
  functions/src packages/*/src --include='*.ts' 2>/dev/null | grep -v '\.test\.ts' | head -1)
SCAN_TEST=$(grep -rlE 'scanRawDir|scanDrift' functions/src packages/*/src \
  --include='*.test.ts' 2>/dev/null | head -1)
RUNNER=$(grep -rlE 'scan-drift|scanRawDir' functions/src/scripts packages/*/src 2>/dev/null \
  --include='*.ts' | grep -v '\.test\.ts' | grep -vF "$SCAN_SRC" | head -1)

if [ -z "$SCAN_SRC" ]; then
  bad 2 "no exported scanRawDir / scanDrift function"
  bad 3 "no scanner to test"
else
  net=$(grep -nE '\bfetch\(|undici|node-fetch|https?://[a-z]' "$SCAN_SRC" || true)
  [ -n "$net" ] && { bad 2 "$SCAN_SRC reaches the network unconditionally:"; echo "$net" | sed 's/^/        /'; }
  # The live path, if any, must be env-gated.
  if grep -q 'BT_USE_LIVE_MLB' "$SCAN_SRC" "${RUNNER:-/dev/null}" 2>/dev/null; then
    : # gated live path present — fine
  fi
  grep -qE 'uncoveredPaths|leafPaths' "$SCAN_SRC" ||
    bad 2 "$SCAN_SRC does not reuse the S23 leaf-path / coverage helper"
fi
if [ -z "$SCAN_TEST" ]; then
  bad 3 "no *.test.ts exercises the scanner"
else
  n=$(grep -nE '\bfetch\(|https?://[a-z]' "$SCAN_TEST" | grep -vE 'localhost|127\.0\.0\.1' || true)
  [ -n "$n" ] && { bad 3 "$SCAN_TEST reaches the network:"; echo "$n" | sed 's/^/        /'; }
  grep -qiE 'inject|unknown|probe|unused|__bt' "$SCAN_TEST" ||
    bad 3 "$SCAN_TEST does not inject an unknown path"
  pkg="@bt/functions"
  rel="${SCAN_TEST#functions/}"
  case "$SCAN_TEST" in
    packages/mlb-api/*) pkg="@bt/mlb-api"; rel="${SCAN_TEST#packages/mlb-api/}" ;;
  esac
  if ! pnpm --filter "$pkg" exec vitest run "$rel" >/tmp/s15-scan.log 2>&1; then
    bad 3 "$SCAN_TEST does not pass in isolation"
    tail -30 /tmp/s15-scan.log | sed 's/^/        /'
  fi
fi

# --- Check 4: docs -----------------------------------------------------------
doc_hits=0
for f in docs/v3/LOOP.md CLAUDE.md README.md; do
  if grep -qE 'mlb:scan-drift|scan-drift' "$f" 2>/dev/null &&
     grep -qiE 'fixture|in season|in-season|update flow|after recording|drift' "$f" 2>/dev/null; then
    doc_hits=$((doc_hits + 1))
  fi
done
[ "$doc_hits" -ge 2 ] ||
  bad 4 "only $doc_hits of LOOP.md / CLAUDE.md / README.md document the scanner + dev flow (need 2)"

# --- Check 5: green on committed fixtures; CI offline; .github read-only -----
SCAN_SCRIPT=$(grep -oE '"[a-z:_-]*scan[a-z:_-]*"\s*:\s*"[^"]+"' package.json | head -1)
if [ -z "$SCAN_SCRIPT" ]; then
  bad 5 "no named scan script in root package.json"
else
  if ! pnpm run mlb:scan-drift >/tmp/s15-run.log 2>&1; then
    bad 5 "pnpm run mlb:scan-drift is not green on the committed fixtures"
    tail -30 /tmp/s15-run.log | sed 's/^/        /'
  fi
fi
grep -q 'BT_USE_LIVE_MLB' .github/workflows/ci.yml 2>/dev/null &&
  bad 5 ".github/workflows/ci.yml sets BT_USE_LIVE_MLB (CI must stay offline)"
if git rev-parse --verify -q origin/main >/dev/null; then
  ghdiff=$(git diff --name-only "$(git merge-base origin/main HEAD)" HEAD -- .github/; git status --porcelain -- .github/)
  [ -n "$ghdiff" ] && { bad 5 ".github/ is read-only for this story but changed:"; echo "$ghdiff" | sed 's/^/        /'; }
fi

# --- Check 6: CLAUDE.md monorepo table --------------------------------------
grep -qE '^\|\s*`packages/mlb-api`' CLAUDE.md ||
  bad 6 "CLAUDE.md monorepo table has no packages/mlb-api row"

# --- Check 7: replay.ts under coverage -------------------------------------
CFG="packages/mlb-api/vitest.config.ts"
grep -qE '"src/replay\.ts"' "$CFG" ||
  bad 7 "$CFG coverage.include does not list src/replay.ts"
grep -qE 'Only .parse\.ts. and .coverage\.ts. carry runtime code' "$CFG" &&
  bad 7 "$CFG still carries the stale 'only parse.ts and coverage.ts' comment"
if ! pnpm --filter @bt/mlb-api exec vitest run --coverage >/tmp/s15-cov.log 2>&1; then
  bad 7 "packages/mlb-api coverage run is not green with replay.ts included"
  tail -20 /tmp/s15-cov.log | sed 's/^/        /'
fi

# --- Check 8: backlog Status is done --------------------------------------
grep -qE '^\| 11 \| \[S15\].*\| `done` \|$' docs/v3/BACKLOG.md ||
  bad 8 "S15 row in the Story status table is not \`done\`"
awk '/^### S15 —/{f=1;next} /^### S[0-9]/{f=0} f' docs/v3/BACKLOG.md \
  | grep -qE '^\*\*Status:\*\* `done`$' ||
  bad 8 "S15 story heading Status is not \`done\`"

report "verify-S15"
exit $?
