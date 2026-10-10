#!/usr/bin/env bash
# Grader for BACKLOG story S35 — Figma revisions: app shell + scoreboard.
# Contract: docs/v3/BACKLOG.md#verify-script-contract
# No network. No writes outside /tmp. Does its own checking (never `pnpm verify`).

set -uo pipefail
cd "$(dirname "$0")/.."

# shellcheck source=lib/checks.sh
source "$(dirname "$0")/lib/checks.sh"

check 1 "REVISIONS.md has ## Source (figma.com URL + non-empty Version:) and ## Revisions"
check 2 "## Revisions has a row for R6 R7 R8 R9 R14a R16 R17a R18, each naming an existing export"
check 3 "every export is named <slug>-(mobile|medium|desktop).(png|svg|pdf) with no dark/light token"
check 4 "required exports exist: shell-notice, scoreboard-slot-room-menu, 5 states x 3 sizes"
check 5 "backlog Status is done"

DIR="docs/v3/visual/shell-scoreboard"
REV="$DIR/REVISIONS.md"

# section <heading> — body of a `## <heading>` section in REVISIONS.md.
section() {
  awk -v h="## $1" '$0==h{f=1;next} /^## /{f=0} f' "$REV"
}

# --- Check 1: REVISIONS.md Source + Revisions sections -----------------------
if [ ! -f "$REV" ]; then
  bad 1 "$REV missing"
else
  grep -qxE '## Source' "$REV" || bad 1 "no '## Source' section"
  grep -qxE '## Revisions' "$REV" || bad 1 "no '## Revisions' section"
  src=$(section "Source")
  printf '%s\n' "$src" | grep -q 'https://www.figma.com/' ||
    bad 1 "## Source has no https://www.figma.com/ URL"
  printf '%s\n' "$src" | grep -qE 'Version:[[:space:]]*[^[:space:]]' ||
    bad 1 "## Source has no non-empty Version: line"
fi

# --- Check 2: one row per revision ID, each naming an existing export --------
if [ ! -f "$REV" ]; then
  bad 2 "$REV missing"
else
  rows=$(section "Revisions" | grep -E '^\|')
  for id in R6 R7 R8 R9 R14a R16 R17a R18; do
    row=$(printf '%s\n' "$rows" | grep -E "^\|[[:space:]]*\**${id}\**[[:space:]]*\|" | head -1)
    if [ -z "$row" ]; then
      bad 2 "no Revisions row for $id"
      continue
    fi
    hit=0
    for f in $(printf '%s\n' "$row" | grep -oE '[A-Za-z0-9._-]+\.(png|svg|pdf)'); do
      [ -f "$DIR/$f" ] && hit=1
    done
    [ "$hit" -eq 1 ] || bad 2 "row $id names no export file that exists in $DIR"
  done
fi

# --- Check 3: export names ---------------------------------------------------
exports=""
if [ -d "$DIR" ]; then
  exports=$(cd "$DIR" && find . -type f ! -path './amendments/*' | sed 's|^\./||' |
    grep -vxE 'DESIGN\.md|RATIFIED\.md|REVISIONS\.md')
fi
if [ -z "$exports" ]; then
  bad 3 "no exports in $DIR"
else
  while IFS= read -r f; do
    printf '%s\n' "$f" | grep -qE '^[a-z0-9]+(-[a-z0-9]+)*-(mobile|medium|desktop)\.(png|svg|pdf)$' ||
      bad 3 "bad export name: $f"
    printf '%s\n' "${f%.*}" | tr '-' '\n' | grep -qxE 'dark|light' &&
      bad 3 "export name has a dark/light token: $f"
  done <<< "$exports"
fi

# --- Check 4: required exports -----------------------------------------------
# need <regex> — at least one export matches.
need() {
  printf '%s\n' "$exports" | grep -qE "$1\.(png|svg|pdf)$" || bad 4 "no export matching $1.(png|svg|pdf)"
}
need '^shell-notice-(mobile|medium|desktop)'
need '^scoreboard-slot-room-menu-(mobile|medium|desktop)'
for state in empty loading error scores-hidden collapsed; do
  for size in mobile medium desktop; do
    need "^scoreboard-${state}-${size}"
  done
done

# --- Check 5: backlog Status is done -----------------------------------------
grep -qE '^\| [0-9]+ \| \[S35\].*\| `done` \|$' docs/v3/BACKLOG.md ||
  bad 5 "S35 row in the Story status table is not \`done\`"
awk '/^### S35 —/{f=1;next} /^### S[0-9]/{f=0} f' docs/v3/BACKLOG.md \
  | grep -qE '^\*\*Status:\*\* `done`$' ||
  bad 5 "S35 story heading Status is not \`done\`"

report "verify-S35"
exit $?
