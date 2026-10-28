#!/usr/bin/env bash
# Grader for BACKLOG story S81 — design capture harness: Playwright at the three
# pairings against fixtures, `pnpm design:capture`, `audit.sh --design-match`, the
# rule 22 backlog check, and the S60 shell pilot (ADR-026 as amended 2026-10-28).
# Contract: docs/v3/BACKLOG.md#verify-script-contract
# No network. No writes outside /tmp (Playwright's output goes to a temp dir).

set -uo pipefail
cd "$(dirname "$0")/.."

# shellcheck source=lib/checks.sh
source "$(dirname "$0")/lib/checks.sh"

check 1 "@playwright/test pinned; e2e/playwright.config.ts runs the fixture-backed app with mobile 390x844, medium 768x1024, desktop 1200x844; a spec shows burger-no-rail on mobile/medium and rail-no-burger on desktop"
check 2 "e2e/design/helpers.ts signs in as the dev account, freezes the clock, stubs API answers with page.route, hides the dev control; a spec uses each"
check 3 "pnpm design:capture <ID> writes docs/v3/design-checks/<ID>/<frame>.png only (never docs/v3/visual/); Playwright output folders are git-ignored"
check 4 "audit.sh story --design-match records frame + capture SHA-256 and the owner's quoted verdict, and refuses completion of a design story without it (test)"
check 5 "pnpm backlog:check fails when a todo/doing story with a design: list lacks a Design match (rule 22) AC (vault test), and passes at HEAD"
check 6 "pnpm verify starts no browser (no Playwright in the verify chain)"
check 7 "S60 pilot: e2e/design/S60.spec.ts captures the six shell frames at their pairing widths into docs/v3/design-checks/S60/, and the ledger has an S60 re-verification with a Design match section quoting the owner"
check 8 "backlog Status is done (story heading and Story status table)"

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

# png_width <file> — the IHDR width of a PNG.
png_width() {
  node -e 'const b=require("fs").readFileSync(process.argv[1]);process.stdout.write(String(b.readUInt32BE(16)))' "$1"
}

# --- Check 1: Playwright config and pairings ---------------------------------------------
v="$(node -e 'const p=require("./package.json");process.stdout.write((p.devDependencies||{})["@playwright/test"]||"")')"
[ -n "$v" ] || bad 1 "@playwright/test is not a root dev dependency"
echo "$v" | grep -qE '^[0-9]+\.[0-9]+\.[0-9]+$' || bad 1 "@playwright/test is not pinned to an exact version ($v)"
C="e2e/playwright.config.ts"
if [ -f "$C" ]; then
  for s in "width: 390" "height: 844" "width: 768" "height: 1024" "width: 1200" "webServer"; do
    grep -qF "$s" "$C" || bad 1 "$C has no $s"
  done
  for p in '"mobile"' '"medium"' '"desktop"'; do grep -qF "name: $p" "$C" || bad 1 "$C has no project $p"; done
else
  bad 1 "$C missing"
fi
if [ -f e2e/shell.spec.ts ]; then
  if ! BT_E2E_OUTPUT="$TMP/out" pnpm exec playwright test --config "$C" e2e/shell.spec.ts --reporter=line >"$TMP/shell.log" 2>&1; then
    bad 1 "e2e/shell.spec.ts failed:"; tail -15 "$TMP/shell.log" | sed 's/^/        /'
  fi
  grep -qE '[0-9]+ passed' "$TMP/shell.log" || bad 1 "e2e/shell.spec.ts ran no passing test"
else
  bad 1 "e2e/shell.spec.ts missing"
fi

# --- Check 2: capture helpers -------------------------------------------------------------
H="e2e/design/helpers.ts"
if [ -f "$H" ]; then
  for f in signInDev freezeClock stubApi hideDevControls capture; do
    grep -qE "export (async )?function $f\b" "$H" || bad 2 "$H exports no $f"
    grep -lqE "\b$f\(" e2e/design/*.spec.ts 2>/dev/null || bad 2 "no e2e/design spec calls $f"
  done
else
  bad 2 "$H missing"
fi

# --- Check 3: capture command and where captures land ------------------------------------
node -e 'const p=require("./package.json");process.exit(/playwright test/.test((p.scripts||{})["design:capture"]||"")?0:1)' ||
  bad 3 "package.json has no design:capture script running playwright test"
grep -qF "docs/v3/design-checks" "$H" 2>/dev/null || bad 3 "$H does not write to docs/v3/design-checks"
grep -rqE 'docs/v3/visual' e2e/ 2>/dev/null && bad 3 "e2e/ refers to docs/v3/visual (captures must not land beside the frames)"
for g in test-results playwright-report; do
  git check-ignore -q "e2e/$g/x" || bad 3 "e2e/$g is not git-ignored"
done

# --- Check 4: audit.sh --design-match ----------------------------------------------------
grep -qF -- "--design-match" scripts/audit.sh || bad 4 "scripts/audit.sh has no --design-match option"
T="scripts/backlog-vault/audit-design-match.test.ts"
if [ -f "$T" ]; then
  grep -qE 'refuses' "$T" || bad 4 "$T has no refusal test"
  if ! pnpm exec vitest run --config scripts/backlog-vault/vitest.config.ts "$(basename "$T")" >"$TMP/audit.log" 2>&1; then
    bad 4 "$T failed:"; tail -15 "$TMP/audit.log" | sed 's/^/        /'
  fi
else
  bad 4 "$T missing"
fi

# --- Check 5: rule 22 in backlog:check ---------------------------------------------------
grep -qE 'export function designMatchProblems' scripts/backlog-vault/parse.ts || bad 5 "parse.ts exports no designMatchProblems"
if ! pnpm exec vitest run --config scripts/backlog-vault/vitest.config.ts parse.test.ts -t "rule 22" >"$TMP/vault.log" 2>&1; then
  bad 5 "rule 22 vault test failed:"; tail -15 "$TMP/vault.log" | sed 's/^/        /'
fi
grep -qE '[1-9][0-9]* passed' "$TMP/vault.log" || bad 5 "no rule 22 vault test ran"
pnpm -s backlog:check >"$TMP/bc.log" 2>&1 || { bad 5 "pnpm backlog:check fails at HEAD:"; tail -5 "$TMP/bc.log" | sed 's/^/        /'; }

# --- Check 6: no browser in pnpm verify --------------------------------------------------
node -e '
const s = require("./package.json").scripts || {};
const seen = new Set(), bad = [];
const walk = (name) => {
  if (seen.has(name) || !s[name]) return; seen.add(name);
  if (/playwright|design:capture|e2e\//.test(s[name])) bad.push(name + ": " + s[name]);
  for (const m of s[name].matchAll(/pnpm (?:-s )?(?:run )?([a-z][\w:-]*)/g)) walk(m[1]);
};
walk("verify");
if (bad.length) { console.log(bad.join("\n")); process.exit(1); }
' >"$TMP/chain.log" 2>&1 || { bad 6 "the verify chain reaches a browser:"; sed 's/^/        /' "$TMP/chain.log"; }

# --- Check 7: S60 pilot ------------------------------------------------------------------
P="e2e/design/S60.spec.ts"
for f in nav-drawer-mobile:390 nav-drawer-medium:768 shell-signed-out-mobile:390 shell-signed-out-desktop:1200 shell-version-desktop:1200 scoreboard-header-version-desktop:1200; do
  name="${f%%:*}"; w="${f##*:}"
  grep -qF "\"$name\"" "$P" 2>/dev/null || bad 7 "$P does not name $name"
  png="docs/v3/design-checks/S60/$name.png"
  if [ -f "$png" ]; then
    [ "$(png_width "$png")" = "$w" ] || bad 7 "$png is $(png_width "$png")px wide, want $w"
  else
    bad 7 "$png missing"
  fi
done
awk '/^## [0-9-]+ — S60 re-verified$/{f=1} f&&/^## [0-9-]+ — /&&!/S60 re-verified/{f=0} f' docs/v3/AUDIT.md >"$TMP/s60.md"
grep -qF "Design match" "$TMP/s60.md" || bad 7 "no S60 re-verification entry with a Design match section in docs/v3/AUDIT.md"
grep -qE '^Owner: ".+"' "$TMP/s60.md" || bad 7 "the S60 Design match section quotes no owner verdict"

# --- Check 8: backlog Status is done -----------------------------------------------------
grep -qE '^\| [0-9]+ \| \[S81\].*\| `done` \|$' docs/v3/BACKLOG.md ||
  bad 8 "S81 row in the Story status table is not \`done\`"
awk '/^### S81 —/{f=1;next} /^### S[0-9]/{f=0} f' docs/v3/BACKLOG.md \
  | grep -qE '^\*\*Status:\*\* `done`$' ||
  bad 8 "S81 story heading Status is not \`done\`"

report "verify-S81"
exit $?
