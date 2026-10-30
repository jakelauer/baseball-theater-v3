import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
	describe, expect, it,
} from "vitest";
import {
	BATTED_BALL_CHART_MIN_RANGE_FT,
	battedBallChartRangeFt,
	PLATE_FRONT_Y_FT,
	pitchFlight,
	pitchPlayback,
	pathUpTo,
	atBatReplayAt,
	atBatReplaySchedule,
	AT_BAT_REPLAY_MAX_GAP_SEC,
	AT_BAT_REPLAY_MAX_SEC,
	AT_BAT_REPLAY_OVERLAP,
	releaseTime,
	RUBBER_Y_FT,
	PLATE_HALF_WIDTH_FT,
	plateToStrikeZonePct,
	pitchPositionAt,
	sampleBattedBallTrajectory,
	samplePitchTrajectory,
	timeToPlate,
} from "./coordinates.js";
import type { PitchData } from "./plays.js";

describe("plateToStrikeZonePct", () =>
{
	it("maps plate center and zone bottom to mid-left origin of box", () =>
	{
		const pct = plateToStrikeZonePct({
			pX: 0,
			pZ: 1.5,
		}, {
			top: 3.5,
			bottom: 1.5,
		});
		expect(pct.left).toBeCloseTo(0.5);
		expect(pct.bottom).toBeCloseTo(0);
	});

	it("maps plate edges near 0 and 1 horizontally", () =>
	{
		const left = plateToStrikeZonePct(
			{
				pX: -PLATE_HALF_WIDTH_FT,
				pZ: 2.5,
			},
			{
				top: 3.5,
				bottom: 1.5,
			},
		);
		const right = plateToStrikeZonePct(
			{
				pX: PLATE_HALF_WIDTH_FT,
				pZ: 2.5,
			},
			{
				top: 3.5,
				bottom: 1.5,
			},
		);
		expect(left.left).toBeCloseTo(0);
		expect(right.left).toBeCloseTo(1);
	});

	it("allows values outside the zone box", () =>
	{
		const pct = plateToStrikeZonePct({
			pX: 0.38,
			pZ: 3.87,
		}, {
			top: 3.47,
			bottom: 1.65,
		});
		expect(pct.bottom).toBeGreaterThan(1);
	});
});

describe("pitch kinematics", () =>
{
	it("computes time to plate and position", () =>
	{
		const init = {
			x0: -1.5,
			y0: 50,
			z0: 6,
			vx0: 2,
			vy0: -130,
			vz0: -4,
			ax: -5,
			ay: 30,
			az: -15,
		};
		const t = timeToPlate(init);
		expect(t).not.toBeNull();
		expect(t!).toBeGreaterThan(0);
		expect(t!).toBeLessThan(1);
		const atPlate = pitchPositionAt(t!, init);
		expect(atPlate.y).toBeCloseTo(0, 0);
	});

	it("samples pitch trajectory to plate", () =>
	{
		const init = {
			x0: -2.2,
			y0: 50,
			z0: 5.6,
			vx0: 6.8,
			vy0: -138.4,
			vz0: -4.3,
			ax: -14.2,
			ay: 28.3,
			az: -16.2,
		};
		const path = samplePitchTrajectory(init);
		expect(path.length).toBeGreaterThan(10);
		expect(path[0]!.y).toBeCloseTo(50, 0);
		expect(path[path.length - 1]!.y).toBeLessThan(path[0]!.y);
	});

	it("samples batted ball arc", () =>
	{
		const path = sampleBattedBallTrajectory({
			launchSpeed: 105,
			launchAngle: 28,
			totalDistance: 410,
		});
		expect(path.length).toBeGreaterThan(5);
		expect(path[0]!.z).toBeCloseTo(0, 0);
		expect(path.some((p) => p.z > 20)).toBe(true);
	});
});

describe("battedBallChartRangeFt", () =>
{
	it("shows at least the minimum range, wider for a longer hit", () =>
	{
		expect(battedBallChartRangeFt(250)).toBe(BATTED_BALL_CHART_MIN_RANGE_FT);
		expect(battedBallChartRangeFt(455)).toBe(455);
	});

	it("gives a missing distance the minimum range", () =>
	{
		expect(battedBallChartRangeFt(null)).toBe(BATTED_BALL_CHART_MIN_RANGE_FT);
		expect(battedBallChartRangeFt(undefined)).toBe(420);
	});
});

describe("pitchFlight (S64)", () =>
{
	const init = {
		x0: -2.2,
		y0: 50,
		z0: 5.6,
		vx0: 6.8,
		vy0: -138.4,
		vz0: -4.3,
		ax: -14.2,
		ay: 28.3,
		az: -16.2,
	};

	it("a flight runs from the hand — extension feet in front of the rubber — to the plate's front edge", () =>
	{
		const flight = pitchFlight({
			coordinates: init,
			extension: 6.5,
		});
		expect(flight).toHaveLength(49);
		expect(flight[0]!.y).toBeCloseTo(RUBBER_Y_FT - 6.5);
		expect(flight[0]!.t).toBeLessThan(0);
		expect(flight.at(-1)!.y).toBeCloseTo(PLATE_FRONT_Y_FT);
	});

	it("without an extension the flight starts at MLB's 50-ft point; motion that never reaches the plate draws nothing", () =>
	{
		expect(pitchFlight({
			coordinates: init,
			extension: null,
		})[0]!.y).toBeCloseTo(50);
		expect(pitchFlight({
			coordinates: {
				...init,
				vy0: 0,
				ay: 0,
			},
			extension: 6,
		})).toEqual([]);
	});

	it("releaseTime: the moment before the 50-ft point the ball was at the release point, or null", () =>
	{
		expect(releaseTime(init, null)).toBeNull();
		expect(releaseTime({
			y0: 50,
			vy0: -100,
			ay: 0,
		}, 0.5)).toBeCloseTo(-0.1);
		// Constant speed away from the plate never passed the release point before.
		expect(releaseTime({
			y0: 50,
			vy0: 100,
			ay: 0,
		}, 0.5)).toBeNull();
		expect(releaseTime({
			y0: 50,
			vy0: 0,
			ay: 0,
		}, 0.5)).toBeNull();
		// Motion that turned back before ever reaching the release point.
		expect(releaseTime({
			y0: 50,
			vy0: -1,
			ay: -1000,
		}, 0.5)).toBeNull();
	});

	it("on MLB's recorded pitches, every flight starts at the recorded release and ends where MLB says the pitch crossed the plate", () =>
	{
		const plays: { pitches: { pitchData: PitchData | null }[] }[] = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../../../fixtures/plays-823823.json"), "utf8"));
		const recorded = plays.flatMap((play) => play.pitches).flatMap((pitch) => (pitch.pitchData ? [pitch.pitchData] : []));
		expect(recorded.length).toBeGreaterThan(100);
		for (const data of recorded)
		{
			const flight = pitchFlight(data);
			if (data.extension !== null) expect(flight[0]!.y).toBeCloseTo(RUBBER_Y_FT - data.extension, 3);
			const end = flight.at(-1)!;
			expect(end.y).toBeCloseTo(PLATE_FRONT_Y_FT, 3);
			// Within half an inch of MLB's own pX / pZ.
			expect(Math.abs(end.x - data.coordinates.pX)).toBeLessThan(0.04);
			expect(Math.abs(end.z - data.coordinates.pZ)).toBeLessThan(0.04);
		}
	});
});

describe("pitchPlayback (S64)", () =>
{
	const flight = pitchFlight({
		coordinates: {
			x0: -2.2,
			y0: 50,
			z0: 5.6,
			vx0: 6.8,
			vy0: -138.4,
			vz0: -4.3,
			ax: -14.2,
			ay: 28.3,
			az: -16.2,
		},
		extension: 6.5,
	});
	const duration = flight.at(-1)!.t - flight[0]!.t;
	const hit = sampleBattedBallTrajectory({
		launchSpeed: 100,
		launchAngle: 25,
		totalDistance: 380,
	});

	it("runs at the pitch's real pace: from the hand, between samples, to the plate at its real flight time", () =>
	{
		// About 94 mph over ~54 feet: just under four tenths of a second.
		expect(duration).toBeGreaterThan(0.35);
		expect(duration).toBeLessThan(0.5);
		expect(pitchPlayback(flight, [], 0).ball).toEqual(flight[0]);
		const mid = pitchPlayback(flight, [], duration / 2);
		expect(mid.done).toBe(false);
		expect(mid.ball!.y).toBeLessThan(flight[0]!.y);
		expect(mid.ball!.y).toBeGreaterThan(flight.at(-1)!.y);
		const after = pitchPlayback(flight, [], duration + 0.1);
		expect(after.done).toBe(true);
		expect(after.ball).toEqual(flight.at(-1));
	});

	it("a ball in play carries on along the batted-ball arc from contact, then is done", () =>
	{
		const flying = pitchPlayback(flight, hit, duration + 0.5);
		expect(flying.ball).toBeNull();
		expect(flying.hitBall!.t).toBeCloseTo(0.5);
		expect(flying.done).toBe(false);
		expect(pitchPlayback(flight, hit, duration + hit.at(-1)!.t + 1)).toMatchObject({
			hitBall: hit.at(-1),
			done: true,
		});
	});

	it("no flight, nothing to play", () =>
	{
		expect(pitchPlayback([], hit, 0)).toEqual({
			ball: null,
			hitBall: null,
			done: true,
		});
	});

	it("on MLB's recorded pitches, each replay lasts that pitch's own flight: distance over its average speed", () =>
	{
		const plays: { pitches: { pitchData: PitchData | null }[] }[] = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../../../fixtures/plays-823823.json"), "utf8"));
		const recorded = plays.flatMap((play) => play.pitches).flatMap((pitch) => (pitch.pitchData?.extension ? [pitch.pitchData] : []));
		const durations = recorded.map((data) =>
		{
			const flight = pitchFlight(data);
			const duration = flight.at(-1)!.t - flight[0]!.t;
			const feet = flight[0]!.y - flight.at(-1)!.y;
			const averageFps = ((data.startSpeed + data.endSpeed) / 2) * 5280 / 3600;
			expect(duration).toBeCloseTo(feet / averageFps, 1);
			expect(pitchPlayback(flight, [], duration).done).toBe(true);
			expect(pitchPlayback(flight, [], duration - 0.01).done).toBe(false);
			return duration;
		});
		// Faster pitches, shorter replays: the spread is real, not one fixed length.
		expect(Math.max(...durations) - Math.min(...durations)).toBeGreaterThan(0.05);
	});

	it("pathUpTo: the samples already passed, then the ball, so the path draws in behind it", () =>
	{
		const mid = pitchPlayback(flight, [], duration / 2).ball!;
		const drawn = pathUpTo(flight, mid);
		expect(drawn.at(-1)).toBe(mid);
		expect(drawn.slice(0, -1).every((point) => point.t < mid.t)).toBe(true);
		expect(drawn.length).toBeGreaterThan(2);
		expect(drawn.length).toBeLessThan(flight.length);
		expect(pathUpTo(flight, flight[0]!)).toEqual([flight[0]]);
	});
});

describe("replaying a whole at-bat (S64)", () =>
{
	it("lands pitches an even gap apart, each thrown its own flight time earlier and before the one ahead lands", () =>
	{
		const durations = [0.4, 0.45, 0.38];
		const schedule = atBatReplaySchedule(durations);
		expect(schedule[0]).toEqual({
			start: 0,
			land: 0.4,
		});
		// Half a second would leave no overlap with ~0.4 s flights, so the gap is 3/4 of the shortest.
		const gap = AT_BAT_REPLAY_OVERLAP * 0.38;
		schedule.forEach((s, i) =>
		{
			expect(s.land).toBeCloseTo(0.4 + i * gap);
			expect(s.land - s.start).toBeCloseTo(durations[i]!);
			if (i > 0) expect(s.start).toBeLessThan(schedule[i - 1]!.land);
		});
	});

	it("slow flights land half a second apart at most", () =>
	{
		const schedule = atBatReplaySchedule([1, 1, 1]);
		expect(schedule[1]!.land - schedule[0]!.land).toBeCloseTo(AT_BAT_REPLAY_MAX_GAP_SEC);
	});

	it("with many pitches, evenly divides three seconds so the last lands by then", () =>
	{
		const durations = Array.from({
			length: 10,
		}, () => 0.4);
		const schedule = atBatReplaySchedule(durations);
		expect(schedule.at(-1)!.land).toBeCloseTo(AT_BAT_REPLAY_MAX_SEC);
		const gaps = schedule.slice(1).map((s, i) => s.land - schedule[i]!.land);
		for (const gap of gaps) expect(gap).toBeCloseTo((AT_BAT_REPLAY_MAX_SEC - 0.4) / 9);
		expect(gaps[0]).toBeLessThan(AT_BAT_REPLAY_MAX_GAP_SEC);
	});

	it("one pitch lands after its flight; none, nothing; a slow pitch is never thrown before the start", () =>
	{
		expect(atBatReplaySchedule([0.42])).toEqual([{
			start: 0,
			land: 0.42,
		}]);
		expect(atBatReplaySchedule([])).toEqual([]);
		expect(atBatReplaySchedule([0.35, 2])[1]!.start).toBe(0);
	});

	it("atBatReplayAt: each pitch waits, flies with its ball, then lands; done when all have", () =>
	{
		const init = {
			x0: -2.2,
			y0: 50,
			z0: 5.6,
			vx0: 6.8,
			vy0: -138.4,
			vz0: -4.3,
			ax: -14.2,
			ay: 28.3,
			az: -16.2,
		};
		const flight = pitchFlight({
			coordinates: init,
			extension: 6.5,
		});
		const flights = [flight, flight, flight];
		const schedule = atBatReplaySchedule(flights.map((f) => f.at(-1)!.t - f[0]!.t));
		const at = (s: number) => atBatReplayAt(flights, s);
		expect(at(0.1).pitches.map((p) => [p.ball !== null, p.landed])).toEqual([[true, false], [false, false], [false, false]]);
		const third = at(schedule[2]!.start + 0.05);
		expect(third.pitches.map((p) => [p.ball !== null, p.landed])).toEqual([[false, true], [true, false], [true, false]]);
		expect(third.done).toBe(false);
		expect(at(schedule[2]!.land).done).toBe(true);
		expect(atBatReplayAt([[], flight], 0).pitches[0]).toEqual({
			ball: null,
			landed: true,
		});
	});
});

