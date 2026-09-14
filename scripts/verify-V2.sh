#!/usr/bin/env bash
# Grader for vault migration stage V2 — byte-identical round trip.
# Contract: docs/v3/VAULT-MIGRATION.md (V2) + docs/v3/BACKLOG.md#verify-script-contract
# No network. No writes outside a temp dir. Never runs `pnpm verify`.

set -uo pipefail
cd "$(dirname "$0")/.."

# shellcheck source=lib/checks.sh
source "$(dirname "$0")/lib/checks.sh"

# The commit V2 started from; invariant checks diff against it.
START="c3b8380"

check 1 "--roundtrip --to assembles BACKLOG.md byte-identically (grader's own cmp)"
check 2 "round trip is byte-identical for BACKLOG.md at the last 5 commits that touched it"
check 3 "status table and bodies come from the notes: tampered priority re-sorts the row, tampered body line appears"
check 4 "any BACKLOG.md change since stage start is whitespace-only"
check 5 "grader-matched lines (status rows, story headings, Status lines) and verify-S*.sh unchanged"
check 6 "vitest suite exits 0 and includes a round-trip test"
check 7 "eslint passes on scripts/backlog-vault"

B=docs/v3/BACKLOG.md
TMP="$(mktemp -d -t verify-V2)"
trap 'chmod -R u+w "$TMP" 2>/dev/null; rm -rf "$TMP"' EXIT

has_flag() { grep -qE -- "$1" scripts/backlog-vault/cli.ts 2>/dev/null; }

# --- Check 1: round trip at HEAD --------------------------------------------------
if has_flag 'roundtrip'; then
  pnpm -s backlog:vault --roundtrip --to "$TMP/head.md" >"$TMP/rt.log" 2>&1 ||
    bad 1 "--roundtrip exited nonzero: $(tail -5 "$TMP/rt.log")"
  if [ -f "$TMP/head.md" ]; then
    cmp -s "$TMP/head.md" "$B" || bad 1 "assembled file differs from $B: $(cmp "$TMP/head.md" "$B" 2>&1)"
  else
    bad 1 "--roundtrip did not write --to file"
  fi
else
  bad 1 "cli.ts has no --roundtrip"
fi

# --- Check 2: history ----------------------------------------------------------------
if has_flag 'roundtrip'; then
  n=0
  for sha in $(git log --format=%h -5 -- "$B"); do
    n=$((n + 1))
    git show "$sha:$B" >"$TMP/src-$sha.md"
    pnpm -s backlog:vault --backlog "$TMP/src-$sha.md" --roundtrip --to "$TMP/out-$sha.md" >"$TMP/rt-$sha.log" 2>&1 ||
      bad 2 "$sha: --roundtrip exited nonzero: $(tail -3 "$TMP/rt-$sha.log")"
    cmp -s "$TMP/out-$sha.md" "$TMP/src-$sha.md" 2>/dev/null || bad 2 "$sha: assembled output differs from source"
  done
  [ "$n" -eq 5 ] || bad 2 "expected 5 commits touching $B, found $n"
else
  bad 2 "cli.ts has no --roundtrip"
fi

# --- Check 3: tamper -------------------------------------------------------------------
if has_flag 'from-vault'; then
  V="$TMP/vault"
  pnpm -s backlog:vault --out "$V" >/dev/null 2>&1 || bad 3 "could not render vault"
  note="$V/stories/S26.md"
  if [ -f "$note" ] && ls "$V"/frame/*.md >/dev/null 2>&1; then
    chmod u+w "$note"
    marker="GRADER-V2-TAMPER-LINE"
    # priority 15 -> 99 (sorts last); first Gap: line gains a marker.
    sed -i.bak -e 's/^priority: 15$/priority: 99/' -e "s/^\*\*Gap:\*\* /**Gap:** ${marker} /" "$note"
    grep -q '^priority: 99$' "$note" || bad 3 "S26 note had no 'priority: 15' to tamper"
    pnpm -s backlog:vault --from-vault "$V" --to "$TMP/tampered.md" >"$TMP/tamper.log" 2>&1 ||
      bad 3 "--from-vault exited nonzero: $(tail -3 "$TMP/tampered.log" 2>/dev/null; tail -3 "$TMP/tamper.log")"
    if [ -f "$TMP/tampered.md" ]; then
      last_row="$(grep -E '^\| [0-9]+ \| \[S[0-9]+\]' "$TMP/tampered.md" | tail -1)"
      echo "$last_row" | grep -qE '^\| 99 \| \[S26\]' || bad 3 "tampered S26 row is not last in the table: '$last_row'"
      grep -qE '^\| 15 \| \[S26\]' "$TMP/tampered.md" && bad 3 "old priority-15 S26 row still present"
      awk '/^### S26 —/{f=1; next} /^### S[0-9]/{f=0} f' "$TMP/tampered.md" | grep -qF "$marker" ||
        bad 3 "tampered body line did not reach the S26 section"
    else
      bad 3 "--from-vault did not write --to file"
    fi
  else
    bad 3 "rendered vault lacks stories/S26.md or frame/*.md"
  fi
else
  bad 3 "cli.ts has no --from-vault"
fi

# --- Check 4: whitespace-only edits ------------------------------------------------------
[ -z "$(git diff -w --ignore-blank-lines "$START" -- "$B")" ] || bad 4 "$B has non-whitespace changes since $START"

# --- Check 5: invariant lines ----------------------------------------------------------------
pattern='^\| [0-9]+ \| \[S[0-9]+\]|^### S[0-9]+ —|^\*\*Status:\*\* '
git show "$START:$B" | grep -E "$pattern" >"$TMP/inv-start.txt"
grep -E "$pattern" "$B" >"$TMP/inv-now.txt"
cmp -s "$TMP/inv-start.txt" "$TMP/inv-now.txt" || bad 5 "grader-matched lines in $B changed since $START"
git diff --quiet "$START" -- 'scripts/verify-S*.sh' || bad 5 "a scripts/verify-S*.sh changed since $START"

# --- Check 6: tests ----------------------------------------------------------------------------
grep -lqiE 'round.?trip' scripts/backlog-vault/*.test.ts 2>/dev/null || bad 6 "no round-trip test in scripts/backlog-vault/*.test.ts"
pnpm exec vitest run --config scripts/backlog-vault/vitest.config.ts >"$TMP/vitest.log" 2>&1 || bad 6 "vitest failed: $(tail -5 "$TMP/vitest.log")"

# --- Check 7: lint -------------------------------------------------------------------------------
pnpm exec eslint scripts/backlog-vault >"$TMP/eslint.log" 2>&1 || bad 7 "eslint failed: $(tail -5 "$TMP/eslint.log")"

report "verify-V2"
exit $?
