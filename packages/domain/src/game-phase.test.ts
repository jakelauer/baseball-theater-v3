import {
	describe, expect, it,
} from "vitest";
import {
	gamePhase, resolveRoom, roomsForPhase,
} from "./game-phase.js";
import type { GameStatusCode } from "./types.js";
import { isFinalStatus, isLiveStatus } from "./window.js";

describe("gamePhase", () =>
{
	// Every GameStatusCode, with the phase it must map to.
	const table: [GameStatusCode, "pregame" | "live" | "final"][] = [
		["S", "pregame"],
		["P", "live"],
		["I", "live"],
		["F", "final"],
		["O", "final"],
		["C", "final"],
		["D", "live"],
		["U", "pregame"],
	];

	it.each(table)("code %s → %s", (code, phase) =>
	{
		expect(gamePhase(code)).toBe(phase);
	});

	it.each(table)("code %s agrees with isLiveStatus / isFinalStatus", (code) =>
	{
		expect(gamePhase(code) === "live").toBe(isLiveStatus(code));
		expect(gamePhase(code) === "final").toBe(isFinalStatus(code));
	});

	it("treats a code MLB adds later as pre-game", () =>
	{
		expect(gamePhase("Z")).toBe("pregame");
	});
});

describe("roomsForPhase", () =>
{
	it("pre-game: Videos, Plays, Box only", () =>
	{
		expect(roomsForPhase("pregame")).toEqual(["videos", "plays", "box"]);
	});

	it("in progress: adds Live, no Recap", () =>
	{
		expect(roomsForPhase("live")).toEqual(["videos", "live", "plays", "box"]);
	});

	it("final: adds Recap, no Live", () =>
	{
		expect(roomsForPhase("final")).toEqual(["videos", "plays", "box", "recap"]);
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
