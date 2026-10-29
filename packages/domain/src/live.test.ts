import {
	describe, expect, it,
} from "vitest";
import {
	baseRunners, breakInches, zoneLabel,
} from "./live.js";

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
