import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parseStandingsResponse } from "@bt/mlb-api";
import { describe, expect, it } from "vitest";
import { mapStandings, mapStandingsTeam, normalizeDash } from "./standings.js";

const raw = JSON.parse(
  readFileSync(
    fileURLToPath(
      new URL("../../../fixtures/raw/standings-2026-09-05.json", import.meta.url),
    ),
    "utf8",
  ),
);

describe("normalizeDash", () => {
  it("turns MLB's not-applicable dash into null", () => {
    expect(normalizeDash("-")).toBeNull();
    expect(normalizeDash(undefined)).toBeNull();
    expect(normalizeDash("2.5")).toBe("2.5");
  });
});

describe("mapStandings", () => {
  const snapshot = mapStandings(
    parseStandingsResponse(raw),
    "2026-09-05",
    "2026-09-05T00:00:00Z",
  );

  it("maps every division group in the fixture", () => {
    expect(snapshot.divisions.length).toBe(raw.records.length);
    expect(snapshot.date).toBe("2026-09-05");
    expect(snapshot.windowMode).toBe("cache");
  });

  it("gives every division a name, an id and a full team list", () => {
    for (const division of snapshot.divisions) {
      expect(division.divisionId).toBeTypeOf("number");
      expect(division.name).toBeTruthy();
      expect(division.teams.length).toBeGreaterThan(0);
    }
  });

  it("carries name, wins and losses for every team", () => {
    const teams = snapshot.divisions.flatMap((division) => division.teams);
    expect(teams.length).toBe(30);
    for (const team of teams) {
      expect(team.name).toBeTruthy();
      expect(team.wins).toBeTypeOf("number");
      expect(team.losses).toBeTypeOf("number");
      expect(team.teamId).toBeGreaterThan(0);
    }
  });

  it("orders each division by division rank", () => {
    for (const division of snapshot.divisions) {
      const ranks = division.teams.map((team) => team.divisionRank);
      expect(ranks).toEqual([...ranks].sort((a, b) => (a ?? 0) - (b ?? 0)));
    }
  });

  it("normalizes the games-back dash on the division leader", () => {
    const leader = snapshot.divisions
      .flatMap((division) => division.teams)
      .find((team) => team.divisionLeader);

    expect(leader).toBeDefined();
    expect(leader?.gamesBack).toBeNull();
  });
});

describe("mapStandingsTeam", () => {
  it("falls back to the league record when the row omits the top-level line", () => {
    const mapped = mapStandingsTeam({
      team: { id: 1, name: "Test" },
      leagueRecord: { wins: 9, losses: 3, pct: ".750" },
    });

    expect(mapped.wins).toBe(9);
    expect(mapped.losses).toBe(3);
    expect(mapped.pct).toBe(".750");
  });
});
