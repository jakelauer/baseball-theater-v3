import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  parseLiveFeedResponse,
  parseRecordedReplayWalk,
  reconstructReplay,
} from "@bt/mlb-api";
import { describe, expect, it } from "vitest";
import { mapLiveFeed } from "../mappers/live.js";

const rawDir = fileURLToPath(new URL("../../../fixtures/raw/", import.meta.url));

function readRaw(name: string): unknown {
  return JSON.parse(readFileSync(rawDir + name, "utf8"));
}

type FeedLike = {
  liveData: { plays: { allPlays: unknown[] }; linescore: unknown };
};

describe("reconstructReplay over the recorded CHC @ MIA walk", () => {
  const base = readRaw("live-823823-base.json");
  const walk = parseRecordedReplayWalk(readRaw("diffpatch-823823.json"));
  const { states, timecodes } = reconstructReplay(base, walk);

  it("retains at least one step and fewer than the 553 recorded pairs", () => {
    expect(walk).toHaveLength(553);
    expect(states.length).toBeGreaterThanOrEqual(1);
    expect(states.length).toBeLessThan(walk.length);
    expect(timecodes).toHaveLength(states.length);
  });

  it("reconstructs the final GameSnapshot with the game's final score", () => {
    const finalFeed = states[states.length - 1]!.feed;
    const snapshot = mapLiveFeed(
      parseLiveFeedResponse(finalFeed),
      "2026-09-06T00:00:00.000Z",
    );
    const reference = readRaw("live-823823.json") as {
      liveData: {
        linescore: { teams: { home: { runs: number }; away: { runs: number } } };
      };
    };

    expect(snapshot.gamePk).toBe(823823);
    expect(snapshot.linescore?.teams.away.runs).toBe(
      reference.liveData.linescore.teams.away.runs,
    );
    expect(snapshot.linescore?.teams.home.runs).toBe(
      reference.liveData.linescore.teams.home.runs,
    );
  });

  it("keeps liveData.plays.allPlays length non-decreasing across the sequence", () => {
    const lengths = states.map(
      (state) => (state.feed as FeedLike).liveData.plays.allPlays.length,
    );
    for (let i = 1; i < lengths.length; i += 1) {
      expect(lengths[i]!).toBeGreaterThanOrEqual(lengths[i - 1]!);
    }
    expect(lengths[lengths.length - 1]).toBe(85);
  });
});
