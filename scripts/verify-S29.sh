#!/usr/bin/env bash
# Grader for BACKLOG story S29 — generated response types + spec-fidelity gate (ADR-016).
# Contract: docs/v3/BACKLOG.md#verify-script-contract
# No network. No writes outside a temp dir. Does its own checking (never `pnpm verify`).

set -uo pipefail
cd "$(dirname "$0")/.."

# shellcheck source=lib/checks.sh
source "$(dirname "$0")/lib/checks.sh"

# The commit S29 started from (the coverage ratchet is measured against it).
START="16bedbe"

check 1 "web depends on openapi-typescript, a package.json script regenerates offline, no openapi-fetch in any manifest"
check 2 "generated output is under web/src/api/generated/, not git-ignored, every file has an @generated banner in its first 5 lines"
check 3 "drift gate: regenerating produces no diff, and a web Vitest test runs the same regenerate-then-compare"
check 4 "a type-level test asserts generated <-> <DomainType>Response mutual assignability for every spec route; web tsc exits 0"
check 41 "the fidelity test @ts-expect-errors a deliberately wrong pairing"
check 5 "web/src/api/{game,schedule}.ts import payload types from generated/, not through ApiResponseFor"
check 51 "src/api/generated/** excluded from web coverage; no threshold lowered since $START"
check 6 "no any / as unknown as in web/src/api outside generated/"
check 7 "no zod / valibot import under web/src/api/"
check 8 "the whole web suite passes"
check 9 "backlog Status is done"

B=docs/v3/BACKLOG.md
API=web/src/api
GEN=$API/generated
PKG=web/package.json
CFG=web/vitest.config.ts
SPEC=openapi/bt-api.v1.json
TMP="$(mktemp -d -t verify-S29)"
trap 'rm -rf "$TMP"' EXIT

# Any accidental network use by the generator goes nowhere.
export HTTP_PROXY=http://127.0.0.1:9 HTTPS_PROXY=http://127.0.0.1:9 http_proxy=http://127.0.0.1:9 https_proxy=http://127.0.0.1:9

# --- Check 1: dependency, offline generator script, no openapi-fetch -----------------
version=$(node -e 'const p=require("./web/package.json");console.log(p.dependencies?.["openapi-typescript"] ?? p.devDependencies?.["openapi-typescript"] ?? "")')
[ -n "$version" ] || bad 1 "$PKG does not depend on openapi-typescript"
GENSCRIPT=$(node -e 'const s=require("./web/package.json").scripts??{};const k=Object.keys(s).find(k=>/codegen|openapi-typescript/.test(s[k]));console.log(k??"")')
[ -n "$GENSCRIPT" ] || bad 1 "no $PKG script runs the type generator"
if git ls-files '*package.json' | xargs grep -l '"openapi-fetch"' >"$TMP/fetch.txt" 2>/dev/null; then
  bad 1 "openapi-fetch appears in a manifest: $(head -1 "$TMP/fetch.txt")"
fi
grep -q 'openapi-fetch' pnpm-lock.yaml && bad 1 "openapi-fetch appears in pnpm-lock.yaml"

# --- Check 2: committed, bannered output ----------------------------------------------
if ! ls "$GEN"/* >/dev/null 2>&1; then
  bad 2 "$GEN is missing or empty"
else
  for f in "$GEN"/*; do
    head -5 "$f" | grep -q '@generated' || bad 2 "$f has no @generated banner in its first 5 lines"
    git check-ignore -q "$f" && bad 2 "$f is git-ignored (must be committed)"
  done
fi

# --- Check 3: drift gate ----------------------------------------------------------------
if [ -n "$GENSCRIPT" ] && [ -d "$GEN" ]; then
  if pnpm --filter @bt/web run --silent "$GENSCRIPT" "$TMP/gen" >"$TMP/gen.log" 2>&1; then
    if ! ls "$TMP/gen"/* >/dev/null 2>&1; then
      bad 3 "'$GENSCRIPT <outDir>' wrote nothing to the given directory"
    else
      diff -r "$TMP/gen" "$GEN" >"$TMP/drift.txt" 2>&1 || bad 3 "committed $GEN is stale vs the spec: $(head -3 "$TMP/drift.txt")"
    fi
  else
    bad 3 "generator script '$GENSCRIPT' failed offline: $(tail -5 "$TMP/gen.log")"
  fi
fi
git diff --quiet -- "$GEN" 2>/dev/null || bad 3 "$GEN has unstaged changes"
DRIFTTEST=$(grep -rlE 'generated/' "$API" --include='*.test.ts' 2>/dev/null | xargs grep -lE 'toBe\(|toEqual\(|toStrictEqual\(' 2>/dev/null | xargs grep -lE 'readFile' 2>/dev/null | head -1)
if [ -z "$DRIFTTEST" ]; then
  bad 3 "no web Vitest test under $API regenerates and compares against $GEN"
else
  pnpm --filter @bt/web exec vitest run "${DRIFTTEST#web/}" >"$TMP/drifttest.log" 2>&1 || bad 3 "$DRIFTTEST failed: $(tail -5 "$TMP/drifttest.log")"
fi

# --- Check 4: fidelity gate -------------------------------------------------------------
FIDELITY=$(grep -rlE '@ts-expect-error' "$API" --include='*.ts' 2>/dev/null | xargs grep -lE 'generated/' 2>/dev/null | xargs grep -lE 'GameSnapshotResponse' 2>/dev/null | xargs grep -lE 'ScheduleDayResponse' 2>/dev/null | head -1)
if [ -z "$FIDELITY" ]; then
  bad 4 "no type-level test under $API pairs generated types with GameSnapshotResponse and ScheduleDayResponse"
else
  node -e 'for (const p of Object.keys(require("./'"$SPEC"'").paths)) console.log(p)' >"$TMP/routes.txt"
  [ -s "$TMP/routes.txt" ] || bad 4 "no routes found in $SPEC"
  while read -r route; do
    grep -qF "\"$route\"" "$FIDELITY" || bad 4 "$FIDELITY does not assert spec route $route"
  done <"$TMP/routes.txt"
  grep -qiE 'mutual|both directions|Equal<|IsEqual|MutuallyAssignable' "$FIDELITY" || bad 4 "$FIDELITY has no two-way assignability assertion"
fi
pnpm --filter @bt/web exec tsc -p tsconfig.json --noEmit >"$TMP/tsc.log" 2>&1 || bad 4 "web typecheck failed: $(tail -5 "$TMP/tsc.log")"

# --- Check 4a: teeth ------------------------------------------------------------------------
if [ -n "${FIDELITY:-}" ]; then
  grep -A3 '@ts-expect-error' "$FIDELITY" | grep -qE 'ScheduleDayResponse|GameSnapshotResponse' || bad 41 "no @ts-expect-error in $FIDELITY guards a wrong generated/alias pairing"
else
  bad 41 "no fidelity test to inspect"
fi

# --- Check 5: shipped code consumes the generated types ---------------------------------------
for file in "$API/game.ts" "$API/schedule.ts"; do
  if [ ! -f "$file" ]; then
    bad 5 "$file missing"
    continue
  fi
  grep -qE 'from "\./generated/' "$file" || bad 5 "$file does not import from ./generated/"
  grep -q 'ApiResponseFor' "$file" && bad 5 "$file still routes its payload type through ApiResponseFor"
done

# --- Check 5a: coverage exclusion + ratchet ----------------------------------------------------
grep -qE '"src/api/generated/\*\*"' "$CFG" || bad 51 "$CFG coverage does not exclude src/api/generated/**"
threshold() { # threshold <file> <name>
  sed -n 's/^[[:space:]]*'"$2"':[[:space:]]*\([0-9][0-9.]*\).*/\1/p' "$1" | tail -1
}
git show "$START:$CFG" >"$TMP/cfg-start.ts" 2>/dev/null || bad 51 "cannot read $CFG at $START"
for name in lines statements functions branches; do
  before=$(threshold "$TMP/cfg-start.ts" "$name")
  after=$(threshold "$CFG" "$name")
  if [ -z "$before" ] || [ -z "$after" ]; then
    bad 51 "could not read the $name threshold"
  elif node -e "process.exit(Number('$after') < Number('$before') ? 0 : 1)"; then
    bad 51 "$name threshold dropped from $before to $after"
  fi
done

# --- Check 6: no escape hatches outside generated/ ----------------------------------------------
grep -rnE ': any\b|as any\b|any\[\]|as unknown as' "$API" --exclude-dir=generated >"$TMP/any.txt" && bad 6 "escape hatch in $API: $(head -1 "$TMP/any.txt")"

# --- Check 7: no runtime validation at the boundary -----------------------------------------------
grep -rnE "from ['\"](zod|valibot)['\"/]|require\(['\"](zod|valibot)" "$API" >"$TMP/validate.txt" && bad 7 "runtime validator imported: $(head -1 "$TMP/validate.txt")"

# --- Check 8: whole web suite ------------------------------------------------------------------------
pnpm --filter @bt/web exec vitest run >"$TMP/web.log" 2>&1 || bad 8 "web suite failed: $(tail -5 "$TMP/web.log")"

# --- Check 9: status ------------------------------------------------------------------------------------
grep -qE '^\| [0-9]+ \| \[S29\].*\| `done` \|$' "$B" || bad 9 "S29 row in the Story status table is not done"
awk '/^### S29 —/{f=1; next} /^### S[0-9]/{f=0} f' "$B" | grep -E '^\*\*Status:\*\* `done`$' >/dev/null || bad 9 "S29 section Status is not done"

report "verify-S29"
exit $?
