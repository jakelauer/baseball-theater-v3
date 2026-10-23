#!/usr/bin/env bash
# Grader for BACKLOG story S49 — generated API client (openapi-fetch).
# Contract: docs/v3/BACKLOG.md#verify-script-contract
# No network. No writes outside /tmp. Does its own checking (never `pnpm verify`).

set -uo pipefail
cd "$(dirname "$0")/.."

# shellcheck source=lib/checks.sh
source "$(dirname "$0")/lib/checks.sh"

check 1 "requests in web/src/api/ go through an openapi-fetch createClient<paths> typed by generated/bt-api.v1.ts"
check 2 "no hand-assembled path: no backtick /api/ literal; a @ts-expect-error type test on an undeclared path, tsc exits 0"
check 3 "each existing web/src/api/*.test.ts(x) exits 0 when run alone"
check 4 "web/vitest.config.ts coverage thresholds unchanged or higher"
check 5 "backlog Status is done (story heading and Story status table)"

# The commit S49 started from: thresholds are compared against it.
BASE="5816edf"
API_DIR="web/src/api"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

# Source files in web/src/api/ that run in the app: not tests, not codegen output or the codegen script.
src_files() { find "$API_DIR" -maxdepth 1 -name '*.ts' ! -name '*.test.ts' ! -name 'codegen.ts'; }

# --- Check 1: one openapi-fetch client typed by the generated paths --------------------
grep -qE '"openapi-fetch": "' web/package.json || bad 1 "web/package.json has no openapi-fetch dependency"
client_file="$(grep -lE 'from "openapi-fetch"' $(src_files) 2>/dev/null | head -1)"
if [ -z "$client_file" ]; then
  bad 1 "no file in $API_DIR imports openapi-fetch"
else
  grep -qE 'createClient<paths>' "$client_file" || bad 1 "$client_file does not call createClient<paths>"
  grep -qE 'import type \{[^}]*\bpaths\b[^}]*\} from "\./generated/bt-api\.v1\.js"' "$client_file" ||
    bad 1 "$client_file does not import paths from ./generated/bt-api.v1.js"
fi
raw="$(grep -nE '(^|[^.A-Za-z])fetch\(' $(src_files) 2>/dev/null || true)"
[ -n "$raw" ] && { bad 1 "a request in $API_DIR bypasses the generated client:"; echo "$raw" | sed 's/^/        /'; }
hits="$(grep -n 'getJson' $(src_files) 2>/dev/null || true)"
[ -n "$hits" ] && { bad 1 "the hand-written getJson helper remains:"; echo "$hits" | sed 's/^/        /'; }

# --- Check 2: no hand-assembled paths -------------------------------------------------
hits="$(grep -nE '`[^`]*/api/' $(src_files) 2>/dev/null || true)"
[ -n "$hits" ] && { bad 2 "backtick literal containing /api/ in $API_DIR:"; echo "$hits" | sed 's/^/        /'; }
if ! grep -hA2 '@ts-expect-error' "$API_DIR"/*.types.test.ts 2>/dev/null | grep -qE '\.GET\("/api/[^"]*"'; then
  bad 2 "no *.types.test.ts in $API_DIR has a @ts-expect-error on a client.GET with an undeclared path"
fi
if ! pnpm --filter @bt/web exec tsc -p tsconfig.json --noEmit >"$TMP/tsc.log" 2>&1; then
  bad 2 "web tsc --noEmit failed:"
  tail -20 "$TMP/tsc.log" | sed 's/^/        /'
fi

# --- Check 3: each api test file passes alone -----------------------------------------
for f in "$API_DIR"/*.test.ts "$API_DIR"/*.test.tsx; do
  [ -f "$f" ] || continue
  rel="${f#web/}"
  if ! pnpm --filter @bt/web exec vitest run "$rel" >"$TMP/t.log" 2>&1; then
    bad 3 "vitest run $rel failed:"
    tail -15 "$TMP/t.log" | sed 's/^/        /'
  fi
done

# --- Check 4: coverage floors held -----------------------------------------------------
for key in lines functions branches statements; do
  before="$(git show "$BASE:web/vitest.config.ts" | grep -E "^\s*$key: [0-9.]+," | grep -oE '[0-9.]+')"
  after="$(grep -E "^\s*$key: [0-9.]+," web/vitest.config.ts | grep -oE '[0-9.]+')"
  if [ -z "$after" ] || awk -v a="$after" -v b="$before" 'BEGIN { exit !(a < b) }'; then
    bad 4 "$key threshold dropped ($before → ${after:-missing})"
  fi
done

# --- Check 5: backlog Status is done ---------------------------------------------------
grep -qE '^\| [0-9]+ \| \[S49\].*\| `done` \|$' docs/v3/BACKLOG.md ||
  bad 5 "S49 row in the Story status table is not \`done\`"
awk '/^### S49 —/{f=1;next} /^### S[0-9]/{f=0} f' docs/v3/BACKLOG.md \
  | grep -qE '^\*\*Status:\*\* `done`$' ||
  bad 5 "S49 story heading Status is not \`done\`"

report "verify-S49"
exit $?
