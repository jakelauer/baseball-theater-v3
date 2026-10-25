#!/usr/bin/env bash
# Grader for BACKLOG story S76 — personal data inventory: PersonalDataStore registry,
# classification manifest, deletion contract case, browser-storage fence.
# Contract: docs/v3/BACKLOG.md#verify-script-contract
# No network. No writes outside /tmp. Does its own checking (never `pnpm verify`).

set -uo pipefail
cd "$(dirname "$0")/.."

# shellcheck source=lib/checks.sh
source "$(dirname "$0")/lib/checks.sh"

check 1 "packages/ports exports PersonalDataStore (name, exportFor, deleteFor); functions/src/services/personal-data.ts exports one registry function, and the in-memory user repository is registered (test)"
check 2 "a classification manifest in functions/src/ labels every repository class in memory/repos.ts, every UserProfile field and every adapter directory as personal (naming a registered store) or none; a test fails on an unlabeled entry and a test proves the check catches one"
check 3 "repository-contract.ts has a lettered deletion case (two uids; deleteFor removes one's profile and identity links, leaves the other), passing against InMemoryUserRepository with its file run alone"
check 4 "browser storage only in web/src/storage/ (ESLint rule + fixture test), keys labeled personal or not, session token stored through it, one clear-personal function that signOut() calls (test)"
check 5 "backlog-review SKILL.md has a personal-data check; every registry store name appears in ADR-028's inventory table"
check 6 "backlog Status is done (story heading and Story status table)"

PORTS="packages/ports/src"
REGISTRY="functions/src/services/personal-data.ts"
CONTRACT="functions/src/adapters/repository-contract.ts"
STORAGE="web/src/storage"
RULE_TEST="tools/eslint-rules/no-browser-storage.test.js"
SKILL=".claude/skills/backlog-review/SKILL.md"
ARCH="docs/v3/ARCHITECTURE.md"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

# run_vitest <check> <dir> <test file> [vitest args…] — run one test file alone; record a failure against <check>.
run_vitest() {
  local id="$1" dir="$2" file="$3"
  shift 3
  if [ ! -f "$dir/$file" ]; then
    bad "$id" "$dir/$file missing"
  elif ! (cd "$dir" && pnpm exec vitest run "$file" "$@" --reporter=json --outputFile="$TMP/r.json" >"$TMP/r.log" 2>&1); then
    bad "$id" "$dir/$file failed:"; tail -15 "$TMP/r.log" | sed 's/^/        /'
  elif ! node -e 'process.exit(require(process.argv[1]).numPassedTests > 0 ? 0 : 1)' "$TMP/r.json"; then
    bad "$id" "$dir/$file $* ran no passing test"
  fi
}

# --- Check 1: port + registry -------------------------------------------------------------
grep -rqE 'export interface PersonalDataStore' "$PORTS" || bad 1 "$PORTS has no exported PersonalDataStore"
for m in name exportFor deleteFor; do
  awk '/export interface PersonalDataStore/{f=1} f&&/^}/{exit} f' "$PORTS"/*.ts | grep -qE "^\s*(readonly )?$m\b" ||
    bad 1 "PersonalDataStore has no $m"
done
if [ ! -f "$REGISTRY" ]; then
  bad 1 "$REGISTRY missing"
else
  [ "$(grep -cE '^export function ' "$REGISTRY")" = "1" ] || bad 1 "$REGISTRY should export exactly one registry function"
fi
run_vitest 1 functions "src/services/personal-data.test.ts"

# --- Check 2: classification manifest -----------------------------------------------------
manifest="$(grep -rlE 'personal' functions/src --include=*.ts --exclude=*.test.ts | xargs grep -lE 'deletedBy' 2>/dev/null | head -1)"
if [ -z "$manifest" ]; then
  bad 2 "no classification manifest (a functions/src module labeling entries with deletedBy)"
else
  test_file="${manifest%.ts}.test.ts"
  for c in $(grep -oE 'export class \w+' functions/src/adapters/memory/repos.ts | awk '{print $3}'); do
    grep -qE "\b$c\b" "$manifest" || bad 2 "$manifest does not label $c"
  done
  for d in $(find functions/src/adapters -mindepth 1 -maxdepth 1 -type d -exec basename {} \;); do
    grep -qE "\b$d\b" "$manifest" || bad 2 "$manifest does not label adapter directory $d"
  done
  for fld in $(awk '/^export type UserProfile = \{/{f=1;next} f&&/^\};/{exit} f' packages/domain/src/types.ts | grep -oE '^\s*\w+:' | tr -d ' \t:'); do
    grep -qE "\b$fld\b" "$manifest" || bad 2 "$manifest does not label UserProfile.$fld"
  done
  if [ -f "$test_file" ]; then
    grep -qiE 'unlabeled' "$test_file" || bad 2 "$test_file has no test that an unlabeled entry is caught"
    run_vitest 2 functions "${test_file#functions/}"
  else
    bad 2 "$test_file missing"
  fi
fi

# --- Check 3: deletion contract case ------------------------------------------------------
grep -qE 'it\("\([a-z]\)[^"]*deleteFor' "$CONTRACT" || bad 3 "$CONTRACT has no lettered case naming deleteFor"
grep -qE 'InMemoryUserRepository' functions/src/adapters/memory/repos.contract.test.ts || bad 3 "contract file never runs InMemoryUserRepository"
run_vitest 3 functions "src/adapters/memory/repos.contract.test.ts" -t "deleteFor"

# --- Check 4: browser storage fence -------------------------------------------------------
hits="$(grep -rnE '\b(localStorage|sessionStorage|indexedDB|caches)\b' web/src --include=*.ts --include=*.tsx | grep -v "^$STORAGE/" | grep -vE ':\s*(//|\*|/\*)' || true)"
[ -n "$hits" ] && { bad 4 "browser storage named outside $STORAGE/:"; echo "$hits" | sed 's/^/        /'; }
grep -qE 'no-browser-storage' eslint.config.js || bad 4 "eslint.config.js does not enable bt/no-browser-storage"
[ -f "tools/eslint-rules/no-browser-storage.js" ] || bad 4 "tools/eslint-rules/no-browser-storage.js missing"
# tools/ is not a workspace package: run its config from the root, like `pnpm test:tools`.
if [ ! -f "$RULE_TEST" ]; then
  bad 4 "$RULE_TEST missing"
elif ! pnpm exec vitest run --config tools/vitest.config.js eslint-rules/no-browser-storage.test.js --reporter=json --outputFile="$TMP/r.json" >"$TMP/r.log" 2>&1; then
  bad 4 "$RULE_TEST failed:"; tail -15 "$TMP/r.log" | sed "s/^/        /"
elif ! node -e "process.exit(require(process.argv[1]).numPassedTests > 0 ? 0 : 1)" "$TMP/r.json"; then
  bad 4 "$RULE_TEST ran no passing test"
fi
if [ -d "$STORAGE" ]; then
  ssrc="$(cat "$STORAGE"/*.ts 2>/dev/null)"
  grep -qE 'personal: (true|false)' <<<"$ssrc" || bad 4 "$STORAGE/ does not label its keys personal: true|false"
  grep -qE 'export function clearPersonalData' <<<"$ssrc" || bad 4 "$STORAGE/ has no exported clearPersonalData"
else
  bad 4 "$STORAGE/ missing"
fi
grep -qE 'from "\.\./storage/' web/src/session/token.ts || bad 4 "session token is not stored through $STORAGE/"
grep -qE 'clearPersonalData\(' web/src/session/SessionProvider.tsx || bad 4 "signOut() does not call clearPersonalData"
run_vitest 4 web "src/session/SessionProvider.test.tsx" -t "sign-out"
[ -n "$(ls "$STORAGE"/*.test.ts 2>/dev/null)" ] || bad 4 "$STORAGE/ has no test"
for t in "$STORAGE"/*.test.ts; do [ -f "$t" ] && run_vitest 4 web "${t#web/}"; done

# --- Check 5: review checklist + inventory names ------------------------------------------
grep -qiE 'personal.data' "$SKILL" || bad 5 "$SKILL has no personal-data check"
for w in table field 'outside service' 'browser key' 'log line' inventory; do
  grep -qiE "$w" "$SKILL" || bad 5 "$SKILL personal-data check never mentions \"$w\""
done
names="$(grep -oE '_STORE = "[^"]+"' "$REGISTRY" 2>/dev/null | sed -E 's/.*= "(.*)"/\1/')"
[ -n "$names" ] || bad 5 "no store names (*_STORE = \"…\") in $REGISTRY"
table="$(awk '/^### ADR-028/{f=1} f&&/^\*\*Inventory\*\*/{t=1} t&&/^\|/{print} t&&/^$/&&n++>0{exit}' "$ARCH")"
while IFS= read -r n; do
  [ -z "$n" ] && continue
  grep -qF "| $n |" <<<"$table" || bad 5 "store \"$n\" is not a Where row in ADR-028's inventory table"
done <<<"$names"

# --- Check 6: backlog Status is done ------------------------------------------------------
grep -qE '^\| [0-9]+ \| \[S76\].*\| `done` \|$' docs/v3/BACKLOG.md ||
  bad 6 "S76 row in the Story status table is not \`done\`"
awk '/^### S76 —/{f=1;next} /^### S[0-9]/{f=0} f' docs/v3/BACKLOG.md \
  | grep -qE '^\*\*Status:\*\* `done`$' ||
  bad 6 "S76 story heading Status is not \`done\`"

report "verify-S76"
exit $?
