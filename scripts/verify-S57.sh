#!/usr/bin/env bash
# Grader for BACKLOG story S57 — design amendments: Hide Scores beyond the
# scoreboard — rooms, slot occupants, digest, collapsed bar, video titles (rule 18).
# Contract: docs/v3/BACKLOG.md#verify-script-contract
# No network. No writes outside /tmp. Does its own checking (never `pnpm verify`).

set -uo pipefail
cd "$(dirname "$0")/.."

# shellcheck source=lib/checks.sh
source "$(dirname "$0")/lib/checks.sh"

check 1 "each touched surface has its next free amendments/A<N>.md naming what it adds/overrides/repeals, with ## Frames, ## Decisions (owner's words), ## Open questions = None., and a SHA-256 manifest of its frames"
check 2 "frames cover: Live, Box, Plays (with Runs) and Recap with Hide Scores on (mobile; Live also medium); scoreboard slot occupants, digest and collapsed bar under Hide Scores (mobile); Videos titles incl. Recap (score hidden); the owner's free-text title rule quoted in ## Decisions — named <screen>[-<state>]-<pairing>.png and listed in ## Frames"
check 3 "each amendment's ratification record quotes the owner's in-session go-ahead verbatim"
check 4 "no sealed file in those surfaces changed (each RATIFIED.md manifest still verifies)"
check 5 "backlog Status is done (story heading and Story status table)"

V="docs/v3/visual"
SURFACES="shell-scoreboard game-shell game-rooms"

# Lines of section "## <name>" in a file.
section() {
  awk -v h="## $2" '$0==h{f=1;next} /^## /{f=0} f' "$1"
}

# The S57 amendment of a surface: the A<N>.md whose heading ends "(S57)".
# (A plain grep would also match S56's shell-scoreboard A2, which mentions S57.)
amendment() {
  local dir="$V/$1/amendments"
  [ -d "$dir" ] || return 0
  grep -lE '^# A[0-9]+ .*\(S57\)$' "$dir"/A[0-9]*.md 2>/dev/null | head -1
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
    shell-scoreboard) echo "scoreboard-slots-hidden-mobile.png scoreboard-digest-hidden-mobile.png scoreboard-collapsed-hidden-mobile.png" ;;
    game-shell) echo "game-videos-hidden-mobile.png" ;;
    game-rooms) echo "live-hidden-mobile.png live-hidden-medium.png box-hidden-mobile.png plays-hidden-mobile.png plays-scoring-hidden-mobile.png recap-hidden-mobile.png" ;;
  esac
}

for s in $SURFACES; do
  A=$(amendment "$s")
  dir="$V/$s/amendments"

  # --- Check 1: the amendment file and its sections ---------------------------
  if [ -z "$A" ]; then
    bad 1 "$s: no amendments/A<N>.md naming S57"
    bad 2 "$s: no amendment, so no frames"
    bad 3 "$s: no amendment, so no ratification record"
    continue
  fi
  n=$(basename "$A" .md | tr -d 'A')
  # Next free: every lower number exists, and S57's is the highest when written.
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
  # AC 2: the free-text title rule is the owner's, quoted (game-shell carries the Videos titles).
  if [ "$s" = game-shell ]; then
    section "$A" Decisions | grep -qiE 'title' || bad 2 "$s: ## Decisions records no free-text title rule"
    section "$A" Decisions | grep -qF 'Recap (score hidden)' || bad 2 "$s: ## Decisions does not quote the recap title rule"
  fi
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
grep -qE '^\| [0-9]+ \| \[S57\].*\| `done` \|$' docs/v3/BACKLOG.md ||
  bad 5 "S57 row in the Story status table is not \`done\`"
awk '/^### S57 —/{f=1;next} /^### S[0-9]/{f=0} f' docs/v3/BACKLOG.md \
  | grep -qE '^\*\*Status:\*\* `done`$' ||
  bad 5 "S57 story heading Status is not \`done\`"

report "verify-S57"
exit $?
