#!/usr/bin/env bash
# Grader for BACKLOG story S88 — one shipping-commit lookup: story_tip reads the ledger
# through shipping_commit; the commit-subject search and its contract rule are gone;
# the re-verification sweep is re-run. A commit-time proof of this story (S84).
# Contract: docs/v3/BACKLOG.md#verify-script-contract
# No network. No writes outside /tmp. Does its own checking (never `pnpm verify`).

set -uo pipefail
cd "$(dirname "$0")/.."

# shellcheck source=lib/checks.sh
source "$(dirname "$0")/lib/checks.sh"

check 1 "story_tip returns shipping_commit's answer from the ledger (AUDIT.md, or VAULT-MIGRATION-AUDIT.md for V*) and nothing with no completion entry; no commit-subject search remains"
check 2 "a scripts/backlog-vault/ test shows story_tip agreeing with shipping_commit for a completion entry, a backfill entry and a story with no entry"
check 3 "LAWS.md's Re-verified at shipping commits table is refreshed by a re-run on or after 2026-10-29, covers every shipped grader including S84 onward, and every row passes"
check 4 "the verify-script contract no longer requires only the shipping commit's subject to start <ID>: "
check 5 "backlog Status is done (story heading and Story status table)"

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
LAWS="docs/v3/LAWS.md"
CONTRACT="docs/v3/backlog/frame/00 Baseball Theater v3 — Checkable backlog.md"

# --- Check 1: one lookup ----------------------------------------------------------------------
body="$(awk '/^story_tip\(\)/{f=1} f{print} f&&/^}/{exit}' scripts/lib/checks.sh)"
[ -n "$body" ] || bad 1 "scripts/lib/checks.sh defines no story_tip"
echo "$body" | grep -q -- '--grep' && bad 1 "story_tip still searches commit subjects (--grep)"
echo "$body" | grep -qw 'shipping_commit' || bad 1 "story_tip does not call shipping_commit"
echo "$body" | grep -qF 'VAULT-MIGRATION-AUDIT.md' || bad 1 "story_tip does not read docs/v3/VAULT-MIGRATION-AUDIT.md for V* stories"
grep -rn -- '--grep=' scripts/lib/ >/dev/null && bad 1 "scripts/lib/ still searches commit subjects: $(grep -rln -- '--grep=' scripts/lib/ | tr '\n' ' ')"
# Live agreement on this repo: every story with a ledger entry gets the ledger's commit.
for id in S7 S14 S84 S79 V3; do
  case "$id" in V*) l="docs/v3/VAULT-MIGRATION-AUDIT.md" ;; *) l="docs/v3/AUDIT.md" ;; esac
  # shellcheck source=lib/reverify.sh
  want="$(source scripts/lib/reverify.sh; shipping_commit "$l" "$id")"
  got="$(story_tip "$id")"
  [ -n "$want" ] && [ "$(git rev-parse "$got" 2>/dev/null)" = "$(git rev-parse "$want")" ] ||
    bad 1 "story_tip $id is '$got', the ledger's shipping commit is '$want'"
done
[ -z "$(story_tip S9999)" ] || bad 1 "story_tip returns a commit for a story with no ledger entry"

# --- Check 2: the test --------------------------------------------------------------------------
T="$(grep -lE 'story_tip' scripts/backlog-vault/*.test.ts 2>/dev/null | xargs grep -lE 'shipping_commit' 2>/dev/null | head -1)"
if [ -z "$T" ]; then
  bad 2 "no scripts/backlog-vault/*.test.ts exercises story_tip against shipping_commit"
else
  for k in "backfill" "Shipped in" "no entry"; do
    grep -qiF "$k" "$T" || bad 2 "$T has no case mentioning '$k'"
  done
  if ! pnpm exec vitest run --config scripts/backlog-vault/vitest.config.ts "$(basename "$T")" --reporter=json --outputFile="$TMP/v.json" >"$TMP/v.log" 2>&1; then
    bad 2 "$T failed:"; tail -15 "$TMP/v.log" | sed 's/^/        /'
  elif ! node -e 'const r=require(process.argv[1]);process.exit(r.numPassedTests>=3&&r.numFailedTests===0?0:1)' "$TMP/v.json"; then
    bad 2 "$T ran fewer than three passing tests"
  fi
fi

# --- Check 3: the sweep re-run ------------------------------------------------------------------
table="$(awk '/^## Re-verified at shipping commits/{f=1;next} /^## /{f=0} f' "$LAWS" | grep -E '^\| [SV][0-9]+ \|')"
[ -n "$table" ] || bad 3 "$LAWS has no Re-verified at shipping commits rows"
old="$(echo "$table" | awk -F' \\| ' '{d=$4; gsub(/ \|$/,"",d); if (d < "2026-10-29") print $1}' | tr -d '| ' | tr '\n' ' ')"
[ -n "$old" ] && bad 3 "rows not refreshed on or after 2026-10-29: $old"
for g in scripts/verify-*.sh; do
  id="$(basename "$g" .sh | sed 's/^verify-//')"
  [ "$id" = "S88" ] && continue
  case "$id" in V*) l="docs/v3/VAULT-MIGRATION-AUDIT.md" ;; *) l="docs/v3/AUDIT.md" ;; esac
  ship="$(source scripts/lib/reverify.sh; shipping_commit "$l" "$id")"
  [ -n "$ship" ] || continue
  echo "$table" | grep -qE "^\| $id \| " || bad 3 "$id shipped (\`$ship\`) but has no row"
done
fails="$(echo "$table" | grep -vE '^\| S88 \|' | grep -vE '\| exit 0, ' | awk -F' \\| ' '{print $1}' | tr -d '| ' | tr '\n' ' ')"
[ -n "$(echo "$fails" | tr -d ' ')" ] && bad 3 "rows that did not pass: $fails"

# --- Check 4: the contract rule ----------------------------------------------------------------
contract="$(awk '/^### Verify-script contract/{f=1;next} /^### /{f=0} f' "$CONTRACT")"
echo "$contract" | grep -qF 'Name only the shipping commit' && bad 4 "the contract still says 'Name only the shipping commit <ID>: …'"
echo "$contract" | grep -qE "newest commit whose subject starts" && bad 4 "the contract still describes story_tip as a commit-subject search"

# --- Check 5: backlog Status is done -----------------------------------------------------
grep -qE '^\| [0-9]+ \| \[S88\].*\| `done` \|$' docs/v3/BACKLOG.md ||
  bad 5 "S88 row in the Story status table is not \`done\`"
awk '/^### S88 —/{f=1;next} /^### S[0-9]/{f=0} f' docs/v3/BACKLOG.md \
  | grep -qE '^\*\*Status:\*\* `done`$' ||
  bad 5 "S88 story heading Status is not \`done\`"

report "verify-S88"
exit $?
