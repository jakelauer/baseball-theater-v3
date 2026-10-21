#!/usr/bin/env bash
# Grader for BACKLOG story S56 — design amendments: navigation, signed-out shell,
# and the undrawn leftovers the 2026-10-19 intake found (rule 18).
# Contract: docs/v3/BACKLOG.md#verify-script-contract
# No network. No writes outside /tmp. Does its own checking (never `pnpm verify`).

set -uo pipefail
cd "$(dirname "$0")/.."

# shellcheck source=lib/checks.sh
source "$(dirname "$0")/lib/checks.sh"

check 1 "each touched surface has its next free amendments/A<N>.md naming what it adds/overrides/repeals, with ## Frames, ## Decisions (owner's words), ## Open questions = None., and a SHA-256 manifest of its frames"
check 2 "frames cover: nav drawer (mobile, medium) + desktop header without burger; signed-out shell (mobile, desktop); Videos without Filter; search result playing in a modal over the results with a game link; Search retitled; collapsed bar with score; Live full-width tabs (medium); rail version line (desktop); Live footer without subscription link (medium); recap source line; iOS Install row — named <screen>[-<state>]-<pairing>.png and listed in ## Frames"
check 3 "each amendment's ratification record quotes the owner's in-session go-ahead verbatim"
check 4 "no sealed file in those surfaces changed (each RATIFIED.md manifest still verifies)"
check 5 "backlog Status is done (story heading and Story status table)"

V="docs/v3/visual"
SURFACES="shell-scoreboard game-shell game-rooms standings-search-settings"

# Lines of section "## <name>" in a file.
section() {
  awk -v h="## $2" '$0==h{f=1;next} /^## /{f=0} f' "$1"
}

# The S56 amendment of a surface: the A<N>.md under amendments/ that names S56.
amendment() {
  local dir="$V/$1/amendments"
  [ -d "$dir" ] || return 0
  grep -lE 'S56' "$dir"/A[0-9]*.md 2>/dev/null | head -1
}

# Frames in amendments/ not claimed by another amendment's manifest (S55's A1 shares the folder).
own_frames() {
  local dir="$1" mine="$2" f a other
  for f in $(cd "$dir" && ls *.png 2>/dev/null); do
    other=0
    for a in "$dir"/A[0-9]*.md; do
      [ "$a" = "$mine" ] && continue
      section "$a" Manifest | grep -qE "^[0-9a-f]{64}  $f\$" && other=1
    done
    [ "$other" = 0 ] && echo "$f"
  done
}

# Frames each surface must carry (check 2).
frames_for() {
  case "$1" in
    shell-scoreboard) echo "nav-drawer-mobile.png nav-drawer-medium.png scoreboard-header-desktop.png shell-signed-out-mobile.png shell-signed-out-desktop.png scoreboard-collapsed-score-mobile.png shell-version-desktop.png" ;;
    game-shell) echo "game-videos-no-filter-mobile.png" ;;
    game-rooms) echo "live-tabs-medium.png live-footer-medium.png recap-source-mobile.png" ;;
    standings-search-settings) echo "search-retitled-mobile.png search-playing-mobile.png settings-install-ios-mobile.png" ;;
  esac
}

for s in $SURFACES; do
  A=$(amendment "$s")
  dir="$V/$s/amendments"

  # --- Check 1: the amendment file and its sections ---------------------------
  if [ -z "$A" ]; then
    bad 1 "$s: no amendments/A<N>.md naming S56"
    bad 2 "$s: no amendment, so no frames"
    bad 3 "$s: no amendment, so no ratification record"
    continue
  fi
  n=$(basename "$A" .md | tr -d 'A')
  # Next free: every lower number exists, and S56's is the highest when written.
  for ((i = 1; i < n; i++)); do [ -f "$dir/A$i.md" ] || bad 1 "$s: $A is not the next free number (A$i.md missing)"; done
  grep -qiE '^\*\*(Adds|Overrides|Repeals)' "$A" ||
    bad 1 "$s: $A does not name what it adds, overrides or repeals (**Adds** / **Overrides** / **Repeals** lines)"
  for h in Frames Decisions "Open questions" Manifest; do
    grep -qx "## $h" "$A" || bad 1 "$s: $A has no ## $h"
  done
  [ -n "$(section "$A" Decisions | sed '/^[[:space:]]*$/d')" ] || bad 1 "$s: ## Decisions is empty"
  section "$A" Decisions | grep -q '"' || bad 1 "$s: ## Decisions quotes no owner words"
  oq=$(section "$A" "Open questions" | sed '/^[[:space:]]*$/d')
  [ "$oq" = "None." ] || bad 1 "$s: ## Open questions body is not exactly 'None.'"
  manifest=$(section "$A" Manifest | grep -E '^[0-9a-f]{64}  ')
  want=$(own_frames "$dir" "$A" | sort)
  got=$(printf '%s\n' "$manifest" | sed -E 's/^[0-9a-f]{64}  //' | sed '/^$/d' | sort)
  [ -n "$want" ] && [ "$want" = "$got" ] || bad 1 "$s: ## Manifest does not list every frame in amendments/ exactly once"
  while IFS= read -r line; do
    [ -z "$line" ] && continue
    sum=${line%%  *}; f=${line#*  }
    [ -f "$dir/$f" ] || { bad 1 "$s: manifest names missing $f"; continue; }
    [ "$(shasum -a 256 "$dir/$f" | cut -d' ' -f1)" = "$sum" ] || bad 1 "$s: SHA-256 mismatch: $f"
  done <<< "$manifest"

  # --- Check 2: required frames, naming, Frames table ---------------------------
  frames_table=$(section "$A" Frames)
  for f in $(frames_for "$s"); do
    [ -f "$dir/$f" ] || bad 2 "$s: frame $f missing"
    echo "$frames_table" | grep -qF "\`$f\`" || bad 2 "$s: $f not in ## Frames"
  done
  for f in $(own_frames "$dir" "$A"); do
    echo "$f" | grep -qE '^[a-z]+(-[a-z]+)*-(mobile|medium|desktop)\.png$' || bad 2 "$s: $f breaks <screen>[-<state>]-<pairing>.png"
    echo "$frames_table" | grep -qF "\`$f\`" || bad 2 "$s: $f not in ## Frames"
  done

  # --- Check 3: ratification record ---------------------------------------------
  grep -qE '^Ratified by:[[:space:]]*[^[:space:]]' "$A" || bad 3 "$s: no 'Ratified by:' line"
  grep -qE '^Date:[[:space:]]*[0-9]{4}-[0-9]{2}-[0-9]{2}[[:space:]]*$' "$A" || bad 3 "$s: no 'Date: YYYY-MM-DD' line"
  grep -qE '^Go-ahead:[[:space:]]*".+"' "$A" || bad 3 "$s: no quoted 'Go-ahead: \"…\"' line"
done

# --- Check 4: sealed files untouched -------------------------------------------------
for s in $SURFACES; do
  RAT="$V/$s/RATIFIED.md"
  [ -f "$RAT" ] || { bad 4 "$RAT missing"; continue; }
  while IFS= read -r line; do
    [ -z "$line" ] && continue
    sum=${line%%  *}; f=${line#*  }
    [ -f "$V/$s/$f" ] || { bad 4 "$s: sealed $f missing"; continue; }
    [ "$(shasum -a 256 "$V/$s/$f" | cut -d' ' -f1)" = "$sum" ] || bad 4 "$s: sealed $f changed"
  done <<< "$(section "$RAT" Manifest | grep -E '^[0-9a-f]{64}  ')"
  git diff --quiet HEAD -- "$RAT" || bad 4 "$s: RATIFIED.md modified"
done

# --- Check 5: backlog Status is done -------------------------------------------------
grep -qE '^\| [0-9]+ \| \[S56\].*\| `done` \|$' docs/v3/BACKLOG.md ||
  bad 5 "S56 row in the Story status table is not \`done\`"
awk '/^### S56 —/{f=1;next} /^### S[0-9]/{f=0} f' docs/v3/BACKLOG.md \
  | grep -qE '^\*\*Status:\*\* `done`$' ||
  bad 5 "S56 story heading Status is not \`done\`"

report "verify-S56"
exit $?
