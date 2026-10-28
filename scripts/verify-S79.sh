#!/usr/bin/env bash
# Grader for BACKLOG story S79 — download and delete your data in Settings, built to
# standings-search-settings A4. A commit-time proof of this story (S84).
# Contract: docs/v3/BACKLOG.md#verify-script-contract
# No network. No writes outside /tmp. Does its own checking (never `pnpm verify`).

set -uo pipefail
cd "$(dirname "$0")/.."

# shellcheck source=lib/checks.sh
source "$(dirname "$0")/lib/checks.sh"

check 1 "the Account section shows Download your data and Delete account, signed in only (RTL at mobile and desktop)"
check 2 "download through the typed client: current download with link + expiry, the 24-hour refusal with the next allowed time, link disabled in flight, red error lines on failure, emailed clause always (RTL)"
check 3 "delete needs no download; Delete account unavailable until the phrase matches ACCOUNT_DELETION_PHRASE; sends only the phrase; warning with Download your data first (saves, dialog stays) while a download lasts; disabled in flight; dialog at mobile and 440px desktop (RTL)"
check 4 "a reauth_required refusal shows the re-sign-in prompt, which calls useSession().signIn() (RTL)"
check 5 "after deletion: personal keys cleared, signed out, account queries removed, signed-out scoreboard with the deleted notice (no action) from one in-memory notice source in web/src/layout/ that AppShellLayout passes to NoticeSlot (test)"
check 6 "a failed deletion shows Try again (resends) and the support message linking mailto:support@baseball.theater on every failure (RTL)"
check 7 "design match: e2e/design/S79.spec.ts names the ten A4 frames; each capture exists in docs/v3/design-checks/S79/ at its pairing width"
check 8 "files this story adds or edits have no team-logo <img> or /logos/, and no useMediaQuery/hiddenFrom/visibleFrom outside web/src/layout/"
check 9 "backlog Status is done (story heading and Story status table)"

BASE=71bab91
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
T="src/pages/settings/AccountData.test.tsx"

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

# --- Check 1: the ways in ------------------------------------------------------------------
run_vitest 1 web "$T" -t "ways in"

# --- Check 2: download -----------------------------------------------------------------------
C="web/src/api/client.ts"
for f in fetchCurrentDownload requestDownload fetchDownloadFile; do
  grep -qE "export async function $f" "$C" || bad 2 "$C exports no $f"
done
grep -qF '"/api/v1/me/download"' "$C" || bad 2 "$C never calls /api/v1/me/download through the typed client"
grep -qF "Couldn't request your download" web/src/pages/settings/*.tsx 2>/dev/null || bad 2 "no 'Couldn't request your download' copy"
run_vitest 2 web "$T" -t "download"

# --- Check 3: the delete dialog --------------------------------------------------------------
grep -qE 'export async function deleteAccount' "$C" || bad 3 "$C exports no deleteAccount"
grep -qF '"/api/v1/me/delete"' "$C" || bad 3 "$C never calls /api/v1/me/delete through the typed client"
grep -rqF 'ACCOUNT_DELETION_PHRASE' web/src/pages/settings/ || bad 3 "the dialog does not use ACCOUNT_DELETION_PHRASE"
hits="$(grep -rnF 'delete my account' web/src --include='*.tsx' --include='*.ts' | grep -v '\.test\.' || true)"
[ -n "$hits" ] && { bad 3 "the phrase is copied instead of read from ACCOUNT_DELETION_PHRASE:"; echo "$hits" | sed 's/^/        /'; }
run_vitest 3 web "$T" -t "delete dialog"

# --- Check 4: re-sign-in ---------------------------------------------------------------------
run_vitest 4 web "$T" -t "re-sign-in"

# --- Check 5: after deletion -----------------------------------------------------------------
N="$(git ls-files --cached --others --exclude-standard web/src/layout | grep -E '/notices?\.tsx?$' | head -1)"
if [ -n "$N" ]; then
  grep -qE 'readStored|writeStored|localStorage|sessionStorage' "$N" && bad 5 "$N writes the notice to browser storage"
  grep -qE 'useAppNotice|NoticeContext' web/src/layout/AppShellLayout.tsx || bad 5 "AppShellLayout does not read the app notice source"
else
  bad 5 "no notice source (notices.ts[x]) in web/src/layout/"
fi
grep -rqF "Your account and your data are deleted." web/src || bad 5 "no deleted-account notice copy"
run_vitest 5 web "$T" -t "after deletion"

# --- Check 6: failed deletion ----------------------------------------------------------------
grep -rqF 'mailto:support@baseball.theater' web/src/pages/settings/ || bad 6 "no mailto:support@baseball.theater link"
run_vitest 6 web "$T" -t "failed deletion"

# --- Check 7: design match -------------------------------------------------------------------
S="e2e/design/S79.spec.ts"
for f in settings-data-mobile:390 settings-data-desktop:1200 settings-download-ready-mobile:390 settings-download-limit-mobile:390 \
  settings-delete-confirm-mobile:390 settings-delete-confirm-desktop:1200 settings-delete-warning-mobile:390 \
  settings-delete-reauth-mobile:390 settings-delete-failed-mobile:390 scoreboard-deleted-mobile:390; do
  name="${f%%:*}"; w="${f##*:}"; png="docs/v3/design-checks/S79/$name.png"
  grep -qF "\"$name\"" "$S" 2>/dev/null || bad 7 "$S does not name $name"
  if [ -f "$png" ]; then
    [ "$(png_width "$png")" = "$w" ] || bad 7 "$png is $(png_width "$png")px wide, want $w"
  else
    bad 7 "$png missing"
  fi
done

# --- Check 8: no logos, viewport only in layout (this story's own files) ---------------------
for f in $(story_changed_files S79 "$BASE" web/src); do
  [ -f "$f" ] || continue
  grep -nE '/logos/|<img[^>]*logo' "$f" >/dev/null && bad 8 "$f references a team logo"
  case "$f" in
    web/src/layout/*) ;;
    *) grep -nwE 'useMediaQuery|hiddenFrom|visibleFrom' "$f" >/dev/null && bad 8 "$f reads the viewport outside web/src/layout/" ;;
  esac
done

# --- Check 9: backlog Status is done ---------------------------------------------------------
grep -qE '^\| [0-9]+ \| \[S79\].*\| `done` \|$' docs/v3/BACKLOG.md ||
  bad 9 "S79 row in the Story status table is not \`done\`"
awk '/^### S79 —/{f=1;next} /^### S[0-9]/{f=0} f' docs/v3/BACKLOG.md \
  | grep -qE '^\*\*Status:\*\* `done`$' ||
  bad 9 "S79 story heading Status is not \`done\`"

report "verify-S79"
exit $?
