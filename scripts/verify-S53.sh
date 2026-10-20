#!/usr/bin/env bash
# Grader for BACKLOG story S53 — duplication and comment checks: jscpd, comment
# staleness, reuse-check line (ADR-025).
# Contract: docs/v3/BACKLOG.md#verify-script-contract
# No network. No writes outside /tmp. Does its own checking (never `pnpm verify`).

set -uo pipefail
cd "$(dirname "$0")/.."

# shellcheck source=lib/checks.sh
source "$(dirname "$0")/lib/checks.sh"

check 1 "pnpm verify runs jscpd over packages/, functions/src/, web/src/ with a threshold in .jscpd.json (generated + fixtures ignored); a test shows a copied 30-line block fails it"
check 2 "pnpm comments:stale (under tools/) flags exported symbols whose body changed but comment did not, exits 0; unit test covers changed + unchanged"
check 3 "frame 00's rules require a **Reuse check** section on every story with the ADR-025 wording"
check 4 "pnpm verify still runs lint (with backlog check), coverage tests and build"
check 5 "backlog Status is done (story heading and Story status table)"

PKG="package.json"
script() { node -e "const s=require('./$PKG').scripts||{}; process.stdout.write(s['$1']||'')"; }
VERIFY=$(script verify)

# --- Check 1: jscpd configured and wired into pnpm verify ---------------------
CFG=".jscpd.json"
if [ ! -f "$CFG" ]; then
  bad 1 "$CFG missing"
else
  node -e "
    const c = require('./$CFG');
    const errs = [];
    if (typeof c.threshold !== 'number') errs.push('no numeric threshold');
    const paths = (c.path || []).join(' ');
    for (const p of ['packages', 'functions/src', 'web/src']) if (!paths.includes(p)) errs.push('path missing ' + p);
    const ign = (c.ignore || []).join(' ');
    if (!/generated/.test(ign)) errs.push('generated code not ignored');
    if (!/fixtures/.test(ign)) errs.push('fixtures not ignored');
    if (errs.length) { console.log(errs.join('; ')); process.exit(1); }
  " >/tmp/s53-cfg.log 2>&1 || bad 1 "$CFG: $(cat /tmp/s53-cfg.log)"
fi
# Expand one level of `pnpm <script>` references so a wrapper script counts.
chain="$VERIFY"
for s in $(echo "$VERIFY" | grep -oE 'pnpm [a-z:]+' | awk '{print $2}'); do chain="$chain $(script "$s")"; done
echo "$chain" | grep -q "jscpd" || bad 1 "pnpm verify does not run jscpd"
[ -n "$(find tools -path '*/node_modules' -prune -o -name '*jscpd*.test.js' -print)" ] ||
  bad 1 "no jscpd test under tools/"

# --- Check 2: comments:stale --------------------------------------------------
CS=$(script comments:stale)
if [ -z "$CS" ]; then
  bad 2 "package.json has no comments:stale script"
else
  echo "$CS" | grep -q "tools/" || bad 2 "comments:stale does not run a script under tools/"
  pnpm -s comments:stale >/tmp/s53-stale.log 2>&1 || { bad 2 "pnpm comments:stale does not exit 0"; tail -10 /tmp/s53-stale.log | sed 's/^/        /'; }
fi
[ -n "$(find tools -path '*/node_modules' -prune -o -name '*stale*.test.js' -print)" ] ||
  bad 2 "no comments:stale unit test under tools/"

# --- Checks 1+2: the tools tests pass ------------------------------------------
if ! pnpm exec vitest run --config tools/vitest.config.js >/tmp/s53-tools.log 2>&1; then
  bad 1 "tools tests (incl. jscpd) do not exit 0"
  bad 2 "tools tests (incl. comments:stale) do not exit 0"
  tail -20 /tmp/s53-tools.log | sed 's/^/        /'
else
  grep -qiE "jscpd" /tmp/s53-tools.log || bad 1 "tools run shows no jscpd test"
  grep -qiE "stale" /tmp/s53-tools.log || bad 2 "tools run shows no comments:stale test"
fi

# --- Check 3: the reuse-check rule ---------------------------------------------
F00="docs/v3/backlog/frame/00 Baseball Theater v3 — Checkable backlog.md"
grep -qE '^[0-9]+\. \*\*Every story (starts with|has) a `?\*\*Reuse check\*\*' "$F00" ||
  bad 3 "frame 00 has no numbered rule requiring a **Reuse check** section"
grep -q "search existing domain functions, components and hooks" "$F00" ||
  bad 3 "frame 00's rule lacks ADR-025's wording (\"search existing domain functions, components and hooks\")"
grep -q "search existing domain functions, components and hooks" docs/v3/BACKLOG.md ||
  bad 3 "BACKLOG.md not rebuilt with the rule"

# --- Check 4: existing verify steps still run ----------------------------------
for step in "pnpm lint" "pnpm test:coverage" "pnpm build"; do
  echo "$VERIFY" | grep -qF "$step" || bad 4 "pnpm verify no longer runs '$step'"
done
script lint | grep -q "backlog:check" || bad 4 "pnpm lint no longer runs backlog:check"

# --- Check 5: backlog Status is done -------------------------------------------
grep -qE '^\| [0-9]+ \| \[S53\].*\| `done` \|$' docs/v3/BACKLOG.md ||
  bad 5 "S53 row in the Story status table is not \`done\`"
awk '/^### S53 —/{f=1;next} /^### S[0-9]/{f=0} f' docs/v3/BACKLOG.md \
  | grep -qE '^\*\*Status:\*\* `done`$' ||
  bad 5 "S53 story heading Status is not \`done\`"

report "verify-S53"
exit $?
