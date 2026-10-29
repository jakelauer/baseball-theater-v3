#!/usr/bin/env bash
# Grader for BACKLOG story S62 — Lighthouse CI budgets and Playwright flows in CI, CI
# runs `pnpm verify`, law P11. A commit-time proof of this story (S84).
# Contract: docs/v3/BACKLOG.md#verify-script-contract
# No network. No writes outside /tmp: the app is built into and Lighthouse runs from
# a temporary directory. Does its own checking (never `pnpm verify`).
# Starts a browser (Lighthouse's Chrome, Playwright's Chromium) — a grader may; the
# verify chain may not (AC 4).

set -uo pipefail
cd "$(dirname "$0")/.."

# shellcheck source=lib/checks.sh
source "$(dirname "$0")/lib/checks.sh"

check 1 "lighthouserc.json asserts on the scoreboard and a game page, throttled mobile, >= 3 runs: LCP warns over 2.5 s and fails at 5 s (owner, 2026-10-29), TBT < 200 ms and CLS < 0.1 fail; the budgets pass on the built app on fixtures, an LCP warning naming the page; ci.yml runs it"
check 2 "e2e/ Playwright flows walk scoreboard -> game -> each room tab, standings, search and settings (dev sign-in) on fixtures; pnpm e2e runs and passes them; ci.yml runs pnpm e2e"
check 3 "a deliberately failing budget (a test config) exits nonzero and names the page and the metric"
check 4 "pnpm verify starts no browser: no script in its chain runs playwright, e2e or lhci"
check 5 "the CI job runs pnpm verify in place of separate lint, test:coverage and build steps; api:spec --check and api:breaking stay"
check 6 "law P11: a scripts/backlog-vault/ test fails unless a ci.yml step runs pnpm verify; LAWS.md lists P11 enforced"
check 7 "backlog Status is done (story heading and Story status table)"

REPO="$(pwd)"
TMP="$(mktemp -d)"
STARTED=""
# The processes listening on a port (the servers this grader starts, never a dev
# server that was already there: a busy port means the grader doesn't start its own).
listeners() { lsof -ti "tcp:$1" -sTCP:LISTEN 2>/dev/null; }
cleanup() {
  for p in $STARTED; do for pid in $(listeners "$p"); do kill "$pid" 2>/dev/null; done; done
  rm -rf "$TMP"
}
trap cleanup EXIT
CI_YML=".github/workflows/ci.yml"
RC="lighthouserc.json"
FAIL_RC="e2e/lighthouse/failing.lighthouserc.json"

# The `run:` lines of the CI workflow, one per line.
ci_runs() { sed -n 's/^ *run: *//p' "$CI_YML"; }

# --- Check 1: the budgets --------------------------------------------------------------------
if [ ! -f "$RC" ]; then
  bad 1 "$RC missing"
else
  node -e '
    const rc = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8")).ci ?? {};
    const c = rc.collect ?? {}, s = c.settings ?? {};
    // Every assertion set, flattened to [audit, level, options] (assertMatrix or assertions).
    const sets = rc.assert?.assertMatrix ?? [{ assertions: rc.assert?.assertions ?? {} }];
    const all = sets.flatMap((m) => Object.entries(m.assertions ?? {}).map(([id, v]) => {
      const [level, opts] = Array.isArray(v) ? v : [v, {}];
      return [id, level, opts ?? {}, m.matchingUrlPattern ?? ".*"];
    }));
    const has = (id, level, max) => all.some(([i, l, o, pat]) => i === id && l === level && o.maxNumericValue === max && pat === ".*");
    const errs = [];
    const urls = c.url ?? [];
    if (!urls.some((u) => /\/games\/\d{4}-\d{2}-\d{2}$/.test(u))) errs.push("no scoreboard URL (/games/<date>)");
    if (!urls.some((u) => /\/game\/\d+/.test(u))) errs.push("no game page URL (/game/<gamePk>)");
    if (!((c.numberOfRuns ?? 1) >= 3)) errs.push("numberOfRuns is " + (c.numberOfRuns ?? 1) + ", want >= 3");
    if ((s.formFactor ?? "mobile") !== "mobile") errs.push("formFactor is not mobile");
    if ((s.throttlingMethod ?? "simulate") === "provided") errs.push("throttling is off (provided)");
    const want = [["largest-contentful-paint", "warn", 2500], ["largest-contentful-paint", "error", 5000],
      ["total-blocking-time", "error", 200], ["cumulative-layout-shift", "error", 0.1]];
    for (const [id, level, max] of want) if (!has(id, level, max)) errs.push(id + " has no " + level + "-level maxNumericValue " + max + " on every page");
    if (all.some(([i, l, o]) => i === "largest-contentful-paint" && l === "error" && o.maxNumericValue < 5000)) errs.push("largest-contentful-paint still fails below 5 s");
    if (errs.length) { console.log(errs.join("\n")); process.exit(1); }
  ' "$RC" >"$TMP/rc.log" 2>&1 || { bad 1 "$RC does not assert the budgets:"; sed 's/^/        /' "$TMP/rc.log"; }
fi
ci_runs | grep -qE '^pnpm lighthouse$' || bad 1 "$CI_YML runs no 'pnpm lighthouse' step"
grep -qE '"lighthouse": *"[^"]*lhci autorun[^"]*lighthouserc\.json' package.json || bad 1 "package.json has no lighthouse script running lhci autorun on lighthouserc.json"

# Build the app into $TMP and serve it with the fixture API, the way the
# lighthouse:serve script does, so Lighthouse can run from $TMP.
SERVED=0
if [ -f "$RC" ] && [ -x node_modules/.bin/lhci ]; then
  if ! (cd web && pnpm exec vite build --outDir "$TMP/dist" --emptyOutDir >"$TMP/build.log" 2>&1); then
    bad 1 "building the web app failed:"; tail -10 "$TMP/build.log" | sed 's/^/        /'
  else
    if [ -z "$(listeners 8787)" ]; then
      pnpm --filter @bt/functions exec tsx src/local-server.ts >"$TMP/api.log" 2>&1 &
      STARTED="8787"
    fi
    if [ -n "$(listeners 4173)" ]; then
      bad 1 "port 4173 is busy; stop whatever serves it and re-run"
    else
      (cd web && pnpm exec vite preview --outDir "$TMP/dist" --port 4173 --strictPort >"$TMP/preview.log" 2>&1) &
      STARTED="$STARTED 4173"
    fi
    for _ in $(seq 1 60); do
      curl -sf http://localhost:4173/ >/dev/null 2>&1 && curl -sf http://localhost:4173/health >/dev/null 2>&1 && { SERVED=1; break; }
      sleep 1
    done
    [ "$SERVED" = 1 ] || { bad 1 "the built app on fixtures never answered on :4173:"; tail -5 "$TMP/preview.log" "$TMP/api.log" | sed 's/^/        /'; }
  fi
  if [ "$SERVED" = 1 ]; then
    if ! (cd "$TMP" && "$REPO/node_modules/.bin/lhci" autorun --config="$REPO/$RC" --collect.startServerCommand= >"$TMP/lh.log" 2>&1); then
      bad 1 "the budgets fail on the built app:"; grep -E 'failure|expected|found|http' "$TMP/lh.log" | head -15 | sed 's/^/        /'
    elif grep -qF "largest-contentful-paint" "$TMP/lh.log"; then
      # A yellow LCP is reported, not hidden: the warning names the page.
      grep -qE 'http://localhost:4173/(games|game)/' "$TMP/lh.log" || bad 1 "an LCP warning does not name the page"
    fi
  fi
else
  [ -x node_modules/.bin/lhci ] || bad 1 "@lhci/cli is not installed (node_modules/.bin/lhci)"
fi

# --- Check 2: the flows ------------------------------------------------------------------------
grep -qE '"e2e": *"playwright test --config e2e/playwright\.config\.ts' package.json || bad 2 "package.json has no e2e script running the Playwright config"
ci_runs | grep -qE '^pnpm e2e$' || bad 2 "$CI_YML runs no 'pnpm e2e' step"
ci_runs | grep -qE 'playwright install' || bad 2 "$CI_YML never installs the Playwright browser"
FLOWS="$(ls e2e/flows/*.spec.ts 2>/dev/null || true)"
[ -n "$FLOWS" ] || bad 2 "no e2e/flows/*.spec.ts"
for want in "/games/" "/standings" "/search" "/settings" "signInDev"; do
  grep -qF "$want" $FLOWS /dev/null || bad 2 "the flows never visit or use $want"
done
for room in Videos Live Plays Box Recap; do
  grep -qF "\"$room\"" $FLOWS /dev/null || bad 2 "the flows never open the $room room tab"
done
if [ -n "$FLOWS" ]; then
  if ! BT_E2E_OUTPUT="$TMP/e2e-out" pnpm -s e2e --reporter=json >"$TMP/e2e.json" 2>"$TMP/e2e.log"; then
    bad 2 "pnpm e2e failed:"; tail -20 "$TMP/e2e.log" | sed 's/^/        /'
    node -e 'const r=require(process.argv[1]);const walk=(s)=>[...(s.specs??[]).filter(x=>!x.ok).map(x=>x.file+": "+x.title),...(s.suites??[]).flatMap(walk)];console.log(r.suites.flatMap(walk).join("\n"))' "$TMP/e2e.json" 2>/dev/null | head -10 | sed 's/^/        /'
  else
    node -e '
      const r = require(process.argv[1]);
      const walk = (s) => [...(s.specs ?? []), ...(s.suites ?? []).flatMap(walk)];
      const flows = r.suites.flatMap(walk).filter((x) => x.file.startsWith("flows/"));
      process.exit(flows.length > 0 && flows.every((x) => x.ok) && r.stats.expected > 0 ? 0 : 1);
    ' "$TMP/e2e.json" || bad 2 "pnpm e2e ran no passing flow spec"
  fi
fi

# --- Check 3: a failing budget names the page and the metric -----------------------------------
if [ ! -f "$FAIL_RC" ]; then
  bad 3 "$FAIL_RC missing"
elif [ "$SERVED" = 1 ]; then
  if (cd "$TMP" && "$REPO/node_modules/.bin/lhci" autorun --config="$REPO/$FAIL_RC" >"$TMP/fail.log" 2>&1); then
    bad 3 "lhci exited 0 with the failing budget"
  else
    grep -qF "largest-contentful-paint" "$TMP/fail.log" || bad 3 "the failing run's output does not name the metric:"
    grep -qE 'http://localhost:4173/games/2024-07-04' "$TMP/fail.log" || bad 3 "the failing run's output does not name the page"
    grep -qE 'largest-contentful-paint|localhost:4173' "$TMP/fail.log" || tail -15 "$TMP/fail.log" | sed 's/^/        /'
  fi
else
  bad 3 "the app was not served, so the failing budget could not run"
fi

# --- Check 4: pnpm verify starts no browser ------------------------------------------------------
node -e '
  const scripts = require("./package.json").scripts;
  const seen = new Set();
  const walk = (n) => { if (seen.has(n) || !(n in scripts)) return; seen.add(n);
    for (const m of scripts[n].matchAll(/pnpm (?:-s )?(?:run )?([a-z][\w:-]*)/g)) walk(m[1]); };
  walk("verify");
  const hits = [...seen].filter((n) => /playwright|lhci|lighthouse|e2e/.test(scripts[n]) || /^(e2e|lighthouse)/.test(n));
  if (hits.length) { console.log(hits.join(", ")); process.exit(1); }
' >"$TMP/chain.log" 2>&1 || bad 4 "the verify chain reaches a browser step: $(cat "$TMP/chain.log")"
grep -qE 'lhci' scripts/backlog-vault/verify-chain.ts || bad 4 "law P8's browserSteps does not count Lighthouse as a browser step"
run_tool_test() {
  (pnpm exec vitest run --config scripts/backlog-vault/vitest.config.ts "$@" --reporter=json --outputFile="$TMP/v.json" >"$TMP/v.log" 2>&1) &&
    node -e 'process.exit(require(process.argv[1]).numPassedTests > 0 ? 0 : 1)' "$TMP/v.json"
}
run_tool_test verify-chain.test.ts || { bad 4 "scripts/backlog-vault/verify-chain.test.ts failed:"; tail -10 "$TMP/v.log" | sed 's/^/        /'; }

# --- Check 5: CI runs the one gate ----------------------------------------------------------------
ci_runs | grep -qE '^pnpm verify$' || bad 5 "$CI_YML runs no 'pnpm verify' step"
for gone in "pnpm lint" "pnpm test:coverage" "pnpm build"; do
  ci_runs | grep -qxF "$gone" && bad 5 "$CI_YML still runs '$gone' as its own step"
done
ci_runs | grep -qxF "pnpm api:spec --check" || bad 5 "$CI_YML dropped 'pnpm api:spec --check'"
ci_runs | grep -qxF "pnpm api:breaking" || bad 5 "$CI_YML dropped 'pnpm api:breaking'"

# --- Check 6: law P11 ----------------------------------------------------------------------------
LAWT="scripts/backlog-vault/ci-law.test.ts"
if [ ! -f "$LAWT" ]; then
  bad 6 "$LAWT missing"
else
  grep -qF ".github/workflows/ci.yml" "$LAWT" || bad 6 "$LAWT does not read .github/workflows/ci.yml"
  run_tool_test ci-law.test.ts || { bad 6 "$LAWT failed:"; tail -10 "$TMP/v.log" | sed 's/^/        /'; }
fi
grep -qE '^\| P11 \| .*`scripts/backlog-vault/ci-law\.test\.ts` \| test:coverage \| enforced \|$' docs/v3/LAWS.md ||
  bad 6 "docs/v3/LAWS.md does not list P11 as enforced by scripts/backlog-vault/ci-law.test.ts"
run_tool_test laws.test.ts || { bad 6 "scripts/backlog-vault/laws.test.ts failed:"; tail -10 "$TMP/v.log" | sed 's/^/        /'; }

# --- Check 7: backlog Status is done ---------------------------------------------------------------
grep -qE '^\| [0-9]+ \| \[S62\].*\| `done` \|$' docs/v3/BACKLOG.md ||
  bad 7 "S62 row in the Story status table is not \`done\`"
awk '/^### S62 —/{f=1;next} /^### S[0-9]/{f=0} f' docs/v3/BACKLOG.md \
  | grep -qE '^\*\*Status:\*\* `done`$' ||
  bad 7 "S62 story heading Status is not \`done\`"

report "verify-S62"
exit $?
