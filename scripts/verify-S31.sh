#!/usr/bin/env bash
# Grader for BACKLOG story S31 — Design: app shell + scoreboard (owner-ratified).
# Contract: docs/v3/BACKLOG.md#verify-script-contract
# No network. No writes outside /tmp. Does its own checking (never `pnpm verify`).

set -uo pipefail
cd "$(dirname "$0")/.."

# shellcheck source=lib/checks.sh
source "$(dirname "$0")/lib/checks.sh"

check 1 "DESIGN.md has its six sections, a design-source link, and ## Open questions is exactly None."
check 2 "exports named <screen>[-<state>]-<pairing>; shell + scoreboard at mobile and medium/desktop; a shell-notice and a collapsed scoreboard export; ## Frames names two slot occupants"
check 3 "every export appears in the ## Frames table and every file the table names exists"
check 4 "## Decisions and VISUAL-DESIGN §9 settle team-color strength and the letterform favicon, linking DESIGN.md"
check 5 "RATIFIED.md has Ratified by / Date / Source version / Go-ahead, a matching SHA-256 manifest, and the directory is committed"
check 6 "backlog Status is done"

DIR="docs/v3/visual/shell-scoreboard"
DES="$DIR/DESIGN.md"
RAT="$DIR/RATIFIED.md"
VD="docs/v3/VISUAL-DESIGN.md"

# section <file> <heading> — body of a `## <heading>` section.
section() {
  awk -v h="## $2" '$0==h{f=1;next} /^## /{f=0} f' "$1"
}

# §9 row whose first cell is <decision> (empty when absent).
s9row() {
  awk '/^## 9\./{f=1;next} /^## /{f=0} f' "$VD" | grep -F "| $1 |" | head -1
}

exports=""
if [ -d "$DIR" ]; then
  exports=$(cd "$DIR" && find . -type f ! -path './amendments/*' | sed 's|^\./||' |
    grep -vxE 'DESIGN\.md|RATIFIED\.md|REVISIONS\.md' | sort)
fi

# --- Check 1: DESIGN.md sections, source link, Open questions is None. ------
if [ ! -f "$DES" ]; then
  bad 1 "$DES missing"
else
  for h in Source Frames Decisions Interpretation "Open questions" "Work required"; do
    grep -qxF "## $h" "$DES" || bad 1 "no '## $h' section"
  done
  src=$(section "$DES" Source)
  if ! printf '%s\n' "$src" | grep -qE 'https?://[^[:space:]]+'; then
    hit=0
    for p in $(printf '%s\n' "$src" | grep -oE '(docs|fixtures|web)/[A-Za-z0-9._/-]+'); do
      [ -e "$p" ] && hit=1
    done
    [ "$hit" -eq 1 ] || bad 1 "## Source has no URL or existing repo path"
  fi
  oq=$(section "$DES" "Open questions" | sed '/^[[:space:]]*$/d')
  [ "$oq" = "None." ] || bad 1 "## Open questions is not exactly 'None.'"
fi

# --- Check 2: export names + required screens ---------------------------------
if [ -z "$exports" ]; then
  bad 2 "no exports in $DIR"
else
  while IFS= read -r f; do
    printf '%s\n' "$f" | grep -qE '^[a-z0-9]+(-[a-z0-9]+)*-(mobile|medium|desktop)\.(png|svg|pdf)$' ||
      bad 2 "bad export name: $f"
  done <<< "$exports"
  for screen in shell scoreboard; do
    printf '%s\n' "$exports" | grep -qE "^${screen}(-[a-z0-9]+)*-mobile\.(png|svg|pdf)$" ||
      bad 2 "no ${screen} mobile export"
    printf '%s\n' "$exports" | grep -qE "^${screen}(-[a-z0-9]+)*-(medium|desktop)\.(png|svg|pdf)$" ||
      bad 2 "no ${screen} medium or desktop export"
  done
fi
frames=""
[ -f "$DES" ] && frames=$(section "$DES" Frames)
printf '%s\n' "$exports" | grep -qE '^shell-notice-(mobile|medium|desktop)\.' || bad 2 "no shell-notice-* export"
printf '%s\n' "$exports" | grep -qE '^scoreboard-.*collapsed-(mobile|medium|desktop)\.' || bad 2 "no scoreboard-*collapsed-* export"
occ=0
for o in "status" "room menu" "win probability"; do
  printf '%s\n' "$frames" | grep -qiF "$o" && occ=$((occ + 1))
done
[ "$occ" -ge 2 ] || bad 2 "## Frames names fewer than two slot occupants"

# --- Check 3: Frames table <-> exports ----------------------------------------
if [ ! -f "$DES" ]; then
  bad 3 "$DES missing"
else
  named=$(printf '%s\n' "$frames" | grep -E '^\|' | grep -oE '[a-z0-9-]+\.(png|svg|pdf)' | sort -u)
  while IFS= read -r f; do
    [ -z "$f" ] && continue
    printf '%s\n' "$named" | grep -qxF "$f" || bad 3 "export not in ## Frames: $f"
  done <<< "$exports"
  while IFS= read -r f; do
    [ -z "$f" ] && continue
    [ -f "$DIR/$f" ] || bad 3 "## Frames names a missing file: $f"
  done <<< "$named"
fi

# --- Check 4: decisions -------------------------------------------------------
if [ ! -f "$DES" ]; then
  bad 4 "$DES missing"
else
  dec=$(section "$DES" Decisions)
  for d in "How strongly team color paints a module" "Letterform favicon"; do
    printf '%s\n' "$dec" | grep -qF "$d" || bad 4 "## Decisions does not name '$d'"
    r=$(s9row "$d")
    if [ -z "$r" ]; then bad 4 "no §9 row '$d'"; continue; fi
    printf '%s\n' "$r" | grep -qE '\*\*(Open|Proposal)' && bad 4 "§9 row '$d' is still Open/Proposal"
    printf '%s\n' "$r" | grep -qF "visual/shell-scoreboard/DESIGN.md" || bad 4 "§9 row '$d' does not link visual/shell-scoreboard/DESIGN.md"
  done
fi

# --- Check 5: RATIFIED.md + manifest ------------------------------------------
if [ ! -f "$RAT" ]; then
  bad 5 "$RAT missing"
else
  for k in "Ratified by" "Source version" "Go-ahead"; do
    grep -qE "^${k}:[[:space:]]*[^[:space:]]" "$RAT" || bad 5 "no non-empty '${k}:' line"
  done
  grep -qE '^Date:[[:space:]]*[0-9]{4}-[0-9]{2}-[0-9]{2}[[:space:]]*$' "$RAT" || bad 5 "no 'Date: YYYY-MM-DD' line"
  sv=$(grep -E '^Source version:' "$RAT" | head -1 | sed -E 's/^Source version:[[:space:]]*//')
  if [ -n "$sv" ] && [ -f "$DES" ]; then
    section "$DES" Source | grep -qF -- "$sv" || bad 5 "Source version not found verbatim in DESIGN.md ## Source"
  fi
  manifest=$(section "$RAT" Manifest | grep -E '^[0-9a-f]{64}  ')
  want=$(cd "$DIR" && find . -type f ! -path './amendments/*' ! -name RATIFIED.md | sed 's|^\./||' | sort)
  got=$(printf '%s\n' "$manifest" | sed -E 's/^[0-9a-f]{64}  //' | sort)
  [ "$want" = "$got" ] || bad 5 "## Manifest does not list every file in $DIR exactly once"
  while IFS= read -r line; do
    [ -z "$line" ] && continue
    sum=${line%%  *}; f=${line#*  }
    [ -f "$DIR/$f" ] || continue
    [ "$(shasum -a 256 "$DIR/$f" | cut -d' ' -f1)" = "$sum" ] || bad 5 "SHA-256 mismatch: $f"
  done <<< "$manifest"
  [ -z "$(git status --porcelain -- "$DIR")" ] || bad 5 "$DIR has uncommitted changes"
fi

# --- Check 6: backlog Status is done ------------------------------------------
grep -qE '^\| [0-9]+ \| \[S31\].*\| `done` \|$' docs/v3/BACKLOG.md ||
  bad 6 "S31 row in the Story status table is not \`done\`"
awk '/^### S31 —/{f=1;next} /^### S[0-9]/{f=0} f' docs/v3/BACKLOG.md \
  | grep -qE '^\*\*Status:\*\* `done`$' ||
  bad 6 "S31 story heading Status is not \`done\`"

report "verify-S31"
exit $?
