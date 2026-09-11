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
		plateTime?: number | null },
): TrajectoryPoint[]
{
	const steps = opts?.steps ?? 48;
	const tEnd = opts?.plateTime ?? timeToPlate(init) ?? 0.45;
	const points: TrajectoryPoint[] = [];
	for (let i = 0; i <= steps; i++)
	{
		const t = (tEnd * i) / steps;
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
