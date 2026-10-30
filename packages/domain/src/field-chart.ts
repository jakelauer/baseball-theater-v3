import type { StrikeZoneBounds } from "./coordinates.js";
import { PLATE_FRONT_Y_FT, PLATE_HALF_WIDTH_FT } from "./coordinates.js";

/**
 * To-scale charts of a pitch's flight from the side and from above (S64; owner,
 * 2026-10-29: "the side view shows the pitch rising and the top view shows side
 * movement that isn't to scale with the distance. It's hard to understand what I'm
 * looking at without knowing where the pitcher/batter/home plate/catcher are").
 *
 * Both charts run the same way: the pitcher on the left, the catcher on the right, one
 * scale for both axes, so a drop or a break looks as big as it really is next to the
 * 60 feet it happens over. Coordinates are MLB's (feet; `y` from the plate's back point
 * toward the mound, `x` positive to the catcher's right, `z` up). Drawing units grow
 * right and down.
 */

/** Mound and plate geometry from the Official Baseball Rules, in MLB's coordinates (feet). */
export const FIELD = {
	/** Front edge of the pitcher's rubber; the rubber is 6 inches deep and 2 feet wide. */
	rubberFrontY: 60.5,
	rubberBackY: 61,
	rubberHalfWidth: 1,
	/** The mound: an 18-foot circle centred 59 feet out, its top 10 inches above the plate. */
	moundCenterY: 59,
	moundRadius: 9,
	moundHeight: 10 / 12,
	/** Where the slope starts down toward the plate: 6 inches in front of the rubber. */
	moundSlopeY: 60,
	/** Batter's boxes: 4 × 6 feet, 6 inches off the plate, centred on the plate's middle. */
	boxInner: PLATE_HALF_WIDTH_FT + 0.5,
	boxOuter: PLATE_HALF_WIDTH_FT + 4.5,
	boxFrontY: PLATE_FRONT_Y_FT / 2 + 3,
	boxBackY: PLATE_FRONT_Y_FT / 2 - 3,
	/** Where the catcher crouches, behind the plate, and about how tall they are there. */
	catcherY: -3.2,
	catcherHeight: 2.5,
} as const;

/** The stretch of field a chart shows: just behind the rubber to just behind the catcher. */
const SPAN = {
	fromY: 62.5,
	toY: -6,
} as const;

/** Which way a chart looks at the field. */
export type FieldView = "side" | "top";

/**
 * A chart `width` drawing units wide showing `aboveFt` over its baseline — the ground
 * (side view) or the plate's centre line (top view) — and `belowFt` under it: one
 * scale (`perFt`) for both axes, and the `height` that takes.
 */
export type FieldChart = {
	view: FieldView;
	perFt: number;
	baseline: number;
	height: number;
};

/** The chart for `view`, `width` units wide, showing `aboveFt` over its baseline and `belowFt` under it. */
export function fieldChart(view: FieldView, width: number, aboveFt: number, belowFt: number): FieldChart
{
	const perFt = width / (SPAN.fromY - SPAN.toY);
	return {
		view,
		perFt,
		baseline: perFt * aboveFt,
		height: perFt * (aboveFt + belowFt),
	};
}

/**
 * A point in the air → the chart: across the chart by its distance from the plate, up
 * by its height (side) or by how far it is to the catcher's right (top; the catcher
 * faces the pitcher, so their right is up on a chart with the pitcher on the left).
 */
export function fieldChartPoint(point: { x: number;
	y: number;
	z: number }, chart: FieldChart): { x: number;
	y: number }
{
	const across = chart.view === "side" ? point.z : point.x;
	return {
		x: (SPAN.fromY - point.y) * chart.perFt,
		y: chart.baseline - across * chart.perFt,
	};
}

/** Points of a polygon or line on the ground (top view) or in the side view, given as (y, across) pairs. */
function shape(chart: FieldChart, corners: readonly (readonly [number, number])[]): { x: number;
	y: number }[]
{
	return corners.map(([y, across]) => fieldChartPoint({
		x: across,
		y,
		z: across,
	}, chart));
}

/** One labelled spot on a chart: where its words go. */
export type FieldLabel = {
	text: string;
	x: number;
	y: number;
};

/**
 * What a chart draws around the flight so it can be read: the mound, the rubber and the
 * plate, plus the batter's boxes (top) or the batter's strike zone at the plate (side),
 * and where the pitcher, batter and catcher are. `zone` is the batter's, from the
 * pitch's own data; `batSide` puts the batter's label in their box ("R" stands on the
 * catcher's left); `pitchHand` names the pitcher's throwing hand ("RHP" / "LHP", owner
 * 2026-10-29: "Pitcher handedness needs to be shown").
 */
export function fieldLandmarks(chart: FieldChart, zone: StrikeZoneBounds, batSide: string | null | undefined, pitchHand?: string | null): {
	ground: { x: number;
		y: number }[][];
	marks: { x: number;
		y: number }[][];
	zone: { x: number;
		y: number }[] | null;
	labels: FieldLabel[];
}
{
	const f = FIELD;
	const pitcher = pitchHand ? `Pitcher (${pitchHand}HP)` : "Pitcher";
	const plate = PLATE_HALF_WIDTH_FT;
	const label = (text: string, y: number, across: number): FieldLabel => ({
		text,
		...fieldChartPoint({
			x: across,
			y,
			z: across,
		}, chart),
	});
	if (chart.view === "side")
	{
		return {
			// The mound's profile, the ground either side of it.
			ground: [shape(chart, [
				[SPAN.fromY, f.moundHeight],
				[f.moundSlopeY, f.moundHeight],
				[f.moundCenterY - f.moundRadius, 0],
				[SPAN.toY, 0],
			])],
			marks: [
				shape(chart, [[f.rubberBackY, f.moundHeight], [f.rubberFrontY, f.moundHeight]]),
				shape(chart, [[PLATE_FRONT_Y_FT, 0], [0, 0]]),
			],
			zone: shape(chart, [[PLATE_FRONT_Y_FT, zone.bottom], [PLATE_FRONT_Y_FT, zone.top]]),
			labels: [
				label(pitcher, f.rubberFrontY - 4, f.moundHeight + 6.8),
				label("Plate", PLATE_FRONT_Y_FT / 2, -0.9),
				label("Catcher", f.catcherY, f.catcherHeight),
			],
		};
	}
	const batterAcross = batSide === "L" ? f.boxInner + 2 : -(f.boxInner + 2);
	const box = (sign: 1 | -1) => shape(chart, [
		[f.boxFrontY, sign * f.boxInner],
		[f.boxFrontY, sign * f.boxOuter],
		[f.boxBackY, sign * f.boxOuter],
		[f.boxBackY, sign * f.boxInner],
		[f.boxFrontY, sign * f.boxInner],
	]);
	const circle = Array.from({
		length: 33,
	}, (_, i) => [
		f.moundCenterY + f.moundRadius * Math.cos((i / 32) * 2 * Math.PI),
		f.moundRadius * Math.sin((i / 32) * 2 * Math.PI),
	] as const);
	return {
		ground: [shape(chart, circle)],
		marks: [
			shape(chart, [
				[f.rubberFrontY, -f.rubberHalfWidth],
				[f.rubberBackY, -f.rubberHalfWidth],
				[f.rubberBackY, f.rubberHalfWidth],
				[f.rubberFrontY, f.rubberHalfWidth],
				[f.rubberFrontY, -f.rubberHalfWidth],
			]),
			shape(chart, [
				[PLATE_FRONT_Y_FT, -plate],
				[PLATE_FRONT_Y_FT / 2, -plate],
				[0, 0],
				[PLATE_FRONT_Y_FT / 2, plate],
				[PLATE_FRONT_Y_FT, plate],
				[PLATE_FRONT_Y_FT, -plate],
			]),
			box(1),
			box(-1),
		],
		zone: null,
		labels: [
			label(pitcher, f.moundCenterY - 2, 4),
			label("Batter", PLATE_FRONT_Y_FT / 2, batterAcross),
			label("Catcher", f.catcherY, 0),
		],
	};
}

/** A point in the air, in MLB's coordinates (feet). */
type FieldPoint = { x: number;
	y: number;
	z: number };

/**
 * A stick-figure pitcher on the mound, throwing from the pitch's own release point, so
 * a view shows which arm the pitch came from (owner, 2026-10-29: "Pitcher handedness
 * needs to be shown … Visually"). The body is generic — feet on the mound, striding
 * toward the plate — and the throwing shoulder is on the release point's side; only
 * the hand is data. Each part is a line between two points, plus where the head goes.
 */
export function pitcherFigure(release: FieldPoint): {
	lines: [FieldPoint, FieldPoint][];
	head: FieldPoint;
}
{
	const f = FIELD;
	const armSide = release.x < 0 ? -1 : 1;
	const backFoot = {
		x: armSide * 0.4,
		y: f.rubberFrontY,
		z: f.moundHeight,
	};
	const plantFoot = {
		x: -armSide * 0.3,
		y: f.rubberFrontY - 5,
		z: f.moundHeight / 2,
	};
	const hip = {
		x: 0,
		y: f.rubberFrontY - 2.5,
		z: f.moundHeight + 3.2,
	};
	const neck = {
		x: 0,
		y: f.rubberFrontY - 3.2,
		z: f.moundHeight + 5,
	};
	const shoulder = {
		x: armSide * 0.7,
		y: neck.y,
		z: neck.z - 0.2,
	};
	return {
		lines: [[backFoot, hip], [plantFoot, hip], [hip, neck], [neck, shoulder], [shoulder, release]],
		head: {
			x: 0,
			y: neck.y,
			z: neck.z + 0.5,
		},
	};
}
