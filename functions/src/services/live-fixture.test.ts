/**
 * S63: `fixtures/game-823823-live.json` is the recorded game folded to a mid-game
 * moment, not typed by hand — regenerating it offline gives the committed file.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
	describe, expect, it,
} from "vitest";
import { LIVE_FIXTURE_TIMECODE, liveFixtureAt } from "./live-fixture.js";

const FIXTURES = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../fixtures");
const RAW = path.join(FIXTURES, "raw");

describe("the mid-game 823823 fixture (S63)", () =>
{
	it("regenerates fixtures/game-823823-live.json from the recorded diffpatch walk at 20260905_205719", () =>
	{
		expect(LIVE_FIXTURE_TIMECODE).toBe("20260905_205719");
		const regenerated = `${JSON.stringify(liveFixtureAt(RAW), null, 2)}\n`;
		expect(regenerated).toBe(readFileSync(path.join(FIXTURES, "game-823823-live.json"), "utf8"));
	});

	it("is the moment it names: top 3rd, two out, bases loaded, Bregman batting against Gusto mid at-bat", () =>
	{
		const game = liveFixtureAt(RAW);
		expect(game.status.codedGameState).toBe("I");
		expect(game.linescore).toMatchObject({
			currentInning: 3,
			isTopInning: true,
			outs: 2,
		});
		expect(game.live?.runners.first).toEqual(expect.any(Number));
		expect(game.live?.runners.second).toEqual(expect.any(Number));
		expect(game.live?.runners.third).toEqual(expect.any(Number));
		const current = game.plays.at(-1)!;
		expect(current.about.isComplete).toBe(false);
		expect(current.matchup.batter.fullName).toBe("Alex Bregman");
		expect(current.matchup.pitcher.fullName).toBe("Ryan Gusto");
		expect(game.live?.batterId).toBe(current.matchup.batter.id);
		expect(game.live?.pitcherId).toBe(current.matchup.pitcher.id);
		expect(current.pitches).toHaveLength(5);
		expect(current.pitches[0]?.pitchData?.breaks?.breakHorizontal).toEqual(expect.any(Number));
	});

	it("throws for a moment the walk never reaches", () =>
	{
		expect(() => liveFixtureAt(RAW, "20990101_000000")).toThrow(/no state at 20990101_000000/);
	});
});
