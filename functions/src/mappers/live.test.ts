import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { parseGameContentResponse, parseLiveFeedResponse } from "@bt/mlb-api";
import { describe, expect, it } from "vitest";
import { mapContentHighlights, mapRecapBlurb } from "./content.js";
import { mapLiveFeed } from "./live.js";

const rawDir = fileURLToPath(new URL("../../../fixtures/raw/", import.meta.url));

function readRaw(name: string): unknown {
  return JSON.parse(readFileSync(rawDir + name, "utf8"));
}

const FETCHED_AT = "2026-09-06T00:00:00.000Z";

function snapshot() {
  return mapLiveFeed(parseLiveFeedResponse(readRaw("live-823823.json")), FETCHED_AT);
}

describe("mapLiveFeed", () => {
  it("maps the recorded live feed onto a GameSnapshot", () => {
    const game = snapshot();

    expect(game.gamePk).toBe(823823);
    expect(game.officialDate).toBe("2026-09-05");
    expect(game.teams.away.abbreviation).toBe("CHC");
    expect(game.teams.home.abbreviation).toBe("MIA");
    expect(game.venue?.name).toBe("loanDepot park");
    expect(game.status.detailedState).toBe("Final");
    expect(game.linescore?.teams.home.runs).toBeGreaterThanOrEqual(0);
    expect(game.fetchedAt).toBe(FETCHED_AT);
  });

  it("carries plays with Statcast pitch coordinates", () => {
    const game = snapshot();
    expect(game.plays).toHaveLength(85);

    const pitched = game.plays.flatMap((play) => play.pitches);
    const located = pitched.filter((pitch) => pitch.pitchData !== null);
    expect(located.length).toBeGreaterThan(0);

    const first = located[0];
    expect(typeof first?.pitchData?.coordinates.pX).toBe("number");
    expect(typeof first?.pitchData?.coordinates.pZ).toBe("number");
    expect(first?.pitchData?.strikeZoneTop).toBeGreaterThan(0);
  });

  it("maps at-bat metadata the UI binds to", () => {
    const [play] = snapshot().plays;
    expect(play?.about.inning).toBe(1);
    expect(play?.about.halfInning).toBe("top");
    expect(play?.matchup.batter.fullName).toBeTruthy();
    expect(play?.result.event).toBeTruthy();
  });
});

describe("mapContentHighlights", () => {
  it("maps highlights from the content endpoint", () => {
    const content = parseGameContentResponse(readRaw("content-823823.json"));
    const highlights = mapContentHighlights(content);

    expect(highlights).toHaveLength(40);
    const first = highlights[0];
    expect(first?.title).toBeTruthy();
    expect(first?.playbackUrl).toMatch(/^https?:\/\//);
    expect(mapRecapBlurb(content)).toBeTruthy();
  });
});
