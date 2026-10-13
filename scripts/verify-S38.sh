#!/usr/bin/env bash
# Grader for BACKLOG story S38 — Figma revisions: Standings, Search + Settings.
# Contract: docs/v3/BACKLOG.md#verify-script-contract
# No network. No writes outside /tmp. Does its own checking (never `pnpm verify`).

set -uo pipefail
cd "$(dirname "$0")/.."

# shellcheck source=lib/checks.sh
source "$(dirname "$0")/lib/checks.sh"

check 1 "REVISIONS.md has ## Source (figma.com URL + non-empty Version:) and ## Revisions"
check 2 "## Revisions has a row for R13 R17b R18, each naming an existing export; R13 row names its groups and controls"
check 3 "every export is named <slug>-(mobile|medium|desktop).(png|svg|pdf) with no dark/light token"
check 4 "required exports: settings, standings, search each at mobile, medium, desktop"
check 5 "backlog Status is done"

DIR="docs/v3/visual/standings-search-settings"
REV="$DIR/REVISIONS.md"

# section <heading> — body of a `## <heading>` section in REVISIONS.md.
section() {
  awk -v h="## $1" '$0==h{f=1;next} /^## /{f=0} f' "$REV"
}

# row <id> — the Revisions table row for a revision ID (empty when absent).
row() {
  section "Revisions" | grep -E '^\|' |
    grep -E "^\|[[:space:]]*\**${1}\**[[:space:]]*\|" | head -1
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
  for id in R13 R17b R18; do
    r=$(row "$id")
    if [ -z "$r" ]; then
      bad 2 "no Revisions row for $id"
      continue
    fi
    hit=0
    for f in $(printf '%s\n' "$r" | grep -oE '[A-Za-z0-9._-]+\.(png|svg|pdf)'); do
      [ -f "$DIR/$f" ] && hit=1
    done
    [ "$hit" -eq 1 ] || bad 2 "row $id names no export file that exists in $DIR"
  done
  r13=$(row R13)
  for term in "Game list" "Game detail" "Account" "game-row slot" "collapse non-favorites"; do
    printf '%s\n' "$r13" | grep -qF "$term" || bad 2 "R13 row does not name '$term'"
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
for screen in settings standings search; do
  for size in mobile medium desktop; do
    printf '%s\n' "$exports" | grep -qE "^${screen}(-[a-z0-9]+)*-${size}\.(png|svg|pdf)$" ||
      bad 4 "no export matching ^${screen}(-[a-z0-9]+)*-${size}.(png|svg|pdf)"
  done
done

# --- Check 5: backlog Status is done -----------------------------------------
grep -qE '^\| [0-9]+ \| \[S38\].*\| `done` \|$' docs/v3/BACKLOG.md ||
  bad 5 "S38 row in the Story status table is not \`done\`"
awk '/^### S38 —/{f=1;next} /^### S[0-9]/{f=0} f' docs/v3/BACKLOG.md \
  | grep -qE '^\*\*Status:\*\* `done`$' ||
  bad 5 "S38 story heading Status is not \`done\`"

report "verify-S38"
exit $?
