#!/usr/bin/env bash
# Grader for vault migration stage V3 — story files become the source.
# Contract: docs/v3/VAULT-MIGRATION.md (V3) + docs/v3/BACKLOG.md#verify-script-contract
# No network. No writes outside a temp dir. Never runs `pnpm verify`.

set -uo pipefail
cd "$(dirname "$0")/.."

# shellcheck source=lib/checks.sh
source "$(dirname "$0")/lib/checks.sh"

# The commit V3 started from.
START="f321c32"

check 1 "one note per story ID, frame notes present, backlog:check exits 0"
check 2 "temp copy: status edit fails check, build updates table row + Status line, Obsidian-style frontmatter normalizes"
check 3 "story note bodies carry no ### heading and no **Status:** line"
check 4 "lint runs backlog:check, test:coverage runs test:backlog (so verify + CI do); ci.yml unchanged"
check 5 "every verify-S*.sh exits 0; audit.sh S26 reverify works; done stories' grader-matched BACKLOG lines unchanged"
check 6 "rules 5/13/17, CLAUDE.md, both skills name docs/v3/backlog/ + backlog:build; no hand-sorting instruction"
check 7 "pre-commit builds + guards; V1 hooks/script/.backlog-vault references gone; .obsidian ignored"
check 8 "CHANGELOG.md mentions the Obsidian backlog"
check 9 "eslint and test:backlog pass"
check 10 "a backlog review entry landed after the V3 work commit"

B=docs/v3/BACKLOG.md
N=docs/v3/backlog
TMP="$(mktemp -d -t verify-V3)"
trap 'chmod -R u+w "$TMP" 2>/dev/null; rm -rf "$TMP"' EXIT

has_script() { node -e 'process.exit(require("./package.json").scripts?.[process.argv[1]] ? 0 : 1)' "$1"; }

# --- Check 1: notes exist and are in sync ------------------------------------------
expected_ids="$(grep -oE '^### S[0-9]+ —' "$B" | grep -oE 'S[0-9]+' | sort)"
actual_ids="$(ls "$N/stories" 2>/dev/null | sed -n 's/^\(S[0-9]*\)\.md$/\1/p' | sort)"
{ [ -n "$actual_ids" ] && [ "$expected_ids" = "$actual_ids" ]; } || bad 1 "story notes under $N/stories do not match the story IDs in $B"
ls "$N"/frame/*.md >/dev/null 2>&1 || bad 1 "no frame notes under $N/frame"
if has_script backlog:check; then
  pnpm -s backlog:check >"$TMP/check.log" 2>&1 || bad 1 "backlog:check exited nonzero: $(tail -3 "$TMP/check.log")"
else
  bad 1 "no backlog:check script"
fi

# --- Check 2: edit → check fails → build → check passes -------------------------------
if has_script backlog:build && has_script backlog:check && [ -f "$N/stories/S26.md" ]; then
  cp -R "$N" "$TMP/notes"
  cp "$B" "$TMP/BACKLOG.md"
  chmod -R u+w "$TMP/notes"
  args=(--dir "$TMP/notes" --backlog "$TMP/BACKLOG.md")
  note="$TMP/notes/stories/S26.md"

  sed -i.bak 's/^status: done$/status: blocked/' "$note" && rm -f "$note.bak"
  grep -q '^status: blocked$' "$note" || bad 2 "S26 note has no 'status: done' line to edit"
  pnpm -s backlog:check "${args[@]}" >/dev/null 2>&1 && bad 2 "backlog:check passed after a status edit without build"
  pnpm -s backlog:build "${args[@]}" >"$TMP/build.log" 2>&1 || bad 2 "backlog:build failed: $(tail -3 "$TMP/build.log")"
  grep -qE '^\| [0-9]+ \| \[S26\].*\| `blocked` \|$' "$TMP/BACKLOG.md" || bad 2 "rebuilt table row for S26 is not blocked"
  awk '/^### S26 —/{f=1; next} /^### S[0-9]/{f=0} f' "$TMP/BACKLOG.md" | grep -qE '^\*\*Status:\*\* `blocked`$' ||
    bad 2 "rebuilt S26 section Status line is not blocked"
  pnpm -s backlog:check "${args[@]}" >/dev/null 2>&1 || bad 2 "backlog:check still failing after build"

  # Obsidian rewrites frontmatter on property edits: block lists, unquoted strings.
  node -e '
    const fs = require("fs");
    const p = process.argv[1];
    const s = fs.readFileSync(p, "utf8")
      .replace(/^title: "(.*)"$/m, "title: $1")
      .replace(/^scope_files: \[(.*)\]$/m, (_, items) => "scope_files:\n" + items.split(", ").map((i) => "  - " + i).join("\n"));
    fs.writeFileSync(p, s);
  ' "$note"
  grep -qE '^scope_files:$' "$note" || bad 2 "could not rewrite S26 frontmatter in Obsidian style (unexpected format)"
  cp "$TMP/BACKLOG.md" "$TMP/before-obsidian.md"
  pnpm -s backlog:build "${args[@]}" >"$TMP/build2.log" 2>&1 || bad 2 "build failed on Obsidian-style frontmatter: $(tail -3 "$TMP/build2.log")"
  cmp -s "$TMP/BACKLOG.md" "$TMP/before-obsidian.md" || bad 2 "Obsidian-style frontmatter changed the built BACKLOG.md"
  pnpm -s backlog:check "${args[@]}" >/dev/null 2>&1 || bad 2 "build did not normalize Obsidian-style frontmatter"
else
  bad 2 "backlog:build / backlog:check / S26 note missing"
fi

# --- Check 3: no duplicated facts in note bodies -------------------------------------
if [ -d "$N/stories" ]; then
  dups="$(grep -lE '^### S[0-9]+ —|^\*\*Status:\*\*' "$N"/stories/*.md 2>/dev/null)"
  [ -z "$dups" ] || bad 3 "notes still carry a heading or Status line: $(echo $dups)"
else
  bad 3 "no $N/stories"
fi

# --- Check 4: verify + CI (amended mid-stage: through package scripts, ci.yml untouched) ---
script_of() { node -e 'console.log(require("./package.json").scripts?.[process.argv[1]] ?? "")' "$1"; }
script_of lint | grep -q 'backlog:check' || bad 4 "lint does not run backlog:check"
script_of test:coverage | grep -q 'test:backlog' || bad 4 "test:coverage does not run test:backlog"
has_script test:backlog || bad 4 "no test:backlog script"
script_of verify | grep -q 'pnpm lint' || bad 4 "verify does not run pnpm lint"
script_of verify | grep -q 'pnpm test:coverage' || bad 4 "verify does not run pnpm test:coverage"
CI=.github/workflows/ci.yml
grep -q 'run: pnpm lint$' "$CI" || bad 4 "ci.yml no longer runs pnpm lint"
grep -q 'run: pnpm test:coverage$' "$CI" || bad 4 "ci.yml no longer runs pnpm test:coverage"
{ git diff --quiet "$START" -- "$CI" && git diff --quiet -- "$CI"; } || bad 4 "ci.yml changed since $START"

# --- Check 5: nothing downstream broke --------------------------------------------------
# S22 exited 1 at $START (check 8 diffed web/ across the whole branch); its check was pinned
# to S22's own commit afterwards, so every grader is now expected to pass.
for g in scripts/verify-S*.sh; do
  want=0
  "$g" >"$TMP/g.log" 2>&1
  got=$?
  [ "$got" -eq "$want" ] || bad 5 "$g exited $got, was $want at $START"
done
cp docs/v3/AUDIT.md "$TMP/ledger.md"
BT_AUDIT_LEDGER="$TMP/ledger.md" scripts/audit.sh story S26 --reverify --no-verify >"$TMP/audit.log" 2>&1 ||
  bad 5 "audit.sh S26 reverify failed: $(tail -3 "$TMP/audit.log")"
# Old graders grep the lines of stories that were already `done`: their status row (priority
# number included), their heading, and the heading that follows it. Those must not move; the
# backlog may otherwise grow (new stories, re-prioritized `todo` rows).
git show "$START:$B" >"$TMP/start.md"
done_ids="$(grep -oE '^\| [0-9]+ \| \[S[0-9]+\].*\| `done` \|$' "$TMP/start.md" | grep -oE '\[S[0-9]+\]' | tr -d '[]')"
for id in $done_ids; do
  for f in "$TMP/start.md" "$B"; do
    grep -E "^\| [0-9]+ \| \[$id\]" "$f"
    awk -v h="^### $id —" '$0 ~ h {print; f=1; next} f && /^### S[0-9]+ —/ {print; exit}' "$f"
    awk -v h="^### $id —" '$0 ~ h {f=1; next} f && /^### S[0-9]/ {exit} f && /^\*\*Status:\*\* /' "$f"
  done >"$TMP/pair.txt"
  n=$(wc -l <"$TMP/pair.txt"); half=$((n / 2))
  [ "$(head -n "$half" "$TMP/pair.txt")" = "$(tail -n "$half" "$TMP/pair.txt")" ] ||
    bad 5 "$id: its status row, heading, next heading, or Status line in $B changed since $START"
done

# --- Check 6: rules and docs point at the notes -------------------------------------------
# A numbered rule plus its indented continuation lines.
rule_text() {
  awk -v r="$1" '
    $0 ~ "^" r "\\. " { f = 1; print; next }
    f && /^ +[^ ]/ { print; next }
    f && /^$/ { next }
    f { exit }
  ' "$B"
}
for rule in 5 13 17; do
  item="$(rule_text "$rule")"
  if [ -z "$item" ]; then
    bad 6 "rule $rule not found in $B"
    continue
  fi
  echo "$item" | grep -q 'docs/v3/backlog/' || bad 6 "rule $rule does not name docs/v3/backlog/"
  echo "$item" | grep -q 'backlog:build' || bad 6 "rule $rule does not name backlog:build"
done
for f in CLAUDE.md .claude/skills/backlog-review/SKILL.md .claude/skills/verify/SKILL.md; do
  grep -q 'docs/v3/backlog/' "$f" || bad 6 "$f does not name docs/v3/backlog/"
  grep -q 'backlog:build' "$f" || bad 6 "$f does not name backlog:build"
done
hits="$(grep -nE 'sort(ed)? by \*\*Priority\*\*|keep this table sorted|Re-sort the \*\*Story status\*\*' "$B" CLAUDE.md .claude/skills/backlog-review/SKILL.md .claude/skills/verify/SKILL.md)"
[ -z "$hits" ] || bad 6 "hand-sorting instructions remain: $hits"

# --- Check 7: hooks and leftovers ------------------------------------------------------------
grep -qE 'backlog-vault/cli\.ts (build|pre-commit)|backlog:build' .husky/pre-commit 2>/dev/null || bad 7 ".husky/pre-commit does not run the build"
grep -qiE 'generated' .husky/pre-commit 2>/dev/null || bad 7 ".husky/pre-commit has no hand-edit guard"
for h in post-commit post-merge post-checkout; do
  [ -e ".husky/$h" ] && bad 7 ".husky/$h still exists"
done
has_script backlog:vault && bad 7 "backlog:vault script still exists"
refs="$(git grep -lF '.backlog-vault' -- . ':!docs/v3/VAULT-MIGRATION.md' ':!docs/v3/VAULT-MIGRATION-AUDIT.md' ':!scripts/verify-V1.sh' ':!scripts/verify-V2.sh' ':!scripts/verify-V3.sh')"
[ -z "$refs" ] || bad 7 ".backlog-vault still referenced in: $(echo $refs)"
git check-ignore -q docs/v3/backlog/.obsidian/workspace.json || bad 7 "docs/v3/backlog/.obsidian/ is not ignored"

# --- Check 8: changelog ------------------------------------------------------------------------
grep -qi 'obsidian' CHANGELOG.md || bad 8 "CHANGELOG.md does not mention Obsidian"

# --- Check 9: lint + tests -----------------------------------------------------------------------
pnpm exec eslint scripts/backlog-vault >"$TMP/eslint.log" 2>&1 || bad 9 "eslint failed: $(tail -5 "$TMP/eslint.log")"
if has_script test:backlog; then
  pnpm -s test:backlog >"$TMP/vitest.log" 2>&1 || bad 9 "test:backlog failed: $(tail -5 "$TMP/vitest.log")"
else
  bad 9 "no test:backlog script"
fi

# --- Check 10: the review ran after the work commit ------------------------------------------------
work="$(git log --format=%H -1 --grep='^V3: ' "$START"..HEAD)"
if [ -z "$work" ]; then
  bad 10 "no 'V3: ' work commit after $START yet"
else
  git diff "$work" -- docs/v3/AUDIT.md | grep -qE '^\+## [0-9-]+ — backlog review' ||
    bad 10 "no backlog review entry added to docs/v3/AUDIT.md since V3 work commit ${work:0:7}"
fi

report "verify-V3"
exit $?
