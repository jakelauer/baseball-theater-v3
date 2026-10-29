#!/usr/bin/env bash
# Grader for BACKLOG story S87 — the deletion cookie: a successful delete sets one
# HttpOnly browser-session cookie; /api/v1/me answers account_deleted once and clears
# it on any response; law P10 (cookies from one codepath). A commit-time proof (S84).
# Contract: docs/v3/BACKLOG.md#verify-script-contract
# No network. No writes outside /tmp. Does its own checking (never `pnpm verify`).

set -uo pipefail
cd "$(dirname "$0")/.."

# shellcheck source=lib/checks.sh
source "$(dirname "$0")/lib/checks.sh"

check 1 "a successful POST /api/v1/me/delete sets one HttpOnly, SameSite=Strict, Path=/ browser-session cookie (Secure on HTTPS only) from functions/src/services/cookies.ts; a refused deletion sets none (test)"
check 2 "GET /api/v1/me with the cookie and no session answers 401 account_deleted; any /me that sees the cookie clears it (Max-Age=0), signed in or not; the spec documents account_deleted, web types regenerated, api:breaking exits 0 (test)"
check 3 "law P10: a functions test fails when any API response sets a cookie other than through cookies.ts (route table walk + source scan); LAWS.md lists P10 enforced"
check 4 "the cookie's value is a fixed marker, never a uid or email (test)"
check 5 "backlog Status is done (story heading and Story status table)"

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
T="src/handlers/deleted-cookie.test.ts"

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

# --- Check 1: set on delete ----------------------------------------------------------------
[ -f functions/src/services/cookies.ts ] || bad 1 "functions/src/services/cookies.ts missing"
for k in HttpOnly "SameSite=Strict" "Path=/" Secure; do
  grep -qF "$k" functions/src/services/cookies.ts 2>/dev/null || bad 1 "cookies.ts never writes $k"
done
run_vitest 1 functions "$T" -t "delete"

# --- Check 2: /me reports once ---------------------------------------------------------------
run_vitest 2 functions "$T" -t "/me"
grep -qF "account_deleted" functions/src/services/openapi.ts || bad 2 "the spec source does not document account_deleted"
grep -qF "account_deleted" openapi/bt-api.v1.json || bad 2 "openapi/bt-api.v1.json does not document account_deleted"
grep -qF "account_deleted" web/src/api/generated/bt-api.v1.ts || bad 2 "the web types are not regenerated with account_deleted"
pnpm -s api:breaking >"$TMP/b.log" 2>&1 || { bad 2 "pnpm api:breaking failed:"; tail -8 "$TMP/b.log" | sed 's/^/        /'; }

# --- Check 3: law P10 ---------------------------------------------------------------------
run_vitest 3 functions src/handlers/cookie-law.test.ts
grep -qE '^\| P10 \| .*`functions/src/handlers/cookie-law\.test\.ts` \| test:coverage \| enforced \|$' docs/v3/LAWS.md ||
  bad 3 "docs/v3/LAWS.md does not list P10 as enforced by functions/src/handlers/cookie-law.test.ts"

# --- Check 4: nothing personal in the cookie -------------------------------------------------
run_vitest 4 functions "$T" -t "marker"

# --- Check 5: backlog Status is done -----------------------------------------------------
grep -qE '^\| [0-9]+ \| \[S87\].*\| `done` \|$' docs/v3/BACKLOG.md ||
  bad 5 "S87 row in the Story status table is not \`done\`"
awk '/^### S87 —/{f=1;next} /^### S[0-9]/{f=0} f' docs/v3/BACKLOG.md \
  | grep -qE '^\*\*Status:\*\* `done`$' ||
  bad 5 "S87 story heading Status is not \`done\`"

report "verify-S87"
exit $?
