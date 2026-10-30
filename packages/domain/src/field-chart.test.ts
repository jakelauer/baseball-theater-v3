import {
	describe, expect, it,
} from "vitest";
import { PLATE_FRONT_Y_FT } from "./coordinates.js";
import {
	FIELD, fieldChart, fieldChartPoint, fieldLandmarks, pitcherFigure,
} from "./field-chart.js";

describe("fieldChart (S64)", () =>
{
	const side = fieldChart("side", 685, 8, 1.5);
	const top = fieldChart("top", 685, 7, 7);
	const zone = {
		top: 3.4,
		bottom: 1.6,
	};

	it("one scale for both axes: 68.5 feet across 685 units is 10 units a foot, up as well as across", () =>
	{
		expect(side.perFt).toBe(10);
		expect(side.baseline).toBe(80);
		expect(side.height).toBe(95);
		expect(top.height).toBe(140);
		const release = fieldChartPoint({
			x: -2,
			y: 50,
			z: 6,
		}, side);
		const plate = fieldChartPoint({
			x: -2,
			y: 0,
			z: 0,
		}, side);
		expect(plate.x - release.x).toBe(500);
		expect(plate.y - release.y).toBe(60);
	});

	it("the pitcher is on the left and the catcher on the right; a falling pitch goes down the side view", () =>
	{
		const release = fieldChartPoint({
			x: 0,
			y: 54,
			z: 6,
		}, side);
		const atPlate = fieldChartPoint({
			x: 0,
			y: PLATE_FRONT_Y_FT,
			z: 2,
		}, side);
		expect(release.x).toBeLessThan(atPlate.x);
		expect(release.y).toBeLessThan(atPlate.y);
	});

	it("from above, the catcher's right (x > 0) is up the chart", () =>
	{
		expect(fieldChartPoint({
			x: 1,
			y: 30,
			z: 9,
		}, top).y).toBe(60);
	});

	it("side landmarks: the mound, rubber, plate, the batter's zone at the plate, and who stands where", () =>
	{
		const marks = fieldLandmarks(side, zone, "R");
		expect(marks.labels.map((l) => l.text)).toEqual(["Pitcher", "Plate", "Catcher"]);
		expect(marks.zone).toEqual([
			fieldChartPoint({
				x: 0,
				y: PLATE_FRONT_Y_FT,
				z: 1.6,
			}, side),
			fieldChartPoint({
				x: 0,
				y: PLATE_FRONT_Y_FT,
				z: 3.4,
			}, side),
		]);
		// The mound's top sits 10 inches up, at the rubber.
		expect(marks.ground[0]![1]!.y).toBeCloseTo(80 - FIELD.moundHeight * 10);
	});

	it("top landmarks: the batter is labelled in their own box", () =>
	{
		const right = fieldLandmarks(top, zone, "R", "L");
		expect(right.labels[0]!.text).toBe("Pitcher (LHP)");
		const left = fieldLandmarks(top, zone, "L");
		const batter = (l: typeof right) => l.labels.find((x) => x.text === "Batter")!;
		expect(batter(right).y).toBeGreaterThan(top.baseline);
		expect(batter(left).y).toBeLessThan(top.baseline);
		expect(right.zone).toBeNull();
		expect(right.marks).toHaveLength(4);
		expect(right.ground[0]).toHaveLength(33);
	});
});

describe("pitcherFigure (S64)", () =>
{
	it("the throwing arm ends at the release point, on its side of the body", () =>
	{
		const righty = pitcherFigure({
			x: -2,
			y: 54,
			z: 5.8,
		});
		const arm = righty.lines.at(-1)!;
		expect(arm[1]).toEqual({
			x: -2,
			y: 54,
			z: 5.8,
		});
		expect(arm[0].x).toBeLessThan(0);
		const lefty = pitcherFigure({
			x: 2.1,
			y: 54,
			z: 5.8,
		});
		expect(lefty.lines.at(-1)![0].x).toBeGreaterThan(0);
		expect(lefty.head.z).toBeGreaterThan(lefty.lines[2]![1].z);
	});
});
