#!/usr/bin/env bash
# Grader for BACKLOG story S52 — one implementation: game-derived values into
# packages/domain + lint guard (ADR-025, ADR-024).
# Contract: docs/v3/BACKLOG.md#verify-script-contract
# No network. No writes outside /tmp. Does its own checking (never `pnpm verify`).

set -uo pipefail
cd "$(dirname "$0")/.."

# shellcheck source=lib/checks.sh
source "$(dirname "$0")/lib/checks.sh"

check 1 "@bt/domain exports gamePhase / roomsForPhase / resolveRoom with tests (incl. a table test against isLiveStatus / isFinalStatus); web gamePhase.ts defines no phase switch"
check 2 "git grep -nE 'codedGameState ===|abstractGameState ===' web/src prints nothing"
check 3 "an ESLint rule under tools/eslint-rules/ flags arithmetic / Math.* on @bt/domain-typed operands in web components + pages; its RuleTester test passes; pnpm lint exits 0"
check 4 "pitchOutcome lives in @bt/domain with a test; web pitch/utils.ts only maps the outcome to a theme role"
check 5 "tsconfig.base.json has no experimentalDecorators and pnpm build exits 0"
check 6 "packages/domain/vitest.config.ts thresholds are unchanged or higher (lines 85, functions 90, branches 60, statements 85)"
check 7 "backlog Status is done (story heading and Story status table)"

SRC="packages/domain/src"
INDEX="$SRC/index.ts"

# --- Check 1: phase rules live in domain --------------------------------------
PH="$SRC/game-phase.ts"
PT="$SRC/game-phase.test.ts"
if [ ! -f "$PH" ]; then
  bad 1 "$PH missing"
else
  for fn in gamePhase roomsForPhase resolveRoom; do
    grep -qE "^export function $fn\b" "$PH" || bad 1 "$PH does not export $fn"
  done
  grep -qF 'export * from "./game-phase.js";' "$INDEX" || bad 1 "$INDEX does not re-export ./game-phase.js"
fi
if [ ! -f "$PT" ]; then
  bad 1 "$PT missing"
else
  grep -q "isLiveStatus" "$PT" && grep -q "isFinalStatus" "$PT" || bad 1 "$PT has no table test against isLiveStatus / isFinalStatus"
  for code in S P I F O C D U; do
    grep -qE "\"$code\"" "$PT" || bad 1 "$PT table does not cover GameStatusCode \"$code\""
  done
  pnpm --filter @bt/domain exec vitest run src/game-phase.test.ts >/tmp/s52-phase.log 2>&1 ||
    { bad 1 "vitest run src/game-phase.test.ts does not exit 0"; tail -20 /tmp/s52-phase.log | sed 's/^/        /'; }
fi
WEB_PH="web/src/components/game/gamePhase.ts"
if [ -f "$WEB_PH" ]; then
  # Only re-export lines (and comments / blanks) may remain.
  extra=$(grep -vE '^\s*$|^\s*(//|/\*|\*)|^export (\*|\{[^}]*\}|type \{[^}]*\}) from ' "$WEB_PH" || true)
  [ -n "$extra" ] && bad 1 "$WEB_PH still defines code, not only re-exports"
fi

# --- Check 2: no inline status comparisons in web -----------------------------
hits=$(git grep -nE 'codedGameState ===|abstractGameState ===' web/src 2>/dev/null || true)
[ -n "$hits" ] && { bad 2 "inline status checks remain:"; echo "$hits" | sed 's/^/        /'; }

# --- Check 3: the lint guard ----------------------------------------------------
RULE_DIR="tools/eslint-rules"
rule=$(ls "$RULE_DIR"/*.js 2>/dev/null | grep -v '\.test\.js$' | head -1)
rtest=$(ls "$RULE_DIR"/*.test.js 2>/dev/null | head -1)
if [ -z "$rule" ]; then
  bad 3 "no rule file under $RULE_DIR/"
else
  grep -q "BinaryExpression" "$rule" || bad 3 "$rule does not visit BinaryExpression"
  grep -q "Math" "$rule" || bad 3 "$rule does not check Math.* calls"
  grep -q "tools/eslint-rules/" eslint.config.js || bad 3 "eslint.config.js does not load a rule from tools/eslint-rules/"
  grep -q 'web/src/components/\*\*' eslint.config.js && grep -q 'web/src/pages/\*\*' eslint.config.js ||
    bad 3 "eslint.config.js does not scope the rule to web/src/components/** and web/src/pages/**"
fi
if [ -z "$rtest" ]; then
  bad 3 "no RuleTester test under $RULE_DIR/"
else
  grep -q "RuleTester" "$rtest" || bad 3 "$rtest does not use RuleTester"
  grep -q "invalid" "$rtest" && grep -q "valid" "$rtest" || bad 3 "$rtest lacks valid / invalid cases"
  pnpm exec vitest run --config tools/vitest.config.js >/tmp/s52-rule.log 2>&1 ||
    { bad 3 "RuleTester test does not exit 0"; tail -20 /tmp/s52-rule.log | sed 's/^/        /'; }
fi
pnpm lint >/tmp/s52-lint.log 2>&1 || { bad 3 "pnpm lint does not exit 0"; tail -20 /tmp/s52-lint.log | sed 's/^/        /'; }

# --- Check 4: pitch outcome in domain -------------------------------------------
PO="$SRC/pitch-outcome.ts"
if [ ! -f "$PO" ]; then
  bad 4 "$PO missing"
else
  grep -qE "^export function pitchOutcome\b" "$PO" || bad 4 "$PO does not export pitchOutcome"
  grep -qF 'export * from "./pitch-outcome.js";' "$INDEX" || bad 4 "$INDEX does not re-export ./pitch-outcome.js"
  if [ -f "$SRC/pitch-outcome.test.ts" ]; then
    pnpm --filter @bt/domain exec vitest run src/pitch-outcome.test.ts >/tmp/s52-pitch.log 2>&1 ||
      { bad 4 "vitest run src/pitch-outcome.test.ts does not exit 0"; tail -20 /tmp/s52-pitch.log | sed 's/^/        /'; }
  else
    bad 4 "$SRC/pitch-outcome.test.ts missing"
  fi
fi
U="web/src/components/pitch/utils.ts"
grep -q "pitchOutcome" "$U" || bad 4 "$U does not call pitchOutcome"
grep -qE "isBall|isStrike|isInPlay|ballColor" "$U" && bad 4 "$U still derives the outcome itself"

# --- Check 5: no decorators; build passes ---------------------------------------
grep -q "experimentalDecorators" tsconfig.base.json && bad 5 "tsconfig.base.json still sets experimentalDecorators"
pnpm build >/tmp/s52-build.log 2>&1 || { bad 5 "pnpm build does not exit 0"; tail -20 /tmp/s52-build.log | sed 's/^/        /'; }

# --- Check 6: domain coverage thresholds not lowered ----------------------------
CFG="packages/domain/vitest.config.ts"
for pair in lines:85 functions:90 branches:60 statements:85; do
  key="${pair%%:*}" floor="${pair##*:}"
  val=$(grep -E "^\s*$key:\s*[0-9]+" "$CFG" | head -1 | grep -oE "[0-9]+")
  if [ -z "$val" ]; then
    bad 6 "$CFG has no $key threshold"
  elif [ "$val" -lt "$floor" ]; then
    bad 6 "$CFG $key threshold $val is below $floor"
  fi
done

# --- Check 7: backlog Status is done ---------------------------------------------
grep -qE '^\| [0-9]+ \| \[S52\].*\| `done` \|$' docs/v3/BACKLOG.md ||
  bad 7 "S52 row in the Story status table is not \`done\`"
awk '/^### S52 —/{f=1;next} /^### S[0-9]/{f=0} f' docs/v3/BACKLOG.md \
  | grep -qE '^\*\*Status:\*\* `done`$' ||
  bad 7 "S52 story heading Status is not \`done\`"

report "verify-S52"
exit $?
