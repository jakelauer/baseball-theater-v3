import { describe, expect, it } from "vitest";
import { FixtureMlbStatsClient } from "../adapters/fixtures/mlb.js";
import {
  InMemoryGameProjectionRepository,
  InMemoryGameRepository,
  InMemoryScheduleRepository,
} from "../adapters/memory/repos.js";
import { getOrRefreshGame, ingestScheduleDay } from "./ingest.js";

describe("ingest with fixtures", () => {
  it("loads schedule and games into memory", async () => {
    const schedules = new InMemoryScheduleRepository();
    const games = new InMemoryGameRepository();
    const projections = new InMemoryGameProjectionRepository();
    const mlb = new FixtureMlbStatsClient();
    const day = await ingestScheduleDay(
      { mlb, schedules, games, projections },
      "2024-07-04",
    );
    expect(day.games.length).toBe(2);
    expect(await schedules.getByDate("2024-07-04")).not.toBeNull();
    const game = await getOrRefreshGame({ mlb, schedules, games, projections }, 744834);
    expect(game?.teams.home.abbreviation).toBe("WSH");
    expect(game?.highlights[0]?.title.toLowerCase()).toContain("walk-off");
  });
});
