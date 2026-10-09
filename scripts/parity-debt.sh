#!/usr/bin/env bash
# Is a doc parity review due? (docs/v3/BACKLOG.md rule 19, "Doc parity reviews")
#
#   pnpm parity:debt          # prints why or why not; exit 1 when due, 0 when not
#
# Measured from the commit that logged the newest "doc parity review" entry in
# docs/v3/AUDIT.md. A parity review commits its edits together with that entry, so
# its own work never counts as debt — that is what stops it re-triggering itself.
# Due when, since then: a product doc changed, a story note was added or removed, a
# story's body or **Source:** line changed, or 3 stories went `done`.
#
# Reads committed history only (HEAD); uncommitted edits are not counted.

set -uo pipefail
cd "$(dirname "$0")/.."

LEDGER="${BT_AUDIT_LEDGER:-docs/v3/AUDIT.md}"
STORIES="docs/v3/backlog/stories"
DOCS=(docs/v3/INTENT.md docs/v3/ORIGIN.md docs/v3/FEATURES.md docs/v3/VISUAL-DESIGN.md docs/v3/ARCHITECTURE.md)
BACKSTOP=3

base="$(git log -1 --format=%h -S'— doc parity review (' -- "$LEDGER")"
if [ -z "$base" ]; then
  echo "parity: no doc parity review logged in ${LEDGER} yet — one is due."
  exit 1
fi

reasons=()

while IFS= read -r doc; do
  [ -n "$doc" ] && reasons+=("${doc} changed")
done < <(git diff --name-only "$base" HEAD -- "${DOCS[@]}")

while IFS=$'\t' read -r change path; do
  [ -z "$path" ] && continue
  id="$(basename "$path" .md)"
  case "$change" in
    A) reasons+=("${id} added") ;;
    D) reasons+=("${id} removed") ;;
  esac
done < <(git diff --name-status --diff-filter=AD "$base" HEAD -- "$STORIES")

# A note's body is everything after its frontmatter; status/priority flips live in the frontmatter.
body() { git show "$1:$2" 2>/dev/null | awk 'n >= 2 { print } /^---$/ { n++ }'; }
while IFS= read -r path; do
  [ -z "$path" ] && continue
  id="$(basename "$path" .md)"
  before="$(body "$base" "$path")"
  after="$(body HEAD "$path")"
  if [ "$(grep '^\*\*Source:\*\*' <<<"$before")" != "$(grep '^\*\*Source:\*\*' <<<"$after")" ]; then
    reasons+=("${id}'s **Source:** changed")
  fi
  if [ "$(grep -v '^\*\*Source:\*\*' <<<"$before")" != "$(grep -v '^\*\*Source:\*\*' <<<"$after")" ]; then
    reasons+=("${id}'s story text changed")
  fi
done < <(git diff --name-only --diff-filter=M "$base" HEAD -- "$STORIES")

# Stories completed since the newest parity entry, by ledger order (re-verifications don't count).
done_since="$(awk '/^## .* — doc parity review \(/ { delete seen; n = 0; next }
  match($0, /^## [^ ]+ — S[0-9]+ completed$/) { split($0, w, " "); if (!(w[4] in seen)) { seen[w[4]] = 1; ids[++n] = w[4] } }
  END { s = ""; for (i = 1; i <= n; i++) if (ids[i] in seen) s = s (s ? ", " : "") ids[i]; print s }' "$LEDGER")"
done_count=0
[ -n "$done_since" ] && done_count="$(tr ',' '\n' <<<"$done_since" | wc -l | tr -d ' ')"
if [ "$done_count" -ge "$BACKSTOP" ]; then
  reasons+=("${done_count} stories done since (${done_since})")
fi

if [ "${#reasons[@]}" -eq 0 ]; then
  echo "parity: not due — nothing changed since the last doc parity review (logged in ${base}); ${done_count} of ${BACKSTOP} stories done since."
  exit 0
fi
echo "parity: a doc parity review is due (since ${base}, which logged the last one):"
printf '  - %s\n' "${reasons[@]}"
exit 1
