# Re-verify a story at the commit it shipped in (S84; owner, 2026-10-28: a grader
# "would only be expected to succeed against the codebase as of the time of its commit").
# Sourced by scripts/audit.sh and scripts/reverify-all.sh. Sourced, not executed.

# shipping_commit <ledger> <ID> — the commit a story shipped in, from its newest
# completion (or backfill) entry: the backfill's `Shipped in` commit, else the first
# commit whose ledger diff adds that entry's unique `Captured (UTC)` stamp. Empty if none.
shipping_commit() {
  local ledger="$1" id="$2" entry shipped stamp
  entry="$(awk -v id="$id" '
    $0 ~ "^## [0-9-]+ — " id " (completed|verified \\(backfill\\))$" { buf=""; f=1 }
    f && /^---$/ { last=buf; f=0 }
    f { buf = buf $0 "\n" }
    END { if (f) last=buf; printf "%s", last }' "$ledger")"
  [ -n "$entry" ] || return 0
  shipped="$(printf '%s' "$entry" | grep -m1 '^| Shipped in |' | grep -oE '`[0-9a-f]{7,40}`' | head -1 | tr -d '`')"
  if [ -n "$shipped" ]; then
    git rev-parse --short "$shipped" 2>/dev/null
    return 0
  fi
  stamp="$(printf '%s' "$entry" | grep -m1 '^| Captured (UTC) |' | grep -oE '[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9:]+Z')"
  [ -n "$stamp" ] || return 0
  git log --reverse --format=%h -S "$stamp" -- "$ledger" | head -1
}

# reverify_at <sha> <grader> <log> — run today's <grader> (with today's
# scripts/lib/checks.sh) in a temporary worktree checked out at <sha>; output to <log>.
# Installs dependencies offline with husky off (it would rewrite the shared git config)
# unless BT_REVERIFY_NO_INSTALL is set. The worktree is removed on every exit path.
# Returns the grader's exit code (97 if the worktree could not be made).
reverify_at() {
  local sha="$1" grader="$2" log="$3" name
  name="$(basename "$grader")"
  (
    root="$(mktemp -d)"
    wt="$root/wt"
    cleanup() {
      git worktree remove --force "$wt" >/dev/null 2>&1
      rm -rf "$root"
      git worktree prune >/dev/null 2>&1
    }
    trap cleanup EXIT
    git worktree add --detach "$wt" "$sha" >/dev/null 2>&1 || exit 97
    mkdir -p "$wt/scripts/lib"
    cp "$grader" "$wt/scripts/$name"
    cp scripts/lib/checks.sh "$wt/scripts/lib/checks.sh"
    : >"$log"
    if [ -f "$wt/pnpm-lock.yaml" ] && [ -z "${BT_REVERIFY_NO_INSTALL:-}" ]; then
      (cd "$wt" && HUSKY=0 pnpm install --frozen-lockfile --offline >"$root/install.log" 2>&1) ||
        { echo "reverify: pnpm install --offline failed at $sha:" >>"$log"; tail -5 "$root/install.log" >>"$log"; }
    fi
    (cd "$wt" && bash "scripts/$name") >>"$log" 2>&1
  )
}
