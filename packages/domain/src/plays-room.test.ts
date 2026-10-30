import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
	describe, expect, it,
} from "vitest";
import type { AtBat } from "./plays.js";
import {
	defaultPlaysInning, inningHalves, scoreAfterLabel, scoringPlays,
} from "./plays-room.js";

const PLAYS: AtBat[] = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../../../fixtures/plays-823823.json"), "utf8"));

/** A bare at-bat in `inning` / `half`, scoring or not, with the score after it. */
function atBat(index: number, inning: number, half: "top" | "bottom", scoring = false, score: [number | null, number | null] = [null, null]): AtBat
{
	return {
		about: {
			atBatIndex: index,
			halfInning: half,
			inning,
			isComplete: true,
			isScoringPlay: scoring,
		},
		result: {
			event: "Single",
			description: "",
			eventType: "single",
			isOut: false,
			rbi: 0,
			awayScore: score[0],
			homeScore: score[1],
		},
		matchup: {
			batter: {
				id: 1,
				fullName: "A Batter",
			},
			pitcher: {
				id: 2,
				fullName: "A Pitcher",
			},
			batSide: "R",
			pitchHand: "R",
		},
		count: {
			balls: 0,
			strikes: 0,
			outs: 0,
		},
		pitches: [],
	};
}

describe("defaultPlaysInning (S41)", () =>
{
	it("is the latest inning with an at-bat: 9 in 823823", () =>
	{
		expect(defaultPlaysInning(PLAYS)).toBe(9);
	});

	it("a 10-inning game opens on the 10th", () =>
	{
		expect(defaultPlaysInning([atBat(0, 9, "bottom"), atBat(1, 10, "top")])).toBe(10);
	});

	it("an inning with no at-bats yet doesn't count: the last one with at-bats wins; none before the first", () =>
	{
		// The linescore may already show the 8th; no at-bat has reached it.
		expect(defaultPlaysInning([atBat(0, 6, "top"), atBat(1, 7, "bottom")])).toBe(7);
		expect(defaultPlaysInning([])).toBeNull();
	});
});

describe("inningHalves (S41)", () =>
{
	it("splits an inning into its top and bottom, in batting order", () =>
	{
		const halves = inningHalves(PLAYS, 9);
		expect(halves.top.length).toBeGreaterThan(0);
		expect(halves.top.every((play) => play.about.inning === 9 && play.about.halfInning === "top")).toBe(true);
		expect(halves.bottom.every((play) => play.about.halfInning === "bottom")).toBe(true);
		expect(halves.top.map((play) => play.about.atBatIndex)).toEqual([...halves.top.map((play) => play.about.atBatIndex)].sort((a, b) => a - b));
	});
});

describe("scoringPlays (S41)", () =>
{
	it("lists 823823's nine scoring plays in game order, Conforto's 1–0 home run to Stowers' (CHC 6–5)", () =>
	{
		const runs = scoringPlays(PLAYS);
		expect(runs).toHaveLength(9);
		expect(runs[0]!.matchup.batter.fullName).toBe("Michael Conforto");
		expect(scoreAfterLabel(runs[0]!, "CHC", "MIA")).toBe("CHC 1–0");
		expect(runs.at(-1)!.matchup.batter.fullName).toBe("Kyle Stowers");
		expect(scoreAfterLabel(runs.at(-1)!, "CHC", "MIA")).toBe("CHC 6–5");
	});

	it("keeps extra innings: a 10th-inning run is listed last", () =>
	{
		const runs = scoringPlays([atBat(0, 3, "top", true), atBat(1, 5, "top"), atBat(2, 10, "bottom", true)]);
		expect(runs.map((play) => play.about.inning)).toEqual([3, 10]);
	});
});

describe("scoreAfterLabel (S41)", () =>
{
	it("names the leader first, leaves a tie bare, and is null without a score", () =>
	{
		expect(scoreAfterLabel(atBat(0, 2, "bottom", true, [0, 2]), "NYY", "BOS")).toBe("BOS 2–0");
		expect(scoreAfterLabel(atBat(0, 3, "top", true, [2, 2]), "NYY", "BOS")).toBe("2–2");
		expect(scoreAfterLabel(atBat(0, 3, "top", true, [null, 2]), "NYY", "BOS")).toBeNull();
	});
});
