#!/usr/bin/env bash
# Grader for BACKLOG story S10 — the Recap room: MLB's editorial recap derived offline
# for 823823, rendered as the recap document only (headline, paragraphs, "Source: MLB"),
# and the Recap tab shown only when a recap exists. A commit-time proof (S84).
# Contract: docs/v3/BACKLOG.md#verify-script-contract
# No network. No writes outside /tmp. Does its own checking (never `pnpm verify`).

set -uo pipefail
cd "$(dirname "$0")/.."

# shellcheck source=lib/checks.sh
source "$(dirname "$0")/lib/checks.sh"

check 1 "(AC 1) a committed fixtures/game-*.json has a recap with text / html / blurb of length >= 20 (and a headline)"
check 2 "(AC 2) GET /api/v1/games/<that gamePk> returns the same recap (in-process functions test)"
check 3 "(AC 3) the Recap tab for that game shows a >= 12-character substring of the fixture recap inside the recap panel (RTL)"
check 4 "(AC 3a) the recap panel holds the recap document only: no inning cells, no R / H / E headers, no score element (RTL)"
check 5 "(AC 3b) a final game with a recap shows the Recap tab; 744834 (no recap) doesn't, and /game/744834/recap opens the default room (RTL)"
check 6 "(AC 4) that web test file exits 0 run alone via pnpm --filter @bt/web exec vitest run"
check 7 "(AC 5) recap carries headline; the panel renders it as a heading, the text, and 'Source: MLB' (RTL)"
check 8 "(AC 6) design match: e2e/design/S10.spec.ts names recap-mobile, recap-medium, recap-desktop, recap-source-mobile; docs/v3/design-checks/S10/ holds them at 390/768/1200/390"
check 9 "(AC 7) backlog Status is done (story heading and Story status table)"

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
WT="src/components/game/RecapRoom.test.tsx"

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

# --- Check 1: a fixture with a recap ----------------------------------------------------------------
PK="$(node -e '
  const fs = require("fs");
  for (const f of fs.readdirSync("fixtures").filter((f) => /^game-\d+\.json$/.test(f))) {
    const r = JSON.parse(fs.readFileSync("fixtures/" + f, "utf8")).recap;
    const body = [r?.text, r?.html, r?.blurb].find((s) => typeof s === "string" && s.length >= 20);
    if (body && typeof r.headline === "string" && r.headline.length > 0) { console.log(f.match(/\d+/)[0]); break; }
  }')"
[ -n "$PK" ] || bad 1 "no fixtures/game-*.json has a recap with a headline and text / html / blurb of 20+ characters"

# --- Check 2: the route ----------------------------------------------------------------------------
FT="$(grep -lE 'recap' functions/src/services/*.test.ts functions/src/handlers/*.test.ts 2>/dev/null | xargs grep -lE "/api/v1/games/${PK:-none}" 2>/dev/null | head -1)"
if [ -z "$FT" ]; then
  bad 2 "no functions test requests /api/v1/games/${PK:-<gamePk>} and checks recap"
else
  run_vitest 2 functions "${FT#functions/}" -t "recap"
fi

# --- Checks 3, 3a, 3b, 5: the Recap room (RTL) -----------------------------------------------------
run_vitest 3 web "$WT" -t "recap panel"
run_vitest 4 web "$WT" -t "document only"
run_vitest 5 web "$WT" -t "tab presence"
run_vitest 7 web "$WT" -t "headline"
if [ -n "$PK" ] && [ -f "web/$WT" ]; then
  # The test's substring must come from the fixture's own recap.
  node -e '
    const fs = require("fs");
    const r = JSON.parse(fs.readFileSync("fixtures/game-" + process.argv[1] + ".json", "utf8")).recap;
    const t = fs.readFileSync(process.argv[2], "utf8");
    const quoted = [...t.matchAll(/"([^"\n]{12,})"/g)].map((m) => m[1]);
    process.exit(quoted.some((q) => (r.text ?? r.html ?? r.blurb ?? "").includes(q)) ? 0 : 1);' "$PK" "web/$WT" ||
    bad 3 "web/$WT quotes no 12+ character substring of fixtures/game-$PK.json's recap"
fi

# --- Check 6: the web file alone ---------------------------------------------------------------------
if [ -f "web/$WT" ]; then
  pnpm --filter @bt/web exec vitest run "$WT" >"$TMP/w.log" 2>&1 || { bad 6 "pnpm --filter @bt/web exec vitest run $WT failed:"; tail -10 "$TMP/w.log" | sed 's/^/        /'; }
else
  bad 6 "web/$WT missing"
fi

# --- Check 8: design match captures ----------------------------------------------------------------
S="e2e/design/S10.spec.ts"
for fw in recap-mobile:390 recap-medium:768 recap-desktop:1200 recap-source-mobile:390; do
  name="${fw%%:*}"; w="${fw##*:}"; png="docs/v3/design-checks/S10/$name.png"
  grep -qF "\"$name\"" "$S" 2>/dev/null || bad 8 "$S does not name $name"
  if [ -f "$png" ]; then
    [ "$(png_width "$png")" = "$w" ] || bad 8 "$png is $(png_width "$png")px wide, want $w"
  else
    bad 8 "$png missing"
  fi
done

# --- Check 9: backlog Status is done -----------------------------------------------------------------
grep -qE '^\| [0-9]+ \| \[S10\].*\| `done` \|$' docs/v3/BACKLOG.md ||
  bad 9 "S10 row in the Story status table is not \`done\`"
awk '/^### S10 —/{f=1;next} /^### S[0-9]/{f=0} f' docs/v3/BACKLOG.md \
  | grep -qE '^\*\*Status:\*\* `done`$' ||
  bad 9 "S10 story heading Status is not \`done\`"

report "verify-S10"
exit $?
