#!/usr/bin/env bash
# Grader for BACKLOG story S7 — Firestore adapter behind ports (emulator-ready).
# Contract: docs/v3/BACKLOG.md#verify-script-contract
# No network. No writes outside /tmp. Does its own checking (never `pnpm verify`).
# Must NOT start, require, or claim a pass for the Firestore emulator.

set -uo pipefail
cd "$(dirname "$0")/.."

# shellcheck source=lib/checks.sh
source "$(dirname "$0")/lib/checks.sh"

check 1 "FirestoreScheduleRepository + FirestoreGameRepository under functions/src/adapters/, port-assignable (typecheck)"
check 2 "an integration test skips the emulator round-trip when FIRESTORE_EMULATOR_HOST is unset and still exits 0"
check 3 "local-server default repos are still the in-memory adapters unless a documented env flag is set"
check 4 "src/handlers/api.test.ts still exits 0 (offline)"
check 5 "functions coverage floor is protected: Firestore adapters thin or excluded; no threshold lowered"
check 6 "backlog Status is done"

ADAPTERS_DIR="functions/src/adapters"
SERVER="functions/src/local-server.ts"
VITEST_CFG="functions/vitest.config.ts"

# The Firestore adapter module(s) and the two story-scoped tests.
FS_SRC=$(grep -rlE 'class FirestoreScheduleRepository|class FirestoreGameRepository' \
  "$ADAPTERS_DIR" --include='*.ts' 2>/dev/null | grep -v '\.test\.ts' | head -1)
ASSIGN_TEST=$(grep -rlE 'FirestoreScheduleRepository|FirestoreGameRepository' functions/src \
  --include='*.test.ts' --include='*.test-d.ts' 2>/dev/null \
  | xargs grep -lE 'ScheduleRepository|GameRepository|satisfies|assignable' 2>/dev/null | head -1)
EMU_TEST=$(grep -rlE 'FIRESTORE_EMULATOR_HOST' functions/src --include='*.test.ts' 2>/dev/null | head -1)

# --- Check 1: the two adapters exist and typecheck against the ports ----------
if [ -z "$FS_SRC" ]; then
  bad 1 "no FirestoreScheduleRepository / FirestoreGameRepository class under $ADAPTERS_DIR"
else
  grep -qE 'class FirestoreScheduleRepository' "$FS_SRC" ||
    bad 1 "$FS_SRC has no FirestoreScheduleRepository"
  grep -qE 'class FirestoreGameRepository' "$FS_SRC" ||
    bad 1 "$FS_SRC has no FirestoreGameRepository"
  grep -qE 'implements (ScheduleRepository|GameRepository)|: ScheduleRepository|: GameRepository|satisfies' "$FS_SRC" ||
    bad 1 "$FS_SRC does not bind the classes to the port interfaces"
fi
if [ -z "$ASSIGN_TEST" ]; then
  bad 1 "no story-scoped test proves the Firestore adapters are assignable to the ports"
fi
if ! grep -qE '"firebase-admin"|"@google-cloud/firestore"' functions/package.json; then
  bad 1 "functions/package.json declares no Firestore SDK dependency (AC1/AC2 need one)"
fi
if ! pnpm --filter @bt/functions exec tsc -p tsconfig.json --noEmit >/tmp/s7-tsc.log 2>&1; then
  bad 1 "functions typecheck fails (adapters not assignable to the ports?)"
  tail -25 /tmp/s7-tsc.log | sed 's/^/        /'
fi

# --- Check 2: the emulator integration test, skip path -----------------------
if [ -z "$EMU_TEST" ]; then
  bad 2 "no *.test.ts references FIRESTORE_EMULATOR_HOST"
else
  grep -qE 'skipIf|\.skip\(|it\.skip|describe\.skip|test\.skip' "$EMU_TEST" ||
    bad 2 "$EMU_TEST has no skip / skipIf guard for the emulator round-trip"
  grep -qE 'upsert' "$EMU_TEST" ||
    bad 2 "$EMU_TEST has no upsert-then-get round-trip assertion"
  net=$(grep -nE '\bfetch\(|undici|node-fetch|https?://[a-z]' "$EMU_TEST" \
    | grep -vE 'localhost|127\.0\.0\.1' || true)
  [ -n "$net" ] && { bad 2 "$EMU_TEST reaches the network:"; echo "$net" | sed 's/^/        /'; }
  # The skip path must be green with the emulator env var unset.
  if ! env -u FIRESTORE_EMULATOR_HOST pnpm --filter @bt/functions exec vitest run \
        "${EMU_TEST#functions/}" >/tmp/s7-emu.log 2>&1; then
    bad 2 "$EMU_TEST does not exit 0 when FIRESTORE_EMULATOR_HOST is unset (skip path)"
    tail -25 /tmp/s7-emu.log | sed 's/^/        /'
  fi
fi

# --- Check 3: memory repos stay the default --------------------------------
if [ ! -f "$SERVER" ]; then
  bad 3 "$SERVER missing"
else
  grep -qE 'InMemoryScheduleRepository|InMemoryGameRepository' "$SERVER" ||
    bad 3 "$SERVER no longer constructs the in-memory repositories"
  if grep -qE 'FirestoreScheduleRepository|FirestoreGameRepository' "$SERVER"; then
    grep -qE 'process\.env\.BT_[A-Z_]+' "$SERVER" ||
      bad 3 "$SERVER wires a Firestore repo without a documented env gate"
  fi
fi

# --- Check 4: existing API tests still offline-green -----------------------
if ! env -u FIRESTORE_EMULATOR_HOST pnpm --filter @bt/functions exec vitest run \
      src/handlers/api.test.ts >/tmp/s7-api.log 2>&1; then
  bad 4 "src/handlers/api.test.ts does not pass"
  tail -25 /tmp/s7-api.log | sed 's/^/        /'
fi

# --- Check 5: coverage floor protected -----------------------------------
if [ ! -f "$VITEST_CFG" ]; then
  bad 5 "$VITEST_CFG missing"
else
  # No threshold number may go down vs HEAD.
  if git rev-parse --verify -q HEAD >/dev/null; then
    while IFS= read -r line; do
      key=$(sed -E 's/^[[:space:]]*([a-z]+):.*/\1/' <<<"$line")
      new=$(sed -E 's/[^0-9]//g' <<<"$line")
      old=$(git show "HEAD:$VITEST_CFG" 2>/dev/null | grep -E "^[[:space:]]*$key:[[:space:]]*[0-9]+" | sed -E 's/[^0-9]//g')
      [ -n "$old" ] && [ -n "$new" ] && [ "$new" -lt "$old" ] &&
        bad 5 "coverage threshold '$key' lowered from $old to $new in $VITEST_CFG"
    done < <(grep -E '^[[:space:]]*(lines|functions|branches|statements):[[:space:]]*[0-9]+' "$VITEST_CFG")
  fi
  # If the adapters are not thin they must be excluded from coverage like local-server.ts.
  if [ -n "$FS_SRC" ]; then
    rel="${FS_SRC#functions/}"
    body_lines=$(grep -cE '^\s*(await|return|const|if|for|throw|this\.)' "$FS_SRC")
    if ! grep -qE "coverage" "$VITEST_CFG" || ! grep -qF "$(basename "$FS_SRC")" "$VITEST_CFG"; then
      if [ "${body_lines:-0}" -gt 40 ]; then
        bad 5 "$FS_SRC has ~$body_lines body lines and is not in $VITEST_CFG coverage.exclude — thin it or exclude it"
      fi
    fi
  fi
fi

# --- Check 6: backlog Status is done ------------------------------------
grep -qE '^\| 12 \| \[S7\].*\| `done` \|$' docs/v3/BACKLOG.md ||
  bad 6 "S7 row in the Story status table is not \`done\`"
awk '/^### S7 —/{f=1;next} /^### S[0-9]/{f=0} f' docs/v3/BACKLOG.md \
  | grep -qE '^\*\*Status:\*\* `done`$' ||
  bad 6 "S7 story heading Status is not \`done\`"

report "verify-S7"
exit $?
