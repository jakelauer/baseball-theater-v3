#!/usr/bin/env bash
# Grader for BACKLOG story S83 — shell fixes from the S60 comparison: the Adobe Fonts
# wordmark, the active rail item's fill and marker, text values from Figma, and the
# rule 22 design match over S60's six shell frames.
# Contract: docs/v3/BACKLOG.md#verify-script-contract
# No network. No writes outside /tmp. Does its own checking (never `pnpm verify`).
# Scope checks look only at this story's own changes (BASE..working tree): a commit-time
# proof, not a law (owner, 2026-10-28).

set -uo pipefail
cd "$(dirname "$0")/.."

# shellcheck source=lib/checks.sh
source "$(dirname "$0")/lib/checks.sh"

check 1 "web/index.html loads the owner's Typekit kit exactly; the wordmark's BT is set in clarendon-urw with a serif fallback; Wordmark's comment no longer says Plex (RTL)"
check 2 "the active rail/drawer item is filled var(--bt-primary) with the lighter left marker bar; inactive items have no bar (RTL)"
check 3 "rail item, header 'Sign in' and version line text values come from Figma, noted beside where they are set, and pinned by RTL tests"
check 4 "design match (rule 22): e2e/design/S83.spec.ts shares S60's frame list through one module; the six captures exist in docs/v3/design-checks/S83/ at their pairing widths"
check 5 "files this story adds or edits have no team-logo <img> or /logos/, and no useMediaQuery/hiddenFrom/visibleFrom outside web/src/layout/"
check 6 "backlog Status is done (story heading and Story status table)"

BASE=d92d556
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

run_vitest() {
  local id="$1" dir="$2" file="$3"
  shift 3
  if [ ! -f "$dir/$file" ]; then
    bad "$id" "$dir/$file missing"
  elif ! (cd "$dir" && pnpm exec vitest run "$file" "$@" --reporter=json --outputFile="$TMP/r.json" >"$TMP/r.log" 2>&1); then
    bad "$id" "$dir/$file $* failed:"; tail -15 "$TMP/r.log" | sed 's/^/        /'
  elif ! node -e 'process.exit(require(process.argv[1]).numPassedTests > 0 ? 0 : 1)' "$TMP/r.json"; then
    bad "$id" "$dir/$file $* ran no passing test"
  fi
}

png_width() {
  node -e 'const b=require("fs").readFileSync(process.argv[1]);process.stdout.write(String(b.readUInt32BE(16)))' "$1"
}

# --- Check 1: the wordmark font --------------------------------------------------------
# The owner's link exactly; HTML allows (and Prettier writes) the void element as `/>`.
grep -qE '<link rel="stylesheet" href="https://use\.typekit\.net/weo6zjs\.css" ?/?>' web/index.html ||
  bad 1 "web/index.html does not load the owner's kit exactly"
grep -qF 'clarendon-urw' web/src/layout/Wordmark.tsx || bad 1 "Wordmark.tsx does not use clarendon-urw"
grep -qE 'clarendon-urw[^;]*serif' web/src/layout/Wordmark.tsx || bad 1 "Wordmark.tsx gives clarendon-urw no serif fallback"
grep -qE 'Plex' web/src/layout/Wordmark.tsx && bad 1 "Wordmark.tsx still mentions Plex"
grep -qF 'clarendon-urw' web/src/layout/Wordmark.test.tsx 2>/dev/null || bad 1 "Wordmark.test.tsx does not pin clarendon-urw"
run_vitest 1 web src/layout/Wordmark.test.tsx

# --- Check 2: the active item -----------------------------------------------------------
grep -qF 'var(--bt-primary)' web/src/layout/NavRail.tsx || bad 2 "NavRail.tsx does not fill the active item with var(--bt-primary)"
for t in "marker" "active" "inactive"; do
  grep -qiF "$t" web/src/layout/NavRail.test.tsx 2>/dev/null || bad 2 "NavRail.test.tsx never mentions \"$t\""
done
run_vitest 2 web src/layout/NavRail.test.tsx -t "marker"

# --- Check 3: text values from Figma ----------------------------------------------------
grep -qiE 'Figma' web/src/layout/NavRail.tsx || bad 3 "NavRail.tsx records no Figma values"
grep -qiE 'Figma' web/src/layout/AppHeader.tsx || bad 3 "AppHeader.tsx records no Figma values"
run_vitest 3 web src/layout/NavRail.test.tsx -t "Figma"
run_vitest 3 web src/layout/AppHeader.test.tsx -t "Figma"

# --- Check 4: design match ----------------------------------------------------------------
S="e2e/design/S83.spec.ts"
[ -f "$S" ] || bad 4 "$S missing"
M="$(grep -lE 'export const SHELL_FRAMES' e2e/design/*.ts 2>/dev/null | head -1)"
[ -n "$M" ] || bad 4 "no e2e/design module exports SHELL_FRAMES"
for f in "$S" e2e/design/S60.spec.ts; do
  grep -qF 'SHELL_FRAMES' "$f" 2>/dev/null || bad 4 "$f does not use the shared SHELL_FRAMES"
done
grep -qF '"nav-drawer-mobile"' e2e/design/S60.spec.ts && bad 4 "S60.spec.ts still lists its own frames"
for f in nav-drawer-mobile:390 nav-drawer-medium:768 shell-signed-out-mobile:390 shell-signed-out-desktop:1200 shell-version-desktop:1200 scoreboard-header-version-desktop:1200; do
  name="${f%%:*}"; w="${f##*:}"; png="docs/v3/design-checks/S83/$name.png"
  if [ -f "$png" ]; then
    [ "$(png_width "$png")" = "$w" ] || bad 4 "$png is $(png_width "$png")px wide, want $w"
  else
    bad 4 "$png missing"
  fi
done

# --- Check 5: no logos, breakpoints only in layout (this story's own files) --------------
files="$( { git diff --name-only "$BASE" -- web/src; git ls-files --others --exclude-standard web/src; } | sort -u)"
for f in $files; do
  [ -f "$f" ] || continue
  grep -nE '/logos/|<img[^>]*logo' "$f" >/dev/null && bad 5 "$f references a team logo"
  case "$f" in
    web/src/layout/*) ;;
    *) grep -nwE 'useMediaQuery|hiddenFrom|visibleFrom' "$f" >/dev/null && bad 5 "$f uses a breakpoint helper outside web/src/layout/" ;;
  esac
done

# --- Check 6: backlog Status is done ----------------------------------------------------
grep -qE '^\| [0-9]+ \| \[S83\].*\| `done` \|$' docs/v3/BACKLOG.md ||
  bad 6 "S83 row in the Story status table is not \`done\`"
awk '/^### S83 —/{f=1;next} /^### S[0-9]/{f=0} f' docs/v3/BACKLOG.md \
  | grep -qE '^\*\*Status:\*\* `done`$' ||
  bad 6 "S83 story heading Status is not \`done\`"

report "verify-S83"
exit $?
