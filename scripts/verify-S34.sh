#!/usr/bin/env bash
# Grader for BACKLOG story S34 — Design: Standings, Search + Settings (owner-ratified).
# Contract: docs/v3/BACKLOG.md#verify-script-contract
# No network. No writes outside /tmp. Does its own checking (never `pnpm verify`).

set -uo pipefail
cd "$(dirname "$0")/.."

# shellcheck source=lib/checks.sh
source "$(dirname "$0")/lib/checks.sh"

check 1 "DESIGN.md has its six sections, a design-source link, and ## Open questions is exactly None."
check 2 "exports named <screen>[-<state>]-<pairing>; standings, search, settings at mobile and medium/desktop; DESIGN.md names game-row slot and collapse non-favorites"
check 3 "every export appears in the ## Frames table and every file the table names exists"
check 4 "## Decisions is non-empty and §9 does not link visual/standings-search-settings/DESIGN.md"
check 5 "RATIFIED.md has Ratified by / Date / Source version / Go-ahead, a matching SHA-256 manifest, and the directory is committed"
check 6 "backlog Status is done"

DIR="docs/v3/visual/standings-search-settings"
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
  for screen in standings search settings; do
    printf '%s\n' "$exports" | grep -qE "^${screen}(-[a-z0-9]+)*-mobile\.(png|svg|pdf)$" ||
      bad 2 "no ${screen} mobile export"
    printf '%s\n' "$exports" | grep -qE "^${screen}(-[a-z0-9]+)*-(medium|desktop)\.(png|svg|pdf)$" ||
      bad 2 "no ${screen} medium or desktop export"
  done
fi
frames=""
[ -f "$DES" ] && frames=$(section "$DES" Frames)
if [ -f "$DES" ]; then
  both=$(printf '%s\n%s\n' "$frames" "$(section "$DES" Decisions)")
  for c in "game-row slot" "collapse non-favorites"; do
    printf '%s\n' "$both" | grep -qiF "$c" || bad 2 "## Frames / ## Decisions do not name '$c'"
  done
else
  bad 2 "$DES missing"
fi

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
  [ -n "$(section "$DES" Decisions | sed '/^[[:space:]]*$/d')" ] || bad 4 "## Decisions is empty"
fi
awk '/^## 9\./{f=1;next} /^## /{f=0} f' "$VD" | grep -qF "visual/standings-search-settings/DESIGN.md" &&
  bad 4 "§9 links visual/standings-search-settings/DESIGN.md (no §9 row is in this story's scope)"

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
grep -qE '^\| [0-9]+ \| \[S34\].*\| `done` \|$' docs/v3/BACKLOG.md ||
  bad 6 "S34 row in the Story status table is not \`done\`"
awk '/^### S34 —/{f=1;next} /^### S[0-9]/{f=0} f' docs/v3/BACKLOG.md \
  | grep -qE '^\*\*Status:\*\* `done`$' ||
  bad 6 "S34 story heading Status is not \`done\`"

report "verify-S34"
exit $?
