import {
	describe, expect, it,
} from "vitest";
import type {
	GameStatus, Linescore, MlbTeam, ScheduleGame, ScheduleResponse,
} from "@bt/mlb-api";
import {
	mapLinescore, mapScheduleGame, mapScheduleResponse, mapStatus, mapTeam, toStatusCode,
} from "./schedule.js";

const FETCHED_AT = "2026-09-10T00:00:00.000Z";

function team(overrides: Partial<MlbTeam> = {}): MlbTeam
{
	return {
		id: 120,
		name: "Washington Nationals",
		...overrides,
	};
}

function status(overrides: Partial<GameStatus> = {}): GameStatus
{
	return {
		abstractGameState: "Final",
		detailedState: "Final",
		...overrides,
	};
}

function scheduleGame(overrides: Partial<ScheduleGame> = {}): ScheduleGame
{
	return {
		gamePk: 744834,
		gameDate: "2024-07-04T22:00:00.000Z",
		status: status(),
		teams: {
			home: {
				team: team({
					id: 120,
					name: "Washington Nationals",
				}),
			},
			away: {
				team: team({
					id: 121,
					name: "New York Mets",
				}),
			},
		},
		...overrides,
	};
}

describe("toStatusCode", () =>
{
	it("passes a coded state through and falls back to U when absent", () =>
	{
		expect(toStatusCode("F")).toBe("F");
		expect(toStatusCode(undefined)).toBe("U");
	});
});

describe("mapTeam", () =>
{
	it("uses the abbreviation and teamName when present", () =>
	{
		const mapped = mapTeam(team({
			abbreviation: "WSH",
			teamName: "Nationals",
		}));
		expect(mapped.abbreviation).toBe("WSH");
		expect(mapped.teamName).toBe("Nationals");
	});

	it("falls back through clubName then name when teamName/abbreviation are absent", () =>
	{
		expect(mapTeam(team({
			clubName: "Nats",
		})).teamName).toBe("Nats");
		expect(mapTeam(team()).teamName).toBe("Washington Nationals");
		expect(mapTeam(team()).abbreviation).toBe("");
	});
});

describe("mapStatus", () =>
{
	it("maps a fully-populated status", () =>
	{
		expect(mapStatus(status({
			codedGameState: "F",
		})).codedGameState).toBe("F");
	});

	it("falls back to U when codedGameState is absent", () =>
	{
		expect(mapStatus(status()).codedGameState).toBe("U");
	});
});

describe("mapLinescore", () =>
{
	it("returns null when there is no linescore", () =>
	{
		expect(mapLinescore(undefined)).toBeNull();
	});

	it("nulls every field a bare linescore omits", () =>
	{
		const bare: Linescore = {
			innings: [],
		};
		const mapped = mapLinescore(bare);
		expect(mapped).toEqual({
			currentInning: null,
			inningState: null,
			isTopInning: null,
			outs: null,
			balls: null,
			strikes: null,
			teams: {
				home: {
					runs: null,
					hits: null,
					errors: null,
				},
				away: {
					runs: null,
					hits: null,
					errors: null,
				},
			},
		});
	});

	it("carries real numbers through when the linescore is fully populated", () =>
	{
		const full: Linescore = {
			innings: [],
			currentInning: 9,
			inningState: "Bottom",
			isTopInning: false,
			outs: 3,
			balls: 0,
			strikes: 0,
			teams: {
				home: {
					runs: 5,
					hits: 6,
					errors: 0,
				},
				away: {
					runs: 6,
					hits: 13,
					errors: 0,
				},
			},
		};
		const mapped = mapLinescore(full);
		expect(mapped?.currentInning).toBe(9);
		expect(mapped?.teams.away.runs).toBe(6);
	});
});

describe("mapScheduleGame", () =>
{
	it("maps venue and prefers officialDate when both are present", () =>
	{
		const mapped = mapScheduleGame(scheduleGame({
			officialDate: "2024-07-04",
			venue: {
				id: 3309,
				name: "Nationals Park",
			},
		}));
		expect(mapped.officialDate).toBe("2024-07-04");
		expect(mapped.venue).toEqual({
			id: 3309,
			name: "Nationals Park",
		});
	});

	it("nulls the venue and derives the date from gameDate when officialDate is absent", () =>
	{
		const mapped = mapScheduleGame(scheduleGame({
			gameDate: "2024-07-04T22:00:00.000Z",
		}));
		expect(mapped.venue).toBeNull();
		expect(mapped.gameDate).toBe("2024-07-04");
		expect(mapped.officialDate).toBe("2024-07-04");
	});
});

describe("mapScheduleResponse", () =>
{
	const response: ScheduleResponse = {
		dates: [
			{
				date: "2024-07-03",
				games: [scheduleGame({
					gamePk: 1,
				})],
			},
			{
				date: "2024-07-04",
				games: [scheduleGame({
					gamePk: 2,
				})],
			},
		],
	};

	it("picks the date that matches the request", () =>
	{
		const day = mapScheduleResponse(response, "2024-07-04", FETCHED_AT);
		expect(day.date).toBe("2024-07-04");
		expect(day.games.map((g) => g.gamePk)).toEqual([2]);
	});

	it("falls back to the first date when the request doesn't match any entry", () =>
	{
		const day = mapScheduleResponse(response, "2099-01-01", FETCHED_AT);
		expect(day.date).toBe("2024-07-03");
	});

	it("falls back to the requested date and an empty game list when dates is empty", () =>
	{
		const day = mapScheduleResponse({
			dates: [],
		}, "2024-07-04", FETCHED_AT);
		expect(day.date).toBe("2024-07-04");
		expect(day.games).toEqual([]);
		expect(day.windowMode).toBe("cache");
	});

	it("stamps the given windowMode when provided", () =>
	{
		const day = mapScheduleResponse(response, "2024-07-04", FETCHED_AT, "active");
		expect(day.windowMode).toBe("active");
	});
});
