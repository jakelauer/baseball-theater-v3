#!/usr/bin/env bash
# Grader for BACKLOG story S27 — OpenAPI spec generated from the contract + oasdiff gate.
# Contract: docs/v3/BACKLOG.md#verify-script-contract
# No network. No writes outside a temp dir. Does its own checking (never `pnpm verify`).

set -uo pipefail
cd "$(dirname "$0")/.."

# shellcheck source=lib/checks.sh
source "$(dirname "$0")/lib/checks.sh"

# The commit S27 started from (ci.yml additions are judged against it).
START="5036023"

check 1 "generator under functions/ or packages/ uses ts-json-schema-generator, wired to root api:spec; no ts-oas"
check 11 "emitter names schemas from the route table's aliases, never GameSnapshot/ScheduleDay by name"
check 2 "openapi/bt-api.v1.json is OpenAPI 3.x JSON with one operation per ApiRoutes entry"
check 3 "each success response \$refs its alias component, which carries fetchedAt and windowMode"
check 31 "every operation has a 4xx ApiErrorResponse ref; schedule declares 400, game declares 404"
check 4 "regenerating into a temp dir is byte-identical to the committed spec"
check 5 "oasdiff dev dependency; api:breaking uses --fail-on ERR against a distinct committed baseline"
check 6 "gate works both ways: unmodified spec exits 0, removed response field exits nonzero"
check 7 "ci.yml runs spec freshness + breaking gate; no network fetch added"
check 8 "README documents regeneration, generated-only, additive-only, ADR-015 versioning, baseline advancement"
check 9 "backlog Status is done"

B=docs/v3/BACKLOG.md
SPEC=openapi/bt-api.v1.json
BASELINE=openapi/bt-api.v1.baseline.json
ROUTES=packages/domain/src/api-routes.ts
TMP="$(mktemp -d -t verify-S27)"
trap 'rm -rf "$TMP"' EXIT

script_of() { node -e 'console.log(require("./package.json").scripts?.[process.argv[1]] ?? "")' "$1"; }

# --- Check 1: generator location, library, script ------------------------------
GEN=$(grep -rlE "from ['\"]ts-json-schema-generator['\"]" functions/src packages/*/src 2>/dev/null | grep -v '\.test\.' | head -1)
[ -n "$GEN" ] || bad 1 "no module under functions/src or packages/*/src imports ts-json-schema-generator"
grep -rlE "ts-json-schema-generator" scripts/ --include='*.ts' --include='*.js' --include='*.mjs' 2>/dev/null | grep -q . &&
  bad 1 "a spec generator lives under scripts/ — it must be under functions/ or packages/"
[ -n "$(script_of api:spec)" ] || bad 1 "root package.json has no api:spec script"
grep -qE '"ts-oas"' package.json functions/package.json packages/*/package.json 2>/dev/null && bad 1 "ts-oas is a dependency (ADR-015 rejects it)"
grep -qE '(^|/)ts-oas@' pnpm-lock.yaml 2>/dev/null && bad 1 "ts-oas is in pnpm-lock.yaml"

# --- Check 1a: alias-sourced schema names --------------------------------------
EMITTER_FILES=$(grep -rlE 'ApiRoutes' functions/src packages/*/src 2>/dev/null | grep -vE '\.test\.|api-routes\.ts|handlers/|/web/')
if [ -z "$GEN" ]; then
  bad 11 "no generator to inspect"
else
  for f in $GEN $EMITTER_FILES; do
    grep -nE "[\"'\`](GameSnapshot|ScheduleDay)[\"'\`]" "$f" >"$TMP/bare.txt" &&
      bad 11 "$f requests a schema by bare domain name: $(head -1 "$TMP/bare.txt")"
  done
  grep -qE 'ApiRoutes' $GEN $EMITTER_FILES 2>/dev/null || bad 11 "the generator does not walk ApiRoutes"
fi

# --- Checks 2, 3, 3a: spec shape -------------------------------------------------
route_count=$(awk '/export const ApiRoutes = \{/{f=1; next} f && /^\}/{exit} f && /^[[:space:]]*"[A-Z]+ \//' "$ROUTES" | wc -l | tr -d ' ')
if [ ! -f "$SPEC" ]; then
  bad 2 "$SPEC missing"
  bad 3 "$SPEC missing"
  bad 31 "$SPEC missing"
else
  node - "$SPEC" "$route_count" >"$TMP/shape.log" 2>&1 <<'NODE'
const fs = require("fs");
const [specPath, routeCount] = process.argv.slice(2);
const fail = (check, msg) => { console.log(`FAIL ${check} ${msg}`); };
let spec;
try { spec = JSON.parse(fs.readFileSync(specPath, "utf8")); }
catch (e) { fail(2, `not valid JSON: ${e.message}`); process.exit(0); }

if (!/^3\./.test(String(spec.openapi))) fail(2, `openapi is '${spec.openapi}', not 3.x`);
const methods = ["get", "put", "post", "delete", "patch", "head", "options"];
const ops = [];
for (const [path, item] of Object.entries(spec.paths ?? {}))
  for (const m of methods) if (item?.[m]) ops.push({ path, method: m, op: item[m] });
if (ops.length !== Number(routeCount)) fail(2, `spec has ${ops.length} operations, ApiRoutes has ${routeCount}`);

const schemas = spec.components?.schemas ?? {};
const refName = (s) => (s?.$ref ?? "").replace("#/components/schemas/", "");
// Follow $ref / allOf chains to the object that carries properties.
const props = (name, seen = new Set()) => {
  const s = schemas[name];
  if (!s || seen.has(name)) return {};
  seen.add(name);
  let out = { ...(s.properties ?? {}) };
  if (s.$ref) out = { ...props(refName(s), seen), ...out };
  for (const part of s.allOf ?? []) out = { ...(part.$ref ? props(refName(part), seen) : part.properties ?? {}), ...out };
  return out;
};
const required = (name, seen = new Set()) => {
  const s = schemas[name];
  if (!s || seen.has(name)) return [];
  seen.add(name);
  return [...(s.required ?? []), ...(s.$ref ? required(refName(s), seen) : [])];
};
const jsonRef = (resp) => resp?.content?.["application/json"]?.schema;

const expected = { "/api/v1/schedule": "ScheduleDayResponse", "/api/v1/games/{gamePk}": "GameSnapshotResponse" };
const errorCode = { "/api/v1/schedule": "400", "/api/v1/games/{gamePk}": "404" };
for (const [path, alias] of Object.entries(expected)) {
  const hit = ops.find((o) => o.path === path && o.method === "get");
  if (!hit) { fail(2, `no GET ${path} operation`); fail(3, `no GET ${path}`); fail(31, `no GET ${path}`); continue; }
  const ok = hit.op.responses?.["200"];
  const name = refName(jsonRef(ok));
  if (name !== alias) fail(3, `GET ${path} 200 refs '${name}', expected component '${alias}'`);
  else {
    const p = props(alias);
    for (const field of ["fetchedAt", "windowMode"]) if (!(field in p)) fail(3, `${alias} has no '${field}' property`);
  }
  const codes = Object.keys(hit.op.responses ?? {}).filter((c) => /^4\d\d$/.test(c));
  if (codes.length === 0) fail(31, `GET ${path} declares no 4xx response`);
  for (const c of codes) {
    if (refName(jsonRef(hit.op.responses[c])) !== "ApiErrorResponse") fail(31, `GET ${path} ${c} does not ref ApiErrorResponse`);
  }
  if (!codes.includes(errorCode[path])) fail(31, `GET ${path} does not declare ${errorCode[path]}`);
}
const errProps = props("ApiErrorResponse");
if (errProps.error?.type !== "string") fail(31, "ApiErrorResponse.error is not a string");
if (errProps.hint?.type !== "string") fail(31, "ApiErrorResponse.hint is not a string");
const req = required("ApiErrorResponse");
if (!req.includes("error") || req.includes("hint")) fail(31, `ApiErrorResponse required is [${req}], expected error required and hint optional`);
NODE
  while read -r _ id msg; do bad "$id" "$msg"; done < <(grep '^FAIL ' "$TMP/shape.log")
fi

# --- Check 4: freshness ------------------------------------------------------------
if [ -n "$(script_of api:spec)" ] && [ -f "$SPEC" ]; then
  pnpm -s api:spec --out "$TMP/fresh.json" >"$TMP/gen.log" 2>&1 || bad 4 "pnpm api:spec --out <tmp> failed: $(tail -3 "$TMP/gen.log")"
  if [ -f "$TMP/fresh.json" ]; then
    cmp -s "$TMP/fresh.json" "$SPEC" || bad 4 "regenerated spec differs from $SPEC"
  else
    bad 4 "api:spec --out did not write the temp file"
  fi
else
  bad 4 "no api:spec script or no committed spec"
fi

# --- Check 5: oasdiff wiring + distinct baseline ----------------------------------
grep -qE '"[^"]*oasdiff[^"]*"\s*:' package.json functions/package.json packages/*/package.json 2>/dev/null ||
  bad 5 "no oasdiff dev dependency in a package.json"
BREAK="$(script_of api:breaking)"
if [ -z "$BREAK" ]; then
  bad 5 "root package.json has no api:breaking script"
else
  # --fail-on ERR must appear in the script or the file it runs.
  wrapper=$(echo "$BREAK" | grep -oE '[A-Za-z0-9_./-]+\.(ts|js|mjs|sh)' | head -1)
  { echo "$BREAK"; [ -n "$wrapper" ] && cat "$wrapper" 2>/dev/null; [ -n "$wrapper" ] && cat "functions/$wrapper" 2>/dev/null; } | grep -qE -- '--fail-on[ =]ERR|"--fail-on",\s*"ERR"' ||
    bad 5 "api:breaking does not run oasdiff with --fail-on ERR"
  [ -f "$BASELINE" ] || bad 5 "$BASELINE missing"
  if [ -f "$BASELINE" ] && ! node -e 'JSON.parse(require("fs").readFileSync(process.argv[1],"utf8"))' "$BASELINE" 2>/dev/null; then
    bad 5 "$BASELINE is not valid JSON"
  fi
fi

# --- Check 6: both directions ------------------------------------------------------
if [ -n "$BREAK" ] && [ -f "$TMP/fresh.json" ] && [ -f "$BASELINE" ]; then
  pnpm -s api:breaking >"$TMP/clean.log" 2>&1
  clean=$?
  [ "$clean" -eq 0 ] || bad 6 "api:breaking on the unmodified spec exited $clean: $(tail -3 "$TMP/clean.log")"
  base=$(sed -n 's/^base: //p' "$TMP/clean.log" | head -1)
  rev=$(sed -n 's/^revision: //p' "$TMP/clean.log" | head -1)
  if [ -z "$base" ] || [ -z "$rev" ]; then
    bad 5 "api:breaking does not print 'base: <path>' and 'revision: <path>' lines"
  else
    [ "$(cd "$(dirname "$base")" 2>/dev/null && pwd)/$(basename "$base")" != "$(cd "$(dirname "$rev")" 2>/dev/null && pwd)/$(basename "$rev")" ] ||
      bad 5 "api:breaking diffs one path against itself ($base)"
    case "$base" in *bt-api.v1.baseline.json) ;; *) bad 5 "api:breaking base is '$base', not the committed baseline" ;; esac
    case "$rev" in *bt-api.v1.baseline.json) bad 5 "api:breaking revision is the baseline itself" ;; esac
  fi

  node - "$TMP/fresh.json" "$TMP/mutated.json" <<'NODE'
const fs = require("fs");
const [src, out] = process.argv.slice(2);
const spec = JSON.parse(fs.readFileSync(src, "utf8"));
const schemas = spec.components.schemas;
// Remove fetchedAt from whichever component actually declares it.
let removed = false;
for (const s of Object.values(schemas)) {
  if (s.properties && "fetchedAt" in s.properties) {
    delete s.properties.fetchedAt;
    if (Array.isArray(s.required)) s.required = s.required.filter((r) => r !== "fetchedAt");
    removed = true;
  }
}
if (!removed) { console.error("no component declares fetchedAt"); process.exit(1); }
fs.writeFileSync(out, JSON.stringify(spec, null, 2));
NODE
  if [ -f "$TMP/mutated.json" ]; then
    pnpm -s api:breaking --revision "$TMP/mutated.json" >"$TMP/broken.log" 2>&1
    broken=$?
    [ "$broken" -ne 0 ] || bad 6 "api:breaking passed a spec with fetchedAt removed from the response"
    grep -qiE 'removed|breaking|error' "$TMP/broken.log" || bad 6 "api:breaking output names no breaking change: $(tail -3 "$TMP/broken.log")"
  else
    bad 6 "could not build the mutated fixture"
  fi
  git status --porcelain -- openapi/ | grep -vE "^\?\? " | grep -q . && bad 6 "the gate test modified files under openapi/"
else
  bad 6 "api:breaking, the regenerated spec, or the baseline is missing"
fi

# --- Check 7: CI ------------------------------------------------------------------------
CI=.github/workflows/ci.yml
grep -qE 'pnpm (api:spec|api:check)' "$CI" || bad 7 "ci.yml does not run the spec freshness check"
grep -qE 'pnpm api:breaking' "$CI" || bad 7 "ci.yml does not run pnpm api:breaking"
added=$(git diff "$START" -- "$CI" | grep -E '^\+[^+]')
echo "$added" | grep -qiE 'curl|wget|https?://|fetch' && bad 7 "ci.yml adds a network fetch: $(echo "$added" | grep -iE 'curl|wget|https?://|fetch' | head -1)"

# --- Check 8: README ------------------------------------------------------------------------
if [ -f README.md ]; then
  grep -q 'pnpm api:spec' README.md || bad 8 "README does not say to regenerate with pnpm api:spec"
  grep -qiE 'never (be )?hand-?edit|do not (hand-?)?edit|generated.*(not|never).*edit' README.md || bad 8 "README does not say the spec is generated and never hand-edited"
  grep -qiE 'additive' README.md || bad 8 "README does not state additive-only within v1"
  grep -q 'ADR-015' README.md || bad 8 "README does not reference ADR-015 for breaking changes"
  grep -qiE 'baseline' README.md || bad 8 "README does not explain the baseline"
  grep -qiE 'baseline.*(review|deliberate)|(review|deliberate).*baseline' README.md || bad 8 "README does not say baseline advancement is a deliberate, reviewed edit"
else
  bad 8 "README.md missing"
fi

# --- Check 9: status -------------------------------------------------------------------------
grep -qE '^\| [0-9]+ \| \[S27\].*\| `done` \|$' "$B" || bad 9 "S27 row in the Story status table is not done"
awk '/^### S27 —/{f=1; next} /^### S[0-9]/{f=0} f' "$B" | grep -E '^\*\*Status:\*\* `done`$' >/dev/null || bad 9 "S27 section Status is not done"

report "verify-S27"
exit $?
