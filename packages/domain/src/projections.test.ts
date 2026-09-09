import { describe, expect, it } from "vitest";
import { projectGame, projectGameBoxscore } from "./projections.js";
import type { AtBat } from "./plays.js";
import type { GameSnapshot } from "./types.js";

function atBat(
  half: "top" | "bottom",
  batter: { id: number; fullName: string },
  pitcher: { id: number; fullName: string },
): AtBat {
  return {
    about: {
      atBatIndex: 0,
      halfInning: half,
      inning: 1,
      isComplete: true,
      isScoringPlay: false,
    },
    result: {
      event: "Single",
      description: "single",
      eventType: "single",
      isOut: false,
      rbi: 0,
    },
    matchup: { batter, pitcher, batSide: "R", pitchHand: "L" },
    count: { balls: 0, strikes: 0, outs: 0 },
    pitches: [],
  };
}

const lindor = { id: 1, fullName: "Francisco Lindor" };
const abrams = { id: 2, fullName: "CJ Abrams" };
const gore = { id: 3, fullName: "MacKenzie Gore" };
const senga = { id: 4, fullName: "Kodai Senga" };

const snapshot: GameSnapshot = {
  gamePk: 744834,
  gameDate: "2024-07-04",
  officialDate: "2024-07-04",
  status: { abstractGameState: "Final", codedGameState: "F", detailedState: "Final" },
  teams: {
    away: { id: 121, abbreviation: "NYM", name: "New York Mets", teamName: "Mets" },
    home: {
      id: 120,
      abbreviation: "WSH",
      name: "Washington Nationals",
      teamName: "Nationals",
    },
  },
  venue: { id: 3309, name: "Nationals Park" },
  linescore: null,
  highlights: [],
  plays: [
    atBat("top", lindor, gore),
    atBat("top", lindor, gore),
    atBat("bottom", abrams, senga),
  ],
  fetchedAt: "2024-07-05T00:00:00.000Z",
  windowMode: "cache",
};

describe("projectGame", () => {
  it("splits one snapshot into five documents that share meta", () => {
    const projection = projectGame(snapshot);

    for (const doc of Object.values(projection)) {
      expect(doc.gamePk).toBe(744834);
      expect(doc.fetchedAt).toBe(snapshot.fetchedAt);
      expect(doc.windowMode).toBe("cache");
    }
    expect(projection.header.venue?.name).toBe("Nationals Park");
    expect(projection.plays.playCount).toBe(3);
    expect(projection.linescore.linescore).toBeNull();
    expect(projection.media.highlights).toEqual([]);
  });
});

describe("projectGameBoxscore", () => {
  it("credits a batter to the half-inning their side bats in", () => {
    const { teams } = projectGameBoxscore(snapshot);

    expect(teams.away.batting).toEqual([
      { playerId: 1, name: "Francisco Lindor", plateAppearances: 2 },
    ]);
    expect(teams.home.batting).toEqual([
      { playerId: 2, name: "CJ Abrams", plateAppearances: 1 },
    ]);
  });

  it("credits the pitcher on the other side of the same at-bat", () => {
    const { teams } = projectGameBoxscore(snapshot);

    expect(teams.home.pitching).toEqual([
      { playerId: 3, name: "MacKenzie Gore", battersFaced: 2 },
    ]);
    expect(teams.away.pitching).toEqual([
      { playerId: 4, name: "Kodai Senga", battersFaced: 1 },
    ]);
  });

  it("returns empty tables when the snapshot carries no plays", () => {
    const { teams } = projectGameBoxscore({ ...snapshot, plays: [] });

    expect(teams.away.batting).toEqual([]);
    expect(teams.home.pitching).toEqual([]);
  });
});
