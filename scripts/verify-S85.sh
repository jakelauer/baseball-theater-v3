#!/usr/bin/env bash
# Grader for BACKLOG story S85 — enforce laws P1, P3, P5, P8 in pnpm verify (owner,
# 2026-10-28: "Yes: P1, P3, P5, P8"). A commit-time proof of this story (S84).
# Contract: docs/v3/BACKLOG.md#verify-script-contract
# No network. No writes outside /tmp. Does its own checking (never `pnpm verify`).

set -uo pipefail
cd "$(dirname "$0")/.."

# shellcheck source=lib/checks.sh
source "$(dirname "$0")/lib/checks.sh"

check 1 "P1: a bt rule reports useMediaQuery/hiddenFrom/visibleFrom outside web/src/layout/, wired for web/src/**; RuleTester covers inside (allowed) and outside (reported)"
check 2 "P3: a bt rule reports HttpMlbStatsClient imports and statsapi.mlb.com strings under web/**; a test covers both"
check 3 "P5: a bt rule reports console.* calls logging email/export-like values in web/src, functions/src, packages/*/src (not tests); RuleTester covers reported and allowed"
check 4 "P8: a vault test walks the pnpm verify chain and fails on Playwright; a case shows it catching one"
check 5 "docs/v3/LAWS.md lists P1, P3, P5, P8 as enforced with file and step, grader rows say enforced:; laws.test.ts and pnpm lint pass"
check 6 "backlog Status is done (story heading and Story status table)"

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
R="tools/eslint-rules"
L="docs/v3/LAWS.md"

# tools_test <check> <file> — run one tools/ test file.
tools_test() {
  local id="$1" file="$2"
  if [ ! -f "$R/$file" ]; then bad "$id" "$R/$file missing"; return; fi
  if ! pnpm exec vitest run --config tools/vitest.config.js "eslint-rules/$file" >"$TMP/t.log" 2>&1; then
    bad "$id" "$file failed:"; tail -15 "$TMP/t.log" | sed 's/^/        /'
  elif ! grep -qE '[1-9][0-9]* passed' "$TMP/t.log"; then
    bad "$id" "$file ran no passing test"
  fi
}

# rule_wired <check> <rule> <files glob> — the rule is registered and enabled as an error for that glob.
rule_wired() {
  grep -qF "\"$2\":" "$R/no-domain-arithmetic.js" || bad "$1" "btRules does not register $2"
  grep -qF "\"bt/$2\": \"error\"" eslint.config.js || bad "$1" "eslint.config.js does not enable bt/$2 as an error"
  grep -qF "$3" eslint.config.js || bad "$1" "eslint.config.js has no block for $3"
}

# --- Check 1: P1 -------------------------------------------------------------------------
rule_wired 1 no-viewport-outside-layout 'web/src/layout/**'
tools_test 1 no-viewport-outside-layout.test.js

# --- Check 2: P3 -------------------------------------------------------------------------
rule_wired 2 no-mlb-in-web 'web/**'
tools_test 2 no-mlb-in-web.test.js

# --- Check 3: P5 -------------------------------------------------------------------------
rule_wired 3 no-personal-data-in-logs 'functions/src/**'
tools_test 3 no-personal-data-in-logs.test.js

# --- Check 4: P8 -------------------------------------------------------------------------
if ! pnpm exec vitest run --config scripts/backlog-vault/vitest.config.ts verify-chain.test.ts >"$TMP/v.log" 2>&1; then
  bad 4 "scripts/backlog-vault/verify-chain.test.ts failed:"; tail -15 "$TMP/v.log" | sed 's/^/        /'
fi
grep -qE '[1-9][0-9]* passed' "$TMP/v.log" || bad 4 "verify-chain.test.ts ran no passing test"
grep -qiF "playwright" scripts/backlog-vault/verify-chain.test.ts 2>/dev/null || bad 4 "verify-chain.test.ts never mentions playwright"

# --- Check 5: the registry ---------------------------------------------------------------
for p in P1 P3 P5 P8; do
  grep -qE "^\| ${p} \| .*\| enforced \|$" "$L" || bad 5 "$L does not list $p as enforced"
  grep -qE "proposed: ${p}\b" "$L" && bad 5 "$L still has grader rows pointing at proposed $p"
done
if ! pnpm exec vitest run --config scripts/backlog-vault/vitest.config.ts laws.test.ts >"$TMP/l.log" 2>&1; then
  bad 5 "laws.test.ts failed:"; tail -10 "$TMP/l.log" | sed 's/^/        /'
fi
pnpm -s exec eslint . >"$TMP/lint.log" 2>&1 || { bad 5 "eslint fails at HEAD:"; tail -10 "$TMP/lint.log" | sed 's/^/        /'; }

# --- Check 6: backlog Status is done -----------------------------------------------------
grep -qE '^\| [0-9]+ \| \[S85\].*\| `done` \|$' docs/v3/BACKLOG.md ||
  bad 6 "S85 row in the Story status table is not \`done\`"
awk '/^### S85 —/{f=1;next} /^### S[0-9]/{f=0} f' docs/v3/BACKLOG.md \
  | grep -qE '^\*\*Status:\*\* `done`$' ||
  bad 6 "S85 story heading Status is not \`done\`"

report "verify-S85"
exit $?
