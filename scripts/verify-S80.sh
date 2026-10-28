#!/usr/bin/env bash
# Grader for BACKLOG story S80 — separate download from delete: stored downloads that age out
# in 14 days, at most twice in rolling 24 hours, linked by email; deletion needs no download.
# Contract: docs/v3/BACKLOG.md#verify-script-contract
# No network. No writes outside /tmp. Does its own checking (never `pnpm verify`).

set -uo pipefail
cd "$(dirname "$0")/.."

# shellcheck source=lib/checks.sh
source "$(dirname "$0")/lib/checks.sh"

check 1 "requesting a download stores every registered store's export (keyed by name) in an ExportStore port with a 14-day expiry and answers id + expiry, not the data; 401 signed out (test)"
check 2 "a third request inside rolling 24 hours is 429 with the next allowed time; a request 24 hours after the earliest succeeds (test, injected clock; domain rule tested)"
check 3 "the current download (id + expiry) reads back and its file is fetched by its owner only; another user, an expired download or none is 404 (test)"
check 4 "a successful request sends one message through a Mailer port to the account's email with a link to BT and no exported data; no email, no message (test)"
check 5 "POST /api/v1/me/delete deletes with the phrase and a recent sign-in alone, no download made; reauth_required and phrase_mismatch kept (test); no deletionToken, DeletionTokenRepository or export_required in tracked packages/ or functions/src/ (grep)"
check 6 "the ExportStore is registered as \"Cloud storage: data downloads\", labeled in the manifest, and passes the repository contract's deletion case (test)"
check 7 "in-memory ExportStore and Mailer adapters live in functions/src/adapters/memory/ and are what pnpm dev uses; no console.* call this story adds logs an email or exported data (grep)"
check 8 "the download routes are in ApiRoutes, the spec and the web types with generated.types.test.ts pairings; pnpm api:breaking exits 0"
check 9 "backlog Status is done (story heading and Story status table)"

BASE=e24c8da
HTTP_TEST="src/handlers/data-downloads.test.ts"
DELETE_TEST="src/handlers/account-data.test.ts"
DOMAIN_TEST="src/downloads.test.ts"
REPOS="functions/src/adapters/memory/repos.ts"
REGISTRY="functions/src/services/personal-data.ts"
MANIFEST="functions/src/services/data-classification.ts"
SPEC="openapi/bt-api.v1.json"
GEN="web/src/api/generated/bt-api.v1.ts"
PAIRS="web/src/api/generated.types.test.ts"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

# run_vitest <check> <dir> <test file> [vitest args…] — run one test file alone; record a failure against <check>.
run_vitest() {
  local id="$1" dir="$2" file="$3"
  shift 3
  if [ ! -f "$dir/$file" ]; then
    bad "$id" "$dir/$file missing"
  elif ! (cd "$dir" && pnpm exec vitest run "$file" "$@" --reporter=json --outputFile="$TMP/r.json" >"$TMP/r.log" 2>&1); then
    bad "$id" "$dir/$file $* failed:"; tail -15 "$TMP/r.log" | sed 's/^/        /'
  elif ! node -e 'process.exit(require(process.argv[1]).numPassedTests > 0 ? 0 : 1)' "$TMP/r.json"; then
    bad "$id" "$dir/$file $* ran no passing test"
  fi
}

# --- Check 1: request a download ---------------------------------------------------------
grep -qE '"POST /api/v1/me/download"' packages/domain/src/api-routes.ts || bad 1 "POST /api/v1/me/download is not in ApiRoutes"
grep -rqE '^export interface ExportStore\b' packages/ports/src || bad 1 "packages/ports declares no ExportStore interface"
grep -qE 'DOWNLOAD_LIFETIME_DAYS = 14;' packages/domain/src/downloads.ts 2>/dev/null || bad 1 "packages/domain/src/downloads.ts has no 14-day DOWNLOAD_LIFETIME_DAYS"
run_vitest 1 functions "$HTTP_TEST" -t "request"

# --- Check 2: twice in rolling 24 hours --------------------------------------------------
grep -qE '^export function nextDownloadAllowedAt\(' packages/domain/src/downloads.ts 2>/dev/null || bad 2 "packages/domain exports no nextDownloadAllowedAt"
run_vitest 2 packages/domain "$DOMAIN_TEST"
run_vitest 2 functions "$HTTP_TEST" -t "rolling 24 hours"

# --- Check 3: current download and its file ----------------------------------------------
grep -qE '"GET /api/v1/me/download"' packages/domain/src/api-routes.ts || bad 3 "GET /api/v1/me/download is not in ApiRoutes"
grep -qE '"GET /api/v1/me/download/:downloadId"' packages/domain/src/api-routes.ts || bad 3 "GET /api/v1/me/download/:downloadId is not in ApiRoutes"
for t in "another user" "expired" "none"; do
  grep -qF "$t" "functions/$HTTP_TEST" 2>/dev/null || bad 3 "$HTTP_TEST has no test naming \"$t\""
done
run_vitest 3 functions "$HTTP_TEST" -t "current download"

# --- Check 4: the email ------------------------------------------------------------------
grep -rqE '^export interface Mailer\b' packages/ports/src || bad 4 "packages/ports declares no Mailer interface"
run_vitest 4 functions "$HTTP_TEST" -t "email"

# --- Check 5: deletion without a download; token gone ------------------------------------
grep -qF "without a download" "functions/$DELETE_TEST" 2>/dev/null || bad 5 "$DELETE_TEST has no test deleting \"without a download\""
run_vitest 5 functions "$DELETE_TEST" -t "deletes"
run_vitest 5 functions "$DELETE_TEST" -t "refuses"
hits="$(git grep -nE 'deletionToken|DeletionTokenRepository|export_required' -- packages functions/src 2>/dev/null)"
[ -z "$hits" ] || { bad 5 "the deletion token remains:"; head -5 <<<"$hits" | sed 's/^/        /'; }

# --- Check 6: registered, labeled, contract-held -----------------------------------------
grep -qE '_STORE = "Cloud storage: data downloads";' "$REGISTRY" || bad 6 "$REGISTRY names no \"Cloud storage: data downloads\" store"
grep -qE '^\s+InMemoryExportStore: \{' "$MANIFEST" || bad 6 "$MANIFEST does not label InMemoryExportStore"
grep -qE '^\s+InMemoryMailer: \{' "$MANIFEST" || bad 6 "$MANIFEST does not label InMemoryMailer"
run_vitest 6 functions "src/adapters/memory/repos.contract.test.ts" -t "Cloud storage: data downloads"
run_vitest 6 functions "src/services/data-classification.test.ts"

# --- Check 7: in-memory adapters, used by pnpm dev; no personal data in logs --------------
grep -qE '^export class InMemoryExportStore implements ExportStore' "$REPOS" || bad 7 "$REPOS has no InMemoryExportStore implementing ExportStore"
grep -qE '^export class InMemoryMailer implements Mailer' "$REPOS" || bad 7 "$REPOS has no InMemoryMailer implementing Mailer"
grep -qE 'new InMemoryExportStore\(' functions/src/adapters/fixtures/auth.ts || bad 7 "createDevAccountData does not build an InMemoryExportStore"
grep -qE 'new InMemoryMailer\(' functions/src/adapters/fixtures/auth.ts || bad 7 "createDevAccountData does not build an InMemoryMailer"
grep -qE 'createDevAccountData\(' functions/src/local-server.ts || bad 7 "functions/src/local-server.ts (pnpm dev) does not use createDevAccountData"
files="$( { git diff --name-only "$BASE" -- functions/src packages; git ls-files --others --exclude-standard functions/src packages; } | sort -u | grep -vE '\.test\.ts$')"
for f in $files; do
  [ -f "$f" ] || continue
  hits="$(git diff "$BASE" -- "$f" 2>/dev/null | grep -E '^\+' ; [ -z "$(git ls-files "$f")" ] && sed 's/^/+/' "$f")"
  grep -E '^\+.*console\.[a-z]+\(' <<<"$hits" | grep -iE 'email|export|profile|stores|file|message|\bto\b' >/dev/null &&
    bad 7 "$f adds a console.* call naming an email or exported data"
done

# --- Check 8: contract, spec, web types --------------------------------------------------
for p in "/api/v1/me/download" "/api/v1/me/download/{downloadId}"; do
  grep -qF "\"$p\"" "$SPEC" || bad 8 "$SPEC has no $p"
  grep -qF "\"$p\"" "$GEN" || bad 8 "$GEN has no $p"
done
for r in "POST /api/v1/me/download" "GET /api/v1/me/download" "GET /api/v1/me/download/:downloadId"; do
  grep -qF "\"$r\"" "$PAIRS" || bad 8 "$PAIRS has no pairing for $r"
done
grep -qF '"/api/v1/me/export"' "$SPEC" && bad 8 "$SPEC still publishes /api/v1/me/export"
grep -qE '"429"' "$SPEC" || bad 8 "$SPEC declares no 429 response"
run_vitest 8 functions "src/services/openapi.test.ts"
run_vitest 8 web "src/api/generated.types.test.ts"
pnpm -s api:breaking >"$TMP/b.log" 2>&1 || { bad 8 "pnpm api:breaking failed:"; tail -10 "$TMP/b.log" | sed 's/^/        /'; }

# --- Check 9: backlog Status is done -----------------------------------------------------
grep -qE '^\| [0-9]+ \| \[S80\].*\| `done` \|$' docs/v3/BACKLOG.md ||
  bad 9 "S80 row in the Story status table is not \`done\`"
awk '/^### S80 —/{f=1;next} /^### S[0-9]/{f=0} f' docs/v3/BACKLOG.md \
  | grep -qE '^\*\*Status:\*\* `done`$' ||
  bad 9 "S80 story heading Status is not \`done\`"

report "verify-S80"
exit $?
