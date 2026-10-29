#!/usr/bin/env bash
# Grader for BACKLOG story S61 — team colors and division names: teamColor,
# contrastSafeTeamColor and divisionName in packages/domain; TeamEdge, TeamSwatch and
# MatchupAbbr in web/src/components/team/. A commit-time proof of this story (S84).
# Contract: docs/v3/BACKLOG.md#verify-script-contract
# No network. No writes outside /tmp. Does its own checking (never `pnpm verify`).

set -uo pipefail
cd "$(dirname "$0")/.."

# shellcheck source=lib/checks.sh
source "$(dirname "$0")/lib/checks.sh"

check 1 "teamColor(teamId) in packages/domain covers all 30 MLB_TEAMS ids (test)"
check 2 "contrastSafeTeamColor(teamId) is at least 3:1 against #10100F for every team (the test computes contrast; this grader recomputes it)"
check 3 "divisionName(divisionId) maps the six division ids in fixtures/standings-2026-09-05.json (test asserts AL East)"
check 4 "TeamEdge, TeamSwatch and MatchupAbbr in web/src/components/team/ render contrastSafeTeamColor (RTL asserts the style); no hex literal in those files"
check 5 "files this story adds or edits have no team-logo <img> or /logos/, and no useMediaQuery/hiddenFrom/visibleFrom outside web/src/layout/"
check 6 "design match (rule 22): none — no page shows these yet; no captures are made for S61"
check 7 "backlog Status is done (story heading and Story status table)"

BASE=4311849
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
DT="src/team-colors.test.ts"
COMP="web/src/components/team"

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

# Run a snippet against packages/domain's own source (not the built package).
domain_eval() {
  (cd packages/domain && pnpm exec tsx -e "import * as d from './src/index.ts'; $1") 2>&1
}

# --- Check 1: teamColor covers all 30 ----------------------------------------------------------
grep -qE 'export function teamColor\(' packages/domain/src/*.ts 2>/dev/null || bad 1 "packages/domain exports no teamColor"
out="$(domain_eval 'const miss = d.MLB_TEAMS.filter((t) => !/^#[0-9a-f]{6}$/i.test(d.teamColor(t.id) ?? "")); console.log(d.MLB_TEAMS.length === 30 && miss.length === 0 ? "ok" : "missing " + miss.map((t) => t.abbreviation).join(","));')"
[ "$out" = "ok" ] || bad 1 "teamColor does not give all 30 teams a #rrggbb color: $out"
run_vitest 1 packages/domain "$DT" -t "teamColor"

# --- Check 2: contrast against the background ---------------------------------------------------
out="$(domain_eval '
  const lin = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  const lum = (h) => { const n = parseInt(h.slice(1), 16); return 0.2126 * lin(n >> 16) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255); };
  const bg = lum("#10100F");
  const low = d.MLB_TEAMS.map((t) => [t.abbreviation, d.contrastSafeTeamColor(t.id)])
    .filter(([, c]) => !/^#[0-9a-f]{6}$/i.test(c ?? "") || (Math.max(lum(c), bg) + 0.05) / (Math.min(lum(c), bg) + 0.05) < 3);
  console.log(low.length ? "below 3:1: " + low.map(([a, c]) => a + " " + c).join(", ") : "ok");')"
[ "$out" = "ok" ] || bad 2 "contrastSafeTeamColor: $out"
grep -qE '2\.4|luminance' "packages/domain/$DT" 2>/dev/null || bad 2 "packages/domain/$DT does not compute contrast itself"
run_vitest 2 packages/domain "$DT" -t "contrast"

# --- Check 3: division names -------------------------------------------------------------------------
out="$(domain_eval '
  const ids = JSON.parse(require("fs").readFileSync("../../fixtures/standings-2026-09-05.json", "utf8")).divisions.map((x) => x.divisionId);
  const bad = ids.filter((id) => !/^(AL|NL) (East|Central|West)$/.test(d.divisionName(id) ?? ""));
  console.log(ids.length === 6 && !bad.length && d.divisionName(201) === "AL East" ? "ok" : "unmapped " + bad.join(","));')"
[ "$out" = "ok" ] || bad 3 "divisionName: $out"
grep -qF '"AL East"' "packages/domain/$DT" 2>/dev/null || bad 3 "packages/domain/$DT does not assert \"AL East\""
run_vitest 3 packages/domain "$DT" -t "divisionName"

# --- Check 4: the components -----------------------------------------------------------------------
for c in TeamEdge TeamSwatch MatchupAbbr; do
  f="$COMP/$c.tsx"
  if [ ! -f "$f" ]; then bad 4 "$f missing"; continue; fi
  grep -qw contrastSafeTeamColor "$f" || bad 4 "$f does not use contrastSafeTeamColor"
  grep -nE '#[0-9a-fA-F]{3,8}\b' "$f" >/dev/null && bad 4 "$f contains a hex literal: $(grep -noE '#[0-9a-fA-F]{3,8}\b' "$f" | head -3 | tr '\n' ' ')"
done
run_vitest 4 web "src/components/team/team.test.tsx"

# --- Check 5: no logos, viewport only in layout (this story's own files) ---------------------
for f in $(story_changed_files S61 "$BASE" web/src packages/domain/src); do
  [ -f "$f" ] || continue
  grep -nE '/logos/|<img[^>]*logo' "$f" >/dev/null && bad 5 "$f references a team logo"
  case "$f" in
    web/src/layout/*) ;;
    *) grep -nwE 'useMediaQuery|hiddenFrom|visibleFrom' "$f" >/dev/null && bad 5 "$f reads the viewport outside web/src/layout/" ;;
  esac
done

# --- Check 6: design match none ------------------------------------------------------------------
[ -e docs/v3/design-checks/S61 ] && bad 6 "docs/v3/design-checks/S61 exists, but S61 has no page to capture (owner: \"Skip stories with no page\")"
[ -e e2e/design/S61.spec.ts ] && bad 6 "e2e/design/S61.spec.ts exists, but S61 has no page to capture"
grep -qE 'Design match \(rule 22\): none' docs/v3/backlog/stories/S61.md || bad 6 "S61's note no longer says its design match is none"

# --- Check 7: backlog Status is done ---------------------------------------------------------
grep -qE '^\| [0-9]+ \| \[S61\].*\| `done` \|$' docs/v3/BACKLOG.md ||
  bad 7 "S61 row in the Story status table is not \`done\`"
awk '/^### S61 —/{f=1;next} /^### S[0-9]/{f=0} f' docs/v3/BACKLOG.md \
  | grep -qE '^\*\*Status:\*\* `done`$' ||
  bad 7 "S61 story heading Status is not \`done\`"

report "verify-S61"
exit $?
