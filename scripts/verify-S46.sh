#!/usr/bin/env bash
# Grader for BACKLOG story S46 — repository ports + shared storage contract + versioned snapshots.
# Contract: docs/v3/BACKLOG.md#verify-script-contract
# No network. No writes outside /tmp. Does its own checking (never `pnpm verify`).

set -uo pipefail
cd "$(dirname "$0")/.."

# shellcheck source=lib/checks.sh
source "$(dirname "$0")/lib/checks.sh"

check 1 "GameProjectionRepository and ReplayArtifactRepository live in packages/ports; services import them from @bt/ports"
check 2 "a shared describeRepositoryContract suite covers cases (a)–(f)"
check 3 "the contract runs against every in-memory repository, 0 skipped, and its file exits 0 alone"
check 4 "GameSnapshot/ScheduleDay carry version + lastChangedAt; spec and web types regenerated; pnpm api:breaking exits 0"
check 5 "ingest bumps version/lastChangedAt only when contentHash changes (tested: same fixture twice, then a change)"
check 6 "backlog Status is done (story heading and Story status table)"

PORTS="packages/ports/src"
SERVICES="functions/src/services"
CONTRACT="functions/src/adapters/repository-contract.ts"
CONTRACT_TEST="functions/src/adapters/memory/repos.contract.test.ts"
MEMORY="functions/src/adapters/memory/repos.ts"
TYPES="packages/domain/src/types.ts"
SPEC="openapi/bt-api.v1.json"
GEN="web/src/api/generated/bt-api.v1.ts"
INGEST_TEST="functions/src/services/ingest.test.ts"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

# --- Check 1: ports ---------------------------------------------------------------------
for name in GameProjectionRepository ReplayArtifactRepository; do
  grep -rqE "export interface $name\b" "$PORTS" || bad 1 "$PORTS does not export interface $name"
  hits="$(grep -rnE "(interface|type) $name\b" functions/src --include=*.ts || true)"
  [ -n "$hits" ] && { bad 1 "$name is still declared under functions/src:"; echo "$hits" | sed 's/^/        /'; }
  for f in $(grep -rlE "\b$name\b" "$SERVICES" --include=*.ts --exclude=*.test.ts); do
    grep -qE "import type \{[^}]*\b$name\b[^}]*\} from \"@bt/ports\"" <(tr -s ' \t\n' ' ' <"$f") ||
      bad 1 "$f uses $name but does not import it from @bt/ports"
  done
done
hits="$(grep -rnE 'projection-store|replay-store' functions/src --include=*.ts || true)"
[ -n "$hits" ] && { bad 1 "imports of the old service-local store modules remain:"; echo "$hits" | sed 's/^/        /'; }

# --- Check 2: the contract suite --------------------------------------------------------
if [ ! -f "$CONTRACT" ]; then
  bad 2 "$CONTRACT missing"
else
  grep -qE 'export function describeRepositoryContract' "$CONTRACT" || bad 2 "$CONTRACT does not export describeRepositoryContract"
  for c in a b c d e f; do
    grep -qE "it\(\"\($c\) " "$CONTRACT" || bad 2 "$CONTRACT has no it(\"($c) …\") case"
  done
fi

# --- Check 3: every in-memory repository, 0 skipped -------------------------------------
if [ ! -f "$CONTRACT_TEST" ]; then
  bad 3 "$CONTRACT_TEST missing"
else
  for cls in $(grep -oE 'export class InMemory[A-Za-z]+Repository' "$MEMORY" | awk '{print $3}'); do
    grep -q "$cls" "$CONTRACT_TEST" || bad 3 "$CONTRACT_TEST does not run the contract against $cls"
  done
  grep -nE '\.(skip|todo)\(|skipIf' "$CONTRACT" "$CONTRACT_TEST" >/dev/null && bad 3 "the contract or its test declares a skip/todo"
  if (cd functions && pnpm exec vitest run src/adapters/memory/repos.contract.test.ts --reporter=json --outputFile="$TMP/c.json" >"$TMP/c.log" 2>&1); then
    node -e '
      const r = require(process.argv[1]);
      if (r.numPendingTests + r.numTodoTests > 0) { console.log(`skipped ${r.numPendingTests + r.numTodoTests}`); process.exit(1); }
      if (r.numPassedTests < 6) { console.log(`only ${r.numPassedTests} passed`); process.exit(1); }
      console.log(`passed ${r.numPassedTests}, skipped 0`);
    ' "$TMP/c.json" >"$TMP/tally" || bad 3 "contract run: $(cat "$TMP/tally")"
  else
    bad 3 "vitest run src/adapters/memory/repos.contract.test.ts failed:"
    tail -20 "$TMP/c.log" | sed 's/^/        /'
  fi
fi

# --- Check 4: versioned wire types ------------------------------------------------------
for t in GameSnapshot ScheduleDay; do
  block="$(awk "/^export type $t = \\{/{f=1} f{print} f && /^\\};/{exit}" "$TYPES")"
  grep -qE '^\s*version: number;' <<<"$block" || bad 4 "$t has no version: number"
  grep -qE '^\s*lastChangedAt: string;' <<<"$block" || bad 4 "$t has no lastChangedAt: string"
done
node -e '
  const s = require(process.argv[1]).components.schemas;
  for (const n of ["GameSnapshotResponse", "ScheduleDayResponse"]) {
    let x = s[n]; if (x.$ref) x = s[x.$ref.split("/").pop()];
    for (const f of ["version", "lastChangedAt"]) if (!(x.required || []).includes(f)) { console.log(`${n} lacks required ${f}`); process.exit(1); }
  }' "$PWD/$SPEC" >"$TMP/spec" 2>&1 || bad 4 "$SPEC: $(cat "$TMP/spec")"
[ "$(grep -cE '^\s*lastChangedAt: string;' "$GEN")" -ge 2 ] || bad 4 "$GEN was not regenerated with lastChangedAt"
if ! (cd functions && pnpm exec vitest run src/services/openapi.test.ts >"$TMP/o.log" 2>&1); then
  bad 4 "functions src/services/openapi.test.ts (spec drift) failed"; tail -10 "$TMP/o.log" | sed 's/^/        /'
fi
if ! pnpm --filter @bt/web exec vitest run src/api/codegen.test.ts >"$TMP/g.log" 2>&1; then
  bad 4 "web src/api/codegen.test.ts (generated types drift) failed"; tail -10 "$TMP/g.log" | sed 's/^/        /'
fi
if ! pnpm -s api:breaking >"$TMP/b.log" 2>&1; then
  bad 4 "pnpm api:breaking failed:"; tail -10 "$TMP/b.log" | sed 's/^/        /'
fi

# --- Check 5: version bumps only on a content change ------------------------------------
grep -qE 'contentHash' functions/src/services/ingest.ts packages/domain/src/versioning.ts 2>/dev/null ||
  bad 5 "neither ingest.ts nor domain versioning.ts uses contentHash"
grep -qE 'version' "$INGEST_TEST" || bad 5 "$INGEST_TEST has no version test"
if ! (cd functions && pnpm exec vitest run src/services/ingest.test.ts -t "version" --reporter=json --outputFile="$TMP/i.json" >"$TMP/i.log" 2>&1); then
  bad 5 "ingest version tests failed:"; tail -15 "$TMP/i.log" | sed 's/^/        /'
else
  node -e 'const r = require(process.argv[1]); process.exit(r.numPassedTests >= 1 ? 0 : 1)' "$TMP/i.json" ||
    bad 5 "no ingest test named for version ran"
fi

# --- Check 6: backlog Status is done ----------------------------------------------------
grep -qE '^\| [0-9]+ \| \[S46\].*\| `done` \|$' docs/v3/BACKLOG.md ||
  bad 6 "S46 row in the Story status table is not \`done\`"
awk '/^### S46 —/{f=1;next} /^### S[0-9]/{f=0} f' docs/v3/BACKLOG.md \
  | grep -qE '^\*\*Status:\*\* `done`$' ||
  bad 6 "S46 story heading Status is not \`done\`"

report "verify-S46"
exit $?
