import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parsePeopleResponse } from "@bt/mlb-api";
import { describe, expect, it } from "vitest";
import { mapPeople, mapPlayerSeasons } from "./players.js";

const raw = JSON.parse(
  readFileSync(
    fileURLToPath(new URL("../../../fixtures/raw/people-823823.json", import.meta.url)),
    "utf8",
  ),
);

describe("mapPeople", () => {
  const players = mapPeople(parsePeopleResponse(raw));

  it("maps every person in the fixture", () => {
    expect(players.length).toBe(raw.people.length);
  });

  it("carries the identity bag for each player", () => {
    for (const player of players) {
      expect(player.playerId).toBeGreaterThan(0);
      expect(player.fullName).toBeTruthy();
      expect(player.position).toBeTruthy();
    }
  });

  it("maps the hydrated season splits", () => {
    const withSeasons = players.filter((player) => player.seasons.length > 0);
    expect(withSeasons.length).toBeGreaterThan(0);

    for (const player of withSeasons) {
      for (const season of player.seasons) {
        expect(season.season).toBeTruthy();
        expect(season.group).toBeTruthy();
      }
    }
  });

  it("reads a known player's line off the fixture", () => {
    const conforto = players.find((player) => player.playerId === 624424);

    expect(conforto?.fullName).toBe("Michael Conforto");
    expect(conforto?.seasons[0]?.group).toBe("hitting");
    expect(conforto?.seasons[0]?.season).toBe("2026");
  });
});

describe("mapPlayerSeasons", () => {
  it("returns an empty bag when no stats were hydrated", () => {
    expect(mapPlayerSeasons(undefined)).toEqual([]);
    expect(mapPlayerSeasons([{ group: { displayName: "hitting" } }])).toEqual([]);
  });

  it("labels each split with its group", () => {
    const seasons = mapPlayerSeasons([
      {
        group: { displayName: "pitching" },
        splits: [{ season: "2026", stat: { era: "3.10", strikeOuts: 88 } }],
      },
    ]);

    expect(seasons).toHaveLength(1);
    expect(seasons[0]?.group).toBe("pitching");
    expect(seasons[0]?.era).toBe("3.10");
    expect(seasons[0]?.strikeOuts).toBe(88);
  });
});
