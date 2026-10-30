import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
	describe, expect, it,
} from "vitest";
import {
	batterHeightFt,
	CATCHER_EYE,
	catcherViewBatter,
	catcherViewGround,
	catcherViewPath,
	catcherViewPoint,
	catcherViewZone,
	catcherViewZoneDimensions,
	feetToInches,
	fitArt,
	STANCE_SHARE_OF_HEIGHT,
	ZONE_BOTTOM_SHARE_OF_HEIGHT,
	ZONE_TOP_SHARE_OF_HEIGHT,
} from "./catcher-view.js";
import {
	PLATE_FRONT_Y_FT, PLATE_HALF_WIDTH_FT, pitchFlight,
} from "./coordinates.js";
import type { PitchData } from "./plays.js";

const camera = {
	centerX: 180,
	eyeY: 150,
	perFt: 36,
};
const zone = {
	top: 3.4,
	bottom: 1.6,
};

describe("catcher's view (S64): one camera, one scale", () =>
{
	it("at the plate's front edge, a foot is the same length across and up", () =>
	{
		const origin = catcherViewPoint({
			x: 0,
			y: PLATE_FRONT_Y_FT,
			z: CATCHER_EYE.heightFt,
		}, camera);
		expect(origin).toEqual({
			x: 180,
			y: 150,
		});
		const across = catcherViewPoint({
			x: 1,
			y: PLATE_FRONT_Y_FT,
			z: CATCHER_EYE.heightFt,
		}, camera);
		const up = catcherViewPoint({
			x: 0,
			y: PLATE_FRONT_Y_FT,
			z: CATCHER_EYE.heightFt + 1,
		}, camera);
		expect(across.x - origin.x).toBeCloseTo(36);
		expect(origin.y - up.y).toBeCloseTo(36);
	});

	it("farther from the plate, things shrink toward the eye; nearer, they grow", () =>
	{
		const at = (y: number) => catcherViewPoint({
			x: -2,
			y,
			z: 6,
		}, camera);
		expect(180 - at(54).x).toBeLessThan((180 - at(PLATE_FRONT_Y_FT).x) / 5);
		expect(180 - at(0).x).toBeGreaterThan(180 - at(PLATE_FRONT_Y_FT).x);
	});

	it("the zone is the plate's width and the batter's own zone height, on the same scale", () =>
	{
		const box = catcherViewZone(zone, camera);
		expect(box.right - box.left).toBeCloseTo(2 * PLATE_HALF_WIDTH_FT * 36);
		expect(box.bottom - box.top).toBeCloseTo(1.8 * 36);
		const taller = catcherViewZone({
			top: 3.7,
			bottom: 1.7,
		}, camera);
		expect(taller.bottom - taller.top).toBeCloseTo(2 * 36);
		expect(taller.right - taller.left).toBeCloseTo(box.right - box.left);
	});

	it("the plate's front edge is exactly as wide as the zone, on the ground below it; its point is nearer, so lower", () =>
	{
		const { plate, boxes } = catcherViewGround(camera);
		const box = catcherViewZone(zone, camera);
		expect(plate[0]!.x).toBeCloseTo(box.left);
		expect(plate[1]!.x).toBeCloseTo(box.right);
		expect(plate[0]!.y).toBeCloseTo(150 + CATCHER_EYE.heightFt * 36);
		expect(plate[3]!.y).toBeGreaterThan(plate[0]!.y);
		expect(boxes).toHaveLength(2);
		expect(boxes[0]![0]!.x).toBeLessThan(box.left);
		expect(boxes[1]![0]!.x).toBeGreaterThan(box.right);
	});

	it("on MLB's recorded pitches, each flight ends at MLB's own pX / pZ in the drawing", () =>
	{
		const plays: { pitches: { pitchData: PitchData | null }[] }[] = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../../../fixtures/plays-823823.json"), "utf8"));
		const recorded = plays.flatMap((play) => play.pitches).flatMap((pitch) => (pitch.pitchData ? [pitch.pitchData] : []));
		expect(recorded.length).toBeGreaterThan(100);
		for (const data of recorded)
		{
			const end = catcherViewPath(pitchFlight(data), camera).at(-1)!;
			const crossed = catcherViewPoint({
				x: data.coordinates.pX,
				y: PLATE_FRONT_Y_FT,
				z: data.coordinates.pZ,
			}, camera);
			// Within a drawing unit — under half an inch at this scale.
			expect(Math.abs(end.x - crossed.x)).toBeLessThan(1);
			expect(Math.abs(end.y - crossed.y)).toBeLessThan(1);
		}
	});
});

describe("batter size (S64)", () =>
{
	it("reads a batter's height back from MLB's zone: 53.5% and 27% of it", () =>
	{
		// Pete Crow-Armstrong, listed 6'0", in the 823823 recording.
		expect(batterHeightFt({
			top: 3.2,
			bottom: 1.62,
		})).toBeCloseTo(6, 1);
	});

	it("on MLB's recorded zones, top and bottom imply the same height to within an inch", () =>
	{
		const plays: { pitches: { pitchData: PitchData | null }[] }[] = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../../../fixtures/plays-823823.json"), "utf8"));
		for (const data of plays.flatMap((play) => play.pitches).flatMap((pitch) => (pitch.pitchData ? [pitch.pitchData] : [])))
		{
			const fromTop = data.strikeZoneTop / ZONE_TOP_SHARE_OF_HEIGHT;
			const fromBottom = data.strikeZoneBottom / ZONE_BOTTOM_SHARE_OF_HEIGHT;
			expect(Math.abs(fromTop - fromBottom) * 12).toBeLessThan(1);
		}
	});
});

describe("catcherViewBatter (S64)", () =>
{
	const art = {
		width: 288,
		height: 828,
		feetX: 71,
		groundY: 827,
		headY: 108,
	};
	const stance = (z: number) => catcherViewPoint({
		x: -(PLATE_HALF_WIDTH_FT + 2.5),
		y: PLATE_FRONT_Y_FT / 2,
		z,
	}, camera);

	it("a right-hander stands on the catcher's left, feet on the ground mid-box, helmet at their stance height", () =>
	{
		const placed = catcherViewBatter(zone, "R", camera, art);
		expect(placed.mirrored).toBe(false);
		const perUnit = placed.height / art.height;
		expect(placed.top + art.groundY * perUnit).toBeCloseTo(stance(0).y, 5);
		expect(placed.top + art.headY * perUnit).toBeCloseTo(stance(batterHeightFt(zone) * STANCE_SHARE_OF_HEIGHT).y, 5);
		expect(placed.left + art.feetX * perUnit).toBeCloseTo(stance(0).x, 5);
	});

	it("a left-hander is mirrored onto the catcher's right; a shorter batter (lower zone) is drawn shorter", () =>
	{
		const lefty = catcherViewBatter(zone, "L", camera, art);
		expect(lefty.mirrored).toBe(true);
		expect(lefty.left).toBeGreaterThan(180);
		const height = (z: typeof zone) => catcherViewBatter(z, "R", camera, art).height;
		expect(height({
			top: 3.1,
			bottom: 1.4,
		})).toBeLessThan(height(zone));
	});
});

describe("fitArt", () =>
{
	it("places an artwork so its inner region covers the target exactly", () =>
	{
		const placed = fitArt({
			left: 100,
			top: 50,
			right: 150,
			bottom: 110,
		}, {
			width: 200,
			height: 300,
			inner: {
				left: 50,
				top: 100,
				width: 100,
				height: 120,
			},
		});
		expect(placed).toEqual({
			left: 75,
			top: 0,
			right: 175,
			bottom: 150,
			width: 100,
			height: 150,
		});
	});
});

describe("catcherViewZoneDimensions (S64)", () =>
{
	it("lines out from the zone's top and bottom, labelled with their heights, joined by a vertical line broken around the total height", () =>
	{
		const box = catcherViewZone(zone, camera);
		const right = catcherViewZoneDimensions(zone, camera, true, 14, 60, 8);
		expect(right.top.line).toEqual([{
			x: box.right + 14,
			y: box.top,
		}, {
			x: box.right + 74,
			y: box.top,
		}]);
		expect(right.top.feet).toBe(3.4);
		expect(right.bottom.line[0]!.y).toBe(box.bottom);
		expect(right.bottom.feet).toBe(1.6);
		expect(right.top.label).toEqual({
			x: box.right + 44,
			y: box.top,
		});
		expect(right.height.feet).toBeCloseTo(1.8);
		const [upper, lower] = right.height.lines;
		expect(upper[0]).toEqual(right.top.line[1]);
		expect(lower[1]).toEqual(right.bottom.line[1]);
		// No line behind the text: a gap either side of the label.
		expect(upper[1].y).toBeCloseTo(right.height.label.y - 8);
		expect(lower[0].y).toBeCloseTo(right.height.label.y + 8);
		const left = catcherViewZoneDimensions(zone, camera, false, 14, 60, 8);
		expect(left.top.line[1].x).toBeCloseTo(box.left - 74);
	});
});

describe("feetToInches", () =>
{
	it("twelve inches a foot", () =>
	{
		expect(feetToInches(3.2)).toBeCloseTo(38.4);
		expect(feetToInches(0)).toBe(0);
	});
});
