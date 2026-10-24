#!/usr/bin/env bash
# Grader for BACKLOG story S59 — web session: session provider, local dev sign-in, signed-out hides Settings.
# Contract: docs/v3/BACKLOG.md#verify-script-contract
# No network. No writes outside /tmp. Does its own checking (never `pnpm verify`).

set -uo pipefail
cd "$(dirname "$0")/.."

# shellcheck source=lib/checks.sh
source "$(dirname "$0")/lib/checks.sh"

check 1 "web/src/session/ exports a session provider and useSession() (signed out / signed in with uid + email, signIn, signOut), reading GET /api/v1/me through the typed client, not a TanStack query"
check 2 "a development-only dev sign-in control signs in as dev:test-user; a test proves it is absent when import.meta.env.PROD"
check 3 "signed out, the Settings nav item is absent and /settings redirects to the scoreboard; signed in, both render (RTL)"
check 4 "sign-out clears the session and invalidates session-dependent queries (test)"
check 5 "files this story adds or edits have no team-logo <img> or /logos/, and no useMediaQuery/hiddenFrom/visibleFrom outside web/src/layout/"
check 6 "backlog Status is done (story heading and Story status table)"

BASE=8964dc4
SESSION="web/src/session"
CLIENT="web/src/api/client.ts"
SESSION_TEST="src/session/SessionProvider.test.tsx"
DEV_TEST="src/session/DevSessionControl.test.tsx"
ROUTES_TEST="src/routes.test.tsx"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

# run_web <check> <test file> [vitest args…] — run one web test file alone; record a failure against <check>.
run_web() {
  local id="$1" file="$2"
  shift 2
  if [ ! -f "web/$file" ]; then
    bad "$id" "web/$file missing"
  elif ! (cd web && pnpm exec vitest run "$file" "$@" --reporter=json --outputFile="$TMP/r.json" >"$TMP/r.log" 2>&1); then
    bad "$id" "web/$file failed:"; tail -15 "$TMP/r.log" | sed 's/^/        /'
  elif ! node -e 'process.exit(require(process.argv[1]).numPassedTests > 0 ? 0 : 1)' "$TMP/r.json"; then
    bad "$id" "web/$file $* ran no passing test"
  fi
}

# --- Check 1: session provider + hook ---------------------------------------------------
if [ ! -d "$SESSION" ]; then
  bad 1 "$SESSION/ missing"
else
  src="$(cat "$SESSION"/*.ts "$SESSION"/*.tsx 2>/dev/null | grep -v '^\s*//' )"
  grep -qE 'export function SessionProvider' <<<"$src" || bad 1 "no exported SessionProvider in $SESSION/"
  grep -qE 'export function useSession' <<<"$src" || bad 1 "no exported useSession in $SESSION/"
  for w in signIn signOut uid email signedIn signedOut; do
    grep -q "$w" <<<"$src" || bad 1 "$SESSION/ never mentions $w"
  done
  grep -qE '\buse(Suspense)?Query\(' <<<"$src" && bad 1 "$SESSION/ reads the session through a TanStack query (ADR-014 rule 7)"
  grep -qE 'api\.GET\("/api/v1/me"' "$CLIENT" "$SESSION"/* 2>/dev/null || bad 1 "nothing calls api.GET(\"/api/v1/me\") through the typed client"
  grep -qE 'api\.use\(' "$CLIENT" || bad 1 "$CLIENT does not attach the session through one api.use(...) middleware"
  hits="$(grep -rnE 'fetch\(' "$SESSION" --include=*.ts --include=*.tsx --exclude=*.test.* || true)"
  [ -n "$hits" ] && { bad 1 "$SESSION/ calls fetch directly:"; echo "$hits" | sed 's/^/        /'; }
fi
run_web 1 "$SESSION_TEST"

# --- Check 2: dev-only sign-in control --------------------------------------------------
grep -rqE 'dev:test-user' web/src --include=*.ts --include=*.tsx --exclude=*.test.* ||
  bad 2 "no product code signs in as dev:test-user"
if [ -f "web/$DEV_TEST" ]; then
  grep -qE 'stubEnv\("PROD", true\)|import\.meta\.env\.PROD' "web/$DEV_TEST" || bad 2 "$DEV_TEST never sets import.meta.env.PROD"
fi
run_web 2 "$DEV_TEST"

# --- Check 3: Settings gated on the session ---------------------------------------------
if [ -f "web/$ROUTES_TEST" ]; then
  grep -qE '/settings' "web/$ROUTES_TEST" || bad 3 "$ROUTES_TEST never visits /settings"
  grep -qE 'Settings' "web/$ROUTES_TEST" || bad 3 "$ROUTES_TEST never looks for the Settings nav item"
fi
run_web 3 "$ROUTES_TEST"

# --- Check 4: sign-out ------------------------------------------------------------------
run_web 4 "$SESSION_TEST" -t "sign-out"

# --- Check 5: no logos, breakpoints only in layout --------------------------------------
files="$( { git diff --name-only "$BASE" -- web/src; git ls-files --others --exclude-standard web/src; } | sort -u)"
for f in $files; do
  [ -f "$f" ] || continue
  grep -nE '/logos/|<img[^>]*logo' "$f" >/dev/null && bad 5 "$f references a team logo"
  case "$f" in
    web/src/layout/*) ;;
    *) grep -nE '\b(useMediaQuery|hiddenFrom|visibleFrom)\b' "$f" >/dev/null && bad 5 "$f uses a breakpoint helper outside web/src/layout/" ;;
  esac
done

# --- Check 6: backlog Status is done ----------------------------------------------------
grep -qE '^\| [0-9]+ \| \[S59\].*\| `done` \|$' docs/v3/BACKLOG.md ||
  bad 6 "S59 row in the Story status table is not \`done\`"
awk '/^### S59 —/{f=1;next} /^### S[0-9]/{f=0} f' docs/v3/BACKLOG.md \
  | grep -qE '^\*\*Status:\*\* `done`$' ||
  bad 6 "S59 story heading Status is not \`done\`"

report "verify-S59"
exit $?
