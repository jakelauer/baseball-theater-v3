#!/usr/bin/env bash
# Grader for BACKLOG story S84 — graders prove their own story, laws hold forever:
# the two tiers in the contract, pinned re-verification in a worktree, design verdicts
# on their own, the laws registry, every grader sorted, post-ship grader edits accounted.
# Contract: docs/v3/BACKLOG.md#verify-script-contract
# No network. No writes outside /tmp. Does its own checking (never `pnpm verify`).

set -uo pipefail
cd "$(dirname "$0")/.."

# shellcheck source=lib/checks.sh
source "$(dirname "$0")/lib/checks.sh"

check 1 "the verify-script contract states the two tiers: a grader is a commit-time proof of its own story (scope checks on its own commits, never base to HEAD); a law runs in pnpm verify and is listed in docs/v3/LAWS.md; changing a law is an owner decision"
check 2 "audit.sh story --reverify runs the grader in a temporary worktree at the story's shipping commit and removes it (test: fails at HEAD, re-verifies as passing)"
check 3 "audit.sh design <ID> --design-match records a verdict without running the grader, and is not counted as a completion; story completion still requires the verdict for a UI story (test)"
check 4 "docs/v3/LAWS.md lists the seeded laws with source and enforcement; a vault test fails when an enforced law's file is missing or its step is not in the verify chain; pnpm backlog:check passes"
check 5 "every check of every scripts/verify-S*.sh and verify-V*.sh is classed pinned or law in docs/v3/LAWS.md (laws enforced or proposed); no grader diffs a fixed base against the tree outside the story_* helpers"
check 6 "each grader edited after its story shipped is listed with its commits and either restored or kept with a reason"
check 7 "S60 re-verifies at its shipping commit with all 11 checks passing (ledger), and every done grader's result at its shipping commit is in the table"
check 8 "CLAUDE.md, .claude/skills/verify/SKILL.md and docs/v3/LOOP.md call a grader a commit-time proof and point to docs/v3/LAWS.md"
check 9 "backlog Status is done (story heading and Story status table)"

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
L="docs/v3/LAWS.md"
F="docs/v3/backlog/frame/00 Baseball Theater v3 — Checkable backlog.md"

# vault_test <check> <file> [-t pattern] — run one backlog-vault test file.
vault_test() {
  local id="$1" file="$2"; shift 2
  if [ ! -f "scripts/backlog-vault/$file" ]; then bad "$id" "scripts/backlog-vault/$file missing"; return; fi
  if ! pnpm exec vitest run --config scripts/backlog-vault/vitest.config.ts "$file" "$@" >"$TMP/v.log" 2>&1; then
    bad "$id" "$file $* failed:"; tail -15 "$TMP/v.log" | sed 's/^/        /'
  elif ! grep -qE '[1-9][0-9]* passed' "$TMP/v.log"; then
    bad "$id" "$file $* ran no passing test"
  fi
}

# --- Check 1: the two tiers in the contract ---------------------------------------------
awk '/^### Verify-script contract/{f=1} f&&/^### Story status/{exit} f' "$F" >"$TMP/contract.md"
for p in "commit-time proof" "docs/v3/LAWS.md" "never the base to HEAD" "owner decision"; do
  grep -qF "$p" "$TMP/contract.md" || bad 1 "the verify-script contract never says \"$p\""
done
grep -qF "story_diff" "$TMP/contract.md" || bad 1 "the contract does not name the story_diff helper"

# --- Check 2: pinned re-verification -----------------------------------------------------
grep -qF "git worktree add" scripts/audit.sh scripts/lib/*.sh 2>/dev/null || bad 2 "no git worktree add in audit.sh or scripts/lib/"
vault_test 2 audit-reverify.test.ts -t "reverify"

# --- Check 3: design verdicts on their own -----------------------------------------------
grep -qE '^  design\)' scripts/audit.sh || bad 3 "audit.sh has no design mode"
vault_test 3 audit-reverify.test.ts -t "design mode"
vault_test 3 audit-design-match.test.ts

# --- Check 4: the laws registry ----------------------------------------------------------
if [ -f "$L" ]; then
  for k in "bt/no-browser-storage" "bt/no-domain-arithmetic" "personal-data" "ApiRoutes" "pnpm size" "rule 21" "pnpm dup:check" "rule 22"; do
    grep -qF "$k" "$L" || bad 4 "$L never mentions $k"
  done
else
  bad 4 "$L missing"
fi
vault_test 4 laws.test.ts
pnpm -s backlog:check >"$TMP/bc.log" 2>&1 || { bad 4 "pnpm backlog:check fails:"; tail -5 "$TMP/bc.log" | sed 's/^/        /'; }

# --- Check 5: every grader's checks sorted; no base-to-tree diffs -------------------------
for g in scripts/verify-S*.sh scripts/verify-V*.sh; do
  gid="$(basename "$g" .sh | sed 's/^verify-//')"
  for c in $(grep -oE '^check [0-9a-z]+ "' "$g" | awk '{print $2}'); do
    grep -qE "^\| ${gid} \| ${c} \| .*\| (pinned|law) \|" "$L" 2>/dev/null || bad 5 "$L has no pinned/law row for $gid check $c"
  done
  if ! grep -qE '^check [0-9a-z]+ "' "$g"; then
    grep -qE "^\| ${gid} \| (all|—) \| .*\| (pinned|law) \|" "$L" 2>/dev/null || bad 5 "$L has no row for $gid (no declared checks)"
  fi
done
grep -E '^\| [SV][0-9]+ \| [0-9a-z—]+ \| .*\| law \|' "$L" 2>/dev/null | grep -vE 'enforced:|proposed:' >"$TMP/badlaw" || true
[ -s "$TMP/badlaw" ] && { bad 5 "law rows without 'enforced:' or 'proposed:':"; head -5 "$TMP/badlaw" | sed 's/^/        /'; }
# A base-to-HEAD diff guarded by "not shipped yet" (S15/S22's own pattern) is the story's own range too.
hits="$(grep -nE 'git diff[^|]*"\$(BASE|START|base)"( |$)' scripts/verify-*.sh | grep -v 'story_' | grep -vE '"\$base" HEAD' || true)"
[ -n "$hits" ] && { bad 5 "graders still diff a fixed base against the tree under test:"; echo "$hits" | sed 's/^/        /'; }
grep -qE '^story_diff\(\)' scripts/lib/checks.sh || bad 5 "scripts/lib/checks.sh has no story_diff helper"

# --- Check 6: post-ship grader edits -------------------------------------------------------
awk '/^## Graders edited after their story shipped/{f=1;next} /^## /{f=0} f' "$L" >"$TMP/edited.md" 2>/dev/null
for g in S14 S15 S22 S23 S55 V3; do
  grep -qE "^\| ${g} \| .*\| (restored|kept: .+) \|" "$TMP/edited.md" || bad 6 "$L does not account for verify-$g's post-ship edits (restored or kept: reason)"
done

# --- Check 7: re-verification at shipping commits -----------------------------------------
awk '/^## [0-9-]+ — S60 re-verified at /{f=1} f&&/^---$/{exit} f' docs/v3/AUDIT.md >"$TMP/s60.md"
[ -s "$TMP/s60.md" ] || bad 7 "no 'S60 re-verified at <sha>' entry in docs/v3/AUDIT.md"
grep -qF "11/11 checks passed" "$TMP/s60.md" || bad 7 "S60's re-verification did not pass all 11 checks"
awk '/^## Re-verified at shipping commits/{f=1;next} /^## /{f=0} f' "$L" >"$TMP/sweep.md" 2>/dev/null
for g in scripts/verify-S*.sh scripts/verify-V*.sh; do
  gid="$(basename "$g" .sh | sed 's/^verify-//')"
  grep -qE "^\| ${gid} \| \`[0-9a-f]{7,}\` \| " "$TMP/sweep.md" || grep -qE "^\| ${gid} \| (not shipped|no completion entry)" "$TMP/sweep.md" ||
    bad 7 "$L has no shipping-commit re-verification row for $gid"
done

# --- Check 8: the docs point at the laws -------------------------------------------------
for d in CLAUDE.md .claude/skills/verify/SKILL.md docs/v3/LOOP.md; do
  grep -qF "docs/v3/LAWS.md" "$d" || bad 8 "$d does not point to docs/v3/LAWS.md"
  grep -qiF "commit-time proof" "$d" || bad 8 "$d does not call a grader a commit-time proof"
done

# --- Check 9: backlog Status is done -----------------------------------------------------
grep -qE '^\| [0-9]+ \| \[S84\].*\| `done` \|$' docs/v3/BACKLOG.md ||
  bad 9 "S84 row in the Story status table is not \`done\`"
awk '/^### S84 —/{f=1;next} /^### S[0-9]/{f=0} f' docs/v3/BACKLOG.md \
  | grep -qE '^\*\*Status:\*\* `done`$' ||
  bad 9 "S84 story heading Status is not \`done\`"

report "verify-S84"
exit $?
