import {
	describe, expect, it,
} from "vitest";
import { readFileSync } from "node:fs";
import type { AtBat } from "./plays.js";
import {
	baseRunners, batterLine, breakInches, pitcherLine, zoneLabel,
} from "./live.js";

/** The mid-game moment S63 folded: top 3rd, Bregman batting against Gusto, 21 at-bats. */
const PLAYS: AtBat[] = JSON.parse(readFileSync(new URL("../../../fixtures/game-823823-live.json", import.meta.url), "utf8")).plays;
const GUSTO = 687473;
const BREGMAN = 608324;
const CONFORTO = 624424;

describe("baseRunners (S63)", () =>
{
	it("marks each occupied base", () =>
	{
		expect(baseRunners({
			runners: {
				first: 1,
				second: null,
				third: 3,
			},
			batterId: 4,
			pitcherId: 5,
		})).toEqual({
			first: true,
			second: false,
			third: true,
		});
	});

	it("no live moment is bases empty", () =>
	{
		const empty = {
			first: false,
			second: false,
			third: false,
		};
		expect(baseRunners(null)).toEqual(empty);
		expect(baseRunners(undefined)).toEqual(empty);
	});
});

describe("zoneLabel (S63)", () =>
{
	it("names the 3 × 3 strike zone from the catcher's view", () =>
	{
		expect([1, 2, 3, 4, 5, 6, 7, 8, 9].map(zoneLabel)).toEqual([
			"Up-Left", "Up-Middle", "Up-Right",
			"Middle-Left", "Middle-Middle", "Middle-Right",
			"Down-Left", "Down-Middle", "Down-Right",
		]);
	});

	it("names the four areas outside it, and nothing for no zone or an unused number", () =>
	{
		expect([11, 12, 13, 14].map(zoneLabel)).toEqual(["Outside, Up-Left", "Outside, Up-Right", "Outside, Down-Left", "Outside, Down-Right"]);
		expect(zoneLabel(null)).toBeNull();
		expect(zoneLabel(undefined)).toBeNull();
		expect(zoneLabel(10)).toBeNull();
		expect(zoneLabel(0)).toBeNull();
	});
});

describe("breakInches (S63)", () =>
{
	const breaks = {
		breakAngle: 12,
		breakLength: 4.8,
		spinRate: 2318,
	};

	it("rounds MLB's inches to a tenth, as magnitudes", () =>
	{
		expect(breakInches({
			...breaks,
			breakHorizontal: -4.74,
			breakVertical: -21.6,
		})).toEqual({
			horizontal: 4.7,
			vertical: 21.6,
		});
	});

	it("is null when MLB sent no break numbers", () =>
	{
		expect(breakInches(null)).toBeNull();
		expect(breakInches(breaks)).toBeNull();
		expect(breakInches({
			...breaks,
			breakHorizontal: 3,
			breakVertical: null,
		})).toBeNull();
	});
});

describe("pitcherLine (S64)", () =>
{
	it("an early at-bat counts only the pitches thrown so far: Gusto through the 1st's fourth batter", () =>
	{
		expect(pitcherLine(PLAYS, GUSTO, 3)).toEqual({
			pitches: 13,
			strikes: 6,
		});
	});

	it("a late at-bat includes the current at-bat's pitches: Gusto through Bregman's 2–2 in the 3rd", () =>
	{
		expect(pitcherLine(PLAYS, GUSTO, 20)).toEqual({
			pitches: 55,
			strikes: 35,
		});
	});

	it("counts nothing for a pitcher who hasn't thrown", () =>
	{
		expect(pitcherLine(PLAYS, 1, 20)).toEqual({
			pitches: 0,
			strikes: 0,
		});
	});
});

describe("batterLine (S64)", () =>
{
	it("an early at-bat: Conforto before his home run has no at-bat (his 2nd-inning turn ended on a runner caught stealing)", () =>
	{
		expect(batterLine(PLAYS, CONFORTO, 14)).toEqual({
			atBats: 0,
			hits: 0,
			homeRuns: 0,
			rbi: 0,
		});
	});

	it("a late at-bat: Conforto through his 3rd-inning home run is 1-for-1, a home run, 1 RBI", () =>
	{
		expect(batterLine(PLAYS, CONFORTO, 20)).toEqual({
			atBats: 1,
			hits: 1,
			homeRuns: 1,
			rbi: 1,
		});
	});

	it("the at-bat in progress adds nothing until it ends: Bregman is 0-for-1 mid at-bat", () =>
	{
		expect(batterLine(PLAYS, BREGMAN, 20)).toEqual({
			atBats: 1,
			hits: 0,
			homeRuns: 0,
			rbi: 0,
		});
	});

	it("walks are plate appearances but not at-bats: Crow-Armstrong walked, then struck out", () =>
	{
		expect(batterLine(PLAYS, 691718, 20)).toMatchObject({
			atBats: 1,
			hits: 0,
		});
	});
});
