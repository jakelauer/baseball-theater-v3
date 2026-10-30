/** Home plate half-width in feet (17\" / 2). */
export const PLATE_HALF_WIDTH_FT = 17 / 2 / 12;

export type PlatePoint = {
	pX: number;
	pZ: number;
};

export type StrikeZoneBounds = {
	top: number;
	bottom: number;
};

/**
 * Map Statcast/Gameday plate feet (catcher POV) into a strike-zone box as percentages.
 * Values outside [0, 1] are valid (pitch outside the zone).
 */
export function plateToStrikeZonePct(
	point: PlatePoint,
	zone: StrikeZoneBounds,
	opts?: { padHorizontalFt?: number;
		padVerticalFt?: number },
): { left: number;
	bottom: number }
{
	const hPad = opts?.padHorizontalFt ?? 0;
	const vPad = opts?.padVerticalFt ?? 0;
	const halfW = PLATE_HALF_WIDTH_FT + hPad;
	const height = zone.top + vPad - (zone.bottom - vPad);
	if (height <= 0 || halfW <= 0)
	{
		throw new Error("Invalid strike zone dimensions");
	}
	return {
		left: (point.pX / halfW + 1) / 2,
		bottom: (point.pZ - (zone.bottom - vPad)) / height,
	};
}

/**
 * Constant-acceleration pitch position (feet, catcher POV).
 * y ≈ 50 at release; plate is y ≈ 0.
 */
export function pitchPositionAt(
	t: number,
	init: PitchKinematicsInit,
): { x: number;
	y: number;
	z: number }
{
	return {
		x: init.x0 + init.vx0 * t + 0.5 * init.ax * t * t,
		y: init.y0 + init.vy0 * t + 0.5 * init.ay * t * t,
		z: init.z0 + init.vz0 * t + 0.5 * init.az * t * t,
	};
}

export type PitchKinematicsInit = {
	x0: number;
	y0: number;
	z0: number;
	vx0: number;
	vy0: number;
	vz0: number;
	ax: number;
	ay: number;
	az: number;
};

export type TrajectoryPoint = {
	t: number;
	x: number;
	y: number;
	z: number;
};

/** Sample pitch path from release to plate (or plateTime if provided). */
export function samplePitchTrajectory(
	init: PitchKinematicsInit,
	opts?: { steps?: number;
		plateTime?: number | null;
		/** Where to start, in seconds from MLB's 50-ft point; negative is before it (the release). */
		startTime?: number },
): TrajectoryPoint[]
{
	const steps = opts?.steps ?? 48;
	const tEnd = opts?.plateTime ?? timeToPlate(init) ?? 0.45;
	const tStart = opts?.startTime ?? 0;
	const points: TrajectoryPoint[] = [];
	for (let i = 0; i <= steps; i++)
	{
		const t = tStart + ((tEnd - tStart) * i) / steps;
		points.push({
			t,
			...pitchPositionAt(t, init),
		});
	}
	return points;
}

const MPH_TO_FPS = 1.46667;
const GRAVITY_FPS2 = 32.174;

/**
 * Plausible batted-ball arc from launch data (feet, plate at y=0).
 * Horizontal distance uses totalDistance; height follows launch angle.
 */
export function sampleBattedBallTrajectory(
	hit: { launchSpeed: number;
		launchAngle: number;
		totalDistance: number },
	opts?: { steps?: number },
): TrajectoryPoint[]
{
	const steps = opts?.steps ?? 40;
	const angleRad = (hit.launchAngle * Math.PI) / 180;
	const v0 = hit.launchSpeed * MPH_TO_FPS;
	const vy0 = v0 * Math.cos(angleRad);
	const vz0 = v0 * Math.sin(angleRad);
	const tFlight = (2 * vz0) / GRAVITY_FPS2;
	const tEnd = tFlight > 0 ? tFlight : 0.5;
	const points: TrajectoryPoint[] = [];
	for (let i = 0; i <= steps; i++)
	{
		const t = (tEnd * i) / steps;
		const y = vy0 * t;
		const z = vz0 * t - 0.5 * GRAVITY_FPS2 * t * t;
		points.push({
			t,
			x: 0,
			y,
			z: Math.max(0, z),
		});
		if (y >= hit.totalDistance) break;
	}
	return points;
}

/** Shortest horizontal range a batted-ball chart shows, in feet: deep enough for a wall-scraping homer. */
export const BATTED_BALL_CHART_MIN_RANGE_FT = 420;

/**
 * Horizontal range (feet from the plate) a batted-ball side chart needs: at
 * least `BATTED_BALL_CHART_MIN_RANGE_FT`, widened for anything hit farther so
 * the landing point always fits. A missing distance gets the minimum.
 */
export function battedBallChartRangeFt(totalDistance: number | null | undefined): number
{
	return Math.max(BATTED_BALL_CHART_MIN_RANGE_FT, totalDistance ?? 0);
}

/** Earliest non-negative time when y(t) = yTarget (default front of plate). */
export function timeToPlate(
	init: Pick<PitchKinematicsInit, "y0" | "vy0" | "ay">,
	yTarget = 0,
): number | null
{
	const a = 0.5 * init.ay;
	const b = init.vy0;
	const c = init.y0 - yTarget;
	if (Math.abs(a) < 1e-12)
	{
		if (Math.abs(b) < 1e-12) return null;
		const t = -c / b;
		return t >= 0 ? t : null;
	}
	const disc = b * b - 4 * a * c;
	if (disc < 0) return null;
	const sqrt = Math.sqrt(disc);
	const t1 = (-b - sqrt) / (2 * a);
	const t2 = (-b + sqrt) / (2 * a);
	const candidates = [t1, t2].filter((t) => t >= 0);
	if (candidates.length === 0) return null;
	return Math.min(...candidates);
}

/** Front edge of home plate, in feet from its back point: where MLB measures `pX` / `pZ`. */
export const PLATE_FRONT_Y_FT = 17 / 12;

/** The rubber's front edge, in feet from the plate's back point: where MLB measures extension from. */
export const RUBBER_Y_FT = 60.5;

/**
 * When the ball left the hand, in seconds relative to MLB's 50-ft measuring point (so
 * ≤ 0): the moment the measured motion, run backward, reaches the release point MLB
 * records as `extension` feet in front of the rubber. Null without an extension, or if
 * the motion never gets there.
 */
export function releaseTime(init: Pick<PitchKinematicsInit, "y0" | "vy0" | "ay">, extension: number | null): number | null
{
	if (extension === null) return null;
	const a = 0.5 * init.ay;
	const b = init.vy0;
	const c = init.y0 - (RUBBER_Y_FT - extension);
	if (Math.abs(a) < 1e-12) return Math.abs(b) < 1e-12 || -c / b > 0 ? null : -c / b;
	const disc = b * b - 4 * a * c;
	if (disc < 0) return null;
	const sqrt = Math.sqrt(disc);
	const before = [(-b - sqrt) / (2 * a), (-b + sqrt) / (2 * a)].filter((t) => t <= 0);
	return before.length === 0 ? null : Math.max(...before);
}

/**
 * A pitch's flight from the hand to the plate's front edge, entirely from its own data
 * (owner, 2026-10-29: "The trajectory must be entirely sourced from the pitch data"):
 * MLB's measured motion run back to the recorded release point and forward to where
 * MLB measures `pX` / `pZ`. Starts at the 50-ft point when MLB sent no extension;
 * empty when the motion never reaches the plate.
 */
export function pitchFlight(data: { coordinates: PitchKinematicsInit;
	extension: number | null }, steps = 48): TrajectoryPoint[]
{
	const plateTime = timeToPlate(data.coordinates, PLATE_FRONT_Y_FT);
	if (plateTime === null) return [];
	return samplePitchTrajectory(data.coordinates, {
		steps,
		plateTime,
		startTime: releaseTime(data.coordinates, data.extension) ?? 0,
	});
}

/** Where sampled points put the ball at time `t`, between the two samples around it (clamped to the ends). */
function pointAtTime(points: readonly TrajectoryPoint[], t: number): TrajectoryPoint | null
{
	const first = points[0];
	if (!first) return null;
	if (t <= first.t) return first;
	for (let i = 1; i < points.length; i++)
	{
		const a = points[i - 1]!;
		const b = points[i]!;
		if (t <= b.t)
		{
			const f = (t - a.t) / (b.t - a.t);
			return {
				t,
				x: a.x + (b.x - a.x) * f,
				y: a.y + (b.y - a.y) * f,
				z: a.z + (b.z - a.z) * f,
			};
		}
	}
	return points.at(-1)!;
}

/**
 * Where the ball is `elapsedSec` seconds into a real-time replay (S64; owner,
 * 2026-10-29: "Does the timing/speed match the actual speed?"): along the pitch's
 * flight (`pitchFlight`) from the hand at the pitch's own pace, then — for a ball in
 * play — along the batted-ball arc from contact. `done` once both have run out, so the
 * replay takes exactly as long as the real pitch did.
 */
export function pitchPlayback(flight: readonly TrajectoryPoint[], hit: readonly TrajectoryPoint[], elapsedSec: number): {
	ball: TrajectoryPoint | null;
	hitBall: TrajectoryPoint | null;
	done: boolean;
}
{
	const start = flight[0];
	const end = flight.at(-1);
	if (!start || !end) return {
		ball: null,
		hitBall: null,
		done: true,
	};
	const t = start.t + elapsedSec;
	if (t <= end.t || hit.length === 0) return {
		ball: pointAtTime(flight, t),
		hitBall: null,
		done: t >= end.t,
	};
	const sinceContact = t - end.t;
	return {
		ball: null,
		hitBall: pointAtTime(hit, sinceContact),
		done: sinceContact >= hit.at(-1)!.t,
	};
}

/**
 * The part of a path already travelled when the ball is at `at` — every sample up to
 * its time, then the ball itself — so a replay draws the path in behind the ball
 * (owner, 2026-10-29: "all the animations should draw the path behind the ball").
 */
export function pathUpTo(points: readonly TrajectoryPoint[], at: TrajectoryPoint): TrajectoryPoint[]
{
	return [...points.filter((point) => point.t < at.t), at];
}

/** Longest gap between one pitch landing and the next, replaying a whole at-bat. */
export const AT_BAT_REPLAY_MAX_GAP_SEC = 0.5;
/** Longest a whole at-bat's replay runs, first throw to last landing. */
export const AT_BAT_REPLAY_MAX_SEC = 3;
/**
 * The gap is also at most this share of the shortest flight, so each pitch is thrown
 * before the one ahead of it lands ("should overlap a bit, starting each before the
 * end of the last").
 */
export const AT_BAT_REPLAY_OVERLAP = 0.75;

/**
 * When each pitch is thrown and lands in a replay of a whole at-bat (S64; owner,
 * 2026-10-29: "Each pitch should arrive within a half second of the last one
 * arriving, or all of them within 3 seconds, whichever is faster. For the latter,
 * evenly divide the timeline between all pitches"; "should overlap a bit, starting
 * each before the end of the last"). Pitches land an even gap apart — half a second,
 * less so the last lands by three seconds, and less again so each is thrown before
 * the one ahead lands (`AT_BAT_REPLAY_OVERLAP`) — and each is thrown its own flight
 * time before it lands. The first is thrown at once. `durations` are each pitch's real flight time (`pitchFlight`), in seconds.
 */
export function atBatReplaySchedule(durations: readonly number[]): { start: number;
	land: number }[]
{
	const first = durations[0];
	if (first === undefined) return [];
	const gap = durations.length === 1 ? 0 : Math.min(
		AT_BAT_REPLAY_MAX_GAP_SEC,
		(AT_BAT_REPLAY_MAX_SEC - first) / (durations.length - 1),
		AT_BAT_REPLAY_OVERLAP * Math.min(...durations),
	);
	return durations.map((duration, i) =>
	{
		// Never thrown before the replay starts: a slow pitch that couldn't land on time
		// lands a little late rather than being in the air before the first throw.
		const start = Math.max(0, first + i * gap - duration);
		return {
			start,
			land: start + duration,
		};
	});
}

/**
 * Where every pitch of an at-bat is `elapsedSec` into its replay (`atBatReplaySchedule`):
 * not thrown yet (`ball` null, not `landed`), in the air (`ball` set), or landed.
 * `done` once the last has landed. `flights` are each pitch's `pitchFlight`.
 */
export function atBatReplayAt(flights: readonly (readonly TrajectoryPoint[])[], elapsedSec: number): {
	pitches: { ball: TrajectoryPoint | null;
		landed: boolean }[];
	done: boolean;
}
{
	const schedule = atBatReplaySchedule(flights.map((flight) => (flight.length > 0 ? flight.at(-1)!.t - flight[0]!.t : 0)));
	const pitches = flights.map((flight, i) =>
	{
		const { start, land } = schedule[i]!;
		if (elapsedSec < start) return {
			ball: null,
			landed: false,
		};
		if (elapsedSec >= land) return {
			ball: null,
			landed: true,
		};
		return {
			ball: pitchPlayback(flight, [], elapsedSec - start).ball,
			landed: false,
		};
	});
	return {
		pitches,
		done: pitches.every((pitch) => pitch.landed),
	};
}
