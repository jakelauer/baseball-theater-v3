#!/usr/bin/env bash
# Grader for BACKLOG story S58 — design amendments: the signed-in Account section,
# Patreon linked / not linked, and the desktop header re-export with the ratified
# version line; sign-in screens are Logto's, so none is drawn (owner, 2026-10-22; rule 18).
# Contract: docs/v3/BACKLOG.md#verify-script-contract
# No network. No writes outside /tmp. Does its own checking (never `pnpm verify`).

set -uo pipefail
cd "$(dirname "$0")/.."

# shellcheck source=lib/checks.sh
source "$(dirname "$0")/lib/checks.sh"

check 1 "each touched surface has its next free amendments/A<N>.md naming what it adds/overrides/repeals, with ## Frames, ## Decisions (owner's words), ## Open questions = None., and a SHA-256 manifest of its frames"
check 2 "frames cover: signed-in Account section with sign out (mobile, desktop); Patreon not linked and linked with tier (mobile); desktop scoreboard header with rail foot v3.0.0 (c46e853) — named <screen>[-<state>]-<pairing>.png and listed in ## Frames; no sign-in, email or code-entry frame; ## Decisions records that Logto's sign-in experience provides them"
check 3 "each amendment's ratification record quotes the owner's in-session go-ahead verbatim"
check 4 "no sealed file in those surfaces changed (each RATIFIED.md manifest still verifies)"
check 5 "backlog Status is done (story heading and Story status table)"

V="docs/v3/visual"
SURFACES="standings-search-settings shell-scoreboard"

# Lines of section "## <name>" in a file.
section() {
  awk -v h="## $2" '$0==h{f=1;next} /^## /{f=0} f' "$1"
}

# The S58 amendment of a surface: the A<N>.md whose heading ends "(S58)".
# (A plain grep would also match earlier amendments that mention S58.)
amendment() {
  local dir="$V/$1/amendments"
  [ -d "$dir" ] || return 0
  grep -lE '^# A[0-9]+ .*\(S58\)$' "$dir"/A[0-9]*.md 2>/dev/null | head -1
}

# Frames in amendments/ not claimed by another amendment's manifest (earlier amendments share the folder).
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
    standings-search-settings) echo "settings-account-mobile.png settings-account-desktop.png settings-patreon-unlinked-mobile.png settings-patreon-linked-mobile.png" ;;
    shell-scoreboard) echo "scoreboard-header-version-desktop.png" ;;
  esac
}

for s in $SURFACES; do
  A=$(amendment "$s")
  dir="$V/$s/amendments"

  # --- Check 1: the amendment file and its sections ---------------------------
  if [ -z "$A" ]; then
    bad 1 "$s: no amendments/A<N>.md naming S58"
    bad 2 "$s: no amendment, so no frames"
    bad 3 "$s: no amendment, so no ratification record"
    continue
  fi
  n=$(basename "$A" .md | tr -d 'A')
  # Next free: every lower number exists, and S58's is the highest when written.
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
  # AC 2: the owner's Logto decision is recorded in their words, and the header carries the ratified version line.
  if [ "$s" = standings-search-settings ]; then
    section "$A" Decisions | grep -qF 'I will use the logto features for that' || bad 2 "$s: ## Decisions does not quote the owner's Logto decision"
  fi
  if [ "$s" = shell-scoreboard ]; then
    section "$A" Frames | grep -qF 'v3.0.0 (c46e853)' || bad 2 "$s: ## Frames does not record the rail foot v3.0.0 (c46e853)"
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
    echo "$f" | grep -qiE 'sign-?in|email|code' && bad 2 "$s: $f draws a sign-in, email or code-entry screen (Logto provides those)"
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
grep -qE '^\| [0-9]+ \| \[S58\].*\| `done` \|$' docs/v3/BACKLOG.md ||
  bad 5 "S58 row in the Story status table is not \`done\`"
awk '/^### S58 —/{f=1;next} /^### S[0-9]/{f=0} f' docs/v3/BACKLOG.md \
  | grep -qE '^\*\*Status:\*\* `done`$' ||
  bad 5 "S58 story heading Status is not \`done\`"

report "verify-S58"
exit $?
