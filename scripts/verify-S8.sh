#!/usr/bin/env bash
# Grader for BACKLOG story S8 — identity ports: BT-owned user ID + signed session (local).
# Contract: docs/v3/BACKLOG.md#verify-script-contract
# No network. No writes outside /tmp. Does its own checking (never `pnpm verify`).

set -uo pipefail
cd "$(dirname "$0")/.."

# shellcheck source=lib/checks.sh
source "$(dirname "$0")/lib/checks.sh"

check 1 "packages/ports exports IdentityProvider (completeSignIn → { provider, subject, email, emailVerified }) and IdentityAdmin (list, disable, delete)"
check 2 "UserRepository links (provider, subject) → uid; a contract case for it passes against the in-memory repository"
check 3 "a BT session (uid, role, entitlements) is HMAC-signed with WebCrypto, keyed through SecretsProvider; verifying reads no repository (spy)"
check 4 "GET /api/v1/me is in ApiRoutes and the spec (401 / 200 with Bearer dev:test-user, uid + email); no local: prefix; pnpm api:breaking exits 0"
check 5 "no passkey/webauthn in ports or functions; no @logto/ import outside functions/src/adapters/logto/"
check 6 "the functions test files for ACs 3–4 exit 0 when run alone"
check 7 "backlog Status is done (story heading and Story status table)"

AUTH="packages/ports/src/auth.ts"
CONTRACT="functions/src/adapters/repository-contract.ts"
CONTRACT_TEST="functions/src/adapters/memory/repos.contract.test.ts"
SESSION="functions/src/services/session.ts"
SESSION_TEST="functions/src/services/session.test.ts"
ME_TEST="functions/src/handlers/me.test.ts"
ROUTES="packages/domain/src/api-routes.ts"
SPEC="openapi/bt-api.v1.json"
GEN="web/src/api/generated/bt-api.v1.ts"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

# block <file> <interface> — the body of `export interface <name>` (flattened to one line).
# No `\b`: BSD awk on macOS doesn't support it.
block() {
  awk -v name="$2" '$0 ~ ("^export interface " name "([^A-Za-z0-9_]|$)") {f=1} f{print} f && /^\}/{exit}' "$1" | tr -s ' \t\n' ' '
}

# --- Check 1: identity ports ------------------------------------------------------------
if [ ! -f "$AUTH" ]; then
  bad 1 "$AUTH missing"
else
  idp="$(block "$AUTH" IdentityProvider)"
  [ -n "$idp" ] || bad 1 "$AUTH does not export interface IdentityProvider"
  grep -qE 'completeSignIn\(' <<<"$idp" || bad 1 "IdentityProvider has no completeSignIn"
  claims_type="$(grep -oE 'completeSignIn\([^)]*\): Promise<[A-Za-z]+>' <<<"$idp" | sed -E 's/.*Promise<([A-Za-z]+)>/\1/')"
  if [ -z "$claims_type" ]; then
    bad 1 "completeSignIn does not return Promise<NamedClaimsType>"
  else
    claims="$(block "$AUTH" "$claims_type")"
    for f in provider subject email emailVerified; do
      grep -qE "\b$f: " <<<"$claims" || bad 1 "$claims_type has no $f"
    done
  fi
  admin="$(block "$AUTH" IdentityAdmin)"
  [ -n "$admin" ] || bad 1 "$AUTH does not export interface IdentityAdmin"
  for m in list disable delete; do
    grep -qiE "\b$m[A-Za-z]*\(" <<<"$admin" || bad 1 "IdentityAdmin has no $m method"
  done
fi

# --- Check 2: identity link + contract case ---------------------------------------------
repo="$(block "$AUTH" UserRepository)"
for m in linkIdentity getByIdentity; do
  grep -qE "\b$m\([^)]*provider[^)]*subject" <<<"$repo" || bad 2 "UserRepository has no $m(provider, subject, …)"
done
grep -qE 'it\("\([a-z]\) [^"]*(linkIdentity|identity)' "$CONTRACT" 2>/dev/null ||
  bad 2 "$CONTRACT has no lettered identity-link case"
grep -q InMemoryUserRepository "$CONTRACT_TEST" 2>/dev/null ||
  bad 2 "$CONTRACT_TEST does not run the contract against InMemoryUserRepository"
if (cd functions && pnpm exec vitest run src/adapters/memory/repos.contract.test.ts -t "Identity" --reporter=json --outputFile="$TMP/c.json" >"$TMP/c.log" 2>&1); then
  node -e '
    const r = require(process.argv[1]);
    if (r.numPassedTests < 1) { console.log("no identity contract case ran"); process.exit(1); }
  ' "$TMP/c.json" >"$TMP/tally" || bad 2 "$(cat "$TMP/tally")"
else
  bad 2 "identity contract case failed:"; tail -15 "$TMP/c.log" | sed 's/^/        /'
fi

# --- Check 3: signed session ------------------------------------------------------------
if [ ! -f "$SESSION" ]; then
  bad 3 "$SESSION missing"
else
  grep -qE 'crypto\.subtle' "$SESSION" || bad 3 "$SESSION does not use WebCrypto (crypto.subtle)"
  grep -qE '"HMAC"' "$SESSION" || bad 3 "$SESSION does not use HMAC"
  grep -qE 'SecretsProvider' "$SESSION" || bad 3 "$SESSION does not read its key through SecretsProvider"
  for f in uid role entitlements; do
    grep -qE "\b$f\b" "$SESSION" || bad 3 "$SESSION session claims lack $f"
  done
  grep -qE 'UserRepository|getByUid|getByIdentity' "$SESSION" && bad 3 "$SESSION references a repository"
fi
if [ ! -f "$SESSION_TEST" ]; then
  bad 3 "$SESSION_TEST missing"
else
  grep -qE 'vi\.fn|vi\.spyOn' "$SESSION_TEST" || bad 3 "$SESSION_TEST has no repository spy"
  grep -qE 'not\.toHaveBeenCalled\(\)|toHaveBeenCalledTimes\(0\)' "$SESSION_TEST" ||
    bad 3 "$SESSION_TEST never asserts the repository spy went uncalled"
fi

# --- Check 4: GET /api/v1/me ------------------------------------------------------------
grep -qE '"GET /api/v1/me":' "$ROUTES" || bad 4 "ApiRoutes has no \"GET /api/v1/me\""
node -e '
  const s = require(process.argv[1]);
  const op = s.paths["/api/v1/me"] && s.paths["/api/v1/me"].get;
  if (!op) { console.log("no get /api/v1/me"); process.exit(1); }
  for (const c of ["200", "401"]) if (!op.responses[c]) { console.log(`no ${c} response`); process.exit(1); }
' "$PWD/$SPEC" >"$TMP/spec" 2>&1 || bad 4 "$SPEC: $(cat "$TMP/spec")"
grep -qE '"/api/v1/me"' "$GEN" || bad 4 "$GEN was not regenerated with /api/v1/me"
if [ ! -f "$ME_TEST" ]; then
  bad 4 "$ME_TEST missing"
else
  grep -qE 'Bearer dev:test-user' "$ME_TEST" || bad 4 "$ME_TEST does not send Bearer dev:test-user"
  grep -qE '401' "$ME_TEST" || bad 4 "$ME_TEST does not assert 401"
  grep -qE 'email' "$ME_TEST" || bad 4 "$ME_TEST does not assert the email"
fi
# Production code only: a test asserting that `local:` is rejected is the point, not a violation.
hits="$(grep -rnE '"local:|Bearer local:' functions/src packages --include=*.ts --exclude=*.test.ts || true)"
[ -n "$hits" ] && { bad 4 "the local: test prefix is still accepted:"; echo "$hits" | sed 's/^/        /'; }
if ! (cd functions && pnpm exec vitest run src/services/openapi.test.ts >"$TMP/o.log" 2>&1); then
  bad 4 "functions src/services/openapi.test.ts (spec drift) failed"; tail -10 "$TMP/o.log" | sed 's/^/        /'
fi
if ! pnpm --filter @bt/web exec vitest run src/api/codegen.test.ts src/api/generated.types.test.ts >"$TMP/g.log" 2>&1; then
  bad 4 "web codegen/spec-fidelity tests failed"; tail -10 "$TMP/g.log" | sed 's/^/        /'
fi
if ! pnpm -s api:breaking >"$TMP/b.log" 2>&1; then
  bad 4 "pnpm api:breaking failed:"; tail -10 "$TMP/b.log" | sed 's/^/        /'
fi

# --- Check 5: no passkeys, Logto confined ------------------------------------------------
hits="$(grep -riEn 'passkey|webauthn' packages/ports functions/src || true)"
[ -n "$hits" ] && { bad 5 "passkey/webauthn found:"; echo "$hits" | sed 's/^/        /'; }
hits="$(grep -rnE "from [\"']@logto/" packages functions/src --include=*.ts --include=*.tsx 2>/dev/null | grep -v '^functions/src/adapters/logto/' || true)"
[ -n "$hits" ] && { bad 5 "@logto/ imported outside functions/src/adapters/logto/:"; echo "$hits" | sed 's/^/        /'; }

# --- Check 6: AC 3–4 test files alone ---------------------------------------------------
for t in src/services/session.test.ts src/handlers/me.test.ts; do
  if [ ! -f "functions/$t" ]; then
    bad 6 "functions/$t missing"
  elif ! (cd functions && pnpm exec vitest run "$t" >"$TMP/t.log" 2>&1); then
    bad 6 "functions/$t failed alone:"; tail -15 "$TMP/t.log" | sed 's/^/        /'
  fi
done

# --- Check 7: backlog Status is done ----------------------------------------------------
grep -qE '^\| [0-9]+ \| \[S8\].*\| `done` \|$' docs/v3/BACKLOG.md ||
  bad 7 "S8 row in the Story status table is not \`done\`"
awk '/^### S8 —/{f=1;next} /^### S[0-9]/{f=0} f' docs/v3/BACKLOG.md \
  | grep -qE '^\*\*Status:\*\* `done`$' ||
  bad 7 "S8 story heading Status is not \`done\`"

report "verify-S8"
exit $?
