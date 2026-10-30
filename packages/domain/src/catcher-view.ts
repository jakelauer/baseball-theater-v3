import type { StrikeZoneBounds } from "./coordinates.js";
import { PLATE_FRONT_Y_FT, PLATE_HALF_WIDTH_FT } from "./coordinates.js";
import { FIELD } from "./field-chart.js";

/**
 * The catcher's view (S64): one perspective camera behind the plate that places
 * everything in the Live zone — every pitch's flight, the batter's strike zone, the
 * plate, the batter's boxes and the batter — from real positions in feet, at one scale
 * (owner, 2026-10-29: "the strike zone and home plate need to be shown to scale with
 * the pitch trajectories … They need to be deterministically tied together so they
 * always work at every size"). Coordinates are MLB's: feet, `y` from the plate's back
 * point toward the mound, `x` to the catcher's right, `z` up. Drawing units grow right
 * and down; a drawing scales as a whole, so the relations hold at every size.
 */

/**
 * Where the camera's eye is: on the plate's centre line, this far behind the plate's
 * front edge and this high. Chosen so a release point lands near the top of the zone,
 * as the game-rooms Live frames draw it, and flights visibly curve in.
 */
export const CATCHER_EYE = {
	behindFt: 7,
	heightFt: 3,
} as const;

/**
 * A catcher's-view camera in a drawing: the x of the plate's centre line, the y of the
 * eye's height, and drawing units per foot at the plate's front edge — one scale both
 * ways. Nearer things are bigger and farther things smaller, from that depth.
 */
export type CatcherCamera = {
	centerX: number;
	eyeY: number;
	perFt: number;
};

/** A point in MLB's coordinates (feet). */
type FieldPoint = {
	x: number;
	y: number;
	z: number;
};

/** A point in a drawing. */
type DrawnPoint = {
	x: number;
	y: number;
};

/** How much bigger than at the plate's front edge something at depth `y` looks. Assumes it's in front of the eye. */
function depthScale(y: number): number
{
	return CATCHER_EYE.behindFt / (CATCHER_EYE.behindFt + y - PLATE_FRONT_Y_FT);
}

/** A point in the air (feet) → the drawing, through the camera. */
export function catcherViewPoint(point: FieldPoint, camera: CatcherCamera): DrawnPoint
{
	const scale = camera.perFt * depthScale(point.y);
	return {
		x: camera.centerX + point.x * scale,
		y: camera.eyeY - (point.z - CATCHER_EYE.heightFt) * scale,
	};
}

/** A pitch's flight (`pitchFlight`) as points in the drawing: the curve the zone draws. */
export function catcherViewPath(flight: readonly FieldPoint[], camera: CatcherCamera): DrawnPoint[]
{
	return flight.map((point) => catcherViewPoint(point, camera));
}

/** A box in a drawing, with its size so a view can place it without arithmetic of its own. */
export type DrawnBox = {
	left: number;
	top: number;
	right: number;
	bottom: number;
	width: number;
	height: number;
};

/** The box from `left`, `top` to `right`, `bottom`. */
function drawnBox(left: number, top: number, right: number, bottom: number): DrawnBox
{
	return {
		left,
		top,
		right,
		bottom,
		width: right - left,
		height: bottom - top,
	};
}

/**
 * The batter's strike zone in the drawing: as wide as the plate and from the batter's
 * own zone bottom to top (MLB's `strikeZoneBottom` / `strikeZoneTop`), at the plate's
 * front edge — where MLB measures a pitch's `pX` / `pZ`, so a pitch's dot is inside
 * this box exactly when MLB's numbers put it inside the zone.
 */
export function catcherViewZone(zone: StrikeZoneBounds, camera: CatcherCamera): DrawnBox
{
	const topLeft = catcherViewPoint({
		x: -PLATE_HALF_WIDTH_FT,
		y: PLATE_FRONT_Y_FT,
		z: zone.top,
	}, camera);
	const bottomRight = catcherViewPoint({
		x: PLATE_HALF_WIDTH_FT,
		y: PLATE_FRONT_Y_FT,
		z: zone.bottom,
	}, camera);
	return drawnBox(topLeft.x, topLeft.y, bottomRight.x, bottomRight.y);
}

/** The plate (a filled pentagon) and the two batter's boxes (outlines), on the ground, from the rulebook's dimensions (`FIELD`). */
export function catcherViewGround(camera: CatcherCamera): {
	plate: DrawnPoint[];
	boxes: DrawnPoint[][];
}
{
	const ground = (corners: readonly (readonly [number, number])[]) => corners.map(([x, y]) => catcherViewPoint({
		x,
		y,
		z: 0,
	}, camera));
	const box = (sign: 1 | -1) => ground([
		[sign * FIELD.boxInner, FIELD.boxFrontY],
		[sign * FIELD.boxOuter, FIELD.boxFrontY],
		[sign * FIELD.boxOuter, FIELD.boxBackY],
		[sign * FIELD.boxInner, FIELD.boxBackY],
	]);
	return {
		plate: ground([
			[-PLATE_HALF_WIDTH_FT, PLATE_FRONT_Y_FT],
			[PLATE_HALF_WIDTH_FT, PLATE_FRONT_Y_FT],
			[PLATE_HALF_WIDTH_FT, PLATE_FRONT_Y_FT / 2],
			[0, 0],
			[-PLATE_HALF_WIDTH_FT, PLATE_FRONT_Y_FT / 2],
		]),
		boxes: [box(-1), box(1)],
	};
}

/**
 * MLB's per-batter zone is a share of the batter's height — the automated strike
 * zone's rule: top at 53.5%, bottom at 27%. The recorded zones match it (e.g. Pete
 * Crow-Armstrong, listed 6'0": top 3.20 ft = 53.5% of 5.98 ft, bottom 1.62 ft = 27% of
 * 6.0 ft), so a batter's height can be read back from their zone.
 */
export const ZONE_TOP_SHARE_OF_HEIGHT = 0.535;
export const ZONE_BOTTOM_SHARE_OF_HEIGHT = 0.27;

/** A batter's standing height in feet, read back from their zone: the average of what its top and bottom each imply. */
export function batterHeightFt(zone: StrikeZoneBounds): number
{
	return (zone.top / ZONE_TOP_SHARE_OF_HEIGHT + zone.bottom / ZONE_BOTTOM_SHARE_OF_HEIGHT) / 2;
}

/**
 * How tall a batter stands in their stance, as a share of their standing height: knees
 * bent, hips back. The batter artwork was drawn to it (its helmet at 88%, the top of
 * its pants at 53% — right where MLB's zone top is).
 */
export const STANCE_SHARE_OF_HEIGHT = 0.88;

/**
 * Batter artwork's own measurements, in its units, drawn facing the plate from the
 * catcher's left (a right-handed batter): its size, the middle of its feet (`feetX`),
 * the ground under them (`groundY`, between the near and far shoe, where the stance's
 * middle meets the ground) and the helmet's top (`headY`).
 */
export type BatterArt = {
	width: number;
	height: number;
	feetX: number;
	groundY: number;
	headY: number;
};

/**
 * Where the batter artwork goes in the drawing, at this batter's real size (owner,
 * 2026-10-29: "I think the batter looked right relative to the batters box before";
 * "the batter could scale according to the batter height"). Their height comes from
 * their own zone (`batterHeightFt`); the art stands from the ground to
 * `STANCE_SHARE_OF_HEIGHT` of it, feet in the middle of their box, so the zone lands on
 * the body where MLB puts it — just under the knee to about the belt. A right-handed
 * batter stands on the catcher's left, a left-handed one on the right, the art
 * mirrored (`mirrored`).
 */
export function catcherViewBatter(zone: StrikeZoneBounds, batSide: string | null | undefined, camera: CatcherCamera, art: BatterArt): DrawnBox & { mirrored: boolean }
{
	const mirrored = batSide === "L";
	const side = mirrored ? 1 : -1;
	const stance = {
		x: side * (FIELD.boxInner + FIELD.boxOuter) / 2,
		y: PLATE_FRONT_Y_FT / 2,
	};
	const feet = catcherViewPoint({
		...stance,
		z: 0,
	}, camera);
	const head = catcherViewPoint({
		...stance,
		z: batterHeightFt(zone) * STANCE_SHARE_OF_HEIGHT,
	}, camera);
	const perUnit = (feet.y - head.y) / (art.groundY - art.headY);
	const feetX = mirrored ? art.width - art.feetX : art.feetX;
	const left = feet.x - feetX * perUnit;
	const top = feet.y - art.groundY * perUnit;
	return {
		...drawnBox(left, top, left + art.width * perUnit, top + art.height * perUnit),
		mirrored,
	};
}

/**
 * Where an artwork goes so that a region inside it (`inner`, in its own units) covers
 * `target` in the drawing — e.g. the strike-zone graphic's 3 × 3 grid over the
 * batter's zone. Stretches each way independently: the grid takes the zone's shape.
 */
export function fitArt(target: Pick<DrawnBox, "left" | "top" | "right" | "bottom">, art: { width: number;
	height: number;
	inner: { left: number;
		top: number;
		width: number;
		height: number }; }): DrawnBox
{
	const sx = (target.right - target.left) / art.inner.width;
	const sy = (target.bottom - target.top) / art.inner.height;
	const left = target.left - art.inner.left * sx;
	const top = target.top - art.inner.top * sy;
	return drawnBox(left, top, left + art.width * sx, top + art.height * sy);
}

/** A line in a drawing. */
type DrawnLine = [DrawnPoint, DrawnPoint];

/**
 * A dimension drawing of the batter's zone, out to the side away from the batter so
 * no pitch sits on it (owner, 2026-10-29: "very subtle lines extending out from the top
 * and bottom horizontally with the top and bottom positions on them, then a vertical
 * line connecting them with the total height in the center (but no line behind the
 * text) in the other batters box"). The horizontal lines start `clear` units off the
 * zone's edge and run `reach` units; their labels sit on them halfway along. The
 * vertical line joins their outer ends, broken `gap` units either side of the middle
 * where the total height goes. `towardRight` is which way they run.
 */
export function catcherViewZoneDimensions(zone: StrikeZoneBounds, camera: CatcherCamera, towardRight: boolean, clear: number, reach: number, gap: number): {
	top: { line: DrawnLine;
		label: DrawnPoint;
		feet: number };
	bottom: { line: DrawnLine;
		label: DrawnPoint;
		feet: number };
	height: { lines: [DrawnLine, DrawnLine];
		label: DrawnPoint;
		feet: number };
}
{
	const box = catcherViewZone(zone, camera);
	const sign = towardRight ? 1 : -1;
	const edge = towardRight ? box.right : box.left;
	const start = edge + sign * clear;
	const end = edge + sign * (clear + reach);
	const middle = (box.top + box.bottom) / 2;
	const across = (y: number, feet: number) => ({
		line: [{
			x: start,
			y,
		}, {
			x: end,
			y,
		}] as DrawnLine,
		label: {
			x: (start + end) / 2,
			y,
		},
		feet,
	});
	return {
		top: across(box.top, zone.top),
		bottom: across(box.bottom, zone.bottom),
		height: {
			lines: [[{
				x: end,
				y: box.top,
			}, {
				x: end,
				y: middle - gap,
			}], [{
				x: end,
				y: middle + gap,
			}, {
				x: end,
				y: box.bottom,
			}]],
			label: {
				x: end,
				y: middle,
			},
			feet: zone.top - zone.bottom,
		},
	};
}

/** A length in feet, in inches — how the zone's dimensions are shown (owner, 2026-10-29: "make it pure inches"). */
export function feetToInches(feet: number): number
{
	return feet * 12;
}
