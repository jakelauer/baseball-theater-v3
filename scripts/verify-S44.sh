#!/usr/bin/env bash
# Grader for BACKLOG story S44 — Fetch-API handlers + route-table enforcement.
# Contract: docs/v3/BACKLOG.md#verify-script-contract
# No network (localhost ephemeral servers from story-scoped Vitest files only).
# No writes outside /tmp. Does its own checking (never `pnpm verify`).

set -uo pipefail
cd "$(dirname "$0")/.."

# shellcheck source=lib/checks.sh
source "$(dirname "$0")/lib/checks.sh"

check 1 "handleApiRequest is (request: Request, ctx: ApiContext) => Promise<Response>; no node:http under src/handlers/"
check 2 "local-server.ts adapts Node http to the handler; api.test.ts exits 0 with its status/body assertions unchanged"
check 3 "a route-table test: dispatched JSON routes == ApiRoutes keys, negative case, named streaming exception list"
check 4 "pnpm api:breaking exits 0 (no contract change)"
check 5 "functions/vitest.config.ts coverage thresholds unchanged or higher"
check 6 "backlog Status is done (story heading and Story status table)"

# The commit S44 started from: assertions and thresholds are compared against it.
BASE="a57dada"
API="functions/src/handlers/api.ts"
SERVER="functions/src/local-server.ts"
API_TEST="functions/src/handlers/api.test.ts"
TABLE_TEST="functions/src/handlers/route-table.test.ts"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

# --- Check 1: Fetch-shaped handler, no node:http in handlers ---------------------------
if [ ! -f "$API" ]; then
  bad 1 "$API missing"
else
  flat="$(tr -s ' \t\n' ' ' <"$API")"
  grep -qE 'export async function handleApiRequest ?\( ?request: Request, ctx: ApiContext,? ?\): Promise<Response>' <<<"$flat" ||
    bad 1 "$API does not declare handleApiRequest(request: Request, ctx: ApiContext): Promise<Response>"
fi
hits="$(grep -rn "node:http" functions/src/handlers/ --include=*.ts --exclude=*.test.ts || true)"
[ -n "$hits" ] && { bad 1 "node:http still imported under functions/src/handlers/:"; echo "$hits" | sed 's/^/        /'; }

# --- Check 2: Node adapter in local-server.ts; api.test.ts unchanged and green ---------
if [ ! -f "$SERVER" ]; then
  bad 2 "$SERVER missing"
else
  grep -qE 'from "node:http"' "$SERVER" || bad 2 "$SERVER does not use node:http"
  grep -qE 'handleApiRequest' "$SERVER" || bad 2 "$SERVER does not reference handleApiRequest"
  grep -qE 'handleApiRequest\(req, ?res' "$SERVER" && bad 2 "$SERVER still passes (req, res) straight to handleApiRequest"
fi
git show "$BASE:$API_TEST" | grep -E 'expect\(' | sed 's/^[[:space:]]*//' >"$TMP/before"
grep -E 'expect\(' "$API_TEST" 2>/dev/null | sed 's/^[[:space:]]*//' >"$TMP/after"
if ! diff -q "$TMP/before" "$TMP/after" >/dev/null; then
  bad 2 "$API_TEST status/body assertions changed since $BASE:"
  diff "$TMP/before" "$TMP/after" | sed 's/^/        /'
fi
if ! (cd functions && pnpm exec vitest run src/handlers/api.test.ts >"$TMP/api.log" 2>&1); then
  bad 2 "vitest run src/handlers/api.test.ts failed:"
  tail -20 "$TMP/api.log" | sed 's/^/        /'
fi

# --- Check 3: route table enforced by a test -------------------------------------------
if [ ! -f "$TABLE_TEST" ]; then
  bad 3 "$TABLE_TEST missing"
else
  grep -q "ApiRoutes" "$TABLE_TEST" || bad 3 "$TABLE_TEST does not read ApiRoutes"
  grep -qiE "undeclared" "$TABLE_TEST" || bad 3 "$TABLE_TEST has no negative case feeding an undeclared route"
  grep -q "STREAMING_ROUTE_EXCEPTIONS" "$TABLE_TEST" || bad 3 "$TABLE_TEST does not consult STREAMING_ROUTE_EXCEPTIONS"
  if ! (cd functions && pnpm exec vitest run src/handlers/route-table.test.ts >"$TMP/table.log" 2>&1); then
    bad 3 "vitest run src/handlers/route-table.test.ts failed:"
    tail -20 "$TMP/table.log" | sed 's/^/        /'
  fi
fi
if [ -f "$API" ]; then
  # Documented: a comment block directly above the exported exception list.
  grep -B3 -E 'export const STREAMING_ROUTE_EXCEPTIONS' "$API" | grep -qE '^\s*(\*|//)' ||
    bad 3 "$API has no documented, exported STREAMING_ROUTE_EXCEPTIONS list"
fi

# --- Check 4: no contract change -------------------------------------------------------
if ! pnpm -s api:breaking >"$TMP/breaking.log" 2>&1; then
  bad 4 "pnpm api:breaking failed:"
  tail -20 "$TMP/breaking.log" | sed 's/^/        /'
fi

# --- Check 5: coverage floors held -----------------------------------------------------
for key in lines functions branches statements; do
  before="$(git show "$BASE:functions/vitest.config.ts" | grep -E "^\s*$key: [0-9.]+," | grep -oE '[0-9.]+')"
  after="$(grep -E "^\s*$key: [0-9.]+," functions/vitest.config.ts | grep -oE '[0-9.]+')"
  if [ -z "$after" ] || awk -v a="$after" -v b="$before" 'BEGIN { exit !(a < b) }'; then
    bad 5 "$key threshold dropped ($before → ${after:-missing})"
  fi
done

# --- Check 6: backlog Status is done ---------------------------------------------------
grep -qE '^\| [0-9]+ \| \[S44\].*\| `done` \|$' docs/v3/BACKLOG.md ||
  bad 6 "S44 row in the Story status table is not \`done\`"
awk '/^### S44 —/{f=1;next} /^### S[0-9]/{f=0} f' docs/v3/BACKLOG.md \
  | grep -qE '^\*\*Status:\*\* `done`$' ||
  bad 6 "S44 story heading Status is not \`done\`"

report "verify-S44"
exit $?
