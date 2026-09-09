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
