#!/usr/bin/env bash
# Grader for BACKLOG story S78 — design amendment A4: download and delete your data
# (standings-search-settings). Frames for the ways in, the stored download, the
# 24-hour refusal, the typed-phrase confirmation and its warning, re-sign-in, a
# failed deletion with the support message, and the signed-out state after deletion.
# Contract: docs/v3/BACKLOG.md#verify-script-contract
# No network. No writes outside /tmp. Does its own checking (never `pnpm verify`).

set -uo pipefail
cd "$(dirname "$0")/.."

# shellcheck source=lib/checks.sh
source "$(dirname "$0")/lib/checks.sh"

check 1 "standings-search-settings/amendments/A4.md names what it adds/overrides/repeals, with ## Frames, ## Decisions (owner's words), ## Open questions = None., and a SHA-256 manifest of its frames"
check 2 "frames cover the ways in (mobile, desktop), ready download, 24-hour refusal, typed-phrase confirmation (mobile, desktop) and its download warning, re-sign-in, failed deletion with Try again + support message (mailto:support@baseball.theater), signed-out after deletion; <screen>[-<state>]-<pairing>.png, all in ## Frames; ## Decisions quotes the owner's 2026-10-23, 2026-10-27 and 2026-10-28 words"
check 3 "the ratification record quotes the owner's in-session go-ahead verbatim"
check 4 "no sealed file in the surface changed (RATIFIED.md and A1-A3 manifests still verify)"
check 5 "backlog Status is done (story heading and Story status table)"

S="docs/v3/visual/standings-search-settings"
DIR="$S/amendments"
A="$DIR/A4.md"

# Lines of section "## <name>" in a file.
section() {
  awk -v h="## $2" '$0==h{f=1;next} /^## /{f=0} f' "$1"
}

# Frames in amendments/ not claimed by another amendment's manifest (A1-A3 share the folder).
own_frames() {
  local f a other
  for f in $(cd "$DIR" && ls *.png 2>/dev/null); do
    other=0
    for a in "$DIR"/A[0-9]*.md; do
      [ "$a" = "$A" ] && continue
      section "$a" Manifest | grep -qE "^[0-9a-f]{64}  $f\$" && other=1
    done
    [ "$other" = 0 ] && echo "$f"
  done
}

# The frames AC 2 names, one per state and pairing.
REQUIRED="settings-data-mobile.png settings-data-desktop.png
settings-download-ready-mobile.png settings-download-limit-mobile.png
settings-delete-confirm-mobile.png settings-delete-confirm-desktop.png
settings-delete-warning-mobile.png settings-delete-reauth-mobile.png
settings-delete-failed-mobile.png scoreboard-deleted-mobile.png"

if [ ! -f "$A" ]; then
  bad 1 "$A missing"
  bad 2 "no amendment, so no frames"
  bad 3 "no amendment, so no ratification record"
else
  # --- Check 1: the amendment file and its sections ---------------------------------------
  for i in 1 2 3; do [ -f "$DIR/A$i.md" ] || bad 1 "A4 is not the next free number (A$i.md missing)"; done
  grep -qE '^# A4 .*\(S78\)$' "$A" || bad 1 "$A heading does not end with (S78)"
  for w in Adds Overrides Repeals; do
    grep -qE "^\*\*$w:\*\*" "$A" || bad 1 "$A has no **$w:** line"
  done
  for h in Frames Decisions "Open questions" Manifest; do
    grep -qx "## $h" "$A" || bad 1 "$A has no ## $h"
  done
  oq=$(section "$A" "Open questions" | sed '/^[[:space:]]*$/d')
  [ "$oq" = "None." ] || bad 1 "## Open questions body is not exactly 'None.'"
  manifest=$(section "$A" Manifest | grep -E '^[0-9a-f]{64}  ')
  want=$(own_frames | sort)
  got=$(printf '%s\n' "$manifest" | sed -E 's/^[0-9a-f]{64}  //' | sed '/^$/d' | sort)
  [ -n "$want" ] && [ "$want" = "$got" ] || bad 1 "## Manifest does not list every A4 frame in amendments/ exactly once"
  while IFS= read -r line; do
    [ -z "$line" ] && continue
    sum=${line%%  *}; f=${line#*  }
    [ -f "$DIR/$f" ] || { bad 1 "manifest names missing $f"; continue; }
    [ "$(shasum -a 256 "$DIR/$f" | cut -d' ' -f1)" = "$sum" ] || bad 1 "SHA-256 mismatch: $f"
  done <<< "$manifest"

  # --- Check 2: required frames, naming, Frames table, Decisions --------------------------
  frames_table=$(section "$A" Frames)
  for f in $REQUIRED; do
    [ -f "$DIR/$f" ] || bad 2 "frame $f missing"
    echo "$frames_table" | grep -qF "\`$f\`" || bad 2 "$f not in ## Frames"
  done
  for f in $(own_frames); do
    echo "$f" | grep -qE '^[a-z]+(-[a-z]+)*-(mobile|medium|desktop)\.png$' || bad 2 "$f breaks <screen>[-<state>]-<pairing>.png"
    echo "$frames_table" | grep -qF "\`$f\`" || bad 2 "$f not in ## Frames"
  done
  echo "$frames_table" | grep -qF 'support@baseball.theater' || bad 2 "## Frames does not record the support link support@baseball.theater"
  echo "$frames_table" | grep -qF 'Try again' || bad 2 "## Frames does not record the failed deletion's Try again"
  decisions=$(section "$A" Decisions)
  for q in \
    "Deleting and downloading aren't connected" \
    "bucket age-out policy of 14 days" \
    "Rolling 24 hours" \
    "Delete them together with a warning shown and a link to the download" \
    "Immediately, but with maximal verification including typing a phrase" \
    "Try Again, contact support is failed repeatedly" \
    "show all the time" \
    "mailto: support@baseball.theater"; do
    echo "$decisions" | grep -qF "$q" || bad 2 "## Decisions does not quote \"$q\""
  done
  echo "$decisions" | grep -qE 'Both' || bad 2 "## Decisions does not quote the owner's \"Both\" (Settings and email)"

  # --- Check 3: ratification record -------------------------------------------------------
  grep -qE '^Ratified by:[[:space:]]*[^[:space:]]' "$A" || bad 3 "no 'Ratified by:' line"
  grep -qE '^Date:[[:space:]]*[0-9]{4}-[0-9]{2}-[0-9]{2}[[:space:]]*$' "$A" || bad 3 "no 'Date: YYYY-MM-DD' line"
  grep -qE '^Go-ahead:[[:space:]]*".+"' "$A" || bad 3 "no quoted 'Go-ahead: \"…\"' line"
fi

# --- Check 4: sealed files untouched ---------------------------------------------------------
RAT="$S/RATIFIED.md"
if [ -f "$RAT" ]; then
  while IFS= read -r line; do
    [ -z "$line" ] && continue
    sum=${line%%  *}; f=${line#*  }
    [ -f "$S/$f" ] || { bad 4 "sealed $f missing"; continue; }
    [ "$(shasum -a 256 "$S/$f" | cut -d' ' -f1)" = "$sum" ] || bad 4 "sealed $f changed"
  done <<< "$(section "$RAT" Manifest | grep -E '^[0-9a-f]{64}  ')"
  git diff --quiet HEAD -- "$RAT" || bad 4 "RATIFIED.md modified"
else
  bad 4 "$RAT missing"
fi
for i in 1 2 3; do
  P="$DIR/A$i.md"
  [ -f "$P" ] || continue
  git diff --quiet HEAD -- "$P" || bad 4 "A$i.md modified"
  while IFS= read -r line; do
    [ -z "$line" ] && continue
    sum=${line%%  *}; f=${line#*  }
    [ "$(shasum -a 256 "$DIR/$f" 2>/dev/null | cut -d' ' -f1)" = "$sum" ] || bad 4 "A$i frame $f changed"
  done <<< "$(section "$P" Manifest | grep -E '^[0-9a-f]{64}  ')"
done

# --- Check 5: backlog Status is done ---------------------------------------------------------
grep -qE '^\| [0-9]+ \| \[S78\].*\| `done` \|$' docs/v3/BACKLOG.md ||
  bad 5 "S78 row in the Story status table is not \`done\`"
awk '/^### S78 —/{f=1;next} /^### S[0-9]/{f=0} f' docs/v3/BACKLOG.md \
  | grep -qE '^\*\*Status:\*\* `done`$' ||
  bad 5 "S78 story heading Status is not \`done\`"

report "verify-S78"
exit $?
