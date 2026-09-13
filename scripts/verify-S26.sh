#!/usr/bin/env bash
# Grader for BACKLOG story S26 — typed BT API route contract.
# Contract: docs/v3/BACKLOG.md#verify-script-contract
# No network. No writes outside /tmp. Does its own checking (never `pnpm verify`).

set -uo pipefail
cd "$(dirname "$0")/.."

# shellcheck source=lib/checks.sh
source "$(dirname "$0")/lib/checks.sh"

check 1 "one runtime-enumerable ApiRoutes table, keyof-constrained, covers schedule/game/error"
check 2 "each *Response type is a derived alias of its domain type, not hand-copied"
check 3 "every route path begins /api/v1/; no unversioned /api/<name> literal remains"
check 4 "a type-level assertion proves each alias is mutually assignable with its domain type"
check 5 "egress typed: no body: unknown, sends through to*Response mapping functions"
check 6 "server type-level test: @ts-expect-error on a bad send, tsc --noEmit exits 0"
check 7 "ingress typed: fetch helper keyed by the route map, no getJson< call sites"
check 8 "at most one type assertion in the ingress path"
check 9 "client type-level test: @ts-expect-error on a wrong assignment, tsc --noEmit exits 0"
check 10 "no runtime validation added (no zod/valibot at this boundary)"
check 11 "src/handlers/api.test.ts still exits 0"
check 12 "backlog Status is done"

DOMAIN_SRC="packages/domain/src"
API="functions/src/handlers/api.ts"
CLIENT="web/src/api/client.ts"
VITE_CFG="web/vite.config.ts"

ROUTES_SRC=$(grep -rlE 'export const ApiRoutes' "$DOMAIN_SRC" --include='*.ts' 2>/dev/null | head -1)

# --- Check 1: the route table ------------------------------------------------
if [ -z "$ROUTES_SRC" ]; then
  bad 1 "no module under $DOMAIN_SRC exports ApiRoutes"
else
  grep -qE 'as const' "$ROUTES_SRC" || bad 1 "$ROUTES_SRC's ApiRoutes is not an as-const runtime value"
  grep -qE 'satisfies|keyof' "$ROUTES_SRC" || bad 1 "$ROUTES_SRC has no keyof-constrained registry"
  grep -qE '"GET /api/v1/schedule"' "$ROUTES_SRC" || bad 1 "$ROUTES_SRC has no GET /api/v1/schedule entry"
  grep -qE '"GET /api/v1/games/:gamePk"' "$ROUTES_SRC" || bad 1 "$ROUTES_SRC has no GET /api/v1/games/:gamePk entry"
  grep -qE 'ApiErrorResponse' "$ROUTES_SRC" || bad 1 "$ROUTES_SRC has no ApiErrorResponse error-body type"
fi

# --- Check 2: derived aliases, not hand-copied -------------------------------
if [ -n "$ROUTES_SRC" ]; then
  aliasHits=$(grep -cE 'export type [A-Za-z]+Response\s*=\s*[A-Za-z]+;' "$ROUTES_SRC" || true)
  [ "${aliasHits:-0}" -ge 2 ] ||
    bad 2 "$ROUTES_SRC has fewer than 2 exported '*Response = DomainType;' aliases"
  grep -qE 'export type ScheduleDayResponse\s*=\s*ScheduleDay;' "$ROUTES_SRC" ||
    bad 2 "$ROUTES_SRC does not declare ScheduleDayResponse as an alias of ScheduleDay"
  grep -qE 'export type GameSnapshotResponse\s*=\s*GameSnapshot;' "$ROUTES_SRC" ||
    bad 2 "$ROUTES_SRC does not declare GameSnapshotResponse as an alias of GameSnapshot"
fi

# --- Check 3: versioned paths only -------------------------------------------
if [ -n "$ROUTES_SRC" ]; then
  badRoutes=$(grep -oE '"(GET|POST|PUT|DELETE) /api/[^v][^"]*"' "$ROUTES_SRC" || true)
  [ -n "$badRoutes" ] && { bad 3 "$ROUTES_SRC has an unversioned route:"; echo "$badRoutes" | sed 's/^/        /'; }
fi
for f in "$API" "$VITE_CFG"; do
  [ -f "$f" ] || continue
  hits=$(grep -nE '"/api/(schedule|games)[^"]*"|`/api/(schedule|games)[^`]*`' "$f" || true)
  [ -n "$hits" ] && { bad 3 "$f still has an unversioned /api/<name> literal:"; echo "$hits" | sed 's/^/        /'; }
done
if [ -d web/src ]; then
  hits=$(grep -rnE '"/api/(schedule|games)[^"/][^"]*"|`/api/(schedule|games)[^`/][^`]*`' web/src \
    --include='*.ts' --include='*.tsx' 2>/dev/null | grep -v '/api/v1/' || true)
  [ -n "$hits" ] && { bad 3 "web/src has an unversioned /api/<name> literal:"; echo "$hits" | sed 's/^/        /'; }
fi

# --- Check 4: mutual-assignability type-level check --------------------------
if [ -n "$ROUTES_SRC" ]; then
  found=0
  grep -rlqE 'ScheduleDayResponse' "$DOMAIN_SRC" --include='*.test.ts' 2>/dev/null && found=1
  [ "$found" -eq 1 ] || bad 4 "no *.test.ts under $DOMAIN_SRC exercises the response-alias mutual-assignability check"
fi

# --- Check 5: egress ----------------------------------------------------------
if [ ! -f "$API" ]; then
  bad 5 "$API missing"
else
  # Only the exported, route-typed sender matters here — a private low-level
  # writer taking `unknown` underneath it is fine (ADR-014's one unchecked step).
  sig=$(awk '/export function sendJson/,/\): void/' "$API")
  echo "$sig" | grep -q 'unknown' &&
    bad 5 "$API's exported sendJson still types body as unknown"
  grep -qE 'ApiRoutes|ApiRoute\b' "$API" || bad 5 "$API does not reference the ApiRoutes table"
  mapCalls=$(grep -oE '\bto[A-Za-z]+Response\(' "$API" | sort -u | wc -l | tr -d ' ')
  [ "${mapCalls:-0}" -ge 2 ] || bad 5 "$API calls fewer than 2 distinct to*Response(...) mapping functions"
fi

# --- Check 6: server type-level test ------------------------------------------
SERVER_TYPE_TEST=$(grep -rlE '@ts-expect-error' functions/src --include='*.test.ts' 2>/dev/null | head -1)
if [ -z "$SERVER_TYPE_TEST" ]; then
  bad 6 "no @ts-expect-error type-level test under functions/src"
else
  if ! pnpm --filter @bt/functions exec tsc -p tsconfig.json --noEmit >/tmp/s26-server-tsc.log 2>&1; then
    bad 6 "functions typecheck fails (tsc -p tsconfig.json --noEmit)"
    tail -30 /tmp/s26-server-tsc.log | sed 's/^/        /'
  fi
fi

# --- Check 7: ingress ----------------------------------------------------------
if [ ! -f "$CLIENT" ]; then
  bad 7 "$CLIENT missing"
else
  grep -qE 'ApiRoute\b|ApiResponseFor' "$CLIENT" || bad 7 "$CLIENT does not reference the route-keyed contract"
  # Exclude the helper's own generic declaration — this checks call sites, not the definition.
  hits=$(grep -rnE 'getJson<' web/src --include='*.ts' --include='*.tsx' 2>/dev/null \
    | grep -v 'function getJson<' || true)
  [ -n "$hits" ] && { bad 7 "explicit type argument passed to getJson<...>:"; echo "$hits" | sed 's/^/        /'; }
fi

# --- Check 8: at most one assertion in the ingress path -----------------------
if [ -f "$CLIENT" ]; then
  count=$(grep -oE '\bas unknown as\b|\bas [A-Za-z]' "$CLIENT" | wc -l | tr -d ' ')
  [ "${count:-0}" -le 1 ] || bad 8 "$CLIENT has $count 'as' assertions; at most 1 allowed"
fi
otherHits=$(grep -rlE '\bas unknown as\b|\bas [A-Za-z]' web/src/api 2>/dev/null | grep -v "^${CLIENT}$" || true)
[ -n "$otherHits" ] && { bad 8 "other files under web/src/api contain a type assertion:"; echo "$otherHits" | sed 's/^/        /'; }

# --- Check 9: client type-level test -------------------------------------------
CLIENT_TYPE_TEST=$(grep -rlE '@ts-expect-error' web/src/api --include='*.test.ts' 2>/dev/null | head -1)
if [ -z "$CLIENT_TYPE_TEST" ]; then
  bad 9 "no @ts-expect-error type-level test under web/src/api"
else
  if ! pnpm --filter @bt/web exec tsc -p tsconfig.json --noEmit >/tmp/s26-client-tsc.log 2>&1; then
    bad 9 "web typecheck fails (tsc -p tsconfig.json --noEmit)"
    tail -30 /tmp/s26-client-tsc.log | sed 's/^/        /'
  fi
fi

# --- Check 10: no runtime validation --------------------------------------------
hits=$(grep -lE '\bzod\b|\bvalibot\b' "$API" "$CLIENT" 2>/dev/null || true)
[ -n "$hits" ] && { bad 10 "zod/valibot imported at the BT API boundary:"; echo "$hits" | sed 's/^/        /'; }

# --- Check 11: existing API test still passes -----------------------------------
if ! pnpm --filter @bt/functions exec vitest run src/handlers/api.test.ts >/tmp/s26-api.log 2>&1; then
  bad 11 "src/handlers/api.test.ts does not pass"
  tail -30 /tmp/s26-api.log | sed 's/^/        /'
fi

# --- Check 12: backlog Status is done -------------------------------------------
grep -qE '^\| 15 \| \[S26\].*\| `done` \|$' docs/v3/BACKLOG.md ||
  bad 12 "S26 row in the Story status table is not \`done\`"
awk '/^### S26 —/{f=1;next} /^### S[0-9]/{f=0} f' docs/v3/BACKLOG.md \
  | grep -qE '^\*\*Status:\*\* `done`$' ||
  bad 12 "S26 story heading Status is not \`done\`"

report "verify-S26"
exit $?
