#!/usr/bin/env bash
# Grader for BACKLOG story S14 — fixture recorder from live client.
# Contract: docs/v3/BACKLOG.md#verify-script-contract
# No network. No writes outside /tmp. Does its own checking (never `pnpm verify`).

set -uo pipefail
cd "$(dirname "$0")/.."

# shellcheck source=lib/checks.sh
source "$(dirname "$0")/lib/checks.sh"

check 1 "functions/package.json exposes record-fixtures under functions/, dead seed script gone"
check 2 "two seams: raw driven by injected fetch, normalized driven by a fake MlbStatsClient"
check 3 "the raw seam writes the established fixtures/raw/<endpoint>-<key>.json names"
check 4 "a temp-dir Vitest round-trip proves non-empty schedule, standings and plays"
check 5 "README documents the command, both seams, and the no-network guarantee"
check 6 "backlog Status is done"

PKG="functions/package.json"

# Recorder sources (non-test) and the story-scoped test file.
rec_srcs() { find functions/src -name '*record*.ts' ! -name '*.test.ts' 2>/dev/null; }
REC_TEST=$(find functions/src -name '*record*.test.ts' 2>/dev/null | head -1)

# --- Check 1: the command, its entrypoint, and the dead seed script ------------
if [ ! -f "$PKG" ]; then
  bad 1 "$PKG missing"
else
  ENTRY=$(node -e '
    const s=require("./functions/package.json").scripts||{};
    for (const [k,v] of Object.entries(s)) if (/record[-:]?fixtures/i.test(k)) { console.log(v); break; }
  ' 2>/dev/null)
  if [ -z "$ENTRY" ]; then
    bad 1 "$PKG defines no record-fixtures script"
  else
    f=$(printf '%s' "$ENTRY" | grep -oE '[A-Za-z0-9_./-]+\.ts' | head -1)
    if [ -z "$f" ] || [ ! -f "functions/$f" ]; then
      bad 1 "record-fixtures names no existing entrypoint under functions/ (got: $ENTRY)"
    fi
    case "$ENTRY" in
      *scripts/verify*|*../scripts/*) bad 1 "entrypoint reaches into scripts/, which stays frozen" ;;
    esac
  fi
  # AC1: the dead seed script must be removed or repointed at a real file.
  SEED=$(node -e '
    const s=require("./functions/package.json").scripts||{};
    if (s.seed) console.log(s.seed);
  ' 2>/dev/null)
  if [ -n "$SEED" ]; then
    sf=$(printf '%s' "$SEED" | grep -oE '[A-Za-z0-9_./-]+\.ts' | head -1)
    [ -n "$sf" ] && [ ! -f "functions/$sf" ] &&
      bad 1 "seed script still points at missing functions/$sf"
  fi
fi

# --- Check 2: two seams, neither reaching the network -------------------------
SRCS=$(rec_srcs)
if [ -z "$SRCS" ]; then
  bad 2 "no recorder source under functions/src"
else
  # Raw seam: an injected fetch, not a bare global call.
  grep -qE 'fetchImpl|fetch:[[:space:]]*typeof fetch|typeof fetch' $SRCS ||
    bad 2 "no injected-fetch seam (HttpMlbStatsClientOptions.fetchImpl pattern) in the recorder"
  # Normalized seam: driven by the port, not by a second fetch path.
  grep -q 'MlbStatsClient' $SRCS ||
    bad 2 "the recorder never takes an MlbStatsClient for the normalized seam"
  # No hard-coded upstream host outside a default that injection can override.
  bare=$(grep -nE '(^|[^.a-zA-Z])fetch\(' $SRCS | grep -v 'fetchImpl' || true)
  if [ -n "$bare" ]; then
    bad 2 "recorder calls global fetch( directly (must go through the injected seam):"
    echo "$bare" | sed 's/^/        /'
  fi
fi

# --- Check 3: the established raw fixture names -------------------------------
if [ -z "$SRCS" ]; then
  bad 3 "no recorder source under functions/src to emit raw payload names"
else
  for n in schedule live content standings people timestamps; do
    grep -qE "\"$n-|'$n-|\`$n-|\"$n\"|'$n'" $SRCS ||
      bad 3 "recorder never emits a raw '$n-' payload name"
  done
  grep -qE 'raw' $SRCS || bad 3 "recorder never targets the fixtures/raw/ directory"
fi

# --- Check 4: temp-dir round-trip with non-empty asserts ----------------------
if [ -z "$REC_TEST" ]; then
  bad 4 "no *record*.test.ts under functions/src"
else
  net=$(grep -nE '\bfetch\(|undici|node-fetch|https?://' "$REC_TEST" \
    | grep -vE 'localhost|127\.0\.0\.1|fetchImpl|fakeFetch' || true)
  [ -n "$net" ] && { bad 4 "$REC_TEST reaches the network:"; echo "$net" | sed 's/^/        /'; }
  grep -qE 'tmpdir\(\)|mkdtemp' "$REC_TEST" ||
    bad 4 "$REC_TEST does not write into os.tmpdir()/mkdtemp"
  grep -q 'FixtureMlbStatsClient' "$REC_TEST" ||
    bad 4 "$REC_TEST never reads the output back through FixtureMlbStatsClient"
  # The three non-empty asserts the review added; empty shells must not pass.
  grep -qE 'games\b.*length|length.*games' "$REC_TEST" ||
    bad 4 "$REC_TEST does not assert games.length > 0 (empty day would pass)"
  grep -qE 'divisions\b.*length|length.*divisions' "$REC_TEST" ||
    bad 4 "$REC_TEST does not assert divisions.length > 0 (empty table would pass)"
  grep -qE 'plays\b.*length|length.*plays' "$REC_TEST" ||
    bad 4 "$REC_TEST does not assert plays.length > 0 (silent plays loss)"

  before=$(git status --porcelain fixtures/ | wc -l | tr -d ' ')
  if ! pnpm --filter @bt/functions exec vitest run "${REC_TEST#functions/}" \
        >/tmp/s14-recorder.log 2>&1; then
    bad 4 "$REC_TEST does not pass in isolation"
    tail -25 /tmp/s14-recorder.log | sed 's/^/        /'
  fi
  after=$(git status --porcelain fixtures/ | wc -l | tr -d ' ')
  [ "$before" = "$after" ] ||
    bad 4 "the recorder run dirtied committed fixtures/ ($before -> $after changed paths)"
fi

# --- Check 5: README ----------------------------------------------------------
if [ ! -f README.md ]; then
  bad 5 "README.md missing"
else
  grep -qiE 'record[-: ]?fixtures' README.md ||
    bad 5 "README.md does not document the record-fixtures command"
  grep -qiE 'raw' README.md || bad 5 "README.md does not describe the raw seam"
  grep -qiE 'normalized' README.md || bad 5 "README.md does not describe the normalized seam"
  grep -qiE '(never|no|without)[^.]{0,40}network' README.md ||
    bad 5 "README.md does not state that CI / pnpm verify never requires network"
fi

# --- Check 6: backlog Status is done ------------------------------------------
grep -qE '^\| 7 \| \[S14\].*\| `done` \|$' docs/v3/BACKLOG.md ||
  bad 6 "S14 row in the Story status table is not \`done\`"
awk '/^### S14 —/,/^### S15 —/' docs/v3/BACKLOG.md | grep -qE '^\*\*Status:\*\* `done`$' ||
  bad 6 "S14 story heading Status is not \`done\`"

report "verify-S14"
exit $?
