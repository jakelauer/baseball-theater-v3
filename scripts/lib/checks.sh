#!/usr/bin/env bash
# Shared check bookkeeping for the `scripts/verify-<ID>.sh` graders.
#
# Graders used to print only failures, so a passing run left no record of what
# was actually checked. Each grader now declares its checks up front with
# `check <id> "<description>"`, calls `bad <id> "<reason>"` on failure, and ends
# with `report`, which prints one PASS/FAIL line per declared check. That output
# is what `scripts/audit.sh` captures into `docs/v3/audit/<ID>.md`.
#
# Sourced, not executed. The grader owns `cd` and its own exit.

# Parallel arrays indexed by check id (bash 3.2 on macOS has no assoc arrays).
CHECK_DESC=()
CHECK_FAIL=()
CHECK_ORDER=()
fail=0

# check <id> <description> — declare a check so it is reported even when it passes.
check() {
  CHECK_DESC[$1]="$2"
  CHECK_FAIL[$1]=0
  CHECK_ORDER+=("$1")
}

# bad <id> <reason> — record a failure against a declared check.
bad() {
  CHECK_FAIL[$1]=1
  fail=1
  echo "FAIL check $1: $2"
}

# report <grader-id> — per-check results plus a machine-readable tally.
# Returns the grader's intended exit status.
report() {
  local grader="$1"
  local id status passed=0 failed=0

  echo
  echo "--- ${grader} check results ---"
  for id in "${CHECK_ORDER[@]}"; do
    if [ "${CHECK_FAIL[$id]:-0}" -eq 0 ]; then
      status="PASS"
      passed=$((passed + 1))
    else
      status="FAIL"
      failed=$((failed + 1))
    fi
    echo "check ${id} ${status}: ${CHECK_DESC[$id]}"
  done

  echo "--- ${grader}: ${passed}/$((passed + failed)) checks passed ---"
  if [ "$fail" -eq 0 ]; then
    echo "${grader}: all checks passed"
  fi
  return "$fail"
}

# --- A grader proves its own story (S84; owner, 2026-10-28) --------------------------
# A grader is a commit-time proof: its "this story didn't change X" checks look only at
# the story's own commits, so a later story that legitimately changes X can't turn it
# red. Before the story is committed that is <base> → the working tree; once shipped it
# is <base> → the story's shipping commit (the newest commit whose subject starts
# "<ID>: "), wherever the grader runs. Checks that must hold forever are laws
# (docs/v3/LAWS.md), run by `pnpm verify`, not by graders.

# story_tip <ID> — the story's shipping commit, or nothing while it is unshipped.
story_tip() {
  git log --format=%H -1 --grep="^$1: " HEAD 2>/dev/null
}

# story_diff <ID> <base> [git diff options…] [-- <paths>…] — `git diff` over the story's own changes.
story_diff() {
  local id="$1" base="$2" tip opts=() paths=()
  shift 2
  while [ $# -gt 0 ] && [ "$1" != "--" ]; do opts+=("$1"); shift; done
  [ "${1:-}" = "--" ] && { shift; paths=("$@"); }
  tip="$(story_tip "$id")"
  if [ -n "$tip" ]; then
    git diff ${opts[@]+"${opts[@]}"} "$base" "$tip" -- ${paths[@]+"${paths[@]}"}
  else
    git diff ${opts[@]+"${opts[@]}"} "$base" -- ${paths[@]+"${paths[@]}"}
  fi
}

# story_changed_files <ID> <base> <paths>… — files the story added or edited under <paths>
# (its own diff, plus untracked files while it is unshipped).
story_changed_files() {
  local id="$1" base="$2"
  shift 2
  {
    story_diff "$id" "$base" --name-only -- "$@"
    [ -z "$(story_tip "$id")" ] && git ls-files --others --exclude-standard -- "$@"
  } | sort -u
}
