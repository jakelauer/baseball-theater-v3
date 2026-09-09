/**
 * Field-coverage helpers for the recorded fixtures.
 *
 * The runtime schemas in `parse.ts` are lenient by design: `z.object()` drops
 * upstream keys it does not declare rather than throwing. That keeps prod alive
 * when MLB adds a field, and it also means a payload can quietly lose half its
 * content. Comparing the leaf paths of a raw payload with the leaf paths of its
 * parsed result is what makes the loss visible.
 */

/** Object keys that are entity ids, not schema: `players.660271`, `ID660271`. */
const ID_KEY = /^(ID)?\d+$/;

/** The placeholder every array index and every id key collapses to. */
const ARRAY_SEGMENT = "[]";
const ID_SEGMENT = "{id}";

function join(prefix: string, segment: string): string {
  return prefix ? `${prefix}.${segment}` : segment;
}

function collect(value: unknown, prefix: string, out: Set<string>): void {
  if (Array.isArray(value)) {
    const path = prefix + ARRAY_SEGMENT;
    if (value.length === 0) {
      out.add(path);
      return;
    }
    for (const entry of value) collect(entry, path, out);
    return;
  }

  if (value !== null && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) {
      out.add(prefix);
      return;
    }
    for (const [key, child] of entries) {
      collect(child, join(prefix, ID_KEY.test(key) ? ID_SEGMENT : key), out);
    }
    return;
  }

  out.add(prefix);
}

/**
 * Every leaf key-path in `value`, with array indices rendered as `[]` and
 * id-keyed map keys as `{id}` — so `players.660271.fullName` and
 * `players.808982.fullName` are one path, and a key present on any one entry
 * still shows up. An empty object or array is itself a leaf: dropping it would
 * hide a whole branch.
 */
export function leafPaths(value: unknown): string[] {
  const out = new Set<string>();
  collect(value, "", out);
  return [...out].sort();
}

/**
 * Paths present in the raw payload but missing from the parsed result — the
 * fields the schemas silently drop. `ignore` entries (see `coverage-ignore.ts`)
 * are removed from the result.
 */
export function uncoveredPaths(
  raw: unknown,
  parsed: unknown,
  ignore: readonly string[] = [],
): string[] {
  const covered = new Set(leafPaths(parsed));
  const ignored = new Set(ignore);
  return leafPaths(raw).filter((path) => !covered.has(path) && !ignored.has(path));
}
