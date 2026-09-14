#!/usr/bin/env bash
# Append an entry to the verification ledger, docs/v3/AUDIT.md.
#
# Story entries record exactly what a story's grader checked and the commit the
# story shipped in. Review entries record every backlog review pass.
#
#   scripts/audit.sh story S13                    # completion: grader + pnpm verify
#   scripts/audit.sh story S13 --reverify         # later re-run of a shipped story
#   scripts/audit.sh story S11 --backfill --commit c375ad5 --no-verify
#   scripts/audit.sh review --trigger "3 done since last review" \
#                    --since "S23, S21, S13" --verdict amended --findings "..."
#   scripts/audit.sh review --verdict continue --trigger manual --findings -
#
# Flags: --commit <sha> names the shipping commit; --no-verify skips the repo-wide
# pnpm verify for entries covered by another run; --findings - reads stdin.
#
# Unlike a grader this DOES write to the working tree — that is its whole job.
# It never fabricates results: every check line in a story entry comes from a
# real grader run captured here. A story is not done until its ledger entry is
# committed alongside the code.
#
# Prints a commit-message summary block to stdout on completion.

set -uo pipefail
cd "$(dirname "$0")/.."

# Overridable for a separate backlog + ledger (docs/v3/VAULT-MIGRATION.md).
LEDGER="${BT_AUDIT_LEDGER:-docs/v3/AUDIT.md}"
BACKLOG="${BT_AUDIT_BACKLOG:-docs/v3/BACKLOG.md}"
STAMP="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
TODAY="$(date +"%Y-%m-%d")"
HEAD_SHA="$(git rev-parse --short HEAD)"

if [ -n "$(git status --porcelain)" ]; then
  TREE="dirty"
else
  TREE="clean"
fi

usage() {
  sed -n '2,15p' "$0" | sed 's/^# \{0,1\}//' >&2
  exit 2
}

if [ ! -f "$LEDGER" ]; then
  echo "audit: $LEDGER missing — the ledger is the file entries append to" >&2
  exit 2
fi

# Everything below the marker is entries, newest last.
MARKER="<!-- entries below; newest last; appended by scripts/audit.sh -->"
grep -qF "$MARKER" "$LEDGER" || {
  echo "audit: $LEDGER has no append marker" >&2
  exit 2
}

read_arg() { # read_arg <value> — "-" means stdin
  if [ "$1" = "-" ]; then cat; else printf '%s' "$1"; fi
}

MODE="${1:-}"
shift || usage

case "$MODE" in
  story) ;;
  review) ;;
  *) usage ;;
esac

# --- story ---------------------------------------------------------------------
if [ "$MODE" = "story" ]; then
  ID="${1:-}"
  [ -n "$ID" ] || usage
  shift

  LABEL="completion"
  COMMIT=""
  RUN_VERIFY=1
  while [ $# -gt 0 ]; do
    case "$1" in
      --reverify) LABEL="reverify"; shift ;;
      --backfill) LABEL="backfill"; shift ;;
      --no-verify) RUN_VERIFY=0; shift ;;
      --commit) COMMIT="${2:-}"; shift 2 ;;
      *) echo "audit: unknown option $1" >&2; usage ;;
    esac
  done

  GRADER="scripts/verify-${ID}.sh"
  if [ ! -x "$GRADER" ]; then
    echo "audit: $GRADER missing or not executable" >&2
    exit 2
  fi

  TITLE="$(grep -m1 -E "^\| [0-9]+ \| \[${ID}\]" "$BACKLOG" |
    awk -F' \\| ' '{print $3}' | sed 's/[[:space:]]*$//')"
  [ -n "$TITLE" ] || TITLE="(title not found in ${BACKLOG} status table)"

  grader_log="$(mktemp -t "audit-${ID}-grader")"
  verify_log="$(mktemp -t "audit-${ID}-verify")"

  echo "audit ${ID}: running ${GRADER}…"
  "$GRADER" >"$grader_log" 2>&1
  grader_exit=$?

  if [ "$RUN_VERIFY" -eq 1 ]; then
    echo "audit ${ID}: running pnpm verify…"
    pnpm verify >"$verify_log" 2>&1
    verify_exit=$?
  else
    verify_exit="skipped"
  fi

  check_lines="$(grep -E '^check [0-9]+ (PASS|FAIL):' "$grader_log" || true)"
  # checks.sh labels the tally with the grader's own id ("verify-S11"), not "S11".
  tally="$(grep -E "^--- (verify-)?${ID}: [0-9]+/[0-9]+ checks passed ---$" "$grader_log" |
    sed -E 's/^--- [^:]+: (.*) ---$/\1/' || true)"

  if [ -n "$COMMIT" ]; then
    SHIPPED="\`$(git rev-parse --short "$COMMIT")\` — $(git log -1 --format=%s "$COMMIT")"
  elif [ "$LABEL" = "reverify" ]; then
    SHIPPED="(see this story's completion entry above)"
  else
    SHIPPED="the commit that adds this entry"
  fi

  {
    echo
    echo "---"
    echo
    case "$LABEL" in
      reverify) echo "## ${TODAY} — ${ID} re-verified" ;;
      backfill) echo "## ${TODAY} — ${ID} verified (backfill)" ;;
      *)        echo "## ${TODAY} — ${ID} completed" ;;
    esac
    echo
    echo "**${TITLE}**"
    echo
    echo "| | |"
    echo "|---|---|"
    case "$LABEL" in
      reverify) echo "| Entry | story re-verification — the grader still passes at the HEAD below; **not** a capture of the original completion run |" ;;
      backfill) echo "| Entry | **backfill** — this story shipped before the ledger existed. The grader run below is real and happened today, at the HEAD below, not at the shipping commit |" ;;
      *)        echo "| Entry | story completion |" ;;
    esac
    echo "| Captured (UTC) | \`${STAMP}\` |"
    echo "| Shipped in | ${SHIPPED} |"
    echo "| HEAD at capture | \`${HEAD_SHA}\` (tree ${TREE}) |"
    echo "| Grader | \`${GRADER}\` — exit \`${grader_exit}\` |"
    if [ "$RUN_VERIFY" -eq 1 ]; then
      echo "| \`pnpm verify\` | exit \`${verify_exit}\` |"
    else
      echo "| \`pnpm verify\` | not re-run for this entry — one repo-wide run covers the tree, recorded in the newest completion entry |"
    fi
    echo
    echo "**What was tested and verified**"
    echo
    if [ -n "$check_lines" ]; then
      echo '```'
      echo "$check_lines"
      echo '```'
      [ -n "$tally" ] && { echo; echo "**${tally}**"; }
    else
      echo "_This grader predates the per-check reporting contract"
      echo "(\`scripts/lib/checks.sh\`) and emitted no per-check lines. Only its"
      echo "exit code is recorded above._"
    fi
    echo
    echo "<details><summary>Grader output</summary>"
    echo
    echo '```'
    cat "$grader_log"
    echo '```'
    echo
    echo "</details>"
    echo
    if [ "$RUN_VERIFY" -eq 1 ]; then
      echo "<details><summary><code>pnpm verify</code> (tail)</summary>"
      echo
      echo '```'
      tail -30 "$verify_log"
      echo '```'
      echo
      echo "</details>"
    fi
  } >>"$LEDGER"

  rm -f "$grader_log" "$verify_log"

  echo
  echo "audit ${ID}: appended to ${LEDGER}"
  echo
  echo "--- commit message summary (paste into the commit body) ---"
  echo "Verification (${GRADER}, exit ${grader_exit}; pnpm verify, ${verify_exit}):"
  if [ -n "$check_lines" ]; then
    echo "$check_lines" | sed 's/^/  /'
  fi
  echo "Ledger: ${LEDGER}"
  echo "---"

  if [ "$grader_exit" -ne 0 ]; then exit 1; fi
  if [ "$RUN_VERIFY" -eq 1 ] && [ "$verify_exit" -ne 0 ]; then exit 1; fi
  exit 0
fi

# --- review --------------------------------------------------------------------
TRIGGER=""
SINCE=""
VERDICT=""
FINDINGS=""
DATE="$TODAY"
while [ $# -gt 0 ]; do
  case "$1" in
    --trigger) TRIGGER="$(read_arg "${2:-}")"; shift 2 ;;
    --since) SINCE="$(read_arg "${2:-}")"; shift 2 ;;
    --verdict) VERDICT="${2:-}"; shift 2 ;;
    --findings) FINDINGS="$(read_arg "${2:-}")"; shift 2 ;;
    --date) DATE="${2:-}"; shift 2 ;;
    --commit) HEAD_SHA="$(git rev-parse --short "${2:-}")"; shift 2 ;;
    *) echo "audit: unknown option $1" >&2; usage ;;
  esac
done

case "$VERDICT" in
  continue|amended|blocked) ;;
  *) echo "audit: --verdict must be continue, amended or blocked" >&2; exit 2 ;;
esac
[ -n "$TRIGGER" ] || { echo "audit: --trigger is required" >&2; exit 2; }
[ -n "$FINDINGS" ] || { echo "audit: --findings is required (a verdict with no cited evidence does not count as a review)" >&2; exit 2; }

{
  echo
  echo "---"
  echo
  echo "## ${DATE} — backlog review (\`${VERDICT}\`)"
  echo
  echo "| | |"
  echo "|---|---|"
  echo "| Entry | backlog review pass |"
  echo "| Captured (UTC) | \`${STAMP}\` |"
  echo "| HEAD at review | \`${HEAD_SHA}\` (tree ${TREE}) |"
  echo "| Trigger | ${TRIGGER} |"
  echo "| Stories \`done\` since last review | ${SINCE:-—} |"
  echo "| Verdict | \`${VERDICT}\` |"
  echo
  echo "**Findings / amendments**"
  echo
  echo "$FINDINGS"
} >>"$LEDGER"

echo "audit review: appended a \`${VERDICT}\` entry to ${LEDGER}"
if [ "$VERDICT" = "blocked" ]; then
  echo "audit review: verdict is 'blocked' — stop and ask the user. Do not start a story." >&2
  exit 1
fi
