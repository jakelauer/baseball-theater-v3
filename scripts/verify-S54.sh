#!/usr/bin/env bash
# Grader for BACKLOG story S54 — budgets in pnpm verify: bundle size,
# render-count harness, coverage ratchet (ADR-026).
# Contract: docs/v3/BACKLOG.md#verify-script-contract
# No network. No writes outside /tmp. Does its own checking (never `pnpm verify`).

set -uo pipefail
cd "$(dirname "$0")/.."

# shellcheck source=lib/checks.sh
source "$(dirname "$0")/lib/checks.sh"

check 1 "pnpm verify runs size-limit on the built web/dist with a 200 KB gzipped budget; a test with the budget lowered to 1 KB shows it exits nonzero and names the asset"
check 2 "web/src/test/renderCount.tsx exports a React Profiler helper; its test asserts the render count of a toy component across one state change"
check 3 "every package's coverage floor (lines, branches, functions, statements) is raised to its measured value rounded down to the whole percent"
check 4 "frame 00's rules record the ratchet: raise the floors each story can until domain 95 and the rest 85 lines / 80 branches (ADR-026); never lower one"
check 5 "backlog Status is done (story heading and Story status table)"

PKG="package.json"
script() { node -e "const s=require('./$PKG').scripts||{}; process.stdout.write(s['$1']||'')"; }
VERIFY=$(script verify)

# --- Check 1: size-limit wired into pnpm verify with a 200 KB budget ----------
CFG=".size-limit.json"
if [ ! -f "$CFG" ]; then
  bad 1 "$CFG missing"
else
  node -e "
    const c = require('./$CFG');
    const errs = [];
    if (!Array.isArray(c) || c.length === 0) errs.push('not a non-empty array');
    else for (const e of c) {
      const paths = [].concat(e.path || []).join(' ');
      if (!/web\/dist/.test(paths)) errs.push('entry ' + (e.name || '?') + ' does not measure web/dist');
      if (!/^200 ?k?B$/i.test(String(e.limit || '').trim())) errs.push('entry ' + (e.name || '?') + ' limit is ' + e.limit + ', not 200 KB');
      if (e.gzip === false || e.brotli === true) errs.push('entry ' + (e.name || '?') + ' is not gzip-measured');
    }
    if (errs.length) { console.log(errs.join('; ')); process.exit(1); }
  " >/tmp/s54-cfg.log 2>&1 || bad 1 "$CFG: $(cat /tmp/s54-cfg.log)"
fi
# size-limit must run after the build (it measures web/dist), inside pnpm verify.
chain="$VERIFY"
for s in $(echo "$VERIFY" | grep -oE 'pnpm [a-z:-]+' | awk '{print $2}'); do chain="$chain $(script "$s")"; done
echo "$chain" | grep -q "size-limit" || bad 1 "pnpm verify does not run size-limit"
echo "$VERIFY" | node -e "
  const v = require('fs').readFileSync(0, 'utf8');
  const steps = v.split('&&').map((s) => s.trim());
  const pkg = require('./$PKG').scripts;
  const runs = (step) => step.includes('size-limit') || (/^pnpm (\S+)/.test(step) && (pkg[step.split(' ')[1]] || '').includes('size-limit'));
  const size = steps.findIndex(runs), build = steps.indexOf('pnpm build');
  process.exit(size > build && build >= 0 ? 0 : 1);
" || bad 1 "size-limit does not run after pnpm build in pnpm verify"
SL_TEST=$(find tools -path '*/node_modules' -prune -o -name '*size-limit*.test.js' -print | head -1)
if [ -z "$SL_TEST" ]; then
  bad 1 "no size-limit test under tools/"
else
  grep -qE '1 ?kB|1 ?KB' "$SL_TEST" || bad 1 "$SL_TEST does not lower the budget to 1 KB"
fi

# --- Check 2: render-count helper ---------------------------------------------
RC="web/src/test/renderCount.tsx"
if [ ! -f "$RC" ]; then
  bad 2 "$RC missing"
else
  grep -q "Profiler" "$RC" || bad 2 "$RC does not use React's Profiler"
  grep -qE '^export (function|const)' "$RC" || bad 2 "$RC has no named export"
fi
RC_TEST=$(ls web/src/test/renderCount.test.tsx 2>/dev/null)
if [ -z "$RC_TEST" ]; then
  bad 2 "web/src/test/renderCount.test.tsx missing"
elif ! (cd web && pnpm exec vitest run src/test/renderCount.test.tsx >/tmp/s54-rc.log 2>&1); then
  bad 2 "renderCount test does not exit 0"
  tail -15 /tmp/s54-rc.log | sed 's/^/        /'
fi

# --- Checks 1 (test half): the tools tests pass --------------------------------
if ! pnpm exec vitest run --config tools/vitest.config.js >/tmp/s54-tools.log 2>&1; then
  bad 1 "tools tests (incl. size-limit) do not exit 0"
  tail -20 /tmp/s54-tools.log | sed 's/^/        /'
else
  grep -qiE "size-limit" /tmp/s54-tools.log || bad 1 "tools run shows no size-limit test"
fi

# --- Check 3: floors at measured, rounded down -----------------------------------
# packages/ports is interfaces only (no runtime code, no tests): no floor (S54 Gap).
for pkg in packages/domain packages/mlb-api functions web; do
  out="/tmp/s54-cov-$(basename "$pkg")"
  rm -rf "$out"
  if ! (cd "$pkg" && pnpm exec vitest run --coverage --coverage.reporter=json-summary --coverage.reportsDirectory="$out" >/tmp/s54-cov.log 2>&1); then
    bad 3 "$pkg coverage run does not exit 0 (floor above measured?)"
    grep -iE "threshold|ERROR" /tmp/s54-cov.log | head -5 | sed 's/^/        /'
    continue
  fi
  node --input-type=module -e "
    import { readFileSync } from 'node:fs';
    const total = JSON.parse(readFileSync('$out/coverage-summary.json', 'utf8')).total;
    const src = readFileSync('$pkg/vitest.config.ts', 'utf8');
    const errs = [];
    for (const k of ['lines', 'branches', 'functions', 'statements']) {
      const m = src.match(new RegExp('\\\\b' + k + ':\\\\s*([0-9.]+)'));
      const want = Math.floor(total[k].pct);
      if (!m) { errs.push(k + ' floor missing'); continue; }
      if (Number(m[1]) < want) errs.push(k + ' floor ' + m[1] + ' < measured ' + total[k].pct + ' (want ' + want + ')');
    }
    if (errs.length) { console.log(errs.join('; ')); process.exit(1); }
  " >/tmp/s54-floor.log 2>&1 || bad 3 "$pkg: $(cat /tmp/s54-floor.log)"
done

# --- Check 4: the ratchet rule ------------------------------------------------------
F00="docs/v3/backlog/frame/00 Baseball Theater v3 — Checkable backlog.md"
rule=$(grep -E '^[0-9]+\. \*\*.*[Rr]atchet' "$F00")
if [ -z "$rule" ]; then
  bad 4 "frame 00 has no numbered ratchet rule"
else
  for want in "95" "85" "80" "ADR-026"; do
    echo "$rule" | grep -q "$want" || bad 4 "ratchet rule does not mention $want"
  done
  echo "$rule" | grep -qiE "never lower|may never lower|not lower" || bad 4 "ratchet rule does not forbid lowering a floor"
fi
grep -qE '^[0-9]+\. \*\*.*[Rr]atchet' docs/v3/BACKLOG.md || bad 4 "BACKLOG.md not rebuilt with the ratchet rule"

# --- Check 5: backlog Status is done -------------------------------------------------
grep -qE '^\| [0-9]+ \| \[S54\].*\| `done` \|$' docs/v3/BACKLOG.md ||
  bad 5 "S54 row in the Story status table is not \`done\`"
awk '/^### S54 —/{f=1;next} /^### S[0-9]/{f=0} f' docs/v3/BACKLOG.md \
  | grep -qE '^\*\*Status:\*\* `done`$' ||
  bad 5 "S54 story heading Status is not \`done\`"

report "verify-S54"
exit $?
