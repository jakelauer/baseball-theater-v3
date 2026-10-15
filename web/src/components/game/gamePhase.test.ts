import {
	describe, expect, it,
} from "vitest";
import {
	formatOfficialDate, gamePhase, resolveRoom, roomLabel, roomsForPhase,
} from "./gamePhase.js";

describe("gamePhase", () =>
{
	it("maps MLB abstractGameState to a BT phase", () =>
	{
		expect(gamePhase("Preview")).toBe("pregame");
		expect(gamePhase("Live")).toBe("live");
		expect(gamePhase("Final")).toBe("final");
		expect(gamePhase("Something new")).toBe("pregame");
	});
});

describe("roomsForPhase", () =>
{
	it("pre-game: Videos, Plays, Box only", () =>
	{
		expect(roomsForPhase("pregame").map(roomLabel)).toEqual(["Videos", "Plays", "Box"]);
	});

	it("in progress: adds Live, no Recap", () =>
	{
		expect(roomsForPhase("live").map(roomLabel)).toEqual(["Videos", "Live", "Plays", "Box"]);
	});

	it("final: adds Recap, no Live", () =>
	{
		expect(roomsForPhase("final").map(roomLabel)).toEqual(["Videos", "Plays", "Box", "Recap"]);
	});
});

describe("resolveRoom", () =>
{
	it("keeps a room the phase offers", () =>
	{
		expect(resolveRoom("box", "final")).toBe("box");
		expect(resolveRoom("live", "live")).toBe("live");
	});

	it("falls back to Videos for a hidden, unknown, or missing room", () =>
	{
		expect(resolveRoom("live", "final")).toBe("videos");
		expect(resolveRoom("recap", "pregame")).toBe("videos");
		expect(resolveRoom("nope", "live")).toBe("videos");
		expect(resolveRoom(undefined, "live")).toBe("videos");
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
