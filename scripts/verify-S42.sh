#!/usr/bin/env bash
# Grader for BACKLOG story S42 — remove Firebase: Firestore adapter, SDK, config (ADR-017).
# Contract: docs/v3/BACKLOG.md#verify-script-contract
# No network. No writes outside /tmp. Does its own checking (never `pnpm verify`).

set -uo pipefail
cd "$(dirname "$0")/.."

# shellcheck source=lib/checks.sh
source "$(dirname "$0")/lib/checks.sh"

check 1 "functions/src/adapters/firestore/, firebase.json and .firebaserc do not exist"
check 2 "git grep -ilE 'firebase|firestore' over functions, packages, web, eslint.config.js, .gitignore, .prettierignore prints nothing"
check 3 "functions/package.json declares no @google-cloud/firestore or firebase* dependency; pnpm-lock.yaml has no @google-cloud/firestore"
check 4 "local-server.ts has no BT_USE_FIRESTORE and still contains FixtureMlbStatsClient and BT_USE_LIVE_MLB"
check 5 "functions/vitest.config.ts has no adapters/firestore exclude; thresholds unchanged or higher (lines 70, statements 70, branches 60, functions 70)"
check 6 "pnpm --filter @bt/functions exec vitest run src/handlers/api.test.ts exits 0"
check 7 "backlog Status is done (story heading and Story status table)"

# --- Check 1: adapter directory and Firebase config are gone ------------------
for p in functions/src/adapters/firestore firebase.json .firebaserc; do
  [ -e "$p" ] && bad 1 "$p still exists"
done

# --- Check 2: no Firebase / Firestore mention left in the listed paths --------
hits=$(git grep -ilE 'firebase|firestore' -- functions packages web eslint.config.js .gitignore .prettierignore 2>/dev/null || true)
if [ -n "$hits" ]; then
  bad 2 "files still mention firebase/firestore:"
  echo "$hits" | sed 's/^/        /'
fi

# --- Check 3: no SDK dependency, none in the lockfile -------------------------
PKG="functions/package.json"
node -e "
  const p = require('./$PKG');
  const deps = { ...p.dependencies, ...p.devDependencies, ...p.peerDependencies, ...p.optionalDependencies };
  const bad = Object.keys(deps).filter((d) => d === '@google-cloud/firestore' || /^(@[^/]+\/)?firebase/.test(d));
  if (bad.length) { console.log(bad.join(', ')); process.exit(1); }
" >/tmp/s42-deps.log 2>&1 || bad 3 "$PKG declares: $(cat /tmp/s42-deps.log)"
grep -q "@google-cloud/firestore" pnpm-lock.yaml && bad 3 "pnpm-lock.yaml still contains @google-cloud/firestore"

# --- Check 4: local server keeps the fixture default and live switch ----------
LS="functions/src/local-server.ts"
if [ ! -f "$LS" ]; then
  bad 4 "$LS missing"
else
  grep -q "BT_USE_FIRESTORE" "$LS" && bad 4 "$LS still reads BT_USE_FIRESTORE"
  grep -q "FixtureMlbStatsClient" "$LS" || bad 4 "$LS lost FixtureMlbStatsClient"
  grep -q "BT_USE_LIVE_MLB" "$LS" || bad 4 "$LS lost BT_USE_LIVE_MLB"
fi

# --- Check 5: coverage config ------------------------------------------------
CFG="functions/vitest.config.ts"
grep -q "adapters/firestore" "$CFG" && bad 5 "$CFG still excludes adapters/firestore"
for pair in lines:70 statements:70 branches:60 functions:70; do
  key="${pair%%:*}" floor="${pair##*:}"
  val=$(grep -E "^\s*$key:\s*[0-9]+" "$CFG" | head -1 | grep -oE "[0-9]+")
  if [ -z "$val" ]; then
    bad 5 "$CFG has no $key threshold"
  elif [ "$val" -lt "$floor" ]; then
    bad 5 "$CFG $key threshold $val is below $floor"
  fi
done

# --- Check 6: the API handler tests still pass --------------------------------
if ! pnpm --filter @bt/functions exec vitest run src/handlers/api.test.ts >/tmp/s42-api.log 2>&1; then
  bad 6 "vitest run src/handlers/api.test.ts does not exit 0"
  tail -20 /tmp/s42-api.log | sed 's/^/        /'
fi

# --- Check 7: backlog Status is done -----------------------------------------
grep -qE '^\| [0-9]+ \| \[S42\].*\| `done` \|$' docs/v3/BACKLOG.md ||
  bad 7 "S42 row in the Story status table is not \`done\`"
awk '/^### S42 —/{f=1;next} /^### S[0-9]/{f=0} f' docs/v3/BACKLOG.md \
  | grep -qE '^\*\*Status:\*\* `done`$' ||
  bad 7 "S42 story heading Status is not \`done\`"

report "verify-S42"
exit $?
