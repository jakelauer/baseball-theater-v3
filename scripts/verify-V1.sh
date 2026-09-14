#!/usr/bin/env bash
# Grader for vault migration stage V1 — generated read-only vault.
# Contract: docs/v3/VAULT-MIGRATION.md (V1) + docs/v3/BACKLOG.md#verify-script-contract
# No network. No writes outside a temp dir. Never runs `pnpm verify`.

set -uo pipefail
cd "$(dirname "$0")/.."

# shellcheck source=lib/checks.sh
source "$(dirname "$0")/lib/checks.sh"

# The commit V1 started from; invariant checks diff against it.
START="62cc1f9"

check 1 "backlog:vault --out writes one stories/S<N>.md per ### S<N> heading, same set"
check 2 "frontmatter fields present; priority/status match the table for every story; spot-checked optional fields"
check 3 "note body is the story section verbatim, with a generated banner"
check 4 "generator rejects table/section disagreement (colocated tests cover it)"
check 5 "generated files are read-only; two runs are byte-identical"
check 6 "Backlog.base defines a table view sorted by priority; Baseline.md holds the baseline table"
check 7 ".backlog-vault/ is gitignored"
check 8 "husky post-commit/post-merge/post-checkout run the generator and never fail git"
check 9 "audit.sh honors BT_AUDIT_LEDGER / BT_AUDIT_BACKLOG with unchanged defaults"
check 10 "scripts/backlog-vault vitest suite exits 0"
check 11 "BACKLOG.md and scripts/verify-S*.sh unchanged since stage start"
check 12 "eslint passes on scripts/backlog-vault"

B=docs/v3/BACKLOG.md
TMP="$(mktemp -d -t verify-V1)"
trap 'chmod -R u+w "$TMP" 2>/dev/null; rm -rf "$TMP"' EXIT
OUT="$TMP/vault"

# --- Check 1: one note per story -----------------------------------------------
gen_exit=1
if grep -qE '"backlog:vault"' package.json; then
  pnpm -s backlog:vault --out "$OUT" >"$TMP/gen.log" 2>&1
  gen_exit=$?
  [ "$gen_exit" -eq 0 ] || bad 1 "pnpm backlog:vault --out exited $gen_exit: $(tail -3 "$TMP/gen.log")"
else
  bad 1 "root package.json has no backlog:vault script"
fi

expected_ids="$(grep -oE '^### S[0-9]+ —' "$B" | grep -oE 'S[0-9]+' | sort)"
if [ "$gen_exit" -eq 0 ]; then
  actual_ids="$(ls "$OUT/stories" 2>/dev/null | sed -n 's/^\(S[0-9]*\)\.md$/\1/p' | sort)"
  [ "$expected_ids" = "$actual_ids" ] ||
    bad 1 "story notes differ from headings: expected $(echo $expected_ids | wc -w | tr -d ' '), got $(echo $actual_ids | wc -w | tr -d ' ')"
fi

# fm <file> <key> — the raw value of a top-level frontmatter key.
fm() {
  awk -v k="$2" 'NR==1 && $0=="---" {f=1; next} f && $0=="---" {exit} f && index($0, k": ")==1 {print substr($0, length(k)+3); exit}' "$1"
}

# --- Check 2: frontmatter --------------------------------------------------------
if [ "$gen_exit" -eq 0 ]; then
  for id in $expected_ids; do
    note="$OUT/stories/$id.md"
    [ -f "$note" ] || continue
    for key in id title priority status order section depends_on prefer_after turn_cap scope_files; do
      awk 'NR==1 && $0=="---" {f=1; next} f && $0=="---" {exit} f {print}' "$note" | grep -qE "^${key}:" ||
        bad 2 "$id note has no '$key' frontmatter"
    done
    row="$(grep -m1 -E "^\| [0-9]+ \| \[${id}\]" "$B")"
    t_pri="$(echo "$row" | awk -F' \\| ' '{print $1}' | tr -d '| ')"
    t_status="$(echo "$row" | grep -oE '`[a-z]+` \|$' | tr -d '`| ')"
    [ "$(fm "$note" priority)" = "$t_pri" ] || bad 2 "$id priority '$(fm "$note" priority)' != table '$t_pri'"
    [ "$(fm "$note" status | tr -d '"')" = "$t_status" ] || bad 2 "$id status '$(fm "$note" status)' != table '$t_status'"
  done

  s26="$OUT/stories/S26.md"
  s1="$OUT/stories/S1.md"
  s2="$OUT/stories/S2.md"
  if [ -f "$s26" ] && [ -f "$s1" ] && [ -f "$s2" ]; then
    s26_order="$(grep -E '^### S[0-9]+ —' "$B" | grep -nE '^### S26 —' | cut -d: -f1)"
    [ "$(fm "$s26" order)" = "$s26_order" ] || bad 2 "S26 order '$(fm "$s26" order)' != position $s26_order"
    fm "$s26" depends_on | grep -qF '[[S21]]' || bad 2 "S26 depends_on lacks [[S21]]"
    [ "$(fm "$s26" turn_cap)" = "16" ] || bad 2 "S26 turn_cap '$(fm "$s26" turn_cap)' != 16 (Turn cap line)"
    fm "$s26" scope_files | grep -qF 'packages/domain/' || bad 2 "S26 scope_files lacks packages/domain/"
    [ "$(fm "$s26" prefer_after)" = "[]" ] || bad 2 "S26 prefer_after should be [] (no Prefer after line)"
    [ "$(fm "$s1" depends_on)" = "[]" ] || bad 2 "S1 depends_on should be []"
    [ "$(fm "$s1" turn_cap)" = "8" ] || bad 2 "S1 turn_cap '$(fm "$s1" turn_cap)' != 8 (Goal condition fallback)"
    fm "$s2" prefer_after | grep -qF '[[S21]]' || bad 2 "S2 prefer_after lacks [[S21]]"
    fm "$OUT/stories/S11.md" section | grep -qF 'Data platform' || bad 2 "S11 section should be the Data platform heading"
  else
    bad 2 "S1/S2/S26 notes missing"
  fi
else
  bad 2 "generator did not run"
fi

# --- Check 3: verbatim body ------------------------------------------------------
if [ "$gen_exit" -eq 0 ] && [ -f "$OUT/stories/S26.md" ]; then
  awk '/^### S26 —/{f=1; next} f && (/^---$/ || /^## / || /^### /){exit} f' "$B" |
    sed -e :a -e '/^\n*$/{$d;N;ba' -e '}' >"$TMP/expected-S26.md"
  awk 'NR==1 && $0=="---" {fm=1; next} fm && $0=="---" {fm=0; next} !fm' "$OUT/stories/S26.md" >"$TMP/body-S26.md"
  grep -qiE 'generated.*docs/v3/BACKLOG\.md' "$TMP/body-S26.md" || bad 3 "S26 note has no generated banner naming docs/v3/BACKLOG.md"
  # Body must contain the expected section as one contiguous block.
  node -e '
    const fs = require("fs");
    const [exp, body] = process.argv.slice(1).map((p) => fs.readFileSync(p, "utf8"));
    process.exit(body.includes(exp.replace(/\n+$/, "")) ? 0 : 1);
  ' "$TMP/expected-S26.md" "$TMP/body-S26.md" || bad 3 "S26 note body does not contain its BACKLOG section verbatim"
else
  bad 3 "no S26 note to compare"
fi

# --- Check 4: disagreement rejected ------------------------------------------------
VITEST_CFG="scripts/backlog-vault/vitest.config.ts"
ls scripts/backlog-vault/*.test.ts >/dev/null 2>&1 || bad 4 "no colocated tests under scripts/backlog-vault/"
grep -lqE 'not in the (status )?table|missing from the (status )?table|status mismatch|disagree' scripts/backlog-vault/*.test.ts 2>/dev/null ||
  bad 4 "no test covering table/section disagreement"

# --- Check 5: read-only, deterministic --------------------------------------------
if [ "$gen_exit" -eq 0 ] && [ -f "$OUT/stories/S1.md" ]; then
  [ -w "$OUT/stories/S1.md" ] && bad 5 "stories/S1.md is writable"
  [ -w "$OUT/Backlog.base" ] && bad 5 "Backlog.base is writable"
  (cd "$OUT" && find . -type f -not -path './.obsidian/*' -exec shasum {} + | sort) >"$TMP/run1.sum"
  pnpm -s backlog:vault --out "$OUT" >"$TMP/gen2.log" 2>&1 || bad 5 "second run exited nonzero: $(tail -3 "$TMP/gen2.log")"
  (cd "$OUT" && find . -type f -not -path './.obsidian/*' -exec shasum {} + | sort) >"$TMP/run2.sum"
  cmp -s "$TMP/run1.sum" "$TMP/run2.sum" || bad 5 "second run output differs from first"
else
  bad 5 "generator did not run"
fi

# --- Check 6: Bases view + baseline ----------------------------------------------
if [ -f "$OUT/Backlog.base" ]; then
  grep -qE 'type: *table' "$OUT/Backlog.base" || bad 6 "Backlog.base has no table view"
  grep -qE 'priority' "$OUT/Backlog.base" || bad 6 "Backlog.base does not reference priority"
  grep -qiE 'ASC|direction' "$OUT/Backlog.base" || bad 6 "Backlog.base has no sort"
else
  bad 6 "no Backlog.base"
fi
if [ -f "$OUT/Baseline.md" ]; then
  grep -qF '| MLB Stats API live client |' "$OUT/Baseline.md" || bad 6 "Baseline.md lacks the baseline table rows"
else
  bad 6 "no Baseline.md"
fi

# --- Check 7: gitignored -------------------------------------------------------------
git check-ignore -q .backlog-vault/stories/S1.md || bad 7 ".backlog-vault/ is not gitignored"

# --- Check 8: husky hooks --------------------------------------------------------------
for hook in post-commit post-merge post-checkout; do
  f=".husky/$hook"
  if [ ! -f "$f" ]; then
    bad 8 "$f missing"
    continue
  fi
  grep -qE 'backlog:vault|backlog-vault' "$f" || bad 8 "$f does not run the generator"
  grep -qE '\|\| *(true|echo)|exit 0' "$f" || bad 8 "$f does not guard against generator failure"
done

# --- Check 9: audit.sh overrides ------------------------------------------------------
grep -qE 'LEDGER="\$\{BT_AUDIT_LEDGER:-docs/v3/AUDIT\.md\}"' scripts/audit.sh || bad 9 "audit.sh LEDGER does not default BT_AUDIT_LEDGER to docs/v3/AUDIT.md"
grep -qE 'BT_AUDIT_BACKLOG:-docs/v3/BACKLOG\.md' scripts/audit.sh || bad 9 "audit.sh title lookup does not default BT_AUDIT_BACKLOG to docs/v3/BACKLOG.md"
grep -qE '^\s*TITLE=.*docs/v3/BACKLOG\.md' scripts/audit.sh && bad 9 "audit.sh still hard-codes docs/v3/BACKLOG.md in the title lookup"

# --- Check 10: tests ---------------------------------------------------------------------
if [ -f "$VITEST_CFG" ]; then
  pnpm exec vitest run --config "$VITEST_CFG" >"$TMP/vitest.log" 2>&1 || bad 10 "vitest failed: $(tail -5 "$TMP/vitest.log")"
else
  bad 10 "$VITEST_CFG missing"
fi

# --- Check 11: invariants -----------------------------------------------------------------
git diff --quiet "$START" -- "$B" || bad 11 "$B changed since $START"
git diff --quiet "$START" -- 'scripts/verify-S*.sh' || bad 11 "a scripts/verify-S*.sh changed since $START"

# --- Check 12: lint -------------------------------------------------------------------------
if [ -d scripts/backlog-vault ]; then
  pnpm exec eslint scripts/backlog-vault >"$TMP/eslint.log" 2>&1 || bad 12 "eslint failed: $(tail -5 "$TMP/eslint.log")"
else
  bad 12 "scripts/backlog-vault missing"
fi

report "verify-V1"
exit $?
