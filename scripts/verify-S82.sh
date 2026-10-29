#!/usr/bin/env bash
# Grader for BACKLOG story S82 — every account has an email (owner, 2026-10-28: "It
# should be impossible for an account to have no email."). A commit-time proof (S84).
# Contract: docs/v3/BACKLOG.md#verify-script-contract
# No network. No writes outside /tmp. Does its own checking (never `pnpm verify`).

set -uo pipefail
cd "$(dirname "$0")/.."

# shellcheck source=lib/checks.sh
source "$(dirname "$0")/lib/checks.sh"

check 1 "UserProfile.email, the /me response's email, IdentityClaims.email and IdentityAccount.email are string, not string | null"
check 2 "signing in with claims that carry no email is refused before any account is created or linked, and nothing is stored (test)"
check 3 "the download-ready email is sent for every successful request; the null-email branch in data-downloads.ts is gone (test)"
check 4 "the spec and generated web types carry email as a required string; api:spec is fresh, the codegen drift test passes, api:breaking exits 0"
check 5 "backlog Status is done (story heading and Story status table)"

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

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

# --- Check 1: email is required everywhere -----------------------------------------------
hits="$(grep -rnE 'email\??: string \| null' packages/*/src functions/src 2>/dev/null | grep -v '\.test\.' || true)"
[ -n "$hits" ] && { bad 1 "email is still nullable:"; echo "$hits" | sed 's/^/        /'; }
for f in packages/domain/src/types.ts packages/domain/src/api-routes.ts packages/ports/src/auth.ts; do
  grep -qE '^\s+email: string;' "$f" || bad 1 "$f declares no required email: string"
done

# --- Check 2: no email, no account ---------------------------------------------------------
grep -qE 'no email' functions/src/services/accounts.test.ts || bad 2 "accounts.test.ts has no 'no email' test"
run_vitest 2 functions src/services/accounts.test.ts -t "no email"

# --- Check 3: the email always goes --------------------------------------------------------
grep -qE 'email === null|email == null|!user\.email' functions/src/services/data-downloads.ts && bad 3 "data-downloads.ts still skips the email for some accounts"
run_vitest 3 functions src/handlers/data-downloads.test.ts -t "email"

# --- Check 4: the contract ---------------------------------------------------------------
node -e '
const s = require("./openapi/bt-api.v1.json").components.schemas.MeResponse;
const t = s.properties.email.type;
if (t !== "string" || !(s.required || []).includes("email")) { console.error("MeResponse.email:", JSON.stringify(s.properties.email)); process.exit(1); }
' >"$TMP/spec.log" 2>&1 || { bad 4 "the spec's MeResponse.email is not a required string:"; sed 's/^/        /' "$TMP/spec.log"; }
grep -qE '^\s+email: string;$' web/src/api/generated/bt-api.v1.ts || bad 4 "the generated web types carry no required email: string"
grep -qE 'email: string \| null' web/src/api/generated/bt-api.v1.ts && bad 4 "the generated web types still allow a null email"
run_vitest 4 web src/api/codegen.test.ts
pnpm -s api:breaking >"$TMP/b.log" 2>&1 || { bad 4 "pnpm api:breaking failed:"; tail -10 "$TMP/b.log" | sed 's/^/        /'; }

# --- Check 5: backlog Status is done -----------------------------------------------------
grep -qE '^\| [0-9]+ \| \[S82\].*\| `done` \|$' docs/v3/BACKLOG.md ||
  bad 5 "S82 row in the Story status table is not \`done\`"
awk '/^### S82 —/{f=1;next} /^### S[0-9]/{f=0} f' docs/v3/BACKLOG.md \
  | grep -qE '^\*\*Status:\*\* `done`$' ||
  bad 5 "S82 story heading Status is not \`done\`"

report "verify-S82"
exit $?
