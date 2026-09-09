import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { COVERAGE_IGNORE } from "./coverage-ignore.js";
import { leafPaths, uncoveredPaths } from "./coverage.js";
import {
  parseGameContentResponse,
  parseGameTimestamps,
  parseLiveFeedResponse,
  parsePeopleResponse,
  parseScheduleResponse,
  parseStandingsResponse,
} from "./parse.js";

const rawDir = fileURLToPath(new URL("../../../fixtures/raw/", import.meta.url));

function readRaw(name: string): unknown {
  return JSON.parse(readFileSync(rawDir + name, "utf8"));
}

/**
 * Every `fixtures/raw/*.json` that is a single raw upstream response, with the
 * parser that owns it. The recorded replay envelope is a derived artifact
 * rather than one upstream response, so typing it belongs to the replay story.
 */
const fixtures: ReadonlyArray<[string, (input: unknown) => unknown]> = [
  ["schedule-2026-09-05.json", parseScheduleResponse],
  ["live-823823.json", parseLiveFeedResponse],
  ["live-823823-base.json", parseLiveFeedResponse],
  ["content-823823.json", parseGameContentResponse],
  ["timestamps-823823.json", parseGameTimestamps],
  ["standings-2026-09-05.json", parseStandingsResponse],
  ["people-823823.json", parsePeopleResponse],
];

describe("leafPaths", () => {
  it("normalizes array indices and id-keyed map keys", () => {
    const paths = leafPaths({
      dates: [{ games: [{ gamePk: 1 }, { gamePk: 2, link: "/x" }] }],
      players: { ID660271: { fullName: "a" }, ID808982: { jerseyNumber: "7" } },
    });

    expect(paths).toEqual([
      "dates[].games[].gamePk",
      "dates[].games[].link",
      "players.{id}.fullName",
      "players.{id}.jerseyNumber",
    ]);
  });

  it("treats an empty object or array as a leaf of its own", () => {
    expect(leafPaths({ a: {}, b: [], c: { d: null } })).toEqual(["a", "b[]", "c.d"]);
  });
});

describe("uncoveredPaths", () => {
  it("reports what the parsed value dropped", () => {
    expect(uncoveredPaths({ a: 1, b: { c: 2 } }, { a: 1 })).toEqual(["b.c"]);
  });

  it("subtracts the allowlist", () => {
    expect(uncoveredPaths({ a: 1, b: 2 }, {}, ["b"])).toEqual(["a"]);
  });
});

describe("fixture field coverage", () => {
  it.each(fixtures)("models every recorded path in %s", (name, parse) => {
    const raw = readRaw(name);
    const uncovered = uncoveredPaths(raw, parse(raw), COVERAGE_IGNORE);

    expect(uncovered).toEqual([]);
  });

  it("keeps the allowlist small and every entry explained", () => {
    const source = readFileSync(
      fileURLToPath(new URL("./coverage-ignore.ts", import.meta.url)),
      "utf8",
    );
    const entries = source.match(/^\s*"[^"]+",/gm) ?? [];
    const explained = source.match(/^\s*"[^"]+",\s*\/\/\s*reason:/gm) ?? [];

    expect(entries.length).toBe(COVERAGE_IGNORE.length);
    expect(explained.length).toBe(entries.length);
    expect(COVERAGE_IGNORE.length).toBeLessThanOrEqual(25);
  });
});
