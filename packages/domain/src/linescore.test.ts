import {
	describe, expect, it,
} from "vitest";
import { linescoreCells } from "./linescore.js";
import type { LinescoreInning } from "./types.js";

/** Innings from two run lists; `null` marks a half not batted. */
function innings(away: (number | null)[], home: (number | null)[]): LinescoreInning[]
{
	return away.map((runs, i) => ({
		num: i + 1,
		away: {
			runs,
		},
		home: {
			runs: home[i] ?? null,
		},
	}));
}

describe("linescoreCells (S2)", () =>
{
	it("linescoreCells: 9 played — nine boxes each, R is the sum", () =>
	{
		const cells = linescoreCells({
			innings: innings([0, 1, 0, 2, 0, 0, 3, 0, 0], [0, 0, 1, 0, 0, 4, 0, 0, 0]),
		}, 9);
		expect(cells.innings).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
		expect(cells.away.cells).toHaveLength(9);
		expect(cells.away.runs).toBe(6);
		expect(cells.home.runs).toBe(5);
	});

	it("linescoreCells: 8½ played — the home 9th is an empty box and R still sums", () =>
	{
		const cells = linescoreCells({
			innings: innings([0, 0, 2, 0, 3, 0, 0, 0, 0], [0, 2, 1, 0, 0, 0, 0, 0, null]),
		}, 9);
		expect(cells.home.cells[8]).toBeNull();
		expect(cells.away.cells[8]).toBe(0);
		expect(cells.home.runs).toBe(3);
	});

	it("linescoreCells: in progress — innings not yet reached are empty boxes", () =>
	{
		const cells = linescoreCells({
			innings: innings([1, 0, 0], [0, 2, null]),
		}, 9);
		expect(cells.away.cells).toEqual([1, 0, 0, null, null, null, null, null, null]);
		expect(cells.home.runs).toBe(2);
	});

	it("linescoreCells: extra innings — one box per inning played", () =>
	{
		const cells = linescoreCells({
			innings: innings([0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1], [0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0]),
		}, 9);
		expect(cells.innings).toHaveLength(11);
		expect(cells.away.runs).toBe(2);
	});

	it("linescoreCells: no linescore — all empty boxes, zero runs", () =>
	{
		const cells = linescoreCells(null, 9);
		expect(cells.away.cells.every((c) => c === null)).toBe(true);
		expect(cells.home.runs).toBe(0);
		expect(linescoreCells({}, 7).innings).toHaveLength(7);
	});
});
