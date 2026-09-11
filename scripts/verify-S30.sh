#!/usr/bin/env bash
# Grader for BACKLOG story S30 — restore the functions branch-coverage floor.
# Contract: docs/v3/BACKLOG.md#verify-script-contract
# No network. No writes outside /tmp. Does its own checking (never `pnpm verify`).

set -uo pipefail
cd "$(dirname "$0")/.."

# shellcheck source=lib/checks.sh
source "$(dirname "$0")/lib/checks.sh"

check 1 "functions/vitest.config.ts declares branches: 60 (lines/functions/statements unchanged)"
check 2 "pnpm --filter @bt/functions exec vitest run --coverage exits 0 against that threshold"
check 3 "no non-test file under functions/src/ differs from the commit that starts this story"
check 4 "mappers/live.ts and mappers/schedule.ts each individually clear 60% branch coverage"
check 5 "backlog Status is done"

CFG="functions/vitest.config.ts"
SUMMARY="functions/coverage/coverage-summary.json"

# --- Check 1: the restored threshold ----------------------------------------
if [ ! -f "$CFG" ]; then
  bad 1 "$CFG missing"
else
  grep -qE '^\s*branches:\s*60,?\s*$' "$CFG" ||
    bad 1 "$CFG does not declare branches: 60"
  grep -qE '^\s*lines:\s*70,?\s*$' "$CFG" || bad 1 "$CFG lines threshold changed from 70"
  grep -qE '^\s*functions:\s*70,?\s*$' "$CFG" || bad 1 "$CFG functions threshold changed from 70"
  grep -qE '^\s*statements:\s*70,?\s*$' "$CFG" || bad 1 "$CFG statements threshold changed from 70"
fi

# --- Check 2: the real coverage run ------------------------------------------
if ! pnpm --filter @bt/functions exec vitest run --coverage >/tmp/s30-cov.log 2>&1; then
  bad 2 "pnpm --filter @bt/functions exec vitest run --coverage does not exit 0"
  tail -30 /tmp/s30-cov.log | sed 's/^/        /'
fi

# --- Check 3: production code under functions/src/ is untouched -------------
if git rev-parse --verify -q HEAD >/dev/null; then
  changed=$(
    { git diff --name-only HEAD -- functions/src/; git diff --name-only --cached HEAD -- functions/src/; } |
      sort -u | grep -vE '\.test\.ts$' || true
  )
  [ -n "$changed" ] && { bad 3 "production files changed under functions/src/:"; echo "$changed" | sed 's/^/        /'; }
else
  echo "check 3: no HEAD to diff against — skipping" >&2
fi

# --- Check 4: the two named files individually clear 60% branches -----------
if [ ! -f "$SUMMARY" ]; then
  bad 4 "$SUMMARY missing (coverage run did not produce a json-summary report)"
else
  for f in "src/mappers/live.ts" "src/mappers/schedule.ts"; do
    pct=$(node -e "
      const s = require('./$SUMMARY');
      const key = Object.keys(s).find((k) => k.endsWith('/$f'));
      if (!key) { console.log('missing'); process.exit(0); }
      console.log(s[key].branches.pct);
    " 2>/dev/null)
    if [ -z "$pct" ] || [ "$pct" = "missing" ]; then
      bad 4 "$f not found in $SUMMARY"
    elif ! awk -v p="$pct" 'BEGIN { exit !(p >= 60) }'; then
      bad 4 "$f branch coverage is ${pct}%, below 60%"
    fi
  done
fi

# --- Check 5: backlog Status is done ----------------------------------------
grep -qE '^\| 13 \| \[S30\].*\| `done` \|$' docs/v3/BACKLOG.md ||
  bad 5 "S30 row in the Story status table is not \`done\`"
awk '/^### S30 —/{f=1;next} /^### S[0-9]/{f=0} f' docs/v3/BACKLOG.md \
  | grep -qE '^\*\*Status:\*\* `done`$' ||
  bad 5 "S30 story heading Status is not \`done\`"

report "verify-S30"
exit $?
