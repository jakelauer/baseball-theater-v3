#!/usr/bin/env bash
# Grader for BACKLOG story S25 — typed client query cache (ADR-014 foundation).
# Contract: docs/v3/BACKLOG.md#verify-script-contract
# No network. No writes outside a temp dir. Does its own checking (never `pnpm verify`).

set -uo pipefail
cd "$(dirname "$0")/.."

# shellcheck source=lib/checks.sh
source "$(dirname "$0")/lib/checks.sh"

# The commit S25 started from (the coverage ratchet is measured against it).
START="dafeae8"

check 1 "@tanstack/react-query v5+ in web/package.json and a QueryClientProvider mounted"
check 2 "web/src/api/{game,schedule}.ts each export a queryOptions( descriptor and their hook"
check 3 "payload types derive from ApiResponseFor; no client-side re-declaration of server shapes"
check 4 "a colocated type-level test @ts-expect-errors a wrong-typed setQueryData; web tsc exits 0"
check 5 "no any / as unknown as in web/src/api/*.ts"
check 6 "no fetch(, setQueryData(, or raw key arrays under pages/ or components/"
check 7 "GamePage and ScoreboardPage drop the cancelled flag and call their hooks"
check 8 "one exported freshness policy reads windowMode; both descriptors call it; no stray interval literals"
check 9 "an offline test proves one cache write updates two readers without remounting"
check 10 "the whole web suite passes"
check 101 "web coverage floor: lines/statements strictly up, functions/branches not lowered"
check 11 "backlog Status is done"

B=docs/v3/BACKLOG.md
API=web/src/api
PKG=web/package.json
CFG=web/vitest.config.ts
TMP="$(mktemp -d -t verify-S25)"
trap 'rm -rf "$TMP"' EXIT

# --- Check 1: dependency + provider ------------------------------------------------
version=$(node -e 'const p=require("./web/package.json");console.log(p.dependencies?.["@tanstack/react-query"] ?? p.devDependencies?.["@tanstack/react-query"] ?? "")')
if [ -z "$version" ]; then
  bad 1 "web/package.json does not depend on @tanstack/react-query"
else
  major=$(echo "$version" | grep -oE '[0-9]+' | head -1)
  [ -n "$major" ] && [ "$major" -ge 5 ] || bad 1 "@tanstack/react-query is '$version', want major 5 or later"
fi
grep -rqE '<QueryClientProvider' web/src --include='*.tsx' --include='*.ts' || bad 1 "no module under web/src mounts QueryClientProvider"

# --- Check 2: one file per resource ------------------------------------------------
for pair in "game.ts:useGame" "schedule.ts:useScheduleDay"; do
  file="$API/${pair%%:*}"
  hook="${pair##*:}"
  if [ ! -f "$file" ]; then
    bad 2 "$file missing"
    continue
  fi
  grep -q 'queryOptions(' "$file" || bad 2 "$file exports no queryOptions( descriptor"
  grep -qE "export function $hook\(|export const $hook =" "$file" || bad 2 "$file does not export $hook"
done

# --- Check 3: derived payload types ------------------------------------------------
for file in "$API/game.ts" "$API/schedule.ts"; do
  [ -f "$file" ] || continue
  grep -q 'ApiResponseFor' "$file" ||
    grep -qE 'from "\./client\.js"|from "\.\./api/client\.js"' "$file" ||
    bad 3 "$file does not derive its payload type through ApiResponseFor"
done
if grep -rn --include='*.ts' --include='*.tsx' -E '^\s*(export )?(interface|type) ' web/src -A 12 2>/dev/null |
  grep -E '(windowMode|fetchedAt)\s*[?:]' >"$TMP/redeclared.txt"; then
  bad 3 "a web type re-declares a server shape: $(head -1 "$TMP/redeclared.txt")"
fi

# --- Check 4: type-level cache-write test ------------------------------------------
TYPETEST=$(grep -rlE '@ts-expect-error' "$API" --include='*.ts' --include='*.tsx' 2>/dev/null | xargs grep -lE 'setQueryData' 2>/dev/null | head -1)
if [ -z "$TYPETEST" ]; then
  bad 4 "no colocated test under $API @ts-expect-errors a setQueryData call"
fi
pnpm --filter @bt/web exec tsc -p tsconfig.json --noEmit >"$TMP/tsc.log" 2>&1 || bad 4 "web typecheck failed: $(tail -5 "$TMP/tsc.log")"

# --- Check 5: no escape hatches ------------------------------------------------------
if ls "$API"/*.ts >/dev/null 2>&1; then
  grep -nE ': any\b|as any\b|any\[\]|as unknown as' "$API"/*.ts >"$TMP/any.txt" && bad 5 "escape hatch in $API: $(head -1 "$TMP/any.txt")"
else
  bad 5 "no files under $API"
fi

# --- Check 6: cache writes stay in the API layer --------------------------------------
LEAK="fetch\(|setQueryData\(|\[\"(game|schedule)\"|\['(game|schedule)'"
if grep -rnE "$LEAK" web/src/pages web/src/components 2>/dev/null >"$TMP/leak.txt"; then
  bad 6 "pages/components reach past the API layer: $(head -1 "$TMP/leak.txt")"
fi

# --- Check 7: pages migrated ------------------------------------------------------------
for pair in "web/src/pages/GamePage.tsx:useGame(" "web/src/pages/ScoreboardPage.tsx:useScheduleDay("; do
  file="${pair%%:*}"
  hook="${pair##*:}"
  grep -q 'cancelled' "$file" && bad 7 "$file still has a cancelled flag"
  grep -qF "$hook" "$file" || bad 7 "$file does not call $hook"
done

# --- Check 8: server-declared freshness ---------------------------------------------------
POLICY=$(grep -rlE 'export (function|const) freshnessPolicy' "$API" --include='*.ts' 2>/dev/null | head -1)
if [ -z "$POLICY" ]; then
  bad 8 "no exported freshnessPolicy under $API"
else
  grep -q 'windowMode' "$POLICY" || bad 8 "$POLICY does not read windowMode"
  for file in "$API/game.ts" "$API/schedule.ts"; do
    [ -f "$file" ] || continue
    grep -q 'freshnessPolicy' "$file" || bad 8 "$file does not call freshnessPolicy"
  done
  if grep -rnE '(refetchInterval|staleTime)\s*:\s*[0-9]' web/src --include='*.ts' --include='*.tsx' 2>/dev/null |
    grep -v "^$POLICY:" >"$TMP/literals.txt"; then
    bad 8 "interval literal outside the policy module: $(head -1 "$TMP/literals.txt")"
  fi
fi

# --- Check 9: shared cache, no remount ------------------------------------------------------
SHARED=$(grep -rlE 'setQueryData' web/src --include='*.test.tsx' 2>/dev/null | head -1)
if [ -z "$SHARED" ]; then
  bad 9 "no web test writes to the cache to prove sharing"
else
  pnpm --filter @bt/web exec vitest run "${SHARED#web/}" >"$TMP/shared.log" 2>&1 || bad 9 "$SHARED failed: $(tail -5 "$TMP/shared.log")"
fi

# --- Check 10: whole web suite --------------------------------------------------------------
pnpm --filter @bt/web exec vitest run >"$TMP/web.log" 2>&1 || bad 10 "web suite failed: $(tail -5 "$TMP/web.log")"
grep -q 'src/pages/StandingsPage.test.tsx' "$TMP/web.log" || bad 10 "StandingsPage.test.tsx did not run"
grep -q 'src/api/client.test.ts' "$TMP/web.log" || bad 10 "client.test.ts did not run"

# --- Check 10a: coverage ratchet ---------------------------------------------------------------
threshold() { # threshold <file-contents-source> <name>
  sed -n 's/^[[:space:]]*'"$2"':[[:space:]]*\([0-9][0-9]*\).*/\1/p' "$1" | tail -1
}
git show "$START:$CFG" >"$TMP/cfg-start.ts" 2>/dev/null || bad 101 "cannot read $CFG at $START"
for name in lines statements; do
  before=$(threshold "$TMP/cfg-start.ts" "$name")
  after=$(threshold "$CFG" "$name")
  if [ -z "$before" ] || [ -z "$after" ]; then
    bad 101 "could not read the $name threshold"
  elif [ "$after" -le "$before" ]; then
    bad 101 "$name threshold is $after, was $before at $START — it must go up"
  fi
done
for name in functions branches; do
  before=$(threshold "$TMP/cfg-start.ts" "$name")
  after=$(threshold "$CFG" "$name")
  if [ -z "$before" ] || [ -z "$after" ]; then
    bad 101 "could not read the $name threshold"
  elif [ "$after" -lt "$before" ]; then
    bad 101 "$name threshold dropped from $before to $after"
  fi
done
pnpm --filter @bt/web exec vitest run --coverage >"$TMP/cov.log" 2>&1 || bad 101 "web coverage run failed its thresholds: $(grep -iE 'threshold|ERROR' "$TMP/cov.log" | head -3)"

# --- Check 11: status ------------------------------------------------------------------------------
grep -qE '^\| [0-9]+ \| \[S25\].*\| `done` \|$' "$B" || bad 11 "S25 row in the Story status table is not done"
awk '/^### S25 —/{f=1; next} /^### S[0-9]/{f=0} f' "$B" | grep -E '^\*\*Status:\*\* `done`$' >/dev/null || bad 11 "S25 section Status is not done"

report "verify-S25"
exit $?
