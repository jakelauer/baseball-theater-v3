#!/usr/bin/env bash
# Re-verify every story's grader at its shipping commit (S84 AC 7) and print one
# markdown table row per grader for docs/v3/LAWS.md's "Re-verified at shipping commits".
# Each run is today's grader in a temporary worktree at the commit its ledger entry
# names (scripts/lib/reverify.sh). Slow: one offline install and one grader run each.
#
#   scripts/reverify-all.sh [ID…]      # all scripts/verify-*.sh when no IDs are given
#
# Writes only to /tmp and the temporary worktrees; never to the ledger.

set -uo pipefail
cd "$(dirname "$0")/.."
# shellcheck source=lib/reverify.sh
source scripts/lib/reverify.sh

ids=("$@")
if [ ${#ids[@]} -eq 0 ]; then
  for g in scripts/verify-*.sh; do ids+=("$(basename "$g" .sh | sed 's/^verify-//')"); done
fi

today="$(date +%Y-%m-%d)"
for id in "${ids[@]}"; do
  case "$id" in
    V*) ledger="docs/v3/VAULT-MIGRATION-AUDIT.md" ;;
    *) ledger="docs/v3/AUDIT.md" ;;
  esac
  ship="$(shipping_commit "$ledger" "$id")"
  if [ -z "$ship" ]; then
    echo "| ${id} | no completion entry | — | ${today} |"
    continue
  fi
  log="$(mktemp -t "reverify-${id}")"
  reverify_at "$ship" "scripts/verify-${id}.sh" "$log"
  rc=$?
  tally="$(grep -E -- "^--- (verify-)?${id}: [0-9]+/[0-9]+ checks passed ---$" "$log" | sed -E 's/^--- [^:]+: (.*) ---$/\1/')"
  result="exit ${rc}${tally:+, ${tally}}"
  if [ "$rc" -ne 0 ]; then
    fails="$(grep -E '^check [0-9a-z]+ FAIL' "$log" | awk '{print $2}' | tr '\n' ',' | sed 's/,$//')"
    [ -n "$fails" ] && result="${result}; failing: ${fails}"
    cp "$log" "/tmp/reverify-${id}.log"
  fi
  echo "| ${id} | \`${ship}\` | ${result} | ${today} |"
  rm -f "$log"
done
