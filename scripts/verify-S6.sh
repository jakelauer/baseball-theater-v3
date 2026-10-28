#!/usr/bin/env bash
# Grader for BACKLOG story S6 — account settings: settings on the account, one Zustand
# store, Settings page with favorites + Opens First.
# Contract: docs/v3/BACKLOG.md#verify-script-contract
# No network. No writes outside /tmp. Does its own checking (never `pnpm verify`).

set -uo pipefail
cd "$(dirname "$0")/.."

# shellcheck source=lib/checks.sh
source "$(dirname "$0")/lib/checks.sh"

check 1 "GET/PUT /api/v1/me/settings in ApiRoutes and the spec: 401 signed out, PUT then GET round-trips, an older version is ignored, a deleted uid's session is 401 on both; pnpm api:breaking exits 0"
check 2 "SettingsRepository port + in-memory adapter pass the S46 contract and a store deletion case of case (h)'s form; registered as BT database: settings and labeled personal; UserProfile has no favoriteTeamIds"
check 3 "web/src/settings/store.ts: Zustand store, useSettings(), setFavoriteTeams/setOpensFirst save to the account, hydrates after sign-in, resets on sign-out, persists through web/src/storage/ under a personal key; no browser storage outside web/src/storage/"
check 4 "Settings renders Game List / Game Detail / Account, one column on mobile and two on medium/desktop; Account shows Signed in as {email} and a Sign out link calling signOut(); no Patreon row (RTL)"
check 5 "the Favorite Teams dropdown sets favorites and the choice survives a remount with a freshly hydrated store (RTL)"
check 6 "Opens First offers exactly Videos / Live / Box; GamePage opens that room when the phase offers it, else resolveRoom's fallback; signed out, the house default (test)"
check 7 "web/src has no presentationProfile, magic link or passkey text (case-insensitive)"
check 8 "files this story adds or edits have no team-logo <img> or /logos/, and no useMediaQuery/hiddenFrom/visibleFrom outside web/src/layout/"
check 9 "backlog Status is done (story heading and Story status table)"

BASE=09babec
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

# --- Check 1: settings routes ------------------------------------------------------------
for r in "GET /api/v1/me/settings" "PUT /api/v1/me/settings"; do
  grep -qF "\"$r\"" packages/domain/src/api-routes.ts || bad 1 "$r is not in ApiRoutes"
done
grep -qF '"/api/v1/me/settings"' openapi/bt-api.v1.json || bad 1 "the spec has no /api/v1/me/settings"
T="src/handlers/settings.test.ts"
for t in "401 signed out" "round-trips" "older version" "deleted"; do
  grep -qF "$t" "functions/$T" 2>/dev/null || bad 1 "$T has no test naming \"$t\""
done
run_vitest 1 functions "$T"
pnpm -s api:breaking >"$TMP/b.log" 2>&1 || { bad 1 "pnpm api:breaking failed:"; tail -10 "$TMP/b.log" | sed 's/^/        /'; }

# --- Check 2: repository, registry, manifest ---------------------------------------------
grep -rqE 'export interface SettingsRepository' packages/ports/src || bad 2 "packages/ports exports no SettingsRepository"
grep -qE 'export class InMemorySettingsRepository' functions/src/adapters/memory/repos.ts || bad 2 "no InMemorySettingsRepository in memory/repos.ts"
grep -qE 'SETTINGS_STORE = "BT database: settings"' functions/src/services/personal-data.ts || bad 2 "no SETTINGS_STORE = \"BT database: settings\" in the registry"
grep -qF '| BT database: settings' docs/v3/ARCHITECTURE.md || bad 2 "BT database: settings is not an ADR-028 inventory row"
grep -A3 'InMemorySettingsRepository: {' functions/src/services/data-classification.ts | grep -qE 'kind: "personal"' || bad 2 "InMemorySettingsRepository is not labeled personal"
grep -qE 'InMemorySettingsRepository' functions/src/adapters/memory/repos.contract.test.ts || bad 2 "the contract file never runs InMemorySettingsRepository"
grep -qE 'it\("\([a-z]\)[^"]*deleteFor' functions/src/adapters/repository-contract.ts || bad 2 "no lettered deleteFor case in the contract"
awk '/^export type UserProfile = \{/{f=1} f&&/^\};/{exit} f' packages/domain/src/types.ts | grep -q 'favoriteTeamIds' && bad 2 "UserProfile still carries favoriteTeamIds"
run_vitest 2 functions "src/adapters/memory/repos.contract.test.ts"
run_vitest 2 functions "src/services/personal-data.test.ts"
run_vitest 2 functions "src/services/data-classification.test.ts"

# --- Check 3: the Zustand store ----------------------------------------------------------
S="web/src/settings/store.ts"
if [ -f "$S" ]; then
  grep -qE 'from "zustand' "$S" || bad 3 "$S does not use zustand"
  for w in "export function useSettings" setFavoriteTeams setOpensFirst readStored writeStored; do
    grep -qE "$w" "$S" || bad 3 "$S never mentions $w"
  done
else
  bad 3 "$S missing"
fi
grep -qE '"bt\.settings": \{[^}]*personal: true|"bt\.settings": \{$' web/src/storage/storage.ts || bad 3 "web/src/storage/ has no bt.settings key"
grep -A2 '"bt.settings"' web/src/storage/storage.ts | grep -qE 'personal: true' || bad 3 "bt.settings is not labeled personal"
hits="$(git grep -nE 'localStorage|sessionStorage|indexedDB' -- web/src ':!web/src/storage/' || true)"
[ -n "$hits" ] && { bad 3 "browser storage outside web/src/storage/:"; echo "$hits" | sed 's/^/        /'; }
run_vitest 3 web "src/settings/store.test.tsx"

# --- Check 4: Settings page layout + Account ---------------------------------------------
P="src/pages/SettingsPage.test.tsx"
for t in "Game List" "Game Detail" "Account" "Signed in as" "Sign out" "mobile" "medium" "desktop"; do
  grep -qF "$t" "web/$P" 2>/dev/null || bad 4 "$P never mentions \"$t\""
done
# Comments may mention the Patreon rows that come later; rendered code may not.
grep -viE '^\s*(\*|//|/\*)' web/src/pages/SettingsPage.tsx | grep -qiE 'patreon' && bad 4 "SettingsPage renders a Patreon row"
run_vitest 4 web "$P" -t "layout|Account"

# --- Check 5: favorites survive a remount ------------------------------------------------
run_vitest 5 web "$P" -t "Favorite Teams"

# --- Check 6: Opens First ----------------------------------------------------------------
run_vitest 6 web "src/pages/GamePage.test.tsx" -t "Opens First"
run_vitest 6 packages/domain "src/game-phase.test.ts" -t "openingRoom"
run_vitest 6 web "$P" -t "Opens First"

# --- Check 7: banned words ---------------------------------------------------------------
hits="$(grep -rniE 'presentationProfile|magic link|magic-link|passkey' web/src || true)"
[ -n "$hits" ] && { bad 7 "banned text in web/src:"; echo "$hits" | sed 's/^/        /'; }

# --- Check 8: no logos, breakpoints only in layout ---------------------------------------
files="$(story_changed_files S6 "$BASE" web/src)"
for f in $files; do
  [ -f "$f" ] || continue
  grep -nE '/logos/|<img[^>]*logo' "$f" >/dev/null && bad 8 "$f references a team logo"
  case "$f" in
    web/src/layout/*) ;;
    *) grep -nE '\b(useMediaQuery|hiddenFrom|visibleFrom)\b' "$f" >/dev/null && bad 8 "$f uses a breakpoint helper outside web/src/layout/" ;;
  esac
done

# --- Check 9: backlog Status is done -----------------------------------------------------
grep -qE '^\| [0-9]+ \| \[S6\].*\| `done` \|$' docs/v3/BACKLOG.md ||
  bad 9 "S6 row in the Story status table is not \`done\`"
awk '/^### S6 —/{f=1;next} /^### S[0-9]/{f=0} f' docs/v3/BACKLOG.md \
  | grep -qE '^\*\*Status:\*\* `done`$' ||
  bad 9 "S6 story heading Status is not \`done\`"

report "verify-S6"
exit $?
