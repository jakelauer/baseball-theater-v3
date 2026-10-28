#!/usr/bin/env bash
# Grader for BACKLOG story S77 — account export and deletion API: download first, then
# delete everywhere, with maximal verification.
# Contract: docs/v3/BACKLOG.md#verify-script-contract
# No network. No writes outside /tmp. Does its own checking (never `pnpm verify`).

set -uo pipefail
cd "$(dirname "$0")/.."

# shellcheck source=lib/checks.sh
source "$(dirname "$0")/lib/checks.sh"

check 1 "GET /api/v1/me/export returns every registered store's export keyed by name plus a single-use deletion token bound to the uid expiring within 15 minutes; 401 signed out (test)"
check 2 "POST /api/v1/me/delete refuses a session older than 10 minutes (403), a wrong phrase (400, one exported constant) and a missing/used/expired/other-uid/non-export token (403), each tested"
check 3 "a successful delete runs deleteFor on every store and IdentityAdmin.deleteAccount per linked identity; /me with the same session is then 401 and no store holds the uid; a store that fails once fails the request and a retry finishes (test)"
check 4 "a deletion log keeps only uid + time and reapplyDeletions removes a restored uid (test); the log is labeled retained (allowed on it only, test) and the token record (ID + expiry only) is labeled"
check 5 "both routes are in ApiRoutes, the spec and the web types with generated.types.test.ts pairings; pnpm api:breaking exits 0"
check 6 "no console.* call in code this story adds logs an email or an export body (grep)"
check 7 "backlog Status is done (story heading and Story status table)"

BASE=4b99b7f
HTTP_TEST="src/handlers/account-data.test.ts"
SERVICE_TEST="src/services/account-deletion.test.ts"
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

# --- Check 1: export route ---------------------------------------------------------------
grep -qE '"GET /api/v1/me/export"' packages/domain/src/api-routes.ts || bad 1 "GET /api/v1/me/export is not in ApiRoutes"
grep -qE '15 \* 60' functions/src/services/account-deletion.ts 2>/dev/null || bad 1 "no 15-minute deletion-token lifetime in functions/src/services/account-deletion.ts"
run_vitest 1 functions "$HTTP_TEST" -t "export"

# --- Check 2: refusals -------------------------------------------------------------------
grep -rqE '^export const ACCOUNT_DELETION_PHRASE = "' packages/domain/src || bad 2 "packages/domain exports no ACCOUNT_DELETION_PHRASE constant"
grep -qE '"POST /api/v1/me/delete"' packages/domain/src/api-routes.ts || bad 2 "POST /api/v1/me/delete is not in ApiRoutes"
for t in "older than 10 minutes" "wrong phrase" "without an export" "used token" "expired token" "another user"; do
  grep -qF "$t" "functions/$HTTP_TEST" 2>/dev/null || bad 2 "$HTTP_TEST has no refusal test named \"$t\""
done
run_vitest 2 functions "$HTTP_TEST" -t "refuses"

# --- Check 3: deletion everywhere + retry ------------------------------------------------
run_vitest 3 functions "$HTTP_TEST" -t "deletes"
run_vitest 3 functions "$SERVICE_TEST" -t "retry"

# --- Check 4: deletion log + labels ------------------------------------------------------
run_vitest 4 functions "$SERVICE_TEST" -t "reapplyDeletions"
grep -qE 'kind: "retained"' "$MANIFEST" || bad 4 "$MANIFEST labels nothing retained"
grep -qE 'InMemoryDeletionLog' "$MANIFEST" || bad 4 "$MANIFEST does not label the deletion log"
grep -qE 'InMemoryDeletionTokenRepository' "$MANIFEST" || bad 4 "$MANIFEST does not label the deletion token record"
grep -qiE 'retained' functions/src/services/data-classification.test.ts || bad 4 "no test that retained is allowed on the deletion log only"
run_vitest 4 functions "src/services/data-classification.test.ts"

# --- Check 5: contract, spec, web types --------------------------------------------------
for p in "/api/v1/me/export" "/api/v1/me/delete"; do
  grep -qF "\"$p\"" "$SPEC" || bad 5 "$SPEC has no $p"
  grep -qF "\"$p\"" "$GEN" || bad 5 "$GEN has no $p"
done
grep -qF '"GET /api/v1/me/export"' "$PAIRS" || bad 5 "$PAIRS has no pairing for GET /api/v1/me/export"
grep -qF '"POST /api/v1/me/delete"' "$PAIRS" || bad 5 "$PAIRS has no pairing for POST /api/v1/me/delete"
grep -qF 'requestBody' "$SPEC" || bad 5 "$SPEC declares no requestBody"
run_vitest 5 functions "src/services/openapi.test.ts"
run_vitest 5 web "src/api/generated.types.test.ts"
pnpm -s api:breaking >"$TMP/b.log" 2>&1 || { bad 5 "pnpm api:breaking failed:"; tail -10 "$TMP/b.log" | sed 's/^/        /'; }

# --- Check 6: no personal data in logs ---------------------------------------------------
files="$(story_changed_files S77 "$BASE" functions/src packages | grep -vE '\.test\.ts$')"
for f in $files; do
  [ -f "$f" ] || continue
  hits="$(story_diff S77 "$BASE" -- "$f" 2>/dev/null | grep -E '^\+' ; [ -z "$(git ls-files "$f")" ] && sed 's/^/+/' "$f")"
  grep -E '^\+.*console\.[a-z]+\(' <<<"$hits" | grep -iE 'email|export|profile|stores' >/dev/null &&
    bad 6 "$f adds a console.* call naming an email or export body"
done

# --- Check 7: backlog Status is done -----------------------------------------------------
grep -qE '^\| [0-9]+ \| \[S77\].*\| `done` \|$' docs/v3/BACKLOG.md ||
  bad 7 "S77 row in the Story status table is not \`done\`"
awk '/^### S77 —/{f=1;next} /^### S[0-9]/{f=0} f' docs/v3/BACKLOG.md \
  | grep -qE '^\*\*Status:\*\* `done`$' ||
  bad 7 "S77 story heading Status is not \`done\`"

report "verify-S77"
exit $?
