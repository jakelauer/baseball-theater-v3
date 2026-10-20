#!/usr/bin/env bash
# Grader for BACKLOG story S43 — domain rules: apply-if-newer, content hash,
# graduated cache lifetime (ADR-021, ADR-022).
# Contract: docs/v3/BACKLOG.md#verify-script-contract
# No network. No writes outside /tmp. Does its own checking (never `pnpm verify`).

set -uo pipefail
cd "$(dirname "$0")/.."

# shellcheck source=lib/checks.sh
source "$(dirname "$0")/lib/checks.sh"

check 1 "applyIfNewer exported from @bt/domain; its test feeds duplicated + >=3 shuffled orders and expects the highest version"
check 2 "cacheLifetimeMs + ladder constants exported from @bt/domain; its test covers 0, every boundary and far beyond 48h"
check 3 "contentHash exported from @bt/domain; its test covers key-order independence and a changed nested field"
check 4 "each of the three test files exits 0 when run alone via pnpm --filter @bt/domain exec vitest run <file>"
check 5 "packages/domain/vitest.config.ts thresholds are unchanged or higher (lines 85, functions 90, branches 60, statements 85)"
check 6 "backlog Status is done (story heading and Story status table)"

SRC="packages/domain/src"
INDEX="$SRC/index.ts"

# exported <id> <module> <name> — the module defines an exported function or
# const <name>, and index.ts re-exports the module.
exported() {
  local id="$1" mod="$2" name="$3"
  if [ ! -f "$SRC/$mod.ts" ]; then
    bad "$id" "$SRC/$mod.ts missing"
    return
  fi
  grep -qE "^export (function|const) $name\b" "$SRC/$mod.ts" || bad "$id" "$SRC/$mod.ts does not export $name"
  grep -qF "export * from \"./$mod.js\";" "$INDEX" || bad "$id" "$INDEX does not re-export ./$mod.js"
}

# --- Check 1: applyIfNewer ---------------------------------------------------
exported 1 versioning applyIfNewer
T1="$SRC/versioning.test.ts"
if [ ! -f "$T1" ]; then
  bad 1 "$T1 missing"
else
  grep -q "applyIfNewer" "$T1" || bad 1 "$T1 does not exercise applyIfNewer"
  grep -qi "duplicat" "$T1" || bad 1 "$T1 has no duplicated-sequence case"
  orders=$(grep -cE "^\s*\[[0-9, ]+\],?\s*$" "$T1" || true)
  [ "${orders:-0}" -ge 3 ] || bad 1 "$T1 lists fewer than 3 shuffled orders (found ${orders:-0} index-order rows)"
  grep -q "null" "$T1" || bad 1 "$T1 does not cover a null current value"
fi

# --- Check 2: cacheLifetimeMs ladder -----------------------------------------
exported 2 cache-lifetime cacheLifetimeMs
T2="$SRC/cache-lifetime.test.ts"
if [ ! -f "$SRC/cache-lifetime.ts" ]; then
  : # reported by `exported`
else
  for c in CACHE_LIFETIME_FLOOR_MS CACHE_LIFETIME_CAP_MS CACHE_LIFETIME_LADDER; do
    grep -qE "^export const $c\b" "$SRC/cache-lifetime.ts" || bad 2 "cache-lifetime.ts does not export $c"
  done
fi
if [ ! -f "$T2" ]; then
  bad 2 "$T2 missing"
else
  # Each AC boundary (unchanged-for) and lifetime must appear in the test.
  for m in "10 \* MINUTE" "15 \* MINUTE" "30 \* MINUTE" "2 \* HOUR" "10 \* HOUR" "24 \* HOUR" "48 \* HOUR" "5 \* MINUTE"; do
    grep -qE "$m" "$T2" || bad 2 "$T2 never mentions ${m//\\/}"
  done
  grep -qE "cacheLifetimeMs\(0\)" "$T2" || bad 2 "$T2 does not cover 0"
  grep -qE "far beyond|1000 \* HOUR|365 \* 24 \* HOUR" "$T2" || bad 2 "$T2 does not cover a value far beyond 48h"
fi

# --- Check 3: contentHash ----------------------------------------------------
exported 3 content-hash contentHash
T3="$SRC/content-hash.test.ts"
if [ ! -f "$T3" ]; then
  bad 3 "$T3 missing"
else
  grep -q "contentHash" "$T3" || bad 3 "$T3 does not exercise contentHash"
  grep -qi "key order" "$T3" || bad 3 "$T3 has no key-order case"
  grep -qi "nested" "$T3" || bad 3 "$T3 has no nested-field-change case"
fi

# --- Check 4: each test file passes when run alone ---------------------------
for t in versioning cache-lifetime content-hash; do
  f="src/$t.test.ts"
  if [ ! -f "packages/domain/$f" ]; then
    bad 4 "packages/domain/$f missing"
  elif ! pnpm --filter @bt/domain exec vitest run "$f" >"/tmp/s43-$t.log" 2>&1; then
    bad 4 "vitest run $f does not exit 0"
    tail -20 "/tmp/s43-$t.log" | sed 's/^/        /'
  fi
done

# --- Check 5: coverage thresholds not lowered ---------------------------------
CFG="packages/domain/vitest.config.ts"
for pair in lines:85 functions:90 branches:60 statements:85; do
  key="${pair%%:*}" floor="${pair##*:}"
  val=$(grep -E "^\s*$key:\s*[0-9]+" "$CFG" | head -1 | grep -oE "[0-9]+")
  if [ -z "$val" ]; then
    bad 5 "$CFG has no $key threshold"
  elif [ "$val" -lt "$floor" ]; then
    bad 5 "$CFG $key threshold $val is below $floor"
  fi
done

# --- Check 6: backlog Status is done -----------------------------------------
grep -qE '^\| [0-9]+ \| \[S43\].*\| `done` \|$' docs/v3/BACKLOG.md ||
  bad 6 "S43 row in the Story status table is not \`done\`"
awk '/^### S43 —/{f=1;next} /^### S[0-9]/{f=0} f' docs/v3/BACKLOG.md \
  | grep -qE '^\*\*Status:\*\* `done`$' ||
  bad 6 "S43 story heading Status is not \`done\`"

report "verify-S43"
exit $?
