import {
	describe, expect, it,
} from "vitest";
import {
	formatOfficialDate, gameInfoLines, roomLabel, shortPlayerName,
} from "./format.js";

describe("roomLabel", () =>
{
	it("capitalizes the room for its tab", () =>
	{
		expect(roomLabel("videos")).toBe("Videos");
		expect(roomLabel("recap")).toBe("Recap");
	});
});

describe("formatOfficialDate", () =>
{
	it("formats the calendar date without timezone drift", () =>
	{
		expect(formatOfficialDate("2024-07-04")).toBe("Jul 4, 2024");
		expect(formatOfficialDate("2026-09-21")).toBe("Sep 21, 2026");
	});

	it("passes through anything that is not a date", () =>
	{
		expect(formatOfficialDate("TBD")).toBe("TBD");
		expect(formatOfficialDate("2024-13-01")).toBe("2024-13-01");
	});
});

describe("shortPlayerName (S2)", () =>
{
	it("shortens the first name to an initial and keeps the rest", () =>
	{
		expect(shortPlayerName("Pete Crow-Armstrong")).toBe("P. Crow-Armstrong");
		expect(shortPlayerName("Ronald Acuña Jr.")).toBe("R. Acuña Jr.");
	});

	it("leaves a one-word name as it is", () =>
	{
		expect(shortPlayerName("Ichiro")).toBe("Ichiro");
	});
});

describe("gameInfoLines (S2)", () =>
{
	it("keeps the drawn labels in the drawn order, without MLB's closing period", () =>
	{
		expect(gameInfoLines([
			{
				label: "Att",
				value: "26,141.",
			},
			{
				label: "Umpires",
				value: "HP: Someone.",
			},
			{
				label: "Venue",
				value: "loanDepot park.",
			},
		])).toEqual([
			{
				label: "Venue",
				value: "loanDepot park",
			},
			{
				label: "Att",
				value: "26,141",
			},
		]);
	});
});
