import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

/**
 * Near-duplicate interfaces are the failure mode of hand-written upstream
 * contracts: two shapes drift apart, and a fix lands on one of them. This test
 * makes the duplication a build error unless the pair is genuinely related —
 * one extends/Picks/Omits the other, or both share a base — or the pair is
 * listed below with a reason.
 */
const OVERLAP_LIMIT = 0.8;

/**
 * Below this many fields, "80 % of the names match" says nothing: every
 * `{ id }` wrapper overlaps every shape that has an `id`.
 */
const MIN_FIELDS = 4;

/** Pairs that overlap heavily on purpose. Each needs a reason. */
const ALLOWED_PAIRS: ReadonlyArray<[string, string, string]> = [];

interface ExportedInterface {
  name: string;
  bases: string[];
  ownFields: string[];
}

const srcDir = fileURLToPath(new URL(".", import.meta.url));

function readInterfaces(): ExportedInterface[] {
  const found: ExportedInterface[] = [];

  for (const file of readdirSync(srcDir).filter(
    (name) => name.endsWith(".ts") && !name.endsWith(".test.ts"),
  )) {
    const lines = readFileSync(srcDir + file, "utf8").split("\n");
    let current: ExportedInterface | undefined;

    for (const line of lines) {
      const header =
        /^export interface ([A-Za-z0-9_]+)(?:<[^>]*>)?\s*(?:extends (.+?))?\s*\{/.exec(
          line,
        );
      if (header?.[1]) {
        current = {
          name: header[1],
          // `extends Omit<LiveGamePlay, "about">` counts LiveGamePlay as a base.
          bases: [...(header[2] ?? "").matchAll(/[A-Za-z0-9_]+/g)].map((m) => m[0]),
          ownFields: [],
        };
        found.push(current);
        continue;
      }
      if (!current) continue;
      if (line === "}") {
        current = undefined;
        continue;
      }
      const field = /^ {2}(?:readonly )?([A-Za-z0-9_]+)\??:/.exec(line);
      if (field?.[1]) current.ownFields.push(field[1]);
    }
  }

  return found;
}

function resolveFields(
  target: ExportedInterface,
  byName: Map<string, ExportedInterface>,
  seen = new Set<string>(),
): Set<string> {
  if (seen.has(target.name)) return new Set();
  seen.add(target.name);

  const fields = new Set(target.ownFields);
  for (const base of target.bases) {
    const parent = byName.get(base);
    if (!parent) continue;
    for (const field of resolveFields(parent, byName, seen)) fields.add(field);
  }
  return fields;
}

function ancestors(
  target: ExportedInterface,
  byName: Map<string, ExportedInterface>,
  out = new Set<string>(),
): Set<string> {
  for (const base of target.bases) {
    if (out.has(base)) continue;
    out.add(base);
    const parent = byName.get(base);
    if (parent) ancestors(parent, byName, out);
  }
  return out;
}

describe("exported upstream interfaces", () => {
  const interfaces = readInterfaces();
  const byName = new Map(interfaces.map((entry) => [entry.name, entry]));

  it("finds the interfaces it is meant to police", () => {
    expect(interfaces.length).toBeGreaterThan(40);
    expect(byName.get("LiveBoxscorePlayer")?.ownFields).toContain("seasonStats");
  });

  it("has no unrelated near-duplicate shapes", () => {
    const allowed = new Set(ALLOWED_PAIRS.map(([a, b]) => [a, b].sort().join(" / ")));
    const offenders: string[] = [];

    for (let i = 0; i < interfaces.length; i++) {
      for (let j = i + 1; j < interfaces.length; j++) {
        const a = interfaces[i];
        const b = interfaces[j];
        if (!a || !b) continue;

        const fieldsA = resolveFields(a, byName);
        const fieldsB = resolveFields(b, byName);
        const smaller = Math.min(fieldsA.size, fieldsB.size);
        if (smaller < MIN_FIELDS) continue;

        const shared = [...fieldsA].filter((field) => fieldsB.has(field)).length;
        if (shared / smaller < OVERLAP_LIMIT) continue;

        const kinA = ancestors(a, byName);
        const kinB = ancestors(b, byName);
        const related =
          kinA.has(b.name) ||
          kinB.has(a.name) ||
          [...kinA].some((name) => kinB.has(name));
        const pair = [a.name, b.name].sort().join(" / ");
        if (related || allowed.has(pair)) continue;

        offenders.push(`${pair} share ${shared}/${smaller} field names`);
      }
    }

    expect(offenders).toEqual([]);
  });

  it("requires a reason on every allowed pair", () => {
    for (const [, , reason] of ALLOWED_PAIRS) {
      expect(reason.length).toBeGreaterThan(10);
    }
  });
});
