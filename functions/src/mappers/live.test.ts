import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { LiveGamePlay, LiveGamePlayEvent } from "@bt/mlb-api";
import { parseGameContentResponse, parseLiveFeedResponse } from "@bt/mlb-api";
import {
	describe, expect, it,
} from "vitest";
import { mapContentHighlights, mapRecapBlurb } from "./content.js";
import {
	mapAtBat, mapLiveFeed, mapPitchEvent,
} from "./live.js";

const rawDir = fileURLToPath(new URL("../../../fixtures/raw/", import.meta.url));

function readRaw(name: string): unknown
{
	return JSON.parse(readFileSync(rawDir + name, "utf8"));
}

const FETCHED_AT = "2026-09-06T00:00:00.000Z";

function snapshot()
{
	return mapLiveFeed(parseLiveFeedResponse(readRaw("live-823823.json")), FETCHED_AT);
}

describe("mapLiveFeed", () =>
{
	it("maps the recorded live feed onto a GameSnapshot", () =>
	{
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

	it("carries plays with Statcast pitch coordinates", () =>
	{
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

	it("maps at-bat metadata the UI binds to", () =>
	{
		const [play] = snapshot().plays;
		expect(play?.about.inning).toBe(1);
		expect(play?.about.halfInning).toBe("top");
		expect(play?.matchup.batter.fullName).toBeTruthy();
		expect(play?.result.event).toBeTruthy();
	});
});

describe("mapPitchEvent — sparse input", () =>
{
	it("defaults every optional field when the upstream event carries almost nothing", () =>
	{
		const bare: LiveGamePlayEvent = {
			index: 3,
			isPitch: true,
		};
		const mapped = mapPitchEvent(bare);

		expect(mapped.pitchNumber).toBe(3);
		expect(mapped.playId).toBe("");
		expect(mapped.startTime).toBe("");
		expect(mapped.details).toEqual({
			call: null,
			callDescription: null,
			type: null,
			typeDescription: null,
			isBall: false,
			isStrike: false,
			isInPlay: false,
			ballColor: null,
		});
		expect(mapped.count).toEqual({
			balls: 0,
			strikes: 0,
			outs: 0,
		});
		expect(mapped.pitchData).toBeNull();
		expect(mapped.hitData).toBeNull();
	});

	it("returns null pitchData when coordinates are present but incomplete", () =>
	{
		const mapped = mapPitchEvent({
			index: 0,
			isPitch: true,
			pitchData: {
				coordinates: {
					pX: 0.5,
				},
			},
		});
		expect(mapped.pitchData).toBeNull();
	});

	it("fills pitchData defaults and nulls breaks when only coordinates are given", () =>
	{
		const mapped = mapPitchEvent({
			index: 0,
			isPitch: true,
			pitchData: {
				coordinates: {
					pX: 0.1,
					pZ: 2.5,
				},
			},
		});
		expect(mapped.pitchData?.startSpeed).toBe(0);
		expect(mapped.pitchData?.breaks).toBeNull();
		expect(mapped.pitchData?.coordinates.vx0).toBe(0);
	});

	it("maps breaks and hitData when both are present", () =>
	{
		const mapped = mapPitchEvent({
			index: 0,
			isPitch: true,
			pitchData: {
				coordinates: {
					pX: 0,
					pZ: 0,
				},
				breaks: {
					breakAngle: 12,
					breakLength: 6,
					spinRate: 2200,
				},
			},
			hitData: {
				launchSpeed: 95,
				launchAngle: 20,
				totalDistance: 350,
				trajectory: "fly_ball",
				coordinates: {
					coordX: 1,
					coordY: 2,
				},
			},
		});
		expect(mapped.pitchData?.breaks).toEqual({
			breakAngle: 12,
			breakLength: 6,
			spinRate: 2200,
		});
		expect(mapped.hitData).toEqual({
			launchSpeed: 95,
			launchAngle: 20,
			totalDistance: 350,
			trajectory: "fly_ball",
			coordinates: {
				coordX: 1,
				coordY: 2,
			},
		});
	});
});

describe("mapAtBat — sparse input", () =>
{
	it("defaults matchup, count and result when the upstream play carries almost nothing", () =>
	{
		const bare: LiveGamePlay = {
			result: {},
			about: {
				atBatIndex: 2,
				halfInning: "top",
				isTopInning: true,
				inning: 4,
			},
			playEvents: [],
		};
		const mapped = mapAtBat(bare);

		expect(mapped.about).toEqual({
			atBatIndex: 2,
			halfInning: "top",
			inning: 4,
			isComplete: false,
			isScoringPlay: false,
		});
		expect(mapped.result).toEqual({
			event: "",
			description: "",
			eventType: "",
			isOut: false,
			rbi: 0,
		});
		expect(mapped.matchup).toEqual({
			batter: {
				id: 0,
				fullName: "",
			},
			pitcher: {
				id: 0,
				fullName: "",
			},
			batSide: null,
			pitchHand: null,
		});
		expect(mapped.count).toEqual({
			balls: 0,
			strikes: 0,
			outs: 0,
		});
		expect(mapped.pitches).toEqual([]);
	});

	it("maps bottom-half innings and filters non-pitch events", () =>
	{
		const events: LiveGamePlayEvent[] = [
			{
				index: 0,
				isPitch: false,
			},
			{
				index: 1,
				isPitch: true,
			},
		];
		const mapped = mapAtBat({
			result: {},
			about: {
				atBatIndex: 0,
				halfInning: "bottom",
				isTopInning: false,
				inning: 1,
			},
			playEvents: events,
		});
		expect(mapped.about.halfInning).toBe("bottom");
		expect(mapped.pitches).toHaveLength(1);
	});
});

describe("mapContentHighlights", () =>
{
	it("maps highlights from the content endpoint", () =>
	{
		const content = parseGameContentResponse(readRaw("content-823823.json"));
		const highlights = mapContentHighlights(content);

		expect(highlights).toHaveLength(40);
		const first = highlights[0];
		expect(first?.title).toBeTruthy();
		expect(first?.playbackUrl).toMatch(/^https?:\/\//);
		expect(mapRecapBlurb(content)).toBeTruthy();
	});
});
